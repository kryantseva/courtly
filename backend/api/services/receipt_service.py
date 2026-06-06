from __future__ import annotations
import uuid
from api.models import Payment, PaymentReceipt

def build_receipt_snapshot(payment: Payment) -> dict:
    booking = payment.booking
    branch = booking.branch
    room = booking.room
    return {'title': 'Квитанция', 'paymentId': payment.id, 'amount': payment.amount_label, 'status': payment.status, 'method': payment.method or '', 'bookingId': booking.id, 'bookingLabel': payment.booking_label or '', 'branchId': branch.id, 'branchName': branch.name, 'roomLabel': room.label if room else '', 'clientName': booking.client_name, 'bookingDate': booking.date.isoformat()}

def get_or_create_receipt(payment: Payment) -> PaymentReceipt:
    existing = getattr(payment, 'receipt', None)
    if existing:
        return existing
    snap = build_receipt_snapshot(payment)
    rid = f'rc{uuid.uuid4().hex[:14]}'
    return PaymentReceipt.objects.create(id=rid, payment=payment, snapshot=snap)
