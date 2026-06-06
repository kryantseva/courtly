from __future__ import annotations
import hashlib
import hmac
import json
import uuid
import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Payment, Room, UserProfile
User = get_user_model()

def _webhook_signature(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()

@override_settings(PAYMENT_WEBHOOK_SECRET='whsec-test')
class PaymentWebhookAndReceiptTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b_pay', name='Branch Pay', hint='')
        self.room = Room.objects.create(id='r_pay', branch=self.branch, label='Court', sort_order=0)
        self.admin = User.objects.create_user(username='adm_pay@test', email='adm_pay@test', password='Pass12345!')
        self.client_u = User.objects.create_user(username='cl_pay@test', email='cl_pay@test', password='Pass12345!')
        UserProfile.objects.create(user=self.admin, display_name='Adm', role=UserProfile.ROLE_ADMIN)
        UserProfile.objects.create(user=self.client_u, display_name='Cl', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.admin, branch=self.branch)
        BranchMembership.objects.create(user=self.client_u, branch=self.branch)
        self.booking = Booking.objects.create(id='bk_pay_1', branch=self.branch, room=self.room, date=dt.date(2026, 7, 1), start_min=600, end_min=660, client_name='Client Pay', client_ref=f'u{self.client_u.pk}', paid=False)
        self.payment = Payment.objects.create(id='p_pay_test', booking=self.booking, amount_label='1000 ₽', status='К оплате')
        tok, _ = Token.objects.get_or_create(user=self.admin)
        self.admin_api = APIClient()
        self.admin_api.credentials(HTTP_AUTHORIZATION=f'Token {tok.key}')
        ctok, _ = Token.objects.get_or_create(user=self.client_u)
        self.client_api = APIClient()
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Token {ctok.key}')

    def test_webhook_rejects_bad_signature(self):
        body = json.dumps({'payment_id': self.payment.id, 'status': 'paid'}).encode()
        res = self.client_api.post('/api/webhooks/payments/', data=body, content_type='application/json', HTTP_IDEMPOTENCY_KEY='k1', HTTP_X_COURTLY_SIGNATURE='deadbeef')
        self.assertEqual(res.status_code, 401)

    def test_webhook_idempotent_same_body(self):
        body = json.dumps({'payment_id': self.payment.id, 'status': 'paid'}).encode()
        sig = _webhook_signature('whsec-test', body)
        key = 'idem-' + uuid.uuid4().hex
        res1 = self.client_api.post('/api/webhooks/payments/', data=body, content_type='application/json', HTTP_IDEMPOTENCY_KEY=key, HTTP_X_COURTLY_SIGNATURE=sig)
        self.assertEqual(res1.status_code, 200, res1.content)
        self.payment.refresh_from_db()
        self.booking.refresh_from_db()
        self.assertEqual(self.payment.status, 'Оплачено')
        self.assertTrue(self.booking.paid)
        res2 = self.client_api.post('/api/webhooks/payments/', data=body, content_type='application/json', HTTP_IDEMPOTENCY_KEY=key, HTTP_X_COURTLY_SIGNATURE=sig)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(json.loads(res2.content.decode()), json.loads(res1.content.decode()))

    def test_webhook_idempotency_conflict_different_body(self):
        body1 = json.dumps({'payment_id': self.payment.id, 'status': 'paid'}).encode()
        sig1 = _webhook_signature('whsec-test', body1)
        key = 'idem-conflict-' + uuid.uuid4().hex
        r1 = self.client_api.post('/api/webhooks/payments/', data=body1, content_type='application/json', HTTP_IDEMPOTENCY_KEY=key, HTTP_X_COURTLY_SIGNATURE=sig1)
        self.assertEqual(r1.status_code, 200)
        body2 = json.dumps({'payment_id': self.payment.id, 'status': 'failed'}).encode()
        sig2 = _webhook_signature('whsec-test', body2)
        r2 = self.client_api.post('/api/webhooks/payments/', data=body2, content_type='application/json', HTTP_IDEMPOTENCY_KEY=key, HTTP_X_COURTLY_SIGNATURE=sig2)
        self.assertEqual(r2.status_code, 409)

    def test_client_can_get_own_payment_and_receipt(self):
        g = self.client_api.get(f'/api/payments/{self.payment.id}/')
        self.assertEqual(g.status_code, 200)
        r = self.client_api.get(f'/api/payments/{self.payment.id}/receipt/')
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.content.decode())
        self.assertIn('snapshot', body)
        self.assertEqual(body['paymentId'], self.payment.id)
        r2 = self.client_api.get(f'/api/payments/{self.payment.id}/receipt/')
        body2 = json.loads(r2.content.decode())
        self.assertEqual(body2['id'], body['id'])

    def test_patch_sets_booking_paid_and_notification_for_client(self):
        from api.models import UserNotification
        created = self.admin_api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.booking.id, 'amount_label': '500 ₽', 'status': 'К оплате'}, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        pay_id = created.data['id']
        n0 = UserNotification.objects.filter(user=self.client_u).count()
        patched = self.admin_api.patch(f'/api/payments/{pay_id}/', {'status': 'Оплачено'}, format='json')
        self.assertEqual(patched.status_code, 200, patched.content)
        self.booking.refresh_from_db()
        self.assertTrue(self.booking.paid)
        self.assertGreater(UserNotification.objects.filter(user=self.client_u).count(), n0)
