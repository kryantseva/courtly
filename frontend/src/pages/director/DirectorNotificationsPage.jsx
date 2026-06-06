import { useState } from "react";
import { DIRECTOR_NOTIFICATIONS_MOCK } from "../../data/directorOperationsMock";
const TONE_CLASS = {
  info: " directorAlert--neutral",
  warn: " directorAlert--warn",
  success: " directorAlert--ok",
};
export default function DirectorNotificationsPage() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  function handleSendDemo(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSent(true);
    setDraft("");
    window.setTimeout(() => setSent(false), 4000);
  }
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Центр уведомлений</h1>
      <p className="clientPageLead">
        Ключевые события сети и системные оповещения. Отправка сообщений персоналу — ограниченно, по важным событиям (в
        продукте — политики и шаблоны).
      </p>
      <section className="clientPanel clientPanel--schedule">
        <h2>События</h2>
        <ul className="directorAlertList">
          {DIRECTOR_NOTIFICATIONS_MOCK.map((n) => (
            <li key={n.id} className={`directorAlert${TONE_CLASS[n.tone] || ""}`}>
              <strong>{n.title}</strong> · {n.at}
              <br />
              {n.detail}
            </li>
          ))}
        </ul>
      </section>
      <section className="clientPanel">
        <h2>Отправка уведомления (ограниченно)</h2>
        <p className="clientPanelHint">
          Используйте для срочных сообщений администраторам или тренерам выбранного филиала. Массовые рассылки и
          маркетинговые кампании — отдельные правила и квоты.
        </p>
        <form className="directorNotifyForm" onSubmit={handleSendDemo}>
          <label className="authField">
            <span>Текст</span>
            <textarea
              className="directorTextarea"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Кратко опишите важное событие…"
            />
          </label>
          <button type="submit" className="btn btnPrimary" disabled={!draft.trim()}>
            Отправить (демо)
          </button>
        </form>
        {sent ? <p className="directorNotifySent">Сообщение поставлено в очередь (имитация).</p> : null}
      </section>
    </div>
  );
}
