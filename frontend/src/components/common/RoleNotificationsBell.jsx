import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyNotifications, markNotificationRead } from "../../api/notifications";
import { ROLE_NOTIFICATIONS_INITIAL } from "../../data/roleNotificationsMock";
import {
  getTaskNotificationsForRole,
  markTaskNotificationRead,
  subscribeTaskCenter,
} from "../../data/taskCenterStore";
function BellIcon() {
  return (
    <svg className="clientNotifyIcon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a5 5 0 00-5 5v2.5c0 .6-.2 1.2-.5 1.7L5.5 14h13l-1-1.8c-.3-.5-.5-1.1-.5-1.7V8a5 5 0 00-5-5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function formatNotifyTime(iso) {
  if (!iso || typeof iso !== "string") return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
export default function RoleNotificationsBell({ role, listPath, enableApiNotifications = false }) {
  const initial = useMemo(() => {
    const raw = ROLE_NOTIFICATIONS_INITIAL[role] ?? ROLE_NOTIFICATIONS_INITIAL.client;
    return raw.map((n) => ({ ...n }));
  }, [role]);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => initial);
  const [taskItems, setTaskItems] = useState(() => getTaskNotificationsForRole(role));
  const [apiItems, setApiItems] = useState( ([]));
  const wrapRef = useRef(null);
  useEffect(() => {
    setItems(initial.map((n) => ({ ...n })));
  }, [initial]);
  useEffect(() => {
    setTaskItems(getTaskNotificationsForRole(role));
    return subscribeTaskCenter(() => setTaskItems(getTaskNotificationsForRole(role)));
  }, [role]);
  const loadApiNotifications = useCallback(() => {
    if (!enableApiNotifications || role !== "client") return;
    fetchMyNotifications()
      .then((data) => {
        if (!Array.isArray(data.notifications)) return;
        setApiItems(
          data.notifications.map((n) => ({
            ...n,
            time: formatNotifyTime(n.time),
          })),
        );
      })
      .catch(() => {});
  }, [enableApiNotifications, role]);
  useEffect(() => {
    loadApiNotifications();
  }, [loadApiNotifications]);
  const merged = useMemo(() => {
    if (enableApiNotifications && role === "client") {
      return [...apiItems, ...taskItems];
    }
    return [...taskItems, ...items];
  }, [enableApiNotifications, role, apiItems, taskItems, items]);
  const unreadCount = merged.filter((n) => !n.read).length;
  function markRead(id) {
    if (String(id).startsWith("task-note-")) {
      markTaskNotificationRead(role, id);
      return;
    }
    if (enableApiNotifications && role === "client" && String(id).startsWith("nt")) {
      markNotificationRead(id)
        .then(() => {
          setApiItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        })
        .catch(() => {});
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className={`clientNotifyWrap${open ? " clientNotifyWrap--open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="clientNotifyBtn"
        aria-label={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : "Уведомления"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) loadApiNotifications();
        }}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="clientNotifyBadge" aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="clientNotifyPopover" role="region" aria-label="Список уведомлений">
          <div className="clientNotifyPopoverHead">
            Уведомления
            {unreadCount > 0 ? <span className="clientNotifyPopoverCount">{unreadCount} новых</span> : null}
          </div>
          <ul className="clientNotifyList">
            {merged.map((n) => (
              <li
                key={n.id}
                className={`clientNotifyItem${n.read ? " clientNotifyItem--read" : " clientNotifyItem--unread"}`}
              >
                <div className="clientNotifyItemBody">
                  <span className="clientNotifyItemTitle">{n.title}</span>
                  <p className="clientNotifyItemText">{n.text}</p>
                  {n.linkTo ? (
                    <Link
                      to={n.linkTo}
                      className="clientNotifyItemLink"
                      onClick={() => setOpen(false)}
                    >
                      Открыть
                    </Link>
                  ) : null}
                  <span className="clientNotifyItemTime">{n.time}</span>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    className="clientNotifyMarkRead"
                    aria-label={`Отметить прочитанным: ${n.title}`}
                    title="Прочитано"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }}
                  >
                    <EyeIcon />
                  </button>
                ) : (
                  <span className="clientNotifyMarkRead clientNotifyMarkRead--done" aria-hidden title="Прочитано">
                    <EyeIcon />
                  </span>
                )}
              </li>
            ))}
          </ul>
          {listPath ? (
            <div className="clientNotifyPopoverFoot">
              <Link to={listPath} className="clientNotifyAllLink" onClick={() => setOpen(false)}>
                Все уведомления
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
