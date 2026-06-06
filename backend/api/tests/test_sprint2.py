import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import AuditLog, Booking, Branch, BranchMembership, IdempotencyRecord, Room, UserProfile
User = get_user_model()

class Sprint2Tests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.user = User.objects.create_user(username='u1@test.local', email='u1@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='Client One', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        token, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_me_bookings_paginated_meta(self):
        day = dt.date(2026, 5, 20)
        for i in range(3):
            Booking.objects.create(id=f'bk{i}', branch=self.branch, room=self.room, date=day + dt.timedelta(days=i), start_min=9 * 60, end_min=10 * 60, client_name='A', client_ref=f'u{self.user.pk}', status='Ожидает')
        res = self.api.get('/api/me/bookings/', {'limit': 2, 'offset': 0})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['bookings']), 2)
        self.assertIn('meta', res.data)
        self.assertEqual(res.data['meta']['total'], 3)
        self.assertEqual(res.data['meta']['limit'], 2)
        self.assertEqual(res.data['meta']['offset'], 0)
        self.assertIsNotNone(res.data['meta']['next'])

    def test_idempotency_on_client_booking_create(self):
        day = dt.date(2026, 5, 21)
        payload = {'room_id': self.room.id, 'date': day.isoformat(), 'start_min': 600, 'end_min': 660}
        headers = {'HTTP_IDEMPOTENCY_KEY': 'idem-1'}
        r1 = self.api.post(f'/api/branches/{self.branch.id}/bookings/self/', payload, format='json', **headers)
        self.assertEqual(r1.status_code, 201)
        r2 = self.api.post(f'/api/branches/{self.branch.id}/bookings/self/', payload, format='json', **headers)
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r1.data['id'], r2.data['id'])
        self.assertEqual(Booking.objects.count(), 1)
        self.assertEqual(IdempotencyRecord.objects.count(), 1)

    def test_audit_log_on_cancel_and_reschedule(self):
        day = dt.date(2026, 5, 20)
        b = Booking.objects.create(id='bk-audit', branch=self.branch, room=self.room, date=day, start_min=9 * 60, end_min=10 * 60, client_name='A', client_ref=f'u{self.user.pk}', status='Подтверждено', confirmed=True)
        reschedule = self.api.post(f'/api/bookings/{b.id}/reschedule/me/', {'date': day.isoformat(), 'start_min': 11 * 60, 'end_min': 12 * 60, 'room_id': self.room.id}, format='json')
        self.assertEqual(reschedule.status_code, 200)
        cancel = self.api.post(f'/api/bookings/{b.id}/cancel/me/')
        self.assertEqual(cancel.status_code, 200)
        actions = list(AuditLog.objects.filter(entity_id=b.id).values_list('action', flat=True))
        self.assertIn('booking_rescheduled_client', actions)
        self.assertIn('booking_cancelled_client', actions)
