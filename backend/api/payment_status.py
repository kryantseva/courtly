from __future__ import annotations

PAYMENT_STATUS_PENDING = "К оплате"
PAYMENT_STATUS_PAID = "Оплачено"
PAYMENT_STATUS_FAILED = "Ошибка"
PAYMENT_STATUS_REFUNDED = "Возврат"
PAYMENT_STATUS_CANCELLED = "Отменено"

PAYMENT_STATUS_CHOICES: list[str] = [
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_REFUNDED,
    PAYMENT_STATUS_CANCELLED,
]

_CANONICAL_SET = frozenset(PAYMENT_STATUS_CHOICES)

_SLUG_TO_CANONICAL: dict[str, str] = {
    "pending": PAYMENT_STATUS_PENDING,
    "awaiting_payment": PAYMENT_STATUS_PENDING,
    "unpaid": PAYMENT_STATUS_PENDING,
    "paid": PAYMENT_STATUS_PAID,
    "succeeded": PAYMENT_STATUS_PAID,
    "success": PAYMENT_STATUS_PAID,
    "failed": PAYMENT_STATUS_FAILED,
    "error": PAYMENT_STATUS_FAILED,
    "refunded": PAYMENT_STATUS_REFUNDED,
    "cancelled": PAYMENT_STATUS_CANCELLED,
    "canceled": PAYMENT_STATUS_CANCELLED,
}

ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    PAYMENT_STATUS_PENDING: frozenset({
        PAYMENT_STATUS_PAID,
        PAYMENT_STATUS_FAILED,
        PAYMENT_STATUS_CANCELLED,
    }),
    PAYMENT_STATUS_PAID: frozenset({PAYMENT_STATUS_REFUNDED}),
    PAYMENT_STATUS_FAILED: frozenset({
        PAYMENT_STATUS_PENDING,
        PAYMENT_STATUS_CANCELLED,
    }),
    PAYMENT_STATUS_REFUNDED: frozenset(),
    PAYMENT_STATUS_CANCELLED: frozenset(),
}

PAYMENT_STATUS_TRANSITIONS = {k: set(v) for k, v in ALLOWED_TRANSITIONS.items()}


class PaymentStatusError(ValueError):
    pass


def normalize_payment_status(value: str | None) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    low = s.lower()
    if low in _SLUG_TO_CANONICAL:
        return _SLUG_TO_CANONICAL[low]
    if s in _CANONICAL_SET:
        return s
    for c in _CANONICAL_SET:
        if c.lower() == low:
            return c
    return None


def assert_known_status(status: str | None) -> str:
    n = normalize_payment_status(status)
    if n is None:
        raise PaymentStatusError("Неизвестный статус платежа.")
    return n


def assert_transition_allowed(current: str | None, new: str | None) -> tuple[str, str]:
    cur = normalize_payment_status(current)
    nxt = normalize_payment_status(new)
    if nxt is None:
        raise PaymentStatusError("Неизвестный целевой статус платежа.")
    if cur is None:
        raise PaymentStatusError("Текущий статус платежа не распознан.")
    if cur == nxt:
        return cur, nxt
    allowed = ALLOWED_TRANSITIONS.get(cur, frozenset())
    if nxt not in allowed:
        raise PaymentStatusError(transition_error_message(cur, nxt, allowed))
    return cur, nxt


def transition_error_message(current: str, new: str, allowed: frozenset[str] | set[str]) -> str:
    allowed_labels = ", ".join(sorted(allowed)) if allowed else "нет доступных переходов"
    return f"Недопустимый переход статуса: «{current}» → «{new}». Допустимо: {allowed_labels}."
