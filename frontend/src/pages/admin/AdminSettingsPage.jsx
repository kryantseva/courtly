import { useEffect, useState } from "react";
import AdminShiftNudgeDialog, { ADMIN_SHIFT_NUDGE_SESSION_KEY } from "../../components/admin/AdminShiftNudgeDialog";
import { ADMIN_SELF_MOCK } from "../../data/adminDashboardMock";
import { useAdminOnShift } from "../../hooks/useAdminOnShift";
import { clearAdminOnShift, setAdminOnShift } from "../../utils/adminOnShiftStorage";
export default function AdminSettingsPage() {
  const { id, fullName, email, phone, branchRole } = ADMIN_SELF_MOCK;
  const onShift = useAdminOnShift();
  const iAmOnShift = Boolean(onShift && onShift.id === id);
  const [showShiftNudge, setShowShiftNudge] = useState(false);
  useEffect(() => {
    if (iAmOnShift) {
      setShowShiftNudge(false);
      return;
    }
    if (sessionStorage.getItem(ADMIN_SHIFT_NUDGE_SESSION_KEY) === "1") {
      setShowShiftNudge(false);
      return;
    }
    setShowShiftNudge(true);
  }, [iAmOnShift]);
  return (
    <div className="clientPage">
      <AdminShiftNudgeDialog
        open={showShiftNudge}
        onClose={() => setShowShiftNudge(false)}
        onConfirmShift={() => setShowShiftNudge(false)}
      />
      <h1 className="clientPageTitle">Настройки</h1>
      <p className="clientPageLead">Параметры филиала и ваш аккаунт администратора — расширим, когда появится бэкенд.</p>
      <section className="clientPanel">
        <h2>Смена</h2>
        <p className="clientPanelHint">
          Отметка смены видна <strong>в шапке</strong> рядом с уведомлениями и помощью: там же можно завершить смену.
          Клиенты в чате видят только ваше имя как дежурного администратора; общий чат филиала им недоступен.
        </p>
        <div className="staffQuickActions">
          {iAmOnShift ? (
            <button type="button" className="btn btnSecondary" onClick={() => clearAdminOnShift()}>
              Завершить смену
            </button>
          ) : (
            <button type="button" className="btn btnPrimary" onClick={() => setAdminOnShift({ id, fullName })}>
              Выйти на смену
            </button>
          )}
        </div>
      </section>
      <section className="clientPanel">
        <h2>Аккаунт</h2>
        <form className="profileForm" onSubmit={(e) => e.preventDefault()}>
          <label className="authField">
            <span>Имя</span>
            <input type="text" value={fullName} readOnly />
          </label>
          <label className="authField">
            <span>Роль</span>
            <input type="text" value={branchRole} readOnly />
          </label>
          <label className="authField">
            <span>Email</span>
            <input type="email" value={email} readOnly />
          </label>
          <label className="authField">
            <span>Телефон</span>
            <input type="tel" value={phone} readOnly />
          </label>
          <button type="button" className="btn btnSecondary" disabled>
            Сохранить
          </button>
        </form>
      </section>
      <section className="clientPanel">
        <h2>Филиал</h2>
        <p className="clientPanelHint">Часы работы, тарифы, коды подключения клиентов и правила отмены — отдельные формы в следующих итерациях.</p>
        <button type="button" className="btn btnSecondary" disabled>
          Редактировать профиль центра
        </button>
      </section>
    </div>
  );
}
