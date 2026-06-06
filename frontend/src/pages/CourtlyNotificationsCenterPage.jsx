import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyNotifications } from "../api/notifications";
import { ROLE_NOTIFICATIONS_INITIAL } from "../data/roleNotificationsMock";
const USE_API = import.meta.env.VITE_USE_API === "true";
function formatNotifyTime(iso) {
  if (!iso || typeof iso !== "string") return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
export default function CourtlyNotificationsCenterPage({ role, backTo, backLabel = "Назад" }) {
  const [apiItems, setApiItems] = useState( ([]));
  useEffect(() => {
    if (!USE_API || role !== "client") return;
    fetchMyNotifications()
      .then((data) => {
        if (Array.isArray(data.notifications)) setApiItems(data.notifications);
      })
      .catch(() => {});
  }, [role]);
  const useServerList = USE_API && role === "client";
  const items = useServerList
    ? apiItems
    : ROLE_NOTIFICATIONS_INITIAL[role] ?? [];
  return (
    <div className="clientPage">
      <p className="clientPageLead">
        <Link to={backTo} className="clientPanelLink">
          ← {backLabel}
        </Link>
      </p>
      <h1 className="clientPageTitle">Уведомления</h1>
      <p className="clientPanelHint">
        {useServerList
          ? "Сообщения с сервера (в том числе при освобождении места на мероприятии)."
          : "Системные и событийные сообщения. Демо-данные до подключения API."}
      </p>
      {useServerList && items.length === 0 ? (
        <p className="clientPanelHint">Пока нет уведомлений.</p>
      ) : null}
      <ul className="clientList">
        {items.map((n) => (
          <li key={n.id} className="clientListItem">
            <div>
              <span className="clientListTitle">{n.title}</span>
              <span className="clientListMeta">
                {useServerList ? formatNotifyTime(n.time) : n.time}
              </span>
              <p className="clientPanelHint" style={{ margin: "6px 0 0" }}>
                {n.text}
              </p>
              {n.linkTo ? (
                <p style={{ margin: "8px 0 0" }}>
                  <Link to={n.linkTo} className="clientPanelLink">
                    Перейти к событию
                  </Link>
                </p>
              ) : null}
            </div>
            {!n.read ? <span className="clientBadge">Новое</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
