from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Branch, BranchMembership, UserProfile
User = get_user_model()
DEMO_PASSWORD = 'CourtlyDemo1!'
DEMO_ACCOUNTS = (('client.courtly.demo@courtly.demo', 'client@courtly.demo', 'Client Courtly Demo', UserProfile.ROLE_CLIENT, '+7 900 100-00-01'), ('trainer.courtly.demo@courtly.demo', 'trainer@courtly.demo', 'Trainer Courtly Demo', UserProfile.ROLE_TRAINER, '+7 900 100-00-02'), ('admin.courtly.demo@courtly.demo', 'admin@courtly.demo', 'Admin Courtly Demo', UserProfile.ROLE_ADMIN, '+7 900 100-00-03'), ('director.courtly.demo@courtly.demo', 'director@courtly.demo', 'Director Courtly Demo', UserProfile.ROLE_DIRECTOR, '+7 900 100-00-04'))

def _ensure_user(new_email: str, legacy_username: str | None, name: str, role: str, phone: str):
    user = User.objects.filter(username=new_email).first()
    if user is None and legacy_username:
        user = User.objects.filter(username=legacy_username).first()
        if user is not None:
            user.username = new_email
            user.email = new_email
            user.save(update_fields=['username', 'email'])
    if user is None:
        user = User.objects.create_user(username=new_email, email=new_email, password=DEMO_PASSWORD, first_name=name[:150])
    else:
        user.email = new_email
        user.first_name = name[:150]
        user.set_password(DEMO_PASSWORD)
        user.save(update_fields=['email', 'first_name', 'password'])
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'display_name': name, 'role': role, 'phone': phone})
    if profile.role != role or profile.display_name != name or profile.phone != phone:
        profile.role = role
        profile.display_name = name
        profile.phone = phone
        profile.save(update_fields=['role', 'display_name', 'phone'])
    return user

class Command(BaseCommand):
    help = 'Создаёт демо-пользователей по ролям (email вида role.courtly.demo@courtly.demo, пароль в константе).'

    @transaction.atomic
    def handle(self, *args, **options):
        for new_email, legacy, name, role, phone in DEMO_ACCOUNTS:
            _ensure_user(new_email, legacy, name, role, phone)
        demo_branches = list(Branch.objects.filter(pk__in=['1', '2']))
        for new_email, *_rest in DEMO_ACCOUNTS:
            u = User.objects.get(username=new_email)
            for b in demo_branches:
                BranchMembership.objects.get_or_create(user=u, branch=b)
        self.stdout.write(self.style.SUCCESS(f'OK: пароль для всех демо-аккаунтов: {DEMO_PASSWORD}'))
        self.stdout.write('Логины: client / trainer / admin / director — префикс .courtly.demo@courtly.demo')
        self.stdout.write('Оба филиала (id 1 и 2) привязаны к каждому демо-пользователю; директор видит сеть по этим членствам.')
