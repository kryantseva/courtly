# Retention Runbook: Audit & Idempotency

## Scope

- `AuditLog` (business audit trail)
- `IdempotencyRecord` (idempotency replay records)
- Cleanup command: `python manage.py cleanup_audit_and_idempotency`

## Retention Policy

- `AuditLog`: keep `180` days
- `IdempotencyRecord`: keep `7` days

Recommended command arguments:

```bash
python manage.py cleanup_audit_and_idempotency --audit-days 180 --idempotency-days 7
```

## Dry-Run Validation

Before enabling scheduled deletion in production, run:

```bash
python manage.py cleanup_audit_and_idempotency --audit-days 180 --idempotency-days 7 --dry-run
```

Expected output format:

```text
[dry-run] audit=<N> (older than 180d), idempotency=<M> (older than 7d)
```

If numbers look unexpectedly high, stop and verify:

- app timezone/config
- historical import tasks
- any legal/compliance retention constraints

## Production Scheduling

Run once daily in off-peak hours (example: 03:20 server time).

### Cron example

```cron
20 3 * * * cd /srv/courtly/backend && /srv/courtly/.venv/bin/python manage.py cleanup_audit_and_idempotency --audit-days 180 --idempotency-days 7 >> /var/log/courtly/cleanup.log 2>&1
```

### Runner/K8s job (example)

- schedule: daily
- command:
  - `python manage.py cleanup_audit_and_idempotency --audit-days 180 --idempotency-days 7`
- send logs to centralized logging stack

## Post-Run Verification

After first scheduled runs:

1. Check exit code is `0`.
2. Verify output includes `deleted audit=...` and `idempotency=...`.
3. Confirm application behavior for booking create retries remains normal.

## Rollback / Safe Mode

If cleanup behavior is suspicious:

1. disable schedule
2. switch to dry-run only
3. investigate affected tables and restore from backup if needed
