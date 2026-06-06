import datetime as dt
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from api.models import Booking, Branch, Room

class Command(BaseCommand):
    help = 'Вызывает seed_demo_users и seed_journal_demo, затем добавляет брони на несколько дней относительно «сегодня» для филиала 1.'

    @transaction.atomic
    def handle(self, *args, **options):
        call_command('seed_demo_users')
        call_command('seed_journal_demo')
        self._extra_bookings()
        self.stdout.write(self.style.SUCCESS('Готово: пользователи, 2 филиала, залы, брони, события, оплаты, доп. слоты по датам.'))

    def _extra_bookings(self) -> None:
        branch = Branch.objects.filter(pk='1').first()
        if not branch:
            return
        r1 = Room.objects.filter(pk='r1', branch=branch).first()
        r2 = Room.objects.filter(pk='r2', branch=branch).first()
        if not r1 or not r2:
            return
        today = timezone.localdate()
        specs = [('bk-x0', r2, today, 14 * 60, 15 * 60, 'Демо: окно днём', 'mint'), ('bk-x1', r1, today + dt.timedelta(days=1), 11 * 60, 12 * 60, 'Демо: завтра утро', 'amber'), ('bk-x2', r1, today + dt.timedelta(days=2), 16 * 60, 17 * 60, 'Демо: послезавтра', 'rose')]
        for bid, room, day, sm, em, service, tone in specs:
            Booking.objects.update_or_create(id=bid, defaults={'branch': branch, 'room': room, 'date': day, 'start_min': sm, 'end_min': em, 'client_name': 'Демо-клиент', 'phone': '+7 900 000-00-00', 'service': service, 'tone': tone, 'paid': False, 'confirmed': True, 'client_ref': 'demo-extra', 'trainer': '', 'trainer_staff_id': None, 'status': 'Подтверждено', 'kind': 'lesson'})
