from pathlib import Path
import environ
from corsheaders.defaults import default_headers
try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
except Exception:
    sentry_sdk = None
    DjangoIntegration = None
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / '.env')
SECRET_KEY = env('DJANGO_SECRET_KEY', default='change-me')
DEBUG = env.bool('DJANGO_DEBUG', default=True)
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])
INSTALLED_APPS = ['corsheaders', 'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles', 'rest_framework', 'rest_framework.authtoken', 'api']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware', 'corsheaders.middleware.CorsMiddleware', 'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.common.CommonMiddleware', 'django.middleware.csrf.CsrfViewMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware', 'api.middleware.RequestContextLogMiddleware', 'api.middleware.ApiDeprecationHeaderMiddleware', 'django.contrib.messages.middleware.MessageMiddleware', 'django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True, 'OPTIONS': {'context_processors': ['django.template.context_processors.request', 'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'
DATABASES = {'default': {'ENGINE': 'django.db.backends.postgresql', 'NAME': env('POSTGRES_DB', default='courtly'), 'USER': env('POSTGRES_USER', default='courtly'), 'PASSWORD': env('POSTGRES_PASSWORD', default='courtly'), 'HOST': env('POSTGRES_HOST', default='db'), 'PORT': env('POSTGRES_PORT', default='5432')}}
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True
REST_FRAMEWORK = {'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'], 'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'], 'DEFAULT_THROTTLE_CLASSES': ['api.throttling.LiveScopedRateThrottle'], 'DEFAULT_THROTTLE_RATES': {'auth': '20/min', 'profile': '60/min', 'booking_write': '20/min', 'booking_mutate': '30/min', 'booking_staff': '25/min', 'payment_mutate': '30/min', 'payment_webhook': '120/min', 'event_mutate': '40/min'}, 'EXCEPTION_HANDLER': 'api.exceptions.api_exception_handler'}
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
CORS_ALLOW_HEADERS = (*default_headers, 'idempotency-key', 'x-request-id')
PASSWORD_RESET_TOKEN_TTL_MINUTES = env.int('PASSWORD_RESET_TOKEN_TTL_MINUTES', default=30)
PAYMENT_WEBHOOK_SECRET = env('PAYMENT_WEBHOOK_SECRET', default='')
SENTRY_DSN = env('SENTRY_DSN', default='')
SENTRY_ENVIRONMENT = env('SENTRY_ENVIRONMENT', default='development')
SENTRY_RELEASE = env('SENTRY_RELEASE', default='local')
SENTRY_TRACES_SAMPLE_RATE = env.float('SENTRY_TRACES_SAMPLE_RATE', default=0.0)
SENTRY_PROFILES_SAMPLE_RATE = env.float('SENTRY_PROFILES_SAMPLE_RATE', default=0.0)
SERVICE_NAME = env('SERVICE_NAME', default='courtly-api')

def _sentry_before_send(event, hint):
    request = event.get('request') or {}
    headers = request.get('headers') or {}
    for key in ('authorization', 'cookie', 'x-api-key', 'x-courtly-signature'):
        if key in headers:
            headers[key] = '[filtered]'
    request['headers'] = headers
    request['data'] = '[filtered]'
    if request.get('query_string'):
        request['query_string'] = '[filtered]'
    event['request'] = request
    user = event.get('user') or {}
    if 'email' in user:
        user['email'] = '[filtered]'
    if 'username' in user:
        user['username'] = '[filtered]'
    if 'ip_address' in user:
        user['ip_address'] = '[filtered]'
    event['user'] = user
    event.setdefault('tags', {})
    event['tags']['service'] = SERVICE_NAME
    return event
if SENTRY_DSN and sentry_sdk is not None and (DjangoIntegration is not None):
    sentry_sdk.init(dsn=SENTRY_DSN, integrations=[DjangoIntegration()], environment=SENTRY_ENVIRONMENT, release=SENTRY_RELEASE, send_default_pii=False, before_send=_sentry_before_send, traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE, profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE, server_name=SERVICE_NAME)
LOGGING = {'version': 1, 'disable_existing_loggers': False, 'formatters': {'structured_json': {'()': 'api.logging_formatters.StructuredJsonFormatter'}}, 'filters': {'request_context': {'()': 'api.logging_formatters.RequestContextFilter'}}, 'handlers': {'console_structured': {'class': 'logging.StreamHandler', 'formatter': 'structured_json', 'filters': ['request_context']}}, 'loggers': {'api.request': {'handlers': ['console_structured'], 'level': 'INFO', 'propagate': False}, 'api.health': {'handlers': ['console_structured'], 'level': 'WARNING', 'propagate': False}}}
