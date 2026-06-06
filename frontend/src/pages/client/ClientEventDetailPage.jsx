import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  cancelEventRegistration,
  fetchEventDetail,
  joinEventWaitlist,
  leaveEventWaitlist,
  registerForEvent,
} from "../../api/branchEvents";
import { ADMIN_EVENT_KIND_LABELS } from "../../data/adminOperationsMock";
import { getActiveBranch } from "../../utils/activeBranch";
const USE_API = import.meta.env.VITE_USE_API === "true";
function localTodayNotBeforeEventStart(startDateIso) {
  if (startDateIso == null || typeof startDateIso !== "string") return false;
  const start = startDateIso.slice(0, 10);
  const t = new Date();
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return today >= start;
}
export default function ClientEventDetailPage() {
  const { eventId } = useParams();
  const branch = getActiveBranch();
  const activeBranchId = branch?.branchId;
  const [ev, setEv] = useState( (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState("");
  const loadEvent = useCallback(() => {
    if (!USE_API || !eventId) return Promise.resolve();
    setLoading(true);
    setError(null);
    return fetchEventDetail(eventId)
      .then((data) => {
        setEv(data);
      })
      .catch((e) => {
        setEv(null);
        setError(e instanceof Error ? e.message : "Не удалось загрузить событие");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);
  useEffect(() => {
    if (!USE_API || !eventId) {
      setEv(null);
      setError(null);
      setLoading(false);
      return;
    }
    loadEvent();
  }, [USE_API, eventId, loadEvent]);
  async function onRegister() {
    if (!eventId) return;
    setRegError("");
    setRegBusy(true);
    try {
      const data = await registerForEvent(eventId);
      setEv(data);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Не удалось записаться");
    } finally {
      setRegBusy(false);
    }
  }
  async function onCancelRegistration() {
    if (!eventId) return;
    setRegError("");
    setRegBusy(true);
    try {
      const data = await cancelEventRegistration(eventId);
      setEv(data);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Не удалось отменить запись");
    } finally {
      setRegBusy(false);
    }
  }
  async function onJoinWaitlist() {
    if (!eventId) return;
    setRegError("");
    setRegBusy(true);
    try {
      const data = await joinEventWaitlist(eventId);
      setEv(data);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Не удалось встать в лист ожидания");
    } finally {
      setRegBusy(false);
    }
  }
  async function onLeaveWaitlist() {
    if (!eventId) return;
    setRegError("");
    setRegBusy(true);
    try {
      const data = await leaveEventWaitlist(eventId);
      setEv(data);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Не удалось выйти из листа ожидания");
    } finally {
      setRegBusy(false);
    }
  }
  const otherBranch =
    USE_API && ev && activeBranchId && ev.branchId && String(ev.branchId) !== String(activeBranchId);
  const statusLabel = ev?.status ? String(ev.status).trim() : "";
  const registrationClosed =
    statusLabel === "Отменено" || statusLabel === "Завершено";
  const registrationOpen = statusLabel === "Регистрация открыта";
  const registrationFull =
    typeof ev?.maxParticipants === "number" &&
    typeof ev?.registered === "number" &&
    ev.registered >= ev.maxParticipants;
  const eventAlreadyStarted = ev ? localTodayNotBeforeEventStart(ev.start_date) : false;
  if (!USE_API) {
    return (
      <div className="clientPage clientEventDetailPage">
        <nav className="branchJournalBreadcrumb">
          <Link to="/app/events" className="clientPanelLink">
            События
          </Link>
        </nav>
        <p className="clientPanelHint">Включите API, чтобы открывать карточку события.</p>
      </div>
    );
  }
  return (
    <div className="clientPage clientEventDetailPage">
      <nav className="branchJournalBreadcrumb">
        <Link to="/app/events" className="clientPanelLink">
          События
        </Link>
        <span className="branchJournalCrumbSep" aria-hidden>
          /
        </span>
        <span className="branchJournalCrumbMuted">Карточка</span>
      </nav>
      {loading && !ev ? <p className="clientPanelHint">Загрузка…</p> : null}
      {error ? (
        <p className="authError" role="alert">
          {error}
        </p>
      ) : null}
      {otherBranch ? (
        <p className="clientPanelHint" role="note">
          Это событие другого филиала. В шапке выбран <strong>{branch?.branchName}</strong> — при необходимости смените
          филиал.
        </p>
      ) : null}
      {ev ? (
        <>
          <h1 className="clientPageTitle">{ev.title}</h1>
          <p className="clientPageLead">
            <span className="clientBranchEventsKind clientBranchEventsKind--inline">
              {ADMIN_EVENT_KIND_LABELS[ev.kind] ?? ev.kind}
            </span>
            {ev.status ? (
              <>
                {" "}
                · <span className="clientEventDetailStatus">{ev.status}</span>
              </>
            ) : null}
          </p>
          <section className="clientPanel">
            <h2 className="clientEventDetailSectionTitle">Когда и где</h2>
            <ul className="clientEventDetailFacts">
              <li>
                <span className="clientEventDetailFactLabel">Даты</span>
                <span className="clientEventDetailFactValue">
                  {ev.startLabel}
                  {ev.endLabel && ev.endLabel !== ev.startLabel ? ` — ${ev.endLabel}` : ""}
                </span>
              </li>
              {ev.roomLabel ? (
                <li>
                  <span className="clientEventDetailFactLabel">Зал</span>
                  <span className="clientEventDetailFactValue">{ev.roomLabel}</span>
                </li>
              ) : null}
              {ev.venue ? (
                <li>
                  <span className="clientEventDetailFactLabel">Площадка</span>
                  <span className="clientEventDetailFactValue">{ev.venue}</span>
                </li>
              ) : null}
              {ev.journalBlockRangeLabel ? (
                <li>
                  <span className="clientEventDetailFactLabel">Время в журнале</span>
                  <span className="clientEventDetailFactValue">{ev.journalBlockRangeLabel}</span>
                </li>
              ) : null}
            </ul>
          </section>
          {ev.format ? (
            <section className="clientPanel">
              <h2 className="clientEventDetailSectionTitle">Формат</h2>
              <p className="clientPanelHint clientEventDetailProse">{ev.format}</p>
            </section>
          ) : null}
          <section className="clientPanel">
            <h2 className="clientEventDetailSectionTitle">Участие</h2>
            {typeof ev.maxParticipants === "number" ? (
              <p className="clientPanelHint">
                Записано: <strong>{ev.registered ?? 0}</strong> из <strong>{ev.maxParticipants}</strong>
              </p>
            ) : (
              <p className="clientPanelHint">
                Записано участников: <strong>{ev.registered ?? 0}</strong>
              </p>
            )}
            {regError ? (
              <p className="authError" role="alert">
                {regError}
              </p>
            ) : null}
            {ev.viewerIsRegistered ? (
              <>
                <p className="clientPanelHint">Вы записаны на это мероприятие.</p>
                {ev.viewerCanUnregister ? (
                  <button
                    type="button"
                    className="btn btnSecondary"
                    disabled={regBusy}
                    onClick={onCancelRegistration}
                  >
                    {regBusy ? "Отмена…" : "Отменить запись"}
                  </button>
                ) : (
                  <p className="clientPanelHint">
                    После начала мероприятия отменить запись в приложении нельзя. При необходимости свяжитесь с филиалом.
                  </p>
                )}
              </>
            ) : ev.viewerCanRegister ? (
              <button type="button" className="btn btnPrimary" disabled={regBusy} onClick={onRegister}>
                {regBusy ? "Запись…" : "Записаться на мероприятие"}
              </button>
            ) : ev.viewerIsOnWaitlist ? (
              <>
                {typeof ev.viewerWaitlistPosition === "number" && typeof ev.waitlistCount === "number" ? (
                  <p className="clientPanelHint">
                    Ваша позиция в очереди: <strong>{ev.viewerWaitlistPosition}</strong> из {ev.waitlistCount}.
                  </p>
                ) : null}
                <p className="clientPanelHint">
                  Вы в листе ожидания. Когда участник освободит место, вам придёт уведомление в колокольчик в шапке — успейте
                  записаться, пока место не заняли.
                </p>
                {ev.viewerCanLeaveWaitlist ? (
                  <button type="button" className="btn btnSecondary" disabled={regBusy} onClick={onLeaveWaitlist}>
                    {regBusy ? "Выход…" : "Выйти из листа ожидания"}
                  </button>
                ) : (
                  <p className="clientPanelHint">После начала мероприятия выход из листа в приложении недоступен.</p>
                )}
              </>
            ) : ev.viewerCanJoinWaitlist ? (
              <button type="button" className="btn btnSecondary" disabled={regBusy} onClick={onJoinWaitlist}>
                {regBusy ? "Отправка…" : "Встать в лист ожидания"}
              </button>
            ) : (
              <p className="clientPanelHint">
                {registrationClosed
                  ? "Регистрация на это мероприятие закрыта."
                  : eventAlreadyStarted
                    ? "Мероприятие уже началось — запись недоступна."
                    : registrationFull && !registrationOpen
                      ? "Свободных мест нет. Когда филиал откроет запись («Регистрация открыта»), здесь появится возможность встать в лист ожидания."
                      : registrationFull
                        ? "Свободных мест нет."
                        : !registrationOpen
                          ? "Онлайн-запись появится, когда филиал установит статус «Регистрация открыта»."
                          : "Запись сейчас недоступна."}
              </p>
            )}
          </section>
          {ev.notes ? (
            <section className="clientPanel">
              <h2 className="clientEventDetailSectionTitle">Дополнительно</h2>
              <p className="clientPanelHint clientEventDetailProse">{ev.notes}</p>
            </section>
          ) : null}
          <section className="clientPanel clientPanel--accent">
            <h2 className="clientEventDetailSectionTitle">Запись на корт</h2>
            <p className="clientPanelHint">Обычная аренда корта оформляется отдельно от мероприятий.</p>
            <Link to="/app/booking" className="btn btnPrimary">
              Перейти к записи
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
