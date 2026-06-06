import { Link, useParams } from "react-router-dom";
import { DIRECTOR_ROLE_HISTORY_MOCK, DIRECTOR_STAFF_LIST_MOCK } from "../../data/directorPersonnelMock";
export default function DirectorStaffUserPage() {
  const { userId } = useParams();
  const person = DIRECTOR_STAFF_LIST_MOCK.find((p) => p.id === userId);
  const history = (userId && DIRECTOR_ROLE_HISTORY_MOCK[userId]) || [];
  if (!person) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Сотрудник не найден</h1>
        <Link to="/director/personnel" className="btn btnPrimary">
          К персоналу
        </Link>
      </div>
    );
  }
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">{person.name}</h1>
      <p className="clientPageLead">
        Карточка пользователя: контекст бизнес-задач. Персональные данные — минимально необходимые; полный профиль ведёт
        администратор.
      </p>
      <section className="clientPanel">
        <h2>Информация</h2>
        <ul className="clientList">
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Текущая роль</span>
              <span className="clientListMeta">{person.role}</span>
            </div>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Филиал</span>
              <span className="clientListMeta">{person.branchLabel}</span>
            </div>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Активность</span>
              <span className="clientListMeta">{person.activity}, {person.lastActive}</span>
            </div>
          </li>
        </ul>
        <div className="staffQuickActions">
          <button type="button" className="btn btnSecondary" disabled>
            Повысить / понизить роль
          </button>
        </div>
      </section>
      <section className="clientPanel clientPanel--schedule">
        <h2>История изменений ролей</h2>
        {history.length === 0 ? (
          <p className="clientPanelHint">Записей пока нет (демо).</p>
        ) : (
          <ul className="clientList">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="clientListItem">
                <div>
                  <span className="clientListTitle">
                    {h.from} → {h.to}
                  </span>
                  <span className="clientListMeta">
                    {h.at} · инициатор: {h.by}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link to="/director/personnel" className="btn btnSecondary">
        Назад к списку
      </Link>
    </div>
  );
}
