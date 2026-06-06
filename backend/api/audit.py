from __future__ import annotations
from typing import Any
from .models import AuditLog

def log_audit(*, user: Any, action: str, entity_type: str, entity_id: str, branch_id: str='', payload: dict | None=None) -> None:
    AuditLog.objects.create(user=user if getattr(user, 'is_authenticated', False) else None, action=action, entity_type=entity_type, entity_id=entity_id, branch_id=branch_id or '', payload=payload or {})
