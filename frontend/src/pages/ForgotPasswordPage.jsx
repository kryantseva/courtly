import { Link } from "react-router-dom";
import { useState } from "react";
import CourtlyLogo from "../components/CourtlyLogo";
import { apiPasswordResetRequest } from "../api/auth";
const USE_API = import.meta.env.VITE_USE_API === "true";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [debugToken, setDebugToken] = useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setDebugToken("");
    if (!USE_API) {
      setError("Сброс пароля доступен только при включенном API.");
      return;
    }
    setPending(true);
    try {
      const out = await apiPasswordResetRequest({ email });
      if (out?.reset_token) setDebugToken(String(out.reset_token));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить запрос");
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
          <h1>Восстановление пароля</h1>
          {sent ? (
            <>
              <p className="authLead">
                Если адрес <span className="legalEmphasis">{email}</span> есть в системе, мы отправили на него ссылку для
                сброса пароля. Проверьте почту и папку «Спам».
              </p>
              <p className="authLead legalMuted">
                Ссылка действует ограниченное время. После смены пароля войдите как обычно.
              </p>
              {debugToken ? (
                <p className="authLead legalMuted">
                  Dev-токен: <code className="authCode">{debugToken}</code>{" "}
                  <Link to={`/reset-password?token=${encodeURIComponent(debugToken)}`}>Открыть форму сброса</Link>
                </p>
              ) : null}
              <Link to="/login" className="btn btnPrimary btnBlock">
                Вернуться ко входу
              </Link>
            </>
          ) : (
            <>
              <p className="authLead">
                Укажите email, с которым регистрировались. Отправим инструкцию по сбросу пароля.
              </p>
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
                <button type="submit" className="btn btnPrimary btnBlock" disabled={pending}>
                  {pending ? "Отправка..." : "Отправить ссылку"}
                </button>
              </form>
              <div className="authLinks">
                <Link to="/login" className="authLink">
                  ← Назад ко входу
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
