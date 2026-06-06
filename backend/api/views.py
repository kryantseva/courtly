from __future__ import annotations
import datetime as dt
import hashlib
import json
import re
import uuid
from collections import defaultdict
from urllib.parse import urlencode
from django.db import transaction
from django.db.models import Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError as RestValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .access import trainer_bookings_filter_q, user_can_manage_branch_bookings, user_has_branch_access, user_is_assigned_trainer, user_is_trainer
from .audit import log_audit as _log_audit
from .contracts import created, ok
from .booking_overlap import find_overlapping_booking

def _csv_query_list(param: str | None) -> list[str]:
    if not param or not str(param).strip():
        return []
    return [x.strip() for x in str(param).split(',') if x.strip()]
from .event_booking_conflict import booking_overlaps_branch_event
from .event_booking_conflict import find_conflicting_event_for_booking
from .bracket_utils import next_pow2_bracket_size, replace_bracket_for_event
from .models import AuditLog, Booking, Branch, BranchEvent, BranchEventMatch, BranchMembership, EventRegistration, EventWaitlistEntry, IdempotencyRecord, Payment, Room, TrainerAvailabilityWindow, UserNotification, UserProfile
from .serializers import BookingPatchSerializer, BracketGenerateSerializer, BracketMatchPatchSerializer, BranchEventCreateSerializer, BranchEventPatchSerializer, TrainerAvailabilityWindowSerializer, TrainerSessionOutcomeSerializer
from .permissions import CanManageBranchBookingsPermission, CanViewAuditPermission, IsBranchMemberByURL, IsTrainerUser
from .services.booking_service import cancel_own_booking as service_cancel_own_booking, create_client_booking as service_create_client_booking, create_staff_booking as service_create_staff_booking, reschedule_own_booking as service_reschedule_own_booking
from .services.event_service import promote_waitlist_entry_staff, register_me as service_event_register_me
from .services.payment_service import create_payment as service_create_payment, patch_payment as service_patch_payment
from .services.receipt_service import get_or_create_receipt

class BranchListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ids = BranchMembership.objects.filter(user=request.user).values_list('branch_id', flat=True)
        rows = Branch.objects.filter(pk__in=ids).order_by('id')
        out = [{'id': b.id, 'name': b.name, 'hint': b.hint or ''} for b in rows]
        return ok(data=out, legacy={'branches': out})

class BranchRoomsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL]

    def get(self, request, branch_id: str):
        branch = get_object_or_404(Branch, pk=branch_id)
        rooms = Room.objects.filter(branch=branch).order_by('sort_order', 'id')
        out = [{'id': r.id, 'label': r.label} for r in rooms]
        return ok(data=out, legacy={'rooms': out})

def _format_booking_time(booking: Booking) -> str:
    local = timezone.localdate()
    d = booking.date
    sh, sm = divmod(booking.start_min, 60)
    t = f'{sh:02d}:{sm:02d}'
    if d == local:
        return f'Сегодня {t}'
    if d == local + dt.timedelta(days=1):
        return f'Завтра {t}'
    if d == local - dt.timedelta(days=1):
        return f'Вчера {t}'
    return f'{d.day:02d}.{d.month:02d}.{d.year} {t}'

def _is_client_user(user) -> bool:
    profile = UserProfile.objects.filter(user=user).first()
    return bool(profile and profile.role == UserProfile.ROLE_CLIENT)

def _client_ref_for_user(user) -> str:
    return f'u{user.pk}'

def _booking_list_item(b: Booking) -> dict:
    return {'id': b.id, 'time': _format_booking_time(b), 'hall': b.room.label, 'roomId': b.room_id, 'client': b.client_name, 'clientId': b.client_ref, 'trainer': b.trainer or '—', 'status': b.status or '—', 'sessionOutcome': b.session_outcome or Booking.SESSION_OUTCOME_PENDING, 'kind': b.kind or 'lesson', 'date': b.date.isoformat(), 'paid': b.paid, 'confirmed': b.confirmed}

def _booking_staff_audit_snapshot(booking: Booking) -> dict:
    return {'room_id': booking.room_id, 'date': booking.date.isoformat(), 'start_min': booking.start_min, 'end_min': booking.end_min, 'client_name': booking.client_name, 'phone': booking.phone or '', 'service': booking.service or '', 'tone': booking.tone, 'paid': booking.paid, 'confirmed': booking.confirmed, 'client_ref': booking.client_ref or '', 'trainer': booking.trainer or '', 'trainer_staff_id': booking.trainer_staff_id or '', 'status': booking.status or '', 'kind': booking.kind or ''}

def _audit_shallow_diff(before: dict, after: dict) -> dict:
    diff = {}
    for k, v in after.items():
        if before.get(k) != v:
            diff[k] = {'from': before.get(k), 'to': v}
    return diff

def _user_can_read_booking(user, booking: Booking) -> bool:
    if user_can_manage_branch_bookings(user):
        prof = UserProfile.objects.filter(user=user).first()
        if prof and prof.role == UserProfile.ROLE_TRAINER:
            return user_is_assigned_trainer(user, booking)
        return True
    return booking.client_ref == _client_ref_for_user(user)

def _user_can_read_payment(user, payment: Payment) -> bool:
    return _user_can_read_booking(user, payment.booking)

def _parse_pagination(request):
    limit_raw = (request.query_params.get('limit') or '20').strip()
    offset_raw = (request.query_params.get('offset') or '0').strip()
    try:
        limit = int(limit_raw)
        offset = int(offset_raw)
    except ValueError:
        raise ValueError('Параметры limit/offset должны быть целыми числами.')
    if limit <= 0 or limit > 200:
        raise ValueError('Параметр limit должен быть в диапазоне 1..200.')
    if offset < 0:
        raise ValueError('Параметр offset должен быть >= 0.')
    return (limit, offset)

def _pagination_meta(request, *, total: int, limit: int, offset: int) -> dict:
    base_params = request.query_params.copy()
    base_params.pop('offset', None)
    base_params['limit'] = str(limit)

    def make_link(next_offset: int | None) -> str | None:
        if next_offset is None:
            return None
        params = base_params.copy()
        params['offset'] = str(next_offset)
        return f'?{urlencode(list(params.items()))}'
    next_offset = offset + limit if offset + limit < total else None
    prev_offset = max(offset - limit, 0) if offset > 0 else None
    return {'total': total, 'limit': limit, 'offset': offset, 'next': make_link(next_offset), 'previous': make_link(prev_offset)}

def _idempotency_lookup(user, endpoint: str, key: str, request_hash: str):
    rec = IdempotencyRecord.objects.filter(user=user, endpoint=endpoint, key=key).first()
    if not rec:
        return None
    if rec.request_hash != request_hash:
        return Response({'detail': 'Idempotency-Key уже использован с другим payload.'}, status=409)
    return Response(rec.response_body, status=rec.response_status)

def _idempotency_store(*, user, endpoint: str, key: str, request_hash: str, response_status: int, response_body: dict):
    IdempotencyRecord.objects.update_or_create(user=user, endpoint=endpoint, key=key, defaults={'request_hash': request_hash, 'response_status': response_status, 'response_body': response_body})

def _booking_detail_payload(booking: Booking) -> dict:
    payments = list(Payment.objects.filter(booking=booking))
    client_bookings = []
    if booking.client_ref:
        others = Booking.objects.filter(branch=booking.branch, client_ref=booking.client_ref).exclude(pk=booking.pk).order_by('-date', '-start_min')[:20]
        for ob in others:
            client_bookings.append({'id': ob.id, 'time': _format_booking_time(ob), 'hall': ob.room.label, 'status': ob.status or '—'})
    history = []
    audit_rows = AuditLog.objects.filter(entity_type='booking', entity_id=booking.id).order_by('-created_at', '-id')[:30]
    action_titles = {'booking_created_staff': 'Создание брони сотрудником', 'booking_created_client': 'Создание брони клиентом', 'booking_cancelled_client': 'Отмена брони клиентом', 'booking_rescheduled_client': 'Перенос брони клиентом', 'booking_updated_staff': 'Изменение брони сотрудником', 'booking_session_outcome_trainer': 'Отметка занятия тренером'}
    for row in audit_rows:
        history.append({'id': row.id, 'at': row.created_at.isoformat(), 'action': row.action, 'title': action_titles.get(row.action, row.action), 'payload': row.payload or {}})
    return {'id': booking.id, 'date': booking.date.isoformat(), 'roomId': booking.room_id, 'startMin': booking.start_min, 'endMin': booking.end_min, 'time': _format_booking_time(booking), 'hall': booking.room.label, 'client': booking.client_name, 'clientId': booking.client_ref, 'trainer': booking.trainer or '—', 'trainerStaffId': booking.trainer_staff_id, 'sessionOutcome': booking.session_outcome or Booking.SESSION_OUTCOME_PENDING, 'status': booking.status or '—', 'kind': booking.kind or 'lesson', 'isGroup': booking.kind == 'group', 'payments': [{'id': p.id, 'client': booking.client_name, 'amount': p.amount_label, 'status': p.status, 'booking': p.booking_label or '', 'method': p.method or '', 'bookingId': booking.id, 'trainerAmountRub': p.trainer_amount_rub} for p in payments], 'clientBookings': client_bookings, 'history': history}

