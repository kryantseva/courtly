from __future__ import annotations
import hashlib
import hmac
import json
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from .models import Payment, PaymentWebhookIdempotency
from .payment_status import PaymentStatusError, assert_transition_allowed
from .services.payment_hooks import after_payment_saved

def _sign_body(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()

@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_scope = 'payment_webhook'

    def post(self, request):
        secret = getattr(settings, 'PAYMENT_WEBHOOK_SECRET', '') or ''
        if not secret:
            return JsonResponse({'detail': 'Webhook не настроен.'}, status=503)
        raw = request.body or b''
        sig_hdr = (request.META.get('HTTP_X_COURTLY_SIGNATURE') or '').strip()
        expected = _sign_body(secret, raw)
        if not sig_hdr or not hmac.compare_digest(sig_hdr, expected):
            return JsonResponse({'detail': 'Неверная подпись.'}, status=401)
        idem = (request.META.get('HTTP_IDEMPOTENCY_KEY') or '').strip()
        if not idem:
            return JsonResponse({'detail': 'Требуется заголовок Idempotency-Key.'}, status=400)
        body_hash = hashlib.sha256(raw).hexdigest()
        try:
            payload = json.loads(raw.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return JsonResponse({'detail': 'Ожидается JSON в теле запроса.'}, status=400)
        payment_id = (payload.get('payment_id') or payload.get('paymentId') or '').strip()
        status_raw = payload.get('status')
        if not payment_id:
            return JsonResponse({'detail': 'Поле payment_id обязательно.'}, status=400)
        if status_raw is None or str(status_raw).strip() == '':
            return JsonResponse({'detail': 'Поле status обязательно.'}, status=400)
        with transaction.atomic():
            row = PaymentWebhookIdempotency.objects.select_for_update().filter(key=idem).first()
            if row:
                if row.body_sha256 != body_hash:
                    return JsonResponse({'detail': 'Ключ идемпотентности уже использован с другим телом запроса.'}, status=409)
                return JsonResponse(row.response_body, status=row.response_status)
            pay = Payment.objects.select_for_update().select_related('booking').filter(pk=payment_id).first()
            if not pay:
                return JsonResponse({'detail': 'Платеж не найден.'}, status=404)
            old_status = pay.status
            try:
                old_c, new_c = assert_transition_allowed(old_status, str(status_raw))
            except PaymentStatusError as exc:
                return JsonResponse({'detail': str(exc)}, status=400)
            if old_c != new_c:
                pay.status = new_c
                pay.save(update_fields=['status'])
            after_payment_saved(payment=pay, previous_status=old_status)
            pay.booking.refresh_from_db()
            result = {'paymentId': pay.id, 'status': pay.status, 'bookingId': pay.booking_id, 'bookingPaid': pay.booking.paid}
            PaymentWebhookIdempotency.objects.create(key=idem, body_sha256=body_hash, response_status=200, response_body=result)
        return JsonResponse(result, status=200)
