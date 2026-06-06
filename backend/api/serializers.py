from __future__ import annotations
import datetime as dt
import hashlib
import secrets
import uuid
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from .booking_overlap import find_overlapping_booking
from .bracket_utils import propagate_bracket_winner
from .event_booking_conflict import find_conflicting_event_for_booking
from .payment_status import PaymentStatusError, assert_transition_allowed, normalize_payment_status
from .models import Branch, BranchEvent, BranchEventMatch, BranchMembership, Booking, EventRegistration, Payment, PasswordResetToken, Room, UserProfile
User = get_user_model()

def user_payload(user: User) -> dict:
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'display_name': (user.first_name or '')[:255], 'role': UserProfile.ROLE_CLIENT})
    return {'id': user.pk, 'email': user.email or user.username, 'name': profile.display_name or user.first_name or user.username, 'phone': profile.phone or '', 'role': profile.role}

class MePatchSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=64, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)

    def validate_email(self, value: str) -> str:
        user = self.context['request'].user
        em = value.strip().lower()
        if User.objects.filter(username__iexact=em).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Пользователь с таким email уже есть.')
        return em

    def update(self, user: User, validated_data: dict) -> User:
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'display_name': (user.first_name or '')[:255], 'role': UserProfile.ROLE_CLIENT})
        if 'name' in validated_data:
            nm = (validated_data['name'] or '').strip()
            if nm:
                profile.display_name = nm[:255]
                user.first_name = nm[:150]
        if 'phone' in validated_data:
            profile.phone = (validated_data.get('phone') or '')[:64]
        if 'email' in validated_data:
            em = validated_data['email']
            user.email = em
            user.username = em
        user.save()
        profile.save()
        return user

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=64, required=False, allow_blank=True)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(username__iexact=value.strip()).exists():
            raise serializers.ValidationError('Пользователь с таким email уже есть.')
        return value.strip().lower()

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data: dict) -> User:
        email = validated_data['email']
        user = User.objects.create_user(username=email, email=email, password=validated_data['password'], first_name=validated_data['name'][:150])
        UserProfile.objects.create(user=user, display_name=validated_data['name'], phone=validated_data.get('phone') or '', role=UserProfile.ROLE_CLIENT)
        welcome = Branch.objects.filter(pk='1').first()
        if welcome:
            BranchMembership.objects.get_or_create(user=user, branch=welcome)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        email = attrs['email'].strip().lower()
        password = attrs['password']
        user = authenticate(request=self.context.get('request'), username=email, password=password)
        if not user:
            raise serializers.ValidationError({'detail': 'Неверный email или пароль.'})
        attrs['user'] = user
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs: dict) -> dict:
        user = self.context['request'].user
        old_password = attrs.get('old_password') or ''
        new_password = attrs.get('new_password') or ''
        new_password_confirm = attrs.get('new_password_confirm') or ''
        if not user.check_password(old_password):
            raise serializers.ValidationError({'old_password': 'Неверный текущий пароль.'})
        if new_password != new_password_confirm:
            raise serializers.ValidationError({'new_password_confirm': 'Пароли не совпадают.'})
        if old_password == new_password:
            raise serializers.ValidationError({'new_password': 'Новый пароль должен отличаться от текущего.'})
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)}) from exc
        return attrs

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self) -> dict:
        request = self.context['request']
        email = (self.validated_data['email'] or '').strip().lower()
        user = User.objects.filter(username__iexact=email).first()
        if not user:
            return {'detail': 'Если аккаунт существует, мы отправили инструкцию на email.'}
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        ttl_minutes = int(self.context.get('ttl_minutes', 30))
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
        PasswordResetToken.objects.create(user=user, token_hash=token_hash, expires_at=timezone.now() + dt.timedelta(minutes=max(ttl_minutes, 1)))
        return {'detail': 'Если аккаунт существует, мы отправили инструкцию на email.', 'reset_token': raw_token, 'expires_in_seconds': max(ttl_minutes, 1) * 60}

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs: dict) -> dict:
        token = (attrs.get('token') or '').strip()
        if not token:
            raise serializers.ValidationError({'token': 'Токен обязателен.'})
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Пароли не совпадают.'})
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        rec = PasswordResetToken.objects.select_related('user').filter(token_hash=token_hash).first()
        if not rec:
            raise serializers.ValidationError({'token': 'Недействительный токен.'})
        if rec.used_at is not None:
            raise serializers.ValidationError({'token': 'Токен уже использован.'})
        if rec.expires_at <= timezone.now():
            raise serializers.ValidationError({'token': 'Срок действия токена истек.'})
        try:
            validate_password(attrs['new_password'], user=rec.user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)}) from exc
        attrs['record'] = rec
        return attrs

