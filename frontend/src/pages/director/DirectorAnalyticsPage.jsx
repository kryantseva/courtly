import { useCallback, useEffect, useState } from "react";
import { fetchDirectorKpi } from "../../api/director";
import { getApiToken } from "../../utils/apiAuth";
import { DIRECTOR_BRANCHES_COMPARISON } from "../../data/directorDashboardMock";
import { DIRECTOR_REVENUE_TREND_MOCK, DIRECTOR_TRAINER_EFFICIENCY_MOCK } from "../../data/directorOperationsMock";
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
export default function DirectorAnalyticsPage() {
  const tryApi = USE_API && Boolean(getApiToken());
  const [range] = useState(() => defaultRange());
  const [kpiBranches, setKpiBranches] = useState( ([]));
  const [kpiErr, setKpiErr] = useState( (null));
  const loadKpi = useCallback(() => {
    if (!tryApi) return;
    fetchDirectorKpi({ from: range.from, to: range.to })
      .then((raw) => {
        const d = unwrap(raw);
        setKpiBranches(Array.isArray(d?.branches) ? d.branches : []);
        setKpiErr(null);
      })
      .catch((e) => {
        setKpiBranches([]);
        setKpiErr(e instanceof Error ? e.message : "KPI недоступны");
      });
  }, [tryApi, range.from, range.to]);
  useEffect(() => {
    loadKpi();
  }, [loadKpi]);
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Аналитическая панель</h1>
      <p className="clientPageLead">
        Графики по периодам, сравнение филиалов и эффективность тренеров. Руководитель не редактирует расписание и брони —
        только анализирует и выгружает отчёты.
      </p>
      {tryApi && kpiBranches.length > 0 ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>Сравнение филиалов (API, {range.from} — {range.to})</h2>
          {kpiErr ? <p className="authError">{kpiErr}</p> : null}
          <div className="staffTableWrap">
            <table className="staffTable">
              <thead>
                <tr>
                  <th>Филиал</th>
                  <th>Броней</th>
                  <th>Загрузка %</th>
                  <th>Выручка ₽</th>
                  <th>Отмены %</th>
                </tr>
              </thead>
              <tbody>
                {kpiBranches.map((b) => (
                  <tr key={b.branchId}>
                    <td>{b.branchName}</td>
                    <td>{b.bookingsTotal}</td>
                    <td>{b.occupancyPct}</td>
                    <td>{(b.revenueRub ?? 0).toLocaleString("ru-RU")}</td>
                    <td>{b.cancellationRatePct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <h2>Динамика (месяц к месяцу, демо)</h2>
        <div className="directorChartBars directorChartBars--trend">
          {DIRECTOR_REVENUE_TREND_MOCK.map((m) => (
            <div key={m.month} className="directorTrendRow">
              <span className="directorTrendLabel">{m.month}</span>
              <div className="directorTrendBarTrack">
                <span className="directorTrendBarFill directorTrendBarFill--analytics" style={{ width: `${m.valuePct}%` }} />
              </div>
              <span className="directorTrendValue">{m.valuePct}%</span>
            </div>
          ))}
        </div>
        <p className="clientPanelHint">Сравнение периодов: в продукте — выбор двух интервалов и YoY.</p>
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
                  <th>Выручка</th>
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
      <section className="clientPanel">
        <h2>Эффективность тренеров</h2>
        <p className="clientPanelHint">Загрузка, индекс выручки (100 = среднее по сети), доля отмен.</p>
        <div className="staffTableWrap">
          <table className="staffTable">
            <thead>
              <tr>
                <th>Тренер</th>
                <th>Загрузка</th>
                <th>Индекс выручки</th>
                <th>Отмены</th>
              </tr>
            </thead>
            <tbody>
              {DIRECTOR_TRAINER_EFFICIENCY_MOCK.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td>{t.loadPct}%</td>
                  <td>{t.revenueIdx}</td>
                  <td>{t.cancelPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="clientPanel clientPanel--accent">
        <h2>Проблемные паттерны</h2>
        <ul className="clientList">
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Пустые слоты</span>
              <span className="clientListMeta">Будни 09:00–12:00 — Riverside, зал A</span>
            </div>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Перегруженные часы</span>
              <span className="clientListMeta">Downtown, корты 18:00–21:00</span>
            </div>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Слабые тренеры по отменам</span>
              <span className="clientListMeta">Новиков П. — 11% отмен к среднему 6%</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
