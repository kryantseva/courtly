import datetime as dt
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Room, UserProfile
from api.tests.contract_helpers import assert_validation_field
User = get_user_model()

class Sprint4PaymentsAndThrottleTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.admin_user = User.objects.create_user(username='admin@test.local', email='admin@test.local', password='Pass12345!')
        self.client_user = User.objects.create_user(username='client@test.local', email='client@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.admin_user, display_name='Admin', role=UserProfile.ROLE_ADMIN)
        UserProfile.objects.create(user=self.client_user, display_name='Client', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.admin_user, branch=self.branch)
        BranchMembership.objects.create(user=self.client_user, branch=self.branch)
        self.client_booking = Booking.objects.create(id='bk1', branch=self.branch, room=self.room, date=dt.date(2026, 6, 1), start_min=10 * 60, end_min=11 * 60, client_name='Client', client_ref=f'u{self.client_user.pk}', status='Ожидает')
        token, _ = Token.objects.get_or_create(user=self.admin_user)
        self.admin_api = APIClient()
        self.admin_api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_payment_create_rejects_unknown_status(self):
        res = self.admin_api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.client_booking.id, 'amount_label': '2500 ₽', 'status': 'Частично'}, format='json')
        self.assertEqual(res.status_code, 400)
        assert_validation_field(res.data, 'status')

    def test_payment_patch_rejects_unknown_status(self):
        created = self.admin_api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.client_booking.id, 'amount_label': '2500 ₽', 'status': 'К оплате'}, format='json')
        self.assertEqual(created.status_code, 201)
        pid = created.data['id']
        patched = self.admin_api.patch(f'/api/payments/{pid}/', {'status': 'Странный статус'}, format='json')
        self.assertEqual(patched.status_code, 400)
        assert_validation_field(patched.data, 'status')

    def test_payment_status_transition_allows_pending_to_paid(self):
        created = self.admin_api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.client_booking.id, 'amount_label': '2500 ₽', 'status': 'К оплате'}, format='json')
        self.assertEqual(created.status_code, 201)
        pid = created.data['id']
        patched = self.admin_api.patch(f'/api/payments/{pid}/', {'status': 'Оплачено'}, format='json')
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data['status'], 'Оплачено')

    def test_payment_status_transition_rejects_paid_to_failed(self):
        created = self.admin_api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.client_booking.id, 'amount_label': '2500 ₽', 'status': 'Оплачено'}, format='json')
        self.assertEqual(created.status_code, 201)
        pid = created.data['id']
        patched = self.admin_api.patch(f'/api/payments/{pid}/', {'status': 'Ошибка'}, format='json')
        self.assertEqual(patched.status_code, 400)
        assert_validation_field(patched.data, 'status')

    @override_settings(REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'], 'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'], 'DEFAULT_THROTTLE_CLASSES': ['api.throttling.LiveScopedRateThrottle'], 'DEFAULT_THROTTLE_RATES': {'auth': '1/min', 'profile': '100/min', 'booking_write': '1/min', 'booking_mutate': '100/min'}})
    def test_throttle_on_auth_and_booking_self(self):
        cache.clear()
        api = APIClient()
        first_login = api.post('/api/auth/login/', {'email': 'client@test.local', 'password': 'wrong'}, format='json')
        self.assertEqual(first_login.status_code, 400)
        second_login = api.post('/api/auth/login/', {'email': 'client@test.local', 'password': 'wrong'}, format='json')
        self.assertEqual(second_login.status_code, 429)
        token, _ = Token.objects.get_or_create(user=self.client_user)
        api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        day = dt.date(2026, 6, 2)
        first_booking = api.post(f'/api/branches/{self.branch.id}/bookings/self/', {'room_id': self.room.id, 'date': day.isoformat(), 'start_min': 9 * 60, 'end_min': 10 * 60}, format='json')
        self.assertEqual(first_booking.status_code, 201)
        second_booking = api.post(f'/api/branches/{self.branch.id}/bookings/self/', {'room_id': self.room.id, 'date': day.isoformat(), 'start_min': 11 * 60, 'end_min': 12 * 60}, format='json')
        self.assertEqual(second_booking.status_code, 429)

    @override_settings(REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'], 'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'], 'DEFAULT_THROTTLE_CLASSES': ['api.throttling.LiveScopedRateThrottle'], 'DEFAULT_THROTTLE_RATES': {'auth': '1/min', 'profile': '100/min', 'booking_write': '100/min', 'booking_mutate': '100/min'}})
    def test_throttle_on_auth_register(self):
        cache.clear()
        api = APIClient()
        first = api.post('/api/auth/register/', {'email': 'new1@test.local', 'password': 'Pass12345!', 'name': 'New One'}, format='json')
        self.assertEqual(first.status_code, 201)
        second = api.post('/api/auth/register/', {'email': 'new2@test.local', 'password': 'Pass12345!', 'name': 'New Two'}, format='json')
        self.assertEqual(second.status_code, 429)

    @override_settings(REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'], 'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'], 'DEFAULT_THROTTLE_CLASSES': ['api.throttling.LiveScopedRateThrottle'], 'DEFAULT_THROTTLE_RATES': {'auth': '100/min', 'profile': '100/min', 'booking_write': '100/min', 'booking_mutate': '1/min'}})
    def test_throttle_on_booking_cancel_me(self):
        cache.clear()
        api = APIClient()
        token, _ = Token.objects.get_or_create(user=self.client_user)
        api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        first = api.post(f'/api/bookings/{self.client_booking.id}/cancel/me/')
        self.assertEqual(first.status_code, 200)
        second = api.post(f'/api/bookings/{self.client_booking.id}/cancel/me/')
        self.assertEqual(second.status_code, 429)

    @override_settings(REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'], 'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'], 'DEFAULT_THROTTLE_CLASSES': ['api.throttling.LiveScopedRateThrottle'], 'DEFAULT_THROTTLE_RATES': {'auth': '100/min', 'profile': '100/min', 'booking_write': '100/min', 'booking_mutate': '1/min'}})
    def test_throttle_on_booking_reschedule_me(self):
        cache.clear()
        api = APIClient()
        token, _ = Token.objects.get_or_create(user=self.client_user)
        api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        day = self.client_booking.date.isoformat()
        first = api.post(f'/api/bookings/{self.client_booking.id}/reschedule/me/', {'date': day, 'start_min': 12 * 60, 'end_min': 13 * 60, 'room_id': self.room.id}, format='json')
        self.assertEqual(first.status_code, 200)
        second = api.post(f'/api/bookings/{self.client_booking.id}/reschedule/me/', {'date': day, 'start_min': 13 * 60, 'end_min': 14 * 60, 'room_id': self.room.id}, format='json')
        self.assertEqual(second.status_code, 429)
