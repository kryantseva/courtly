import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { fetchDirectorPersonnelKpi } from "../../api/director";
import { fetchBranchList } from "../../api/branches";
import { getApiToken } from "../../utils/apiAuth";
import { DIRECTOR_STAFF_LIST_MOCK } from "../../data/directorPersonnelMock";
const USE_API = import.meta.env.VITE_USE_API === "true";
function toIsoLocal(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toIsoLocal(from), to: toIsoLocal(to) };
}
function unwrap(raw) {
  if (raw && typeof raw === "object" && raw.data != null) return raw.data;
  return raw;
}
function peopleToCsv(people) {
  const header = ["displayName", "sessionsTotal", "sessionsCancelled", "cancelRatePct", "loadScore", "trainerEarningsRub"];
  const lines = [header.join(";")];
  for (const p of people) {
    lines.push(
      [
        `"${String(p.displayName ?? "").replace(/"/g, '""')}"`,
        p.sessionsTotal ?? "",
        p.sessionsCancelled ?? "",
        p.cancelRatePct ?? "",
        p.loadScore ?? "",
        p.trainerEarningsRub ?? "",
      ].join(";"),
    );
  }
  return lines.join("\n");
}
export default function DirectorPersonnelPage() {
  const tryApi = USE_API && Boolean(getApiToken());
  const [range, setRange] = useState(() => defaultRange());
  const [branchFilter, setBranchFilter] = useState("");
  const [branchOptions, setBranchOptions] = useState( ([]));
  const [people, setPeople] = useState( ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const load = useCallback(() => {
    if (!tryApi) return;
    setLoading(true);
    setError(null);
    fetchDirectorPersonnelKpi({
      from: range.from,
      to: range.to,
      branchId: branchFilter || undefined,
    })
      .then((raw) => {
        const d = unwrap(raw);
        setPeople(Array.isArray(d?.people) ? d.people : []);
      })
      .catch((e) => {
        setPeople([]);
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => setLoading(false));
  }, [tryApi, range.from, range.to, branchFilter]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!tryApi) return;
    let c = false;
    fetchBranchList()
      .then((raw) => {
        const data = unwrap(raw);
        const list = Array.isArray(data) ? data : [];
        if (!c) setBranchOptions(list.map((b) => ({ id: b.id, name: b.name })));
      })
      .catch(() => {
        if (!c) setBranchOptions([]);
      });
    return () => {
      c = true;
    };
  }, [tryApi]);
  function handleExportCsv() {
    if (!people.length) return;
    const blob = new Blob([peopleToCsv(people)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courtly-personnel-kpi-${range.from}-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="clientPage">
      <section className="directorHintBanner" role="note">
        KPI по занятиям и начислениям тренеров за период. Роль director на сервере открывает эти агрегаты.
      </section>
      <h1 className="clientPageTitle">Персонал сети</h1>
      <p className="clientPageLead">
        Метрики с сервера или демо-список ниже. Выгрузка CSV — по живым данным.
      </p>
      {tryApi ? (
        <section className="clientPanel directorKpiFilters">
          <div className="directorKpiFiltersRow">
            <label className="authField">
              <span>С</span>
              <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            </label>
            <label className="authField">
              <span>По</span>
              <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </label>
            <label className="authField">
              <span>Филиал</span>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">Все</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btnSecondary" onClick={load} disabled={loading}>
              Обновить
            </button>
            <button type="button" className="btn btnPrimary" onClick={handleExportCsv} disabled={!people.length}>
              Выгрузка CSV
            </button>
          </div>
          {error ? (
            <p className="authError" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
      {tryApi ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>KPI тренеров (сервер)</h2>
          {loading ? <p className="clientPanelHint">Загрузка…</p> : null}
          <div className="staffTableWrap">
            <table className="staffTable">
              <thead>
                <tr>
                  <th>Сотрудник / тренер</th>
                  <th>Занятий</th>
                  <th>Отмен</th>
                  <th>Доля отмен %</th>
                  <th>Начисления тренеру ₽</th>
                </tr>
              </thead>
              <tbody>
                {people.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="clientPanelHint">
                      Нет данных (нет броней с указанным тренером за период).
                    </td>
                  </tr>
                ) : null}
                {people.map((p) => (
                  <tr key={p.key}>
                    <td>{p.displayName}</td>
                    <td>{p.sessionsTotal}</td>
                    <td>{p.sessionsCancelled}</td>
                    <td>{p.cancelRatePct}</td>
                    <td>{(p.trainerEarningsRub ?? 0).toLocaleString("ru-RU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <div className="clientPanelHead">
          <h2>Сотрудники (демо)</h2>
        </div>
        <ul className="clientList">
          {DIRECTOR_STAFF_LIST_MOCK.map((p) => (
            <li key={p.id} className="clientListItem">
              <div>
                <span className="clientListTitle">{p.name}</span>
                <span className="clientListMeta">
                  {p.role} · {p.branchLabel} · последняя активность: {p.lastActive}
                </span>
              </div>
              <div className="staffQuickActions">
                <span className="clientBadge">{p.activity}</span>
                <Link to={`/director/personnel/${p.id}`} className="btn btnSecondary">
                  Карточка
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="clientPanel">
        <h2>Роли в экосистеме</h2>
        <p className="clientPanelHint">
          Клиент, тренер, администратор — назначаются в разделе «Доступ». Руководитель сети (director) управляет
          филиалами и видит агрегаты; глобальная роль director не назначается из матрицы филиала.
        </p>
      </section>
    </div>
  );
}
