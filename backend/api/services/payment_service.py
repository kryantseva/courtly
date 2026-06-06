from __future__ import annotations
from api.models import Payment
from api.serializers import PaymentCreateSerializer, PaymentPatchSerializer
from api.services.payment_hooks import after_payment_saved

def create_payment(*, branch, payload: dict) -> Payment:
    ser = PaymentCreateSerializer(data=payload)
    ser.is_valid(raise_exception=True)
    payment = ser.create(ser.validated_data, branch)
    after_payment_saved(payment=payment, previous_status=None)
    return payment

def patch_payment(*, payment: Payment, payload: dict) -> Payment:
    previous_status = payment.status
    ser = PaymentPatchSerializer(instance=payment, data=payload, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    payment.refresh_from_db()
    after_payment_saved(payment=payment, previous_status=previous_status)
    return payment
