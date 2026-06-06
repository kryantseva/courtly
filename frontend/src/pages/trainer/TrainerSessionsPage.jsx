import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyTrainerBookings } from "../../api/trainerCabinet";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
import { sessionOutcomeLabel } from "../../utils/trainerSessionOutcome";
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOfWeek(base) {
  const d = new Date(base);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d;
}
export default function TrainerSessionsPage() {
  const branchId = getActiveBranch()?.branchId || "";
  const [statusFilter, setStatusFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [rows, setRows] = useState( ([]));
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");
  const range = useMemo(() => {
    const start = mondayOfWeek(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 34);
    return { from: isoDate(start), to: isoDate(end) };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoad(true);
    setErr("");
    fetchMyTrainerBookings({
      from: range.from,
      to: range.to,
      branch_id: branchId || undefined,
      status: statusFilter || undefined,
      session_outcome: outcomeFilter || undefined,
      limit: 100,
      offset: 0,
    })
      .then((body) => {
        if (cancelled) return;
        const list = Array.isArray(body.data) ? body.data : [];
        setRows(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setErr(e instanceof ApiError ? e.message : "Не удалось загрузить записи");
        }
      })
      .finally(() => {
        if (!cancelled) setLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, branchId, statusFilter, outcomeFilter]);
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Записи</h1>
      <p className="clientPageLead">
        Только занятия, где вы назначены тренером (данные с сервера). Фильтры по статусу брони и отметке занятия.
      </p>
      {!branchId ? (
        <p className="clientPanelHint" role="note">
          Филиал не выбран — показаны все ваши занятия по доступным филиалам. Выберите филиал в шапке или на{" "}
          <Link to="/branches">/branches</Link>.
        </p>
      ) : null}
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <div className="clientBookingActions clientBookingActions--tight">
          <label className="formField">
            <span>Статус брони</span>
            <input
              type="search"
              className="adminBookingsSearch"
              placeholder="Напр. Подтверждено"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </label>
          <label className="formField">
            <span>Отметка занятия</span>
            <select
              className="bookingTrainerPrefSelect"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
            >
              <option value="">Все</option>
              <option value="pending">Запланировано</option>
              <option value="completed">Проведено</option>
              <option value="no_show">Неявка</option>
              <option value="rescheduled">Перенос</option>
            </select>
          </label>
        </div>
        <h2>Мои занятия</h2>
        {load ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="clientEmpty">Нет записей за выбранный период и фильтры.</p>
        ) : (
          <ul className="clientList">
            {rows.map((item) => (
              <li key={String(item.id)} className="clientListItem">
                <div>
                  <span className="clientListTitle">{String(item.client ?? "Клиент")}</span>
                  <span className="clientListMeta">
                    {String(item.date ?? "")} · {String(item.time ?? "")} · {String(item.hall ?? "")}
                    {item.branchName ? ` · ${String(item.branchName)}` : ""}
                  </span>
                  <Link to={`/trainer/sessions/${encodeURIComponent(String(item.id))}`} className="clientPanelLink">
                    Открыть занятие
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span className="clientBadge">{String(item.status ?? "—")}</span>
                  <span className="clientPanelHint">{sessionOutcomeLabel(String(item.sessionOutcome ?? ""))}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
