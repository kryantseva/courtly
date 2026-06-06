import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyTrainerBookings } from "../../api/trainerCabinet";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
import { sessionOutcomeLabel } from "../../utils/trainerSessionOutcome";
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOfWeek(base) {
  const d = new Date(base);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d;
}
const WD_LABEL = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export default function TrainerSchedulePage() {
  const branchId = getActiveBranch()?.branchId || "";
  const [rows, setRows] = useState( ([]));
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");
  const week = useMemo(() => {
    const start = mondayOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);
  const range = useMemo(() => {
    const start = week[0];
    const end = week[6];
    return { from: isoDate(start), to: isoDate(end) };
  }, [week]);
  useEffect(() => {
    let cancelled = false;
    setLoad(true);
    setErr("");
    fetchMyTrainerBookings({
      from: range.from,
      to: range.to,
      branch_id: branchId || undefined,
      limit: 200,
      offset: 0,
    })
      .then((body) => {
        if (cancelled) return;
        setRows(Array.isArray(body.data) ? body.data : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setErr(e instanceof ApiError ? e.message : "Не удалось загрузить расписание");
        }
      })
      .finally(() => {
        if (!cancelled) setLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, branchId]);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const d of week) m.set(isoDate(d), []);
    for (const b of rows) {
      const ds = String(b.date ?? "");
      if (!m.has(ds)) continue;
      m.get(ds).push(b);
    }
    for (const list of m.values()) {
      list.sort((a, b) => String(a.time ?? "").localeCompare(String(b.time ?? "")));
    }
    return m;
  }, [rows, week]);
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Календарь тренера</h1>
      <p className="clientPageLead">
        Неделя ваших занятий с сервера. Свободные слоты филиала настраиваются отдельно; ваши окна доступности влияют на
        выдачу слотов при параметре <code className="authCode">trainer_user_id</code> в API доступности.
      </p>
      {!branchId ? (
        <p className="clientPanelHint" role="note">
          Филиал не выбран — показана сводка по всем филиалам.{" "}
          <Link to="/branches">Выбрать филиал</Link>.
        </p>
      ) : null}
      {err ? (
        <p className="authError" role="alert">
          {err}
        </p>
      ) : null}
      <section className="clientPanel">
        <div className="clientPanelHead">
          <h2>Неделя</h2>
          <Link to="/trainer/sessions" className="clientPanelLink">
            Все записи
          </Link>
        </div>
        {load ? (
          <p className="clientEmpty">Загрузка…</p>
        ) : (
          <ul className="trainerCalendarWeek">
            {week.map((d) => {
              const key = isoDate(d);
              const dayRows = byDay.get(key) || [];
              const loadPct = Math.min(100, dayRows.length * 15);
              return (
                <li key={key} className="trainerCalendarDay">
                  <div className="trainerCalendarDayHead">
                    <span className="trainerCalendarDayLabel">
                      {WD_LABEL[(d.getDay() + 6) % 7]}{" "}
                      <span className="trainerCalendarDayDate">{key}</span>
                    </span>
                    <span className="trainerCalendarLoad">{dayRows.length} занятий</span>
                  </div>
                  <div className="trainerCalendarLoadBar" aria-hidden>
                    <span className="trainerCalendarLoadFill" style={{ width: `${loadPct}%` }} />
                  </div>
                  <div className="trainerCalendarSegments">
                    {dayRows.length === 0 ? (
                      <span className="trainerCalendarSeg trainerCalendarSeg--free">
                        <span className="trainerCalendarSegRange">Нет назначенных занятий</span>
                      </span>
                    ) : (
                      dayRows.map((s) => (
                        <span key={String(s.id)} className="trainerCalendarSeg trainerCalendarSeg--busy">
                          <span className="trainerCalendarSegRange">{String(s.time ?? "")}</span>
                          <span className="trainerCalendarSegLabel">
                            {String(s.client ?? "")} · {sessionOutcomeLabel(String(s.sessionOutcome ?? ""))}
                          </span>
                          <Link to={`/trainer/sessions/${encodeURIComponent(String(s.id))}`} className="clientPanelLink">
                            карточка
                          </Link>
                        </span>
                      ))
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p>
        <Link to="/trainer/availability" className="clientPanelLink">
          Настроить доступность
        </Link>
      </p>
    </div>
  );
}