class BookingCreateSerializer(serializers.Serializer):
    room_id = serializers.CharField()
    date = serializers.DateField()
    start_min = serializers.IntegerField(min_value=0, max_value=24 * 60)
    end_min = serializers.IntegerField(min_value=0, max_value=24 * 60 + 59)
    client_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(allow_blank=True, default='')
    service = serializers.CharField(allow_blank=True, default='')
    tone = serializers.CharField(default='mint', max_length=32)
    client_ref = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    trainer = serializers.CharField(allow_blank=True, default='')
    trainer_staff_id = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    trainer_user_id = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.CharField(allow_blank=True, default='Ожидает')
    kind = serializers.CharField(allow_blank=True, default='lesson')
    paid = serializers.BooleanField(default=False)
    confirmed = serializers.BooleanField(default=False)

    def validate(self, attrs: dict) -> dict:
        if attrs['end_min'] <= attrs['start_min']:
            raise serializers.ValidationError({'end_min': 'Время окончания должно быть позже начала.'})
        return attrs

    def create(self, validated_data: dict, branch: Branch) -> Booking:
        room_id = validated_data['room_id']
        try:
            room = Room.objects.get(pk=room_id, branch=branch)
        except Room.DoesNotExist as exc:
            raise serializers.ValidationError({'room_id': 'Зал не найден в этом филиале.'}) from exc
        conflict = find_conflicting_event_for_booking(branch.pk, room.pk, validated_data['date'], validated_data['start_min'], validated_data['end_min'])
        if conflict:
            raise serializers.ValidationError({'detail': f'Это время пересекается с событием «{conflict.title}» на этом корте.'})
        overlap = find_overlapping_booking(branch.pk, room.pk, validated_data['date'], validated_data['start_min'], validated_data['end_min'])
        if overlap:
            raise serializers.ValidationError({'detail': 'Это время уже занято другой бронью на этом корте.'})
        trainer_user_obj = None
        trainer_name = (validated_data.get('trainer') or '').strip()
        trainer_staff_id = validated_data.get('trainer_staff_id') or None
        tuid = validated_data.get('trainer_user_id')
        if tuid is not None:
            try:
                trainer_user_obj = User.objects.get(pk=int(tuid))
            except (User.DoesNotExist, TypeError, ValueError) as exc:
                raise serializers.ValidationError({'trainer_user_id': 'Пользователь не найден.'}) from exc
            prof = UserProfile.objects.filter(user=trainer_user_obj).first()
            trainer_name = ((prof.display_name if prof else '') or trainer_user_obj.first_name or (trainer_user_obj.email or trainer_user_obj.username)).strip()[:255]
            trainer_staff_id = str(trainer_user_obj.pk)
        bid = f'b{uuid.uuid4().hex[:11]}'
        return Booking.objects.create(id=bid, branch=branch, room=room, date=validated_data['date'], start_min=validated_data['start_min'], end_min=validated_data['end_min'], client_name=validated_data['client_name'], phone=validated_data.get('phone') or '', service=validated_data.get('service') or '', tone=validated_data.get('tone') or 'mint', paid=validated_data.get('paid') or False, confirmed=validated_data.get('confirmed') or False, client_ref=validated_data.get('client_ref') or None, trainer=trainer_name, trainer_staff_id=trainer_staff_id, trainer_user=trainer_user_obj, status=validated_data.get('status') or '', kind=validated_data.get('kind') or 'lesson')

