from __future__ import annotations
import datetime as dt
import re
import secrets
import uuid
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .access import director_accessible_branch_ids, user_is_director
from .audit import log_audit
from .contracts import created, ok
from .models import Branch, BranchMembership, Booking, Payment, Room, UserProfile
User = get_user_model()

class IsDirectorUser(BasePermission):
    message = 'Доступно только руководителю сети (роль director).'

    def has_permission(self, request, view) -> bool:
        return user_is_director(request.user)

def _parse_amount_label_rub(label: str) -> int:
    if not label:
        return 0
    digits = re.sub('[^\\d]', '', str(label))
    if not digits:
        return 0
    try:
        return int(digits)
    except ValueError:
        return 0

def _parse_period(request) -> tuple[dt.date, dt.date]:
    local = timezone.localdate()
    d0_s = (request.query_params.get('from') or '').strip() or (local - dt.timedelta(days=30)).isoformat()
    d1_s = (request.query_params.get('to') or '').strip() or local.isoformat()
    try:
        d0 = dt.date.fromisoformat(d0_s)
        d1 = dt.date.fromisoformat(d1_s)
    except ValueError:
        raise ValidationError({'detail': 'Неверный формат from/to (YYYY-MM-DD).'})
    if d1 < d0:
        raise ValidationError({'detail': 'Дата «по» раньше даты «с».'})
    return (d0, d1)

def _ensure_branch_for_director(user, branch_id: str) -> Branch:
    allowed = set(director_accessible_branch_ids(user))
    if branch_id not in allowed:
        raise PermissionDenied('Нет доступа к этому филиалу.')
    return get_object_or_404(Branch, pk=branch_id)

def _booking_cancelled(st: str | None) -> bool:
    return 'отмен' in (st or '').lower()

def _branch_kpi_block(branch: Branch, d0: dt.date, d1: dt.date) -> dict:
    rooms_n = Room.objects.filter(branch=branch).count()
    num_days = (d1 - d0).days + 1
    day_minutes = 15 * 60
    capacity_minutes = max(1, rooms_n) * day_minutes * num_days
    qs = Booking.objects.filter(branch=branch, date__gte=d0, date__lte=d1)
    total = qs.count()
    cancelled = sum((1 for b in qs.only('status') if _booking_cancelled(b.status)))
    confirmed = qs.filter(confirmed=True).count()
    paid_bookings = qs.filter(paid=True).count()
    booked_minutes = 0
    for b in qs.only('start_min', 'end_min', 'status'):
        if _booking_cancelled(b.status):
            continue
        booked_minutes += max(0, b.end_min - b.start_min)
    occupancy_pct = round(min(100.0, booked_minutes / capacity_minutes * 100), 1)
    pay_qs = Payment.objects.filter(booking__branch=branch, booking__date__gte=d0, booking__date__lte=d1)
    revenue_rub = sum((_parse_amount_label_rub(p.amount_label) for p in pay_qs.filter(status='Оплачено').only('amount_label')))
    pending_rub = sum((_parse_amount_label_rub(p.amount_label) for p in pay_qs.filter(status='К оплате').only('amount_label')))
    active = max(0, total - cancelled)
    conversion_pct = round(confirmed / active * 100 if active else 0.0, 1)
    cancellation_rate_pct = round(cancelled / total * 100 if total else 0.0, 1)
    return {'branchId': branch.id, 'branchName': branch.name, 'bookingsTotal': total, 'bookingsCancelled': cancelled, 'bookingsConfirmed': confirmed, 'bookingsPaid': paid_bookings, 'revenueRub': revenue_rub, 'pendingRub': pending_rub, 'occupancyPct': occupancy_pct, 'conversionPct': conversion_pct, 'cancellationRatePct': cancellation_rate_pct}

def _log_director(user, action: str, entity_type: str, entity_id: str, branch_id: str, payload: dict) -> None:
    log_audit(user=user, action=action, entity_type=entity_type, entity_id=entity_id, branch_id=branch_id, payload=payload)

