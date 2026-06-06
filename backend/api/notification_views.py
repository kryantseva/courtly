from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import UserNotification

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = list(UserNotification.objects.filter(user=request.user).order_by('-created_at')[:80])
        return Response({'notifications': [{'id': n.id, 'title': n.title, 'text': n.body, 'read': n.read_at is not None, 'time': n.created_at.isoformat(), 'linkTo': n.link_path or None} for n in rows]})

class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id: str):
        n = UserNotification.objects.filter(pk=notification_id, user=request.user).first()
        if not n:
            return Response({'detail': 'Уведомление не найдено.'}, status=404)
        if n.read_at is None:
            n.read_at = timezone.now()
            n.save(update_fields=['read_at'])
        return Response({'ok': True})
