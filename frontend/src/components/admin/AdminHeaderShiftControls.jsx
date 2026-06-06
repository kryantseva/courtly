import { ADMIN_SELF_MOCK } from "../../data/adminDashboardMock";
import { useAdminOnShift } from "../../hooks/useAdminOnShift";
import { adminFirstNameFromFull, clearAdminOnShift, setAdminOnShift } from "../../utils/adminOnShiftStorage";
export default function AdminHeaderShiftControls() {
  const { id, fullName } = ADMIN_SELF_MOCK;
  const onShift = useAdminOnShift();
  const iAmOnShift = Boolean(onShift && onShift.id === id);
  const shortName = adminFirstNameFromFull(fullName);
  return (
    <div className="adminHeaderShiftControls" title="Клиенты видят в чате только имя дежурного администратора">
      {iAmOnShift ? (
        <button
          type="button"
          className="adminShiftHeaderBtn adminShiftHeaderBtn--on"
          aria-pressed="true"
          onClick={() => clearAdminOnShift()}
        >
          На смене ({shortName}) · завершить
        </button>
      ) : (
        <button
          type="button"
          className="adminShiftHeaderBtn"
          aria-pressed="false"
          onClick={() => setAdminOnShift({ id, fullName })}
        >
          Выйти на смену
        </button>
      )}
    </div>
  );
}
