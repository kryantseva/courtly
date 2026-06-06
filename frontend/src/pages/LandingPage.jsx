import { Link } from "react-router-dom";
import CourtlyLogo from "../components/CourtlyLogo";
export default function LandingPage() {
  return (
    <main className="landing">
      <header className="hero">
        <div className="heroTop">
          <div className="heroBrand">
            <CourtlyLogo size={34} />
            <p className="badge">Онлайн-запись в спортивные центры</p>
          </div>
          <nav className="heroNav">
            <Link to="/login" className="linkBtn">
              Вход
            </Link>
            <Link to="/register" className="linkBtnPrimary">
              Регистрация
            </Link>
          </nav>
        </div>
        <h1>Бронируйте корты, залы и занятия в пару кликов</h1>
        <p className="lead">
          Один аккаунт — ваши центры и филиалы. Смотрите свободное время, записывайтесь к тренерам, следите за бронями и
          оплатами в личном кабинете.
        </p>
        <div className="heroActions">
          <Link to="/register" className="btnLink">
            <span className="btn btnPrimary">Создать аккаунт</span>
          </Link>
          <Link to="/login" className="btnLinkGhost">
            Уже записывались — войти
          </Link>
        </div>
      </header>
      <section className="kpis">
        <article>
          <h3>Без звонков</h3>
          <p>Выбирайте слот в календаре, когда вам удобно</p>
        </article>
        <article>
          <h3>Всё в одном месте</h3>
          <p>Предстоящие занятия, история и статусы бронирований</p>
        </article>
        <article>
          <h3>Ваш центр — ваш код</h3>
          <p>Подключение к клубу по коду от администрации</p>
        </article>
      </section>
      <section className="featureGrid">
        <article className="featureCard">
          <h2>Удобное бронирование</h2>
          <p>Свободные окна по залам и времени — без двойных записей и путаницы.</p>
          <ul>
            <li>Календарь и ближайшие доступные слоты</li>
            <li>Фильтры по типу площадки и тренеру</li>
            <li>Отмена и перенос по правилам вашего центра</li>
          </ul>
        </article>
        <article className="featureCard">
          <h2>Тренеры и площадки</h2>
          <p>Смотрите, кто ведёт занятие, и записывайтесь на удобное время.</p>
          <ul>
            <li>Карточки тренеров и описание занятий</li>
            <li>Свободные слоты у выбранного специалиста</li>
            <li>Информация о зале или корте перед записью</li>
          </ul>
        </article>
        <article className="featureCard">
          <h2>Личный кабинет</h2>
          <p>Все ваши записи и оплаты под рукой — на телефоне или компьютере.</p>
          <ul>
            <li>Предстоящие занятия и напоминания</li>
            <li>История посещений и бронирований</li>
            <li>Статусы оплат и чеков</li>
          </ul>
        </article>
      </section>
      <section className="steps">
        <h2>Как начать</h2>
        <div className="stepRow">
          <article>
            <strong>1.</strong>
            <h3>Регистрация</h3>
            <p>Создайте аккаунт — email и пароль, как в обычном сервисе.</p>
          </article>
          <article>
            <strong>2.</strong>
            <h3>Подключение к центру</h3>
            <p>Введите код от вашего клуба или выберите уже привязанный филиал.</p>
          </article>
          <article>
            <strong>3.</strong>
            <h3>Запись</h3>
            <p>Выберите время и подтвердите бронь — готово.</p>
          </article>
        </div>
      </section>
      <footer className="cta">
        <h2>Запишитесь сегодня</h2>
        <p>Зарегистрируйтесь или войдите — дальше выберите свой спортивный центр.</p>
        <div className="ctaActions">
          <Link to="/register" className="btnLink">
            <span className="btn btnPrimary">Регистрация</span>
          </Link>
          <Link to="/login" className="btnLink">
            <span className="btn btnSecondary">Вход</span>
          </Link>
        </div>
      </footer>
      <footer className="landingFooter" aria-label="Нижняя навигация">
        <nav className="landingFooterNav">
          <Link to="/help">FAQ</Link>
          <Link to="/terms">Условия</Link>
          <Link to="/privacy">Конфиденциальность</Link>
        </nav>
        <p className="landingFooterCopy">Courtly — демо-интерфейс</p>
      </footer>
    </main>
  );
}
