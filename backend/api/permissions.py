from __future__ import annotations
from rest_framework.permissions import BasePermission
from .access import user_can_manage_branch_bookings, user_can_view_audit, user_has_branch_access, user_is_trainer

class IsBranchMemberByURL(BasePermission):
    message = 'Нет доступа к этому филиалу.'

    def has_permission(self, request, view) -> bool:
        branch_id = view.kwargs.get('branch_id')
        if not branch_id:
            return True
        return user_has_branch_access(request.user, branch_id)

class CanManageBranchBookingsPermission(BasePermission):
    message = 'Недостаточно прав для операции.'

    def has_permission(self, request, view) -> bool:
        return user_can_manage_branch_bookings(request.user)

class CanViewAuditPermission(BasePermission):
    message = 'Недостаточно прав для просмотра аудита.'

    def has_permission(self, request, view) -> bool:
        return user_can_view_audit(request.user)

class IsTrainerUser(BasePermission):
    message = 'Требуется роль тренера.'

    def has_permission(self, request, view) -> bool:
        return user_is_trainer(request.user)
