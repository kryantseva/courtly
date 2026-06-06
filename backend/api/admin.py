from django.contrib import admin
from .models import Booking, Branch, BranchEvent, BranchEventMatch, BranchMembership, EventRegistration, EventWaitlistEntry, Payment, PaymentReceipt, PaymentWebhookIdempotency, Room, UserProfile, UserNotification

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'display_name', 'phone')
    list_filter = ('role',)

@admin.register(BranchMembership)
class BranchMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'branch')
    list_filter = ('branch',)

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'connection_code')
    search_fields = ('id', 'name', 'connection_code')

class RoomInline(admin.TabularInline):
    model = Room
    extra = 0

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'branch', 'label', 'sort_order')
    list_filter = ('branch',)

@admin.register(BranchEvent)
class BranchEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'branch', 'room', 'title', 'kind', 'start_date', 'end_date', 'status')
    list_filter = ('branch', 'kind', 'status')

@admin.register(BranchEventMatch)
class BranchEventMatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'round_num', 'slot', 'label_top', 'label_bottom', 'winner')
    list_filter = ('event', 'round_num')

@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'user', 'created_at')
    list_filter = ('event',)

@admin.register(EventWaitlistEntry)
class EventWaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'user', 'created_at')
    list_filter = ('event',)

@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'read_at', 'created_at')
    list_filter = ('read_at',)

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'branch', 'date', 'client_name', 'start_min', 'end_min')
    list_filter = ('branch', 'date')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'amount_label', 'status')

@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ('id', 'payment', 'created_at')

@admin.register(PaymentWebhookIdempotency)
class PaymentWebhookIdempotencyAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'response_status', 'created_at')
    search_fields = ('key',)
