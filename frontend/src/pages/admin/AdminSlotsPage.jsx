import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_BOOKINGS_LIST_MOCK, ADMIN_SLOT_HALL_OPTIONS } from "../../data/adminOperationsMock";
import { ADMIN_STAFF_MOCK } from "../../data/adminDashboardMock";
export default function AdminSlotsPage() {
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");
  const [slotHallId, setSlotHallId] = useState(ADMIN_SLOT_HALL_OPTIONS[0]?.id ?? "");
  const [slotTrainerId, setSlotTrainerId] = useState(ADMIN_STAFF_MOCK[0]?.id ?? "");
  const [slotNote, setSlotNote] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [blockFrom, setBlockFrom] = useState("12:00");
  const [blockTo, setBlockTo] = useState("14:00");
  const [blockReason, setBlockReason] = useState("ремонт покрытия");
  const [transferBookingId, setTransferBookingId] = useState(ADMIN_BOOKINGS_LIST_MOCK[0]?.id ?? "");
  const [transferNewDate, setTransferNewDate] = useState("");
  const [transferNewTime, setTransferNewTime] = useState("18:00");
  const [transferHallId, setTransferHallId] = useState(ADMIN_SLOT_HALL_OPTIONS[0]?.id ?? "");
  const [transferNote, setTransferNote] = useState("");
  const [toast, setToast] = useState("");
  const transferBooking = useMemo(
    () => ADMIN_BOOKINGS_LIST_MOCK.find((b) => b.id === transferBookingId) ?? null,
    [transferBookingId],
  );
  function showStubToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }
  function handlePrepareSlot(e) {
    e.preventDefault();
    showStubToast("Черновик слота подготовлен. После API запрос уйдёт на сервер с проверкой конфликтов.");
  }
  function handlePrepareBlock(e) {
    e.preventDefault();
    showStubToast("Блокировка времени подготовлена. Дальше — запись в календарь филиала через API.");
  }
  function handlePrepareTransfer(e) {
    e.preventDefault();
    if (!transferBooking) return;
    showStubToast(
      `Перенос брони «${transferBooking.client}» подготовлен. Клиент и тренер получат уведомление после API.`,
    );
  }
  return (
    <div className="clientPage adminSlotsPage">
      <h1 className="clientPageTitle">Слоты и операции с расписанием</h1>
      <p className="clientPageLead">
        Здесь собраны формы для <strong>добавления слотов</strong>, <strong>блокировки времени</strong> и{" "}
        <strong>переноса активных броней</strong>. Сейчас данные не отправляются — интерфейс согласован с будущим
        контрактом API (валидация конфликтов, права, уведомления клиенту и тренеру).
      </p>
      <p className="clientPageLead">
        <Link to="/admin" className="clientPanelLink">
          Журнал записи
        </Link>
        {" · "}
        <Link to="/admin/bookings" className="clientPanelLink">
          Активные брони
        </Link>
        {" · "}
        <Link to="/admin/events" className="clientPanelLink">
          События и турниры
        </Link>
      </p>
      {toast ? (
        <p className="adminOpsToast" role="status">
          {toast}
        </p>
      ) : null}
      <div className="adminOpsGrid">
        <section className="clientPanel adminOpsCard">
          <h2>Новый слот / окно записи</h2>
          <p className="clientPanelHint">Создание доступного интервала с привязкой к залу и тренеру (если нужно).</p>
          <form className="adminOpsForm" onSubmit={handlePrepareSlot}>
            <label className="authField">
              <span>Дата</span>
              <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} required />
            </label>
            <div className="adminOpsFormRow">
              <label className="authField">
                <span>Начало</span>
                <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </label>
              <label className="authField">
                <span>Конец</span>
                <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </label>
            </div>
            <label className="authField">
              <span>Зал / корт</span>
              <select value={slotHallId} onChange={(e) => setSlotHallId(e.target.value)}>
                {ADMIN_SLOT_HALL_OPTIONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="authField">
              <span>Тренер (опционально)</span>
              <select value={slotTrainerId} onChange={(e) => setSlotTrainerId(e.target.value)}>
                <option value="">Без назначения</option>
                {ADMIN_STAFF_MOCK.filter((s) => s.role.includes("Тренер")).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="authField">
              <span>Комментарий</span>
              <input value={slotNote} onChange={(e) => setSlotNote(e.target.value)} placeholder="Вид занятия, уровень…" />
            </label>
            <button type="submit" className="btn btnPrimary">
              Подготовить к созданию (API)
            </button>
          </form>
        </section>
        <section className="clientPanel adminOpsCard">
          <h2>Перенос брони</h2>
          <p className="clientPanelHint">
            Выберите активную запись и новое время. После API: проверка пересечений, согласование с клиентом, запись в
            историю.
          </p>
          <form className="adminOpsForm" onSubmit={handlePrepareTransfer}>
            <label className="authField">
              <span>Бронь</span>
              <select value={transferBookingId} onChange={(e) => setTransferBookingId(e.target.value)}>
                {ADMIN_BOOKINGS_LIST_MOCK.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.time} · {b.client} · {b.hall}
                  </option>
                ))}
              </select>
            </label>
            {transferBooking ? (
              <p className="adminOpsSummary">
                Клиент: <strong>{transferBooking.client}</strong> · Тренер: {transferBooking.trainer} · Статус:{" "}
                {transferBooking.status}
              </p>
            ) : null}
            <label className="authField">
              <span>Новая дата</span>
              <input type="date" value={transferNewDate} onChange={(e) => setTransferNewDate(e.target.value)} />
            </label>
            <label className="authField">
              <span>Новое время</span>
              <input type="time" value={transferNewTime} onChange={(e) => setTransferNewTime(e.target.value)} />
            </label>
            <label className="authField">
              <span>Зал (если меняется)</span>
              <select value={transferHallId} onChange={(e) => setTransferHallId(e.target.value)}>
                {ADMIN_SLOT_HALL_OPTIONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="authField">
              <span>Причина / комментарий</span>
              <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="По просьбе клиента…" />
            </label>
            <button type="submit" className="btn btnPrimary">
              Подготовить перенос (API)
            </button>
          </form>
        </section>
        <section className="clientPanel adminOpsCard">
          <h2>Блокировка времени</h2>
          <p className="clientPanelHint">Ремонт, закрытая съёмка, турнир без онлайн-слотов — исключение из продажи.</p>
          <form className="adminOpsForm" onSubmit={handlePrepareBlock}>
            <label className="authField">
              <span>Дата</span>
              <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} required />
            </label>
            <div className="adminOpsFormRow">
              <label className="authField">
                <span>С</span>
                <input type="time" value={blockFrom} onChange={(e) => setBlockFrom(e.target.value)} />
              </label>
              <label className="authField">
                <span>По</span>
                <input type="time" value={blockTo} onChange={(e) => setBlockTo(e.target.value)} />
              </label>
            </div>
            <label className="authField">
              <span>Причина</span>
              <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
            </label>
            <label className="authField">
              <span>Залы (мультивыбор в продукте)</span>
              <select multiple className="adminOpsMulti" size={3} defaultValue={[ADMIN_SLOT_HALL_OPTIONS[0]?.id]}>
                {ADMIN_SLOT_HALL_OPTIONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btnSecondary">
              Подготовить блокировку (API)
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
