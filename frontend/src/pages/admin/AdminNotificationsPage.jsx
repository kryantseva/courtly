import { Link } from "react-router-dom";
import { ROLE_NOTIFICATIONS_INITIAL } from "../../data/roleNotificationsMock";
export default function AdminNotificationsPage() {
  const items = ROLE_NOTIFICATIONS_INITIAL.admin;
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Центр уведомлений</h1>
      <p className="clientPageLead">
        Системные уведомления филиала. Отправка по шаблонам и по событиям — с политиками на бэкенде. Ниже — демо-лента.
      </p>
      <section className="clientPanel">
        <h2>Лента</h2>
        <ul className="clientList">
          {items.map((n) => (
            <li key={n.id} className="clientListItem">
              <div>
                <span className="clientListTitle">{n.title}</span>
                <span className="clientListMeta">{n.time}</span>
                <p className="clientPanelHint" style={{ margin: "6px 0 0" }}>
                  {n.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="clientPanel clientPanel--accent">
        <h2>Шаблоны и рассылки</h2>
        <p className="clientPanelHint">Выбор шаблона, канал (push / email / SMS) и аудитория — в следующей итерации.</p>
        <button type="button" className="btn btnSecondary" disabled>
          Создать рассылку (демо)
        </button>
      </section>
      <p>
        <Link to="/admin/overview" className="clientPanelLink">
          ← Обзор
        </Link>
      </p>
    </div>
  );
}
