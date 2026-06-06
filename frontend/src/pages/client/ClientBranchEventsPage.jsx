import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBranchEvents } from "../../api/branchEvents";
import { ADMIN_EVENT_KIND_LABELS } from "../../data/adminOperationsMock";
import { getActiveBranch } from "../../utils/activeBranch";
const USE_API = import.meta.env.VITE_USE_API === "true";
export default function ClientBranchEventsPage() {
  const branch = getActiveBranch();
  const branchId = branch?.branchId;
  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setMonth(to.getMonth() + 6);
    const y = (d) => d.toISOString().slice(0, 10);
    return { from: y(from), to: y(to) };
  }, []);
  const [events, setEvents] = useState( (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const load = useCallback(() => {
    if (!USE_API || !branchId) return;
    setLoading(true);
    setError(null);
    fetchBranchEvents(branchId, range)
      .then((data) => {
        setEvents(Array.isArray(data.events) ? data.events : []);
      })
      .catch((e) => {
        setEvents(null);
        setError(e instanceof Error ? e.message : "Не удалось загрузить события");
      })
      .finally(() => setLoading(false));
  }, [branchId, range.from, range.to]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="clientPage clientBranchEventsPage">
      <h1 className="clientPageTitle">События филиала</h1>
      <p className="clientPageLead">
        Турниры, открытые дни, лагеря и другие мероприятия. Расписание обновляется администрацией филиала.
      </p>
      {!USE_API ? (
        <p className="clientPanelHint" role="note">
          Включите режим API (<code className="authCode">VITE_USE_API</code>), чтобы видеть актуальный список событий вашего
          филиала.
        </p>
      ) : null}
      {USE_API && !branchId ? (
        <p className="clientPanelHint">
          <Link to="/branches" className="clientPanelLink">
            Выберите филиал
          </Link>
          , чтобы загрузить события.
        </p>
      ) : null}
      {error ? (
        <p className="authError" role="alert">
          {error}
        </p>
      ) : null}
      {USE_API && branchId && loading && events === null ? <p className="clientPanelHint">Загрузка…</p> : null}
      {USE_API && branchId && Array.isArray(events) && events.length === 0 && !loading ? (
        <p className="clientPanelHint">В ближайшие месяцы событий не запланировано.</p>
      ) : null}
      {USE_API && branchId && Array.isArray(events) && events.length > 0 ? (
        <ul className="clientList clientBranchEventsList">
          {events.map((ev) => {
            const kindLabel = ADMIN_EVENT_KIND_LABELS[ev.kind] ?? ev.kind;
            const rangeLabel =
              ev.startLabel && ev.endLabel && ev.startLabel !== ev.endLabel
                ? `${ev.startLabel} — ${ev.endLabel}`
                : ev.startLabel || ev.endLabel || "";
            return (
              <li key={ev.id} className="clientListItem clientBranchEventsItem">
                <div>
                  <Link to={`/app/events/${ev.id}`} className="clientListTitle clientListTitle--link">
                    {ev.title}
                  </Link>
                  <span className="clientBranchEventsKind">{kindLabel}</span>
                  <span className="clientListMeta">
                    {rangeLabel}
                    {ev.roomLabel ? ` · ${ev.roomLabel}` : ""}
                    {ev.venue ? ` · ${ev.venue}` : ""}
                    {ev.journalBlockRangeLabel ? ` · ${ev.journalBlockRangeLabel}` : ""}
                  </span>
                </div>
                <div className="clientBranchEventsBadges">
                  {ev.viewerIsRegistered ? (
                    <span className="clientBadge clientBadge--registered">Записаны</span>
                  ) : null}
                  {!ev.viewerIsRegistered && ev.viewerIsOnWaitlist ? (
                    <span className="clientBadge clientBadge--waitlist">Лист ожидания</span>
                  ) : null}
                  {ev.status ? <span className="clientBadge">{ev.status}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <section className="clientPanel clientPanel--accent">
        <h2>Хотите поиграть?</h2>
        <p className="clientPanelHint">Запишитесь на корт в удобное время — отдельно от мероприятий.</p>
        <div className="clientBookingActions clientBookingActions--tight">
          <Link to="/app/booking" className="btn btnPrimary">
            Запись на корт
          </Link>
        </div>
      </section>
    </div>
  );
}
