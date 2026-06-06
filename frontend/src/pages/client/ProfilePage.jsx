import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiChangePassword, apiMe, apiPatchMe } from "../../api/auth";
import { ApiError } from "../../api/http";
const NOTIFY_STORAGE = "courtly_client_notify_v1";
function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}
export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [loadMe, setLoadMe] = useState(false);
  const [pending, setPending] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdPending, setPwdPending] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [remindEmail, setRemindEmail] = useState(true);
  const [scheduleChanges, setScheduleChanges] = useState(true);
  useEffect(() => {
    const n = loadJson(NOTIFY_STORAGE, { remindEmail: true, scheduleChanges: true });
    setRemindEmail(n.remindEmail);
    setScheduleChanges(n.scheduleChanges);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoadMe(true);
    setError("");
    apiMe()
      .then((data) => {
        if (cancelled || !data?.user) return;
        const u = data.user;
        setFullName(String(u.name ?? ""));
        setEmail(String(u.email ?? ""));
        setPhone(String(u.phone ?? ""));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Не удалось загрузить профиль");
      })
      .finally(() => {
        if (!cancelled) setLoadMe(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function handleSaveProfile(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Введите имя.");
      return;
    }
    if (!email.trim()) {
      setError("Введите email.");
      return;
    }
    setPending(true);
    try {
      await apiPatchMe({ name: fullName, email, phone });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setPending(false);
    }
  }
  function persistNotify(nextRemind, nextSchedule) {
    localStorage.setItem(
      NOTIFY_STORAGE,
      JSON.stringify({ remindEmail: nextRemind, scheduleChanges: nextSchedule }),
    );
  }
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdError("Заполните все поля пароля.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("Новый пароль и подтверждение не совпадают.");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdError("Новый пароль должен быть не короче 8 символов.");
      return;
    }
    setPwdPending(true);
    try {
      await apiChangePassword({
        old_password: pwdCurrent,
        new_password: pwdNew,
        new_password_confirm: pwdConfirm,
      });
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      setPwdSuccess("Пароль успешно изменен.");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Не удалось изменить пароль");
    } finally {
      setPwdPending(false);
    }
  }
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Профиль</h1>
      <p className="clientPageLead">
        Имя, email и телефон хранятся на сервере. Настройки уведомлений ниже — только в этом браузере.
      </p>
      {error ? <p className="authError">{error}</p> : null}
      <section className="clientPanel">
        <h2>Личные данные</h2>
        {loadMe ? (
          <p className="clientPanelHint">Загрузка…</p>
        ) : (
          <form className="profileForm" onSubmit={handleSaveProfile}>
            <label className="authField">
              <span>Имя</span>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </label>
            <label className="authField">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label className="authField">
              <span>Телефон</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </label>
            {savedFlash ? (
              <p className="clientProfileSaved">Сохранено на сервере</p>
            ) : null}
            <button type="submit" className="btn btnPrimary" disabled={pending || loadMe}>
              {pending ? "Сохранение…" : "Сохранить"}
            </button>
          </form>
        )}
      </section>
      <section className="clientPanel">
        <h2>Филиалы</h2>
        <p className="clientPanelHint">Подключённые филиалы и смена активного — через кнопку «Сменить филиал» в шапке.</p>
        <Link to="/branches" className="btn btnSecondary">
          Управление филиалами
        </Link>
      </section>
      <section className="clientPanel">
        <h2>FAQ</h2>
        <p className="clientPanelHint">Частые вопросы, условия и политика конфиденциальности.</p>
        <Link to="/app/faq" className="btn btnSecondary">
          Открыть FAQ
        </Link>
      </section>
      <section className="clientPanel">
        <h2>Уведомления</h2>
        <label className="authCheck profileCheck">
          <input
            type="checkbox"
            checked={remindEmail}
            onChange={(e) => {
              const v = e.target.checked;
              setRemindEmail(v);
              persistNotify(v, scheduleChanges);
            }}
          />
          <span>Напоминания о занятиях по email</span>
        </label>
        <label className="authCheck profileCheck">
          <input
            type="checkbox"
            checked={scheduleChanges}
            onChange={(e) => {
              const v = e.target.checked;
              setScheduleChanges(v);
              persistNotify(remindEmail, v);
            }}
          />
          <span>Изменения расписания и отмены</span>
        </label>
      </section>
      <section className="clientPanel">
        <h2>Смена пароля</h2>
        <form className="profileForm" onSubmit={handleChangePassword}>
          <label className="authField">
            <span>Текущий пароль</span>
            <input
              type="password"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="authField">
            <span>Новый пароль</span>
            <input
              type="password"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="authField">
            <span>Подтвердите новый пароль</span>
            <input
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {pwdError ? <p className="authError">{pwdError}</p> : null}
          {pwdSuccess ? <p className="clientProfileSaved">{pwdSuccess}</p> : null}
          <button type="submit" className="btn btnPrimary" disabled={pwdPending || loadMe}>
            {pwdPending ? "Сохраняем..." : "Изменить пароль"}
          </button>
        </form>
      </section>
    </div>
  );
}
