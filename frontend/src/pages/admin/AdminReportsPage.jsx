export default function AdminReportsPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Отчёты</h1>
      <p className="clientPageLead">
        Выгрузки по посещаемости, выручке и загрузке площадок. Пока раздел-заглушка под будущую аналитику.
      </p>
      <section className="clientPanel">
        <h2>Данные для отчётов</h2>
        <p className="clientPanelHint">
          Отметки тренера по занятиям (<code className="authCode">session_outcome</code>: проведено / неявка / перенос)
          пишутся в аудит и влияют на расчёт тренерских начислений (в связке с оплатами и полем начисления на платеже).
        </p>
        <h2>Скоро</h2>
        <p className="clientPanelHint">Период, формат CSV/PDF и фильтры по залам — после интеграции с биллингом и CRM.</p>
        <button type="button" className="btn btnSecondary" disabled>
          Сформировать отчёт
        </button>
      </section>
    </div>
  );
}
