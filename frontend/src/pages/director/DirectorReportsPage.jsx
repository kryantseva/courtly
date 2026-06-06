export default function DirectorReportsPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Отчёты и экспорт</h1>
      <p className="clientPageLead">
        Выгрузки для Excel/CSV и интеграций. Руководитель сравнивает периоды и филиалы; детальные проводки остаются в
        зоне финансов и администратора.
      </p>
      <section className="clientPanel clientPanel--schedule">
        <h2>Доступные выгрузки (после API)</h2>
        <ul className="clientList">
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Выручка по филиалам и дням</span>
              <span className="clientListMeta">Агрегаты, НДС, способ оплаты</span>
            </div>
            <button type="button" className="btn btnSecondary" disabled>
              CSV
            </button>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Загрузка залов и отмены</span>
              <span className="clientListMeta">По тренерам и времени суток</span>
            </div>
            <button type="button" className="btn btnSecondary" disabled>
              CSV
            </button>
          </li>
          <li className="clientListItem">
            <div>
              <span className="clientListTitle">Эффективность тренеров</span>
              <span className="clientListMeta">Часы, выручка, отмены</span>
            </div>
            <button type="button" className="btn btnSecondary" disabled>
              XLSX
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}
