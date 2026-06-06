from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient

class HealthEndpointsTests(TestCase):

    def test_health_root_and_live_ok(self):
        api = APIClient()
        r1 = api.get('/api/health/')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()['status'], 'ok')
        r2 = api.get('/api/health/live/')
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()['check'], 'liveness')

    def test_health_ready_ok_with_db(self):
        api = APIClient()
        r = api.get('/api/health/ready/')
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body['status'], 'ready')
        self.assertTrue(body['checks']['database']['ok'])

    @patch('api.health_views.connection.ensure_connection', side_effect=RuntimeError('db_down'))
    def test_health_ready_fails_when_db_unreachable(self, _mock):
        api = APIClient()
        r = api.get('/api/health/ready/')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()['status'], 'unready')
        self.assertFalse(r.json()['checks']['database']['ok'])

    def test_health_diagnostics_has_safe_fields(self):
        api = APIClient()
        r = api.get('/api/health/diagnostics/', HTTP_X_REQUEST_ID='diag-1')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn('service', data)
        self.assertIn('release', data)
        self.assertIn('environment', data)
        self.assertIn('debug', data)
        self.assertEqual(data.get('request_id'), 'diag-1')