class DirectorNetworkKPIView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    def get(self, request):
        d0, d1 = _parse_period(request)
        allowed = director_accessible_branch_ids(request.user)
        if not allowed:
            return ok(data={'from': d0.isoformat(), 'to': d1.isoformat(), 'network': {}, 'branches': [], 'note': 'Нет филиалов в доступе. Создайте филиал или присоединитесь по коду.'}, legacy={})
        branch_filter = (request.query_params.get('branch_id') or '').strip()
        if branch_filter:
            _ensure_branch_for_director(request.user, branch_filter)
            branches = list(Branch.objects.filter(pk=branch_filter))
        else:
            branches = list(Branch.objects.filter(pk__in=allowed).order_by('name'))
        rows = [_branch_kpi_block(b, d0, d1) for b in branches]
        net = {'bookingsTotal': sum((r['bookingsTotal'] for r in rows)), 'bookingsCancelled': sum((r['bookingsCancelled'] for r in rows)), 'bookingsConfirmed': sum((r['bookingsConfirmed'] for r in rows)), 'bookingsPaid': sum((r['bookingsPaid'] for r in rows)), 'revenueRub': sum((r['revenueRub'] for r in rows)), 'pendingRub': sum((r['pendingRub'] for r in rows)), 'occupancyPct': round(sum((r['occupancyPct'] for r in rows)) / max(1, len(rows)), 1), 'conversionPct': round(sum((r['conversionPct'] for r in rows)) / max(1, len(rows)), 1), 'cancellationRatePct': round(sum((r['cancellationRatePct'] for r in rows)) / max(1, len(rows)), 1)}
        payload = {'from': d0.isoformat(), 'to': d1.isoformat(), 'network': net, 'branches': rows}
        return ok(data=payload, legacy=payload)

class DirectorFinanceDrilldownView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    def get(self, request):
        d0, d1 = _parse_period(request)
        allowed = director_accessible_branch_ids(request.user)
        if not allowed:
            return ok(data={'from': d0.isoformat(), 'to': d1.isoformat(), 'groupBy': '', 'rows': []}, legacy={})
        branch_filter = (request.query_params.get('branch_id') or '').strip()
        if branch_filter:
            _ensure_branch_for_director(request.user, branch_filter)
            branch_ids = [branch_filter]
        else:
            branch_ids = allowed
        group_by = (request.query_params.get('group_by') or 'branch').strip().lower()
        pay_base = Payment.objects.filter(booking__branch_id__in=branch_ids, booking__date__gte=d0, booking__date__lte=d1)
        rows: list[dict] = []
        if group_by == 'day':
            by_day = {}
            for p in pay_base.select_related('booking'):
                day = p.booking.date.isoformat()
                if day not in by_day:
                    by_day[day] = {'day': day, 'paymentsCount': 0, 'revenueRub': 0, 'pendingRub': 0, 'byStatus': {}}
                by_day[day]['paymentsCount'] += 1
                rub = _parse_amount_label_rub(p.amount_label)
                st = p.status or '—'
                by_day[day]['byStatus'][st] = by_day[day]['byStatus'].get(st, 0) + rub
                if p.status == 'Оплачено':
                    by_day[day]['revenueRub'] += rub
                elif p.status == 'К оплате':
                    by_day[day]['pendingRub'] += rub
            rows = sorted(by_day.values(), key=lambda x: x['day'])
        elif group_by == 'payment_status':
            for agg_row in pay_base.values('status').annotate(c=Count('id')).order_by('status'):
                st = agg_row['status']
                cnt = agg_row['c']
                rub = sum((_parse_amount_label_rub(p.amount_label) for p in pay_base.filter(status=st or '').only('amount_label')))
                rows.append({'paymentStatus': st or '—', 'paymentsCount': cnt, 'amountRub': rub})
        else:
            for bid in branch_ids:
                b = Branch.objects.filter(pk=bid).first()
                if not b:
                    continue
                pq = pay_base.filter(booking__branch_id=bid)
                revenue = sum((_parse_amount_label_rub(p.amount_label) for p in pq.filter(status='Оплачено').only('amount_label')))
                pending = sum((_parse_amount_label_rub(p.amount_label) for p in pq.filter(status='К оплате').only('amount_label')))
                rows.append({'branchId': bid, 'branchName': b.name, 'paymentsCount': pq.count(), 'revenueRub': revenue, 'pendingRub': pending})
        payload = {'from': d0.isoformat(), 'to': d1.isoformat(), 'groupBy': group_by, 'rows': rows}
        return ok(data=payload, legacy=payload)

