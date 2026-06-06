import { useEffect, useState } from "react";
function pad2(n) {
  return String(n).padStart(2, "0");
}
function minToInput(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function inputToMin(s) {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}
const DEMO_SERVICES = [
  { id: "s1", title: "Аренда 1,5 ч (17:00–23:00)", price: "5 250 ₽" },
  { id: "s2", title: "Аренда 1 ч (17:00–23:00)", price: "3 500 ₽" },
  { id: "s3", title: "Аренда 1,5 ч (7:00–17:00)", price: "4 500 ₽" },
];
const PREV_CLIENTS = [
  { name: "Ильшат", phone: "+7 …" },
  { name: "Тимур Назаров", phone: "+7 …" },
];
const STATUS_TABS = [
  { id: "wait", label: "Ожидание" },
  { id: "arrived", label: "Пришёл" },
  { id: "noshow", label: "Не пришёл" },
  { id: "confirmed", label: "Подтвердил" },
];
const STATUS_TO_RU = {
  wait: "Ожидает",
  arrived: "Пришёл",
  noshow: "Не пришёл",
  confirmed: "Подтверждено",
};
export default function BranchJournalRecordModal({
  open,
  onClose,
  courts,
  courtIndex: initialCourtIndex,
  startMin: initialStart,
  endMin: initialEnd,
  dateLabel,
  apiBranchId,
  journalIsoDate,
  onApiSuccess,
}) {
  const [courtIndex, setCourtIndex] = useState(0);
  const [startMin, setStartMin] = useState(480);
  const [endMin, setEndMin] = useState(540);
  const [durationH, setDurationH] = useState(1);
  const [comment, setComment] = useState("");
  const [statusId, setStatusId] = useState("wait");
  const [serviceTab, setServiceTab] = useState( ("services"));
  const [selectedServiceId, setSelectedServiceId] = useState("s2");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consentPd, setConsentPd] = useState(true);
  const [consentAds, setConsentAds] = useState(false);
  const [savedHint, setSavedHint] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savePending, setSavePending] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCourtIndex(initialCourtIndex);
    setStartMin(initialStart);
    setEndMin(initialEnd);
    const dh = Math.max(0.5, (initialEnd - initialStart) / 60);
    setDurationH(dh);
    setComment("");
    setStatusId("wait");
    setServiceTab("services");
    setSelectedServiceId("s2");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setSavedHint("");
    setSaveError("");
    setSavePending(false);
  }, [open, initialCourtIndex, initialStart, initialEnd]);
  function applyDuration(dh) {
    setDurationH(dh);
    setEndMin(startMin + Math.round(dh * 60));
  }
  function applyStartFromInput(s) {
    const sm = inputToMin(s);
    setStartMin(sm);
    setEndMin(sm + Math.round(durationH * 60));
  }
  if (!open) return null;
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError("");
    const canApi = Boolean(apiBranchId && journalIsoDate && typeof onApiSuccess === "function");
    if (canApi) {
      setSavePending(true);
      try {
        const { createBranchBooking } = await import("../../api/bookings");
        const room = courts[courtIndex];
        if (!room?.id) throw new Error("Не выбран зал");
        const serviceTitle = DEMO_SERVICES.find((s) => s.id === selectedServiceId)?.title ?? "Запись";
        const statusRu = STATUS_TO_RU[statusId] ?? "Ожидает";
        await createBranchBooking(apiBranchId, {
          room_id: room.id,
          date: journalIsoDate,
          start_min: startMin,
          end_min: endMin,
          client_name: [firstName, lastName].filter(Boolean).join(" ").trim() || "Клиент",
          phone: phone.trim(),
          service: serviceTitle,
          tone: "mint",
          status: statusRu,
          kind: "lesson",
          confirmed: statusId === "confirmed",
          paid: false,
        });
        onApiSuccess();
        onClose();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Не удалось сохранить");
      } finally {
        setSavePending(false);
      }
      return;
    }
    setSavedHint("Запись подготовлена (демо). После API — сохранение и слот в журнале.");
    window.setTimeout(() => {
      setSavedHint("");
      onClose();
    }, 1400);
  }
  return (
    <div className="branchJournalRecordBackdrop" role="presentation" onClick={handleBackdrop}>
      <div
        className="branchJournalRecordModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branchJournalRecordTitle"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="branchJournalRecordHead">
          <h2 id="branchJournalRecordTitle" className="branchJournalRecordTitle">
            Новая запись
          </h2>
          <button type="button" className="branchJournalRecordClose" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <p className="branchJournalRecordSub">{dateLabel}</p>
        <form className="branchJournalRecordForm" onSubmit={handleSubmit}>
          <div className="branchJournalRecordCols">
            <div className="branchJournalRecordCol">
              <h3 className="branchJournalRecordColTitle">Площадка и время</h3>
              <label className="authField branchJournalRecordField">
                <span>Сотрудник / ресурс</span>
                <select value={courtIndex} onChange={(e) => setCourtIndex(Number(e.target.value))}>
                  {courts.map((c, i) => (
                    <option key={c.id} value={i}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="authField branchJournalRecordField">
                <span>Дата</span>
                <input type="text" value={dateLabel} readOnly className="branchJournalRecordReadonlyInput" />
              </label>
              <div className="branchJournalRecordRow2">
                <label className="authField branchJournalRecordField">
                  <span>Начало</span>
                  <input
                    type="time"
                    value={minToInput(startMin)}
                    onChange={(e) => applyStartFromInput(e.target.value)}
                  />
                </label>
                <label className="authField branchJournalRecordField">
                  <span>Конец</span>
                  <input type="time" value={minToInput(endMin)} readOnly className="branchJournalRecordReadonlyInput" />
                </label>
              </div>
              <label className="authField branchJournalRecordField">
                <span>Длительность</span>
                <select
                  value={String(durationH)}
                  onChange={(e) => applyDuration(Number(e.target.value))}
                >
                  <option value="0.5">30 мин</option>
                  <option value="1">1 ч</option>
                  <option value="1.5">1,5 ч</option>
                  <option value="2">2 ч</option>
                </select>
              </label>
              <button type="button" className="branchJournalRecordGhostBtn" disabled>
                + Добавить перерыв
              </button>
              <label className="authField branchJournalRecordField">
                <span>Комментарий к записи</span>
                <textarea
                  className="branchJournalRecordTextarea"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Заметка для смены…"
                />
              </label>
              <label className="authField branchJournalRecordField">
                <span>Цвет записи</span>
                <select defaultValue="default">
                  <option value="default">По умолчанию</option>
                </select>
              </label>
            </div>
            <div className="branchJournalRecordCol">
              <h3 className="branchJournalRecordColTitle">Статус и услуга</h3>
              <div className="branchJournalStatusTabs" role="tablist">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={statusId === t.id}
                    className={`branchJournalStatusTab${statusId === t.id ? " branchJournalStatusTab--on" : ""}`}
                    onClick={() => setStatusId(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="branchJournalServiceToggle">
                <button
                  type="button"
                  className={serviceTab === "services" ? "branchJournalSvcTab branchJournalSvcTab--on" : "branchJournalSvcTab"}
                  onClick={() => setServiceTab("services")}
                >
                  Услуги
                </button>
                <button
                  type="button"
                  className={serviceTab === "goods" ? "branchJournalSvcTab branchJournalSvcTab--on" : "branchJournalSvcTab"}
                  onClick={() => setServiceTab("goods")}
                >
                  Товары
                </button>
              </div>
              <input type="search" className="branchJournalServiceSearch" placeholder="Поиск по услугам" disabled />
              <ul className="branchJournalServiceList">
                {serviceTab === "services"
                  ? DEMO_SERVICES.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className={`branchJournalServiceCard${selectedServiceId === s.id ? " branchJournalServiceCard--selected" : ""}`}
                          onClick={() => setSelectedServiceId(s.id)}
                        >
                          <span className="branchJournalServiceCardTitle">{s.title}</span>
                          <span className="branchJournalServiceCardPrice">{s.price}</span>
                        </button>
                      </li>
                    ))
                  : (
                    <li className="branchJournalServiceEmpty">Товары — в следующей версии</li>
                  )}
              </ul>
            </div>
            <div className="branchJournalRecordCol">
              <h3 className="branchJournalRecordColTitle">Клиент</h3>
              <div className="branchJournalRecordRow2">
                <label className="authField branchJournalRecordField">
                  <span>Имя</span>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" />
                </label>
                <label className="authField branchJournalRecordField">
                  <span>Фамилия</span>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Иванов" />
                </label>
              </div>
              <label className="authField branchJournalRecordField">
                <span>Телефон</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+7" />
              </label>
              <label className="authField branchJournalRecordField">
                <span>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="example@mail.com" />
              </label>
              <label className="authCheck branchJournalRecordCheck">
                <input type="checkbox" disabled />
                <span>Записывает другого посетителя</span>
              </label>
              <label className="authCheck branchJournalRecordCheck">
                <input type="checkbox" checked={consentPd} onChange={(e) => setConsentPd(e.target.checked)} />
                <span>Согласие на обработку ПДн</span>
              </label>
              <label className="authCheck branchJournalRecordCheck">
                <input type="checkbox" checked={consentAds} onChange={(e) => setConsentAds(e.target.checked)} />
                <span>Согласие на рассылку</span>
              </label>
              <div className="branchJournalPrevClients">
                <span className="branchJournalPrevClientsTitle">Предыдущие клиенты</span>
                <ul>
                  {PREV_CLIENTS.map((p) => (
                    <li key={p.name}>
                      <button
                        type="button"
                        className="branchJournalPrevClientBtn"
                        onClick={() => {
                          const [fn, ...rest] = p.name.split(" ");
                          setFirstName(fn || "");
                          setLastName(rest.join(" ") || "");
                          setPhone(p.phone);
                        }}
                      >
                        {p.name} · {p.phone}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {saveError ? (
            <p className="authError" role="alert">
              {saveError}
            </p>
          ) : null}
          {savedHint ? (
            <p className="branchJournalRecordSaved" role="status">
              {savedHint}
            </p>
          ) : null}
          <div className="branchJournalRecordFooter">
            <button type="button" className="btn btnSecondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="branchJournalRecordSave" disabled={savePending}>
              {savePending ? "Сохранение…" : "Сохранить запись"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
