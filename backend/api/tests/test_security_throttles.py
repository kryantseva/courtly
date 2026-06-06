from __future__ import annotations
import datetime as dt
import hashlib
import hmac
import json
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Payment, Room, UserProfile
User = get_user_model()
_RF_THROTTLE = {'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'], 'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'], 'DEFAULT_THROTTLE_CLASSES': ['api.throttling.LiveScopedRateThrottle'], 'DEFAULT_THROTTLE_RATES': {'auth': '100/min', 'profile': '100/min', 'booking_write': '100/min', 'booking_mutate': '100/min', 'booking_staff': '100/min', 'payment_mutate': '2/min', 'payment_webhook': '2/min', 'event_mutate': '100/min'}, 'EXCEPTION_HANDLER': 'api.exceptions.api_exception_handler'}

@override_settings(REST_FRAMEWORK=_RF_THROTTLE, PAYMENT_WEBHOOK_SECRET='sec-throttle-test')
class SecuritySensitiveThrottleTests(TestCase):

    def setUp(self):
        cache.clear()
        self.branch = Branch.objects.create(id='b-th', name='B', hint='')
        self.room = Room.objects.create(id='r-th', branch=self.branch, label='C', sort_order=0)
        self.admin = User.objects.create_user(username='adm-th@test', email='adm-th@test', password='Pass12345!')
        UserProfile.objects.create(user=self.admin, display_name='A', role=UserProfile.ROLE_ADMIN)
        BranchMembership.objects.create(user=self.admin, branch=self.branch)
        self.booking = Booking.objects.create(id='bk-th', branch=self.branch, room=self.room, date=dt.date(2026, 8, 1), start_min=600, end_min=660, client_name='X', client_ref=f'u{self.admin.pk}')
        tok, _ = Token.objects.get_or_create(user=self.admin)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {tok.key}')

    def test_payment_create_throttled_429(self):
        for i in range(3):
            res = self.api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.booking.id, 'amount_label': f'{100 + i} ₽', 'status': 'К оплате'}, format='json')
            if i < 2:
                self.assertEqual(res.status_code, 201, res.content)
            else:
                self.assertEqual(res.status_code, 429, res.content)

    def test_payment_patch_throttled_429(self):
        p = Payment.objects.create(id='p-th-1', booking=self.booking, amount_label='500 ₽', status='К оплате')
        for i in range(3):
            res = self.api.patch(f'/api/payments/{p.id}/', {'booking_label': f'v{i}'}, format='json')
            if i < 2:
                self.assertEqual(res.status_code, 200, res.content)
            else:
                self.assertEqual(res.status_code, 429, res.content)

    def test_payment_webhook_throttled_429(self):
        p = Payment.objects.create(id='p-wh-th', booking=self.booking, amount_label='100 ₽', status='К оплате')
        body = json.dumps({'payment_id': p.id, 'status': 'paid'}).encode()
        sig = hmac.new(b'sec-throttle-test', body, hashlib.sha256).hexdigest()
        cli = APIClient()
        for i in range(3):
            res = cli.post('/api/webhooks/payments/', data=body, content_type='application/json', HTTP_IDEMPOTENCY_KEY=f'th-wh-{i}', HTTP_X_COURTLY_SIGNATURE=sig)
            if i < 2:
                self.assertEqual(res.status_code, 200, res.content)
            else:
                self.assertEqual(res.status_code, 429, res.content)
