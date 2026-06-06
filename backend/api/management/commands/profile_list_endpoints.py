from __future__ import annotations
import datetime as dt
import time
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import Booking, Branch, BranchMembership, Payment, Room, UserProfile
User = get_user_model()

class Command(BaseCommand):
    help = 'Profiles heavy list endpoints: query count and elapsed ms.'

    def handle(self, *args, **options):
        branch, _ = Branch.objects.get_or_create(id='perf-b1', defaults={'name': 'Perf Branch', 'hint': ''})
        room, _ = Room.objects.get_or_create(id='perf-r1', defaults={'branch': branch, 'label': 'Perf Court 1', 'sort_order': 0}, branch=branch)
        user, _ = User.objects.get_or_create(username='perf-profile@test.local', defaults={'email': 'perf-profile@test.local'})
        if not user.has_usable_password():
            user.set_password('Pass12345!')
            user.save(update_fields=['password'])
        UserProfile.objects.get_or_create(user=user, defaults={'display_name': 'Perf Profile', 'role': UserProfile.ROLE_CLIENT})
        BranchMembership.objects.get_or_create(user=user, branch=branch)
        if Booking.objects.filter(branch=branch, client_ref=f'u{user.pk}').count() < 200:
            base = dt.date.today()
            for i in range(200):
                b, created = Booking.objects.get_or_create(id=f'perf-bk-{i}', defaults={'branch': branch, 'room': room, 'date': base + dt.timedelta(days=i % 60), 'start_min': 8 * 60 + i % 10 * 30, 'end_min': 9 * 60 + i % 10 * 30, 'client_name': 'Perf', 'client_ref': f'u{user.pk}', 'status': 'Ожидает', 'kind': 'lesson'})
                if created:
                    Payment.objects.get_or_create(id=f'perf-pay-{i}', defaults={'booking': b, 'amount_label': '1000 ₽', 'status': 'К оплате' if i % 2 == 0 else 'Оплачено'})
        token, _ = Token.objects.get_or_create(user=user)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        from_s = (dt.date.today() - dt.timedelta(days=1)).isoformat()
        to_s = (dt.date.today() + dt.timedelta(days=120)).isoformat()
        endpoints = [('/api/me/bookings/', {'from': from_s, 'to': to_s, 'limit': 50, 'offset': 0}), ('/api/me/payments/', {'from': from_s, 'to': to_s, 'limit': 50, 'offset': 0}), (f'/api/branches/{branch.id}/bookings/', {'from': from_s, 'to': to_s}), (f'/api/branches/{branch.id}/availability/', {'date': dt.date.today().isoformat(), 'duration': 60})]
        self.stdout.write(self.style.WARNING('Profiling list endpoints (run before/after optimizations to compare):'))
        for path, params in endpoints:
            t0 = time.perf_counter()
            with CaptureQueriesContext(connection) as ctx:
                res = api.get(path, params)
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            self.stdout.write(f'{path} status={res.status_code} queries={len(ctx)} elapsed_ms={elapsed_ms}')
