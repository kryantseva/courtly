from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from .logging_context import get_request_id

class RequestContextFilter(logging.Filter):

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, 'request_id'):
            rid = get_request_id()
            if rid:
                record.request_id = rid
        return True

class StructuredJsonFormatter(logging.Formatter):

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {'@timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'), 'level': record.levelname, 'logger': record.name, 'message': record.getMessage()}
        rid = getattr(record, 'request_id', None) or get_request_id()
        if rid:
            payload['request_id'] = rid
        for key in ('service', 'event', 'http_method', 'path', 'status', 'latency_ms', 'user_id'):
            if hasattr(record, key):
                val = getattr(record, key)
                if val is not None:
                    payload[key] = val
        if record.exc_info:
            try:
                payload['exception'] = self.formatException(record.exc_info).strip()[:8000]
            except Exception:
                payload['exception'] = 'exc_format_error'
        return json.dumps(payload, ensure_ascii=False)
