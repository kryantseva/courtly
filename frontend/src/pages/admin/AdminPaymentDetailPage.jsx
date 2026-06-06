import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { unwrapApiPayload } from "../../api/adminBooking";
import { fetchPaymentDetail, patchPayment } from "../../api/branchPayments";
import { PAYMENT_STATUSES } from "../../utils/paymentStatus";
const USE_API = import.meta.env.VITE_USE_API === "true";
function statusOptions(current) {
  return Array.from(new Set([...PAYMENT_STATUSES, current].filter(Boolean)));
}
export default function AdminPaymentDetailPage() {
  const { paymentId } = useParams();
  const [payload, setPayload] = useState( (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [saveBusy, setSaveBusy] = useState(false);
  const [methodDraft, setMethodDraft] = useState("");
  useEffect(() => {
    if (!USE_API || !paymentId) {
      setPayload(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPaymentDetail(paymentId)
      .then((raw) => {
        const p = unwrapApiPayload(raw);
        if (!cancelled) {
          setPayload(p);
          setMethodDraft(typeof p.method === "string" ? p.method : "");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);
  async function onStatusChange(nextStatus) {
    if (!paymentId || !payload) return;
    setSaveBusy(true);
    setError(null);
    try {
      const raw = await patchPayment(paymentId, { status: nextStatus });
      const p = unwrapApiPayload(raw);
      setPayload(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaveBusy(false);
    }
  }
  async function onMethodBlurSave() {
    if (!paymentId || !payload) return;
    const cur = typeof payload.method === "string" ? payload.method : "";
    if (methodDraft === cur) return;
    setSaveBusy(true);
    setError(null);
    try {
      const raw = await patchPayment(paymentId, { method: methodDraft });
      const p = unwrapApiPayload(raw);
      setPayload(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaveBusy(false);
    }
  }
  if (USE_API && loading) {
    return (
      <div className="clientPage">
        <p className="clientPanelHint">Загрузка платежа…</p>
        <Link to="/admin/payments" className="btn btnSecondary">
          К списку
        </Link>
      </div>
    );
  }
  if (!payload || !paymentId) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Платёж не найден</h1>
        {error ? <p className="authError">{error}</p> : null}
        <Link to="/admin/payments" className="btn btnSecondary">
          К списку
        </Link>
      </div>
    );
  }
  const history = Array.isArray(payload.history) ? payload.history : [];
  const bookingId = payload.bookingId;
  return (
    <div className="clientPage">
      <p className="clientPageLead">
        <Link to="/admin/payments" className="clientPanelLink">
          ← Все оплаты
        </Link>
      </p>
      <h1 className="clientPageTitle">
        {String(payload.amount ?? "")} · {String(payload.client ?? "")}
      </h1>
      {error ? (
        <p className="authError" role="alert">
          {error}
        </p>
      ) : null}
      <section className="clientPanel">
        <h2>Реквизиты</h2>
        <p className="clientPanelHint">
          Бронь:{" "}
          {bookingId ? (
            <Link to={`/admin/bookings/${bookingId}`} className="clientPanelLink">
              {String(payload.booking ?? bookingId)}
            </Link>
          ) : (
            String(payload.booking ?? "—")
          )}
        </p>
        <div className="adminOpsFormRow">
          <label className="authField">
            <span>Статус</span>
            <select
              className="staffTableSelect"
              value={String(payload.status ?? "")}
              disabled={saveBusy}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {statusOptions(String(payload.status ?? "")).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="authField">
            <span>Способ оплаты</span>
            <input
              value={methodDraft}
              onChange={(e) => setMethodDraft(e.target.value)}
              onBlur={onMethodBlurSave}
              disabled={saveBusy}
            />
          </label>
        </div>
      </section>
      <section className="clientPanel">
        <h2>История изменений</h2>
        {history.length === 0 ? (
          <p className="clientPanelHint">Пока нет записей аудита по этому платежу.</p>
        ) : (
          <ul className="adminBookingHistoryList">
            {history.map((row) => (
              <li key={row.id} className="adminBookingHistoryItem">
                <span className="adminBookingHistoryMeta">
                  {row.title ?? row.action} · {row.at ? new Date(row.at).toLocaleString("ru-RU") : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
