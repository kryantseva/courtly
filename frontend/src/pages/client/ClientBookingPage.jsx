import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBranchAvailability } from "../../api/branchAvailability";
import { fetchBranchRooms } from "../../api/branchRooms";
import { ApiError } from "../../api/http";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
import { getActiveBranch } from "../../utils/activeBranch";
export default function ClientBookingPage() {
  const { openDrawerWithFilters } = useBookingDrawer();
  const activeBranch = getActiveBranch();
  const branchId = activeBranch?.branchId || "";
  const [dateFilter, setDateFilter] = useState("");
  const [durationMins, setDurationMins] = useState("60");
  const [roomIdFilter, setRoomIdFilter] = useState("");
  const [rooms, setRooms] = useState( ([]));
  const [availability, setAvailability] = useState( ([]));
  const [loadPending, setLoadPending] = useState(false);
  const [error, setError] = useState("");
  const quickDates = useMemo(() => {
    const today = new Date();
    const toIso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return [
      { label: "Сегодня", value: toIso(today) },
      { label: "Завтра", value: toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) },
      { label: "Через 2 дня", value: toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)) },
      { label: "Через 3 дня", value: toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)) },
    ];
  }, []);
  useEffect(() => {
    if (!dateFilter) setDateFilter(quickDates[0]?.value ?? "");
  }, [dateFilter, quickDates]);
  useEffect(() => {
    if (!branchId) return;
    fetchBranchRooms(branchId)
      .then((data) => setRooms(Array.isArray(data.rooms) ? data.rooms : []))
      .catch(() => setRooms([]));
  }, [branchId]);
  useEffect(() => {
    if (!branchId || !dateFilter) return;
    let cancelled = false;
    setLoadPending(true);
    setError("");
    fetchBranchAvailability(branchId, {
      date: dateFilter,
      duration: Number(durationMins) || 60,
      room_id: roomIdFilter || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        const rows = [];
        const list = Array.isArray(data.rooms) ? data.rooms : [];
        for (const room of list) {
          const starts = Array.isArray(room.availableStarts) ? room.availableStarts : [];
          for (const s of starts) {
            rows.push({
              roomId: String(room.id ?? ""),
              roomLabel: String(room.label ?? ""),
              start: String(s.start ?? ""),
              end: String(s.end ?? ""),
            });
          }
        }
        setAvailability(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setAvailability([]);
          setError(e instanceof ApiError ? e.message : "Не удалось загрузить доступность");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, dateFilter, durationMins, roomIdFilter]);
  function handleChooseSlot(slot) {
    if (!branchId) return;
    setError("");
    const dur = Number(durationMins) || 60;
    openDrawerWithFilters({
      dateKey: dateFilter,
      startLabel: slot.start,
      durationMins: dur,
      hallName: slot.roomLabel,
      returnToQuickFilters: true,
    });
  }
  return (
    <div className="clientPage clientBookingPage">
      <section className="clientBookingHero">
        <div>
          <p className="clientBookingEyebrow">Онлайн-запись</p>
          <h1 className="clientPageTitle clientBookingHeroTitle">Запишитесь на корт за минуту</h1>
          <p className="clientPageLead clientBookingHeroLead">
            Выберите ближайшее окно ниже или откройте боковой календарь, чтобы подобрать дату самостоятельно.
          </p>
        </div>
        <button type="button" className="btn btnPrimary clientBookingHeroCta" onClick={() => openDrawerWithFilters()}>
          Выбрать дату в календаре
        </button>
      </section>
      {!branchId ? (
        <p className="authError">
          Сначала выберите активный филиал на <Link to="/branches">/branches</Link>.
        </p>
      ) : null}
      {error ? <p className="authError">{error}</p> : null}
      <section className="clientPanel clientPanel--schedule" id="client-booking-quick-filters">
        <h2>Быстрые фильтры</h2>
        <p className="clientPanelHint">
          Отфильтруйте ближайшие окна. Кнопка «Записаться» сразу откроет подтверждение в боковой панели.
        </p>
        <div className="clientBookingFilters">
          <label className="authField">
            <span>Длительность</span>
            <select
              className="bookingTrainerPrefSelect"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
            >
              {[30, 60, 90, 120].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} мин
                </option>
              ))}
            </select>
          </label>
          <label className="authField">
            <span>Дата</span>
            <div className="clientBookingDateInputWrap">
              <input
                type="date"
                className="bookingTrainerPrefSelect clientBookingDateInput"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="clientBookingQuickRow" role="group" aria-label="Быстрый выбор даты">
              {quickDates.map((item) => {
                const active = dateFilter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`clientBookingQuickBtn${active ? " clientBookingQuickBtn--active" : ""}`}
                    onClick={() => setDateFilter(item.value)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </label>
          <label className="authField">
            <span>Зал</span>
            <select
              className="bookingTrainerPrefSelect"
              value={roomIdFilter}
              onChange={(e) => setRoomIdFilter(e.target.value)}
            >
              <option value="">Любой</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="clientPanel clientBookingSlotsPanel" id="client-booking-slots">
        <h2>Свободные окна</h2>
        {loadPending ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : availability.length > 0 ? (
          <ul className="clientList">
            {availability.map((slot, i) => (
              <li key={`${slot.roomId}-${slot.start}-${i}`} className="clientListItem">
                <div>
                  <span className="clientListTitle">
                    {slot.start} — {slot.end}
                  </span>
                  <span className="clientListMeta">{slot.roomLabel}</span>
                </div>
                <button
                  type="button"
                  className="clientPanelLink"
                  disabled={!branchId}
                  onClick={() => handleChooseSlot(slot)}
                >
                  Записаться
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="clientEmpty">Подходящих окон нет. Измените фильтры и попробуйте снова.</p>
        )}
      </section>
    </div>
  );
}
