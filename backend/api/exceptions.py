from __future__ import annotations
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

def api_exception_handler(exc, context):
    resp = drf_exception_handler(exc, context)
    if resp is None:
        return Response({'error': {'code': 'server_error', 'message': 'Внутренняя ошибка сервера.', 'details': None}, 'detail': 'Внутренняя ошибка сервера.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    details = resp.data
    message = 'Ошибка запроса.'
    if isinstance(details, dict):
        if isinstance(details.get('detail'), str):
            message = details['detail']
    elif isinstance(details, str):
        message = details
    code = 'validation_error' if resp.status_code == 400 else f'http_{resp.status_code}'
    resp.data = {'error': {'code': code, 'message': message, 'details': details}, 'detail': message}
    return resp
