from django.conf import settings
from django.db import models

class UserProfile(models.Model):
    ROLE_CLIENT = 'client'
    ROLE_TRAINER = 'trainer'
    ROLE_ADMIN = 'admin'
    ROLE_DIRECTOR = 'director'
    ROLE_CHOICES = [(ROLE_CLIENT, 'client'), (ROLE_TRAINER, 'trainer'), (ROLE_ADMIN, 'admin'), (ROLE_DIRECTOR, 'director')]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courtly_profile')
    display_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=64, blank=True)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_CLIENT)

    def __str__(self) -> str:
        return self.user.email or self.user.username

class Branch(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    hint = models.CharField(max_length=255, blank=True)
    connection_code = models.CharField(max_length=64, null=True, blank=True, unique=True, help_text='Код подключения для пользователей (уникален, регистр не важен).')

    class Meta:
        ordering = ['id']

    def __str__(self) -> str:
        return self.name

class BranchMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='branch_memberships')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='memberships')

    class Meta:
        unique_together = [('user', 'branch')]
        ordering = ['branch_id']

    def __str__(self) -> str:
        return f'{self.user_id} → {self.branch_id}'

class Room(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='rooms')
    label = models.CharField(max_length=255)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['branch_id', 'sort_order', 'id']

    def __str__(self) -> str:
        return self.label

class Booking(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='bookings')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='bookings')
    date = models.DateField(db_index=True)
    start_min = models.PositiveIntegerField()
    end_min = models.PositiveIntegerField()
    client_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=64, blank=True)
    service = models.CharField(max_length=255, blank=True)
    tone = models.CharField(max_length=32, default='mint')
    paid = models.BooleanField(default=False)
    confirmed = models.BooleanField(default=False)
    client_ref = models.CharField(max_length=64, blank=True, null=True)
    trainer = models.CharField(max_length=255, blank=True)
    trainer_staff_id = models.CharField(max_length=64, blank=True, null=True)
    trainer_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='courtly_trainer_bookings')
    SESSION_OUTCOME_PENDING = 'pending'
    SESSION_OUTCOME_COMPLETED = 'completed'
    SESSION_OUTCOME_NO_SHOW = 'no_show'
    SESSION_OUTCOME_RESCHEDULED = 'rescheduled'
    SESSION_OUTCOME_CHOICES = [(SESSION_OUTCOME_PENDING, 'pending'), (SESSION_OUTCOME_COMPLETED, 'completed'), (SESSION_OUTCOME_NO_SHOW, 'no_show'), (SESSION_OUTCOME_RESCHEDULED, 'rescheduled')]
    session_outcome = models.CharField(max_length=32, choices=SESSION_OUTCOME_CHOICES, default=SESSION_OUTCOME_PENDING, blank=True)
    status = models.CharField(max_length=64, blank=True)
    kind = models.CharField(max_length=32, blank=True)

    class Meta:
        ordering = ['date', 'start_min', 'id']
        indexes = [models.Index(fields=['branch', 'date', 'start_min'], name='booking_branch_date_start_idx'), models.Index(fields=['branch', 'room', 'date', 'start_min'], name='booking_branch_room_day_idx'), models.Index(fields=['client_ref', 'date'], name='booking_clientref_date_idx'), models.Index(fields=['status'], name='booking_status_idx'), models.Index(fields=['kind'], name='booking_kind_idx'), models.Index(fields=['trainer_user', 'date'], name='booking_trainer_user_date_idx')]

    def __str__(self) -> str:
        return f'{self.client_name} {self.date}'

