import { Link } from "react-router-dom";
import { HELP_FAQ_ITEMS, HELP_LEAD_APP } from "../../data/helpFaq";
export default function ClientFaqPage() {
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">FAQ</h1>
      <p className="clientPageLead">{HELP_LEAD_APP}</p>
      <section className="helpFaq clientFaqSection" aria-label="Частые вопросы">
        <h2 className="helpSectionTitle">Частые вопросы</h2>
        <div className="helpFaqList">
          {HELP_FAQ_ITEMS.map((item) => (
            <details key={item.q} className="helpFaqItem">
              <summary className="helpFaqSummary">{item.q}</summary>
              <p className="helpFaqAnswer">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="helpLinks clientFaqSection">
        <h2 className="helpSectionTitle">Документы</h2>
        <ul className="helpLinksList">
          <li>
            <Link to="/terms">Условия использования</Link>
          </li>
          <li>
            <Link to="/privacy">Политика конфиденциальности</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
