export const SESSION_OUTCOME_LABELS = {
  pending: "Запланировано",
  completed: "Проведено",
  no_show: "Неявка",
  rescheduled: "Перенос",
};
export function sessionOutcomeLabel(code) {
  return SESSION_OUTCOME_LABELS[code] || code || "—";
}
export const SESSION_OUTCOME_CODES = Object.keys(SESSION_OUTCOME_LABELS);
