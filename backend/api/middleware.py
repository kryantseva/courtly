from __future__ import annotations
import logging
import time
import uuid
from django.conf import settings
from .logging_context import reset_request_id, set_request_id
request_logger = logging.getLogger('api.request')

class RequestContextLogMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        request_id = (request.headers.get('X-Request-ID') or '').strip() or uuid.uuid4().hex
        request.request_id = request_id
        token = set_request_id(request_id)
        user_id = getattr(getattr(request, 'user', None), 'id', None)
        if not getattr(getattr(request, 'user', None), 'is_authenticated', False):
            user_id = None
        try:
            try:
                response = self.get_response(request)
            except Exception:
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                request_logger.info('request_failed', extra={'service': getattr(settings, 'SERVICE_NAME', 'courtly-api'), 'event': 'http_access', 'request_id': request_id, 'http_method': request.method, 'path': request.path, 'status': 500, 'latency_ms': elapsed_ms, 'user_id': user_id})
                raise
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            request_logger.info('request_completed', extra={'service': getattr(settings, 'SERVICE_NAME', 'courtly-api'), 'event': 'http_access', 'request_id': request_id, 'http_method': request.method, 'path': request.path, 'status': response.status_code, 'latency_ms': elapsed_ms, 'user_id': user_id})
            response['X-Request-ID'] = request_id
            return response
        finally:
            reset_request_id(token)

class ApiDeprecationHeaderMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = request.path or ''
        if path.startswith('/api/health'):
            return response
        if path.startswith('/api/') and (not path.startswith('/api/v1/')):
            response['Deprecation'] = 'true'
            response['Sunset'] = 'Wed, 31 Dec 2026 23:59:59 GMT'
            response['Link'] = '</api/v1/>; rel="successor-version"'
        return response
