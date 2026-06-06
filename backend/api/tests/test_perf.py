import datetime as dt
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Room, UserProfile
User = get_user_model()

class PerfRegressionTests(TestCase):

    def setUp(self):
        self.branch = Branch.objects.create(id='b1', name='Branch 1', hint='')
        self.rooms = [Room.objects.create(id=f'r{i}', branch=self.branch, label=f'Court {i}', sort_order=i) for i in range(1, 7)]
        self.user = User.objects.create_user(username='perf@test.local', email='perf@test.local', password='Pass12345!')
        UserProfile.objects.create(user=self.user, display_name='Perf User', role=UserProfile.ROLE_CLIENT)
        BranchMembership.objects.create(user=self.user, branch=self.branch)
        token, _ = Token.objects.get_or_create(user=self.user)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_availability_query_count_is_bounded(self):
        day = dt.date(2026, 7, 1)
        for i, room in enumerate(self.rooms):
            Booking.objects.create(id=f'bk{i}', branch=self.branch, room=room, date=day, start_min=9 * 60, end_min=10 * 60, client_name='X', client_ref=f'u{self.user.pk}', status='Ожидает')
        with CaptureQueriesContext(connection) as ctx:
            res = self.api.get(f'/api/branches/{self.branch.id}/availability/', {'date': day.isoformat(), 'duration': 60})
        self.assertEqual(res.status_code, 200)
        self.assertLessEqual(len(ctx), 8)
