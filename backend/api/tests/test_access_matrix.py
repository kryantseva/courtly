import datetime as dt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchEvent, BranchMembership, Payment, Room, UserProfile
User = get_user_model()
KEY_ENDPOINT_ACCESS_MATRIX = [('GET', lambda s: f'/api/branches/{s.branch.id}/rooms/', 'client_user', 200), ('GET', lambda s: f'/api/branches/{s.branch.id}/bookings/', 'no_access_user', 403), ('GET', lambda s: f'/api/branches/{s.branch.id}/journal/?date={s.day.isoformat()}', 'client_user', 200), ('GET', lambda s: '/api/me/bookings/', 'client_user', 200), ('GET', lambda s: '/api/me/payments/', 'client_user', 200), ('GET', lambda s: f'/api/payments/{s.pay_client.id}/', 'client_user', 200), ('GET', lambda s: f'/api/payments/{s.pay_client.id}/', 'trainer_user', 403), ('GET', lambda s: f'/api/payments/{s.pay_client.id}/receipt/', 'client_user', 200), ('GET', lambda s: f'/api/events/{s.event_mx.id}/', 'client_user', 200), ('GET', lambda s: '/api/director/dashboard/kpi/', 'client_user', 403), ('GET', lambda s: '/api/director/dashboard/kpi/', 'director_user', 200), ('POST', lambda s: f'/api/branches/{s.branch.id}/bookings/', 'client_user', 403), ('PATCH', lambda s: f'/api/payments/{s.pay_client.id}/', 'client_user', 403), ('PATCH', lambda s: f'/api/payments/{s.pay_client.id}/', 'admin_user', 200)]

class AccessMatrixTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.room = Room.objects.create(id='r1', branch=self.branch, label='Court 1', sort_order=0)
        self.room2 = Room.objects.create(id='r2', branch=self.branch, label='Court 2', sort_order=1)
        self.day = dt.date(2026, 6, 10)
        self.client_user = self._mk_user('client@test.local', UserProfile.ROLE_CLIENT, with_membership=True)
        self.trainer_user = self._mk_user('trainer@test.local', UserProfile.ROLE_TRAINER, with_membership=True)
        self.admin_user = self._mk_user('admin@test.local', UserProfile.ROLE_ADMIN, with_membership=True)
        self.director_user = self._mk_user('director@test.local', UserProfile.ROLE_DIRECTOR, with_membership=True)
        self.member2_user = self._mk_user('member2@test.local', UserProfile.ROLE_CLIENT, with_membership=True)
        self.no_access_user = self._mk_user('outside@test.local', UserProfile.ROLE_CLIENT, with_membership=False)
        self.booking_own = Booking.objects.create(id='bk-own', branch=self.branch, room=self.room, date=self.day, start_min=9 * 60, end_min=10 * 60, client_name='Client', client_ref=f'u{self.client_user.pk}', status='Ожидает')
        self.booking_other = Booking.objects.create(id='bk-other', branch=self.branch, room=self.room2, date=self.day, start_min=11 * 60, end_min=12 * 60, client_name='Other', client_ref=f'u{self.member2_user.pk}', status='Подтверждено', confirmed=True)
        self.booking_trainer = Booking.objects.create(id='bk-trainer', branch=self.branch, room=self.room, date=self.day, start_min=14 * 60, end_min=15 * 60, client_name='Trainee', client_ref=f'u{self.client_user.pk}', trainer_user=self.trainer_user, trainer_staff_id=str(self.trainer_user.pk), trainer='Trainer', status='Подтверждено')
        self.pay_client = Payment.objects.create(id='pay-mx-1', booking=self.booking_own, amount_label='900 ₽', status='К оплате')
        self.event_mx = BranchEvent.objects.create(id='ev-mx-1', branch=self.branch, title='Matrix Event', kind=BranchEvent.KIND_OPEN_DAY, start_date=self.day, end_date=self.day)

    def _mk_user(self, email: str, role: str, *, with_membership: bool):
        user = User.objects.create_user(username=email, email=email, password='Pass12345!')
        UserProfile.objects.create(user=user, display_name=email.split('@')[0], role=role)
        if with_membership:
            BranchMembership.objects.create(user=user, branch=self.branch)
        return user

    def _api_for(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        return api

    def test_admin_endpoints_access_matrix(self):
        matrix = [(self.client_user, 403), (self.trainer_user, 403), (self.admin_user, 200), (self.director_user, 200)]
        for user, expected in matrix:
            api = self._api_for(user)
            self.assertEqual(api.get('/api/admin/audit/').status_code, expected)
            self.assertEqual(api.get('/api/admin/idempotency/').status_code, expected)

    def test_manage_endpoints_access_matrix(self):
        matrix = [(self.client_user, 403), (self.trainer_user, 200), (self.admin_user, 200), (self.director_user, 200)]
        for user, expected_patch in matrix:
            api = self._api_for(user)
            patch_res = api.patch(f'/api/bookings/{self.booking_other.id}/', {'status': 'Подтверждено'}, format='json')
            self.assertEqual(patch_res.status_code, expected_patch)
        create_matrix = [(self.client_user, 403), (self.trainer_user, 201), (self.admin_user, 201), (self.director_user, 201)]
        for user, expected_post in create_matrix:
            api = self._api_for(user)
            post_res = api.post(f'/api/branches/{self.branch.id}/payments/', {'booking_id': self.booking_own.id, 'amount_label': '1200 ₽', 'status': 'К оплате'}, format='json')
            self.assertEqual(post_res.status_code, expected_post)

    def test_booking_detail_access_matrix(self):
        matrix = [(self.client_user, self.booking_own.id, 200), (self.client_user, self.booking_other.id, 403), (self.trainer_user, self.booking_other.id, 403), (self.trainer_user, self.booking_trainer.id, 200), (self.admin_user, self.booking_other.id, 200), (self.director_user, self.booking_other.id, 200)]
        for user, booking_id, expected in matrix:
            api = self._api_for(user)
            self.assertEqual(api.get(f'/api/bookings/{booking_id}/').status_code, expected)

    def test_cancel_and_reschedule_access_rules_403_and_404(self):
        outside_api = self._api_for(self.no_access_user)
        self.assertEqual(outside_api.post(f'/api/bookings/{self.booking_own.id}/cancel/me/').status_code, 403)
        member_api = self._api_for(self.client_user)
        self.assertEqual(member_api.post(f'/api/bookings/{self.booking_other.id}/cancel/me/').status_code, 403)
        owner_api = self._api_for(self.client_user)
        res = owner_api.post(f'/api/bookings/{self.booking_own.id}/reschedule/me/', {'date': self.day.isoformat(), 'start_min': 13 * 60, 'end_min': 14 * 60, 'room_id': 'room-missing'}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_key_endpoint_access_matrix(self):
        for method, path_fn, user_attr, expected in KEY_ENDPOINT_ACCESS_MATRIX:
            path = path_fn(self)
            api = self._api_for(getattr(self, user_attr))
            if method == 'GET':
                res = api.get(path)
            elif method == 'POST':
                res = api.post(path, {'room_id': self.room.id, 'date': self.day.isoformat(), 'start_min': 16 * 60, 'end_min': 17 * 60, 'client_name': 'Staff Book', 'phone': ''}, format='json')
            elif method == 'PATCH':
                res = api.patch(path, {'booking_label': 'mx'}, format='json')
            else:
                raise AssertionError(method)
            self.assertEqual(res.status_code, expected, f'{method} {path} as {user_attr}: got {res.status_code}, expected {expected}')
