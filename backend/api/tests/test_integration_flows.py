from __future__ import annotations
import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchEvent, BranchMembership, Payment, Room, UserProfile
User = get_user_model()

class ProfileFlowTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='pf@test', email='pf@test', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='PF', role=UserProfile.ROLE_CLIENT)
        self.branch = Branch.objects.create(id='b-pf', name='B', hint='')
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        tok, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {tok.key}')

    def test_profile_me_get_positive(self):
        r = self.api.get('/api/auth/me/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('user', r.data)
        self.assertEqual(r.data['user']['email'], 'pf@test')

    def test_profile_me_patch_positive(self):
        r = self.api.patch('/api/auth/me/', {'name': 'Новое имя', 'phone': '+7999'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['user']['name'], 'Новое имя')
        self.user.refresh_from_db()
        prof = UserProfile.objects.get(user=self.user)
        self.assertEqual(prof.display_name, 'Новое имя')

    def test_profile_me_requires_auth_negative(self):
        r = APIClient().get('/api/auth/me/')
        self.assertEqual(r.status_code, 401)

    def test_profile_patch_duplicate_email_negative(self):
        User.objects.create_user(username='taken@test', email='taken@test', password='Pass12345!')
        r = self.api.patch('/api/auth/me/', {'email': 'taken@test'}, format='json')
        self.assertEqual(r.status_code, 400)
        raw = r.data.get('error', {}).get('details', r.data)
        self.assertTrue('email' in raw or 'email' in str(raw).lower())

class BookingFlowTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b-bf', name='B', hint='')
        self.room = Room.objects.create(id='r-bf', branch=self.branch, label='C1', sort_order=0)
        self.user = User.objects.create_user(username='bf@test', email='bf@test', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='BF', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        tok, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {tok.key}')
        self.day = dt.date(2026, 9, 15)

    def test_client_self_booking_positive(self):
        r = self.api.post(f'/api/branches/{self.branch.id}/bookings/self/', {'room_id': self.room.id, 'date': self.day.isoformat(), 'start_min': 10 * 60, 'end_min': 11 * 60}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        bid = r.data.get('id') or r.data.get('data', {}).get('id')
        self.assertTrue(bid)
        self.assertTrue(Booking.objects.filter(pk=bid).exists())

    def test_client_self_booking_overlap_negative(self):
        Booking.objects.create(id='bk-fix', branch=self.branch, room=self.room, date=self.day, start_min=10 * 60, end_min=11 * 60, client_name='X', client_ref=f'u{self.user.pk}')
        r = self.api.post(f'/api/branches/{self.branch.id}/bookings/self/', {'room_id': self.room.id, 'date': self.day.isoformat(), 'start_min': 10 * 60, 'end_min': 11 * 60}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_cancel_own_booking_positive(self):
        b = Booking.objects.create(id='bk-can', branch=self.branch, room=self.room, date=self.day, start_min=14 * 60, end_min=15 * 60, client_name='BF', client_ref=f'u{self.user.pk}', status='Ожидает')
        r = self.api.post(f'/api/bookings/{b.id}/cancel/me/')
        self.assertEqual(r.status_code, 200)
        b.refresh_from_db()
        self.assertIn('отмен', (b.status or '').lower())

class PaymentFlowTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b-payf', name='B', hint='')
        self.room = Room.objects.create(id='r-payf', branch=self.branch, label='C', sort_order=0)
        self.client = User.objects.create_user(username='cl-payf@test', email='cl-payf@test', password='Pass12345!')
        self.admin = User.objects.create_user(username='adm-payf@test', email='adm-payf@test', password='Pass12345!')
        UserProfile.objects.create(user=self.client, display_name='Cl', role=UserProfile.ROLE_CLIENT)
        UserProfile.objects.create(user=self.admin, display_name='Adm', role=UserProfile.ROLE_ADMIN)
        BranchMembership.objects.create(user=self.client, branch=self.branch)
        BranchMembership.objects.create(user=self.admin, branch=self.branch)
        self.booking = Booking.objects.create(id='bk-payf', branch=self.branch, room=self.room, date=dt.date(2026, 10, 1), start_min=600, end_min=660, client_name='Cl', client_ref=f'u{self.client.pk}')
        ct, _ = Token.objects.get_or_create(user=self.client)
        at, _ = Token.objects.get_or_create(user=self.admin)
        self.client_api = APIClient()
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Token {ct.key}')
        self.admin_api = APIClient()
        self.admin_api.credentials(HTTP_AUTHORIZATION=f'Token {at.key}')

    def test_admin_create_and_patch_payment_positive(self):
        c = self.admin_api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.booking.id, 'amount_label': '2000 ₽', 'status': 'К оплате'}, format='json')
        self.assertEqual(c.status_code, 201, c.content)
        pid = c.data['id']
        p = self.client_api.get(f'/api/payments/{pid}/')
        self.assertEqual(p.status_code, 200)
        u = self.admin_api.patch(f'/api/payments/{pid}/', {'status': 'Оплачено'}, format='json')
        self.assertEqual(u.status_code, 200)
        self.assertEqual(u.data['status'], 'Оплачено')
        self.booking.refresh_from_db()
        self.assertTrue(self.booking.paid)

    def test_client_cannot_patch_payment_negative(self):
        p = Payment.objects.create(id='p-payf-1', booking=self.booking, amount_label='500 ₽', status='К оплате')
        r = self.client_api.patch(f'/api/payments/{p.id}/', {'status': 'Оплачено'}, format='json')
        self.assertEqual(r.status_code, 403)

class EventFlowTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b-evf', name='B', hint='')
        self.room = Room.objects.create(id='r-evf', branch=self.branch, label='C', sort_order=0)
        self.client = User.objects.create_user(username='cl-ev@test', email='cl-ev@test', password='Pass12345!')
        self.admin = User.objects.create_user(username='adm-ev@test', email='adm-ev@test', password='Pass12345!')
        UserProfile.objects.create(user=self.client, display_name='Cl', role=UserProfile.ROLE_CLIENT)
        UserProfile.objects.create(user=self.admin, display_name='Adm', role=UserProfile.ROLE_ADMIN)
        BranchMembership.objects.create(user=self.client, branch=self.branch)
        BranchMembership.objects.create(user=self.admin, branch=self.branch)
        future = timezone.localdate() + dt.timedelta(days=14)
        self.ev = BranchEvent.objects.create(id='ev-flow-1', branch=self.branch, room=self.room, title='Open Day', kind=BranchEvent.KIND_OPEN_DAY, start_date=future, end_date=future, status='Регистрация открыта', max_participants=50, registered=0)
        ct, _ = Token.objects.get_or_create(user=self.client)
        at, _ = Token.objects.get_or_create(user=self.admin)
        self.client_api = APIClient()
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Token {ct.key}')
        self.admin_api = APIClient()
        self.admin_api.credentials(HTTP_AUTHORIZATION=f'Token {at.key}')

    def test_client_register_on_event_positive(self):
        r = self.client_api.post(f'/api/events/{self.ev.id}/registrations/me/')
        self.assertEqual(r.status_code, 201, r.content)
        self.ev.refresh_from_db()
        self.assertGreaterEqual(self.ev.registered, 1)

    def test_client_double_register_negative(self):
        self.client_api.post(f'/api/events/{self.ev.id}/registrations/me/')
        r = self.client_api.post(f'/api/events/{self.ev.id}/registrations/me/')
        self.assertEqual(r.status_code, 400)

    def test_client_cannot_create_event_negative(self):
        r = self.client_api.post(f'/api/branches/{self.branch.id}/events/', {'title': 'Hack', 'kind': 'open_day', 'start_date': (timezone.localdate() + dt.timedelta(days=30)).isoformat(), 'end_date': (timezone.localdate() + dt.timedelta(days=30)).isoformat()}, format='json')
        self.assertEqual(r.status_code, 403)
