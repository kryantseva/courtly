import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import CourtlyLogo from "../components/CourtlyLogo";
import { apiPasswordResetConfirm } from "../api/auth";
const USE_API = import.meta.env.VITE_USE_API === "true";
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!USE_API) {
      setError("Сброс пароля доступен только при включенном API.");
      return;
    }
    if (!token.trim()) {
      setError("Введите токен.");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setPending(true);
    try {
      await apiPasswordResetConfirm({
        token: token.trim(),
        new_password: password,
        new_password_confirm: confirm,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сбросить пароль");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="authPage">
      <header className="authHeader">
        <Link to="/" className="brandLink" aria-label="Courtly — на главную">
          <CourtlyLogo size={36} />
        </Link>
        <p className="authTagline">Платформа для спортивных центров</p>
      </header>
      <div className="authShell authShell--narrow">
        <section className="authPanel">
          <h1>Подтверждение сброса</h1>
          {done ? (
            <>
              <p className="authLead">Пароль обновлен. Теперь войдите с новым паролем.</p>
              <Link to="/login" className="btn btnPrimary btnBlock">Перейти ко входу</Link>
            </>
          ) : (
            <form className="authForm" onSubmit={handleSubmit}>
              {error ? <p className="authError">{error}</p> : null}
              <label className="authField">
                <span>Токен</span>
                <input value={token} onChange={(e) => setToken(e.target.value)} required />
              </label>
              <label className="authField">
                <span>Новый пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="authField">
                <span>Подтвердите новый пароль</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button type="submit" className="btn btnPrimary btnBlock" disabled={pending}>
                {pending ? "Сброс..." : "Сбросить пароль"}
              </button>
              <div className="authLinks">
                <Link to="/login" className="authLink">← Назад ко входу</Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
