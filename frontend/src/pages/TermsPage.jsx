import { Link } from "react-router-dom";
import CourtlyLogo from "../components/CourtlyLogo";
export default function TermsPage() {
  return (
    <div className="authPage">
      <header className="authHeader">
        <Link to="/" className="brandLink" aria-label="Courtly — на главную">
          <CourtlyLogo size={36} />
        </Link>
        <p className="authTagline">Документы</p>
      </header>
      <main className="legalDoc">
        <h1>Условия использования</h1>
        <p className="legalDocMeta">Редакция для демонстрации. Перед запуском сервиса текст согласуйте с юристом.</p>
        <h2>1. Сервис</h2>
        <p>
          Courtly предоставляет интерфейс для онлайн-записи в спортивные центры и управления бронированиями. Конкретные
          правила отмены, оплаты и посещений определяются договором с выбранным филиалом.
        </p>
        <h2>2. Аккаунт</h2>
        <p>
          Вы обязуетесь указывать достоверные данные при регистрации и не передавать доступ к аккаунту третьим лицам.
          При подозрении на взлом смените пароль и обратитесь в поддержку.
        </p>
        <h2>3. Ограничение ответственности</h2>
        <p>
          Платформа предоставляется «как есть» на этапе разработки. Мы стремимся к стабильной работе, но не гарантируем
          отсутствие сбоев. Споры по услугам центра решаются между вами и организацией филиала.
        </p>
        <p className="legalDocBack">
          <Link to="/register" className="authLink">
            ← К регистрации
          </Link>
          {" · "}
          <Link to="/help" className="authLink">
            Справка
          </Link>
        </p>
      </main>
    </div>
  );
}
