import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Room, UserProfile
User = get_user_model()

class ApiArchitectureTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.user = User.objects.create_user(username='arch@test.local', email='arch@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='Arch', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        Booking.objects.create(id='bk1', branch=self.branch, room=self.room, date=dt.date(2026, 8, 1), start_min=9 * 60, end_min=10 * 60, client_name='Arch', client_ref=f'u{self.user.pk}', status='Ожидает')
        token, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_v1_alias_and_deprecation_headers(self):
        r_legacy = self.api.get('/api/me/bookings/', {'limit': 10, 'offset': 0})
        self.assertEqual(r_legacy.status_code, 200)
        self.assertEqual(r_legacy['Deprecation'], 'true')
        self.assertIn('data', r_legacy.data)
        r_v1 = self.api.get('/api/v1/me/bookings/', {'limit': 10, 'offset': 0})
        self.assertEqual(r_v1.status_code, 200)
        self.assertIn('data', r_v1.data)
        self.assertIn('meta', r_v1.data)
        self.assertIn('bookings', r_v1.data)

    def test_error_contract_shape(self):
        bad = self.api.get('/api/v1/me/bookings/', {'limit': 'oops', 'offset': 0})
        self.assertEqual(bad.status_code, 400)
        self.assertIn('error', bad.data)
        self.assertIn('code', bad.data['error'])
        self.assertIn('message', bad.data['error'])
        self.assertIn('details', bad.data['error'])
        self.assertIn('detail', bad.data)
