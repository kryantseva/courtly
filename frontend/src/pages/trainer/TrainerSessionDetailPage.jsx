import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchBooking } from "../../api/bookings";
import { postTrainerSessionOutcome } from "../../api/trainerCabinet";
import { ApiError } from "../../api/http";
import { useTransientMessage } from "../../hooks/useTransientMessage";
import { sessionOutcomeLabel } from "../../utils/trainerSessionOutcome";
function pickBookingPayload(body) {
  if (!body || typeof body !== "object") return null;
  if (body.id && body.time) return body;
  if (body.data && typeof body.data === "object" && body.data.id) return body.data;
  return null;
}
export default function TrainerSessionDetailPage() {
  const { sessionId } = useParams();
  const [booking, setBooking] = useState( (null));
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);
  const { message: toast, setMessage: setToast } = useTransientMessage(2400);
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoad(true);
    setErr("");
    fetchBooking(sessionId)
      .then((body) => {
        if (cancelled) return;
        const b = pickBookingPayload(body);
        setBooking(b);
        if (!b) setErr("Занятие не найдено.");
      })
      .catch((e) => {
        if (!cancelled) {
          setBooking(null);
          setErr(e instanceof ApiError ? e.message : "Не удалось загрузить занятие");
        }
      })
      .finally(() => {
        if (!cancelled) setLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);
  async function submitOutcome(code) {
    if (!sessionId || pending) return;
    setPending(true);
    setErr("");
    try {
      const raw = await postTrainerSessionOutcome(sessionId, { session_outcome: code });
      const b = pickBookingPayload(raw);
      if (b) setBooking(b);
      setToast(
        code === "completed"
          ? "Отмечено: проведено"
          : code === "no_show"
            ? "Отмечено: неявка"
            : "Отмечено: перенос",
      );
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setPending(false);
    }
  }
  if (load) {
    return (
      <div className="clientPage">
        <p className="clientPageLead">Загрузка…</p>
      </div>
    );
  }
  if (err && !booking) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Занятие</h1>
        <p className="authError">{err}</p>
        <Link to="/trainer/sessions" className="btn btnSecondary">
          К записям
        </Link>
      </div>
    );
  }
  if (!booking) return null;
  const outcome = String(booking.sessionOutcome ?? "pending");
  return (
    <div className="clientPage">
      {toast ? <p className="clientProfileSaved">{toast}</p> : null}
      <p className="clientPageLead">
        <Link to="/trainer/sessions" className="clientPanelLink">
          ← Все записи
        </Link>
      </p>
      <h1 className="clientPageTitle">
        {String(booking.kind ?? "lesson") === "group" ? "Групповое" : "Занятие"} · {String(booking.hall ?? "")}
      </h1>
      <p className="clientPanelHint">
        {String(booking.time ?? "")} · {String(booking.client ?? "")}
      </p>
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      <section className="clientPanel">
        <h2>Статус и отметка</h2>
        <p className="clientPanelHint">
          Статус брони (подтверждение админом): <strong>{String(booking.status ?? "—")}</strong>. Отметка занятия:{" "}
          <strong>{sessionOutcomeLabel(outcome)}</strong> — уходит в аудит и учитывается в отчёте по доходам (проведённые
          + оплаченные).
        </p>
        <div className="staffQuickActions">
          <button type="button" className="btn btnPrimary" disabled={pending} onClick={() => void submitOutcome("completed")}>
            Проведено
          </button>
          <button
            type="button"
            className="btn btnSecondary"
            disabled={pending}
            onClick={() => void submitOutcome("no_show")}
          >
            Неявка
          </button>
          <button
            type="button"
            className="btn btnSecondary"
            disabled={pending}
            onClick={() => void submitOutcome("rescheduled")}
          >
            Перенос
          </button>
        </div>
      </section>
      <section className="clientPanel clientPanel--schedule">
        <h2>Платежи по брони</h2>
        {Array.isArray(booking.payments) && booking.payments.length > 0 ? (
          <ul className="clientList">
            {booking.payments.map((p) => (
              <li key={String(p.id)} className="clientListItem">
                <div>
                  <span className="clientListTitle">{String(p.amount ?? "")}</span>
                  <span className="clientListMeta">
                    {String(p.status ?? "")}
                    {p.trainerAmountRub != null ? ` · тренеру: ${String(p.trainerAmountRub)} ₽` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="clientPanelHint">Платежей нет.</p>
        )}
      </section>
      <section className="clientPanel">
        <h2>История изменений</h2>
        {Array.isArray(booking.history) && booking.history.length > 0 ? (
          <ul className="clientList">
            {[...booking.history]
              .sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")))
              .map((h) => (
                <li key={String(h.id)} className="clientListItem">
                  <div>
                    <span className="clientListTitle">{String(h.title ?? h.action ?? "")}</span>
                    <span className="clientListMeta">{new Date(String(h.at)).toLocaleString("ru-RU")}</span>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <p className="clientPanelHint">Пока нет записей.</p>
        )}
      </section>
    </div>
  );
}
