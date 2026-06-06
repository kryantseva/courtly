export { CLIENT_PROFILE_MOCK, getClientProfileLive } from "../data/clientProfileMock";
export {
  TRAINERS_PUBLIC,
  chainSlotsForHallAndLabels,
  countBookableSlotsOnDate,
  durationOptionsForStart,
  filterSlotsByHall,
  getBranchHallNames,
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
} from "../components/booking/mockSlots";
import {
  durationOptionsForStart,
  filterSlotsByHall,
  getMockSlotsForDate,
  hasSlotsForDateKey,
  isTrainerOffOnDateKey,
  minutesToSlotLabel,
  slotLabelToMinutes,
} from "../components/booking/mockSlots";
export function formatDurationRu(mins) {
  if (mins === 30) return "30 мин";
  if (mins === 60) return "1 ч";
  if (mins === 90) return "1,5 ч";
  return `${mins} мин`;
}
export function getTrainerPhotoFallback(name = "Тренер") {
  const safeName = String(name);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="540" viewBox="0 0 720 540">
      <rect width="720" height="540" fill="#eef6f5"/>
      <circle cx="360" cy="208" r="84" fill="#cfe7e3"/>
      <path d="M216 432c34-76 93-116 144-116s110 40 144 116" fill="#cfe7e3"/>
      <text x="360" y="486" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" fill="#0f766e">
        ${safeName}
      </text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
export function getSlotDurationMeta(dateKey, hallName, startLabel) {
  if (!dateKey || !hallName || !startLabel) {
    return { maxDurationMins: 0, availableDurations: [], freeUntilLabel: null };
  }
  const daySlots = getMockSlotsForDate(dateKey);
  const hallSlots = filterSlotsByHall(daySlots, hallName);
  const opts = durationOptionsForStart(hallSlots, startLabel);
  if (!opts.length) {
    return { maxDurationMins: 0, availableDurations: [], freeUntilLabel: null };
  }
  const availableDurations = opts.map((o) => o.durationMins);
  const maxDurationMins = availableDurations[availableDurations.length - 1];
  const freeUntilLabel = minutesToSlotLabel(slotLabelToMinutes(startLabel) + maxDurationMins);
  return { maxDurationMins, availableDurations, freeUntilLabel };
}
function dateToKey(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function getNearestSlotSuggestions({
  hallName = null,
  trainerId = null,
  minDurationMins = null,
  dateKey = null,
  timeFromLabel = null,
  timeToLabel = null,
  limit = 4,
  lookaheadDays = 21,
} = {}) {
  const out = [];
  const now = new Date();
  const fromMins = timeFromLabel ? slotLabelToMinutes(timeFromLabel) : null;
  const toMins = timeToLabel ? slotLabelToMinutes(timeToLabel) : null;
  for (let dayOffset = 0; dayOffset < lookaheadDays; dayOffset++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const key = dateToKey(dt);
    if (dateKey && key !== dateKey) continue;
    if (!hasSlotsForDateKey(key)) continue;
    if (trainerId && isTrainerOffOnDateKey(trainerId, key)) continue;
    let daySlots = getMockSlotsForDate(key);
    if (hallName) daySlots = filterSlotsByHall(daySlots, hallName);
    daySlots = [...daySlots].sort((a, b) => slotLabelToMinutes(a.label) - slotLabelToMinutes(b.label));
    for (const s of daySlots) {
      const startMins = slotLabelToMinutes(s.label);
      if (fromMins != null && startMins < fromMins) continue;
      if (toMins != null && startMins > toMins) continue;
      const durationMeta = getSlotDurationMeta(key, s.hallName, s.label);
      if (!durationMeta.maxDurationMins) continue;
      if (minDurationMins && durationMeta.maxDurationMins < minDurationMins) continue;
      out.push({
        dateKey: key,
        label: s.label,
        hallName: s.hallName,
        hint: dayOffset === 0 ? "Сегодня" : dayOffset === 1 ? "Завтра" : "Ближайшие дни",
        durationMeta,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