class BranchJournalDayView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch_id: str):
        if not user_has_branch_access(request.user, branch_id):
            raise PermissionDenied('Нет доступа к этому филиалу.')
        date_s = request.query_params.get('date')
        if not date_s:
            return Response({'detail': 'Query param `date` required (YYYY-MM-DD).'}, status=400)
        try:
            day = dt.date.fromisoformat(date_s)
        except ValueError:
            return Response({'detail': 'Invalid date format.'}, status=400)
        try:
            branch = Branch.objects.get(pk=branch_id)
        except Branch.DoesNotExist:
            raise Http404('Branch not found')
        rooms = list(Room.objects.filter(branch=branch).order_by('sort_order', 'id'))
        idx_map = {r.id: i for i, r in enumerate(rooms)}
        bookings = list(Booking.objects.filter(branch=branch, date=day).select_related('room'))
        out_bookings = []
        for b in bookings:
            court_index = idx_map.get(b.room_id)
            if court_index is None:
                continue
            out_bookings.append({'id': b.id, 'courtIndex': court_index, 'startMin': b.start_min, 'endMin': b.end_min, 'client': b.client_name, 'phone': b.phone or '', 'service': b.service or '', 'tone': b.tone, 'paid': b.paid, 'confirmed': b.confirmed, 'adminBookingPath': f'/admin/bookings/{b.id}'})
        day_events = list(BranchEvent.objects.filter(branch=branch, start_date__lte=day, end_date__gte=day).select_related('room').order_by('start_date', 'id'))
        reg_ids = _registered_event_ids_for_user(request.user, [e.id for e in day_events])
        wl_ids = _waitlist_event_ids_for_user(request.user, [e.id for e in day_events])
        events_out = []
        for e in day_events:
            evd = _event_to_dict(e)
            evd.update(_viewer_participation_flags(e, e.id in reg_ids, e.id in wl_ids))
            n = _event_day_booking_overlap_count(day, e, bookings)
            evd['roomBookingOverlap'] = n > 0
            evd['overlapBookingCount'] = n
            events_out.append(evd)
        return Response({'branchId': branch.id, 'branchName': branch.name, 'date': day.isoformat(), 'dayStartHour': 7, 'dayEndHour': 22, 'slotMinutes': 30, 'courts': [{'id': r.id, 'label': r.label} for r in rooms], 'bookings': out_bookings, 'events': events_out})

def _booking_status_cancelled(st: str | None) -> bool:
    return 'отмен' in (st or '').lower()
_RU_MONTH_SHORT = ('', 'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.')

class BranchCrmClientsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL, CanManageBranchBookingsPermission]

    def get(self, request, branch_id: str):
        get_object_or_404(Branch, pk=branch_id)
        refs = list(Booking.objects.filter(branch_id=branch_id).exclude(client_ref__isnull=True).exclude(client_ref='').values_list('client_ref', flat=True).distinct()[:250])
        out = []
        for ref in refs:
            b = Booking.objects.filter(branch_id=branch_id, client_ref=ref).select_related('room').order_by('-date', '-start_min').first()
            if not b:
                continue
            pending_pay = Payment.objects.filter(booking__branch_id=branch_id, booking__client_ref=ref, status='К оплате').exists()
            unpaid_b = Booking.objects.filter(branch_id=branch_id, client_ref=ref, paid=False).exclude(status__icontains='отмен').exists()
            if pending_pay and unpaid_b:
                hint = 'Есть «К оплате» и неоплаченные брони'
            elif pending_pay:
                hint = 'Есть платежи «К оплате»'
            elif unpaid_b:
                hint = 'Есть брони без оплаты'
            else:
                hint = 'Активен'
            out.append({'id': ref, 'clientRef': ref, 'name': b.client_name, 'phone': b.phone or '', 'lastBookingDate': b.date.isoformat(), 'lastBookingHall': b.room.label, 'statusHint': hint})
        out.sort(key=lambda x: x['lastBookingDate'], reverse=True)
        return ok(data={'clients': out}, legacy={'clients': out})

class BranchCrmClientView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL, CanManageBranchBookingsPermission]

    def get(self, request, branch_id: str, client_ref: str):
        branch = get_object_or_404(Branch, pk=branch_id)
        ref = (client_ref or '').strip()
        if not ref:
            return Response({'detail': 'Укажите идентификатор клиента.'}, status=400)
        bookings = list(Booking.objects.filter(branch=branch, client_ref=ref).select_related('room').order_by('-date', '-start_min')[:80])
        if not bookings:
            return Response({'detail': 'Клиент не найден в этом филиале.'}, status=404)
        latest = bookings[0]
        today = timezone.localdate()
        upcoming_rows: list[tuple[dt.date, int, dict]] = []
        visit_history: list[dict] = []
        for b in bookings:
            wh = _format_booking_time(b)
            place = b.room.label
            title = (b.service or 'Занятие').strip() or 'Занятие'
            if b.date >= today and (not _booking_status_cancelled(b.status)):
                upcoming_rows.append((b.date, b.start_min, {'id': b.id, 'whenLabel': wh, 'title': title, 'trainerName': b.trainer or '—', 'trainerStaffId': b.trainer_staff_id or None, 'place': place}))
            else:
                d = b.date
                visit_history.append({'id': b.id, 'date': f'{d.day} {_RU_MONTH_SHORT[d.month]} {d.year}', 'summary': f"{title} · {b.trainer or '—'}", 'place': place})
        upcoming = [t[2] for t in sorted(upcoming_rows, key=lambda x: (x[0], x[1]))]
        payments_qs = Payment.objects.filter(booking__branch=branch, booking__client_ref=ref).select_related('booking', 'booking__room').order_by('-booking__date', '-booking__start_min', '-id')[:60]
        payments_out = []
        for p in payments_qs:
            bd = p.booking.date
            payments_out.append({'id': p.id, 'date': bd.isoformat(), 'amount': p.amount_label, 'method': p.method or '—', 'status': p.status, 'label': p.booking_label or f'{p.booking.room.label}, {_format_booking_time(p.booking)}', 'bookingId': p.booking_id})
        pending_payment_count = Payment.objects.filter(booking__branch=branch, booking__client_ref=ref, status='К оплате').count()
        unpaid_booking_count = Booking.objects.filter(branch=branch, client_ref=ref, paid=False).exclude(status__icontains='отмен').count()
        pending_rub = 0
        for p in payments_qs:
            if p.status == 'К оплате':
                r = _parse_amount_label_rub(p.amount_label)
                if r is not None:
                    pending_rub += r
        last_visit = bookings[0].date.isoformat() if bookings else ''
        payload = {'clientRef': ref, 'branchId': branch.id, 'branchName': branch.name, 'name': latest.client_name, 'phone': latest.phone or '', 'email': '', 'lastVisit': last_visit, 'upcomingBookings': upcoming, 'visitHistory': visit_history, 'payments': payments_out, 'debt': {'pendingPaymentCount': pending_payment_count, 'unpaidBookingCount': unpaid_booking_count, 'pendingRubHint': pending_rub if pending_rub > 0 else None, 'summary': f'Платежей «К оплате»: {pending_payment_count}, броней без оплаты: {unpaid_booking_count}'}}
        return ok(data=payload, legacy=payload)

class BranchJoinView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'profile'

    def post(self, request):
        raw = (request.data.get('code') or '').strip()
        if len(raw) < 4:
            return Response({'detail': 'Введите код из 4 и более символов.'}, status=400)
        branch = Branch.objects.filter(connection_code__iexact=raw.upper()).first()
        if not branch:
            return Response({'detail': 'Филиал с таким кодом не найден.'}, status=404)
        _, created = BranchMembership.objects.get_or_create(user=request.user, branch=branch)
        if created:
            _log_audit(user=request.user, action='branch_joined', entity_type='branch', entity_id=branch.id, branch_id=branch.id, payload={})
        return Response({'branch': {'id': branch.id, 'name': branch.name, 'hint': branch.hint or ''}})

class BranchBookingsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL]

    def get_throttles(self):
        if self.request.method != 'POST':
            return []
        self.throttle_scope = 'booking_staff'
        return super().get_throttles()

    def get(self, request, branch_id: str):
        branch = get_object_or_404(Branch, pk=branch_id)
        local = timezone.localdate()
        from_s = request.query_params.get('from') or local.isoformat()
        to_s = request.query_params.get('to') or (local + dt.timedelta(days=31)).isoformat()
        try:
            d0 = dt.date.fromisoformat(from_s)
            d1 = dt.date.fromisoformat(to_s)
        except ValueError:
            return Response({'detail': 'Неверный формат from/to (YYYY-MM-DD).'}, status=400)
        if d1 < d0:
            return Response({'detail': 'Дата «по» раньше даты «с».'}, status=400)
        rows = Booking.objects.filter(branch=branch, date__gte=d0, date__lte=d1).select_related('room')
        q = (request.query_params.get('q') or '').strip()
        if q:
            rows = rows.filter(Q(client_name__icontains=q) | Q(phone__icontains=q) | Q(service__icontains=q) | Q(trainer__icontains=q) | Q(room__label__icontains=q))
        room_id_f = (request.query_params.get('room_id') or '').strip()
        if room_id_f:
            rows = rows.filter(room_id=room_id_f)
        paid_raw = (request.query_params.get('paid') or '').strip().lower()
        if paid_raw in ('1', 'true', 'yes'):
            rows = rows.filter(paid=True)
        elif paid_raw in ('0', 'false', 'no'):
            rows = rows.filter(paid=False)
        conf_raw = (request.query_params.get('confirmed') or '').strip().lower()
        if conf_raw in ('1', 'true', 'yes'):
            rows = rows.filter(confirmed=True)
        elif conf_raw in ('0', 'false', 'no'):
            rows = rows.filter(confirmed=False)
        status_f = (request.query_params.get('status') or '').strip()
        if status_f:
            rows = rows.filter(status__icontains=status_f)
        kind_f = (request.query_params.get('kind') or '').strip()
        if kind_f:
            rows = rows.filter(kind=kind_f)
        mine_raw = (request.query_params.get('mine') or '').strip().lower()
        if mine_raw in ('1', 'true', 'yes') or _is_client_user(request.user):
            rows = rows.filter(client_ref=f'u{request.user.pk}')
        rows = rows.order_by('date', 'start_min', 'id')
        out = [_booking_list_item(b) for b in rows]
        return ok(data=out, legacy={'bookings': out, 'from': d0.isoformat(), 'to': d1.isoformat()})

    def post(self, request, branch_id: str):
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для создания записи.')
        branch = get_object_or_404(Branch, pk=branch_id)
        idem_key = (request.headers.get('Idempotency-Key') or '').strip()
        endpoint = f'POST:/branches/{branch_id}/bookings/'
        req_hash = hashlib.sha256(json.dumps(request.data, ensure_ascii=False, sort_keys=True, default=str).encode('utf-8')).hexdigest()
        if idem_key:
            idem_resp = _idempotency_lookup(request.user, endpoint, idem_key, req_hash)
            if idem_resp is not None:
                return idem_resp
        booking = service_create_staff_booking(user=request.user, branch=branch, payload=request.data)
        body = {'id': booking.id, 'adminBookingPath': f'/admin/bookings/{booking.id}'}
        _log_audit(user=request.user, action='booking_created_staff', entity_type='booking', entity_id=booking.id, branch_id=branch.id, payload={'room_id': booking.room_id, 'date': booking.date.isoformat()})
        if idem_key:
            _idempotency_store(user=request.user, endpoint=endpoint, key=idem_key, request_hash=req_hash, response_status=201, response_body=body)
        return created(data=body, legacy=body)

class BranchClientBookingView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL]
    throttle_scope = 'booking_write'

    def post(self, request, branch_id: str):
        branch = get_object_or_404(Branch, pk=branch_id)
        idem_key = (request.headers.get('Idempotency-Key') or '').strip()
        endpoint = f'POST:/branches/{branch_id}/bookings/self/'
        req_hash = hashlib.sha256(json.dumps(request.data, ensure_ascii=False, sort_keys=True, default=str).encode('utf-8')).hexdigest()
        if idem_key:
            idem_resp = _idempotency_lookup(request.user, endpoint, idem_key, req_hash)
            if idem_resp is not None:
                return idem_resp
        booking = service_create_client_booking(user=request.user, branch=branch, payload=request.data)
        body = {'id': booking.id, 'adminBookingPath': f'/admin/bookings/{booking.id}'}
        _log_audit(user=request.user, action='booking_created_client', entity_type='booking', entity_id=booking.id, branch_id=branch.id, payload={'room_id': booking.room_id, 'date': booking.date.isoformat()})
        if idem_key:
            _idempotency_store(user=request.user, endpoint=endpoint, key=idem_key, request_hash=req_hash, response_status=201, response_body=body)
        return created(data=body, legacy=body)

class BranchAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL]

    def get(self, request, branch_id: str):
        date_s = (request.query_params.get('date') or '').strip()
        if not date_s:
            return Response({'detail': 'Query param `date` required (YYYY-MM-DD).'}, status=400)
        try:
            day = dt.date.fromisoformat(date_s)
        except ValueError:
            return Response({'detail': 'Неверный формат date (YYYY-MM-DD).'}, status=400)
        duration_raw = (request.query_params.get('duration') or '60').strip()
        try:
            duration = int(duration_raw)
        except ValueError:
            return Response({'detail': 'Параметр duration должен быть числом минут.'}, status=400)
        if duration <= 0:
            return Response({'detail': 'Параметр duration должен быть больше 0.'}, status=400)
        room_id = (request.query_params.get('room_id') or '').strip()
        trainer_user_id_raw = (request.query_params.get('trainer_user_id') or '').strip()
        trainer_windows: list[TrainerAvailabilityWindow] = []
        if trainer_user_id_raw:
            try:
                tid = int(trainer_user_id_raw)
            except ValueError:
                return Response({'detail': 'Параметр trainer_user_id должен быть целым числом.'}, status=400)
            trainer_windows = list(TrainerAvailabilityWindow.objects.filter(branch_id=branch_id, user_id=tid, is_active=True, weekday=day.weekday()))
        branch = get_object_or_404(Branch, pk=branch_id)
        rooms_qs = Room.objects.filter(branch=branch).order_by('sort_order', 'id')
        if room_id:
            rooms_qs = rooms_qs.filter(pk=room_id)
        rooms = list(rooms_qs)
        if room_id and (not rooms):
            return Response({'detail': 'Зал не найден в этом филиале.'}, status=404)
        day_start = 7 * 60
        day_end = 22 * 60
        step = 30
        room_ids = [r.id for r in rooms]
        bookings_by_room: dict[str, list[Booking]] = {rid: [] for rid in room_ids}
        for b in Booking.objects.filter(branch=branch, room_id__in=room_ids, date=day):
            bookings_by_room.setdefault(b.room_id, []).append(b)
        events_by_room: dict[str, list[BranchEvent]] = {rid: [] for rid in room_ids}
        for ev in BranchEvent.objects.filter(branch=branch, room_id__in=room_ids, start_date__lte=day, end_date__gte=day).exclude(status='Отменено'):
            if ev.room_id:
                events_by_room.setdefault(ev.room_id, []).append(ev)
        out_rooms = []
        for room in rooms:
            bookings = bookings_by_room.get(room.id, [])
            events = events_by_room.get(room.id, [])
            starts = []
            for start in range(day_start, day_end - duration + 1, step):
                end = start + duration
                overlap_booking = any((start < b.end_min and end > b.start_min for b in bookings))
                if overlap_booking:
                    continue
                overlap_event = any((booking_overlaps_branch_event(day, start, end, ev) for ev in events))
                if overlap_event:
                    continue
                if trainer_windows and (not any((w.start_min <= start and w.end_min >= end for w in trainer_windows))):
                    continue
                starts.append({'startMin': start, 'start': _min_to_hhmm(start), 'end': _min_to_hhmm(end)})
            out_rooms.append({'id': room.id, 'label': room.label, 'availableStarts': starts})
        payload = {'branchId': branch.id, 'date': day.isoformat(), 'duration': duration, 'stepMinutes': step, 'rooms': out_rooms}
        return ok(data=payload, legacy=payload)

def _payment_list_item(p: Payment) -> dict:
    b = p.booking
    label = p.booking_label or f'{b.room.label}, {_format_booking_time(b)}'
    return {'id': p.id, 'client': b.client_name, 'amount': p.amount_label, 'status': p.status, 'booking': label, 'method': p.method or '', 'bookingId': b.id, 'bookingDate': b.date.isoformat()}

def _payment_history_rows(payment_id: str) -> list[dict]:
    action_titles = {'payment_patched': 'Изменение платежа'}
    rows = AuditLog.objects.filter(entity_type='payment', entity_id=payment_id).order_by('-created_at', '-id')[:40]
    return [{'id': row.id, 'at': row.created_at.isoformat(), 'action': row.action, 'title': action_titles.get(row.action, row.action), 'payload': row.payload or {}} for row in rows]

def _payment_detail_payload(payment: Payment) -> dict:
    item = _payment_list_item(payment)
    item['history'] = _payment_history_rows(payment.id)
    return item

def _min_to_hhmm(m: int) -> str:
    h, mm = divmod(int(m), 60)
    return f'{h:02d}:{mm:02d}'

def _parse_amount_label_rub(label: str) -> int | None:
    if not label:
        return None
    digits = re.sub('[^\\d]', '', str(label))
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None

