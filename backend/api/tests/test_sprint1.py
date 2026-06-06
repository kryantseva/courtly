import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchEvent, BranchMembership, Room, UserProfile
User = get_user_model()

class Sprint1ClientEndpointsTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.room2 = Room.objects.create(id='r2', branch=self.branch, label='Court 2', sort_order=1)
        self.client_user = User.objects.create_user(username='u1@test.local', email='u1@test.local', password='Pass12345!')
        self.other_user = User.objects.create_user(username='u2@test.local', email='u2@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.client_user, display_name='Client One', role=UserProfile.ROLE_CLIENT)
        UserProfile.objects.create(user=self.other_user, display_name='Client Two', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.client_user, branch=self.branch)
        BranchMembership.objects.create(user=self.other_user, branch=self.branch)
        token, _ = Token.objects.get_or_create(user=self.client_user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_availability_excludes_bookings_and_events(self):
        day = dt.date(2026, 5, 20)
        Booking.objects.create(id='bk1', branch=self.branch, room=self.room, date=day, start_min=10 * 60, end_min=11 * 60, client_name='A', client_ref=f'u{self.client_user.pk}', status='Ожидает')
        BranchEvent.objects.create(id='ev1', branch=self.branch, room=self.room, title='Maintenance', kind=BranchEvent.KIND_MAINTENANCE, start_date=day, end_date=day, journal_block_start_min=12 * 60, journal_block_end_min=13 * 60, status='Подтверждено')
        res = self.api.get(f'/api/branches/{self.branch.id}/availability/', {'date': day.isoformat(), 'duration': 60})
        self.assertEqual(res.status_code, 200)
        rooms = {r['id']: r for r in res.data['rooms']}
        starts = {x['start'] for x in rooms[self.room.id]['availableStarts']}
        self.assertNotIn('10:00', starts)
        self.assertNotIn('12:00', starts)
        self.assertIn('11:00', starts)

    def test_cancel_me_works_for_own_booking(self):
        day = dt.date(2026, 5, 20)
        b = Booking.objects.create(id='bk-cancel', branch=self.branch, room=self.room, date=day, start_min=9 * 60, end_min=10 * 60, client_name='A', client_ref=f'u{self.client_user.pk}', status='Подтверждено', confirmed=True)
        res = self.api.post(f'/api/bookings/{b.id}/cancel/me/')
        self.assertEqual(res.status_code, 200)
        b.refresh_from_db()
        self.assertIn('Отменено', b.status)
        self.assertFalse(b.confirmed)

    def test_cancel_me_forbidden_for_foreign_booking(self):
        day = dt.date(2026, 5, 20)
        b = Booking.objects.create(id='bk-foreign', branch=self.branch, room=self.room, date=day, start_min=9 * 60, end_min=10 * 60, client_name='B', client_ref=f'u{self.other_user.pk}', status='Подтверждено')
        res = self.api.post(f'/api/bookings/{b.id}/cancel/me/')
        self.assertEqual(res.status_code, 403)

    def test_reschedule_me_success(self):
        day = dt.date(2026, 5, 20)
        b = Booking.objects.create(id='bk-move', branch=self.branch, room=self.room, date=day, start_min=9 * 60, end_min=10 * 60, client_name='A', client_ref=f'u{self.client_user.pk}', status='Подтверждено')
        res = self.api.post(f'/api/bookings/{b.id}/reschedule/me/', {'date': day.isoformat(), 'start_min': 11 * 60, 'end_min': 12 * 60, 'room_id': self.room2.id}, format='json')
        self.assertEqual(res.status_code, 200)
        b.refresh_from_db()
        self.assertEqual(b.room_id, self.room2.id)
        self.assertEqual(b.start_min, 11 * 60)
        self.assertEqual(b.end_min, 12 * 60)

    def test_reschedule_me_rejects_overlap(self):
        day = dt.date(2026, 5, 20)
        b = Booking.objects.create(id='bk-source', branch=self.branch, room=self.room, date=day, start_min=9 * 60, end_min=10 * 60, client_name='A', client_ref=f'u{self.client_user.pk}', status='Подтверждено')
        Booking.objects.create(id='bk-busy', branch=self.branch, room=self.room, date=day, start_min=11 * 60, end_min=12 * 60, client_name='X', client_ref=f'u{self.other_user.pk}', status='Подтверждено')
        res = self.api.post(f'/api/bookings/{b.id}/reschedule/me/', {'date': day.isoformat(), 'start_min': 11 * 60, 'end_min': 12 * 60, 'room_id': self.room.id}, format='json')
        self.assertEqual(res.status_code, 400)
