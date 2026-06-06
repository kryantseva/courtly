import calendar
import datetime as dt
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from api.bracket_utils import next_pow2_bracket_size, replace_bracket_for_event
from api.models import Booking, Branch, BranchEvent, Payment, Room, UserProfile
User = get_user_model()
DEMO_BRANCH_ID = '1'
CLIENT_NAMES = ('Иванова М.', 'Петров С.', 'Кузнецова А.', 'Соколов Д.', 'Морозова Е.', 'Волков П.', 'Лебедева О.', 'Козлов Н.', 'Новикова Т.', 'Егоров Р.', 'Орлова В.', 'Семёнов И.', 'Демо-клиент А', 'Демо-клиент Б', 'Гостевой аккаунт')
SERVICES = ('Аренда корта', 'Индивидуально 60 мин', 'Групповое занятие', 'Детская группа', 'Функциональный тренинг', 'Парная игра')
TONES = ('mint', 'amber', 'rose')
DAY_SLOTS = ((8 * 60, 10 * 60), (10 * 60, 12 * 60), (14 * 60, 16 * 60), (18 * 60, 20 * 60))

def _booking_id_bulk(branch_id: str, day: dt.date, room_id: str, slot_ix: int) -> str:
    return f'seedm-{branch_id}-{day:%Y%m%d}-{room_id}-{slot_ix}'