class BookingClientSelfSerializer(serializers.Serializer):
    room_id = serializers.CharField()
    date = serializers.DateField()
    start_min = serializers.IntegerField(min_value=0, max_value=24 * 60)
    end_min = serializers.IntegerField(min_value=0, max_value=24 * 60 + 59)
    service = serializers.CharField(allow_blank=True, default='Аренда корта')
    tone = serializers.CharField(default='mint', max_length=32)

    def validate(self, attrs: dict) -> dict:
        if attrs['end_min'] <= attrs['start_min']:
            raise serializers.ValidationError({'end_min': 'Время окончания должно быть позже начала.'})
        return attrs

    def create(self, validated_data: dict, branch: Branch, user: User) -> Booking:
        profile = UserProfile.objects.filter(user=user).first()
        display = (profile.display_name if profile else '') or user.first_name or (user.email or user.username)
        phone = (profile.phone if profile else '') or ''
        room_id = validated_data['room_id']
        try:
            room = Room.objects.get(pk=room_id, branch=branch)
        except Room.DoesNotExist as exc:
            raise serializers.ValidationError({'room_id': 'Зал не найден в этом филиале.'}) from exc
        day = validated_data['date']
        sm, em = (validated_data['start_min'], validated_data['end_min'])
        conflict = find_conflicting_event_for_booking(branch.pk, room.pk, day, sm, em)
        if conflict:
            raise serializers.ValidationError({'detail': f'Это время пересекается с событием «{conflict.title}» на этом корте.'})
        overlap = find_overlapping_booking(branch.pk, room.pk, day, sm, em)
        if overlap:
            raise serializers.ValidationError({'detail': 'Это время уже занято другой бронью на этом корте.'})
        bid = f'b{uuid.uuid4().hex[:11]}'
        ref = f'u{user.pk}'
        return Booking.objects.create(id=bid, branch=branch, room=room, date=day, start_min=sm, end_min=em, client_name=display[:255], phone=phone[:64] if phone else '', service=(validated_data.get('service') or '')[:255], tone=validated_data.get('tone') or 'mint', paid=False, confirmed=False, client_ref=ref[:64], trainer='', trainer_staff_id=None, status='Ожидает', kind='lesson')

class BookingPatchSerializer(serializers.Serializer):
    room_id = serializers.CharField(required=False)
    date = serializers.DateField(required=False)
    start_min = serializers.IntegerField(required=False, min_value=0, max_value=24 * 60)
    end_min = serializers.IntegerField(required=False, min_value=0, max_value=24 * 60 + 59)
    client_name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(allow_blank=True, required=False)
    service = serializers.CharField(allow_blank=True, required=False)
    tone = serializers.CharField(max_length=32, required=False)
    paid = serializers.BooleanField(required=False)
    confirmed = serializers.BooleanField(required=False)
    client_ref = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    trainer = serializers.CharField(allow_blank=True, required=False)
    trainer_staff_id = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    status = serializers.CharField(allow_blank=True, required=False)
    kind = serializers.CharField(allow_blank=True, required=False)

    def update(self, instance: Booking, validated_data: dict) -> Booking:
        sm = validated_data.get('start_min', instance.start_min)
        em = validated_data.get('end_min', instance.end_min)
        if em <= sm:
            raise serializers.ValidationError({'end_min': 'Время окончания должно быть позже начала.'})
        if 'room_id' in validated_data:
            rid = validated_data['room_id']
            try:
                instance.room = Room.objects.get(pk=rid, branch_id=instance.branch_id)
            except Room.DoesNotExist as exc:
                raise serializers.ValidationError({'room_id': 'Зал не найден.'}) from exc
        for attr in ('date', 'start_min', 'end_min', 'client_name', 'phone', 'service', 'tone', 'paid', 'confirmed', 'trainer', 'status', 'kind'):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        if 'client_ref' in validated_data:
            instance.client_ref = validated_data['client_ref'] or None
        if 'trainer_staff_id' in validated_data:
            instance.trainer_staff_id = validated_data['trainer_staff_id'] or None
        conflict = find_conflicting_event_for_booking(instance.branch_id, instance.room_id, instance.date, instance.start_min, instance.end_min)
        if conflict:
            raise serializers.ValidationError({'detail': f'Это время пересекается с событием «{conflict.title}» на этом корте.'})
        overlap = find_overlapping_booking(instance.branch_id, instance.room_id, instance.date, instance.start_min, instance.end_min, exclude_booking_id=instance.pk)
        if overlap:
            raise serializers.ValidationError({'detail': 'Это время уже занято другой бронью на этом корте.'})
        instance.save()
        return instance

class BranchEventCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    kind = serializers.ChoiceField(choices=[c[0] for c in BranchEvent.KIND_CHOICES])
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    venue = serializers.CharField(allow_blank=True, default='')
    room_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(max_length=128, default='Черновик')
    format = serializers.CharField(source='event_format', allow_blank=True, default='')
    max_participants = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    registered = serializers.IntegerField(min_value=0, required=False, default=0)
    notes = serializers.CharField(allow_blank=True, required=False, default='')
    journal_block_start_min = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=24 * 60 + 59)
    journal_block_end_min = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=24 * 60 + 59)

    def validate(self, attrs: dict) -> dict:
        if attrs['end_date'] < attrs['start_date']:
            raise serializers.ValidationError({'end_date': 'Дата окончания не раньше начала.'})
        s = attrs.get('journal_block_start_min')
        e = attrs.get('journal_block_end_min')
        if (s is None) ^ (e is None):
            raise serializers.ValidationError('Интервал в журнале: задайте начало и конец (минуты от полуночи) или не передавайте поля.')
        if s is not None and e is not None and (e <= s):
            raise serializers.ValidationError({'journal_block_end_min': 'Конец интервала позже начала.'})
        reg = int(attrs.get('registered') or 0)
        mp = attrs.get('max_participants')
        if mp is not None and reg > mp:
            raise serializers.ValidationError({'registered': f'Не больше лимита участников ({mp}).'})
        return attrs

    def create(self, validated_data: dict, branch: Branch) -> BranchEvent:
        eid = f'ev{uuid.uuid4().hex[:9]}'
        ef = validated_data.pop('event_format', '')
        reg = validated_data.pop('registered', 0)
        mp = validated_data.pop('max_participants', None)
        room_key = validated_data.pop('room_id', None)
        if room_key == '':
            room_key = None
        room = None
        if room_key:
            try:
                room = Room.objects.get(pk=room_key, branch=branch)
            except Room.DoesNotExist as exc:
                raise serializers.ValidationError({'room_id': 'Зал не найден в этом филиале.'}) from exc
        return BranchEvent.objects.create(id=eid, branch=branch, room=room, event_format=ef or '', registered=reg or 0, max_participants=mp, **validated_data)

class BranchEventPatchSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    kind = serializers.ChoiceField(choices=[c[0] for c in BranchEvent.KIND_CHOICES], required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    venue = serializers.CharField(allow_blank=True, required=False)
    room_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(max_length=128, required=False)
    format = serializers.CharField(source='event_format', allow_blank=True, required=False)
    max_participants = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    registered = serializers.IntegerField(min_value=0, required=False)
    notes = serializers.CharField(allow_blank=True, required=False)
    journal_block_start_min = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=24 * 60 + 59)
    journal_block_end_min = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=24 * 60 + 59)

    def validate(self, attrs: dict) -> dict:
        has_js = 'journal_block_start_min' in attrs
        has_je = 'journal_block_end_min' in attrs
        if has_js ^ has_je:
            raise serializers.ValidationError('Передайте вместе journal_block_start_min и journal_block_end_min.')
        if has_js and has_je:
            s = attrs['journal_block_start_min']
            e = attrs['journal_block_end_min']
            if (s is None) ^ (e is None):
                raise serializers.ValidationError('Интервал журнала: оба null или оба числа.')
            if s is not None and e is not None and (e <= s):
                raise serializers.ValidationError({'journal_block_end_min': 'Конец интервала позже начала.'})
        inst = self.instance
        if inst is not None:
            online = EventRegistration.objects.filter(event_id=inst.pk).count()
            reg_after = attrs['registered'] if 'registered' in attrs else inst.registered
            mp_after = attrs['max_participants'] if 'max_participants' in attrs else inst.max_participants
            if 'registered' in attrs:
                if attrs['registered'] < online:
                    raise serializers.ValidationError({'registered': f'Не меньше числа онлайн-записей ({online}). Снимите участников в списке или увеличьте значение.'})
            if mp_after is not None:
                if mp_after < online:
                    raise serializers.ValidationError({'max_participants': f'Не меньше числа онлайн-записей ({online}). Снимите участников или увеличьте лимит.'})
                if reg_after > mp_after:
                    raise serializers.ValidationError({'max_participants': f'Не меньше «Записано» ({reg_after}). Уменьшите счётчик или поднимите лимит.'})
        return attrs

    def update(self, instance: BranchEvent, validated_data: dict) -> BranchEvent:
        if 'start_date' in validated_data or 'end_date' in validated_data:
            sd = validated_data.get('start_date', instance.start_date)
            ed = validated_data.get('end_date', instance.end_date)
            if ed < sd:
                raise serializers.ValidationError({'end_date': 'Дата окончания не раньше начала.'})
        if 'room_id' in validated_data:
            rid = validated_data.pop('room_id')
            if rid in (None, ''):
                instance.room = None
            else:
                try:
                    instance.room = Room.objects.get(pk=rid, branch_id=instance.branch_id)
                except Room.DoesNotExist as exc:
                    raise serializers.ValidationError({'room_id': 'Зал не найден в этом филиале.'}) from exc
        for key, val in validated_data.items():
            if key == 'event_format':
                instance.event_format = val or ''
            else:
                setattr(instance, key, val)
        instance.save()
        return instance

