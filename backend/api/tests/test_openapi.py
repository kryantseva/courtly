from django.test import TestCase
from rest_framework.test import APIClient

class OpenApiSpecTests(TestCase):

    def test_openapi_has_codegen_friendly_sections(self):
        res = APIClient().get('/api/openapi.json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('openapi'), '3.0.3')
        self.assertIn('components', res.data)
        self.assertIn('schemas', res.data['components'])
        self.assertIn('securitySchemes', res.data['components'])
        self.assertIn('paths', res.data)
        paths = res.data['paths']
        self.assertIn('/api/health/', paths)
        self.assertIn('/api/health/ready/', paths)
        self.assertIn('/api/me/bookings/', paths)
        self.assertIn('/api/me/payments/', paths)
        self.assertIn('/api/me/trainer/bookings/', paths)
        self.assertIn('/api/me/trainer/earnings/', paths)
        self.assertIn('/api/webhooks/payments/', paths)
        self.assertIn('/api/payments/{payment_id}/receipt/', paths)
        self.assertIn('/api/bookings/{booking_id}/', paths)
        self.assertIn('/api/branches/{branch_id}/availability/', paths)
        self.assertIn('/api/bookings/{booking_id}/cancel/me/', paths)
        self.assertIn('/api/bookings/{booking_id}/reschedule/me/', paths)
        self.assertIn('/api/director/dashboard/kpi/', paths)
        self.assertIn('/api/director/branches/{branch_id}/members/', paths)
        self.assertIn('/api/branches/{branch_id}/trainer/availability/', paths)
        self.assertIn('/api/branches/{branch_id}/crm/clients/', paths)
        self.assertIn('/api/bookings/{booking_id}/trainer/session/', paths)
        self.assertIn('/api/events/{event_id}/waitlist/{waitlist_entry_id}/promote/', paths)
        self.assertIn('JournalDayResponse', res.data['components']['schemas'])
        self.assertIn('StaffBookingCreateRequest', res.data['components']['schemas'])
        tag_names = {t['name'] for t in res.data.get('tags', [])}
        self.assertTrue({'director', 'trainer', 'crm'}.issubset(tag_names))
