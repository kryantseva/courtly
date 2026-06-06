from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import UserProfile
from api.tests.contract_helpers import assert_validation_field
User = get_user_model()

class ChangePasswordTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='cp@test.local', email='cp@test.local', password='OldPass123!')
        UserProfile.objects.create(user=self.user, display_name='CP', role=UserProfile.ROLE_CLIENT)
        token, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_change_password_success(self):
        res = self.api.post('/api/auth/change-password/', {'old_password': 'OldPass123!', 'new_password': 'NewPass123!', 'new_password_confirm': 'NewPass123!'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass123!'))

    def test_change_password_rejects_wrong_old_password(self):
        res = self.api.post('/api/auth/change-password/', {'old_password': 'wrong', 'new_password': 'NewPass123!', 'new_password_confirm': 'NewPass123!'}, format='json')
        self.assertEqual(res.status_code, 400)
        assert_validation_field(res.data, 'old_password')

    def test_change_password_rejects_mismatch(self):
        res = self.api.post('/api/auth/change-password/', {'old_password': 'OldPass123!', 'new_password': 'NewPass123!', 'new_password_confirm': 'Different123!'}, format='json')
        self.assertEqual(res.status_code, 400)
        assert_validation_field(res.data, 'new_password_confirm')

    def test_change_password_requires_auth(self):
        api = APIClient()
        res = api.post('/api/auth/change-password/', {'old_password': 'OldPass123!', 'new_password': 'NewPass123!', 'new_password_confirm': 'NewPass123!'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_change_password_rejects_weak_new_password(self):
        res = self.api.post('/api/auth/change-password/', {'old_password': 'OldPass123!', 'new_password': '123', 'new_password_confirm': '123'}, format='json')
        self.assertEqual(res.status_code, 400)
        assert_validation_field(res.data, 'new_password')
