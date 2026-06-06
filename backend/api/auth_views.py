from __future__ import annotations
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from .audit import log_audit
from .contracts import created, ok
from .serializers import ChangePasswordSerializer, LoginSerializer, MePatchSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer, RegisterSerializer, user_payload
User = get_user_model()

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        log_audit(user=user, action='user_registered', entity_type='user', entity_id=str(user.pk), branch_id='', payload={})
        token, _ = Token.objects.get_or_create(user=user)
        payload = {'token': token.key, 'user': user_payload(user)}
        return created(data=payload, legacy=payload)

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        ser = LoginSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        user = ser.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        payload = {'token': token.key, 'user': user_payload(user)}
        return ok(data=payload, legacy=payload)

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'profile'

    def get(self, request):
        payload = {'user': user_payload(request.user)}
        return ok(data=payload, legacy=payload)

    def patch(self, request):
        ser = MePatchSerializer(data=request.data, partial=True, context={'request': request})
        ser.is_valid(raise_exception=True)
        if not ser.validated_data:
            payload = {'user': user_payload(request.user)}
            return ok(data=payload, legacy=payload)
        ser.update(request.user, ser.validated_data)
        request.user.refresh_from_db()
        payload = {'user': user_payload(request.user)}
        return ok(data=payload, legacy=payload)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'profile'

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        log_audit(user=request.user, action='password_changed', entity_type='user', entity_id=str(request.user.pk), branch_id='', payload={})
        payload = {'detail': 'Пароль обновлен.'}
        return ok(data=payload, legacy=payload, status=status.HTTP_200_OK)

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        ttl_minutes = int(getattr(settings, 'PASSWORD_RESET_TOKEN_TTL_MINUTES', 30))
        ser = PasswordResetRequestSerializer(data=request.data, context={'request': request, 'ttl_minutes': ttl_minutes})
        ser.is_valid(raise_exception=True)
        email = (ser.validated_data.get('email') or '').strip().lower()
        payload = ser.save()
        u = User.objects.filter(username__iexact=email).first()
        if u:
            log_audit(user=u, action='password_reset_requested', entity_type='user', entity_id=str(u.pk), branch_id='', payload={})
        if not settings.DEBUG:
            payload.pop('reset_token', None)
        return ok(data=payload, legacy=payload, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        rec = ser.validated_data['record']
        user = rec.user
        user.set_password(ser.validated_data['new_password'])
        user.save(update_fields=['password'])
        rec.used_at = timezone.now()
        rec.save(update_fields=['used_at'])
        log_audit(user=user, action='password_reset_completed', entity_type='user', entity_id=str(user.pk), branch_id='', payload={})
        payload = {'detail': 'Пароль успешно сброшен.'}
        return ok(data=payload, legacy=payload, status=status.HTTP_200_OK)
