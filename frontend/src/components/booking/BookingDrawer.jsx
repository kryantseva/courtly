import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import CourtlyLogo from "../CourtlyLogo";
import { useBookingDrawer } from "../../context/BookingDrawerContext";
import { createBranchBookingSelf } from "../../api/branchBookings";
import { rescheduleMyBooking } from "../../api/bookings";
import { fetchBranchAvailability } from "../../api/branchAvailability";
import { fetchBranchRooms } from "../../api/branchRooms";
import { ApiError } from "../../api/http";
import { getActiveBranch } from "../../utils/activeBranch";
import { createIdempotencyKey } from "../../utils/idempotency";
import {
  getClientProfileLive,
  TRAINERS_PUBLIC,
  chainSlotsForHallAndLabels,
  durationOptionsForStart,
  filterSlotsByHall,
  getMockSlotsForDate,
  getRentalPriceRub,
  getTrainerSessionFeeRub,
  groupSlotsByPeriod,
  hallsForStartAndDuration,
  hasSlotsForDateKey,
  isTrainerOffOnDateKey,
  minutesToSlotLabel,
  slotLabelToMinutes,
  slotLabelsForHalfOpenRange,
  trainersAvailableOnDateKey,
} from "../../services/bookingData";
import {
  buildMonthGrid,
  dateKey,
  formatSelectedDateRu,
  weekDatesAroundKey,
  WEEKDAY_SHORT,
} from "./bookingCalendar";
function addDaysKey(key, deltaDays) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dateKey(dt);
}
function formatDurationChipRu(mins) {
  if (mins === 30) return "30 мин";
  if (mins === 60) return "1 ч";
  if (mins === 90) return "1,5 ч";
  return `${mins} мин`;
}
function formatTimeRangeRu(startLabel, durationMins) {
  const end = slotLabelToMinutes(startLabel) + durationMins;
  return `${startLabel} — ${minutesToSlotLabel(end)}`;
}
const RUB = "\u00a0\u20BD";
const USE_API = import.meta.env.VITE_USE_API === "true";
const API_DURATION_OPTIONS = [30, 60, 90, 120];
function normalizeSlotLabel(label) {
  return minutesToSlotLabel(slotLabelToMinutes(label));
}
function periodFromLabel(label) {
  const mins = slotLabelToMinutes(label);
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "day";
  return "evening";
}
function availabilityRowsToSlots(date, durationMins, rows) {
  const out = [];
  const rooms = Array.isArray(rows?.rooms) ? rows.rooms : [];
  for (const room of rooms) {
    const starts = Array.isArray(room.availableStarts) ? room.availableStarts : [];
    for (const s of starts) {
      const label = normalizeSlotLabel(String(s.start ?? ""));
      out.push({
        id: `${date}-${room.id}-${durationMins}-${label}`,
        label,
        period: periodFromLabel(label),
        hallName: String(room.label ?? ""),
        roomId: String(room.id ?? ""),
        trainers: [],
      });
    }
  }
  return out;
}
export default function BookingDrawer() {
  const navigate = useNavigate();
  const {
    open,
    closeDrawer,
    step,
    setStep,
    selectedDateKey,
    setSelectedDateKey,
    selectedSlotId,
    setSelectedSlotId,
    branchName,
    lockedTrainerId,
    lockedHallName,
    lockedMinDurationMins,
    prefillDateKey,
    prefillStartLabel,
    prefillDurationMins,
    returnToQuickFilters,
    rescheduleBookingId,
    clearLockedTrainer,
    clearLockedHall,
    clearLockedMinDuration,
    clearPrefillStart,
  } = useBookingDrawer();
  const today = useMemo(() => new Date(), []);
  const weekStripRef = useRef(null);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [needTrainer, setNeedTrainer] = useState(false);
  const [trainerPreferenceId, setTrainerPreferenceId] = useState("any");
  const [anchorStartLabel, setAnchorStartLabel] = useState("");
  const [selectedDurationMins, setSelectedDurationMins] = useState(null);
  const [selectedHallName, setSelectedHallName] = useState(null);
  const [detailsTrainerId, setDetailsTrainerId] = useState(null);
  const [apiRooms, setApiRooms] = useState( ([]));
  const [apiAvailabilityByDuration, setApiAvailabilityByDuration] = useState(
     ({}),
  );
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityCheckedDateKey, setAvailabilityCheckedDateKey] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitPending, setSubmitPending] = useState(false);
  const [submitIdempotencyKey, setSubmitIdempotencyKey] = useState("");
  const resetBookingTail = useCallback(() => {
    setAnchorStartLabel("");
    setSelectedDurationMins(null);
    setSelectedHallName(null);
    setSelectedSlotId(null);
    setDetailsTrainerId(null);
  }, [setSelectedSlotId]);
  useEffect(() => {
    if (!open) return;
    setNeedTrainer(false);
    setTrainerPreferenceId("any");
    resetBookingTail();
    if (prefillDateKey && prefillStartLabel) {
      const [y, m] = prefillDateKey.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
      setSelectedDateKey(prefillDateKey);
      setAnchorStartLabel(normalizeSlotLabel(prefillStartLabel));
      if (prefillDurationMins) {
        setSelectedDurationMins(prefillDurationMins);
        if (lockedHallName) {
          setSelectedHallName(lockedHallName);
          setStep(isRescheduleMode ? "datetime" : "details");
        } else {
          setStep("venue");
        }
      } else {
        setStep("duration");
      }
      clearPrefillStart();
      return;
    }
    if (prefillDateKey) {
      const [y, m] = prefillDateKey.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
      setSelectedDateKey(prefillDateKey);
      setStep("datetime");
      clearPrefillStart();
      return;
    }
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  }, [open]);
  useEffect(() => {
    if (trainerPreferenceId !== "any") {
      setDetailsTrainerId(trainerPreferenceId);
    } else {
      setDetailsTrainerId(null);
    }
  }, [trainerPreferenceId]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);
  useEffect(() => {
    if (!open) {
      setSubmitError("");
      setSubmitPending(false);
      setSubmitIdempotencyKey("");
    }
  }, [open]);
  useEffect(() => {
    if (step !== "details") setSubmitError("");
  }, [step]);
  useEffect(() => {
    if (!open || !USE_API) return;
    const bid = getActiveBranch()?.branchId;
    if (!bid) {
      setApiRooms([]);
      return;
    }
    let cancelled = false;
    fetchBranchRooms(bid)
      .then((d) => {
        if (!cancelled) setApiRooms(Array.isArray(d.rooms) ? d.rooms : []);
      })
      .catch(() => {
        if (!cancelled) setApiRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const branchIdForApi = USE_API ? getActiveBranch()?.branchId : "";
  useEffect(() => {
    if (!open || !USE_API || !selectedDateKey) {
      setApiAvailabilityByDuration({});
      setAvailabilityPending(false);
      setAvailabilityError("");
      setAvailabilityCheckedDateKey("");
      return;
    }
    if (!branchIdForApi) {
      setApiAvailabilityByDuration({});
      setAvailabilityPending(false);
      setAvailabilityCheckedDateKey("");
      return;
    }
    let cancelled = false;
    setApiAvailabilityByDuration({});
    setAvailabilityPending(true);
    setAvailabilityError("");
    setAvailabilityCheckedDateKey("");
    Promise.allSettled(
      API_DURATION_OPTIONS.map((duration) =>
        fetchBranchAvailability(branchIdForApi, { date: selectedDateKey, duration }).then((data) => [
          duration,
          availabilityRowsToSlots(selectedDateKey, duration, data),
        ]),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const entries = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        setApiAvailabilityByDuration(Object.fromEntries(entries));
        setAvailabilityCheckedDateKey(selectedDateKey);
        if (entries.length === 0) {
          const firstRejected = results.find((r) => r.status === "rejected");
          const reason = firstRejected?.reason;
          setAvailabilityError(reason instanceof ApiError ? reason.message : "Не удалось обновить свободные окна");
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, branchIdForApi, selectedDateKey]);
  const todayKey = dateKey(today);
  const { cells, monthLabel } = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const shiftMonth = useCallback((delta) => {
    setViewMonth((m) => {
      const next = m + delta;
      let nextYear = viewYear;
      let nextMonth = next;
      if (next < 0) {
        nextYear = viewYear - 1;
        nextMonth = 11;
      } else if (next > 11) {
        nextYear = viewYear + 1;
        nextMonth = 0;
      }
      setViewYear(nextYear);
      const visibleDate = new Date(nextYear, nextMonth, 1);
      setSelectedDateKey(dateKey(visibleDate));
      resetBookingTail();
      return nextMonth;
    });
  }, [resetBookingTail, setSelectedDateKey, viewYear]);
  const allSlotsForDay = useMemo(() => {
    if (!selectedDateKey) return [];
    if (USE_API && branchIdForApi) {
      const byKey = new Map();
      for (const slots of Object.values(apiAvailabilityByDuration)) {
        for (const slot of slots) byKey.set(`${slot.hallName}-${slot.label}`, slot);
      }
      return [...byKey.values()];
    }
    return getMockSlotsForDate(selectedDateKey);
  }, [apiAvailabilityByDuration, branchIdForApi, selectedDateKey]);
  const displaySlots = useMemo(() => {
    if (!selectedDateKey) return [];
    const byHall = lockedHallName ? filterSlotsByHall(allSlotsForDay, lockedHallName) : allSlotsForDay;
    if (lockedTrainerId) {
      return isTrainerOffOnDateKey(lockedTrainerId, selectedDateKey) ? [] : byHall;
    }
    if (needTrainer && trainerPreferenceId !== "any") {
      return isTrainerOffOnDateKey(trainerPreferenceId, selectedDateKey) ? [] : byHall;
    }
    if (needTrainer && trainerPreferenceId === "any") {
      const anyWorks = TRAINERS_PUBLIC.some((t) => !isTrainerOffOnDateKey(t.id, selectedDateKey));
      return anyWorks ? byHall : [];
    }
    return byHall;
  }, [
    allSlotsForDay,
    selectedDateKey,
    lockedTrainerId,
    lockedHallName,
    needTrainer,
    trainerPreferenceId,
  ]);
  const getEligibleStartLabelsForMinDuration = useCallback(
    (slots) => {
      if (USE_API && branchIdForApi && lockedMinDurationMins) {
        const labels = new Set();
        for (const [duration, durationSlots] of Object.entries(apiAvailabilityByDuration)) {
          if (Number(duration) < lockedMinDurationMins) continue;
          for (const s of durationSlots) labels.add(s.label);
        }
        return [...labels];
      }
      if (!lockedMinDurationMins) return [...new Set(slots.map((s) => s.label))];
      const labels = [...new Set(slots.map((s) => s.label))];
      return labels.filter((label) =>
        durationOptionsForStart(slots, label).some((o) => o.durationMins >= lockedMinDurationMins),
      );
    },
    [apiAvailabilityByDuration, branchIdForApi, lockedMinDurationMins],
  );
  const slotsByUniqueTime = useMemo(() => {
    const eligible = new Set(getEligibleStartLabelsForMinDuration(displaySlots));
    const map = new Map();
    for (const s of displaySlots) {
      if (!eligible.has(s.label)) continue;
      if (!map.has(s.label)) map.set(s.label, s);
    }
    return [...map.values()].sort((a, b) => slotLabelToMinutes(a.label) - slotLabelToMinutes(b.label));
  }, [displaySlots, getEligibleStartLabelsForMinDuration]);
  const timeByPeriod = useMemo(() => groupSlotsByPeriod(slotsByUniqueTime), [slotsByUniqueTime]);
  const durationChoices = useMemo(() => {
    if (!anchorStartLabel) return [];
    if (USE_API && branchIdForApi) {
      return API_DURATION_OPTIONS.filter((mins) => !lockedMinDurationMins || mins >= lockedMinDurationMins)
        .map((mins) => {
          const slots = apiAvailabilityByDuration[mins] ?? [];
          const halls = [...new Set(slots.filter((s) => s.label === anchorStartLabel).map((s) => s.hallName))];
          return {
            durationMins: mins,
            hallsCount: halls.length,
            priceRub: getRentalPriceRub(mins, anchorStartLabel),
            title: `Аренда ${formatDurationChipRu(mins)}`,
          };
        })
        .filter((o) => o.hallsCount > 0);
    }
    return durationOptionsForStart(displaySlots, anchorStartLabel).filter(
      (o) => !lockedMinDurationMins || o.durationMins >= lockedMinDurationMins,
    );
  }, [apiAvailabilityByDuration, branchIdForApi, displaySlots, anchorStartLabel, lockedMinDurationMins]);
  const venueHalls = useMemo(() => {
    if (!anchorStartLabel || selectedDurationMins == null) return [];
    if (USE_API && branchIdForApi) {
      const slots = apiAvailabilityByDuration[selectedDurationMins] ?? [];
      return [...new Set(slots.filter((s) => s.label === anchorStartLabel).map((s) => s.hallName))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      );
    }
    return hallsForStartAndDuration(displaySlots, anchorStartLabel, selectedDurationMins);
  }, [apiAvailabilityByDuration, branchIdForApi, displaySlots, anchorStartLabel, selectedDurationMins]);
  const venueHallsDisplay = useMemo(() => {
    if (!USE_API || !apiRooms.length) return venueHalls;
    const labels = new Set(apiRooms.map((r) => r.label));
    const hit = venueHalls.filter((h) => labels.has(h));
    return hit;
  }, [USE_API, apiRooms, venueHalls]);
  const rangeLabels = useMemo(() => {
    if (!anchorStartLabel || selectedDurationMins == null) return null;
    const endEx = minutesToSlotLabel(slotLabelToMinutes(anchorStartLabel) + selectedDurationMins);
    return slotLabelsForHalfOpenRange(anchorStartLabel, endEx);
  }, [anchorStartLabel, selectedDurationMins]);
  const selectedBookingChain = useMemo(() => {
    if (!selectedHallName || !rangeLabels?.length) return null;
    if (USE_API && branchIdForApi) {
      const slots = apiAvailabilityByDuration[selectedDurationMins] ?? [];
      const roomIdsForHall = new Set(apiRooms.filter((r) => r.label === selectedHallName).map((r) => String(r.id)));
      const match = slots.find((s) => {
        if (s.label !== anchorStartLabel) return false;
        if (roomIdsForHall.size > 0) return roomIdsForHall.has(String(s.roomId));
        return s.hallName === selectedHallName;
      });
      return match ? [match] : null;
    }
    return chainSlotsForHallAndLabels(selectedHallName, displaySlots, rangeLabels);
  }, [
    apiAvailabilityByDuration,
    apiRooms,
    branchIdForApi,
    selectedDurationMins,
    selectedHallName,
    anchorStartLabel,
    rangeLabels,
    displaySlots,
  ]);
  const selectedSlotUnavailable =
    USE_API &&
    !!branchIdForApi &&
    step === "details" &&
    availabilityCheckedDateKey === selectedDateKey &&
    !!selectedDateKey &&
    !!selectedHallName &&
    !!anchorStartLabel &&
    selectedDurationMins != null &&
    !availabilityPending &&
    !availabilityError &&
    !selectedBookingChain?.length;
  useEffect(() => {
    if (selectedSlotUnavailable) {
      setSubmitError("Это время уже занято. Вернитесь назад и выберите другое свободное окно.");
    }
  }, [selectedSlotUnavailable]);
  useEffect(() => {
    setSelectedSlotId((id) => {
      if (!id || !allSlotsForDay.some((s) => s.id === id)) return null;
      return id;
    });
  }, [allSlotsForDay, setSelectedSlotId]);
  useEffect(() => {
    if (!selectedHallName || !selectedBookingChain?.length) return;
    setSelectedSlotId(selectedBookingChain[0].id);
  }, [selectedHallName, selectedBookingChain, setSelectedSlotId]);
  const trainerIdResolved = useMemo(() => {
    if (lockedTrainerId) return lockedTrainerId;
    if (needTrainer && trainerPreferenceId !== "any") return trainerPreferenceId;
    if (needTrainer && trainerPreferenceId === "any") return detailsTrainerId;
    return null;
  }, [lockedTrainerId, needTrainer, trainerPreferenceId, detailsTrainerId]);
  const trainerNameResolved = useMemo(() => {
    if (!trainerIdResolved) return null;
    return TRAINERS_PUBLIC.find((t) => t.id === trainerIdResolved)?.name ?? trainerIdResolved;
  }, [trainerIdResolved]);
  const rentalSubtotalRub = useMemo(() => {
    if (selectedDurationMins == null || !anchorStartLabel) return 0;
    return getRentalPriceRub(selectedDurationMins, anchorStartLabel);
  }, [selectedDurationMins, anchorStartLabel]);
  const trainerFeeRub = useMemo(() => {
    if (!trainerIdResolved) return 0;
    return getTrainerSessionFeeRub();
  }, [trainerIdResolved]);
  const prepayTotalRub = rentalSubtotalRub + trainerFeeRub;
  const trainersForDetails = useMemo(
    () => (selectedDateKey ? trainersAvailableOnDateKey(selectedDateKey) : []),
    [selectedDateKey],
  );
  const profileGuestName = getClientProfileLive().fullName.trim();
  const isRescheduleMode = Boolean(rescheduleBookingId);
  const canConfirmDetails = useMemo(() => {
    if (!isRescheduleMode && !profileGuestName) return false;
    if (availabilityError || selectedSlotUnavailable) return false;
    if (!selectedBookingChain?.length || !selectedHallName || !anchorStartLabel || selectedDurationMins == null)
      return false;
    if (needTrainer || lockedTrainerId) {
      if (!trainerIdResolved) return false;
      if (selectedDateKey && isTrainerOffOnDateKey(trainerIdResolved, selectedDateKey)) return false;
    }
    return true;
  }, [
    profileGuestName,
    selectedBookingChain,
    selectedHallName,
    anchorStartLabel,
    selectedDurationMins,
    needTrainer,
    lockedTrainerId,
    trainerIdResolved,
    selectedDateKey,
    availabilityError,
    isRescheduleMode,
    selectedSlotUnavailable,
  ]);
  function handlePickDay(d, inMonth) {
    if (!inMonth) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      return;
    }
    const k = dateKey(d);
    setSelectedDateKey(k);
    resetBookingTail();
    setStep("datetime");
  }
  function handleWeekDayPick(d) {
    const k = dateKey(d);
    if (!USE_API && !hasSlotsForDateKey(k)) return;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDateKey(k);
    resetBookingTail();
  }
  function handleSelectTimeLabel(label) {
    setAnchorStartLabel(label);
    setSelectedDurationMins(null);
    setSelectedHallName(null);
    setSelectedSlotId(null);
    setStep("duration");
  }
  function handleSelectDuration(mins) {
    setSelectedDurationMins(mins);
    setSelectedHallName(null);
    setSelectedSlotId(null);
    if (lockedHallName) {
      setSelectedHallName(lockedHallName);
      setStep("details");
      return;
    }
    setStep("venue");
  }
  function handleSelectVenue(hall) {
    setSelectedHallName(hall);
    setStep("details");
  }
  async function handleConfirm() {
    if (!USE_API) {
      closeDrawer();
      return;
    }
    const branchId = getActiveBranch()?.branchId;
    if (!branchId) {
      setSubmitError("Выберите филиал на странице «Филиалы» (/branches).");
      return;
    }
    if (!selectedDateKey || !selectedHallName || !anchorStartLabel || selectedDurationMins == null) return;
    const selectedApiSlot = selectedBookingChain?.[0] ?? null;
    const selectedRoomId = selectedApiSlot?.roomId ? String(selectedApiSlot.roomId) : "";
    const room = selectedRoomId
      ? apiRooms.find((r) => String(r.id) === selectedRoomId)
      : apiRooms.find((r) => r.label === selectedHallName);
    if (!room) {
      setSubmitError(
        `Зал «${selectedHallName}» не найден в этом филиале. Обновите список или выберите другой зал на шаге «Площадка».`,
      );
      return;
    }
    const liveSlotsForDuration = apiAvailabilityByDuration[selectedDurationMins] ?? [];
    const stillAvailable = liveSlotsForDuration.some((s) => {
      if (s.label !== anchorStartLabel) return false;
      if (selectedRoomId) return String(s.roomId) === selectedRoomId;
      return s.hallName === selectedHallName;
    });
    if (!stillAvailable) {
      setSubmitError("Это время уже занято. Вернитесь назад и выберите другое свободное окно.");
      setSelectedSlotId(null);
      return;
    }
    const start_min = slotLabelToMinutes(anchorStartLabel);
    const end_min = start_min + selectedDurationMins;
    if (end_min > 24 * 60 + 59) {
      setSubmitError(
        "Интервал выходит за полночь — выберите более раннее время начала или более короткую длительность.",
      );
      return;
    }
    setSubmitPending(true);
    setSubmitError("");
    const idemKey = submitIdempotencyKey || createIdempotencyKey("booking-self");
    if (!submitIdempotencyKey) setSubmitIdempotencyKey(idemKey);
    try {
      if (isRescheduleMode) {
        await rescheduleMyBooking(rescheduleBookingId, {
          room_id: room.id,
          date: selectedDateKey,
          start_min,
          end_min,
        });
        closeDrawer();
        navigate(`/app/bookings/${rescheduleBookingId}`);
        return;
      }
      const data = await createBranchBookingSelf(branchId, {
        room_id: room.id,
        date: selectedDateKey,
        start_min,
        end_min,
        service:
          needTrainer || lockedTrainerId ? "С тренером (уточнить у администратора)" : "Аренда корта",
      }, { idempotencyKey: idemKey });
      closeDrawer();
      navigate(`/app/bookings/${data.id}`);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : isRescheduleMode ? "Не удалось перенести запись" : "Не удалось создать бронь");
    } finally {
      setSubmitPending(false);
    }
  }
  function setNeedTrainerToggle(on) {
    setNeedTrainer(on);
    if (!on) setTrainerPreferenceId("any");
    resetBookingTail();
  }
  const applyGlobalFiltersForDateKey = useCallback(
    (key, daySlots) => {
      const byHall = lockedHallName ? filterSlotsByHall(daySlots, lockedHallName) : daySlots;
      const trainerCtx =
        lockedTrainerId || (needTrainer && trainerPreferenceId !== "any" ? trainerPreferenceId : null);
      if (trainerCtx) {
        if (isTrainerOffOnDateKey(trainerCtx, key)) return [];
        return byHall;
      }
      if (needTrainer && trainerPreferenceId === "any") {
        const anyWorks = TRAINERS_PUBLIC.some((t) => !isTrainerOffOnDateKey(t.id, key));
        return anyWorks ? byHall : [];
      }
      return byHall;
    },
    [lockedHallName, lockedTrainerId, needTrainer, trainerPreferenceId],
  );
  const getDayCalendarMeta = useCallback(
    (key, inMonth) => {
      if (!inMonth) return { blocked: false, count: 0 };
      if (USE_API && branchIdForApi && key === selectedDateKey) {
        const count = Object.values(apiAvailabilityByDuration).reduce((sum, slots) => sum + slots.length, 0);
        return { blocked: !availabilityPending && count === 0, count };
      }
      if (!hasSlotsForDateKey(key)) return { blocked: true, count: 0 };
      const daySlots = applyGlobalFiltersForDateKey(key, getMockSlotsForDate(key));
      if (!daySlots.length) return { blocked: true, count: 0 };
      if (!lockedMinDurationMins) return { blocked: false, count: daySlots.length };
      const eligibleStarts = getEligibleStartLabelsForMinDuration(daySlots);
      return { blocked: eligibleStarts.length === 0, count: eligibleStarts.length };
    },
    [
      apiAvailabilityByDuration,
      availabilityPending,
      applyGlobalFiltersForDateKey,
      branchIdForApi,
      getEligibleStartLabelsForMinDuration,
      lockedMinDurationMins,
      selectedDateKey,
    ],
  );
  const nextFree = useMemo(() => {
    if (!selectedDateKey) return null;
    for (let i = 1; i <= 45; i++) {
      const k = addDaysKey(selectedDateKey, i);
      if (!getDayCalendarMeta(k, true).blocked) return k;
    }
    return null;
  }, [selectedDateKey, getDayCalendarMeta]);
  const lockedTrainerName = lockedTrainerId
    ? TRAINERS_PUBLIC.find((t) => t.id === lockedTrainerId)?.name ?? lockedTrainerId
    : null;
  const preferenceBlocksDay =
    !lockedTrainerId &&
    needTrainer &&
    trainerPreferenceId !== "any" &&
    selectedDateKey &&
    isTrainerOffOnDateKey(trainerPreferenceId, selectedDateKey) &&
    allSlotsForDay.length > 0;
  const showSlotCountsOnCalendar =
    needTrainer || !!lockedTrainerId || !!lockedHallName || !!lockedMinDurationMins;
  const weekStripDates = useMemo(
    () => (selectedDateKey ? weekDatesAroundKey(selectedDateKey) : []),
    [selectedDateKey, viewMonth, viewYear],
  );
  const handleWeekStripWheel = useCallback((e) => {
    const el = weekStripRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, []);
  const handleReturnToQuickFilters = useCallback(() => {
    closeDrawer();
    window.setTimeout(() => {
      document.getElementById("client-booking-quick-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [closeDrawer]);
  if (!open) return null;
  const panel = (
    <div className="bookingDrawerRoot" role="presentation">
      <button
        type="button"
        className="bookingDrawerBackdrop"
        aria-label="Закрыть запись"
        onClick={closeDrawer}
      />
      <div
        className="bookingDrawerPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-drawer-title"
      >
        <button type="button" className="bookingDrawerClose" onClick={closeDrawer} aria-label="Закрыть">
          ×
        </button>
        <div className="bookingDrawerHeader">
          <div className="bookingDrawerBrand">
            <CourtlyLogo size={36} withWordmark={false} />
            <div className="bookingDrawerBrandText">
              <h2 id="booking-drawer-title" className="bookingDrawerBranchName">
                {branchName}
              </h2>
              <p className="bookingDrawerAddress">Онлайн-запись на площадки</p>
            </div>
          </div>
        </div>
        {step === "date" && (
          <div className="bookingDrawerSection">
            {lockedTrainerName && (
              <p className="bookingLockedTrainerBanner">
                Запись к <strong>{lockedTrainerName}</strong> — выберите дату
              </p>
            )}
            {lockedHallName ? (
              <p className="bookingLockedTrainerBanner">
                Площадка <strong>{lockedHallName}</strong> — в календаре только дни, где в этом зале есть окна
              </p>
            ) : null}
            {lockedMinDurationMins ? (
              <p className="bookingLockedTrainerBanner">
                Фильтр длительности: от <strong>{formatDurationChipRu(lockedMinDurationMins)}</strong>
              </p>
            ) : null}
            {!lockedTrainerId && (
              <>
                <div className="bookingNeedTrainerRow">
                  <span id="need-trainer-label" className="bookingNeedTrainerLabel">
                    Нужен тренер
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={needTrainer}
                    aria-labelledby="need-trainer-label"
                    className={`bookingNeedTrainerSwitch${needTrainer ? " bookingNeedTrainerSwitch--on" : ""}`}
                    onClick={() => setNeedTrainerToggle(!needTrainer)}
                  >
                    <span className="bookingNeedTrainerKnob" />
                  </button>
                </div>
                {needTrainer && (
                  <div className="bookingTrainerPrefRow">
                    <label className="bookingTrainerPrefLabel" htmlFor="booking-trainer-pref">
                      Тренер
                    </label>
                    <select
                      id="booking-trainer-pref"
                      className="bookingTrainerPrefSelect"
                      value={trainerPreferenceId}
                      onChange={(e) => setTrainerPreferenceId(e.target.value)}
                    >
                      <option value="any">Любой</option>
                      {TRAINERS_PUBLIC.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="bookingNeedTrainerHint">
                  {needTrainer
                    ? "С учётом тренера показываются только дни, когда он не в выходной. Помещение выберете на шаге 3."
                    : "Выберите дату, затем время начала, длительность и площадку."}
                </p>
              </>
            )}
            <div className="bookingCalNav">
              <button type="button" className="bookingCalNavBtn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                ‹
              </button>
              <span className="bookingCalTitle">{monthLabel}</span>
              <button type="button" className="bookingCalNavBtn" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
                ›
              </button>
            </div>
            <div className="bookingCalWeekdays">
              {WEEKDAY_SHORT.map((w) => (
                <span key={w} className="bookingCalWeekday">
                  {w}
                </span>
              ))}
            </div>
            <div className="bookingCalGrid">
              {cells.map((row, ri) =>
                row.map((cell, ci) => {
                  const k = dateKey(cell.date);
                  const isToday = k === todayKey;
                  const meta = getDayCalendarMeta(k, cell.inMonth);
                  const isBlocked = cell.inMonth && meta.blocked;
                  const isSelected = k === selectedDateKey && cell.inMonth && !isBlocked;
                  return (
                    <button
                      key={`${ri}-${ci}`}
                      type="button"
                      disabled={isBlocked}
                      aria-label={
                        cell.inMonth
                          ? isBlocked
                            ? `${cell.date.getDate()}, нет доступных слотов`
                            : showSlotCountsOnCalendar
                              ? `Выбрать ${cell.date.getDate()}, доступно слотов: ${meta.count}`
                              : `Выбрать ${cell.date.getDate()}`
                          : undefined
                      }
                      className={`bookingCalCell${cell.inMonth ? "" : " bookingCalCell--muted"}${isToday ? " bookingCalCell--today" : ""}${isSelected ? " bookingCalCell--selected" : ""}${isBlocked ? " bookingCalCell--blocked" : ""}`}
                      onClick={() => handlePickDay(cell.date, cell.inMonth)}
                    >
                      <span className="bookingCalCellDay">{cell.date.getDate()}</span>
                      {showSlotCountsOnCalendar && cell.inMonth && !isBlocked && meta.count > 0 ? (
                        <span className="bookingCalCellCount">{meta.count}</span>
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>
            {needTrainer ? (
              <Link
                to="/app/trainers"
                className="bookingTrainersMoreLink bookingTrainersMoreLink--afterCal"
                onClick={() => closeDrawer()}
              >
                Подробнее о тренерах
              </Link>
            ) : null}
          </div>
        )}
        {step === "datetime" && selectedDateKey && (
          <div className="bookingDrawerSection bookingDrawerSection--grow bookingDrawerSection--datetimeScroll">
            <div className="bookingDatetimeSticky">
              <button
                type="button"
                className="bookingTimeBack"
                onClick={() => {
                  resetBookingTail();
                  setStep("date");
                }}
              >
                ‹ Назад к календарю
              </button>
              <div className="bookingCalNav bookingCalNav--compact">
                <button type="button" className="bookingCalNavBtn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                  ‹
                </button>
                <span className="bookingCalTitle">{monthLabel}</span>
                <button type="button" className="bookingCalNavBtn" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
                  ›
                </button>
              </div>
              <div
                ref={weekStripRef}
                className="bookingWeekStrip"
                role="tablist"
                aria-label="Дни недели"
                onWheel={handleWeekStripWheel}
              >
                {weekStripDates.map((d) => {
                  const k = dateKey(d);
                  const inSched = hasSlotsForDateKey(k);
                  const sel = k === selectedDateKey;
                  const meta = getDayCalendarMeta(k, true);
                  const blocked = !inSched || meta.blocked;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      disabled={blocked}
                      aria-selected={sel}
                      className={`bookingWeekStripBtn${sel ? " bookingWeekStripBtn--selected" : ""}${blocked ? " bookingWeekStripBtn--blocked" : ""}`}
                      onClick={() => handleWeekDayPick(d)}
                    >
                      <span className="bookingWeekStripDay">{d.getDate()}</span>
                      <span className="bookingWeekStripDow">
                        {d.toLocaleDateString("ru-RU", { weekday: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bookingDatetimeBody">
              {lockedTrainerName && (
                <div className="bookingTrainerFirstBar">
                  <span className="bookingTrainerFirstLabel">
                    Тренер: <strong>{lockedTrainerName}</strong>
                  </span>
                  <button
                    type="button"
                    className="bookingTrainerFirstChange"
                    onClick={() => {
                      clearLockedTrainer();
                      resetBookingTail();
                    }}
                  >
                    Сменить
                  </button>
                </div>
              )}
              {lockedHallName ? (
                <div className="bookingTrainerFirstBar">
                  <span className="bookingTrainerFirstLabel">
                    Зал: <strong>{lockedHallName}</strong>
                  </span>
                  <button
                    type="button"
                    className="bookingTrainerFirstChange"
                    onClick={() => {
                      clearLockedHall();
                      resetBookingTail();
                    }}
                  >
                    Все залы
                  </button>
                </div>
              ) : null}
              {lockedMinDurationMins ? (
                <div className="bookingTrainerFirstBar">
                  <span className="bookingTrainerFirstLabel">
                    Длительность: от <strong>{formatDurationChipRu(lockedMinDurationMins)}</strong>
                  </span>
                  <button
                    type="button"
                    className="bookingTrainerFirstChange"
                    onClick={() => {
                      clearLockedMinDuration();
                      resetBookingTail();
                    }}
                  >
                    Любая
                  </button>
                </div>
              ) : null}
              <h3 className="bookingFlowTitle">Дата и время</h3>
              <p className="bookingModeHint bookingModeHint--time">Выберите время начала — длительность и зал на следующих шагах.</p>
              {availabilityPending ? (
                <div className="bookingEmptyDay">
                  <p className="bookingEmptyTitle">Обновляем свободные окна</p>
                  <p className="bookingEmptyHint">Проверяем актуальную занятость кортов на сервере.</p>
                </div>
              ) : availabilityError ? (
                <div className="bookingTrainerEmpty">
                  <p>{availabilityError}</p>
                </div>
              ) : allSlotsForDay.length === 0 ? (
                <div className="bookingEmptyDay">
                  <p className="bookingEmptyTitle">В этот день нет свободного времени</p>
                  {nextFree && (
                    <p className="bookingEmptyHint">
                      <button
                        type="button"
                        className="bookingEmptyLink"
                        onClick={() => {
                          const [y, m, d] = nextFree.split("-").map(Number);
                          setViewYear(y);
                          setViewMonth(m - 1);
                          setSelectedDateKey(nextFree);
                          resetBookingTail();
                          setStep("datetime");
                        }}
                      >
                        {formatSelectedDateRu(nextFree)}
                      </button>
                    </p>
                  )}
                </div>
              ) : displaySlots.length === 0 ? (
                <div className="bookingTrainerEmpty">
                  <p>
                    {lockedTrainerId && selectedDateKey && isTrainerOffOnDateKey(lockedTrainerId, selectedDateKey)
                      ? "У выбранного тренера выходной в этот день."
                      : needTrainer &&
                          trainerPreferenceId !== "any" &&
                          selectedDateKey &&
                          isTrainerOffOnDateKey(trainerPreferenceId, selectedDateKey)
                        ? "У выбранного тренера выходной в этот день."
                        : preferenceBlocksDay
                          ? "Нет доступных записей."
                          : lockedHallName && allSlotsForDay.length > 0
                            ? "В этой площадке нет свободных окон в выбранный день."
                            : lockedMinDurationMins
                              ? `Нет стартов, где можно тренироваться от ${formatDurationChipRu(lockedMinDurationMins)}.`
                              : "Нет доступных слотов с учётом фильтров."}
                  </p>
                  <button
                    type="button"
                    className="bookingTrainerEmptyReset"
                    onClick={() => {
                      if (lockedTrainerId) clearLockedTrainer();
                      else if (needTrainer && trainerPreferenceId !== "any") setTrainerPreferenceId("any");
                      if (lockedHallName) clearLockedHall();
                      if (lockedMinDurationMins) clearLockedMinDuration();
                      resetBookingTail();
                    }}
                  >
                    {lockedTrainerId
                      ? "Без привязки к тренеру"
                      : needTrainer && trainerPreferenceId !== "any"
                        ? "Любой тренер"
                        : lockedHallName
                          ? "Все площадки"
                          : lockedMinDurationMins
                            ? "Любая длительность"
                          : "Сбросить фильтры"}
                  </button>
                </div>
              ) : (
                timeByPeriod.map((block) => (
                  <BookingPeriod key={block.period} label={block.label}>
                    <div className="bookingSlotGrid bookingSlotGrid--byHall">
                      {block.items.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          className="bookingSlotBtn"
                          onClick={() => handleSelectTimeLabel(s.label)}
                        >
                          <span className="bookingSlotBtnInner">
                            <span className="bookingSlotBtnTime">{s.label}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </BookingPeriod>
                ))
              )}
            </div>
          </div>
        )}
        {step === "duration" && selectedDateKey && anchorStartLabel && (
          <div className="bookingDrawerSection bookingDrawerSection--grow">
            <button
              type="button"
              className="bookingTimeBack"
              onClick={() => {
                setSelectedDurationMins(null);
                setSelectedHallName(null);
                setSelectedSlotId(null);
                setStep("datetime");
              }}
            >
              ‹ Назад ко времени
            </button>
            <p className="bookingTimeDateLabel">{formatSelectedDateRu(selectedDateKey)}</p>
            <p className="bookingFlowSubtitle">Начало: {anchorStartLabel}</p>
            <h3 className="bookingFlowTitle">Длительность и цена</h3>
            <div className="bookingDurationBar" role="group" aria-label="Длительность">
              <div className="bookingDurationChips">
                {durationChoices.map((opt) => (
                  <button
                    key={opt.durationMins}
                    type="button"
                    className={`bookingDurationChip${selectedDurationMins === opt.durationMins ? " bookingDurationChip--active" : ""}`}
                    onClick={() => handleSelectDuration(opt.durationMins)}
                  >
                    {formatDurationChipRu(opt.durationMins)}
                  </button>
                ))}
              </div>
            </div>
            {durationChoices.length === 0 ? (
              <p className="bookingChainHint bookingChainHint--warn">Нет доступных длительностей на это время. Вернитесь назад.</p>
            ) : (
              <div className="bookingServiceCards">
                {durationChoices.map((opt) => (
                  <button
                    key={opt.durationMins}
                    type="button"
                    className={`bookingServiceCard${selectedDurationMins === opt.durationMins ? " bookingServiceCard--selected" : ""}`}
                    onClick={() => handleSelectDuration(opt.durationMins)}
                  >
                    <div className="bookingServiceCardBody">
                      <span className="bookingServiceCardTitle">{opt.title}</span>
                      <span className="bookingServiceCardMeta">
                        {formatDurationChipRu(opt.durationMins)} · доступно площадок: {opt.hallsCount}
                      </span>
                      <span className="bookingServiceCardPrice">
                        {opt.priceRub.toLocaleString("ru-RU")}
                        {RUB}
                      </span>
                      <span className="bookingServiceCardBadge">100% предоплата</span>
                    </div>
                    <span className="bookingServiceCardRadio" aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {step === "venue" && selectedDateKey && anchorStartLabel && selectedDurationMins != null && (
          <div className="bookingDrawerSection bookingDrawerSection--grow">
            <button
              type="button"
              className="bookingTimeBack"
              onClick={() => {
                setSelectedHallName(null);
                setSelectedSlotId(null);
                setStep("duration");
              }}
            >
              ‹ Назад к длительности
            </button>
            <p className="bookingTimeDateLabel">{formatSelectedDateRu(selectedDateKey)}</p>
            <p className="bookingFlowSubtitle">
              {formatTimeRangeRu(anchorStartLabel, selectedDurationMins)} · {formatDurationChipRu(selectedDurationMins)}
            </p>
            <h3 className="bookingFlowTitle">Выбор площадки</h3>
            {needTrainer && trainerPreferenceId === "any" && (
              <p className="bookingVenueTrainerHint">Любой специалист — уточните тренера на шаге «Детали».</p>
            )}
            <ul className="bookingVenueList">
              {venueHallsDisplay.map((hall) => {
                const rental = getRentalPriceRub(selectedDurationMins, anchorStartLabel);
                const fee = needTrainer || lockedTrainerId ? getTrainerSessionFeeRub() : 0;
                const total = rental + fee;
                const selected = selectedHallName === hall;
                return (
                  <li key={hall}>
                    <button
                      type="button"
                      className={`bookingVenueRow${selected ? " bookingVenueRow--selected" : ""}`}
                      onClick={() => handleSelectVenue(hall)}
                    >
                      <span className="bookingVenueAvatar" aria-hidden>
                        {hall.slice(0, 2)}
                      </span>
                      <span className="bookingVenueInfo">
                        <span className="bookingVenueName">{hall}</span>
                        <span className="bookingVenueSub">{hall}</span>
                      </span>
                      <span className="bookingVenuePrice">
                        {total.toLocaleString("ru-RU")}
                        {RUB}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {venueHallsDisplay.length === 0 ? (
              <p className="bookingChainHint bookingChainHint--warn">Нет свободных площадок на этот интервал.</p>
            ) : null}
          </div>
        )}
        {step === "details" &&
          selectedDateKey &&
          selectedHallName &&
          anchorStartLabel &&
          selectedDurationMins != null && (
            <div className="bookingDrawerSection bookingDrawerSection--grow">
              <button
                type="button"
                className="bookingTimeBack"
                onClick={() => {
                  setStep("venue");
                }}
              >
                ‹ К выбору площадки
              </button>
              <h3 className="bookingFlowTitle">{isRescheduleMode ? "Новая дата записи" : "Детали записи"}</h3>
              <div className="bookingDetailBlock">
                <div className="bookingDetailRow">
                  <div className="bookingDetailMain">
                    <span className="bookingVenueAvatar bookingVenueAvatar--sm" aria-hidden>
                      {selectedHallName.slice(0, 2)}
                    </span>
                    <div>
                      <div className="bookingDetailTitle">{selectedHallName}</div>
                      <div className="bookingDetailSub">{selectedHallName}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bookingDetailEdit"
                    aria-label="Изменить площадку"
                    onClick={() => setStep("venue")}
                  >
                    ✎
                  </button>
                </div>
                <div className="bookingDetailRow">
                  <div className="bookingDetailMain">
                    <span className="bookingDetailIcon" aria-hidden>
                      📅
                    </span>
                    <div>
                      <div className="bookingDetailTitle">{formatSelectedDateRu(selectedDateKey)}</div>
                      <div className="bookingDetailSub">
                        {formatTimeRangeRu(anchorStartLabel, selectedDurationMins)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bookingDetailEdit"
                    aria-label="Изменить дату и время"
                    onClick={() => {
                      resetBookingTail();
                      setStep("datetime");
                    }}
                  >
                    ✎
                  </button>
                </div>
                {(needTrainer || lockedTrainerId) && (
                  <div className="bookingDetailRow bookingDetailRow--stack">
                    <div className="bookingDetailMain bookingDetailMain--full">
                      <span className="bookingDetailIcon" aria-hidden>
                        👤
                      </span>
                      <div className="bookingDetailGrow">
                        <div className="bookingDetailTitle">Тренер</div>
                        {lockedTrainerId || trainerPreferenceId !== "any" ? (
                          <div className="bookingDetailSub">{trainerNameResolved}</div>
                        ) : (
                          <select
                            className="bookingTrainerPrefSelect bookingTrainerPrefSelect--details"
                            value={detailsTrainerId ?? ""}
                            onChange={(e) => setDetailsTrainerId(e.target.value || null)}
                          >
                            <option value="">Выберите тренера</option>
                            {trainersForDetails.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bookingDetailServices">
                <div className="bookingDetailServicesHead">
                  <span>Услуги · {formatDurationChipRu(selectedDurationMins)}</span>
                  <button
                    type="button"
                    className="bookingDetailEdit"
                    aria-label="Изменить длительность"
                    onClick={() => {
                      setSelectedHallName(null);
                      setSelectedSlotId(null);
                      setStep("duration");
                    }}
                  >
                    ✎
                  </button>
                </div>
                <div className="bookingServiceLine">
                  <div>
                    <div className="bookingServiceLineTitle">
                      {getRentalPriceRub(selectedDurationMins, anchorStartLabel) > 0
                        ? `Аренда (${formatDurationChipRu(selectedDurationMins)})`
                        : "Аренда"}
                    </div>
                    <div className="bookingServiceLineMeta">Зал</div>
                  </div>
                  <span className="bookingServiceLinePrice">
                    {rentalSubtotalRub.toLocaleString("ru-RU")}
                    {RUB}
                  </span>
                </div>
                {trainerFeeRub > 0 && (
                  <div className="bookingServiceLine">
                    <div>
                      <div className="bookingServiceLineTitle">Тренер</div>
                      <div className="bookingServiceLineMeta">{trainerNameResolved}</div>
                    </div>
                    <span className="bookingServiceLinePrice">
                      {trainerFeeRub.toLocaleString("ru-RU")}
                      {RUB}
                    </span>
                  </div>
                )}
                <div className="bookingPrepayRow">
                  <span>Предоплата</span>
                  <span className="bookingPrepayTotal">
                    {prepayTotalRub.toLocaleString("ru-RU")}
                    {RUB}
                  </span>
                </div>
                <p className="bookingPrepayNote">100% предоплата</p>
              </div>
              <div className="bookingGuestBlock">
                <h4 className="bookingGuestTitle">Ваши данные</h4>
                <p className="bookingGuestFromProfile">
                  {isRescheduleMode ? (
                    "После подтверждения старая дата записи заменится новой."
                  ) : (
                    <>
                      Запись оформляется на <strong>{profileGuestName}</strong> — как в{" "}
                      <Link to="/app/profile" className="bookingGuestProfileLink" onClick={() => closeDrawer()}>
                        профиле
                      </Link>
                      .
                    </>
                  )}
                </p>
              </div>
              {USE_API && !getActiveBranch()?.branchId ? (
                <p className="bookingChainHint bookingChainHint--warn">
                  Для отправки брони на сервер выберите филиал на странице{" "}
                  <Link to="/branches" className="bookingGuestProfileLink" onClick={() => closeDrawer()}>
                    /branches
                  </Link>
                  .
                </p>
              ) : null}
              {submitError ? (
                <p className="bookingChainHint bookingChainHint--warn" role="alert">
                  {submitError}
                </p>
              ) : availabilityPending && USE_API ? (
                <p className="bookingChainHint">Проверяем, что время всё ещё свободно…</p>
              ) : null}
              <div className="bookingDrawerFooter bookingDrawerFooter--details">
                {returnToQuickFilters ? (
                  <button
                    type="button"
                    className="btn bookingDrawerBackToFilters"
                    disabled={submitPending}
                    onClick={handleReturnToQuickFilters}
                  >
                    Обратно
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn bookingDrawerConfirm"
                  disabled={!canConfirmDetails || submitPending}
                  onClick={() => void handleConfirm()}
                >
                  {submitPending ? "Отправка…" : isRescheduleMode ? "Подтвердить перенос" : "Забронировать"}
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
  return createPortal(panel, document.body);
}
function BookingPeriod({ label, children }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bookingPeriod">
      <button
        type="button"
        className="bookingPeriodToggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span>{label}</span>
        <span className={`bookingPeriodChev${expanded ? " bookingPeriodChev--open" : ""}`}>▼</span>
      </button>
      {expanded && <div className="bookingPeriodBody">{children}</div>}
    </div>
  );
}
