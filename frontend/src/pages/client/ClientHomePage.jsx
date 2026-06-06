import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_RECOMMENDED_TRAINER_IDS } from "../../data/clientScheduleMock";
import {
  TRAINERS_PUBLIC,
  getTrainerPhotoFallback,
} from "../../services/bookingData";
import { apiMe } from "../../api/auth";
import { fetchMyBookings } from "../../api/me";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
import { segmentFromApiTime, toneFromApiStatus } from "../../utils/apiBookingTime";
const TONE_CLASS = {
  ok: "",
  warn: " clientHistoryBadge--warn",
  muted: " clientHistoryBadge--muted",
  cancel: " clientHistoryBadge--cancel",
};
function isoDatePlusDays(base, deltaDays) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export default function ClientHomePage() {
  const recommended = CLIENT_RECOMMENDED_TRAINER_IDS.map((id) => TRAINERS_PUBLIC.find((t) => t.id === id)).filter(
    Boolean,
  );
  const [meName, setMeName] = useState("");
  const [apiUpcoming, setApiUpcoming] = useState( ([]));
  const [homeLoad, setHomeLoad] = useState(false);
  const [homeErr, setHomeErr] = useState( (null));
  useEffect(() => {
    let cancelled = false;
    setHomeErr(null);
    setHomeLoad(true);
    apiMe()
      .then((data) => {
        if (!cancelled && data?.user?.name) setMeName(String(data.user.name));
      })
      .catch(() => {
        if (!cancelled) setMeName("");
      });
    const bid = getActiveBranch()?.branchId || undefined;
    const today = new Date();
    const from = isoDatePlusDays(today, -7);
    const to = isoDatePlusDays(today, 120);
    fetchMyBookings({ from, to, branch_id: bid, limit: 8, offset: 0 })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.bookings) ? data.bookings : [];
        const mapped = list
          .map((b) => {
            const kind = String(b.kind ?? "lesson");
            const hall = String(b.hall ?? "");
            const time = String(b.time ?? "");
            const status = String(b.status ?? "—");
            const date = String(b.date ?? "");
            return {
              id: String(b.id ?? ""),
              title: `${kind === "group" ? "Групповое" : "Запись"} · ${hall}`,
              when: time,
              place: hall,
              status,
              tone: toneFromApiStatus(status),
              seg: segmentFromApiTime(time),
              date,
            };
          })
          .filter((r) => r.seg === "upcoming")
          .sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return cmp;
            return a.id.localeCompare(b.id);
          })
          .slice(0, 8);
        setApiUpcoming(mapped);
      })
      .catch((e) => {
        if (!cancelled) {
          setApiUpcoming([]);
          setHomeErr(e instanceof ApiError ? e.message : "Не удалось загрузить записи");
        }
      })
      .finally(() => {
        if (!cancelled) setHomeLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const upcomingRows = apiUpcoming;
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">{meName ? `Здравствуйте, ${meName}` : "Главная"}</h1>
      <p className="clientPageLead">
        Ближайшие записи, рекомендации и быстрый переход к серверному календарю доступности.
      </p>
      {!getActiveBranch()?.branchId ? (
        <p className="clientPanelHint" role="note">
          Филиал не выбран: показаны ближайшие ваши записи по всем филиалам. Можно выбрать конкретный на{" "}
          <Link to="/branches">/branches</Link>.
        </p>
      ) : null}
      {homeErr ? (
        <p className="authError" role="alert">
          {homeErr}
        </p>
      ) : null}
      <section className="clientPanel clientPanel--accent clientNextSlotPanel">
        <div className="clientPanelHead">
          <h2>Запись по серверной доступности</h2>
          <Link to="/app/booking" className="clientPanelLink">
            Открыть
          </Link>
        </div>
        <p className="clientPanelHint">
          Выбор слота и подтверждение записи выполняются только через API доступности и бронирования.
        </p>
      </section>
      <section className="clientPanel">
        <div className="clientPanelHead">
          <h2>События филиала</h2>
          <Link to="/app/events" className="clientPanelLink">
            Смотреть все
          </Link>
        </div>
        <p className="clientPanelHint">Турниры, открытые дни и другие мероприятия — даты и площадки в одном списке.</p>
      </section>
      <section className="clientPanel clientPanel--schedule">
        <div className="clientPanelHead">
          <h2>Календарь доступности</h2>
          <Link to="/app/booking" className="clientPanelLink">
            Все слоты
          </Link>
        </div>
        <p className="clientPanelHint">
          Подбор свободных окон и создание записи доступны на странице бронирования.
        </p>
        <Link to="/app/booking" className="btn btnSecondary">
          Перейти к слотам
        </Link>
      </section>
      <section className="clientPanel">
        <div className="clientPanelHead">
          <h2>Рекомендуем тренеров</h2>
          <Link to="/app/trainers" className="clientPanelLink">
            Все тренеры
          </Link>
        </div>
        <ul className="clientRecommendList">
          {recommended.map((t) =>
            t ? (
              <li key={t.id}>
                <Link to={`/app/trainers/${t.id}`} className="clientRecommendCard">
                  <img
                    src={t.photoUrl}
                    alt=""
                    className="clientRecommendPhoto"
                    width={56}
                    height={56}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getTrainerPhotoFallback(t.name);
                    }}
                  />
                  <div>
                    <span className="clientRecommendName">{t.name}</span>
                    <span className="clientRecommendHint">{t.hint}</span>
                  </div>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      </section>
      <section className="clientPanel clientPanel--schedule">
        <div className="clientPanelHead">
          <h2>Предстоящие записи</h2>
          <Link to="/app/booking" className="clientPanelLink">
            Новая запись
          </Link>
        </div>
        {homeLoad ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : upcomingRows.length === 0 ? (
          <p className="clientEmpty">
            Нет предстоящих записей. Запишитесь через кнопку ниже или на странице «Запись».
          </p>
        ) : (
          <ul className="clientList">
            {upcomingRows.map((item) => (
              <li key={item.id} className="clientListItem">
                <div>
                  <Link to={`/app/bookings/${item.id}`} className="clientListTitle clientListTitle--link">
                    {item.title}
                  </Link>
                  <span className="clientListMeta">{item.when}</span>
                </div>
                <span className={`clientHistoryBadge${TONE_CLASS[item.tone] || ""}`}>{item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="clientPanel clientPanel--accent">
        <h2>Нужен другой слот?</h2>
        <p className="clientPanelHint">Откройте календарь записи или страницу «Запись» с фильтрами по залу и тренеру.</p>
        <div className="clientBookingActions clientBookingActions--tight">
          <Link to="/app/booking" className="btn btnPrimary">Открыть запись</Link>
          <Link to="/app/booking" className="btn btnSecondary">
            Страница бронирования
          </Link>
        </div>
      </section>
    </div>
  );
}
