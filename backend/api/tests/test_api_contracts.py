from __future__ import annotations
import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchEvent, BranchMembership, Payment, Room, UserProfile
from api.tests.contract_helpers import assert_required_types, unwrap_envelope
User = get_user_model()

class ApiContractTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b-contract', name='B', hint='')
        self.room = Room.objects.create(id='r-contract', branch=self.branch, label='C', sort_order=0)
        self.user = User.objects.create_user(username='u-contract@test', email='u-contract@test', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='U', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        tok, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {tok.key}')
        self.booking = Booking.objects.create(id='bk-contract', branch=self.branch, room=self.room, date=dt.date(2026, 11, 1), start_min=9 * 60, end_min=10 * 60, client_name='U', client_ref=f'u{self.user.pk}')
        Payment.objects.create(id='p-contract', booking=self.booking, amount_label='800 ₽', status='К оплате')
        future = dt.date(2026, 12, 1)
        self.event = BranchEvent.objects.create(id='ev-contract', branch=self.branch, title='Contract Event', kind=BranchEvent.KIND_TOURNAMENT, start_date=future, end_date=future, status='Черновик')

    def test_auth_me_contract(self):
        r = self.api.get('/api/auth/me/')
        self.assertEqual(r.status_code, 200)
        u = unwrap_envelope(dict(r.data))['user']
        assert_required_types(u, {'id': int, 'email': str, 'name': str, 'phone': str, 'role': str})

    def test_branch_list_contract(self):
        r = self.api.get('/api/branches/')
        self.assertEqual(r.status_code, 200)
        rows = unwrap_envelope(dict(r.data))
        self.assertIsInstance(rows, list)
        self.assertGreaterEqual(len(rows), 1)
        assert_required_types(rows[0], {'id': str, 'name': str, 'hint': str})

    def test_error_envelope_401_contract(self):
        r = APIClient().get('/api/auth/me/')
        self.assertEqual(r.status_code, 401)
        body = dict(r.data)
        self.assertTrue('error' in body or 'detail' in body)
        if 'error' in body:
            self.assertIn('code', body['error'])

    def test_event_detail_contract(self):
        r = self.api.get(f'/api/events/{self.event.id}/')
        self.assertEqual(r.status_code, 200)
        d = dict(r.data)
        required = {'id': str, 'branchId': str, 'title': str, 'kind': str, 'start_date': str, 'end_date': str, 'status': str}
        for k, t in required.items():
            self.assertIn(k, d, msg=k)
            self.assertIsInstance(d[k], t, msg=k)

    def test_payment_detail_contract(self):
        r = self.api.get(f'/api/payments/p-contract/')
        self.assertEqual(r.status_code, 200)
        d = unwrap_envelope(dict(r.data))
        assert_required_types(d, {'id': str, 'client': str, 'amount': str, 'status': str, 'booking': str, 'method': str, 'bookingId': str, 'bookingDate': str})
        self.assertIsInstance(d.get('history'), list)
