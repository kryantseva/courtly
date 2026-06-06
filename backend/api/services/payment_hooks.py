from __future__ import annotations
import uuid
from django.db import transaction
from api.models import Booking, Payment, UserNotification
from api.payment_status import PAYMENT_STATUS_CANCELLED, PAYMENT_STATUS_FAILED, PAYMENT_STATUS_PAID, PAYMENT_STATUS_PENDING, PAYMENT_STATUS_REFUNDED

def _client_user_id_from_booking(booking: Booking) -> int | None:
    ref = (booking.client_ref or '').strip()
    if not ref.startswith('u'):
        return None
    try:
        return int(ref[1:], 10)
    except ValueError:
        return None

def sync_booking_paid_from_payments(booking: Booking) -> None:
    has_paid = booking.payments.filter(status=PAYMENT_STATUS_PAID).exists()
    if booking.paid == has_paid:
        return
    booking.paid = has_paid
    booking.save(update_fields=['paid'])

def _notification_copy(new_status: str) -> tuple[str, str] | None:
    if new_status == PAYMENT_STATUS_PENDING:
        return ('К оплате', 'Ожидается оплата по брони. Откройте детали, чтобы завершить платёж.')
    if new_status == PAYMENT_STATUS_PAID:
        return ('Оплачено', 'Платёж по брони успешно проведён.')
    if new_status == PAYMENT_STATUS_FAILED:
        return ('Ошибка оплаты', 'Платёж не прошёл. Попробуйте снова или свяжитесь с клубом.')
    if new_status == PAYMENT_STATUS_REFUNDED:
        return ('Возврат средств', 'По брони оформлен возврат платежа.')
    if new_status == PAYMENT_STATUS_CANCELLED:
        return ('Платёж отменён', 'Платёж по брони отменён.')
    return None

def deliver_payment_notifications(payment: Payment, old_status: str | None, new_status: str) -> None:
    if old_status is not None and old_status == new_status:
        return
    uid = _client_user_id_from_booking(payment.booking)
    if uid is None:
        return
    copy = _notification_copy(new_status)
    if copy is None:
        return
    title, body = copy
    nid = f'n{uuid.uuid4().hex[:15]}'
    UserNotification.objects.create(id=nid, user_id=uid, title=title, body=body, link_path=f'/bookings/{payment.booking_id}', event_id='')

def after_payment_saved(*, payment: Payment, previous_status: str | None) -> None:
    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(pk=payment.booking_id)
        sync_booking_paid_from_payments(booking)
    deliver_payment_notifications(payment, previous_status, payment.status)
