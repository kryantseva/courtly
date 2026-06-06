import { Link } from "react-router-dom";
export default function ClientProfileFull({ client, variant, backTo, backLabel }) {
  return (
    <div className="clientPage staffClientProfileFull">
      <p className="clientPageLead">
        <Link to={backTo} className="clientPanelLink">
          ← {backLabel}
        </Link>
      </p>
      <h1 className="clientPageTitle">{client.name}</h1>
      <p className="clientPanelHint">
        {client.status} · последний визит: {client.lastVisit}
        {variant === "director" ? ` · ${client.branchName}` : null}
      </p>
      <section className="clientPanel staffClientProfileSection">
        <h2>Контакты</h2>
        <p>
          <a href={`mailto:${client.email}`}>{client.email}</a> ·{" "}
          <a href={`tel:${client.phone.replace(/\s/g, "")}`}>{client.phone}</a>
        </p>
        <div className="staffClientBaseDetailActions staffClientProfileActions">
          {variant === "admin" && client.adminMessengerConversationId ? (
            <Link
              className="btn btnPrimary"
              to="/admin/chat"
              state={{ messengerFocusId: client.adminMessengerConversationId }}
            >
              Открыть чат в Courtly
            </Link>
          ) : variant === "director" ? (
            <>
              <a className="btn btnSecondary" href={`mailto:${client.email}`}>
                Почта
              </a>
              <Link className="btn btnPrimary" to="/director/chat">
                Мессенджер сети
              </Link>
            </>
          ) : null}
        </div>
      </section>
      <section className="clientPanel staffClientProfileSection">
        <h2>Ближайшие записи</h2>
        <ul className="staffClientBaseBookingList">
          {client.upcomingBookings.length === 0 ? (
            <li className="staffClientBaseEmpty">Нет запланированных занятий</li>
          ) : (
            client.upcomingBookings.map((b) => (
              <li key={b.id} className="staffClientBaseBookingItem">
                <div>
                  <strong>{b.whenLabel}</strong>
                  <span className="staffClientBaseBookingTitle">{b.title}</span>
                </div>
                <div className="staffClientBaseBookingTrainer">
                  <span className="staffClientBaseTrainerLabel">Тренер</span>
                  {variant === "admin" && b.trainerStaffId ? (
                    <Link to={`/admin/users/${b.trainerStaffId}`} className="clientPanelLink">
                      {b.trainerName}
                    </Link>
                  ) : (
                    <span>{b.trainerName}</span>
                  )}
                  <span className="staffClientBasePlace">{b.place}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="clientPanel staffClientProfileSection">
        <h2>История визитов</h2>
        <ul className="staffClientBaseHistoryList">
          {client.visitHistory.length === 0 ? (
            <li className="staffClientBaseEmpty">Пока нет посещений</li>
          ) : (
            client.visitHistory.map((v) => (
              <li key={v.id}>
                <span className="staffClientBaseHistoryDate">{v.date}</span>
                <span>
                  {v.summary} · {v.place}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="clientPanel staffClientProfileSection">
        <h2>Оплаты</h2>
        <div className="staffClientBaseTableWrap">
          <table className="staffClientBaseTable">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Способ</th>
                <th>Статус</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {client.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="staffClientBaseEmptyCell">
                    Нет платежей
                  </td>
                </tr>
              ) : (
                client.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{p.amount}</td>
                    <td>{p.method}</td>
                    <td>{p.status}</td>
                    <td>{p.label}</td>
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
