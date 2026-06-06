from django.urls import include, path
from api.health_views import health_diagnostics, health_live, health_ready, health_root
urlpatterns = [path('api/health/', health_root, name='health'), path('api/health/live/', health_live, name='health-live'), path('api/health/ready/', health_ready, name='health-ready'), path('api/health/diagnostics/', health_diagnostics, name='health-diagnostics'), path('api/v1/', include('api.urls_v1')), path('api/', include('api.urls'))]