def _trainer_earnings_rub_for_payment(p: Payment) -> int:
    if p.trainer_amount_rub is not None:
        return int(p.trainer_amount_rub)
    parsed = _parse_amount_label_rub(p.amount_label or '')
    if parsed is None:
        return 0
    return max(0, parsed // 2)

def _event_day_booking_overlap_count(day, event: BranchEvent, day_bookings: list) -> int:
    if not event.room_id:
        return 0
    n = 0
    for b in day_bookings:
        if b.room_id != event.room_id:
            continue
        if booking_overlaps_branch_event(day, b.start_min, b.end_min, event):
            n += 1
    return n

def _ru_short_date(d: dt.date) -> str:
    months = ('', 'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.')
    return f'{d.day} {months[d.month]} {d.year}'

def _event_to_dict(ev: BranchEvent) -> dict:
    return {'id': ev.id, 'branchId': ev.branch_id, 'title': ev.title, 'kind': ev.kind, 'start_date': ev.start_date.isoformat(), 'end_date': ev.end_date.isoformat(), 'startLabel': _ru_short_date(ev.start_date), 'endLabel': _ru_short_date(ev.end_date), 'venue': ev.venue, 'roomId': ev.room_id, 'roomLabel': ev.room.label if ev.room_id else None, 'status': ev.status, 'format': ev.event_format or None, 'maxParticipants': ev.max_participants, 'registered': ev.registered, 'notes': ev.notes or None, 'journalBlockStartMin': ev.journal_block_start_min, 'journalBlockEndMin': ev.journal_block_end_min, 'journalBlockRangeLabel': f'{_min_to_hhmm(ev.journal_block_start_min)}–{_min_to_hhmm(ev.journal_block_end_min)}' if ev.journal_block_start_min is not None and ev.journal_block_end_min is not None else None}

def _viewer_participation_flags(ev: BranchEvent, is_registered: bool, is_on_waitlist: bool) -> dict:
    full = ev.max_participants is not None and ev.registered >= ev.max_participants
    st = (ev.status or '').strip()
    bad_status = st in ('Отменено', 'Завершено')
    today = timezone.localdate()
    before_start = today < ev.start_date
    open_for_online = st == 'Регистрация открыта'
    viewer_can_register = open_for_online and (not is_registered) and (not full) and (not bad_status) and before_start
    viewer_can_unregister = is_registered and (before_start or st == 'Отменено')
    can_waitlist = open_for_online and (not is_registered) and (not is_on_waitlist) and full and (not bad_status) and before_start and (ev.max_participants is not None)
    viewer_can_leave_waitlist = is_on_waitlist and before_start and (not bad_status)
    return {'viewerIsRegistered': is_registered, 'viewerCanRegister': bool(viewer_can_register), 'viewerCanUnregister': bool(viewer_can_unregister), 'viewerIsOnWaitlist': is_on_waitlist, 'viewerCanJoinWaitlist': bool(can_waitlist), 'viewerCanLeaveWaitlist': bool(viewer_can_leave_waitlist)}

def _registered_event_ids_for_user(user, event_ids: list) -> set:
    if not event_ids:
        return set()
    return set(EventRegistration.objects.filter(user=user, event_id__in=event_ids).values_list('event_id', flat=True))

def _waitlist_event_ids_for_user(user, event_ids: list) -> set:
    if not event_ids:
        return set()
    return set(EventWaitlistEntry.objects.filter(user=user, event_id__in=event_ids).values_list('event_id', flat=True))

def _notify_waitlist_head_if_slot_opened(ev: BranchEvent) -> None:
    if ev.max_participants is None:
        return
    if (ev.registered or 0) >= ev.max_participants:
        return
    if (ev.status or '').strip() != 'Регистрация открыта':
        return
    first = EventWaitlistEntry.objects.filter(event_id=ev.pk).order_by('created_at', 'pk').first()
    if not first:
        return
    uid = f'nt{uuid.uuid4().hex[:12]}'
    UserNotification.objects.create(id=uid, user_id=first.user_id, title='Освободилось место', body=f'На мероприятие «{ev.title}» снова можно записаться — откройте карточку в приложении.', link_path=f'/app/events/{ev.id}', event_id=ev.id)

def _event_detail_payload(ev: BranchEvent, user) -> dict:
    d = _event_to_dict(ev)
    is_reg = EventRegistration.objects.filter(event=ev, user=user).exists()
    wl_entry = EventWaitlistEntry.objects.filter(event=ev, user=user).first()
    is_wl = wl_entry is not None
    d.update(_viewer_participation_flags(ev, is_reg, is_wl))
    d['waitlistCount'] = EventWaitlistEntry.objects.filter(event=ev).count()
    if wl_entry:
        d['viewerWaitlistPosition'] = 1 + EventWaitlistEntry.objects.filter(event=ev).filter(Q(created_at__lt=wl_entry.created_at) | Q(created_at=wl_entry.created_at, pk__lt=wl_entry.pk)).count()
    else:
        d['viewerWaitlistPosition'] = None
    if user_can_manage_branch_bookings(user):
        if getattr(ev, '_online_reg_count', None) is not None:
            d['onlineRegisteredCount'] = int(ev._online_reg_count)
        else:
            d['onlineRegisteredCount'] = EventRegistration.objects.filter(event=ev).count()
    return d

def _event_registration_staff_dict(reg: EventRegistration) -> dict:
    u = reg.user
    try:
        prof: UserProfile | None = u.courtly_profile
    except UserProfile.DoesNotExist:
        prof = None
    email = (getattr(u, 'email', None) or '').strip()
    return {'id': reg.id, 'userId': str(u.pk), 'email': email, 'displayName': (prof.display_name if prof else '') or '', 'phone': (prof.phone if prof else '') or '', 'createdAt': reg.created_at.isoformat()}

def _event_waitlist_staff_row(entry: EventWaitlistEntry, position: int) -> dict:
    u = entry.user
    try:
        prof: UserProfile | None = u.courtly_profile
    except UserProfile.DoesNotExist:
        prof = None
    email = (getattr(u, 'email', None) or '').strip()
    return {'id': entry.id, 'position': position, 'userId': str(u.pk), 'email': email, 'displayName': (prof.display_name if prof else '') or '', 'phone': (prof.phone if prof else '') or '', 'createdAt': entry.created_at.isoformat()}

def _match_to_dict(m: BranchEventMatch) -> dict:
    return {'id': m.id, 'roundNum': m.round_num, 'slot': m.slot, 'labelTop': m.label_top, 'labelBottom': m.label_bottom, 'scoreTop': m.score_top, 'scoreBottom': m.score_bottom, 'winner': m.winner or ''}

def _round_row_label(match_count: int, round_num: int) -> str:
    if match_count == 1:
        return 'Финал'
    if match_count == 2:
        return 'Полуфинал'
    if match_count == 4:
        return '1/4 финала'
    if match_count == 8:
        return '1/8 финала'
    if match_count == 16:
        return '1/16 финала'
    return f'Раунд {round_num}'

def _bracket_response(ev: BranchEvent) -> dict:
    matches = list(ev.bracket_matches.order_by('round_num', 'slot'))
    if not matches:
        return {'event': {'id': ev.id, 'title': ev.title, 'kind': ev.kind}, 'bracketSize': None, 'rounds': [], 'matches': []}
    by_round: dict[int, list[BranchEventMatch]] = {}
    for m in matches:
        by_round.setdefault(m.round_num, []).append(m)
    total_rounds = max(by_round.keys())
    rounds_out = []
    for r in range(1, total_rounds + 1):
        row = by_round.get(r, [])
        mc = len(row)
        rounds_out.append({'roundNum': r, 'label': _round_row_label(mc, r), 'matchCount': mc})
    r1 = by_round.get(1, [])
    bracket_size = len(r1) * 2 if r1 else None
    return {'event': {'id': ev.id, 'title': ev.title, 'kind': ev.kind}, 'bracketSize': bracket_size, 'rounds': rounds_out, 'matches': [_match_to_dict(m) for m in matches]}

def _is_pow2(n: int) -> bool:
    return n >= 4 and n & n - 1 == 0

class BranchEventsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL]

    def get_throttles(self):
        if self.request.method != 'POST':
            return []
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    def get(self, request, branch_id: str):
        if not user_has_branch_access(request.user, branch_id):
            raise PermissionDenied('Нет доступа к этому филиалу.')
        branch = get_object_or_404(Branch, pk=branch_id)
        qs = BranchEvent.objects.filter(branch=branch).select_related('room')
        from_s = request.query_params.get('from')
        to_s = request.query_params.get('to')
        if from_s:
            try:
                d0 = dt.date.fromisoformat(from_s)
                qs = qs.filter(end_date__gte=d0)
            except ValueError:
                return Response({'detail': 'Неверный параметр from (YYYY-MM-DD).'}, status=400)
        if to_s:
            try:
                d1 = dt.date.fromisoformat(to_s)
                qs = qs.filter(start_date__lte=d1)
            except ValueError:
                return Response({'detail': 'Неверный параметр to (YYYY-MM-DD).'}, status=400)
        kind_list = _csv_query_list(request.query_params.get('kind'))
        if kind_list:
            qs = qs.filter(kind__in=kind_list)
        status_list = _csv_query_list(request.query_params.get('status'))
        if status_list:
            qs = qs.filter(status__in=status_list)
        qs = qs.order_by('start_date', 'id')
        if user_can_manage_branch_bookings(request.user):
            qs = qs.annotate(_online_reg_count=Count('registrations'))
        events = list(qs)
        reg_ids = _registered_event_ids_for_user(request.user, [e.id for e in events])
        wl_ids = _waitlist_event_ids_for_user(request.user, [e.id for e in events])
        out = []
        for e in events:
            d = _event_to_dict(e)
            d.update(_viewer_participation_flags(e, e.id in reg_ids, e.id in wl_ids))
            if user_can_manage_branch_bookings(request.user):
                d['onlineRegisteredCount'] = int(getattr(e, '_online_reg_count', 0))
            out.append(d)
        return Response({'events': out})

    def post(self, request, branch_id: str):
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для создания события.')
        branch = get_object_or_404(Branch, pk=branch_id)
        ser = BranchEventCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ev = ser.create(ser.validated_data, branch)
        _log_audit(user=request.user, action='branch_event_created', entity_type='branch_event', entity_id=ev.id, branch_id=branch.id, payload={'title': ev.title, 'kind': ev.kind})
        return Response(_event_detail_payload(ev, request.user), status=201)

