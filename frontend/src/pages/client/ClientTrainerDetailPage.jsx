import { Link, useParams } from "react-router-dom";
import { getTrainerPhotoFallback, TRAINERS_PUBLIC } from "../../services/bookingData";
import { CLIENT_TRAINER_FREE_SLOTS } from "../../data/clientScheduleMock";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
import { formatSelectedDateRu } from "../../components/booking/bookingCalendar";
export default function ClientTrainerDetailPage() {
  const { trainerId } = useParams();
  const { openDrawerForTrainer } = useBookingDrawer();
  const trainer = TRAINERS_PUBLIC.find((t) => t.id === trainerId);
  const slots = trainer ? CLIENT_TRAINER_FREE_SLOTS[trainer.id] ?? [] : [];
  if (!trainer) {
    return (
      <div className="clientPage">
        <p className="clientPageLead">Тренер не найден.</p>
        <Link to="/app/trainers" className="btn btnSecondary">
          К списку тренеров
        </Link>
      </div>
    );
  }
  return (
    <div className="clientPage">
      <nav className="clientBreadcrumb" aria-label="Навигация">
        <Link to="/app/trainers">Наши тренера</Link>
        <span aria-hidden="true"> / </span>
        <span>{trainer.name}</span>
      </nav>
      <article className="clientTrainerDetail">
        <div className="clientTrainerDetailHero">
          <img
            className="clientTrainerDetailPhoto"
            src={trainer.photoUrl}
            alt={`Фотография: ${trainer.name}`}
            width={720}
            height={540}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getTrainerPhotoFallback(trainer.name);
            }}
          />
          <div className="clientTrainerDetailHeroText">
            <h1 className="clientPageTitle clientTrainerDetailTitle">{trainer.name}</h1>
            <p className="clientTrainerDetailTags">{trainer.hint}</p>
            <p className="clientPageLead">{trainer.bio}</p>
            <button type="button" className="btn btnPrimary" onClick={() => openDrawerForTrainer(trainer.id)}>
              Записаться к тренеру
            </button>
          </div>
        </div>
        <section className="clientPanel">
          <h2>Опыт и достижения</h2>
          <p className="clientPanelHint">{trainer.experience}</p>
          <p className="clientPanelHint">{trainer.achievements}</p>
        </section>
        <section className="clientPanel clientPanel--accent">
          <div className="clientPanelHead">
            <h2>Свободные слоты</h2>
            <span className="clientPanelHint">Демо-расписание; в продукте подтянется из API</span>
          </div>
          {slots.length === 0 ? (
            <p className="clientEmpty">Сейчас нет ближайших окон в моке — откройте запись и выберите дату.</p>
          ) : (
            <ul className="clientList">
              {slots.map((s, i) => (
                <li key={`${s.dateKey}-${s.label}-${i}`} className="clientListItem">
                  <div>
                    <span className="clientListTitle">
                      {formatSelectedDateRu(s.dateKey)} · {s.label}
                    </span>
                    <span className="clientListMeta">{s.hallName}</span>
                  </div>
                  <button type="button" className="clientPanelLink" onClick={() => openDrawerForTrainer(trainer.id)}>
                    Записаться
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </div>
  );
}
