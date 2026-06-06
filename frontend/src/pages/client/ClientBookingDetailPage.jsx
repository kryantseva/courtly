import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { CLIENT_BOOKING_CANCEL_MIN_HOURS, CLIENT_HALLS } from "../../data/clientScheduleMock";
import { TRAINERS_PUBLIC } from "../../services/bookingData";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
import { cancelMyBooking, fetchBooking } from "../../api/bookings";
import { ApiError } from "../../api/http";
import {
  parseApiBookingStartFromPayload,
  segmentFromApiBooking,
  toneFromApiStatus,
} from "../../utils/apiBookingTime";
import { useApiResource } from "../../hooks/useApiResource";
import { useTransientMessage } from "../../hooks/useTransientMessage";
const STATUS_TONE_CLASS = {
  ok: "",
  warn: " clientHistoryBadge--warn",
  muted: " clientHistoryBadge--muted",
  cancel: " clientHistoryBadge--cancel",
};
export default function ClientBookingDetailPage() {
  const { bookingId } = useParams();
  const { openDrawerForReschedule, openDrawerWithFilters } = useBookingDrawer();
  const {
    data: apiBooking,
    loading: apiLoading,
    error: apiError,
    setError: setApiError,
    reload: reloadApiBooking,
  } = useApiResource(
    async () => {
      if (!bookingId) return null;
      return fetchBooking(bookingId);
    },
    [bookingId],
    {
      enabled: !!bookingId,
      initialData:  (null),
      mapError: (e) => (e instanceof ApiError ? e.message : "Не удалось загрузить запись"),
    },
  );
  const [cancelPending, setCancelPending] = useState(false);
  const { message: toast, setMessage: setToast } = useTransientMessage(2200);
  if (apiLoading) {
    return (
      <div className="clientPage">
        <p className="clientPageLead">Загрузка записи…</p>
      </div>
    );
  }
  if (apiError) {
    return (
      <div className="clientPage">
        <p className="clientPageLead">{apiError}</p>
        <Link to="/app/history" className="btn btnSecondary">
          К истории
        </Link>
      </div>
    );
  }
  if (!apiBooking || typeof apiBooking !== "object") {
    return (
      <div className="clientPage">
        <p className="clientPageLead">Запись не найдена.</p>
        <Link to="/app/history" className="btn btnSecondary">
          К истории
        </Link>
      </div>
    );
  }
    const time = String(apiBooking.time ?? "");
    const hall = String(apiBooking.hall ?? "");
    const status = String(apiBooking.status ?? "—");
    const trainerRaw = apiBooking.trainer != null && apiBooking.trainer !== "—" ? String(apiBooking.trainer) : "";
    const isGroup = Boolean(apiBooking.isGroup);
    const title = `${isGroup ? "Групповое" : "Запись"} · ${hall}`;
    const segment = segmentFromApiBooking(apiBooking);
    const startDt = parseApiBookingStartFromPayload(apiBooking);
    const hLeft = startDt ? (startDt.getTime() - Date.now()) / 3_600_000 : 0;
    const canCancelOrReschedule =
      segment === "upcoming" && !status.toLowerCase().includes("отмен") && hLeft >= CLIENT_BOOKING_CANCEL_MIN_HOURS;
    const cancelBlockedReason =
      segment !== "upcoming"
        ? "Завершённые записи нельзя отменить."
        : status.toLowerCase().includes("отмен")
          ? "Запись уже отменена."
          : hLeft < CLIENT_BOOKING_CANCEL_MIN_HOURS
            ? `Отмена и перенос закрыты позже чем за ${CLIENT_BOOKING_CANCEL_MIN_HOURS} ч до начала.`
            : null;
    const tone = toneFromApiStatus(status);
    const trainerMatch = trainerRaw ? TRAINERS_PUBLIC.find((t) => t.name === trainerRaw) : null;
    const hallEntry = CLIENT_HALLS.find((h) => h.name === hall);
    async function handleCancel() {
      if (!bookingId || !canCancelOrReschedule || cancelPending) return;
      setCancelPending(true);
      setApiError(null);
      try {
        await cancelMyBooking(bookingId);
        await reloadApiBooking();
        setToast("Запись отменена");
      } catch (e) {
        setApiError(e instanceof ApiError ? e.message : "Не удалось отменить запись");
      } finally {
        setCancelPending(false);
      }
    }
    function handleRepeat() {
      openDrawerWithFilters({
        trainerId: trainerMatch?.id ?? null,
        hallName: hall || null,
      });
    }
    function openRescheduleDrawer() {
      const startMinApi = Number(apiBooking.startMin ?? NaN);
      const endMinApi = Number(apiBooking.endMin ?? NaN);
      const duration =
        Number.isFinite(startMinApi) && Number.isFinite(endMinApi) && endMinApi > startMinApi
          ? endMinApi - startMinApi
          : 60;
      openDrawerForReschedule({
        bookingId,
        hallName: hall || null,
        durationMins: duration,
      });
    }
    return (
      <div className="clientPage">
        {toast ? <p className="clientProfileSaved">{toast}</p> : null}
        <nav className="clientBreadcrumb" aria-label="Навигация">
          <Link to="/app/history">История</Link>
          <span aria-hidden="true"> / </span>
          <span>Запись</span>
        </nav>
        <h1 className="clientPageTitle">{title}</h1>
        <p className="clientPageLead">{time}</p>
        <section className="clientPanel">
          <h2>Детали</h2>
          <ul className="clientDetailList">
            <li>
              <span className="clientDetailLabel">Площадка</span>
              {hallEntry ? (
                <Link to={`/app/halls/${hallEntry.id}`} className="clientDetailValueLink">
                  {hall}
                </Link>
              ) : (
                <span>{hall}</span>
              )}
            </li>
            {trainerMatch ? (
              <li>
                <span className="clientDetailLabel">Тренер</span>
                <Link to={`/app/trainers/${trainerMatch.id}`} className="clientDetailValueLink">
                  {trainerMatch.name}
                </Link>
              </li>
            ) : trainerRaw ? (
              <li>
                <span className="clientDetailLabel">Тренер</span>
                <span>{trainerRaw}</span>
              </li>
            ) : (
              <li>
                <span className="clientDetailLabel">Тренер</span>
                <span>Не указан</span>
              </li>
            )}
            <li>
              <span className="clientDetailLabel">Статус</span>
              <span className={`clientHistoryBadge${STATUS_TONE_CLASS[tone] || ""}`}>{status}</span>
            </li>
          </ul>
        </section>
        <section className="clientPanel">
          <h2>История изменений</h2>
          {Array.isArray(apiBooking.history) && apiBooking.history.length > 0 ? (
            <ul className="clientList">
              {[...apiBooking.history]
                .sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")))
                .map((h) => (
                <li key={String(h.id)} className="clientListItem">
                  <div>
                    <span className="clientListTitle">{String(h.title || h.action || "Изменение")}</span>
                    <span className="clientListMeta">
                      {new Date(String(h.at)).toLocaleString("ru-RU")}
                    </span>
                  </div>
                </li>
                ))}
            </ul>
          ) : (
            <p className="clientPanelHint">Пока нет записей об изменениях.</p>
          )}
        </section>
        <section className="clientPanel clientPanel--accent">
          <h2>Действия</h2>
          <p className="clientPanelHint">
            Данные с сервера. Пересечения слотов проверяются при создании брони; отмена и перенос занятого времени
            согласуйте с администратором филиала.
          </p>
          <div className="clientBookingActions">
            {segment === "upcoming" && !status.toLowerCase().includes("отмен") ? (
              <>
                <button
                  type="button"
                  className="btn btnSecondary"
                  disabled={!canCancelOrReschedule || cancelPending}
                  title={cancelBlockedReason ?? undefined}
                  onClick={() => void handleCancel()}
                >
                  {cancelPending ? "Отмена…" : "Отменить запись"}
                </button>
                <button
                  type="button"
                  className="btn btnSecondary"
                  disabled={!canCancelOrReschedule}
                  title={cancelBlockedReason ?? undefined}
                  onClick={openRescheduleDrawer}
                >
                  Перенести
                </button>
              </>
            ) : null}
            <button type="button" className="btn btnPrimary" onClick={handleRepeat}>
              Повторить запись
            </button>
          </div>
          {cancelBlockedReason && segment === "upcoming" && !status.toLowerCase().includes("отмен") ? (
            <p className="clientPanelHint clientBookingRuleHint">{cancelBlockedReason}</p>
          ) : null}
        </section>
      </div>
    );
}
