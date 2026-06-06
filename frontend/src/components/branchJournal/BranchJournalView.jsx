import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ADMIN_EVENT_KIND_LABELS } from "../../data/adminOperationsMock";
import {
  BRANCH_JOURNAL_CALENDAR_HEAD,
  BRANCH_JOURNAL_DAY_END_HOUR,
  BRANCH_JOURNAL_DAY_START_HOUR,
  BRANCH_JOURNAL_FALLBACK_COURTS,
  BRANCH_JOURNAL_SLOT_MINUTES,
  filterJournalBookingsForCourts,
} from "../../data/branchJournalMock";
import BranchJournalRecordModal from "./BranchJournalRecordModal";
const ZOOM_LEVELS = [10, 12, 14, 16, 19, 22, 26];
const ZOOM_DEFAULT_INDEX = 2;
const MONTH_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const MONTH_NOM = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
function pad2(n) {
  return String(n).padStart(2, "0");
}
function bookingsWordRu(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "бронирование";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "бронирования";
  return "бронирований";
}
function formatRange(startMin, endMin) {
  const sh = Math.floor(startMin / 60);
  const sm = startMin % 60;
  const eh = Math.floor(endMin / 60);
  const em = endMin % 60;
  return `${pad2(sh)}:${pad2(sm)} – ${pad2(eh)}:${pad2(em)}`;
}
function slotOccupied(colIdx, slotStart, slotEnd, list) {
  return list.some((b) => b.courtIndex === colIdx && b.startMin < slotEnd && b.endMin > slotStart);
}
function shiftCalendarDay(date, deltaDays) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaDays);
  return d;
}
function parseIsoToLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export default function BranchJournalView({
  branchName,
  courts: courtsProp,
  readOnly = false,
  demoRevenueLabel = "117 875 ₽",
  journalBookings = undefined,
  baseDate,
  onBaseDateChange,
  journalLoading = false,
  journalError = null,
  dayStartHour: dayStartHourProp,
  dayEndHour: dayEndHourProp,
  slotMinutes: slotMinutesProp,
  apiCreateBranchId = null,
  onJournalRefresh,
  journalEvents = undefined,
  onViewModeChange,
  weekSummaries = null,
  weekConflictEvents = null,
  weekStripLoading = false,
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState( ("day"));
  const [demoSelectedDay, setDemoSelectedDay] = useState(BRANCH_JOURNAL_CALENDAR_HEAD.selectedDay);
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const startHour = dayStartHourProp ?? BRANCH_JOURNAL_DAY_START_HOUR;
  const endHour = dayEndHourProp ?? BRANCH_JOURNAL_DAY_END_HOUR;
  const slotMinutes = slotMinutesProp ?? BRANCH_JOURNAL_SLOT_MINUTES;
  const [newRecordDraft, setNewRecordDraft] = useState({
    courtIndex: 0,
    startMin: startHour * 60,
    endMin: startHour * 60 + 60,
  });
  const [readOnlyTip, setReadOnlyTip] = useState( (null));
  const [zoomIndex, setZoomIndex] = useState(ZOOM_DEFAULT_INDEX);
  const slotPx = ZOOM_LEVELS[Math.min(zoomIndex, ZOOM_LEVELS.length - 1)];
  const liveCalendar = baseDate instanceof Date && typeof onBaseDateChange === "function";
  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);
  const courts = useMemo(() => {
    if (Array.isArray(courtsProp) && courtsProp.length > 0) return courtsProp;
    return BRANCH_JOURNAL_FALLBACK_COURTS;
  }, [courtsProp]);
  const bookings = useMemo(() => {
    if (Array.isArray(journalBookings)) return journalBookings;
    return filterJournalBookingsForCourts(courts.length);
  }, [journalBookings, courts.length]);
  const dayStartMin = startHour * 60;
  const dayEndMin = endHour * 60;
  const slotCount = (dayEndMin - dayStartMin) / slotMinutes;
  const columnHeight = slotCount * slotPx;
  const timeLabels = useMemo(() => {
    const out = [];
    for (let m = dayStartMin; m < dayEndMin; m += slotMinutes) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      out.push({ key: m, label: mm === 0 ? `${pad2(h)}:00` : `${pad2(h)}:${pad2(mm)}` });
    }
    return out;
  }, [dayStartMin, dayEndMin, slotMinutes]);
  const viewYear = liveCalendar ? baseDate.getFullYear() : BRANCH_JOURNAL_CALENDAR_HEAD.year;
  const viewMonth = liveCalendar ? baseDate.getMonth() : BRANCH_JOURNAL_CALENDAR_HEAD.month;
  const selectedDayOfMonth = liveCalendar ? baseDate.getDate() : demoSelectedDay;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dateLabel = `${pad2(selectedDayOfMonth)}.${pad2(viewMonth + 1)}.${viewYear}`;
  const dateLongLabel = `${selectedDayOfMonth} ${MONTH_GEN[viewMonth]} ${viewYear}`;
  const sideCalHead = liveCalendar ? `${MONTH_NOM[viewMonth]} ${viewYear}` : BRANCH_JOURNAL_CALENDAR_HEAD.monthLabel;
  const journalIsoDate = liveCalendar ? `${viewYear}-${pad2(viewMonth + 1)}-${pad2(selectedDayOfMonth)}` : null;
  function setSelectedDayNav(nextDayOfMonth) {
    if (liveCalendar) {
      onBaseDateChange(new Date(viewYear, viewMonth, nextDayOfMonth));
      return;
    }
    setDemoSelectedDay(nextDayOfMonth);
  }
  function goPrevDay() {
    if (liveCalendar) {
      onBaseDateChange(shiftCalendarDay(baseDate, -1));
      return;
    }
    setDemoSelectedDay((d) => Math.max(1, d - 1));
  }
  function goNextDay() {
    if (liveCalendar) {
      onBaseDateChange(shiftCalendarDay(baseDate, 1));
      return;
    }
    setDemoSelectedDay((d) => Math.min(30, d + 1));
  }
  function goToday() {
    if (liveCalendar) {
      onBaseDateChange(new Date());
      return;
    }
    setDemoSelectedDay(BRANCH_JOURNAL_CALENDAR_HEAD.selectedDay);
  }
  const daySummary = useMemo(() => {
    return [...bookings].sort((a, b) => a.startMin - b.startMin || a.courtIndex - b.courtIndex);
  }, [bookings]);
  const gridTemplateColumns = `36px repeat(${courts.length}, minmax(52px, 1fr))`;
  function handleBookingClick(b) {
    if (readOnly) {
      setReadOnlyTip(`${b.client} · ${courts[b.courtIndex]?.label ?? ""} · ${formatRange(b.startMin, b.endMin)}`);
      return;
    }
    if (b.adminBookingPath) {
      navigate(b.adminBookingPath);
      return;
    }
  }
  function openNewSlot(courtIndex, startMin) {
    if (readOnly) return;
    const endMin = startMin + 60;
    setNewRecordDraft({ courtIndex, startMin, endMin });
    setNewRecordOpen(true);
  }
  return (
    <div className={`branchJournal branchJournal--viewportFit${readOnly ? " branchJournal--readOnly" : ""}`}>
      <header className="branchJournalTop">
        <div className="branchJournalBreadcrumb">
          <span className="branchJournalCrumbMuted">Журнал записи</span>
          <span className="branchJournalCrumbSep" aria-hidden>
            /
          </span>
          <span className="branchJournalCrumbStrong">{branchName}</span>
          {readOnly ? <span className="branchJournalReadOnlyPill">Просмотр</span> : null}
        </div>
        <div className="branchJournalToolbar">
          <input type="search" className="branchJournalSearch" placeholder="Поиск клиента, телефона…" disabled />
          <div className="branchJournalDateNav">
            <button type="button" className="branchJournalIconBtn" aria-label="Предыдущий день" onClick={goPrevDay}>
              ‹
            </button>
            <button type="button" className="branchJournalTodayBtn" onClick={goToday}>
              Сегодня
            </button>
            <span className="branchJournalDateBesideToday">{dateLongLabel}</span>
            <button type="button" className="branchJournalIconBtn" aria-label="Следующий день" onClick={goNextDay}>
              ›
            </button>
          </div>
          <div className="branchJournalZoom" title="Масштаб: ближе / дальше">
            <button
              type="button"
              className="branchJournalZoomBtn"
              aria-label="Дальше (меньше ячейки)"
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              disabled={zoomIndex <= 0}
            >
              −
            </button>
            <span className="branchJournalZoomLabel">{Math.round((slotPx / ZOOM_LEVELS[ZOOM_DEFAULT_INDEX]) * 100)}%</span>
            <button
              type="button"
              className="branchJournalZoomBtn"
              aria-label="Ближе (крупнее ячейки)"
              onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
              disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
            >
              +
            </button>
          </div>
          <span className="branchJournalRevenue" title="Демо-агрегат за день">
            {demoRevenueLabel}
          </span>
          <div className="branchJournalViewToggle" role="group" aria-label="Вид: день или неделя">
            <button
              type="button"
              className={viewMode === "day" ? "branchJournalViewBtn branchJournalViewBtn--on" : "branchJournalViewBtn"}
              onClick={() => setViewMode("day")}
            >
              День
            </button>
            <button
              type="button"
              className={viewMode === "week" ? "branchJournalViewBtn branchJournalViewBtn--on" : "branchJournalViewBtn"}
              onClick={() => setViewMode("week")}
            >
              Неделя
            </button>
          </div>
        </div>
      </header>
      {journalError ? (
        <p className="branchJournalApiError" role="alert">
          {journalError}
        </p>
      ) : null}
      {viewMode === "week" && liveCalendar && (weekStripLoading || Array.isArray(weekSummaries)) ? (
        <section className="branchJournalWeekStrip" aria-label="Неделя: сводка по дням">
          {weekStripLoading || !Array.isArray(weekSummaries) ? (
            <p className="branchJournalWeekLoading">Загрузка недели…</p>
          ) : (
            <>
              <div className="branchJournalWeekStripInner">
                {weekSummaries.map((d) => (
                  <button
                    key={d.isoDate}
                    type="button"
                    className={`branchJournalWeekDay${d.isSelected ? " branchJournalWeekDay--selected" : ""}`}
                    onClick={() => onBaseDateChange?.(parseIsoToLocalDate(d.isoDate))}
                  >
                    <span className="branchJournalWeekDayDow">{d.weekdayShort}</span>
                    <span className="branchJournalWeekDayNum">{d.dayNum}</span>
                    <span className="branchJournalWeekDayCounts">
                      {d.bookingCount} бр.
                      {d.conflictCount > 0 ? ` · ⚠ ${d.conflictCount}` : ""}
                    </span>
                  </button>
                ))}
              </div>
              {Array.isArray(weekConflictEvents) && weekConflictEvents.length > 0 ? (
                <div className="branchJournalWeekConflicts" role="region" aria-label="Конфликты за неделю">
                  <strong className="branchJournalWeekConflictsTitle">
                    Конфликты недели: события пересекаются с бронями на корте
                  </strong>
                  <ul className="branchJournalWeekConflictsList">
                    {weekConflictEvents.map((c, idx) => (
                      <li key={`${c.isoDate}-${c.id}-${idx}`} className="branchJournalWeekConflictItem">
                        <span className="branchJournalWeekConflictDate">{c.dateLabel}</span>
                        <span>{c.title}</span>
                        {c.roomLabel ? (
                          <span className="branchJournalWeekConflictRoom"> · {c.roomLabel}</span>
                        ) : null}
                        {typeof c.overlapBookingCount === "number" ? (
                          <span className="branchJournalWeekConflictCnt"> ({c.overlapBookingCount} броней)</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="branchJournalWeekNoConflicts">За эту неделю пересечений событий с бронями не найдено.</p>
              )}
            </>
          )}
        </section>
      ) : null}
      {liveCalendar && Array.isArray(journalEvents) && journalEvents.length > 0 ? (
        <section className="branchJournalDayEvents" aria-label="События филиала в выбранный день">
          <div className="branchJournalDayEventsHead">
            <span className="branchJournalDayEventsTitle">События в этот день</span>
            {!readOnly ? (
              <Link to="/admin/events" className="branchJournalDayEventsAllLink clientPanelLink">
                Все события
              </Link>
            ) : null}
          </div>
          <ul className="branchJournalDayEventsList">
            {journalEvents.map((ev) => {
              const kindLabel = ADMIN_EVENT_KIND_LABELS[ev.kind] ?? ev.kind;
              const range =
                ev.startLabel && ev.endLabel && ev.startLabel !== ev.endLabel
                  ? `${ev.startLabel} — ${ev.endLabel}`
                  : ev.startLabel || ev.endLabel || "";
              return (
                <li key={ev.id} className="branchJournalDayEventCard">
                  <div className="branchJournalDayEventMain">
                    <span className="branchJournalDayEventKind">{kindLabel}</span>
                    <strong className="branchJournalDayEventTitle">{ev.title}</strong>
                    {range ? <span className="branchJournalDayEventRange">{range}</span> : null}
                    {ev.status ? <span className="branchJournalDayEventStatus">{ev.status}</span> : null}
                    {readOnly && ev.viewerIsRegistered ? (
                      <span className="branchJournalDayEventYouRegistered">Вы записаны</span>
                    ) : null}
                    {readOnly && !ev.viewerIsRegistered && ev.viewerIsOnWaitlist ? (
                      <span className="branchJournalDayEventWaitlist">В листе ожидания</span>
                    ) : null}
                    {ev.roomLabel ? (
                      <span className="branchJournalDayEventVenue branchJournalDayEventRoom">Зал: {ev.roomLabel}</span>
                    ) : null}
                    {ev.venue ? <span className="branchJournalDayEventVenue">{ev.venue}</span> : null}
                    {ev.roomBookingOverlap && typeof ev.overlapBookingCount === "number" ? (
                      <p className="branchJournalDayEventOverlap" role="status">
                        На этом корте в журнале на выбранный день: {ev.overlapBookingCount}{" "}
                        {bookingsWordRu(ev.overlapBookingCount)}
                        {ev.journalBlockRangeLabel
                          ? ` (пересечение по времени в интервале ${ev.journalBlockRangeLabel})`
                          : " (учтены все брони за день)"}
                        .
                      </p>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <div className="branchJournalDayEventActions">
                      <Link to="/admin/events" className="btn btnSecondary branchJournalDayEventBtn">
                        Список
                      </Link>
                      {ev.kind === "tournament" ? (
                        <Link to={`/admin/events/${ev.id}/bracket`} className="btn btnSecondary branchJournalDayEventBtn">
                          Сетка
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <div className="branchJournalBody branchJournalBody--withSidebar">
        <aside className="branchJournalSidebar" aria-label="Календарь и сводка дня">
          <div className="branchJournalSideCalHead">{sideCalHead}</div>
          <div className="branchJournalMiniWeek">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <span key={d} className="branchJournalMiniWeekD">
                {d}
              </span>
            ))}
          </div>
          <div className="branchJournalMiniGrid">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isSel = day === selectedDayOfMonth;
              return (
                <button
                  key={day}
                  type="button"
                  className={`branchJournalMiniDay${isSel ? " branchJournalMiniDay--selected" : ""}`}
                  onClick={() => setSelectedDayNav(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="branchJournalDaySummary">
            <h3 className="branchJournalDaySummaryTitle">Записи на {dateLabel}</h3>
            <ul className="branchJournalDaySummaryList">
              {journalLoading ? (
                <li className="branchJournalDaySummaryEmpty">Загрузка…</li>
              ) : daySummary.length === 0 ? (
                <li className="branchJournalDaySummaryEmpty">Нет записей</li>
              ) : (
                daySummary.map((b) => (
                  <li key={b.id} className="branchJournalDaySummaryItem">
                    <button
                      type="button"
                      className="branchJournalDaySummaryBtn"
                      title={readOnly ? "Просмотр" : "Подробнее: бронь, клиент и оплата"}
                      onClick={() => handleBookingClick(b)}
                    >
                      <span className="branchJournalDaySummaryTime">{formatRange(b.startMin, b.endMin)}</span>
                      <span className="branchJournalDaySummaryCourt">{courts[b.courtIndex]?.label}</span>
                      <span className="branchJournalDaySummaryName">{b.client}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
        <div className="branchJournalMain branchJournalMain--gridOnly">
          <div className={`branchJournalGridWrap${journalLoading ? " branchJournalGridWrap--loading" : ""}`}>
            <div
              className="branchJournalGrid"
              style={{ gridTemplateColumns, "--bj-slot": `${slotPx}px` }}
            >
              <div className="branchJournalGridCorner" />
              <div className="branchJournalCourtHeads">
                {courts.map((c) => (
                  <div key={c.id} className="branchJournalCourtHead">
                    <span className="branchJournalCourtIcon" aria-hidden>
                      ◎
                    </span>
                    <span className="branchJournalCourtTitle">{c.label}</span>
                  </div>
                ))}
              </div>
              <div className="branchJournalTimeCol" style={{ height: columnHeight }}>
                {timeLabels.map((t) => (
                  <div key={t.key} className="branchJournalTimeCell" style={{ height: slotPx }}>
                    {t.label}
                  </div>
                ))}
              </div>
              <div className="branchJournalCourtsArea">
                {courts.map((c, colIdx) => (
                  <div key={c.id} className="branchJournalCourtCol" style={{ height: columnHeight }}>
                    <div className="branchJournalCourtGridBg" />
                    {!readOnly
                      ? timeLabels.map((t) => {
                          const slotEnd = t.key + slotMinutes;
                          if (slotOccupied(colIdx, t.key, slotEnd, bookings)) return null;
                          return (
                            <button
                              key={t.key}
                              type="button"
                              className="branchJournalEmptySlot"
                              style={{ top: ((t.key - dayStartMin) / slotMinutes) * slotPx, height: slotPx }}
                              title="Новая запись"
                              onClick={() => openNewSlot(colIdx, t.key)}
                            />
                          );
                        })
                      : null}
                    {bookings
                      .filter((b) => b.courtIndex === colIdx)
                      .map((b) => {
                        const top = ((b.startMin - dayStartMin) / slotMinutes) * slotPx;
                        const h = ((b.endMin - b.startMin) / slotMinutes) * slotPx;
                        const inner = (
                          <>
                            <div className="branchJournalCardTop">
                              <span className="branchJournalCardTime">{formatRange(b.startMin, b.endMin)}</span>
                              <span className="branchJournalCardIcons">
                                {b.paid ? (
                                  <span className="branchJournalIconPaid" title="Оплата">
                                    ₽
                                  </span>
                                ) : null}
                                {b.confirmed ? (
                                  <span className="branchJournalIconOk" title="Подтверждено">
                                    ✓
                                  </span>
                                ) : null}
                              </span>
                            </div>
                            <div className="branchJournalCardName">{b.client}</div>
                            {b.phone ? <div className="branchJournalCardPhone">{b.phone}</div> : null}
                            <div className="branchJournalCardService">{b.service}</div>
                          </>
                        );
                        const className = `branchJournalCard branchJournalCard--${b.tone}`;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={className}
                            style={{ top, height: Math.max(h - 2, slotPx - 2) }}
                            title={readOnly ? "Просмотр записи" : "Подробнее: бронь, клиент и оплата"}
                            onClick={() => handleBookingClick(b)}
                          >
                            {inner}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <BranchJournalRecordModal
        open={newRecordOpen && !readOnly}
        onClose={() => setNewRecordOpen(false)}
        courts={courts}
        courtIndex={newRecordDraft.courtIndex}
        startMin={newRecordDraft.startMin}
        endMin={newRecordDraft.endMin}
        dateLabel={dateLabel}
        apiBranchId={apiCreateBranchId && journalIsoDate && typeof onJournalRefresh === "function" ? apiCreateBranchId : undefined}
        journalIsoDate={apiCreateBranchId && journalIsoDate && typeof onJournalRefresh === "function" ? journalIsoDate : undefined}
        onApiSuccess={onJournalRefresh}
      />
      {readOnlyTip ? (
        <div className="branchJournalTipBackdrop" role="presentation" onClick={() => setReadOnlyTip(null)}>
          <div className="branchJournalTipCard" role="dialog" onClick={(e) => e.stopPropagation()}>
            <p className="branchJournalTipText">{readOnlyTip}</p>
            <button type="button" className="btn btnPrimary" onClick={() => setReadOnlyTip(null)}>
              Понятно
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
