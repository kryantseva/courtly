import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import CourtlyLogo from "../components/CourtlyLogo";
import { apiLogin } from "../api/auth";
import { DEV_ROLES, cabinetPathForRole, setDevRole } from "../utils/sessionRole";
const USE_API = import.meta.env.VITE_USE_API === "true";
function normalizeRole(role) {
  if (DEV_ROLES.includes(role)) return role;
  return "client";
}
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [demoRole, setDemoRole] = useState( ("client"));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (USE_API) {
      setPending(true);
      try {
        const { user } = await apiLogin(email, password, remember);
        const role = normalizeRole(user.role);
        setDevRole(role);
        navigate(cabinetPathForRole(role), { state: { rememberMe: remember } });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось войти");
      } finally {
        setPending(false);
      }
      return;
    }
    setDevRole(demoRole);
    if (demoRole === "director") {
      navigate("/director/select", { state: { rememberMe: remember } });
      return;
    }
    navigate("/branches", { state: { rememberMe: remember } });
  }
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
          <h1>Вход</h1>
          <p className="authLead">Войдите по email и паролю. После входа вы выберете филиал.</p>
          {USE_API ? (
            <p className="authLead authLead--compact">
              После <code className="authCode">docker compose exec backend python manage.py seed_demo_users</code> — логины вида{" "}
              <strong>role</strong>
              <code className="authCode">.courtly.demo@courtly.demo</code> (client, trainer, admin, director), пароль{" "}
              <strong>CourtlyDemo1!</strong>
            </p>
          ) : null}
          <form className="authForm" onSubmit={handleSubmit}>
            {error ? <p className="authError">{error}</p> : null}
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
              <span>Пароль</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                minLength={8}
              />
            </label>
            <label className="authCheck">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Запомнить меня на этом устройстве</span>
            </label>
            {!USE_API ? (
              <label className="authField authField--compact">
                <span>Роль (демо, до API)</span>
                <select
                  value={demoRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDemoRole(
                      v === "trainer" || v === "admin" || v === "director" ? v : "client",
                    );
                  }}
                >
                  <option value="client">Клиент</option>
                  <option value="trainer">Тренер</option>
                  <option value="admin">Администратор филиала</option>
                  <option value="director">Руководитель сети (Courtly Manager)</option>
                </select>
              </label>
            ) : null}
            <button type="submit" className="btn btnPrimary btnBlock" disabled={pending}>
              {pending ? "Вход…" : "Войти"}
            </button>
          </form>
          <div className="authLinks">
            <Link to="/register" className="authLink">
              Нет аккаунта? Зарегистрироваться
            </Link>
            <Link to="/forgot-password" className="authLinkBtn">
              Забыли пароль?
            </Link>
          </div>
        </section>
        <aside className="authAside">
          <h2>Напоминание</h2>
          <ul>
            <li>После входа вы выберете спортивный центр, с которым работаете</li>
            <li>Код центра выдаёт администрация клуба — храните его как приглашение</li>
            <li>Не сообщайте никому пароль от аккаунта и одноразовые коды</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
