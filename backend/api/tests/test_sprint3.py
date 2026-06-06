import datetime as dt
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import AuditLog, Branch, BranchMembership, IdempotencyRecord, UserProfile
User = get_user_model()

class Sprint3Tests(TestCase):

    def setUp(self):
        self.client_user = User.objects.create_user(username='c@test.local', email='c@test.local', password='Pass12345!')
        self.admin_user = User.objects.create_user(username='a@test.local', email='a@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.client_user, display_name='Client', role=UserProfile.ROLE_CLIENT)
        UserProfile.objects.create(user=self.admin_user, display_name='Admin', role=UserProfile.ROLE_ADMIN)

    def _api_for(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        return api

    def test_admin_audit_requires_role(self):
        AuditLog.objects.create(action='x', entity_type='booking', entity_id='b1', branch_id='1', payload={})
        res_client = self._api_for(self.client_user).get('/api/admin/audit/')
        self.assertEqual(res_client.status_code, 403)
        res_admin = self._api_for(self.admin_user).get('/api/admin/audit/', {'limit': 10, 'offset': 0})
        self.assertEqual(res_admin.status_code, 200)
        self.assertIn('meta', res_admin.data)
        self.assertIn('data', res_admin.data)

    def test_admin_audit_filters_entity_id_and_q(self):
        b = Branch.objects.create(id='baudit1', name='Audit Branch', hint='')
        BranchMembership.objects.create(user=self.admin_user, branch=b)
        AuditLog.objects.create(user=self.admin_user, action='payment_patched', entity_type='payment', entity_id='pay-target', branch_id=b.id, payload={'k': 1})
        AuditLog.objects.create(user=self.admin_user, action='booking_created_staff', entity_type='booking', entity_id='bk-other', branch_id=b.id, payload={})
        api = self._api_for(self.admin_user)
        r1 = api.get('/api/admin/audit/', {'entity_id': 'pay-target', 'limit': 20})
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(len(r1.data['data']), 1)
        self.assertEqual(r1.data['data'][0]['entityId'], 'pay-target')
        r2 = api.get('/api/admin/audit/', {'q': 'payment', 'limit': 20})
        self.assertEqual(r2.status_code, 200)
        self.assertGreaterEqual(len(r2.data['data']), 1)
        self.assertTrue(all(('payment' in (row['action'] + row['entityType']).lower() for row in r2.data['data'])))

    def test_admin_idempotency_requires_role(self):
        IdempotencyRecord.objects.create(user=self.admin_user, endpoint='POST:/x', key='k1', request_hash='h', response_status=201, response_body={'ok': True})
        res_client = self._api_for(self.client_user).get('/api/admin/idempotency/')
        self.assertEqual(res_client.status_code, 403)
        res_admin = self._api_for(self.admin_user).get('/api/admin/idempotency/', {'limit': 10, 'offset': 0})
        self.assertEqual(res_admin.status_code, 200)
        self.assertIn('meta', res_admin.data)
        self.assertIn('data', res_admin.data)

    def test_cleanup_command_dry_run_and_delete(self):
        a = AuditLog.objects.create(action='x', entity_type='booking', entity_id='b1', branch_id='1', payload={})
        i = IdempotencyRecord.objects.create(user=self.admin_user, endpoint='POST:/x', key='k1', request_hash='h', response_status=201, response_body={'ok': True})
        old = timezone.now() - dt.timedelta(days=10)
        AuditLog.objects.filter(pk=a.pk).update(created_at=old)
        IdempotencyRecord.objects.filter(pk=i.pk).update(created_at=old)
        call_command('cleanup_audit_and_idempotency', '--audit-days', '1', '--idempotency-days', '1', '--dry-run')
        self.assertEqual(AuditLog.objects.count(), 1)
        self.assertEqual(IdempotencyRecord.objects.count(), 1)
        call_command('cleanup_audit_and_idempotency', '--audit-days', '1', '--idempotency-days', '1')
        self.assertEqual(AuditLog.objects.count(), 0)
        self.assertEqual(IdempotencyRecord.objects.count(), 0)
