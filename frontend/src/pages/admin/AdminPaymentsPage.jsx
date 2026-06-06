import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBranchPayments, patchPayment } from "../../api/branchPayments";
import { ADMIN_PAYMENTS_MOCK } from "../../data/adminOperationsMock";
import { getActiveBranch } from "../../utils/activeBranch";
import { PAYMENT_STATUSES } from "../../utils/paymentStatus";
const USE_API = import.meta.env.VITE_USE_API === "true";
function toIsoDateLocal(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function defaultRange() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 31);
  return { from: toIsoDateLocal(from), to: toIsoDateLocal(to) };
}
function statusSelectOptions(current) {
  return Array.from(new Set([...PAYMENT_STATUSES, current].filter(Boolean)));
}
export default function AdminPaymentsPage() {
  const branch = getActiveBranch();
  const branchId = branch?.branchId;
  const [apiRows, setApiRows] = useState( (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [rowBusy, setRowBusy] = useState( ({}));
  const range = useMemo(() => defaultRange(), []);
  useEffect(() => {
    if (!USE_API || !branchId) {
      setApiRows(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBranchPayments(branchId, range)
      .then((data) => {
        if (!cancelled && Array.isArray(data.payments)) setApiRows(data.payments);
      })
      .catch((e) => {
        if (!cancelled) {
          setApiRows(null);
          setError(e instanceof Error ? e.message : "Не удалось загрузить оплаты");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, range.from, range.to]);
  const useServer = USE_API && Boolean(branchId);
  const showTableLoading = useServer && loading;
  const rows = useServer && !loading && apiRows !== null ? apiRows : !useServer ? ADMIN_PAYMENTS_MOCK : [];
  const onStatusChange = useCallback(
    async (paymentId, nextStatus) => {
      if (!USE_API || !branchId) return;
      setRowBusy((b) => ({ ...b, [paymentId]: true }));
      setError(null);
      try {
        await patchPayment(paymentId, { status: nextStatus });
        setApiRows((prev) =>
          prev ? prev.map((p) => (p.id === paymentId ? { ...p, status: nextStatus } : p)) : prev,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось обновить статус");
      } finally {
        setRowBusy((b) => {
          const next = { ...b };
          delete next[paymentId];
          return next;
        });
      }
    },
    [branchId],
  );
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Оплаты</h1>
      <p className="clientPageLead">
        Список оплат и связь с бронированиями. Статус можно сменить в таблице (роль администратора / тренера /
        руководителя).
      </p>
      {USE_API && !branchId ? (
        <p className="clientPanelHint" role="note">
          Выберите филиал, чтобы загрузить оплаты с сервера.
        </p>
      ) : null}
      {error ? (
        <p className="authError" role="alert">
          {error}
        </p>
      ) : null}
      <section className="clientPanel">
        <div className="staffTableWrap">
          <table className="staffTable">
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Бронь</th>
                <th>Способ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {showTableLoading ? (
                <tr>
                  <td colSpan={6} className="clientPanelHint">
                    Загрузка…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clientPanelHint">
                    Нет платежей в выбранном периоде.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.client}</td>
                    <td>{p.amount}</td>
                    <td>
                      {useServer ? (
                        <select
                          className="staffTableSelect"
                          value={p.status}
                          disabled={Boolean(rowBusy[p.id])}
                          aria-label={`Статус оплаты ${p.id}`}
                          onChange={(e) => onStatusChange(p.id, e.target.value)}
                        >
                          {statusSelectOptions(p.status).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p.status
                      )}
                    </td>
                    <td>
                      {p.bookingId ? (
                        <Link to={`/admin/bookings/${p.bookingId}`} className="clientPanelLink">
                          {p.booking}
                        </Link>
                      ) : (
                        p.booking
                      )}
                    </td>
                    <td>{p.method ?? "—"}</td>
                    <td>
                      {p.bookingId ? (
                        <>
                          <Link to={`/admin/bookings/${p.bookingId}`} className="clientPanelLink">
                            Бронь
                          </Link>
                          {" · "}
                          <Link to={`/admin/payments/${p.id}`} className="clientPanelLink">
                            История
                          </Link>
                        </>
                      ) : (
                        <Link to={`/admin/payments/${p.id}`} className="clientPanelLink">
                          Подробнее
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
