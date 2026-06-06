from __future__ import annotations
import contextvars
request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar('request_id', default=None)

def set_request_id(value: str | None) -> contextvars.Token[str | None]:
    return request_id_ctx.set(value)

def reset_request_id(token: contextvars.Token[str | None]) -> None:
    request_id_ctx.reset(token)

def get_request_id() -> str | None:
    return request_id_ctx.get()
