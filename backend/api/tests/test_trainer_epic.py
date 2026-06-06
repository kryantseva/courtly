import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Payment, Room, TrainerAvailabilityWindow, UserProfile
User = get_user_model()

class TrainerEpicTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='tb1', name='T Branch', hint='')
        self.room = Room.objects.create(id='tr1', branch=self.branch, label='Court', sort_order=0)
        self.trainer = User.objects.create_user(username='tr@t.local', email='tr@t.local', password='Pass12345!')
        UserProfile.objects.create(user=self.trainer, display_name='Coach', role=UserProfile.ROLE_TRAINER)
        BranchMembership.objects.create(user=self.trainer, branch=self.branch)
        self.client_u = User.objects.create_user(username='cl@t.local', email='cl@t.local', password='Pass12345!')
        UserProfile.objects.create(user=self.client_u, display_name='Client', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.client_u, branch=self.branch)
        self.day = dt.date(2026, 8, 1)
        self.booking = Booking.objects.create(id='tbk1', branch=self.branch, room=self.room, date=self.day, start_min=14 * 60, end_min=15 * 60, client_name='Клиент', client_ref=f'u{self.client_u.pk}', trainer_user=self.trainer, trainer_staff_id=str(self.trainer.pk), trainer='Coach', status='Подтверждено', session_outcome=Booking.SESSION_OUTCOME_COMPLETED)
        Payment.objects.create(id='tp1', booking=self.booking, amount_label='2000 ₽', status='Оплачено', trainer_amount_rub=800)
        tok, _ = Token.objects.get_or_create(user=self.trainer)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {tok.key}')

    def test_trainer_bookings_list_only_assigned(self):
        other = Booking.objects.create(id='tbk2', branch=self.branch, room=self.room, date=self.day, start_min=12 * 60, end_min=13 * 60, client_name='Other', client_ref=f'u{self.client_u.pk}', status='Подтверждено')
        res = self.api.get('/api/me/trainer/bookings/', {'from': self.day.isoformat(), 'to': self.day.isoformat()})
        self.assertEqual(res.status_code, 200)
        ids = {row['id'] for row in res.data['data']}
        self.assertIn(self.booking.id, ids)
        self.assertNotIn(other.id, ids)

    def test_trainer_session_outcome_and_audit(self):
        res = self.api.post(f'/api/bookings/{self.booking.id}/trainer/session/', {'session_outcome': 'completed'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['sessionOutcome'], 'completed')
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.session_outcome, 'completed')

    def test_trainer_earnings_totals(self):
        res = self.api.get('/api/me/trainer/earnings/', {'from': self.day.isoformat(), 'to': self.day.isoformat()})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['totals']['earnedCompletedRub'], 800)
        self.assertTrue(any((p['period'] == '2026-08' for p in res.data['periods'])))

    def test_availability_intersects_slots(self):
        TrainerAvailabilityWindow.objects.create(id='twtest1', user=self.trainer, branch=self.branch, weekday=self.day.weekday(), start_min=10 * 60, end_min=11 * 60, note='')
        res = self.api.get(f'/api/branches/{self.branch.id}/availability/', {'date': self.day.isoformat(), 'duration': 60, 'trainer_user_id': str(self.trainer.pk)})
        self.assertEqual(res.status_code, 200)
        room = res.data['rooms'][0]
        starts = [x['start'] for x in room['availableStarts']]
        self.assertIn('10:00', starts)
        self.assertNotIn('09:00', starts)

    def test_trainer_availability_crud(self):
        res = self.api.post(f'/api/branches/{self.branch.id}/trainer/availability/', {'weekday': 1, 'start_min': 600, 'end_min': 720, 'note': 'Утро'}, format='json')
        self.assertEqual(res.status_code, 201)
        wid = res.data['id']
        res2 = self.api.get(f'/api/branches/{self.branch.id}/trainer/availability/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(len(res2.data['data']), 1)
        res3 = self.api.delete(f'/api/branches/{self.branch.id}/trainer/availability/{wid}/')
        self.assertEqual(res3.status_code, 200)
