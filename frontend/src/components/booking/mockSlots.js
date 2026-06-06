export const TRAINERS_PUBLIC = [
  {
    id: "ilin",
    name: "Ильин А.",
    hint: "Теннис, функционал",
    bio: "Индивидуальные и парные тренировки, подготовка к соревнованиям и мягкое возвращение в форму после перерыва.",
    photoUrl:
      "https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=720&h=540&q=80",
    experience:
      "12 лет тренерской практики в теннисе и функциональном тренинге. Работа с детьми, подростками и взрослыми любого уровня.",
    achievements:
      "Мастер спорта по теннису. Подготовка призёров региональных первенств. Участие в программах Федерации тенниса России для тренеров детско-юношеских групп.",
  },
  {
    id: "petrova",
    name: "Петрова М.",
    hint: "Йога, группы",
    bio: "Хатха-йога, растяжка и осанка. Групповые и персональные форматы без перегруза.",
    photoUrl:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=720&h=540&q=80",
    experience:
      "8 лет преподавания йоги и мобильности. Ведение групп в зале и короткие курсы для офисных команд.",
    achievements:
      "Сертификат RYT 200. Спикер городских дней здоровья. Автор серии занятий по шее и пояснице для начинающих.",
  },
  {
    id: "sokolov",
    name: "Соколов Д.",
    hint: "Силовой зал",
    bio: "Силовая подготовка и ОФП с упором на технику и безопасные объёмы нагрузки.",
    photoUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=720&h=540&q=80",
    experience:
      "10 лет в силовых дисциплинах и сопровождении после травм опорно-двигательного аппарата (по назначению врача).",
    achievements:
      "КМС по пауэрлифтингу. Участник и призёр соревнований силового троеборья. Курсы по периодизации нагрузки и работе с новичками.",
  },
];
export const TRAINERS_FOR_BOOKING = TRAINERS_PUBLIC;
export const TRAINER_OFF_WEEKDAYS = {
  ilin: [0],
  petrova: [6],
  sokolov: [0, 2],
};
export function isTrainerOffOnDateKey(trainerId, key) {
  if (!trainerId || !key) return true;
  const off = TRAINER_OFF_WEEKDAYS[trainerId];
  if (!off?.length) return false;
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return off.includes(dow);
}
export function filterSlotsByHall(slots, hallPreference) {
  if (!hallPreference || hallPreference === "any") return slots;
  return slots.filter((s) => s.hallName === hallPreference);
}
export function countBookableSlotsOnDate(key, hallPreference = "any") {
  if (!hasSlotsForDateKey(key)) return 0;
  return filterSlotsByHall(getMockSlotsForDate(key), hallPreference).length;
}
export function countSlotsForTrainerOnDate(key, trainerId, hallPreference = "any") {
  if (!trainerId || !hasSlotsForDateKey(key) || isTrainerOffOnDateKey(trainerId, key)) return 0;
  return countBookableSlotsOnDate(key, hallPreference);
}
export function countAllSlotsOnDate(key) {
  if (!hasSlotsForDateKey(key)) return 0;
  return getMockSlotsForDate(key).length;
}
export function trainersAvailableOnDateKey(key) {
  if (!key || !hasSlotsForDateKey(key)) return [];
  return TRAINERS_PUBLIC.filter((t) => !isTrainerOffOnDateKey(t.id, key));
}
export function hasSlotsForDateKey(key) {
  if (!key) return false;
  const [, , d] = key.split("-").map(Number);
  return d % 5 !== 1;
}
export function getBranchHallNames() {
  const sampleKey = "2026-04-14";
  if (!hasSlotsForDateKey(sampleKey)) return [];
  const slots = getMockSlotsForDate(sampleKey);
  return [...new Set(slots.map((s) => s.hallName))].sort((a, b) => a.localeCompare(b, "ru"));
}
export function getMockSlotsForDate(key) {
  if (!hasSlotsForDateKey(key)) return [];
  return [
    {
      id: `${key}-07`,
      label: "7:00",
      period: "morning",
      hallName: "Корт 1",
      trainers: [],
    },
    {
      id: `${key}-073k1`,
      label: "7:30",
      period: "morning",
      hallName: "Корт 1",
      trainers: [],
    },
    {
      id: `${key}-080k1`,
      label: "8:00",
      period: "morning",
      hallName: "Корт 1",
      trainers: [],
    },
    {
      id: `${key}-073`,
      label: "7:30",
      period: "morning",
      hallName: "Зал B",
      trainers: [],
    },
    {
      id: `${key}-08`,
      label: "8:00",
      period: "morning",
      hallName: "Корт 2",
      trainers: [],
    },
    {
      id: `${key}-083`,
      label: "8:30",
      period: "morning",
      hallName: "Зал A",
      trainers: [],
    },
    {
      id: `${key}-09`,
      label: "9:00",
      period: "morning",
      hallName: "Корт 1",
      trainers: [],
    },
    {
      id: `${key}-093`,
      label: "9:30",
      period: "morning",
      hallName: "Зал функционала",
      trainers: [],
    },
    {
      id: `${key}-12`,
      label: "12:00",
      period: "day",
      hallName: "Зал B",
      trainers: [],
    },
    {
      id: `${key}-123`,
      label: "12:30",
      period: "day",
      hallName: "Зал A",
      trainers: [],
    },
    {
      id: `${key}-13`,
      label: "13:00",
      period: "day",
      hallName: "Корт 2",
      trainers: [],
    },
    {
      id: `${key}-18`,
      label: "18:00",
      period: "evening",
      hallName: "Корт 1",
      trainers: [],
    },
    {
      id: `${key}-183`,
      label: "18:30",
      period: "evening",
      hallName: "Зал силы",
      trainers: [],
    },
    {
      id: `${key}-19`,
      label: "19:00",
      period: "evening",
      hallName: "Корт 2",
      trainers: [],
    },
  ];
}
const PERIOD_LABELS = {
  morning: "Утро",
  day: "День",
  evening: "Вечер",
};
export function groupSlotsByPeriod(slots) {
  const map = { morning: [], day: [], evening: [] };
  for (const s of slots) {
    map[s.period].push(s);
  }
  return ( (["morning", "day", "evening"]))
    .filter((k) => map[k].length > 0)
    .map((k) => ({ period: k, label: PERIOD_LABELS[k], items: map[k] }));
}
export function slotLabelToMinutes(label) {
  const parts = String(label).split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}