class Command(BaseCommand):
    help = 'Демо-филиалы 1–2, плотное расписание на текущий месяц, якорные брони на сегодня.'

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        branch, _ = Branch.objects.update_or_create(id=DEMO_BRANCH_ID, defaults={'name': 'Courtly Downtown', 'hint': 'Главный филиал сети — демо-данные текущего месяца', 'connection_code': 'DOWNTOWN-DEMO'})
        branch2, _ = Branch.objects.update_or_create(id='2', defaults={'name': 'Courtly Riverside', 'hint': 'Второй филиал той же сети (один руководитель)', 'connection_code': 'RIVERSIDE-DEMO'})
        for rid, label, order in (('br2-r1', 'Корт 1', 0), ('br2-r2', 'Корт 2', 1), ('br2-r3', 'Зал функционала', 2)):
            Room.objects.update_or_create(id=rid, defaults={'branch': branch2, 'label': label, 'sort_order': order})
        rooms_spec_b1 = [('r1', 'Корт 1', 0), ('r2', 'Корт 2', 1), ('r3', 'Зал функционала', 2)]
        for rid, label, order in rooms_spec_b1:
            Room.objects.update_or_create(id=rid, defaults={'branch': branch, 'label': label, 'sort_order': order})
        rmap = {r.id: r for r in Room.objects.filter(branch=branch)}
        trainer_demo = User.objects.filter(courtly_profile__role=UserProfile.ROLE_TRAINER).first()
        client_demo = User.objects.filter(courtly_profile__role=UserProfile.ROLE_CLIENT).first()
        tprof = UserProfile.objects.filter(user=trainer_demo).first() if trainer_demo else None
        trainer_name = (tprof.display_name if tprof else '') or (trainer_demo.first_name if trainer_demo else '') or 'Trainer Courtly Demo'
        bookings_spec = [('bk1', 'r2', 10 * 60, 11 * 60, 'Смирнова А.', '+7 927 …', 'Аренда 1 ч', 'mint', True, True, 'c-alina', trainer_name if trainer_demo else 'Ильин А.', str(trainer_demo.pk) if trainer_demo else 's1', 'Подтверждено', 'lesson'), ('bk2', 'r3', 9 * 60 + 30, 11 * 60, 'Группа функционал', '—', 'Групповое', 'rose', False, True, None, trainer_name if trainer_demo else 'Ильин А.', str(trainer_demo.pk) if trainer_demo else 's1', 'Подтверждено', 'group'), ('bk3', 'r1', 18 * 60, 19 * 60, 'Козлов Д.', '+7 900 …', 'Индивидуально', 'amber', True, False, 'c-dmitry', '—', None, 'Ожидает', 'lesson')]
        for row in bookings_spec:
            bid, room_id, sm, em, client, phone, service, tone, paid, confirmed, cref, trainer, tsid, status, kind = row
            defaults = {'branch': branch, 'room': rmap[room_id], 'date': today, 'start_min': sm, 'end_min': em, 'client_name': client, 'phone': phone, 'service': service, 'tone': tone, 'paid': paid, 'confirmed': confirmed, 'client_ref': cref, 'trainer': trainer, 'trainer_staff_id': tsid, 'status': status, 'kind': kind}
            if trainer_demo and bid in ('bk1', 'bk2'):
                defaults['trainer_user_id'] = trainer_demo.pk
                defaults['trainer_staff_id'] = str(trainer_demo.pk)
            else:
                defaults['trainer_user_id'] = None
            Booking.objects.update_or_create(id=bid, defaults=defaults)
        Payment.objects.update_or_create(id='p1', defaults={'booking_id': 'bk1', 'amount_label': '1 200 ₽', 'status': 'Оплачено', 'method': 'Карта', 'booking_label': 'Корт 2, сегодня 10:00', 'trainer_amount_rub': 500 if trainer_demo else None})
        Payment.objects.update_or_create(id='p2', defaults={'booking_id': 'bk3', 'amount_label': '800 ₽', 'status': 'К оплате', 'method': '—', 'booking_label': 'Корт 1, сегодня 18:00'})
        Payment.objects.update_or_create(id='p3', defaults={'booking_id': 'bk2', 'amount_label': '4 500 ₽', 'status': 'Частично', 'method': 'Счёт', 'booking_label': 'Зал B, группа', 'trainer_amount_rub': 1800 if trainer_demo else None})
        y, m = (today.year, today.month)
        _, last_d = calendar.monthrange(y, m)
        month_end = dt.date(y, m, last_d)
        tourn_start = min(today + dt.timedelta(days=3), month_end - dt.timedelta(days=2))
        tourn_end = min(tourn_start + dt.timedelta(days=2), month_end)
        if tourn_end < tourn_start:
            tourn_start = max(dt.date(y, m, 1), today)
            tourn_end = min(tourn_start + dt.timedelta(days=2), month_end)
        open_day = min(today + dt.timedelta(days=10), month_end)
        ev1, _ = BranchEvent.objects.update_or_create(id='ev-seed-1', defaults={'branch': branch, 'room_id': 'r1', 'title': 'Турнир одиночек (демо-сетка)', 'kind': BranchEvent.KIND_TOURNAMENT, 'start_date': tourn_start, 'end_date': tourn_end, 'venue': 'Корты 1–3, Courtly Downtown', 'journal_block_start_min': 10 * 60, 'journal_block_end_min': 20 * 60, 'status': 'Регистрация открыта', 'event_format': 'Олимпийская система, матч за 3-е место', 'max_participants': 32, 'registered': 18, 'notes': 'Судейство: штат тренеров. Призы — сертификаты сети.'})
        replace_bracket_for_event(ev1, next_pow2_bracket_size(8))
        BranchEvent.objects.update_or_create(id='ev-seed-2', defaults={'branch': branch, 'title': 'День открытых дверей', 'kind': BranchEvent.KIND_OPEN_DAY, 'start_date': open_day, 'end_date': open_day, 'venue': 'Весь филиал', 'status': 'Регистрация открыта', 'event_format': '', 'max_participants': 200, 'registered': 0, 'notes': ''})
        month_start = dt.date(y, m, 1)
        total_bulk = 0
        for br in (branch, branch2):
            rooms = list(Room.objects.filter(branch=br).order_by('sort_order', 'id'))
            total_bulk += self._seed_month_grid(branch=br, rooms=rooms, month_start=month_start, month_end=month_end, today=today, trainer_user=trainer_demo, trainer_label=trainer_name, client_user=client_demo)
        self.stdout.write(self.style.SUCCESS(f'OK: филиалы 1–2, якорные брони на {today.isoformat()}, + {total_bulk} броней по сетке за {y}-{m:02d}.'))

    def _seed_month_grid(self, *, branch: Branch, rooms: list[Room], month_start: dt.date, month_end: dt.date, today: dt.date, trainer_user, trainer_label: str, client_user) -> int:
        count = 0
        d = month_start
        while d <= month_end:
            if d == today and branch.id == DEMO_BRANCH_ID:
                d += dt.timedelta(days=1)
                continue
            for room in rooms:
                for slot_ix, (sm, em) in enumerate(DAY_SLOTS):
                    bid = _booking_id_bulk(branch.id, d, room.id, slot_ix)
                    mix = (d.day + room.sort_order * 7 + slot_ix * 13) % 997
                    client_name = CLIENT_NAMES[mix % len(CLIENT_NAMES)]
                    service = SERVICES[mix // 3 % len(SERVICES)]
                    tone = TONES[mix % len(TONES)]
                    kind = 'group' if mix % 11 == 0 else 'lesson'
                    paid = mix % 3 != 0
                    confirmed = mix % 17 != 0
                    status = 'Подтверждено' if confirmed else 'Ожидает'
                    if not paid and mix % 5 == 0:
                        status = 'Ожидает'
                    cref = None
                    if client_user and mix % 2 == 0:
                        cref = f'u{client_user.pk}'
                    trainer_uid = None
                    tsid = None
                    tr_str = ''
                    if trainer_user and kind == 'lesson' and (mix % 4 != 0):
                        trainer_uid = trainer_user.pk
                        tsid = str(trainer_user.pk)
                        tr_str = trainer_label
                    if kind == 'group':
                        tr_str = trainer_label if trainer_user and mix % 3 == 0 else 'Групповой тренер'
                    if d < today and trainer_uid:
                        outcome = Booking.SESSION_OUTCOME_COMPLETED if mix % 7 != 0 else Booking.SESSION_OUTCOME_PENDING
                        if mix % 31 == 0:
                            outcome = Booking.SESSION_OUTCOME_NO_SHOW
                    elif d < today:
                        outcome = Booking.SESSION_OUTCOME_PENDING
                    else:
                        outcome = Booking.SESSION_OUTCOME_PENDING
                    Booking.objects.update_or_create(id=bid, defaults={'branch': branch, 'room': room, 'date': d, 'start_min': sm, 'end_min': em, 'client_name': client_name, 'phone': f'+7 9{mix % 10:01d}{mix % 100:02d} …', 'service': service, 'tone': tone, 'paid': paid, 'confirmed': confirmed, 'client_ref': cref, 'trainer': tr_str, 'trainer_staff_id': tsid, 'trainer_user_id': trainer_uid, 'status': status, 'kind': kind, 'session_outcome': outcome})
                    count += 1
                    if paid:
                        pid = f'pay-{bid}'
                        st = 'Оплачено' if mix % 6 != 0 else 'К оплате'
                        amt = f'{800 + mix % 40 * 100} ₽'
                        Payment.objects.update_or_create(id=pid, defaults={'booking_id': bid, 'amount_label': amt, 'status': st, 'method': 'Карта' if mix % 2 == 0 else 'Наличные', 'booking_label': f'{room.label}, {d.isoformat()}', 'trainer_amount_rub': 400 + mix % 5 * 50 if trainer_uid and st == 'Оплачено' else None})
            d += dt.timedelta(days=1)
        return count
