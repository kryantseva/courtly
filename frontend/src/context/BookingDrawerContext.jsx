import { createContext, useCallback, useContext, useMemo, useState } from "react";
const BookingDrawerContext = createContext(null);
export function BookingDrawerProvider({ branchName, children }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("date");
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [lockedTrainerId, setLockedTrainerId] = useState(null);
  const [lockedHallName, setLockedHallName] = useState(null);
  const [lockedMinDurationMins, setLockedMinDurationMins] = useState(null);
  const [prefillDateKey, setPrefillDateKey] = useState(null);
  const [prefillStartLabel, setPrefillStartLabel] = useState(null);
  const [prefillDurationMins, setPrefillDurationMins] = useState(null);
  const [returnToQuickFilters, setReturnToQuickFilters] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState(null);
  const openDrawer = useCallback(() => {
    setLockedTrainerId(null);
    setLockedHallName(null);
    setLockedMinDurationMins(null);
    setPrefillDateKey(null);
    setPrefillStartLabel(null);
    setPrefillDurationMins(null);
    setReturnToQuickFilters(false);
    setRescheduleBookingId(null);
    setStep("date");
    setSelectedDateKey(null);
    setSelectedSlotId(null);
    setOpen(true);
  }, []);
  const openDrawerForTrainer = useCallback((trainerId) => {
    setLockedTrainerId(trainerId);
    setLockedHallName(null);
    setLockedMinDurationMins(null);
    setPrefillDateKey(null);
    setPrefillStartLabel(null);
    setPrefillDurationMins(null);
    setReturnToQuickFilters(false);
    setRescheduleBookingId(null);
    setStep("date");
    setSelectedDateKey(null);
    setSelectedSlotId(null);
    setOpen(true);
  }, []);
  const openDrawerWithFilters = useCallback((opts = {}) => {
    const {
      trainerId = null,
      hallName = null,
      minDurationMins = null,
      dateKey = null,
      startLabel = null,
      durationMins = null,
      returnToQuickFilters: shouldReturnToQuickFilters = false,
    } = opts;
    setLockedTrainerId(trainerId || null);
    setLockedHallName(hallName || null);
    setLockedMinDurationMins(
      Number.isFinite(minDurationMins) && minDurationMins > 0 ? Number(minDurationMins) : null,
    );
    setPrefillDateKey(dateKey || null);
    setPrefillStartLabel(startLabel || null);
    setPrefillDurationMins(Number.isFinite(durationMins) && durationMins > 0 ? Number(durationMins) : null);
    setReturnToQuickFilters(Boolean(shouldReturnToQuickFilters));
    setRescheduleBookingId(null);
    setStep("date");
    setSelectedDateKey(null);
    setSelectedSlotId(null);
    setOpen(true);
  }, []);
  const openDrawerForReschedule = useCallback((opts) => {
    const { bookingId, hallName = null, durationMins = null } = opts || {};
    if (!bookingId) return;
    setLockedTrainerId(null);
    setLockedHallName(hallName || null);
    setLockedMinDurationMins(Number.isFinite(durationMins) && durationMins > 0 ? Number(durationMins) : null);
    setPrefillDateKey(null);
    setPrefillStartLabel(null);
    setPrefillDurationMins(null);
    setReturnToQuickFilters(false);
    setRescheduleBookingId(String(bookingId));
    setStep("date");
    setSelectedDateKey(null);
    setSelectedSlotId(null);
    setOpen(true);
  }, []);
  const closeDrawer = useCallback(() => {
    setLockedTrainerId(null);
    setLockedHallName(null);
    setLockedMinDurationMins(null);
    setPrefillDateKey(null);
    setPrefillStartLabel(null);
    setPrefillDurationMins(null);
    setReturnToQuickFilters(false);
    setRescheduleBookingId(null);
    setOpen(false);
  }, []);
  const clearLockedTrainer = useCallback(() => {
    setLockedTrainerId(null);
  }, []);
  const clearLockedHall = useCallback(() => {
    setLockedHallName(null);
  }, []);
  const clearLockedMinDuration = useCallback(() => {
    setLockedMinDurationMins(null);
  }, []);
  const clearPrefillStart = useCallback(() => {
    setPrefillDateKey(null);
    setPrefillStartLabel(null);
    setPrefillDurationMins(null);
  }, []);
  const value = useMemo(
    () => ({
      open,
      step,
      selectedDateKey,
      selectedSlotId,
      lockedTrainerId,
      lockedHallName,
      lockedMinDurationMins,
      prefillDateKey,
      prefillStartLabel,
      prefillDurationMins,
      returnToQuickFilters,
      rescheduleBookingId,
      branchName,
      openDrawer,
      openDrawerForTrainer,
      openDrawerWithFilters,
      openDrawerForReschedule,
      closeDrawer,
      clearLockedTrainer,
      clearLockedHall,
      clearLockedMinDuration,
      clearPrefillStart,
      setStep,
      setSelectedDateKey,
      setSelectedSlotId,
    }),
    [
      open,
      step,
      selectedDateKey,
      selectedSlotId,
      lockedTrainerId,
      lockedHallName,
      lockedMinDurationMins,
      prefillDateKey,
      prefillStartLabel,
      prefillDurationMins,
      returnToQuickFilters,
      rescheduleBookingId,
      branchName,
      openDrawer,
      openDrawerForTrainer,
      openDrawerWithFilters,
      openDrawerForReschedule,
      closeDrawer,
      clearLockedTrainer,
      clearLockedHall,
      clearLockedMinDuration,
      clearPrefillStart,
    ],
  );
  return <BookingDrawerContext.Provider value={value}>{children}</BookingDrawerContext.Provider>;
}
export function useBookingDrawer() {
  const ctx = useContext(BookingDrawerContext);
  if (!ctx) {
    throw new Error("useBookingDrawer must be used within BookingDrawerProvider");
  }
  return ctx;
}
