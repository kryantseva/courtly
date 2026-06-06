import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchBranchBookings } from "../../api/branchBookings";
import { ADMIN_BOOKINGS_LIST_MOCK } from "../../data/adminOperationsMock";
import { getActiveBranch } from "../../utils/activeBranch";
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
function filterMockBookings(list, q) {
  if (!q) return list;
  const qq = q.toLowerCase();
  return list.filter(
    (b) =>
      b.client.toLowerCase().includes(qq) ||
      b.hall.toLowerCase().includes(qq) ||
      String(b.trainer || "").toLowerCase().includes(qq),
  );
}
export default function AdminBookingsPage() {
  const branch = getActiveBranch();
  const branchId = branch?.branchId;
  const [apiRows, setApiRows] = useState( (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const range = useMemo(() => defaultRange(), []);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);
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
    fetchBranchBookings(branchId, { ...range, q: debouncedQ || undefined })
      .then((data) => {
        if (!cancelled && Array.isArray(data.bookings)) setApiRows(data.bookings);
      })
      .catch((e) => {
        if (!cancelled) {
          setApiRows(null);
          setError(e instanceof Error ? e.message : "Не удалось загрузить список");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, range.from, range.to, debouncedQ]);
  const useServer = USE_API && Boolean(branchId);
  const showTableLoading = useServer && loading;
  const mockRows = useMemo(() => filterMockBookings(ADMIN_BOOKINGS_LIST_MOCK, debouncedQ), [debouncedQ]);
  const rows =
    useServer && !loading && apiRows !== null ? apiRows : !useServer ? mockRows : [];
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Бронирования</h1>
      <p className="clientPageLead">
        Список записей филиала с быстрым поиском и фильтрами. Подтверждение, отмена и перенос — в карточке брони.
      </p>
      {USE_API && !branchId ? (
        <p className="clientPanelHint" role="note">
          Выберите филиал на экране «Выберите филиал», чтобы загрузить брони с сервера.
        </p>
      ) : null}
      {error ? (
        <p className="authError" role="alert">
          {error}
        </p>
      ) : null}
      <section className="clientPanel">
        <div className="staffQuickActions">
          <input
            type="search"
            className="adminBookingsSearch"
            placeholder="Поиск по клиенту, залу, тренеру…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Поиск по бронированиям"
          />
          <button type="button" className="btn btnSecondary" disabled>
            Фильтры
          </button>
        </div>
        <div className="staffTableWrap">
          <table className="staffTable">
            <thead>
              <tr>
                <th>Время</th>
                <th>Зал</th>
                <th>Клиент</th>
                <th>Тренер</th>
                <th>Статус</th>
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
                    Нет броней в выбранном периоде.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id}>
                    <td>{b.time}</td>
                    <td>{b.hall}</td>
                    <td>
                      {b.clientId ? (
                        <Link to={`/admin/users/${b.clientId}`} className="clientPanelLink" title="Карточка клиента">
                          {b.client}
                        </Link>
                      ) : (
                        b.client
                      )}
                    </td>
                    <td>{b.trainer}</td>
                    <td>{b.status}</td>
                    <td>
                      <Link to={`/admin/bookings/${b.id}`} className="clientPanelLink">
                        Открыть
                      </Link>
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
