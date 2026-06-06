from __future__ import annotations
from typing import Optional
from .models import Booking

def _intervals_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and a_end > b_start

def find_overlapping_booking(branch_id: str, room_id: str, day, start_min: int, end_min: int, *, exclude_booking_id: str | None=None) -> Optional[Booking]:
    qs = Booking.objects.filter(branch_id=branch_id, room_id=room_id, date=day)
    if exclude_booking_id:
        qs = qs.exclude(pk=exclude_booking_id)
    for b in qs:
        if _intervals_overlap(start_min, end_min, b.start_min, b.end_min):
            return b
    return None
