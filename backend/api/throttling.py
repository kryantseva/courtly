from __future__ import annotations
from django.core.exceptions import ImproperlyConfigured
from rest_framework.settings import api_settings
from rest_framework.throttling import ScopedRateThrottle

class LiveScopedRateThrottle(ScopedRateThrottle):

    def get_rate(self):
        scope = getattr(self, 'scope', None)
        if not scope:
            msg = f"You must set either `.scope` or `.rate` for '{self.__class__.__name__}' throttle"
            raise ImproperlyConfigured(msg)
        rates = api_settings.DEFAULT_THROTTLE_RATES
        try:
            return rates[scope]
        except KeyError as exc:
            msg = f"No default throttle rate set for '{scope}' scope"
            raise ImproperlyConfigured(msg) from exc
