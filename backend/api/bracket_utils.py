from __future__ import annotations
import uuid
from django.db import transaction
from .models import BranchEvent, BranchEventMatch

def next_pow2_bracket_size(participants: int | None, cap: int=64) -> int:
    lo = 4
    if not participants or participants < lo:
        n = 8
    else:
        n = participants
    p = 1
    while p < n:
        p <<= 1
    return min(max(p, lo), cap)

def bracket_round_count(size: int) -> int:
    return size.bit_length() - 1

@transaction.atomic
def replace_bracket_for_event(event: BranchEvent, size: int) -> list[BranchEventMatch]:
    BranchEventMatch.objects.filter(event=event).delete()
    rcount = bracket_round_count(size)
    created: list[BranchEventMatch] = []
    for round_num in range(1, rcount + 1):
        num_matches = size // 2 ** round_num
        for slot in range(num_matches):
            if round_num == 1:
                top = f'Участник {2 * slot + 1}'
                bottom = f'Участник {2 * slot + 2}'
            else:
                top = '—'
                bottom = '—'
            mid = f'bm{uuid.uuid4().hex[:9]}'
            created.append(BranchEventMatch.objects.create(id=mid, event=event, round_num=round_num, slot=slot, label_top=top, label_bottom=bottom))
    return created

def propagate_bracket_winner(match: BranchEventMatch) -> BranchEventMatch | None:
    if not match.winner:
        return None
    win_label = match.label_top if match.winner == BranchEventMatch.WIN_TOP else match.label_bottom
    next_round = match.round_num + 1
    parent_slot = match.slot // 2
    child = BranchEventMatch.objects.filter(event=match.event, round_num=next_round, slot=parent_slot).first()
    if not child:
        return None
    field = 'label_top' if match.slot % 2 == 0 else 'label_bottom'
    new_val = (win_label or '').strip() or '—'
    setattr(child, field, new_val)
    child.save(update_fields=[field])
    return child
