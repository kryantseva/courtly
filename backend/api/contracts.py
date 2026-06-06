from __future__ import annotations
from rest_framework.response import Response

def ok(*, data=None, meta=None, legacy: dict | None=None, status: int=200) -> Response:
    payload: dict = {'data': data}
    if meta is not None:
        payload['meta'] = meta
    if legacy:
        payload.update(legacy)
    return Response(payload, status=status)

def created(*, data=None, meta=None, legacy: dict | None=None) -> Response:
    return ok(data=data, meta=meta, legacy=legacy, status=201)