export function minutesToSlotLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
export function slotLabelsForHalfOpenRange(startLabel, endLabelExclusive) {
  const start = slotLabelToMinutes(startLabel);
  const end = slotLabelToMinutes(endLabelExclusive);
  if (end <= start || (end - start) % 30 !== 0) return null;
  const labels = [];
  for (let t = start; t < end; t += 30) {
    labels.push(minutesToSlotLabel(t));
  }
  return labels;
}
export function hallHasAllSlotLabels(hallName, slots, requiredLabels) {
  const labels = new Set(slots.filter((s) => s.hallName === hallName).map((s) => s.label));
  return requiredLabels.every((lab) => labels.has(lab));
}
export function hallsAvailableForTimeRange(slots, startLabel, endLabelExclusive) {
  const labels = slotLabelsForHalfOpenRange(startLabel, endLabelExclusive);
  if (!labels?.length) return [];
  const halls = [...new Set(slots.map((s) => s.hallName))].sort((a, b) => a.localeCompare(b, "ru"));
  return halls.filter((h) => hallHasAllSlotLabels(h, slots, labels));
}
export const BOOKING_DURATION_OPTIONS = [30, 60, 90];
const EVENING_TARIFF_START_MIN = 17 * 60;
export function isBeforeEveningTariff(startLabel) {
  return slotLabelToMinutes(startLabel) < EVENING_TARIFF_START_MIN;
}
export function getRentalPriceRub(durationMins, startLabel) {
  const day = isBeforeEveningTariff(startLabel);
  const table = day
    ? { 30: 1500, 60: 2800, 90: 4000 }
    : { 30: 1800, 60: 3300, 90: 4700 };
  return table[durationMins] ?? 0;
}
export function getRentalTitleRu(durationMins, startLabel) {
  const band = isBeforeEveningTariff(startLabel) ? "до 17:00" : "после 17:00";
  const dur =
    durationMins === 60 ? "1 ч" : durationMins === 90 ? "1,5 ч" : `${durationMins} мин`;
  return `Аренда зала ${dur} (${band})`;
}
export function getTrainerSessionFeeRub() {
  return 2000;
}
export function hallsForStartAndDuration(slots, startLabel, durationMins) {
  const endExclusive = minutesToSlotLabel(slotLabelToMinutes(startLabel) + durationMins);
  return hallsAvailableForTimeRange(slots, startLabel, endExclusive);
}
export function durationOptionsForStart(slots, startLabel) {
  const out = [];
  for (const m of BOOKING_DURATION_OPTIONS) {
    const halls = hallsForStartAndDuration(slots, startLabel, m);
    if (halls.length > 0) {
      out.push({
        durationMins: m,
        hallsCount: halls.length,
        priceRub: getRentalPriceRub(m, startLabel),
        title: getRentalTitleRu(m, startLabel),
      });
    }
  }
  return out;
}
export function chainSlotsForHallAndLabels(hallName, slots, requiredLabels) {
  const byLabel = new Map(slots.filter((s) => s.hallName === hallName).map((s) => [s.label, s]));
  const chain = [];
  for (const lab of requiredLabels) {
    const s = byLabel.get(lab);
    if (!s) return null;
    chain.push(s);
  }
  return chain;
}
export function slotDayBoundsMinutes(slots) {
  if (!slots.length) return { min: 7 * 60, maxEndExclusive: 22 * 60 };
  const mins = slots.map((s) => slotLabelToMinutes(s.label));
  const min = Math.min(...mins);
  const maxStart = Math.max(...mins);
  return { min, maxEndExclusive: maxStart + 30 };
}
export function groupSlotsByHall(slots) {
  const byHall = new Map();
  for (const s of slots) {
    if (!byHall.has(s.hallName)) byHall.set(s.hallName, []);
    byHall.get(s.hallName).push(s);
  }
  return [...byHall.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ru"))
    .map(([hallName, items]) => ({
      hallName,
      items: [...items].sort((x, y) => slotLabelToMinutes(x.label) - slotLabelToMinutes(y.label)),
    }));
}
export function findConsecutiveBookingChain(hallSlots, startSlot, stepCount) {
  if (!stepCount || stepCount < 1) return null;
  const sorted = [...hallSlots].sort((a, b) => slotLabelToMinutes(a.label) - slotLabelToMinutes(b.label));
  const idx = sorted.findIndex((s) => s.id === startSlot.id);
  if (idx === -1) return null;
  const startMin = slotLabelToMinutes(startSlot.label);
  const chain = [];
  for (let i = 0; i < stepCount; i++) {
    const expectedMin = startMin + i * 30;
    const cur = sorted[idx + i];
    if (!cur || slotLabelToMinutes(cur.label) !== expectedMin) return null;
    chain.push(cur);
  }
  return chain;
}