class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.request.method != 'PATCH':
            return []
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    def get(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent.objects.select_related('room'), pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        return Response(_event_detail_payload(ev, request.user))

    def patch(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent.objects.select_related('room'), pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения события.')
        ser = BranchEventPatchSerializer(instance=ev, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        ev.refresh_from_db()
        _log_audit(user=request.user, action='branch_event_updated', entity_type='branch_event', entity_id=ev.id, branch_id=ev.branch_id, payload={'keys': sorted(request.data.keys())})
        return Response(_event_detail_payload(ev, request.user))

class EventRegistrationMeView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        ev_locked = service_event_register_me(user=request.user, event_id=event_id)
        payload = _event_detail_payload(ev_locked, request.user)
        return created(data=payload, legacy=payload)

    @transaction.atomic
    def delete(self, request, event_id: str):
        ev_locked = get_object_or_404(BranchEvent.objects.select_for_update(of=('self',)).select_related('room'), pk=event_id)
        if not user_has_branch_access(request.user, ev_locked.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        reg = EventRegistration.objects.filter(event_id=event_id, user=request.user).first()
        if not reg:
            return Response({'detail': 'Запись на мероприятие не найдена.'}, status=404)
        st = (ev_locked.status or '').strip()
        if timezone.localdate() >= ev_locked.start_date and st != 'Отменено':
            return Response({'detail': 'Отменить запись через приложение можно только до начала мероприятия.'}, status=400)
        reg.delete()
        ev_locked.registered = max(0, (ev_locked.registered or 0) - 1)
        ev_locked.save(update_fields=['registered'])
        ev_locked.refresh_from_db()
        return Response(_event_detail_payload(ev_locked, request.user))

class EventWaitlistMeView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        st = (ev.status or '').strip()
        if st in ('Отменено', 'Завершено'):
            return Response({'detail': 'Событие недоступно.'}, status=400)
        if st != 'Регистрация открыта':
            return Response({'detail': 'Лист ожидания доступен при статусе «Регистрация открыта».'}, status=400)
        if timezone.localdate() >= ev.start_date:
            return Response({'detail': 'Мероприятие уже началось.'}, status=400)
        if ev.max_participants is None:
            return Response({'detail': 'Лист ожидания только для мероприятий с лимитом мест.'}, status=400)
        ev_locked = BranchEvent.objects.select_for_update(of=('self',)).select_related('room').get(pk=event_id)
        if EventRegistration.objects.filter(event=ev_locked, user=request.user).exists():
            return Response({'detail': 'Вы уже записаны на мероприятие.'}, status=400)
        if EventWaitlistEntry.objects.filter(event=ev_locked, user=request.user).exists():
            return Response({'detail': 'Вы уже в листе ожидания.'}, status=400)
        if ev_locked.registered < ev_locked.max_participants:
            return Response({'detail': 'Есть свободные места — оформите запись напрямую.'}, status=400)
        wid = f'ew{uuid.uuid4().hex[:10]}'
        EventWaitlistEntry.objects.create(id=wid, event=ev_locked, user=request.user)
        ev_locked.refresh_from_db()
        return Response(_event_detail_payload(ev_locked, request.user), status=201)

    def delete(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent.objects.select_related('room'), pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        row = EventWaitlistEntry.objects.filter(event_id=event_id, user=request.user).first()
        if not row:
            return Response({'detail': 'Записи в листе ожидания нет.'}, status=404)
        row.delete()
        return Response(_event_detail_payload(ev, request.user))

class EventRegistrationsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для просмотра списка участников.')
        rows = list(EventRegistration.objects.filter(event=ev).select_related('user', 'user__courtly_profile').order_by('created_at'))
        return Response({'eventId': ev.id, 'count': len(rows), 'registrations': [_event_registration_staff_dict(r) for r in rows]})

class EventWaitlistListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для просмотра листа ожидания.')
        rows = list(EventWaitlistEntry.objects.filter(event=ev).select_related('user', 'user__courtly_profile').order_by('created_at', 'pk'))
        out = [_event_waitlist_staff_row(r, i) for i, r in enumerate(rows, start=1)]
        return Response({'eventId': ev.id, 'count': len(out), 'waitlist': out})

class EventWaitlistStaffDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    @transaction.atomic
    def delete(self, request, event_id: str, waitlist_entry_id: str):
        ev_locked = get_object_or_404(BranchEvent.objects.select_for_update(of=('self',)).select_related('room'), pk=event_id)
        if not user_has_branch_access(request.user, ev_locked.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения листа ожидания.')
        row = EventWaitlistEntry.objects.filter(pk=waitlist_entry_id, event_id=event_id).first()
        if not row:
            return Response({'detail': 'Запись в листе ожидания не найдена.'}, status=404)
        uid = row.user_id
        row.delete()
        ev_locked.refresh_from_db()
        _log_audit(user=request.user, action='event_waitlist_removed_staff', entity_type='branch_event', entity_id=event_id, branch_id=ev_locked.branch_id, payload={'waitlist_entry_id': waitlist_entry_id, 'user_id': uid})
        return Response({'event': _event_detail_payload(ev_locked, request.user)})

class EventWaitlistPromoteView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    @transaction.atomic
    def post(self, request, event_id: str, waitlist_entry_id: str):
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения листа ожидания.')
        ev_probe = get_object_or_404(BranchEvent.objects.only('branch_id'), pk=event_id)
        if not user_has_branch_access(request.user, ev_probe.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        try:
            ev_locked, rid = promote_waitlist_entry_staff(event_id=event_id, waitlist_entry_id=waitlist_entry_id)
        except RestValidationError as e:
            detail = e.detail
            if isinstance(detail, dict):
                return Response(detail, status=400)
            return Response({'detail': str(detail)}, status=400)
        _log_audit(user=request.user, action='event_waitlist_promoted', entity_type='branch_event', entity_id=ev_locked.id, branch_id=ev_locked.branch_id, payload={'waitlist_entry_id': waitlist_entry_id, 'registration_id': rid})
        _notify_waitlist_head_if_slot_opened(ev_locked)
        payload = {'registrationId': rid, 'event': _event_detail_payload(ev_locked, request.user)}
        return ok(data=payload, legacy=payload)

class EventRegistrationStaffDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    @transaction.atomic
    def delete(self, request, event_id: str, registration_id: str):
        ev_locked = get_object_or_404(BranchEvent.objects.select_for_update(of=('self',)).select_related('room'), pk=event_id)
        if not user_has_branch_access(request.user, ev_locked.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения списка участников.')
        reg = EventRegistration.objects.filter(pk=registration_id, event_id=event_id).first()
        if not reg:
            return Response({'detail': 'Регистрация не найдена.'}, status=404)
        reg_user_id = reg.user_id
        reg.delete()
        ev_locked.registered = max(0, (ev_locked.registered or 0) - 1)
        ev_locked.save(update_fields=['registered'])
        ev_locked.refresh_from_db()
        _notify_waitlist_head_if_slot_opened(ev_locked)
        _log_audit(user=request.user, action='event_registration_removed_staff', entity_type='branch_event', entity_id=event_id, branch_id=ev_locked.branch_id, payload={'registration_id': registration_id, 'user_id': reg_user_id})
        return Response({'event': _event_detail_payload(ev_locked, request.user)})

class EventBracketView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.request.method != 'POST':
            return []
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    def get(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        return Response(_bracket_response(ev))

    def post(self, request, event_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения сетки.')
        if ev.kind != BranchEvent.KIND_TOURNAMENT:
            return Response({'detail': 'Сетку можно сгенерировать только для турнира.'}, status=400)
        ser = BracketGenerateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        raw = ser.validated_data.get('bracket_size')
        if raw is None:
            size = next_pow2_bracket_size(ev.max_participants)
        else:
            if not _is_pow2(raw) or raw > 64:
                return Response({'detail': 'bracket_size: степень двойки от 4 до 64.'}, status=400)
            size = raw
        replace_bracket_for_event(ev, size)
        ev.refresh_from_db()
        _log_audit(user=request.user, action='event_bracket_generated', entity_type='branch_event', entity_id=ev.id, branch_id=ev.branch_id, payload={'bracket_size': size})
        return Response(_bracket_response(ev), status=201)

class EventBracketMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        self.throttle_scope = 'event_mutate'
        return super().get_throttles()

    @transaction.atomic
    def patch(self, request, event_id: str, match_id: str):
        ev = get_object_or_404(BranchEvent, pk=event_id)
        if not user_has_branch_access(request.user, ev.branch_id):
            raise PermissionDenied('Нет доступа к событию этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения матча.')
        match = get_object_or_404(BranchEventMatch, pk=match_id, event=ev)
        ser = BracketMatchPatchSerializer(instance=match, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        match.refresh_from_db()
        propagated = ser.propagated_match
        _log_audit(user=request.user, action='event_bracket_match_patched', entity_type='branch_event_match', entity_id=match_id, branch_id=ev.branch_id, payload={'event_id': event_id, 'keys': sorted(request.data.keys())})
        return Response({'match': _match_to_dict(match), 'propagatedMatch': _match_to_dict(propagated) if propagated else None})

class BranchPaymentsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL]

    def get_throttles(self):
        if self.request.method != 'POST':
            return []
        self.throttle_scope = 'payment_mutate'
        return super().get_throttles()

    def get(self, request, branch_id: str):
        branch = get_object_or_404(Branch, pk=branch_id)
        local = timezone.localdate()
        from_s = request.query_params.get('from') or local.isoformat()
        to_s = request.query_params.get('to') or (local + dt.timedelta(days=31)).isoformat()
        try:
            d0 = dt.date.fromisoformat(from_s)
            d1 = dt.date.fromisoformat(to_s)
        except ValueError:
            return Response({'detail': 'Неверный формат from/to (YYYY-MM-DD).'}, status=400)
        if d1 < d0:
            return Response({'detail': 'Дата «по» раньше даты «с».'}, status=400)
        qs = Payment.objects.filter(booking__branch=branch, booking__date__gte=d0, booking__date__lte=d1).select_related('booking', 'booking__room')
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(booking__client_name__icontains=q) | Q(booking_label__icontains=q) | Q(booking__room__label__icontains=q))
        pay_status = (request.query_params.get('status') or '').strip()
        if pay_status:
            qs = qs.filter(status__icontains=pay_status)
        room_pay = (request.query_params.get('room_id') or '').strip()
        if room_pay:
            qs = qs.filter(booking__room_id=room_pay)
        mine_pay = (request.query_params.get('mine') or '').strip().lower()
        if mine_pay in ('1', 'true', 'yes') or _is_client_user(request.user):
            qs = qs.filter(booking__client_ref=f'u{request.user.pk}')
        qs = qs.order_by('-booking__date', '-booking__start_min', 'id')
        out = [_payment_list_item(p) for p in qs]
        return ok(data=out, legacy={'payments': out, 'from': d0.isoformat(), 'to': d1.isoformat()})

    def post(self, request, branch_id: str):
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для создания оплаты.')
        branch = get_object_or_404(Branch, pk=branch_id)
        payment = service_create_payment(branch=branch, payload=request.data)
        item = _payment_list_item(payment)
        return created(data=item, legacy=item)

class PaymentDetailView(APIView):

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageBranchBookingsPermission()]

    def get_throttles(self):
        if self.request.method != 'PATCH':
            return []
        self.throttle_scope = 'payment_mutate'
        return super().get_throttles()

    def get(self, request, payment_id: str):
        payment = get_object_or_404(Payment.objects.select_related('booking', 'booking__room'), pk=payment_id)
        if not user_has_branch_access(request.user, payment.booking.branch_id):
            raise PermissionDenied('Нет доступа к оплате этого филиала.')
        if not _user_can_read_payment(request.user, payment):
            raise PermissionDenied('Нет доступа к этой оплате.')
        payload = _payment_detail_payload(payment)
        return ok(data=payload, legacy=payload)

    def patch(self, request, payment_id: str):
        payment = get_object_or_404(Payment.objects.select_related('booking', 'booking__room'), pk=payment_id)
        if not user_has_branch_access(request.user, payment.booking.branch_id):
            raise PermissionDenied('Нет доступа к оплате этого филиала.')
        if not _user_can_read_payment(request.user, payment):
            raise PermissionDenied('Нет доступа к этой оплате.')
        before = {'amount_label': payment.amount_label, 'status': payment.status, 'method': payment.method or '', 'booking_label': payment.booking_label or '', 'trainer_amount_rub': payment.trainer_amount_rub}
        payment = service_patch_payment(payment=payment, payload=request.data)
        after = {'amount_label': payment.amount_label, 'status': payment.status, 'method': payment.method or '', 'booking_label': payment.booking_label or '', 'trainer_amount_rub': payment.trainer_amount_rub}
        changed = _audit_shallow_diff(before, after)
        if changed:
            _log_audit(user=request.user, action='payment_patched', entity_type='payment', entity_id=payment.id, branch_id=payment.booking.branch_id, payload={'changes': changed})
        payload = _payment_detail_payload(payment)
        return ok(data=payload, legacy=payload)

class PaymentReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id: str):
        payment = get_object_or_404(Payment.objects.select_related('booking', 'booking__branch', 'booking__room'), pk=payment_id)
        if not user_has_branch_access(request.user, payment.booking.branch_id):
            raise PermissionDenied('Нет доступа к оплате этого филиала.')
        if not _user_can_read_payment(request.user, payment):
            raise PermissionDenied('Нет доступа к этой квитанции.')
        receipt = get_or_create_receipt(payment)
        payload = {'id': receipt.id, 'paymentId': payment.id, 'issuedAt': receipt.created_at.isoformat(), 'snapshot': receipt.snapshot}
        return ok(data=payload, legacy=payload)

class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.request.method != 'PATCH':
            return []
        self.throttle_scope = 'booking_staff'
        return super().get_throttles()

    def get(self, request, booking_id: str):
        booking = get_object_or_404(Booking.objects.select_related('branch', 'room'), pk=booking_id)
        if not user_has_branch_access(request.user, booking.branch_id):
            raise PermissionDenied('Нет доступа к брони этого филиала.')
        if not _user_can_read_booking(request.user, booking):
            raise PermissionDenied('Можно просматривать только свои брони.')
        payload = _booking_detail_payload(booking)
        return ok(data=payload, legacy=payload)

    def patch(self, request, booking_id: str):
        booking = get_object_or_404(Booking.objects.select_related('branch', 'room'), pk=booking_id)
        if not user_has_branch_access(request.user, booking.branch_id):
            raise PermissionDenied('Нет доступа к брони этого филиала.')
        if not user_can_manage_branch_bookings(request.user):
            raise PermissionDenied('Недостаточно прав для изменения брони.')
        before = _booking_staff_audit_snapshot(booking)
        ser = BookingPatchSerializer(instance=booking, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        booking.refresh_from_db()
        after = _booking_staff_audit_snapshot(booking)
        diff = _audit_shallow_diff(before, after)
        if diff:
            _log_audit(user=request.user, action='booking_updated_staff', entity_type='booking', entity_id=booking.id, branch_id=booking.branch_id, payload={'changes': diff})
        payload = _booking_detail_payload(booking)
        return ok(data=payload, legacy=payload)

class MyBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        local = timezone.localdate()
        from_s = request.query_params.get('from') or (local - dt.timedelta(days=31)).isoformat()
        to_s = request.query_params.get('to') or (local + dt.timedelta(days=180)).isoformat()
        try:
            d0 = dt.date.fromisoformat(from_s)
            d1 = dt.date.fromisoformat(to_s)
        except ValueError:
            return Response({'detail': 'Неверный формат from/to (YYYY-MM-DD).'}, status=400)
        if d1 < d0:
            return Response({'detail': 'Дата «по» раньше даты «с».'}, status=400)
        try:
            limit, offset = _parse_pagination(request)
        except ValueError as exc:
            raise RestValidationError({'detail': str(exc)})
        rows = Booking.objects.filter(client_ref=_client_ref_for_user(request.user), date__gte=d0, date__lte=d1).select_related('room', 'branch').order_by('date', 'start_min', 'id')
        branch_id = (request.query_params.get('branch_id') or '').strip()
        if branch_id:
            rows = rows.filter(branch_id=branch_id)
        status_f = (request.query_params.get('status') or '').strip()
        if status_f:
            rows = rows.filter(status__icontains=status_f)
        kind_f = (request.query_params.get('kind') or '').strip()
        if kind_f:
            rows = rows.filter(kind=kind_f)
        total = rows.count()
        rows = rows[offset:offset + limit]
        out = []
        for b in rows:
            item = _booking_list_item(b)
            item['branchId'] = b.branch_id
            item['branchName'] = b.branch.name
            out.append(item)
        meta = _pagination_meta(request, total=total, limit=limit, offset=offset)
        return ok(data=out, meta=meta, legacy={'bookings': out, 'data': out, 'meta': meta, 'from': d0.isoformat(), 'to': d1.isoformat()})

class MyPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        local = timezone.localdate()
        from_s = request.query_params.get('from') or (local - dt.timedelta(days=31)).isoformat()
        to_s = request.query_params.get('to') or (local + dt.timedelta(days=180)).isoformat()
        try:
            d0 = dt.date.fromisoformat(from_s)
            d1 = dt.date.fromisoformat(to_s)
        except ValueError:
            return Response({'detail': 'Неверный формат from/to (YYYY-MM-DD).'}, status=400)
        if d1 < d0:
            return Response({'detail': 'Дата «по» раньше даты «с».'}, status=400)
        try:
            limit, offset = _parse_pagination(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        rows = Payment.objects.filter(booking__client_ref=_client_ref_for_user(request.user), booking__date__gte=d0, booking__date__lte=d1).select_related('booking', 'booking__room', 'booking__branch').order_by('-booking__date', '-booking__start_min', 'id')
        branch_id = (request.query_params.get('branch_id') or '').strip()
        if branch_id:
            rows = rows.filter(booking__branch_id=branch_id)
        status_f = (request.query_params.get('status') or '').strip()
        if status_f:
            rows = rows.filter(status__icontains=status_f)
        total = rows.count()
        rows = rows[offset:offset + limit]
        out = []
        for p in rows:
            item = _payment_list_item(p)
            item['branchId'] = p.booking.branch_id
            item['branchName'] = p.booking.branch.name
            out.append(item)
        meta = _pagination_meta(request, total=total, limit=limit, offset=offset)
        return ok(data=out, meta=meta, legacy={'payments': out, 'data': out, 'meta': meta, 'from': d0.isoformat(), 'to': d1.isoformat()})

class MyTrainerBookingsView(APIView):
    permission_classes = [IsAuthenticated, IsTrainerUser]

    def get(self, request):
        local = timezone.localdate()
        from_s = request.query_params.get('from') or (local - dt.timedelta(days=7)).isoformat()
        to_s = request.query_params.get('to') or (local + dt.timedelta(days=60)).isoformat()
        try:
            d0 = dt.date.fromisoformat(from_s)
            d1 = dt.date.fromisoformat(to_s)
        except ValueError:
            return Response({'detail': 'Неверный формат from/to (YYYY-MM-DD).'}, status=400)
        if d1 < d0:
            return Response({'detail': 'Дата «по» раньше даты «с».'}, status=400)
        try:
            limit, offset = _parse_pagination(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        branch_ids = list(BranchMembership.objects.filter(user=request.user).values_list('branch_id', flat=True))
        rows = Booking.objects.filter(branch_id__in=branch_ids, date__gte=d0, date__lte=d1).filter(trainer_bookings_filter_q(request.user)).select_related('room', 'branch')
        branch_id = (request.query_params.get('branch_id') or '').strip()
        if branch_id:
            rows = rows.filter(branch_id=branch_id)
        status_f = (request.query_params.get('status') or '').strip()
        if status_f:
            rows = rows.filter(status__icontains=status_f)
        outcome_f = (request.query_params.get('session_outcome') or '').strip()
        if outcome_f:
            rows = rows.filter(session_outcome=outcome_f)
        rows = rows.order_by('date', 'start_min', 'id')
        total = rows.count()
        page = rows[offset:offset + limit]
        out = []
        for b in page:
            item = _booking_list_item(b)
            item['branchId'] = b.branch_id
            item['branchName'] = b.branch.name
            out.append(item)
        meta = _pagination_meta(request, total=total, limit=limit, offset=offset)
        return ok(data=out, meta=meta, legacy={'bookings': out, 'data': out, 'meta': meta, 'from': d0.isoformat(), 'to': d1.isoformat()})

class MyTrainerEarningsView(APIView):
    permission_classes = [IsAuthenticated, IsTrainerUser]

    def get(self, request):
        local = timezone.localdate()
        from_s = request.query_params.get('from') or (local.replace(day=1) - dt.timedelta(days=60)).isoformat()
        to_s = request.query_params.get('to') or (local + dt.timedelta(days=1)).isoformat()
        try:
            d0 = dt.date.fromisoformat(from_s)
            d1 = dt.date.fromisoformat(to_s)
        except ValueError:
            return Response({'detail': 'Неверный формат from/to (YYYY-MM-DD).'}, status=400)
        if d1 < d0:
            return Response({'detail': 'Дата «по» раньше даты «с».'}, status=400)
        branch_ids = list(BranchMembership.objects.filter(user=request.user).values_list('branch_id', flat=True))
        branch_id = (request.query_params.get('branch_id') or '').strip()
        if branch_id:
            if branch_id not in branch_ids:
                raise PermissionDenied('Нет доступа к этому филиалу.')
            q_branch = [branch_id]
        else:
            q_branch = branch_ids
        payments = Payment.objects.filter(booking__trainer_user_id=request.user.pk, booking__branch_id__in=q_branch, booking__date__gte=d0, booking__date__lte=d1, status='Оплачено').select_related('booking').order_by('booking__date', 'booking__start_min', 'id')
        earned_completed = 0
        earned_other_outcomes = 0
        by_period: dict[str, dict[str, int]] = defaultdict(lambda: {'earnedRub': 0, 'sessionsCompleted': 0})
        for p in payments:
            rub = _trainer_earnings_rub_for_payment(p)
            b = p.booking
            period_key = b.date.strftime('%Y-%m')
            if (b.session_outcome or '') == Booking.SESSION_OUTCOME_COMPLETED:
                earned_completed += rub
                by_period[period_key]['earnedRub'] += rub
                by_period[period_key]['sessionsCompleted'] += 1
            else:
                earned_other_outcomes += rub
        periods = sorted(({'period': pk, 'earnedRub': vals['earnedRub'], 'sessionsCompleted': vals['sessionsCompleted']} for pk, vals in by_period.items()), key=lambda x: x['period'])
        lines = []
        for p in payments[:200]:
            b = p.booking
            lines.append({'paymentId': p.id, 'bookingId': b.id, 'bookingDate': b.date.isoformat(), 'amountLabel': p.amount_label, 'trainerRub': _trainer_earnings_rub_for_payment(p), 'sessionOutcome': b.session_outcome or Booking.SESSION_OUTCOME_PENDING, 'branchId': b.branch_id})
        payload = {'from': d0.isoformat(), 'to': d1.isoformat(), 'totals': {'earnedCompletedRub': earned_completed, 'paidAllocatedOtherOutcomesRub': earned_other_outcomes, 'note': 'В «заработано» входят только оплаченные позиции с session_outcome=completed.'}, 'periods': periods, 'lines': lines}
        return ok(data=payload, legacy=payload)

class TrainerBookingSessionOutcomeView(APIView):
    permission_classes = [IsAuthenticated, IsTrainerUser]
    throttle_scope = 'booking_mutate'

    def post(self, request, booking_id: str):
        booking = get_object_or_404(Booking.objects.select_related('branch', 'room'), pk=booking_id)
        if not user_has_branch_access(request.user, booking.branch_id):
            raise PermissionDenied('Нет доступа к этому филиалу.')
        if not user_is_assigned_trainer(request.user, booking):
            raise PermissionDenied('Вы не назначены тренером на эту бронь.')
        ser = TrainerSessionOutcomeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        new_outcome = ser.validated_data['session_outcome']
        old = booking.session_outcome or Booking.SESSION_OUTCOME_PENDING
        booking.session_outcome = new_outcome
        booking.save(update_fields=['session_outcome'])
        _log_audit(user=request.user, action='booking_session_outcome_trainer', entity_type='booking', entity_id=booking.id, branch_id=booking.branch_id, payload={'session_outcome_from': old, 'session_outcome_to': new_outcome})
        payload = _booking_detail_payload(booking)
        return ok(data=payload, legacy=payload)

class TrainerAvailabilityListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL, IsTrainerUser]

    def get(self, request, branch_id: str):
        rows = TrainerAvailabilityWindow.objects.filter(branch_id=branch_id, user=request.user).order_by('weekday', 'start_min', 'id')
        out = [{'id': w.id, 'weekday': w.weekday, 'startMin': w.start_min, 'endMin': w.end_min, 'start': _min_to_hhmm(w.start_min), 'end': _min_to_hhmm(w.end_min), 'note': w.note or '', 'isActive': w.is_active} for w in rows]
        return ok(data=out, legacy={'windows': out})

    def post(self, request, branch_id: str):
        ser = TrainerAvailabilityWindowSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vd = ser.validated_data
        if 'weekday' not in vd or 'start_min' not in vd or 'end_min' not in vd:
            return Response({'detail': 'Укажите weekday, start_min и end_min.'}, status=400)
        wid = f'tw{uuid.uuid4().hex[:12]}'
        w = TrainerAvailabilityWindow.objects.create(id=wid, user=request.user, branch_id=branch_id, weekday=vd['weekday'], start_min=vd['start_min'], end_min=vd['end_min'], note=vd.get('note') or '', is_active=vd.get('is_active', True))
        _log_audit(user=request.user, action='trainer_availability_created', entity_type='trainer_availability', entity_id=w.id, branch_id=branch_id, payload={'weekday': w.weekday, 'start_min': w.start_min, 'end_min': w.end_min})
        item = {'id': w.id, 'weekday': w.weekday, 'startMin': w.start_min, 'endMin': w.end_min, 'start': _min_to_hhmm(w.start_min), 'end': _min_to_hhmm(w.end_min), 'note': w.note or '', 'isActive': w.is_active}
        return created(data=item, legacy=item)

class TrainerAvailabilityDetailView(APIView):
    permission_classes = [IsAuthenticated, IsBranchMemberByURL, IsTrainerUser]

    def patch(self, request, branch_id: str, window_id: str):
        w = get_object_or_404(TrainerAvailabilityWindow, pk=window_id, branch_id=branch_id, user=request.user)
        ser = TrainerAvailabilityWindowSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if 'weekday' in data:
            w.weekday = data['weekday']
        if 'start_min' in data:
            w.start_min = data['start_min']
        if 'end_min' in data:
            w.end_min = data['end_min']
        if 'note' in data:
            w.note = data['note'] or ''
        if 'is_active' in data:
            w.is_active = bool(data['is_active'])
        if w.end_min <= w.start_min:
            return Response({'detail': 'Конец окна должен быть позже начала.'}, status=400)
        w.save()
        _log_audit(user=request.user, action='trainer_availability_updated', entity_type='trainer_availability', entity_id=w.id, branch_id=branch_id, payload={'weekday': w.weekday, 'start_min': w.start_min, 'end_min': w.end_min, 'is_active': w.is_active})
        item = {'id': w.id, 'weekday': w.weekday, 'startMin': w.start_min, 'endMin': w.end_min, 'start': _min_to_hhmm(w.start_min), 'end': _min_to_hhmm(w.end_min), 'note': w.note or '', 'isActive': w.is_active}
        return ok(data=item, legacy=item)

    def delete(self, request, branch_id: str, window_id: str):
        w = get_object_or_404(TrainerAvailabilityWindow, pk=window_id, branch_id=branch_id, user=request.user)
        wid = w.id
        w.delete()
        _log_audit(user=request.user, action='trainer_availability_deleted', entity_type='trainer_availability', entity_id=wid, branch_id=branch_id, payload={})
        return ok(data={'detail': 'Удалено.', 'id': wid}, legacy={'detail': 'Удалено.', 'id': wid})

class AdminAuditLogView(APIView):
    permission_classes = [IsAuthenticated, CanViewAuditPermission]

    def get(self, request):
        rows = AuditLog.objects.select_related('user').order_by('-created_at', '-id')
        branch_id = (request.query_params.get('branch_id') or '').strip()
        if branch_id:
            rows = rows.filter(branch_id=branch_id)
        action = (request.query_params.get('action') or '').strip()
        if action:
            rows = rows.filter(action=action)
        entity_type = (request.query_params.get('entity_type') or '').strip()
        if entity_type:
            rows = rows.filter(entity_type=entity_type)
        entity_id = (request.query_params.get('entity_id') or '').strip()
        if entity_id:
            rows = rows.filter(entity_id=entity_id)
        q_audit = (request.query_params.get('q') or '').strip()
        if q_audit:
            rows = rows.filter(Q(action__icontains=q_audit) | Q(entity_type__icontains=q_audit) | Q(entity_id__icontains=q_audit) | Q(branch_id__icontains=q_audit))
        user_id = (request.query_params.get('user_id') or '').strip()
        if user_id:
            try:
                rows = rows.filter(user_id=int(user_id))
            except ValueError:
                return Response({'detail': 'user_id должен быть целым числом.'}, status=400)
        from_s = (request.query_params.get('from') or '').strip()
        if from_s:
            try:
                rows = rows.filter(created_at__date__gte=dt.date.fromisoformat(from_s))
            except ValueError:
                return Response({'detail': 'Неверный формат from (YYYY-MM-DD).'}, status=400)
        to_s = (request.query_params.get('to') or '').strip()
        if to_s:
            try:
                rows = rows.filter(created_at__date__lte=dt.date.fromisoformat(to_s))
            except ValueError:
                return Response({'detail': 'Неверный формат to (YYYY-MM-DD).'}, status=400)
        try:
            limit, offset = _parse_pagination(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        total = rows.count()
        rows = rows[offset:offset + limit]
        out = []
        for a in rows:
            out.append({'id': a.id, 'at': a.created_at.isoformat(), 'action': a.action, 'entityType': a.entity_type, 'entityId': a.entity_id, 'branchId': a.branch_id, 'userId': a.user_id, 'payload': a.payload or {}})
        meta = _pagination_meta(request, total=total, limit=limit, offset=offset)
        return ok(data=out, meta=meta, legacy={'logs': out, 'data': out, 'meta': meta})

class AdminIdempotencyView(APIView):
    permission_classes = [IsAuthenticated, CanViewAuditPermission]

    def get(self, request):
        rows = IdempotencyRecord.objects.select_related('user').order_by('-created_at', '-id')
        endpoint = (request.query_params.get('endpoint') or '').strip()
        if endpoint:
            rows = rows.filter(endpoint=endpoint)
        key = (request.query_params.get('key') or '').strip()
        if key:
            rows = rows.filter(key=key)
        user_id = (request.query_params.get('user_id') or '').strip()
        if user_id:
            try:
                rows = rows.filter(user_id=int(user_id))
            except ValueError:
                return Response({'detail': 'user_id должен быть целым числом.'}, status=400)
        from_s = (request.query_params.get('from') or '').strip()
        if from_s:
            try:
                rows = rows.filter(created_at__date__gte=dt.date.fromisoformat(from_s))
            except ValueError:
                return Response({'detail': 'Неверный формат from (YYYY-MM-DD).'}, status=400)
        to_s = (request.query_params.get('to') or '').strip()
        if to_s:
            try:
                rows = rows.filter(created_at__date__lte=dt.date.fromisoformat(to_s))
            except ValueError:
                return Response({'detail': 'Неверный формат to (YYYY-MM-DD).'}, status=400)
        try:
            limit, offset = _parse_pagination(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        total = rows.count()
        rows = rows[offset:offset + limit]
        out = []
        for r in rows:
            out.append({'id': r.id, 'at': r.created_at.isoformat(), 'userId': r.user_id, 'endpoint': r.endpoint, 'key': r.key, 'requestHash': r.request_hash, 'responseStatus': r.response_status, 'responseBody': r.response_body or {}})
        meta = _pagination_meta(request, total=total, limit=limit, offset=offset)
        return ok(data=out, meta=meta, legacy={'records': out, 'data': out, 'meta': meta})

class BookingCancelMeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'booking_mutate'

    def post(self, request, booking_id: str):
        current = get_object_or_404(Booking.objects.only('id', 'status'), pk=booking_id)
        old_status = current.status or ''
        booking = service_cancel_own_booking(user=request.user, booking_id=booking_id)
        _log_audit(user=request.user, action='booking_cancelled_client', entity_type='booking', entity_id=booking.id, branch_id=booking.branch_id, payload={'old_status': old_status, 'new_status': booking.status})
        payload = {'id': booking.id, 'status': booking.status}
        if old_status and 'отмен' in old_status.lower():
            payload['detail'] = 'Бронь уже отменена.'
        return ok(data=payload, legacy=payload)

class BookingRescheduleMeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'booking_mutate'

    def post(self, request, booking_id: str):
        booking = get_object_or_404(Booking.objects.select_related('branch', 'room'), pk=booking_id)
        old_data = {'date': booking.date.isoformat(), 'start_min': booking.start_min, 'end_min': booking.end_min, 'room_id': booking.room_id}
        booking = service_reschedule_own_booking(user=request.user, booking_id=booking_id, payload=request.data)
        _log_audit(user=request.user, action='booking_rescheduled_client', entity_type='booking', entity_id=booking.id, branch_id=booking.branch_id, payload={'old': old_data, 'new': {'date': booking.date.isoformat(), 'start_min': booking.start_min, 'end_min': booking.end_min, 'room_id': booking.room_id}})
        payload = {'id': booking.id, 'status': booking.status, 'date': booking.date.isoformat(), 'start_min': booking.start_min, 'end_min': booking.end_min, 'room_id': booking.room_id}
        return ok(data=payload, legacy=payload)
