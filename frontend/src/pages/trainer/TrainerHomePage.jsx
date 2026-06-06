import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROLE_NOTIFICATIONS_INITIAL } from "../../data/roleNotificationsMock";
import { fetchMyTrainerBookings } from "../../api/trainerCabinet";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
import { sessionOutcomeLabel } from "../../utils/trainerSessionOutcome";
const notifyPreview = ROLE_NOTIFICATIONS_INITIAL.trainer.slice(0, 3);
function isoToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
export default function TrainerHomePage() {
  const branchId = getActiveBranch()?.branchId || "";
  const [todayRows, setTodayRows] = useState( ([]));
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState("");
  useEffect(() => {
    const day = isoToday();
    let cancelled = false;
    setLoad(true);
    setErr("");
    fetchMyTrainerBookings({
      from: day,
      to: day,
      branch_id: branchId || undefined,
      limit: 30,
      offset: 0,
    })
      .then((b) => {
        if (cancelled) return;
        const list = Array.isArray(b.data) ? b.data : [];
        setTodayRows(list.sort((a, b) => String(a.time ?? "").localeCompare(String(b.time ?? ""))));
      })
      .catch((e) => {
        if (!cancelled) {
          setTodayRows([]);
          setErr(e instanceof ApiError ? e.message : "Не удалось загрузить занятия");
        }
      })
      .finally(() => {
        if (!cancelled) setLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);
  const dayLabel = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Сегодня</h1>
      <p className="clientPageLead">
        Ближайшие занятия с сервера (только где вы назначены тренером). Филиал — из выбора в шапке.
      </p>
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <h2>Ближайшие занятия</h2>
        <p className="clientPanelHint">{dayLabel} — ваши слоты.</p>
        {load ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : todayRows.length === 0 ? (
          <p className="clientEmpty">На сегодня назначенных занятий нет.</p>
        ) : (
          <ul className="clientList">
            {todayRows.map((item) => (
              <li key={String(item.id)} className="clientListItem">
                <div>
                  <span className="clientListTitle">
                    {String(item.time ?? "")} · {String(item.client ?? "")}
                  </span>
                  <span className="clientListMeta">
                    {String(item.hall ?? "")} · {sessionOutcomeLabel(String(item.sessionOutcome ?? ""))}
                  </span>
                  <Link to={`/trainer/sessions/${encodeURIComponent(String(item.id))}`} className="clientPanelLink">
                    Открыть занятие
                  </Link>
                </div>
                <span className="clientBadge">{String(item.status ?? "—")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="clientPanel">
        <div className="trainerDashRow">
          <h2>Уведомления</h2>
          <Link to="/trainer/notifications" className="clientPanelLink">
            Все уведомления
          </Link>
        </div>
        <ul className="clientList">
          {notifyPreview.map((n) => (
            <li key={n.id} className="clientListItem">
              <div>
                <span className="clientListTitle">{n.title}</span>
                <span className="clientListMeta">
                  {n.time} · {n.text}
                </span>
              </div>
              {!n.read ? <span className="clientBadge">Новое</span> : null}
            </li>
          ))}
        </ul>
        <p className="clientPanelHint">Полный список и отметка «прочитано» — в колокольчике в шапке.</p>
      </section>
      <section className="clientPanel">
        <h2>Расписание на день (кратко)</h2>
        {todayRows.length === 0 && !load ? (
          <p className="clientEmpty">Нет интервалов.</p>
        ) : (
          <div className="trainerDayTimeline">
            {todayRows.map((s) => (
              <div key={String(s.id)} className="trainerDayTimelineRow">
                <span className="trainerDayTimelineTime">{String(s.time ?? "").split(" ")[0] || "—"}</span>
                <div className="trainerDayTimelineBlock">
                  <span className="trainerDayTimelineTitle">{String(s.client ?? "")}</span>
                  <span className="trainerDayTimelineMeta">{String(s.hall ?? "")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link to="/trainer/schedule" className="clientPanelLink">
          Полный календарь недели
        </Link>
      </section>
      <section className="staffQuickActions">
        <Link to="/trainer/availability" className="btn btnSecondary">
          Моя доступность
        </Link>
        <Link to="/trainer/sessions" className="btn btnSecondary">
          Все записи
        </Link>
      </section>
    </div>
  );
}
