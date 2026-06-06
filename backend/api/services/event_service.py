from __future__ import annotations
import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from api.models import BranchEvent, EventRegistration, EventWaitlistEntry

@transaction.atomic
def register_me(*, user, event_id: str) -> BranchEvent:
    ev_locked = BranchEvent.objects.select_for_update(of=('self',)).get(pk=event_id)
    st = (ev_locked.status or '').strip()
    if st in ('Отменено', 'Завершено'):
        raise ValidationError({'detail': 'Регистрация на это событие закрыта.'})
    if st != 'Регистрация открыта':
        raise ValidationError({'detail': 'Онлайн-запись доступна при статусе «Регистрация открыта».'})
    if timezone.localdate() >= ev_locked.start_date:
        raise ValidationError({'detail': 'Регистрация закрыта: мероприятие уже началось.'})
    if EventRegistration.objects.filter(event=ev_locked, user=user).exists():
        raise ValidationError({'detail': 'Вы уже записаны на это мероприятие.'})
    if ev_locked.max_participants is not None and ev_locked.registered >= ev_locked.max_participants:
        raise ValidationError({'detail': 'Свободных мест больше нет.'})
    rid = f'er{uuid.uuid4().hex[:10]}'
    EventRegistration.objects.create(id=rid, event=ev_locked, user=user)
    EventWaitlistEntry.objects.filter(event=ev_locked, user=user).delete()
    ev_locked.registered += 1
    ev_locked.save(update_fields=['registered'])
    ev_locked.refresh_from_db()
    return ev_locked

@transaction.atomic
def promote_waitlist_entry_staff(*, event_id: str, waitlist_entry_id: str) -> tuple[BranchEvent, str]:
    ev_locked = BranchEvent.objects.select_for_update(of=('self',)).get(pk=event_id)
    st = (ev_locked.status or '').strip()
    if st in ('Отменено', 'Завершено'):
        raise ValidationError({'detail': 'Событие отменено или завершено.'})
    if st != 'Регистрация открыта':
        raise ValidationError({'detail': 'Доступно при статусе «Регистрация открыта».'})
    row = EventWaitlistEntry.objects.filter(pk=waitlist_entry_id, event_id=event_id).select_related('user').first()
    if not row:
        raise ValidationError({'detail': 'Запись в листе ожидания не найдена.'})
    if EventRegistration.objects.filter(event=ev_locked, user=row.user).exists():
        row.delete()
        ev_locked.refresh_from_db()
        raise ValidationError({'detail': 'Пользователь уже в списке участников.'})
    if ev_locked.max_participants is not None and (ev_locked.registered or 0) >= ev_locked.max_participants:
        raise ValidationError({'detail': 'Нет свободных мест — увеличьте лимит или снимите участника.'})
    rid = f'er{uuid.uuid4().hex[:10]}'
    EventRegistration.objects.create(id=rid, event=ev_locked, user=row.user)
    row.delete()
    ev_locked.registered = (ev_locked.registered or 0) + 1
    ev_locked.save(update_fields=['registered'])
    ev_locked.refresh_from_db()
    return (ev_locked, rid)
