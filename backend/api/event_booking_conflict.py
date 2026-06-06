from typing import Optional
from .models import BranchEvent

def _intervals_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and a_end > b_start

def booking_overlaps_branch_event(day, start_min: int, end_min: int, event: BranchEvent) -> bool:
    if not event.room_id:
        return False
    if day < event.start_date or day > event.end_date:
        return False
    if (event.status or '').strip() == 'Отменено':
        return False
    if event.journal_block_start_min is None or event.journal_block_end_min is None:
        ev_start, ev_end = (0, 24 * 60 + 59)
    else:
        ev_start, ev_end = (event.journal_block_start_min, event.journal_block_end_min)
    return _intervals_overlap(start_min, end_min, ev_start, ev_end)

def find_conflicting_event_for_booking(branch_id: str, room_id: str, day, start_min: int, end_min: int) -> Optional[BranchEvent]:
    qs = BranchEvent.objects.filter(branch_id=branch_id, room_id=room_id, start_date__lte=day, end_date__gte=day).exclude(status='Отменено').order_by('start_date', 'id')
    for ev in qs:
        if booking_overlaps_branch_event(day, start_min, end_min, ev):
            return ev
    return None