class DirectorPersonnelKPIView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    def get(self, request):
        d0, d1 = _parse_period(request)
        allowed = director_accessible_branch_ids(request.user)
        if not allowed:
            return ok(data={'from': d0.isoformat(), 'to': d1.isoformat(), 'people': []}, legacy={})
        branch_filter = (request.query_params.get('branch_id') or '').strip()
        if branch_filter:
            _ensure_branch_for_director(request.user, branch_filter)
            branch_ids = [branch_filter]
        else:
            branch_ids = allowed
        qs = Booking.objects.filter(branch_id__in=branch_ids, date__gte=d0, date__lte=d1)
        by_key: dict[str, dict] = {}
        for b in qs.select_related('trainer_user').only('trainer', 'trainer_user_id', 'status', 'id', 'trainer_user'):
            if b.trainer_user_id:
                key = f'u{b.trainer_user_id}'
                name = ''
                prof = UserProfile.objects.filter(user_id=b.trainer_user_id).first()
                if prof:
                    name = prof.display_name or ''
                if not name and b.trainer_user:
                    name = (b.trainer_user.first_name or '') or (b.trainer_user.email or key)
            else:
                t = (b.trainer or '').strip()
                if not t:
                    continue
                key = f't:{t[:120]}'
                name = t
            if key not in by_key:
                by_key[key] = {'key': key, 'displayName': name or key, 'sessionsTotal': 0, 'sessionsCancelled': 0, 'trainerUserId': b.trainer_user_id}
            by_key[key]['sessionsTotal'] += 1
            if _booking_cancelled(b.status):
                by_key[key]['sessionsCancelled'] += 1
        for row in by_key.values():
            uid = row.pop('trainerUserId', None)
            if uid:
                trainer_rub = sum((p.trainer_amount_rub or 0 for p in Payment.objects.filter(booking__branch_id__in=branch_ids, booking__date__gte=d0, booking__date__lte=d1, booking__trainer_user_id=uid, status='Оплачено').only('trainer_amount_rub')))
            else:
                trainer_rub = 0
            row['trainerEarningsRub'] = trainer_rub
            row['cancelRatePct'] = round(row['sessionsCancelled'] / row['sessionsTotal'] * 100 if row['sessionsTotal'] else 0.0, 1)
            row['loadScore'] = max(0, row['sessionsTotal'] - row['sessionsCancelled'])
        people = sorted(by_key.values(), key=lambda x: -x['sessionsTotal'])
        payload = {'from': d0.isoformat(), 'to': d1.isoformat(), 'people': people}
        return ok(data=payload, legacy=payload)

class DirectorBranchesListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    def get(self, request):
        allowed = director_accessible_branch_ids(request.user)
        rows = []
        for b in Branch.objects.filter(pk__in=allowed).order_by('name'):
            rows.append({'id': b.id, 'name': b.name, 'hint': b.hint or '', 'connectionCode': b.connection_code or '', 'roomsCount': Room.objects.filter(branch=b).count()})
        return ok(data={'branches': rows}, legacy={'branches': rows})

    @transaction.atomic
    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if len(name) < 2:
            return Response({'detail': 'Укажите название филиала (от 2 символов).'}, status=400)
        hint = (request.data.get('hint') or '').strip()[:255]
        bid = f'b{uuid.uuid4().hex[:10]}'
        code = secrets.token_hex(4).upper()[:8]
        while Branch.objects.filter(connection_code__iexact=code).exists():
            code = secrets.token_hex(4).upper()[:8]
        branch = Branch.objects.create(id=bid, name=name[:255], hint=hint, connection_code=code)
        rid = f'r{uuid.uuid4().hex[:10]}'
        Room.objects.create(id=rid, branch=branch, label='Корт 1', sort_order=0)
        BranchMembership.objects.get_or_create(user=request.user, branch=branch)
        _log_director(request.user, 'director_branch_created', 'branch', branch.id, branch.id, {'name': branch.name})
        item = {'id': branch.id, 'name': branch.name, 'hint': branch.hint, 'connectionCode': branch.connection_code or '', 'roomsCount': 1}
        return created(data=item, legacy=item)

class DirectorBranchDetailView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    def get(self, request, branch_id: str):
        branch = _ensure_branch_for_director(request.user, branch_id)
        return ok(data={'id': branch.id, 'name': branch.name, 'hint': branch.hint or '', 'connectionCode': branch.connection_code or '', 'roomsCount': Room.objects.filter(branch=branch).count()}, legacy={})

    @transaction.atomic
    def patch(self, request, branch_id: str):
        branch = _ensure_branch_for_director(request.user, branch_id)
        if 'name' in request.data:
            n = (request.data.get('name') or '').strip()
            if len(n) < 2:
                return Response({'detail': 'Название слишком короткое.'}, status=400)
            branch.name = n[:255]
        if 'hint' in request.data:
            branch.hint = (request.data.get('hint') or '')[:255]
        if 'connection_code' in request.data:
            raw = (request.data.get('connection_code') or '').strip().upper()[:64]
            if raw and Branch.objects.filter(connection_code__iexact=raw).exclude(pk=branch.pk).exists():
                return Response({'detail': 'Такой код подключения уже занят.'}, status=400)
            branch.connection_code = raw or None
        branch.save()
        _log_director(request.user, 'director_branch_updated', 'branch', branch.id, branch.id, {'fields': list(request.data.keys())})
        return ok(data={'id': branch.id, 'name': branch.name, 'hint': branch.hint or '', 'connectionCode': branch.connection_code or ''}, legacy={})

    @transaction.atomic
    def delete(self, request, branch_id: str):
        branch = _ensure_branch_for_director(request.user, branch_id)
        if Booking.objects.filter(branch=branch).exists():
            return Response({'detail': 'Нельзя удалить филиал с бронями. Перенесите или архивируйте записи.'}, status=400)
        bid = branch.id
        BranchMembership.objects.filter(branch=branch).delete()
        Room.objects.filter(branch=branch).delete()
        branch.delete()
        _log_director(request.user, 'director_branch_deleted', 'branch', bid, bid, {})
        return ok(data={'detail': 'Филиал удалён.', 'id': bid}, legacy={})

