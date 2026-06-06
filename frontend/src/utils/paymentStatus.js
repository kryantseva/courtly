const PAYMENT_STATUS_META = {
  "К оплате": { tone: "warn", detail: "Ожидает оплату по вашей брони." },
  Оплачено: { tone: "ok", detail: "Оплата подтверждена." },
  Ошибка: { tone: "cancel", detail: "Платеж не прошел, нужен повтор." },
  Возврат: { tone: "muted", detail: "Платеж возвращен." },
  Отменено: { tone: "muted", detail: "Платеж отменен." },
};
export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_META);
export function paymentStatusTone(status) {
  return PAYMENT_STATUS_META[status]?.tone || "muted";
}
export function paymentStatusDetail(status) {
  return PAYMENT_STATUS_META[status]?.detail || "Статус платежа обновляется.";
}
export function isPendingPaymentStatus(status) {
  return status === "К оплате";
}
