import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDirectorFinanceDrilldown } from "../../api/director";
import { fetchBranchList } from "../../api/branches";
import { getApiToken } from "../../utils/apiAuth";
import {
  DIRECTOR_PAYMENTS_HISTORY_MOCK,
  DIRECTOR_PAYROLL_BY_BRANCH,
  DIRECTOR_PAYROLL_DETAIL_MOCK,
} from "../../data/directorFinanceMock";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
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
export default function DirectorFinancePage() {
  const { branches } = useManagerNetwork();
  const hasLive = branches.length > 0;
  const [tab, setTab] = useState( ("aggregate"));
  const tryApi = USE_API && Boolean(getApiToken());
  const [range, setRange] = useState(() => defaultRange());
  const [branchFilter, setBranchFilter] = useState("");
  const [groupBy, setGroupBy] = useState( ("branch"));
  const [rows, setRows] = useState( ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [branchOptions, setBranchOptions] = useState( ([]));
  const loadDrilldown = useCallback(() => {
    if (!tryApi) return;
    setLoading(true);
    setError(null);
    fetchDirectorFinanceDrilldown({
      from: range.from,
      to: range.to,
      branchId: branchFilter || undefined,
      groupBy,
    })
      .then((raw) => {
        const d = unwrap(raw);
        setRows(Array.isArray(d?.rows) ? d.rows : []);
      })
      .catch((e) => {
        setRows([]);
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => setLoading(false));
  }, [tryApi, range.from, range.to, branchFilter, groupBy]);
  useEffect(() => {
    if (tab === "aggregate" && tryApi) loadDrilldown();
  }, [tab, tryApi, loadDrilldown]);
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
  return (
    <div className="clientPage">
      <section className="directorHintBanner" role="note">
        Ручная фиксация оплат — у администратора. Руководитель видит агрегаты и проваливается по филиалу, дню и статусу
        оплаты (API).
      </section>
      <h1 className="clientPageTitle">Оплаты и выручка</h1>
      <p className="clientPageLead">
        Агрегированные показатели и drill-down. При включённом API и роли director данные приходят с сервера.
      </p>
      {!hasLive ? (
        <section className="directorPanel directorPanel--hint">
          <h2>Нет филиалов в мастере</h2>
          <p className="clientPanelHint">Создайте филиал локально или на сервере — разрезы привяжутся к объектам.</p>
          <Link to="/director/branches/new" className="btn btnPrimary">
            Создать первый филиал
          </Link>
        </section>
      ) : null}
      {tryApi ? (
        <section className="clientPanel directorKpiFilters">
          <h2 className="directorKpiFiltersTitle">Фильтры финансов</h2>
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
          </div>
        </section>
      ) : null}
      <div className="directorTabs" role="tablist" aria-label="Разделы финансов">
        {[
          { id: "aggregate", label: "Агрегаты" },
          { id: "payroll", label: "Фонд оплаты" },
          { id: "payments", label: "Оплаты клиентов" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`directorTab${tab === t.id ? " directorTab--active" : ""}`}
            onClick={() => setTab( (t.id))}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "aggregate" ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>Drill-down по оплатам</h2>
          {tryApi ? (
            <>
              <div className="directorFinanceGroupBy" role="group" aria-label="Группировка">
                {[
                  { id: "branch", label: "По филиалу" },
                  { id: "day", label: "По дню" },
                  { id: "payment_status", label: "По статусу" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`btn btnSecondary${groupBy === g.id ? " directorGroupBy--on" : ""}`}
                    onClick={() => setGroupBy( (g.id))}
                  >
                    {g.label}
                  </button>
                ))}
                <button type="button" className="btn btnPrimary" onClick={loadDrilldown} disabled={loading}>
                  {loading ? "…" : "Обновить"}
                </button>
              </div>
              {error ? (
                <p className="authError" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="staffTableWrap">
                <table className="staffTable">
                  <thead>
                    <tr>
                      {groupBy === "branch" ? (
                        <>
                          <th>Филиал</th>
                          <th>Платежей</th>
                          <th>Выручка ₽</th>
                          <th>К оплате ₽</th>
                        </>
                      ) : null}
                      {groupBy === "day" ? (
                        <>
                          <th>День</th>
                          <th>Платежей</th>
                          <th>Оплачено ₽</th>
                          <th>К оплате ₽</th>
                        </>
                      ) : null}
                      {groupBy === "payment_status" ? (
                        <>
                          <th>Статус</th>
                          <th>Штук</th>
                          <th>Сумма ₽ (подпись)</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="clientPanelHint">
                          {loading ? "Загрузка…" : "Нет данных за период."}
                        </td>
                      </tr>
                    ) : null}
                    {groupBy === "branch"
                      ? rows.map((r) => (
                          <tr key={r.branchId}>
                            <td>{r.branchName}</td>
                            <td>{r.paymentsCount}</td>
                            <td>{(r.revenueRub ?? 0).toLocaleString("ru-RU")}</td>
                            <td>{(r.pendingRub ?? 0).toLocaleString("ru-RU")}</td>
                          </tr>
                        ))
                      : null}
                    {groupBy === "day"
                      ? rows.map((r) => (
                          <tr key={r.day}>
                            <td>{r.day}</td>
                            <td>{r.paymentsCount}</td>
                            <td>{(r.revenueRub ?? 0).toLocaleString("ru-RU")}</td>
                            <td>{(r.pendingRub ?? 0).toLocaleString("ru-RU")}</td>
                          </tr>
                        ))
                      : null}
                    {groupBy === "payment_status"
                      ? rows.map((r) => (
                          <tr key={r.paymentStatus}>
                            <td>{r.paymentStatus}</td>
                            <td>{r.paymentsCount}</td>
                            <td>{(r.amountRub ?? 0).toLocaleString("ru-RU")}</td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <p className="clientPanelHint">Включите API и войдите под director — появится живой drill-down.</p>
              <div className="staffTableWrap">
                <table className="staffTable">
                  <thead>
                    <tr>
                      <th>Филиал / агрегат</th>
                      <th>Штат</th>
                      <th>Начислено</th>
                      <th>Выплачено</th>
                      <th>К выплате</th>
                      <th>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIRECTOR_PAYROLL_BY_BRANCH.map((row) => (
                      <tr key={row.branchName}>
                        <td>{row.branchName}</td>
                        <td>{row.staff}</td>
                        <td>{row.accrualsMonth}</td>
                        <td>{row.paid}</td>
                        <td>{row.pending}</td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}
      {tab === "payroll" ? (
        <section className="clientPanel">
          <h2>Детализация начислений персоналу (демо)</h2>
          <ul className="clientList">
            {DIRECTOR_PAYROLL_DETAIL_MOCK.map((r) => (
              <li key={r.id} className="clientListItem">
                <div>
                  <span className="clientListTitle">
                    {r.name} · {r.role}
                  </span>
                  <span className="clientListMeta">
                    {r.branch} · {r.monthAccrual}
                  </span>
                </div>
                <span className="clientBadge">{r.status}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btnSecondary" disabled>
            Экспорт ведомости
          </button>
        </section>
      ) : null}
      {tab === "payments" ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>История оплат клиентов (просмотр, демо-таблица)</h2>
          <div className="staffTableWrap">
            <table className="staffTable">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Плательщик</th>
                  <th>Сумма</th>
                  <th>Канал</th>
                  <th>Филиал</th>
                </tr>
              </thead>
              <tbody>
                {DIRECTOR_PAYMENTS_HISTORY_MOCK.map((p) => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{p.payer}</td>
                    <td>{p.amount}</td>
                    <td>{p.channel}</td>
                    <td>{p.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btnSecondary" disabled>
            Выгрузка детализации
          </button>
        </section>
      ) : null}
    </div>
  );
}
