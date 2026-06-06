import { Link, useParams } from "react-router-dom";
import { CLIENT_HALL_FREE_SLOTS, CLIENT_HALLS } from "../../data/clientScheduleMock";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
import { formatSelectedDateRu } from "../../components/booking/bookingCalendar";
import { formatDurationRu, getSlotDurationMeta } from "../../services/bookingData";
export default function ClientHallPage() {
  const { hallId } = useParams();
  const { openDrawerWithFilters } = useBookingDrawer();
  const hall = CLIENT_HALLS.find((h) => h.id === hallId);
  const slots = hall ? CLIENT_HALL_FREE_SLOTS[hall.id] ?? [] : [];
  function getHallSlotMeta(slot) {
    if (!hall) return { maxDurationMins: 0, freeUntilLabel: null };
    return getSlotDurationMeta(slot.dateKey, hall.name, slot.label);
  }
  if (!hall) {
    return (
      <div className="clientPage">
        <p className="clientPageLead">Площадка не найдена.</p>
        <Link to="/app/booking" className="btn btnSecondary">
          К записи
        </Link>
      </div>
    );
  }
  return (
    <div className="clientPage">
      <nav className="clientBreadcrumb" aria-label="Навигация">
        <Link to="/app/booking">Запись</Link>
        <span aria-hidden="true"> / </span>
        <span>{hall.name}</span>
      </nav>
      <h1 className="clientPageTitle">{hall.name}</h1>
      <p className="clientPageLead">
        <span className="clientHallKind">{hall.kind}</span> · {hall.description}
      </p>
      <section className="clientPanel clientPanel--schedule">
        <div className="clientPanelHead">
          <h2>Доступное время (демо)</h2>
          <button
            type="button"
            className="clientPanelLink"
            onClick={() => openDrawerWithFilters({ hallName: hall.name })}
          >
            Записаться в этот зал
          </button>
        </div>
        {slots.length === 0 ? (
          <p className="clientEmpty">Нет слотов в демо — откройте календарь записи.</p>
        ) : (
          <ul className="clientList">
            {slots.map((s, i) => {
              const durationMeta = getHallSlotMeta(s);
              return (
                <li key={`${s.dateKey}-${s.label}-${i}`} className="clientListItem">
                  <div>
                    <span className="clientListTitle">
                      {formatSelectedDateRu(s.dateKey)} · {s.label}
                      {durationMeta.freeUntilLabel ? ` (свободно до ${durationMeta.freeUntilLabel})` : ""}
                    </span>
                    <span className="clientListMeta">
                      {hall.name}
                      {durationMeta.maxDurationMins ? ` · макс. ${formatDurationRu(durationMeta.maxDurationMins)}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="clientPanelLink"
                    onClick={() => openDrawerWithFilters({ hallName: hall.name })}
                  >
                    Выбрать
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
