import { Link } from "react-router-dom";
import { ADMIN_STAFF_MOCK } from "../../data/adminDashboardMock";
export default function AdminStaffPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Команда</h1>
      <p className="clientPageLead">
        Тренеры и администраторы филиала. Права доступа и приглашения появятся после подключения учётных записей.
      </p>
      <section className="clientPanel clientPanel--schedule">
        <h2>Сотрудники (демо)</h2>
        <ul className="clientList">
          {ADMIN_STAFF_MOCK.map((person) => (
            <li key={person.id} className="clientListItem">
              <div>
                <span className="clientListTitle">{person.name}</span>
                <span className="clientListMeta">
                  {person.role} · {person.contact}
                </span>
                <Link to={`/admin/users/${person.id}`} className="clientPanelLink">
                  Карточка сотрудника
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btnPrimary clientHistoryCta" disabled>
          Пригласить сотрудника
        </button>
      </section>
    </div>
  );
}