class BracketGenerateSerializer(serializers.Serializer):
    bracket_size = serializers.IntegerField(min_value=4, max_value=64, required=False)

class BracketMatchPatchSerializer(serializers.Serializer):
    label_top = serializers.CharField(max_length=255, required=False, allow_blank=True)
    label_bottom = serializers.CharField(max_length=255, required=False, allow_blank=True)
    score_top = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    score_bottom = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    winner = serializers.CharField(max_length=8, required=False, allow_blank=True)

    def validate_winner(self, value: str) -> str:
        v = (value or '').strip()
        if not v:
            return ''
        if v not in (BranchEventMatch.WIN_TOP, BranchEventMatch.WIN_BOTTOM):
            raise serializers.ValidationError('Допустимо: top, bottom или пусто.')
        return v

    def update(self, instance: BranchEventMatch, validated_data: dict) -> BranchEventMatch:
        if 'label_top' in validated_data:
            instance.label_top = validated_data['label_top']
        if 'label_bottom' in validated_data:
            instance.label_bottom = validated_data['label_bottom']
        if 'score_top' in validated_data:
            instance.score_top = validated_data['score_top']
        if 'score_bottom' in validated_data:
            instance.score_bottom = validated_data['score_bottom']
        if 'winner' in validated_data:
            instance.winner = validated_data['winner'] or ''
        instance.save()
        self.propagated_match = None
        if validated_data.get('winner'):
            self.propagated_match = propagate_bracket_winner(instance)
        return instance

class PaymentCreateSerializer(serializers.Serializer):
    booking_id = serializers.CharField()
    amount_label = serializers.CharField(max_length=64)
    status = serializers.CharField(max_length=64)
    method = serializers.CharField(allow_blank=True, default='')
    booking_label = serializers.CharField(allow_blank=True, default='')
    trainer_amount_rub = serializers.IntegerField(required=False, allow_null=True, min_value=0)

    def validate_status(self, value: str) -> str:
        n = normalize_payment_status(value)
        if n is None:
            raise serializers.ValidationError('Неизвестный статус платежа.')
        return n

    def create(self, validated_data: dict, branch: Branch) -> Payment:
        booking = Booking.objects.filter(pk=validated_data['booking_id'], branch=branch).first()
        if not booking:
            raise serializers.ValidationError({'booking_id': 'Бронь не найдена в этом филиале.'})
        pid = f'p{uuid.uuid4().hex[:11]}'
        return Payment.objects.create(id=pid, booking=booking, amount_label=validated_data['amount_label'], status=validated_data['status'], method=validated_data.get('method') or '', booking_label=validated_data.get('booking_label') or '', trainer_amount_rub=validated_data.get('trainer_amount_rub'))

class PaymentPatchSerializer(serializers.Serializer):
    amount_label = serializers.CharField(max_length=64, required=False)
    status = serializers.CharField(max_length=64, required=False)
    method = serializers.CharField(allow_blank=True, required=False)
    booking_label = serializers.CharField(allow_blank=True, required=False)
    trainer_amount_rub = serializers.IntegerField(required=False, allow_null=True, min_value=0)

    def validate_status(self, value: str) -> str:
        try:
            _, nxt = assert_transition_allowed(self.instance.status, value)
            return nxt
        except PaymentStatusError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def update(self, instance: Payment, validated_data: dict) -> Payment:
        for key in ('amount_label', 'status', 'method', 'booking_label', 'trainer_amount_rub'):
            if key in validated_data:
                setattr(instance, key, validated_data[key])
        instance.save()
        return instance

class TrainerSessionOutcomeSerializer(serializers.Serializer):
    session_outcome = serializers.ChoiceField(choices=[c[0] for c in Booking.SESSION_OUTCOME_CHOICES])

class TrainerAvailabilityWindowSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=0, max_value=6, required=False)
    start_min = serializers.IntegerField(min_value=0, max_value=24 * 60, required=False)
    end_min = serializers.IntegerField(min_value=0, max_value=24 * 60 + 59, required=False)
    note = serializers.CharField(allow_blank=True, required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs: dict) -> dict:
        sm = attrs.get('start_min')
        em = attrs.get('end_min')
        if sm is not None and em is not None and (em <= sm):
            raise serializers.ValidationError({'end_min': 'Конец окна должен быть позже начала.'})
        return attrs
