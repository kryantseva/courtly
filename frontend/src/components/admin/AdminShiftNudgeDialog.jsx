import { ADMIN_SELF_MOCK } from "../../data/adminDashboardMock";
import { setAdminOnShift } from "../../utils/adminOnShiftStorage";
export const ADMIN_SHIFT_NUDGE_SESSION_KEY = "courtly-admin-shift-nudge-session";
export default function AdminShiftNudgeDialog({ open, onClose, onConfirmShift }) {
  if (!open) return null;
  const { id, fullName } = ADMIN_SELF_MOCK;
  function handleLater() {
    sessionStorage.setItem(ADMIN_SHIFT_NUDGE_SESSION_KEY, "1");
    onClose();
  }
  function handleYes() {
    setAdminOnShift({ id, fullName });
    onConfirmShift();
  }
  return (
    <div className="adminModalOverlay" role="presentation">
      <div
        className="adminModalCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-shift-nudge-title"
      >
        <h2 id="admin-shift-nudge-title" className="adminModalTitle">
          Отметить, что вы выходите на смену?
        </h2>
        <p className="adminModalText">
          Тогда клиенты увидят в чате только ваше имя как дежурного администратора. Смену можно завершить в шапке или в
          настройках.
        </p>
        <div className="adminModalActions">
          <button type="button" className="btn btnPrimary" onClick={handleYes}>
            Да, на смену
          </button>
          <button type="button" className="btn btnSecondary" onClick={handleLater}>
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
