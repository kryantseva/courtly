import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Payment, Room, UserProfile
User = get_user_model()

class ContractTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.room2 = Room.objects.create(id='r2', branch=self.branch, label='Court 2', sort_order=1)
        self.user = User.objects.create_user(username='u1@test.local', email='u1@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='Client One', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        token, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.booking = Booking.objects.create(id='bk1', branch=self.branch, room=self.room, date=dt.date(2026, 5, 20), start_min=9 * 60, end_min=10 * 60, client_name='A', client_ref=f'u{self.user.pk}', status='Ожидает')
        Payment.objects.create(id='p1', booking=self.booking, amount_label='1000 ₽', status='К оплате')
        self.future_booking = Booking.objects.create(id='bk2', branch=self.branch, room=self.room2, date=dt.date(2026, 5, 21), start_min=11 * 60, end_min=12 * 60, client_name='A', client_ref=f'u{self.user.pk}', status='Подтверждено', confirmed=True)
        Payment.objects.create(id='p2', booking=self.future_booking, amount_label='1500 ₽', status='Оплачено')

    def test_me_bookings_contract(self):
        res = self.api.get('/api/me/bookings/', {'limit': 10, 'offset': 0})
        self.assertEqual(res.status_code, 200)
        self.assertIn('data', res.data)
        self.assertIn('meta', res.data)
        self.assertIn('bookings', res.data)
        self.assertIsInstance(res.data['data'], list)
        self.assertEqual(res.data['data'], res.data['bookings'])
        self.assertTrue({'total', 'limit', 'offset', 'next', 'previous'}.issubset(set(res.data['meta'].keys())))
        self.assertGreaterEqual(len(res.data['data']), 1)
        item = res.data['data'][0]
        required = {'id': str, 'time': str, 'hall': str, 'roomId': str, 'client': str, 'status': str, 'kind': str, 'date': str, 'paid': bool, 'confirmed': bool, 'branchId': str, 'branchName': str}
        for key, typ in required.items():
            self.assertIn(key, item)
            self.assertIsInstance(item[key], typ)

    def test_me_payments_contract(self):
        res = self.api.get('/api/me/payments/', {'limit': 10, 'offset': 0})
        self.assertEqual(res.status_code, 200)
        self.assertIn('data', res.data)
        self.assertIn('meta', res.data)
        self.assertIn('payments', res.data)
        self.assertIsInstance(res.data['data'], list)
        self.assertEqual(res.data['data'], res.data['payments'])
        self.assertTrue({'total', 'limit', 'offset', 'next', 'previous'}.issubset(set(res.data['meta'].keys())))
        self.assertGreaterEqual(len(res.data['data']), 1)
        item = res.data['data'][0]
        required = {'id': str, 'client': str, 'amount': str, 'status': str, 'booking': str, 'method': str, 'bookingId': str, 'bookingDate': str, 'branchId': str, 'branchName': str}
        for key, typ in required.items():
            self.assertIn(key, item)
            self.assertIsInstance(item[key], typ)

    def test_booking_detail_contract(self):
        res = self.api.get(f'/api/bookings/{self.booking.id}/')
        self.assertEqual(res.status_code, 200)
        required = {'id': str, 'date': str, 'roomId': str, 'startMin': int, 'endMin': int, 'time': str, 'hall': str, 'client': str, 'status': str, 'sessionOutcome': str, 'kind': str, 'isGroup': bool, 'payments': list, 'history': list, 'clientBookings': list}
        for key, typ in required.items():
            self.assertIn(key, res.data)
            self.assertIsInstance(res.data[key], typ)
        if res.data['payments']:
            p = res.data['payments'][0]
            self.assertTrue({'id', 'amount', 'status', 'bookingId', 'client', 'method', 'trainerAmountRub'}.issubset(set(p.keys())))
            self.assertIsInstance(p['id'], str)
            self.assertIsInstance(p['amount'], str)
            self.assertIsInstance(p['status'], str)

    def test_availability_contract(self):
        res = self.api.get(f'/api/branches/{self.branch.id}/availability/', {'date': self.booking.date.isoformat(), 'duration': 60})
        self.assertEqual(res.status_code, 200)
        self.assertTrue({'branchId', 'date', 'duration', 'stepMinutes', 'rooms'}.issubset(set(res.data.keys())))
        self.assertIsInstance(res.data['branchId'], str)
        self.assertIsInstance(res.data['date'], str)
        self.assertIsInstance(res.data['duration'], int)
        self.assertIsInstance(res.data['stepMinutes'], int)
        self.assertIsInstance(res.data['rooms'], list)
        if res.data['rooms']:
            room = res.data['rooms'][0]
            self.assertTrue({'id', 'label', 'availableStarts'}.issubset(set(room.keys())))
            self.assertIsInstance(room['id'], str)
            self.assertIsInstance(room['label'], str)
            self.assertIsInstance(room['availableStarts'], list)
            if room['availableStarts']:
                start = room['availableStarts'][0]
                self.assertTrue({'startMin', 'start', 'end'}.issubset(set(start.keys())))
                self.assertIsInstance(start['startMin'], int)
                self.assertIsInstance(start['start'], str)
                self.assertIsInstance(start['end'], str)

    def test_cancel_and_reschedule_contract(self):
        cancel = self.api.post(f'/api/bookings/{self.booking.id}/cancel/me/')
        self.assertEqual(cancel.status_code, 200)
        self.assertTrue({'id', 'status'}.issubset(set(cancel.data.keys())))
        self.assertIsInstance(cancel.data['id'], str)
        self.assertIsInstance(cancel.data['status'], str)
        reschedule = self.api.post(f'/api/bookings/{self.future_booking.id}/reschedule/me/', {'date': self.future_booking.date.isoformat(), 'start_min': 13 * 60, 'end_min': 14 * 60, 'room_id': self.room2.id}, format='json')
        self.assertEqual(reschedule.status_code, 200)
        required = {'id': str, 'status': str, 'date': str, 'start_min': int, 'end_min': int, 'room_id': str}
        for key, typ in required.items():
            self.assertIn(key, reschedule.data)
            self.assertIsInstance(reschedule.data[key], typ)
