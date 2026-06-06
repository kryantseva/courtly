import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CourtlyLogo from "../components/CourtlyLogo";
import { apiRegister } from "../api/auth";
import { DEV_ROLES, setDevRole } from "../utils/sessionRole";
const USE_API = import.meta.env.VITE_USE_API === "true";
function normalizeRole(role) {
  if (typeof role === "string" && DEV_ROLES.includes(role)) return role;
  return "client";
}
export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [demoRole, setDemoRole] = useState( ("client"));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!USE_API) setDevRole(demoRole);
  }, [demoRole, USE_API]);
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (!acceptedTerms) {
      setError("Нужно принять условия использования и политику конфиденциальности");
      return;
    }
    if (!USE_API) {
      setError(
        "Регистрация доступна только с подключённым API. В .env или frontend/.env.development задайте VITE_USE_API=true, поднимите backend и перезапустите dev-сервер.",
      );
      return;
    }
    setPending(true);
    try {
      const data = await apiRegister({ name, email, password, phone: phone || undefined });
      const role = normalizeRole(data.user?.role);
      setDevRole(role);
      navigate("/branches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setPending(false);
    }
  }
  const passwordsMatch = password === confirm || confirm.length === 0;
  return (
    <div className="authPage">
      <header className="authHeader">
        <Link to="/" className="brandLink" aria-label="Courtly — на главную">
          <CourtlyLogo size={36} />
        </Link>
        <p className="authTagline">Платформа для спортивных центров</p>
      </header>
      <div className="authShell">
        <section className="authPanel">
          <h1>Регистрация</h1>
          <p className="authLead">
            Создайте учётную запись: данные уходят на сервер и сохраняются в БД. После регистрации подключитесь к филиалу
            по коду или приглашению.
          </p>
          {USE_API ? (
            <p className="authLead authLead--compact">
              В базе новому пользователю назначается роль «Клиент»; роли тренера, администратора и руководителя выдаёт
              администрация.
            </p>
          ) : null}
          {!USE_API ? (
            <p className="authLead authLead--compact" role="note">
              Сейчас API выключен — отправка формы не создаст пользователя. Выберите роль для демо-входа без БД на
              странице{" "}
              <Link to="/login" className="authInlineLink">
                Вход
              </Link>{" "}
              или включите API и заполните поля ниже.
            </p>
          ) : null}
          <form className="authForm" onSubmit={handleSubmit}>
            {error ? <p className="authError">{error}</p> : null}
            <label className="authField">
              <span>Имя и фамилия</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться"
                required
              />
            </label>
            <label className="authField">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="authField">
              <span>Телефон</span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 900 000-00-00"
              />
            </label>
            <label className="authField">
              <span>Пароль</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Не менее 8 символов"
                required
                minLength={8}
              />
            </label>
            <label className="authField">
              <span>Подтверждение пароля</span>
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Повторите пароль"
                required
                minLength={8}
              />
              {!passwordsMatch ? <span className="authError">Пароли не совпадают</span> : null}
            </label>
            {!USE_API ? (
              <label className="authField authField--compact">
                <span>Роль кабинета (демо, пока API выключен)</span>
                <select
                  value={demoRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDemoRole(v === "trainer" || v === "admin" || v === "director" ? v : "client");
                  }}
                >
                  <option value="client">Клиент</option>
                  <option value="trainer">Тренер</option>
                  <option value="admin">Администратор филиала</option>
                  <option value="director">Руководитель сети (Courtly Manager)</option>
                </select>
              </label>
            ) : null}
            <label className="authCheck">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <span>
                Я принимаю{" "}
                <Link to="/terms" className="authInlineLink">
                  условия использования
                </Link>{" "}
                и{" "}
                <Link to="/privacy" className="authInlineLink">
                  политику конфиденциальности
                </Link>
              </span>
            </label>
            <button
              type="submit"
              className="btn btnPrimary btnBlock"
              disabled={!passwordsMatch || !acceptedTerms || pending}
            >
              {pending ? "Создание…" : "Создать аккаунт"}
            </button>
          </form>
          <div className="authLinks">
            <Link to="/login" className="authLink">
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </section>
        <aside className="authAside">
          <h2>Что дальше</h2>
          <ul>
            <li>Войдите в аккаунт и выберите свой филиал</li>
            <li>Если центр выдал код — введите его при первом подключении</li>
            <li>Дальше можно смотреть слоты и бронировать занятия</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
