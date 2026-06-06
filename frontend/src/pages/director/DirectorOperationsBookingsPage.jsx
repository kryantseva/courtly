import { Link } from "react-router-dom";
import { DIRECTOR_BOOKINGS_VIEW_MOCK } from "../../data/directorOperationsMock";
export default function DirectorOperationsBookingsPage() {
  return (
    <div className="clientPage">
      <section className="directorReadOnlyBanner" role="note">
        <strong>Только просмотр.</strong> Руководитель видит бронирования для контроля и аналитики; изменение записей и
        ручное бронирование — у администратора.
      </section>
      <h1 className="clientPageTitle">Бронирования</h1>
      <p className="clientPageLead">
        Срез активных записей (демо). В продукте список придёт из API с фильтрами по филиалу, залу и периоду.
      </p>
      <section className="clientPanel clientPanel--schedule">
        <div className="clientPanelHead">
          <h2>Сегодня</h2>
          <Link to="/director" className="btn btnSecondary">
            Журнал записи
          </Link>
        </div>
        <ul className="clientList">
          {DIRECTOR_BOOKINGS_VIEW_MOCK.map((b) => (
            <li key={b.id} className="clientListItem">
              <div>
                <span className="clientListTitle">
                  {b.time} · {b.hall}
                </span>
                <span className="clientListMeta">
                  Клиент: {b.client} · Тренер: {b.trainer}
                </span>
              </div>
              <span className="clientBadge">{b.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