class Payment(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    amount_label = models.CharField(max_length=64)
    status = models.CharField(max_length=64)
    method = models.CharField(max_length=64, blank=True)
    booking_label = models.CharField(max_length=255, blank=True)
    trainer_amount_rub = models.PositiveIntegerField(null=True, blank=True, help_text='Начисление тренеру по этому платежу (руб., целое).')

    class Meta:
        ordering = ['id']
        indexes = [models.Index(fields=['status'], name='payment_status_idx')]

class PaymentReceipt(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='receipt')
    snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class PaymentWebhookIdempotency(models.Model):
    id = models.BigAutoField(primary_key=True)
    key = models.CharField(max_length=128, unique=True)
    body_sha256 = models.CharField(max_length=64)
    response_status = models.PositiveSmallIntegerField(default=200)
    response_body = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at', '-id']

class BranchEvent(models.Model):
    KIND_TOURNAMENT = 'tournament'
    KIND_OPEN_DAY = 'open_day'
    KIND_CAMP = 'camp'
    KIND_MAINTENANCE = 'maintenance_block'
    KIND_CORPORATE = 'corporate'
    KIND_CHOICES = [(KIND_TOURNAMENT, 'tournament'), (KIND_OPEN_DAY, 'open_day'), (KIND_CAMP, 'camp'), (KIND_MAINTENANCE, 'maintenance_block'), (KIND_CORPORATE, 'corporate')]
    id = models.CharField(max_length=64, primary_key=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='events')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='events')
    title = models.CharField(max_length=255)
    kind = models.CharField(max_length=32, choices=KIND_CHOICES, default=KIND_TOURNAMENT)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    venue = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=128, default='Черновик')
    event_format = models.CharField(max_length=255, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    registered = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    journal_block_start_min = models.PositiveIntegerField(null=True, blank=True)
    journal_block_end_min = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['start_date', 'id']

    def __str__(self) -> str:
        return self.title

class EventRegistration(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    event = models.ForeignKey(BranchEvent, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courtly_event_registrations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        constraints = [models.UniqueConstraint(fields=['event', 'user'], name='unique_event_registration_per_user')]

    def __str__(self) -> str:
        return f'{self.user_id} → {self.event_id}'

class EventWaitlistEntry(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    event = models.ForeignKey(BranchEvent, on_delete=models.CASCADE, related_name='waitlist_entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courtly_event_waitlist_entries')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        constraints = [models.UniqueConstraint(fields=['event', 'user'], name='unique_event_waitlist_per_user')]

    def __str__(self) -> str:
        return f'wait {self.user_id} → {self.event_id}'

class UserNotification(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courtly_notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    link_path = models.CharField(max_length=512, blank=True, default='')
    event_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.user_id}: {self.title[:40]}'

class BranchEventMatch(models.Model):
    WIN_TOP = 'top'
    WIN_BOTTOM = 'bottom'
    id = models.CharField(max_length=64, primary_key=True)
    event = models.ForeignKey(BranchEvent, on_delete=models.CASCADE, related_name='bracket_matches')
    round_num = models.PositiveSmallIntegerField(db_index=True)
    slot = models.PositiveSmallIntegerField()
    label_top = models.CharField(max_length=255, blank=True)
    label_bottom = models.CharField(max_length=255, blank=True)
    score_top = models.PositiveSmallIntegerField(null=True, blank=True)
    score_bottom = models.PositiveSmallIntegerField(null=True, blank=True)
    winner = models.CharField(max_length=8, blank=True, default='')

    class Meta:
        ordering = ['round_num', 'slot']
        constraints = [models.UniqueConstraint(fields=['event', 'round_num', 'slot'], name='unique_event_round_slot')]

    def __str__(self) -> str:
        return f'{self.event_id} r{self.round_num}s{self.slot}'

class AuditLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='courtly_audit_logs')
    action = models.CharField(max_length=64, db_index=True)
    entity_type = models.CharField(max_length=64, db_index=True)
    entity_id = models.CharField(max_length=64, db_index=True)
    branch_id = models.CharField(max_length=64, blank=True, default='')
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['branch_id', '-created_at'], name='audit_branch_created_idx'), models.Index(fields=['user', '-created_at'], name='audit_user_created_idx')]

class IdempotencyRecord(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courtly_idempotency_records')
    endpoint = models.CharField(max_length=255)
    key = models.CharField(max_length=128)
    request_hash = models.CharField(max_length=64)
    response_status = models.PositiveSmallIntegerField()
    response_body = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['endpoint', '-created_at'], name='idem_endpoint_created_idx'), models.Index(fields=['key', '-created_at'], name='idem_key_created_idx')]
        constraints = [models.UniqueConstraint(fields=['user', 'endpoint', 'key'], name='uniq_idempotency_user_endpoint_key')]

class PasswordResetToken(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courtly_password_reset_tokens')
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)
    used_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at', '-id']

class TrainerAvailabilityWindow(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trainer_availability_windows')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='trainer_availability_windows')
    weekday = models.PositiveSmallIntegerField(help_text='0=пн … 6=вс (как date.weekday() в Python).')
    start_min = models.PositiveIntegerField()
    end_min = models.PositiveIntegerField()
    note = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['branch_id', 'weekday', 'start_min', 'id']
        indexes = [models.Index(fields=['branch', 'user', 'weekday'], name='trn_avail_branch_user_wd')]