class DirectorBranchMembersView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    def get(self, request, branch_id: str):
        branch = _ensure_branch_for_director(request.user, branch_id)
        mids = BranchMembership.objects.filter(branch=branch).select_related('user').order_by('user_id')
        out = []
        for m in mids:
            prof = UserProfile.objects.filter(user=m.user).first()
            out.append({'userId': m.user_id, 'email': m.user.email or m.user.username, 'displayName': (prof.display_name if prof else '') or m.user.first_name or m.user.username, 'role': prof.role if prof else UserProfile.ROLE_CLIENT, 'phone': (prof.phone if prof else '') or ''})
        return ok(data={'branchId': branch.id, 'members': out}, legacy={'members': out})

    @transaction.atomic
    def post(self, request, branch_id: str):
        branch = _ensure_branch_for_director(request.user, branch_id)
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Укажите email пользователя.'}, status=400)
        user = User.objects.filter(username__iexact=email).first() or User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'detail': 'Пользователь с таким email не найден. Сначала регистрация в Courtly.'}, status=404)
        if user.pk == request.user.pk:
            return Response({'detail': 'Вы уже в филиале.'}, status=400)
        _membership, was_created = BranchMembership.objects.get_or_create(user=user, branch=branch)
        if not was_created:
            return Response({'detail': 'Пользователь уже имеет доступ к филиалу.'}, status=400)
        _log_director(request.user, 'director_member_added', 'branch_membership', f'{branch.id}:{user.pk}', branch.id, {'userId': user.pk})
        prof = UserProfile.objects.filter(user=user).first()
        item = {'userId': user.pk, 'email': user.email or user.username, 'displayName': (prof.display_name if prof else '') or user.username, 'role': prof.role if prof else UserProfile.ROLE_CLIENT}
        return created(data=item, legacy=item)

class DirectorBranchMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsDirectorUser]

    @transaction.atomic
    def patch(self, request, branch_id: str, user_id: int):
        branch = _ensure_branch_for_director(request.user, branch_id)
        m = BranchMembership.objects.filter(branch=branch, user_id=user_id).first()
        if not m:
            return Response({'detail': 'Пользователь не в филиале.'}, status=404)
        role = (request.data.get('role') or '').strip()
        if role not in (UserProfile.ROLE_ADMIN, UserProfile.ROLE_TRAINER, UserProfile.ROLE_CLIENT):
            return Response({'detail': 'Допустимые роли: admin, trainer, client. Роль director не назначается здесь.'}, status=400)
        prof, _ = UserProfile.objects.get_or_create(user=m.user, defaults={'display_name': (m.user.first_name or '')[:255], 'role': UserProfile.ROLE_CLIENT})
        old = prof.role
        prof.role = role
        prof.save(update_fields=['role'])
        _log_director(request.user, 'director_member_role_changed', 'user_profile', str(user_id), branch.id, {'from': old, 'to': role})
        return ok(data={'userId': user_id, 'role': prof.role}, legacy={})

    @transaction.atomic
    def delete(self, request, branch_id: str, user_id: int):
        branch = _ensure_branch_for_director(request.user, branch_id)
        if user_id == request.user.pk:
            return Response({'detail': 'Нельзя удалить себя из филиала через этот интерфейс.'}, status=400)
        deleted, _ = BranchMembership.objects.filter(branch=branch, user_id=user_id).delete()
        if not deleted:
            return Response({'detail': 'Запись не найдена.'}, status=404)
        _log_director(request.user, 'director_member_removed', 'branch_membership', f'{branch_id}:{user_id}', branch_id, {'userId': user_id})
        return ok(data={'detail': 'Доступ отозван.'}, legacy={})
