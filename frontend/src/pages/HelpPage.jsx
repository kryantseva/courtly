import { Link } from "react-router-dom";
import CourtlyLogo from "../components/CourtlyLogo";
import { HELP_FAQ_ITEMS, HELP_LEAD_PUBLIC } from "../data/helpFaq";
export default function HelpPage() {
  return (
    <div className="authPage">
      <header className="authHeader">
        <Link to="/" className="brandLink" aria-label="Courtly — на главную">
          <CourtlyLogo size={36} />
        </Link>
        <p className="authTagline">FAQ и ответы на вопросы</p>
      </header>
      <main className="helpPage">
        <h1 className="helpPageTitle">Справка</h1>
        <p className="helpPageLead">{HELP_LEAD_PUBLIC}</p>
        <section className="helpFaq" aria-label="Частые вопросы">
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
        <section className="helpLinks">
          <h2 className="helpSectionTitle">Документы</h2>
          <ul className="helpLinksList">
            <li>
              <Link to="/terms">Условия использования</Link>
            </li>
            <li>
              <Link to="/privacy">Политика конфиденциальности</Link>
            </li>
            <li>
              <Link to="/login">Вход в аккаунт</Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
