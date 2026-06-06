from __future__ import annotations
import datetime as dt
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError
from api.access import user_has_branch_access
from api.booking_overlap import find_overlapping_booking
from api.event_booking_conflict import find_conflicting_event_for_booking
from api.models import Booking, Room
from api.serializers import BookingClientSelfSerializer, BookingCreateSerializer

def create_staff_booking(*, user, branch, payload: dict) -> Booking:
    if not user_has_branch_access(user, branch.id):
        raise PermissionDenied('Нет доступа к этому филиалу.')
    ser = BookingCreateSerializer(data=payload)
    ser.is_valid(raise_exception=True)
    return ser.create(ser.validated_data, branch)

def create_client_booking(*, user, branch, payload: dict) -> Booking:
    if not user_has_branch_access(user, branch.id):
        raise PermissionDenied('Нет доступа к этому филиалу.')
    ser = BookingClientSelfSerializer(data=payload)
    ser.is_valid(raise_exception=True)
    return ser.create(ser.validated_data, branch, user)

def cancel_own_booking(*, user, booking_id: str) -> Booking:
    booking = get_object_or_404(Booking.objects.select_related('branch', 'room'), pk=booking_id)
    if not user_has_branch_access(user, booking.branch_id):
        raise PermissionDenied('Нет доступа к брони этого филиала.')
    if booking.client_ref != f'u{user.pk}':
        raise PermissionDenied('Можно отменять только свои брони.')
    if booking.status and 'отмен' in booking.status.lower():
        return booking
    booking.status = 'Отменено клиентом'
    booking.confirmed = False
    booking.save(update_fields=['status', 'confirmed'])
    return booking

def reschedule_own_booking(*, user, booking_id: str, payload: dict) -> Booking:
    booking = get_object_or_404(Booking.objects.select_related('branch', 'room'), pk=booking_id)
    if not user_has_branch_access(user, booking.branch_id):
        raise PermissionDenied('Нет доступа к брони этого филиала.')
    if booking.client_ref != f'u{user.pk}':
        raise PermissionDenied('Можно переносить только свои брони.')
    if booking.status and 'отмен' in booking.status.lower():
        raise ValidationError({'detail': 'Нельзя перенести отменённую бронь.'})
    room_id = payload.get('room_id') or booking.room_id
    date_s = (payload.get('date') or '').strip()
    if not date_s:
        raise ValidationError({'detail': 'Поле date обязательно (YYYY-MM-DD).'})
    try:
        day = dt.date.fromisoformat(date_s)
    except ValueError as exc:
        raise ValidationError({'detail': 'Неверный формат date (YYYY-MM-DD).'}) from exc
    try:
        start_min = int(payload.get('start_min'))
        end_min = int(payload.get('end_min'))
    except (TypeError, ValueError) as exc:
        raise ValidationError({'detail': 'start_min/end_min должны быть числами.'}) from exc
    if end_min <= start_min:
        raise ValidationError({'detail': 'Время окончания должно быть позже начала.'})
    room = get_object_or_404(Room, pk=room_id, branch=booking.branch)
    conflict = find_conflicting_event_for_booking(booking.branch_id, room.id, day, start_min, end_min)
    if conflict:
        raise ValidationError({'detail': f'Новый слот пересекается с событием «{conflict.title}».'})
    overlap = find_overlapping_booking(booking.branch_id, room.id, day, start_min, end_min, exclude_booking_id=booking.id)
    if overlap:
        raise ValidationError({'detail': 'Новый слот уже занят другой бронью.'})
    booking.room = room
    booking.date = day
    booking.start_min = start_min
    booking.end_min = end_min
    if not booking.status or 'отмен' in booking.status.lower():
        booking.status = 'Ожидает'
    booking.confirmed = False
    booking.save(update_fields=['room', 'date', 'start_min', 'end_min', 'status', 'confirmed'])
    return booking
