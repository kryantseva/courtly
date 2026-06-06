import { useEffect, useMemo, useState } from "react";
import { fetchBranchJournalDay } from "../../api/branchJournal";
import { ADMIN_ROOMS_MOCK } from "../../data/adminOperationsMock";
import BranchJournalView from "../../components/branchJournal/BranchJournalView";
import { getActiveBranch } from "../../utils/activeBranch";
const USE_API = import.meta.env.VITE_USE_API === "true";
const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
function toIsoDate(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  return x;
}
function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
export default function AdminSchedulePage() {
  const branch = getActiveBranch();
  const branchName = branch?.branchName ?? "Филиал";
  const branchId = branch?.branchId;
  const mockCourts = useMemo(() => ADMIN_ROOMS_MOCK.map((r) => ({ id: r.id, label: r.label })), []);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [journalPayload, setJournalPayload] = useState(
     (null),
  );
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState( (null));
  const [journalNonce, setJournalNonce] = useState(0);
  const [journalViewMode, setJournalViewMode] = useState( ("day"));
  const [weekPayloads, setWeekPayloads] = useState(
     (null),
  );
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState( (null));
  const apiActive = USE_API && Boolean(branchId);
  const selectedIso = toIsoDate(viewDate);
  useEffect(() => {
    if (!apiActive) {
      setJournalPayload(null);
      setJournalError(null);
      setJournalLoading(false);
      return;
    }
    let cancelled = false;
    setJournalLoading(true);
    setJournalError(null);
    fetchBranchJournalDay(branchId, selectedIso)
      .then((data) => {
        if (cancelled) return;
        setJournalPayload(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setJournalPayload(null);
        setJournalError(e instanceof Error ? e.message : "Не удалось загрузить журнал");
      })
      .finally(() => {
        if (!cancelled) setJournalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiActive, branchId, selectedIso, journalNonce]);
  useEffect(() => {
    if (!apiActive || journalViewMode !== "week") {
      setWeekPayloads(null);
      setWeekLoading(false);
      setWeekError(null);
      return;
    }
    const mon = startOfWeekMonday(viewDate);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    let cancelled = false;
    setWeekPayloads(null);
    setWeekLoading(true);
    setWeekError(null);
    Promise.all(dates.map((dt) => fetchBranchJournalDay(branchId, toIsoDate(dt))))
      .then((arr) => {
        if (!cancelled) setWeekPayloads(arr);
      })
      .catch((e) => {
        if (!cancelled) {
          setWeekPayloads(null);
          setWeekError(e instanceof Error ? e.message : "Не удалось загрузить неделю");
        }
      })
      .finally(() => {
        if (!cancelled) setWeekLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiActive, branchId, journalViewMode, viewDate, journalNonce]);
  useEffect(() => {
    if (!apiActive) return;
    const id = window.setInterval(() => setJournalNonce((n) => n + 1), 20000);
    return () => window.clearInterval(id);
  }, [apiActive]);
  const courts =
    apiActive && Array.isArray(journalPayload?.courts) && journalPayload.courts.length > 0
      ? journalPayload.courts
      : mockCourts;
  const journalBookings = apiActive ? (journalPayload?.bookings ?? []) : undefined;
  const journalEvents = apiActive ? (journalPayload?.events ?? undefined) : undefined;
  const weekSummaries = useMemo(() => {
    if (!Array.isArray(weekPayloads) || weekPayloads.length !== 7) return null;
    const mon = startOfWeekMonday(viewDate);
    return weekPayloads.map((p, i) => {
      const dt = addDays(mon, i);
      const iso = p.date || toIsoDate(dt);
      const bookingCount = Array.isArray(p.bookings) ? p.bookings.length : 0;
      const conflictCount = (p.events ?? []).filter((e) => e.roomBookingOverlap).length;
      return {
        isoDate: iso,
        weekdayShort: WEEKDAYS_SHORT[i],
        dayNum: dt.getDate(),
        bookingCount,
        conflictCount,
        isSelected: iso === selectedIso,
      };
    });
  }, [weekPayloads, viewDate, selectedIso]);
  const weekConflictEvents = useMemo(() => {
    if (!Array.isArray(weekPayloads)) return null;
    const out = [];
    for (const p of weekPayloads) {
      const dlabel = p.date;
      for (const ev of p.events ?? []) {
        if (!ev.roomBookingOverlap) continue;
        out.push({
          id: ev.id,
          isoDate: p.date,
          dateLabel: dlabel,
          title: ev.title,
          roomLabel: ev.roomLabel,
          overlapBookingCount: ev.overlapBookingCount,
        });
      }
    }
    return out;
  }, [weekPayloads]);
  const combinedError = journalError || (journalViewMode === "week" ? weekError : null);
  return (
    <div className="clientPage clientPage--flush branchJournalPage">
      {apiActive && combinedError ? (
        <p className="branchJournalApiError branchJournalPageApiError" role="alert">
          {combinedError}
        </p>
      ) : null}
      <BranchJournalView
        branchName={branchName}
        courts={courts}
        readOnly={false}
        journalBookings={journalBookings}
        journalEvents={journalEvents}
        baseDate={apiActive ? viewDate : undefined}
        onBaseDateChange={apiActive ? setViewDate : undefined}
        journalLoading={apiActive && journalLoading}
        journalError={null}
        dayStartHour={journalPayload?.dayStartHour}
        dayEndHour={journalPayload?.dayEndHour}
        slotMinutes={journalPayload?.slotMinutes}
        apiCreateBranchId={apiActive ? branchId : null}
        onJournalRefresh={() => setJournalNonce((n) => n + 1)}
        onViewModeChange={apiActive ? setJournalViewMode : undefined}
        weekSummaries={apiActive && journalViewMode === "week" ? weekSummaries : null}
        weekConflictEvents={apiActive && journalViewMode === "week" ? weekConflictEvents : null}
        weekStripLoading={apiActive && journalViewMode === "week" && weekLoading}
      />
    </div>
  );
}
