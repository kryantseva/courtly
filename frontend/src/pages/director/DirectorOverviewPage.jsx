import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDirectorKpi } from "../../api/director";
import { fetchBranchList } from "../../api/branches";
import { getApiToken } from "../../utils/apiAuth";
import { DIRECTOR_ALERTS, DIRECTOR_BRANCHES_COMPARISON, DIRECTOR_NETWORK_KPI } from "../../data/directorDashboardMock";
import { DIRECTOR_PROBLEM_ZONES_MOCK, DIRECTOR_REVENUE_TREND_MOCK } from "../../data/directorOperationsMock";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
const USE_API = import.meta.env.VITE_USE_API === "true";
const ALERT_CLASS = {
  ok: " directorAlert--ok",
  warn: " directorAlert--warn",
  neutral: " directorAlert--neutral",
};
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
  if (raw && typeof raw === "object" && "data" in raw && raw.data != null) {
    return raw.data;
  }
  return raw;
}
export default function DirectorOverviewPage() {
  const { branches, networkName, subscriptionActive, subscriptionPlan, activeBranchContextId } = useManagerNetwork();
  const isEmpty = branches.length === 0;
  const ctxBranch = activeBranchContextId ? branches.find((b) => b.id === activeBranchContextId) : null;
  const [range, setRange] = useState(() => defaultRange());
  const [branchFilter, setBranchFilter] = useState("");
  const [kpi, setKpi] = useState( (null));
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState( (null));
  const [branchOptions, setBranchOptions] = useState( ([]));
  const tryApi = USE_API && Boolean(getApiToken());
  const loadKpi = useCallback(() => {
    if (!tryApi) return;
    setKpiLoading(true);
    setKpiError(null);
    fetchDirectorKpi({
      from: range.from,
      to: range.to,
      branchId: branchFilter || undefined,
    })
      .then((raw) => setKpi(unwrap(raw)))
      .catch((e) => {
        setKpi(null);
        setKpiError(e instanceof Error ? e.message : "Не удалось загрузить KPI");
      })
      .finally(() => setKpiLoading(false));
  }, [tryApi, range.from, range.to, branchFilter]);
  useEffect(() => {
    loadKpi();
  }, [loadKpi]);
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
  const net = kpi && typeof kpi.network === "object" && kpi.network ? kpi.network : null;
  const kpiBranches = Array.isArray(kpi?.branches) ? kpi.branches : [];
  const liveKpiCards = useMemo(() => {
    if (!net) return null;
    const n = net;
    return [
      {
        label: "Загрузка (оценка)",
        value: `${n.occupancyPct ?? "—"}%`,
        hint: "Доли занятого времени от условной вместимости залов",
      },
      {
        label: "Выручка (оплачено)",
        value: `${(n.revenueRub ?? 0).toLocaleString("ru-RU")} ₽`,
        hint: "Сумма по платежам «Оплачено» за период",
      },
      {
        label: "Отмены",
        value: `${n.cancellationRatePct ?? "—"}%`,
        hint: `Броней: ${n.bookingsTotal ?? 0}, отменено: ${n.bookingsCancelled ?? 0}`,
      },
      {
        label: "Конверсия подтверждений",
        value: `${n.conversionPct ?? "—"}%`,
        hint: "Подтверждённые к активным броням (без отмен)",
      },
    ];
  }, [net]);
  return (
    <div className="clientPage directorOverview">
      {!subscriptionActive ? (
        <section className="directorPaywall">
          <h2 className="directorPaywallTitle">Нужна подписка Courtly Manager</h2>
          <p className="directorPaywallText">
            Роль руководителя сети выдаётся после оформления подписки на нашу платформу. Оформите доступ — и вы сможете
            создавать филиалы, назначать администраторов и видеть аналитику по всей сети.
          </p>
          <Link to="/director/organization" className="btn btnPrimary">
            Условия и оформление
          </Link>
        </section>
      ) : null}
      {subscriptionActive && isEmpty ? (
        <section className="directorOnboardingHero">
          <p className="directorOnboardingKicker">Courtly Manager</p>
          <h1 className="directorOnboardingTitle">Поздравляем с открытием кабинета руководителя</h1>
          <p className="directorOnboardingLead">
            Сейчас ваша сеть «{networkName}» ещё без филиалов в локальном мастере. Подключите API: создайте филиал на
            сервере (раздел «Филиалы») или присоединитесь по коду — тогда KPI и доступы станут живыми.
          </p>
          <div className="directorOnboardingActions">
            <Link to="/director/branches/new" className="btn btnPrimary btnLarge">
              Мастер настройки
            </Link>
            <Link to="/director/branches" className="btn btnSecondary btnLarge">
              Филиалы и API
            </Link>
          </div>
        </section>
      ) : null}
      {subscriptionActive && !isEmpty ? (
        <>
          <div className="directorOverviewTop">
            <div>
              <h1 className="clientPageTitle">Обзор · {networkName}</h1>
              <p className="clientPageLead">
                Контекст: <strong>{ctxBranch ? ctxBranch.name : "вся сеть"}</strong> · филиалов в мастере — {branches.length}.
                <Link to="/director/select"> Сменить филиал</Link>
                {tryApi ? " · данные KPI с сервера при роли director." : " · включите VITE_USE_API и войдите — KPI с сервера."}
              </p>
            </div>
            <span className="directorSubscriptionBadge" title="В продакшене статус приходит с сервера после оплаты">
              {subscriptionPlan} · активна
            </span>
          </div>
          {tryApi ? (
            <section className="clientPanel directorKpiFilters">
              <h2 className="directorKpiFiltersTitle">Период и филиал</h2>
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
                    <option value="">Все доступные</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="btn btnSecondary" onClick={() => setRange(defaultRange())}>
                  30 дней
                </button>
              </div>
              {kpiError ? (
                <p className="authError" role="alert">
                  {kpiError}
                </p>
              ) : null}
              {kpiLoading ? <p className="clientPanelHint">Загрузка KPI…</p> : null}
            </section>
          ) : null}
          <section className="staffKpiGrid">
            {(tryApi && liveKpiCards ? liveKpiCards : DIRECTOR_NETWORK_KPI).map((kpiItem) => (
              <article key={kpiItem.label} className="staffKpiCard">
                <span className="staffKpiLabel">{kpiItem.label}</span>
                <span className="staffKpiValue">{kpiItem.value}</span>
                <span className="staffKpiHint">{kpiItem.hint}</span>
              </article>
            ))}
          </section>
          {tryApi && kpiBranches.length > 0 ? (
            <section className="clientPanel clientPanel--schedule">
              <h2>Филиалы (KPI за период)</h2>
              <div className="staffTableWrap">
                <table className="staffTable">
                  <thead>
                    <tr>
                      <th>Филиал</th>
                      <th>Броней</th>
                      <th>Отмен %</th>
                      <th>Загрузка %</th>
                      <th>Выручка ₽</th>
                      <th>Конверсия %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiBranches.map((b) => (
                      <tr key={b.branchId}>
                        <td>{b.branchName}</td>
                        <td>{b.bookingsTotal}</td>
                        <td>{b.cancellationRatePct}</td>
                        <td>{b.occupancyPct}</td>
                        <td>{(b.revenueRub ?? 0).toLocaleString("ru-RU")}</td>
                        <td>{b.conversionPct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          <section className="clientPanel clientPanel--schedule">
            <h2>Динамика выручки (демо, индекс к прошлому периоду)</h2>
            <div className="directorChartBars directorChartBars--trend">
              {DIRECTOR_REVENUE_TREND_MOCK.map((m) => (
                <div key={m.month} className="directorTrendRow">
                  <span className="directorTrendLabel">{m.month}</span>
                  <div className="directorTrendBarTrack">
                    <span className="directorTrendBarFill" style={{ width: `${m.valuePct}%` }} />
                  </div>
                  <span className="directorTrendValue">{m.valuePct}%</span>
                </div>
              ))}
            </div>
            <p className="clientPanelHint">Детальная разбивка по дням — в разделе «Финансы».</p>
          </section>
          <section className="clientPanel clientPanel--schedule">
            <h2>Проблемные зоны</h2>
            <p className="clientPanelHint">Отмены, низкая загрузка, перегруженные часы — подсветка для фокуса руководителя.</p>
            <ul className="clientList">
              {DIRECTOR_PROBLEM_ZONES_MOCK.map((z) => (
                <li key={z.zone} className="clientListItem">
                  <div>
                    <span className="clientListTitle">{z.zone}</span>
                    <span className="clientListMeta">{z.issue}</span>
                  </div>
                  <span className="clientBadge">{z.severity}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="clientPanel clientPanel--schedule">
            <div className="clientPanelHead">
              <h2>Ваши филиалы</h2>
              <Link to="/director/branches/new" className="btn btnSecondary">
                + Новый филиал
              </Link>
            </div>
            <ul className="clientList">
              {branches.map((b) => (
                <li key={b.id} className="clientListItem">
                  <div>
                    <span className="clientListTitle">{b.name}</span>
                    <span className="clientListMeta">
                      {b.city} · помещений: {b.rooms.length} · админов: {b.admins.length}
                    </span>
                  </div>
                  <Link to={`/director/branches/${b.id}`} className="btn btnSecondary">
                    Настроить
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="clientPanel clientPanel--schedule">
            <h2>Уведомления и сигналы</h2>
            <ul className="directorAlertList">
              {DIRECTOR_ALERTS.map((a) => (
                <li key={a.id} className={`directorAlert${ALERT_CLASS[a.tone] || ""}`}>
                  {a.text}
                </li>
              ))}
            </ul>
          </section>
          {!tryApi || kpiBranches.length === 0 ? (
            <section className="clientPanel clientPanel--schedule">
              <h2>Сравнение филиалов (демо)</h2>
              <div className="staffTableWrap">
                <table className="staffTable">
                  <thead>
                    <tr>
                      <th>Филиал</th>
                      <th>Записей / нед.</th>
                      <th>Загрузка</th>
                      <th>Выручка / мес.</th>
                      <th>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIRECTOR_BRANCHES_COMPARISON.map((b) => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>{b.bookingsWeek}</td>
                        <td>{b.load}</td>
                        <td>{b.revenue}</td>
                        <td>{b.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
