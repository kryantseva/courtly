import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchAdminBookingDetail } from "../../api/adminBooking";
import { fetchBranchRooms } from "../../api/branchRooms";
import { patchBooking } from "../../api/bookings";
import { getActiveBranch } from "../../utils/activeBranch";
import {
  ADMIN_BOOKINGS_LIST_MOCK,
  getAdminBookingsForClient,
  getAdminPaymentsForBooking,
} from "../../data/adminOperationsMock";
import { getClientBaseRecord } from "../../data/clientBaseMock";
const USE_API = import.meta.env.VITE_USE_API === "true";
function minToTime(m) {
  if (m == null || typeof m !== "number") return "";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function timeToMin(s) {
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59 || h < 0) return null;
  return h * 60 + mm;
}
export default function AdminBookingDetailPage() {
  const { bookingId } = useParams();
  const mockBooking = ADMIN_BOOKINGS_LIST_MOCK.find((b) => b.id === bookingId);
  const [apiPayload, setApiPayload] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState( (null));
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [branchRooms, setBranchRooms] = useState( ([]));
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleRoomId, setRescheduleRoomId] = useState("");
  const [mutatePending, setMutatePending] = useState(false);
  const activeBranchId = getActiveBranch()?.branchId;
  useEffect(() => {
    if (!USE_API || !bookingId) {
      setApiPayload(null);
      setApiError(null);
      setApiLoading(false);
      return;
    }
    let cancelled = false;
    setApiLoading(true);
    setApiError(null);
    fetchAdminBookingDetail(bookingId)
      .then((data) => {
        if (!cancelled) setApiPayload(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setApiPayload(null);
          setApiError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);
  useEffect(() => {
    if (!apiPayload?.date || !USE_API) return;
    setRescheduleDate(apiPayload.date);
    setRescheduleStart(minToTime(apiPayload.startMin));
    setRescheduleEnd(minToTime(apiPayload.endMin));
    setRescheduleRoomId(apiPayload.roomId ?? "");
  }, [apiPayload?.date, apiPayload?.startMin, apiPayload?.endMin, apiPayload?.roomId]);
  useEffect(() => {
    if (!USE_API || !activeBranchId) {
      setBranchRooms([]);
      return;
    }
    let cancelled = false;
    fetchBranchRooms(activeBranchId)
      .then((data) => {
        if (!cancelled && Array.isArray(data.rooms)) setBranchRooms(data.rooms);
      })
      .catch(() => {
        if (!cancelled) setBranchRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);
  const booking = useMemo(() => {
    if (apiPayload) {
      return {
        id: apiPayload.id,
        time: apiPayload.time,
        hall: apiPayload.hall,
        client: apiPayload.client,
        clientId: apiPayload.clientId ?? undefined,
        trainer: apiPayload.trainer,
        trainerStaffId: apiPayload.trainerStaffId,
        status: apiPayload.status,
        kind: apiPayload.kind,
        isGroup: apiPayload.isGroup,
      };
    }
    return mockBooking;
  }, [apiPayload, mockBooking]);
  const clientBookings = useMemo(() => {
    if (!booking?.clientId) return [];
    if (apiPayload?.clientBookings) {
      return [
        { id: booking.id, time: booking.time, hall: booking.hall, status: booking.status },
        ...apiPayload.clientBookings,
      ];
    }
    return getAdminBookingsForClient(booking.clientId);
  }, [booking, apiPayload]);
  const clientRecord = booking?.clientId ? getClientBaseRecord(booking.clientId) : null;
  const chatFocusId = clientRecord?.adminMessengerConversationId ?? null;
  const bookingPayments = useMemo(() => {
    if (apiPayload?.payments?.length) return apiPayload.payments;
    if (booking) return getAdminPaymentsForBooking(booking.id);
    return [];
  }, [apiPayload, booking]);
  async function refreshBooking() {
    if (!bookingId) return;
    const fresh = await fetchAdminBookingDetail(bookingId);
    setApiPayload(fresh);
  }
  async function handleConfirmBooking() {
    if (!USE_API || !bookingId || !apiPayload) return;
    setConfirmError("");
    setConfirmPending(true);
    try {
      await patchBooking(bookingId, { status: "Подтверждено", confirmed: true });
      await refreshBooking();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Не удалось обновить бронь");
    } finally {
      setConfirmPending(false);
    }
  }
  async function handleCancelBooking() {
    if (!USE_API || !bookingId || !apiPayload) return;
    if (!window.confirm("Отменить эту бронь?")) return;
    setConfirmError("");
    setMutatePending(true);
    try {
      await patchBooking(bookingId, { status: "Отменено" });
      await refreshBooking();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Не удалось отменить");
    } finally {
      setMutatePending(false);
    }
  }
  async function handleRescheduleSubmit(e) {
    e.preventDefault();
    if (!USE_API || !bookingId || !apiPayload) return;
    const sm = timeToMin(rescheduleStart);
    const em = timeToMin(rescheduleEnd);
    if (!rescheduleDate || sm == null || em == null) {
      setConfirmError("Укажите дату и время начала/окончания (ЧЧ:ММ).");
      return;
    }
    setConfirmError("");
    setMutatePending(true);
    try {
      await patchBooking(bookingId, {
        date: rescheduleDate,
        start_min: sm,
        end_min: em,
        room_id: rescheduleRoomId || apiPayload.roomId,
      });
      await refreshBooking();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Не удалось перенести");
    } finally {
      setMutatePending(false);
    }
  }
  const auditHistory = Array.isArray(apiPayload?.history) ? apiPayload.history : [];
  if (USE_API && apiLoading) {
    return (
      <div className="clientPage">
        <p className="clientPanelHint">Загрузка брони…</p>
        <Link to="/admin/bookings" className="btn btnSecondary">
          К списку
        </Link>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Бронь не найдена</h1>
        {apiError ? <p className="authError">{apiError}</p> : null}
        <Link to="/admin/bookings" className="btn btnSecondary">
          К списку
        </Link>
      </div>
    );
  }
  return (
    <div className="clientPage">
      {apiError && !apiPayload ? (
        <p className="branchJournalApiError" role="alert">
          API недоступен, показаны демо-данные: {apiError}
        </p>
      ) : null}
      <p className="clientPageLead">
        <Link to="/admin/bookings" className="clientPanelLink">
          ← Все бронирования
        </Link>
      </p>
      <h1 className="clientPageTitle">
        {booking.time} · {booking.hall}
      </h1>
      <p className="clientPanelHint">
        Клиент: {booking.client}
        {booking.clientId ? (
          <>
            {" "}
            ·{" "}
            <Link to={`/admin/users/${booking.clientId}`} className="clientPanelLink">
              карточка клиента
            </Link>
          </>
        ) : null}{" "}
        · Тренер: {booking.trainer} · Статус: <strong>{booking.status}</strong>
      </p>
      {clientRecord ? (
        <section className="clientPanel adminBookingClientPanel">
          <h2>Клиент по этой брони</h2>
          <p className="clientPanelHint">
            <strong>{clientRecord.name}</strong>
            {clientRecord.phone ? ` · ${clientRecord.phone}` : null}
            {clientRecord.email ? ` · ${clientRecord.email}` : null}
          </p>
          <div className="staffQuickActions">
            <Link to={`/admin/users/${clientRecord.id}`} className="btn btnPrimary">
              Открыть карточку
            </Link>
            {chatFocusId ? (
              <Link
                to="/admin/chat"
                className="btn btnSecondary"
                state={{ messengerFocusId: chatFocusId }}
              >
                Чат с клиентом
              </Link>
            ) : (
              <button type="button" className="btn btnSecondary" disabled title="Нет привязанного диалога в демо">
                Чат недоступен
              </button>
            )}
          </div>
          <h3 className="adminBookingHistoryTitle">История броней этого клиента (демо)</h3>
          <ul className="adminBookingHistoryList">
            {clientBookings.map((b) => (
              <li key={b.id} className={b.id === booking.id ? "adminBookingHistoryItem adminBookingHistoryItem--current" : "adminBookingHistoryItem"}>
                {b.id === booking.id ? (
                  <span className="adminBookingHistoryCurrent">Текущая</span>
                ) : (
                  <Link to={`/admin/bookings/${b.id}`} className="clientPanelLink">
                    Открыть
                  </Link>
                )}
                <span className="adminBookingHistoryMeta">
                  {b.time} · {b.hall} · {b.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : booking.clientId ? (
        <section className="clientPanel">
          <p className="clientPanelHint">Клиент с id «{booking.clientId}» не найден в демо-базе.</p>
          <Link to={`/admin/users/${booking.clientId}`} className="btn btnSecondary">
            Перейти в карточку
          </Link>
        </section>
      ) : (
        <section className="clientPanel">
          <h2>Клиент</h2>
          <p className="clientPanelHint">
            Для этой записи нет привязки к карточке в клиентской базе (например, групповое занятие). В продукте здесь
            будет список участников или ссылка на организатора.
          </p>
        </section>
      )}
      <section className="clientPanel">
        <h2>Оплата по записи</h2>
        {bookingPayments.length > 0 ? (
          <ul className="clientList">
            {bookingPayments.map((p) => (
              <li key={p.id} className="clientListItem">
                <div>
                  <span className="clientListTitle">
                    {p.amount} · {p.status}
                  </span>
                  <span className="clientListMeta">
                    {p.method ? `Способ: ${p.method}` : null}
                    {p.method ? " · " : null}
                    {p.booking}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="clientPanelHint">В демо к этой брони не привязан отдельный платёж. После API здесь появятся счета, чеки и статусы.</p>
        )}
        {clientRecord && clientRecord.payments.length > 0 ? (
          <>
            <h3 className="adminBookingHistoryTitle">Платежи клиента (все, демо)</h3>
            <ul className="adminBookingHistoryList">
              {clientRecord.payments.map((pay) => (
                <li key={pay.id} className="adminBookingHistoryItem">
                  <span className="adminBookingHistoryMeta">
                    {pay.date} · {pay.amount} · {pay.status} · {pay.label} ({pay.method})
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="clientPanelHint">
          <Link to="/admin/payments" className="clientPanelLink">
            Все оплаты филиала
          </Link>
        </p>
      </section>
      {USE_API && auditHistory.length > 0 ? (
        <section className="clientPanel">
          <h2>Аудит изменений</h2>
          <ul className="adminBookingHistoryList">
            {auditHistory.map((row) => (
              <li key={row.id} className="adminBookingHistoryItem">
                <span className="adminBookingHistoryMeta">
                  {row.title ?? row.action} · {row.at ? new Date(row.at).toLocaleString("ru-RU") : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="clientPanel">
        <h2>Действия</h2>
        <p className="clientPanelHint">
          Подтверждение, отмена и перенос сохраняются на сервере с записью в аудите. Журнал:{" "}
          <Link to="/admin" className="clientPanelLink">
            Расписание
          </Link>
          , слоты:{" "}
          <Link to="/admin/slots" className="clientPanelLink">
            Слоты
          </Link>
          .
        </p>
        {confirmError ? (
          <p className="authError" role="alert">
            {confirmError}
          </p>
        ) : null}
        <div className="staffQuickActions">
          <button
            type="button"
            className="btn btnPrimary"
            disabled={!USE_API || !apiPayload || confirmPending || mutatePending}
            onClick={handleConfirmBooking}
          >
            {confirmPending ? "Сохранение…" : "Подтвердить"}
          </button>
          <button
            type="button"
            className="btn btnSecondary"
            disabled={!USE_API || !apiPayload || mutatePending || /отмен/i.test(booking.status)}
            onClick={handleCancelBooking}
          >
            Отменить бронь
          </button>
          <Link to="/admin/slots" className="btn btnSecondary">
            Слоты
          </Link>
        </div>
        {USE_API && apiPayload ? (
          <form className="adminOpsForm adminBookingRescheduleForm" onSubmit={handleRescheduleSubmit}>
            <h3 className="adminBookingRescheduleTitle">Перенос (дата, зал, время)</h3>
            <div className="adminOpsFormRow">
              <label className="authField">
                <span>Дата</span>
                <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} required />
              </label>
              <label className="authField">
                <span>Зал</span>
                <select value={rescheduleRoomId} onChange={(e) => setRescheduleRoomId(e.target.value)}>
                  {branchRooms.length === 0 ? (
                    <option value={apiPayload.roomId ?? ""}>{apiPayload.hall}</option>
                  ) : (
                    branchRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
            <div className="adminOpsFormRow">
              <label className="authField">
                <span>Начало</span>
                <input
                  type="time"
                  step={60}
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  required
                />
              </label>
              <label className="authField">
                <span>Окончание</span>
                <input type="time" step={60} value={rescheduleEnd} onChange={(e) => setRescheduleEnd(e.target.value)} required />
              </label>
            </div>
            <button type="submit" className="btn btnPrimary" disabled={mutatePending}>
              {mutatePending ? "Сохранение…" : "Сохранить перенос"}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
