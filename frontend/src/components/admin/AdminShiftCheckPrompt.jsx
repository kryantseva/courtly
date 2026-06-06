import { useEffect, useMemo, useState } from "react";
import { ADMIN_SELF_MOCK } from "../../data/adminDashboardMock";
import { useAdminOnShift } from "../../hooks/useAdminOnShift";
import { clearAdminOnShift, setAdminOnShift } from "../../utils/adminOnShiftStorage";
const KEY_PREFIX = "courtly.shiftPrompt.answer.";
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}
export default function AdminShiftCheckPrompt() {
  const day = useMemo(() => todayKey(), []);
  const storageKey = `${KEY_PREFIX}${day}`;
  const { id, fullName } = ADMIN_SELF_MOCK;
  const onShift = useAdminOnShift();
  const iAmOnShift = Boolean(onShift && onShift.id === id);
  const [answerState, setAnswerState] = useState("");
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const answer = localStorage.getItem(storageKey);
    if (iAmOnShift) {
      setAnswerState("yes");
      setDismissed(false);
      return;
    }
    setAnswerState(answer === "yes" || answer === "no" ? answer : "");
    setDismissed(false);
  }, [storageKey, iAmOnShift]);
  function answer(v) {
    localStorage.setItem(storageKey, v);
    if (v === "yes") {
      setAdminOnShift({ id, fullName });
    } else {
      clearAdminOnShift();
      setDismissed(true);
    }
    setAnswerState(v);
  }
  if (iAmOnShift || dismissed) return null;
  return (
    <div className="adminShiftPrompt" role="dialog" aria-label="Подтверждение выхода в смену">
      <button
        type="button"
        className="adminShiftPromptClose"
        onClick={() => setDismissed(true)}
        aria-label="Скрыть уведомление до следующего входа"
        title="Скрыть до обновления/нового входа"
      >
        ×
      </button>
      <strong>Вы выходите в смену?</strong>
      <div className="adminShiftPromptActions">
        <button
          type="button"
          className={`btn btnPrimary${answerState === "yes" ? " adminShiftPromptBtn--active" : ""}`}
          onClick={() => answer("yes")}
        >
          Да
        </button>
        <button
          type="button"
          className={`btn btnSecondary${answerState === "no" ? " adminShiftPromptBtn--active" : ""}`}
          onClick={() => answer("no")}
        >
          Нет
        </button>
      </div>
    </div>
  );
}
