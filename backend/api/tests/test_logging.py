from django.test import TestCase
from rest_framework.test import APIClient

class StructuredLoggingTests(TestCase):

    def test_request_logging_contains_core_fields_and_header(self):
        api = APIClient()
        with self.assertLogs('api.request', level='INFO') as cm:
            res = api.get('/api/health/', HTTP_X_REQUEST_ID='req-123')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['X-Request-ID'], 'req-123')
        self.assertGreaterEqual(len(cm.records), 1)
        record = cm.records[0]
        self.assertEqual(getattr(record, 'request_id', None), 'req-123')
        self.assertEqual(getattr(record, 'path', None), '/api/health/')
        self.assertTrue(hasattr(record, 'user_id'))
        self.assertEqual(getattr(record, 'status', None), 200)
        self.assertIsNotNone(getattr(record, 'latency_ms', None))
        self.assertEqual(getattr(record, 'event', None), 'http_access')
        self.assertEqual(getattr(record, 'service', None), 'courtly-api')
        self.assertEqual(getattr(record, 'http_method', None), 'GET')
