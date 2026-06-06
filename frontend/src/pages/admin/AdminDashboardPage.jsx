import { ADMIN_KPI_MOCK, ADMIN_TODAY_TIMELINE } from "../../data/adminDashboardMock";
export default function AdminDashboardPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Обзор филиала</h1>
      <p className="clientPageLead">
        Дашборд филиала: сегодняшние события и загрузка. Журнал записи по кортам — первая вкладка; детали броней — «Брони»;
        слоты и блокировки — «Слоты»; клиенты и тренеры — «Клиенты» / «Команда»; залы — «Залы»; оплаты — «Оплаты»;
        уведомления — «Уведомления». Цифры демонстрационные.
      </p>
      <section className="staffKpiGrid">
        {ADMIN_KPI_MOCK.map((kpi) => (
          <article key={kpi.label} className="staffKpiCard">
            <span className="staffKpiLabel">{kpi.label}</span>
            <span className="staffKpiValue">{kpi.value}</span>
            <span className="staffKpiHint">{kpi.hint}</span>
          </article>
        ))}
      </section>
      <section className="clientPanel clientPanel--schedule">
        <h2>Сегодня в центре</h2>
        <ul className="clientList">
          {ADMIN_TODAY_TIMELINE.map((item) => (
            <li key={item.id} className="clientListItem">
              <div>
                <span className="clientListTitle">
                  {item.time} · {item.title}
                </span>
                <span className="clientListMeta">
                  {item.place} · {item.note}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
