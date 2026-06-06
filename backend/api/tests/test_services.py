import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from api.models import Booking, Branch, BranchMembership, Room, UserProfile
from api.services.booking_service import cancel_own_booking, create_client_booking, reschedule_own_booking
User = get_user_model()

class BookingServiceTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.room2 = Room.objects.create(id='r2', branch=self.branch, label='Court 2', sort_order=1)
        self.user = User.objects.create_user(username='svc@test.local', email='svc@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='Svc', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)

    def test_create_client_booking(self):
        b = create_client_booking(user=self.user, branch=self.branch, payload={'room_id': self.room.id, 'date': dt.date(2026, 8, 2), 'start_min': 600, 'end_min': 660})
        self.assertEqual(b.branch_id, self.branch.id)
        self.assertEqual(b.room_id, self.room.id)

    def test_cancel_and_reschedule_own_booking(self):
        b = Booking.objects.create(id='bk1', branch=self.branch, room=self.room, date=dt.date(2026, 8, 3), start_min=9 * 60, end_min=10 * 60, client_name='Svc', client_ref=f'u{self.user.pk}', status='Подтверждено', confirmed=True)
        cancelled = cancel_own_booking(user=self.user, booking_id=b.id)
        self.assertIn('Отмен', cancelled.status)
        self.assertFalse(cancelled.confirmed)
        b.status = 'Подтверждено'
        b.confirmed = True
        b.save(update_fields=['status', 'confirmed'])
        moved = reschedule_own_booking(user=self.user, booking_id=b.id, payload={'date': b.date.isoformat(), 'start_min': 11 * 60, 'end_min': 12 * 60, 'room_id': self.room2.id})
        self.assertEqual(moved.room_id, self.room2.id)
        self.assertEqual(moved.start_min, 11 * 60)

    def test_reschedule_validates_time(self):
        b = Booking.objects.create(id='bk2', branch=self.branch, room=self.room, date=dt.date(2026, 8, 3), start_min=9 * 60, end_min=10 * 60, client_name='Svc', client_ref=f'u{self.user.pk}', status='Подтверждено')
        with self.assertRaises(ValidationError):
            reschedule_own_booking(user=self.user, booking_id=b.id, payload={'date': b.date.isoformat(), 'start_min': 12 * 60, 'end_min': 11 * 60, 'room_id': self.room.id})
