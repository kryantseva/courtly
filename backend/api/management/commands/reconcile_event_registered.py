from django.core.management.base import BaseCommand
from django.db.models import Count
from api.models import BranchEvent

class Command(BaseCommand):
    help = 'Синхронизирует поле BranchEvent.registered с фактическим числом EventRegistration (после ручных правок БД или сбоев).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Только показать расхождения, без записи.')
        parser.add_argument('--branch-id', type=str, default=None, help='Ограничить события одним филиалом (id).')

    def handle(self, *args, **options):
        dry = options['dry_run']
        branch_id = options.get('branch_id')
        qs = BranchEvent.objects.all()
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        qs = qs.annotate(_reg_count=Count('registrations'))
        n_changed = 0
        for ev in qs.order_by('branch_id', 'start_date', 'id'):
            actual = int(ev._reg_count)
            if ev.registered != actual:
                self.stdout.write(f'{ev.branch_id}\t{ev.id}\tregistered {ev.registered} -> {actual}\t{ev.title[:50]}')
                if not dry:
                    BranchEvent.objects.filter(pk=ev.pk).update(registered=actual)
                n_changed += 1
        if n_changed == 0:
            self.stdout.write(self.style.SUCCESS('Расхождений не найдено.'))
        else:
            verb = 'Проверка (без записи):' if dry else 'Обновлено событий:'
            self.stdout.write(self.style.SUCCESS(f'{verb} {n_changed}'))
