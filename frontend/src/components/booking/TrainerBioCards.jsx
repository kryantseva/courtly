import { Link } from "react-router-dom";
import { getTrainerPhotoFallback, TRAINERS_PUBLIC } from "../../services/bookingData";
export default function TrainerBioCards({ onBookTrainer }) {
  return (
    <div className="bookingTrainerBioList">
      {TRAINERS_PUBLIC.map((t) => (
        <article key={t.id} className="bookingTrainerBioCard">
          <div className="bookingTrainerBioPhotoWrap">
            <img
              className="bookingTrainerBioPhoto"
              src={t.photoUrl}
              alt={`Фотография: ${t.name}`}
              width={720}
              height={540}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getTrainerPhotoFallback(t.name);
              }}
            />
          </div>
          <div className="bookingTrainerBioCardBody">
            <h3 className="bookingTrainerBioName">
              <Link to={`/app/trainers/${t.id}`} className="bookingTrainerBioNameLink">
                {t.name}
              </Link>
            </h3>
            <p className="bookingTrainerBioTags">{t.hint}</p>
            <p className="bookingTrainerBioText">{t.bio}</p>
            <div className="bookingTrainerBioBlock">
              <span className="bookingTrainerBioBlockLabel">Опыт</span>
              <p className="bookingTrainerBioBlockText">{t.experience}</p>
            </div>
            <div className="bookingTrainerBioBlock">
              <span className="bookingTrainerBioBlockLabel">Достижения</span>
              <p className="bookingTrainerBioBlockText">{t.achievements}</p>
            </div>
            <div className="bookingTrainerBioActions">
              <Link to={`/app/trainers/${t.id}`} className="btn btnSecondary bookingTrainerBioDetailBtn">
                Профиль и слоты
              </Link>
              <button type="button" className="bookingTrainerBioBookBtn" onClick={() => onBookTrainer(t.id)}>
                Записаться к тренеру
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
