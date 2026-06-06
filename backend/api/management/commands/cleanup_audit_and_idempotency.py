from __future__ import annotations
import datetime as dt
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import AuditLog, IdempotencyRecord, PaymentWebhookIdempotency

class Command(BaseCommand):
    help = 'Удаляет старые записи аудита и idempotency.'

    def add_arguments(self, parser):
        parser.add_argument('--audit-days', type=int, default=180)
        parser.add_argument('--idempotency-days', type=int, default=7)
        parser.add_argument('--webhook-idempotency-days', type=int, default=90, help='Записи PaymentWebhookIdempotency старше N дней (идемпотентность webhook).')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        audit_days = max(int(options['audit_days']), 1)
        idem_days = max(int(options['idempotency_days']), 1)
        wh_days = max(int(options['webhook_idempotency_days']), 1)
        dry_run = bool(options['dry_run'])
        now = timezone.now()
        audit_before = now - dt.timedelta(days=audit_days)
        idem_before = now - dt.timedelta(days=idem_days)
        wh_before = now - dt.timedelta(days=wh_days)
        audit_qs = AuditLog.objects.filter(created_at__lt=audit_before)
        idem_qs = IdempotencyRecord.objects.filter(created_at__lt=idem_before)
        wh_qs = PaymentWebhookIdempotency.objects.filter(created_at__lt=wh_before)
        audit_count = audit_qs.count()
        idem_count = idem_qs.count()
        wh_count = wh_qs.count()
        if dry_run:
            self.stdout.write(self.style.WARNING(f'[dry-run] audit={audit_count} (>{audit_days}d), idempotency={idem_count} (>{idem_days}d), webhook_idempotency={wh_count} (>{wh_days}d)'))
            return
        deleted_audit, _ = audit_qs.delete()
        deleted_idem, _ = idem_qs.delete()
        deleted_wh, _ = wh_qs.delete()
        self.stdout.write(self.style.SUCCESS(f'deleted audit={deleted_audit}, idempotency={deleted_idem}, webhook_idempotency={deleted_wh}'))
