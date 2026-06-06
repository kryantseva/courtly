from __future__ import annotations
from django.db.models import Q
from .models import Booking, BranchMembership, UserProfile

def user_has_branch_access(user, branch_id: str) -> bool:
    if not getattr(user, 'is_authenticated', False):
        return False
    return BranchMembership.objects.filter(user=user, branch_id=branch_id).exists()

def user_can_manage_branch_bookings(user) -> bool:
    if not getattr(user, 'is_authenticated', False):
        return False
    prof = UserProfile.objects.filter(user=user).first()
    if not prof:
        return False
    return prof.role in (UserProfile.ROLE_ADMIN, UserProfile.ROLE_TRAINER, UserProfile.ROLE_DIRECTOR)

def user_is_director(user) -> bool:
    if not getattr(user, 'is_authenticated', False):
        return False
    prof = UserProfile.objects.filter(user=user).first()
    return bool(prof and prof.role == UserProfile.ROLE_DIRECTOR)

def director_accessible_branch_ids(user) -> list[str]:
    if not getattr(user, 'is_authenticated', False):
        return []
    return list(BranchMembership.objects.filter(user=user).values_list('branch_id', flat=True))

def user_can_view_audit(user) -> bool:
    if not getattr(user, 'is_authenticated', False):
        return False
    prof = UserProfile.objects.filter(user=user).first()
    if not prof:
        return False
    return prof.role in (UserProfile.ROLE_ADMIN, UserProfile.ROLE_DIRECTOR)

def user_is_trainer(user) -> bool:
    if not getattr(user, 'is_authenticated', False):
        return False
    prof = UserProfile.objects.filter(user=user).first()
    return bool(prof and prof.role == UserProfile.ROLE_TRAINER)

def trainer_bookings_filter_q(user) -> Q:
    return Q(trainer_user_id=user.pk) | Q(trainer_staff_id=str(user.pk))

def user_is_assigned_trainer(user, booking: Booking) -> bool:
    if booking.trainer_user_id and booking.trainer_user_id == user.pk:
        return True
    tsid = (booking.trainer_staff_id or '').strip()
    return bool(tsid and tsid == str(user.pk))
