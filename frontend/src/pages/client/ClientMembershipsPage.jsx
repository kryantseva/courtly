import { CLIENT_MEMBERSHIPS_MOCK, CLIENT_OFFERS_MOCK } from "../../data/clientMembershipsMock";
export default function ClientMembershipsPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Абонементы</h1>
      <p className="clientPageLead">
        Ваши действующие пакеты в выбранном филиале. Оплата продления и история списаний подключим с API биллинга.
      </p>
      <section className="clientPanel clientPanel--schedule">
        <h2>Мои абонементы</h2>
        <ul className="clientList">
          {CLIENT_MEMBERSHIPS_MOCK.map((m) => (
            <li key={m.id} className="clientListItem">
              <div>
                <span className="clientListTitle">{m.title}</span>
                <span className="clientListMeta">
                  {m.validUntil} · {m.visitsLeft}
                </span>
              </div>
              <span className="clientBadge">{m.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="clientPanel">
        <h2>Предложения филиала</h2>
        <ul className="clientList">
          {CLIENT_OFFERS_MOCK.map((o) => (
            <li key={o.id} className="clientListItem">
              <div>
                <span className="clientListTitle">{o.title}</span>
                <span className="clientListMeta">{o.hint}</span>
              </div>
              <span className="clientBadge">{o.price}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btnPrimary clientHistoryCta" disabled>
          Оформить онлайн
        </button>
      </section>
    </div>
  );
}
