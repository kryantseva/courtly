import { DIRECTOR_SELF_MOCK } from "../../data/directorDashboardMock";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
export default function DirectorProfilePage() {
  const { fullName, email, phone, title } = DIRECTOR_SELF_MOCK;
  const { subscriptionActive, subscriptionPlan, networkName } = useManagerNetwork();
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Профиль руководителя</h1>
      <p className="clientPageLead">
        Учётная запись владельца сети «{networkName}». В продукте роль менеджера выдаётся только при активной подписке
        Courtly Manager — сейчас: {subscriptionActive ? `${subscriptionPlan} (демо)` : "подписка не симулируется"}.
      </p>
      <section className="clientPanel">
        <h2>Контакты</h2>
        <form className="profileForm" onSubmit={(e) => e.preventDefault()}>
          <label className="authField">
            <span>Имя</span>
            <input type="text" value={fullName} readOnly />
          </label>
          <label className="authField">
            <span>Должность</span>
            <input type="text" value={title} readOnly />
          </label>
          <label className="authField">
            <span>Email</span>
            <input type="email" value={email} readOnly />
          </label>
          <label className="authField">
            <span>Телефон</span>
            <input type="tel" value={phone} readOnly />
          </label>
          <p className="clientPanelHint">Смена пароля и 2FA — после внедрения единого входа.</p>
          <button type="button" className="btn btnSecondary" disabled>
            Сохранить
          </button>
        </form>
      </section>
    </div>
  );
}
