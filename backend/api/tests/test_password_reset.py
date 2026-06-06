import datetime as dt
import hashlib
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from api.models import PasswordResetToken, UserProfile
from api.tests.contract_helpers import assert_validation_field
User = get_user_model()

class PasswordResetTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='reset@test.local', email='reset@test.local', password='OldPass123!')
        UserProfile.objects.create(user=self.user, display_name='Reset User', role=UserProfile.ROLE_CLIENT)
        self.api = APIClient()

    @override_settings(DEBUG=True, PASSWORD_RESET_TOKEN_TTL_MINUTES=30)
    def test_password_reset_end_to_end_success(self):
        request_res = self.api.post('/api/auth/password-reset/request/', {'email': 'reset@test.local'}, format='json')
        self.assertEqual(request_res.status_code, 200)
        self.assertIn('reset_token', request_res.data)
        self.assertIn('expires_in_seconds', request_res.data)
        token = request_res.data['reset_token']
        confirm_res = self.api.post('/api/auth/password-reset/confirm/', {'token': token, 'new_password': 'NewPass123!', 'new_password_confirm': 'NewPass123!'}, format='json')
        self.assertEqual(confirm_res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass123!'))

    @override_settings(DEBUG=True)
    def test_password_reset_rejects_weak_new_password(self):
        request_res = self.api.post('/api/auth/password-reset/request/', {'email': 'reset@test.local'}, format='json')
        self.assertEqual(request_res.status_code, 200)
        token = request_res.data['reset_token']
        confirm_res = self.api.post('/api/auth/password-reset/confirm/', {'token': token, 'new_password': '123', 'new_password_confirm': '123'}, format='json')
        self.assertEqual(confirm_res.status_code, 400)

    @override_settings(DEBUG=True)
    def test_password_reset_rejects_invalid_token(self):
        res = self.api.post('/api/auth/password-reset/confirm/', {'token': 'invalid-token', 'new_password': 'NewPass123!', 'new_password_confirm': 'NewPass123!'}, format='json')
        self.assertEqual(res.status_code, 400)
        assert_validation_field(res.data, 'token')

    @override_settings(DEBUG=True)
    def test_password_reset_rejects_expired_token(self):
        raw = 'expired-token-value'
        rec = PasswordResetToken.objects.create(user=self.user, token_hash=hashlib.sha256(raw.encode('utf-8')).hexdigest(), expires_at=timezone.now() - dt.timedelta(minutes=1))
        self.assertIsNone(rec.used_at)
        res = self.api.post('/api/auth/password-reset/confirm/', {'token': raw, 'new_password': 'NewPass123!', 'new_password_confirm': 'NewPass123!'}, format='json')
        self.assertEqual(res.status_code, 400)
        assert_validation_field(res.data, 'token')

    @override_settings(DEBUG=True)
    def test_password_reset_token_is_one_time(self):
        request_res = self.api.post('/api/auth/password-reset/request/', {'email': 'reset@test.local'}, format='json')
        token = request_res.data['reset_token']
        first = self.api.post('/api/auth/password-reset/confirm/', {'token': token, 'new_password': 'AnotherPass123!', 'new_password_confirm': 'AnotherPass123!'}, format='json')
        self.assertEqual(first.status_code, 200)
        second = self.api.post('/api/auth/password-reset/confirm/', {'token': token, 'new_password': 'OneMorePass123!', 'new_password_confirm': 'OneMorePass123!'}, format='json')
        self.assertEqual(second.status_code, 400)
        assert_validation_field(second.data, 'token')
