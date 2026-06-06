from __future__ import annotations
import logging
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
logger = logging.getLogger('api.health')

def health_live(_request) -> JsonResponse:
    return JsonResponse({'status': 'ok', 'check': 'liveness'})

def health_ready(_request) -> JsonResponse:
    checks: dict = {}
    db_ok = False
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        db_ok = True
    except Exception as exc:
        logger.warning('readiness database check failed', exc_info=True)
        checks['database'] = {'ok': False, 'error': type(exc).__name__}
    else:
        checks['database'] = {'ok': True}
    if not db_ok:
        return JsonResponse({'status': 'unready', 'checks': checks}, status=503)
    return JsonResponse({'status': 'ready', 'checks': checks})

def health_root(_request) -> JsonResponse:
    return health_live(_request)

def health_diagnostics(request) -> JsonResponse:
    payload = {'service': getattr(settings, 'SERVICE_NAME', 'courtly-api'), 'release': getattr(settings, 'SENTRY_RELEASE', '') or 'unknown', 'environment': getattr(settings, 'SENTRY_ENVIRONMENT', '') or 'unknown', 'debug': bool(settings.DEBUG)}
    rid = getattr(request, 'request_id', None)
    if rid:
        payload['request_id'] = rid
    return JsonResponse(payload)
