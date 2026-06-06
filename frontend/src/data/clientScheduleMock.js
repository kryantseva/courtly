export const CLIENT_BOOKING_CANCEL_MIN_HOURS = 12;
export const CLIENT_HOME_UPCOMING = [
  {
    id: "u1",
    bookingId: "u1",
    title: "Теннис, корт 2",
    when: "Сегодня, 18:00",
    until: "19:30",
    status: "Подтверждено",
  },
  {
    id: "u2",
    bookingId: "u2",
    title: "Зал функционала",
    when: "Завтра, 09:30",
    until: "11:00",
    status: "Ожидает оплаты",
  },
];
export const CLIENT_NEAR_SLOTS = [
  { dateKey: "2026-04-14", label: "18:00", hallName: "Корт 1", hint: "Сегодня" },
  { dateKey: "2026-04-14", label: "12:00", hallName: "Зал B", hint: "Сегодня" },
  { dateKey: "2026-04-15", label: "9:00", hallName: "Корт 2", hint: "Завтра" },
  { dateKey: "2026-04-15", label: "12:30", hallName: "Зал A", hint: "Завтра" },
];
export const CLIENT_RECOMMENDED_TRAINER_IDS = ["ilin", "petrova"];
export const CLIENT_TRAINER_FREE_SLOTS = {
  ilin: [
    { dateKey: "2026-04-14", label: "8:00", hallName: "Корт 1" },
    { dateKey: "2026-04-14", label: "12:00", hallName: "Корт 2" },
    { dateKey: "2026-04-15", label: "9:00", hallName: "Корт 1" },
  ],
  petrova: [
    { dateKey: "2026-04-14", label: "8:30", hallName: "Зал A" },
    { dateKey: "2026-04-15", label: "12:30", hallName: "Зал A" },
  ],
  sokolov: [
    { dateKey: "2026-04-14", label: "13:00", hallName: "Зал силы" },
    { dateKey: "2026-04-17", label: "18:00", hallName: "Зал силы" },
  ],
};
export const CLIENT_HALLS = [
  {
    id: "court-1",
    name: "Корт 1",
    kind: "Теннис",
    description: "Крытый хард с освещением. Подходит для индивидуальных и парных тренировок.",
  },
  {
    id: "court-2",
    name: "Корт 2",
    kind: "Теннис",
    description: "Универсальное покрытие, аренда ракеток на стойке администратора.",
  },
  {
    id: "hall-a",
    name: "Зал A",
    kind: "Групповые",
    description: "Зал для йоги, растяжки и мини-групп до 12 человек.",
  },
  {
    id: "hall-b",
    name: "Зал B",
    kind: "Функционал",
    description: "Пространство для ОФП и функциональных тренировок.",
  },
  {
    id: "functional",
    name: "Зал функционала",
    kind: "Функционал",
    description: "Резиновое покрытие, зона TRX и гирь.",
  },
  {
    id: "strength",
    name: "Зал силы",
    kind: "Силовой",
    description: "Тренажёры и свободные веса, персональные программы.",
  },
];
export const CLIENT_HALL_FREE_SLOTS = {
  "court-1": [
    { dateKey: "2026-04-14", label: "7:00" },
    { dateKey: "2026-04-14", label: "9:00" },
    { dateKey: "2026-04-15", label: "8:00" },
  ],
  "court-2": [
    { dateKey: "2026-04-14", label: "8:00" },
    { dateKey: "2026-04-15", label: "13:00" },
  ],
  "hall-a": [
    { dateKey: "2026-04-14", label: "8:30" },
    { dateKey: "2026-04-14", label: "12:30" },
  ],
  "hall-b": [
    { dateKey: "2026-04-14", label: "7:30" },
    { dateKey: "2026-04-14", label: "12:00" },
  ],
  functional: [
    { dateKey: "2026-04-14", label: "9:30" },
    { dateKey: "2026-04-15", label: "9:30" },
  ],
  strength: [
    { dateKey: "2026-04-14", label: "13:00" },
    { dateKey: "2026-04-17", label: "18:00" },
  ],
};
const CLIENT_BOOKINGS_DETAIL_LIST = [
  {
    id: "u1",
    title: "Теннис, корт 2",
    whenLabel: "14 апр. 2026, 18:00",
    place: "Корт 2",
    status: "Подтверждено",
    tone: "ok",
    startsAtIso: "2026-04-14T18:00:00",
    trainerId: "ilin",
    hallName: "Корт 2",
    needsAdminConfirm: false,
    segment: "upcoming",
  },
  {
    id: "u2",
    title: "Зал функционала",
    whenLabel: "15 апр. 2026, 09:30",
    place: "Зал B",
    status: "Ожидает оплаты",
    tone: "warn",
    startsAtIso: "2026-04-15T09:30:00",
    trainerId: null,
    hallName: "Зал функционала",
    needsAdminConfirm: true,
    segment: "upcoming",
  },
  {
    id: "p1",
    title: "Йога, мини-группа",
    whenLabel: "10 апр. 2026, 08:00",
    place: "Зал A",
    status: "Посещено",
    tone: "muted",
    startsAtIso: "2026-04-10T08:00:00",
    trainerId: "petrova",
    hallName: "Зал A",
    needsAdminConfirm: false,
    segment: "past",
  },
  {
    id: "p2",
    title: "Теннис, корт 1",
    whenLabel: "5 апр. 2026, 19:00",
    place: "Корт 1",
    status: "Отменено",
    tone: "cancel",
    startsAtIso: "2026-04-05T19:00:00",
    trainerId: "ilin",
    hallName: "Корт 1",
    needsAdminConfirm: false,
    segment: "past",
  },
  {
    id: "p3",
    title: "Персональная тренировка",
    whenLabel: "1 апр. 2026, 12:00",
    place: "Зал силы",
    status: "Посещено",
    tone: "muted",
    startsAtIso: "2026-04-01T12:00:00",
    trainerId: "sokolov",
    hallName: "Зал силы",
    needsAdminConfirm: false,
    segment: "past",
  },
];
export const CLIENT_BOOKINGS_BY_ID = Object.fromEntries(CLIENT_BOOKINGS_DETAIL_LIST.map((b) => [b.id, b]));
export function getClientBookingById(id) {
  return CLIENT_BOOKINGS_BY_ID[id] ?? null;
}
export function hoursUntilStart(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return -Infinity;
  return (t - Date.now()) / (60 * 60 * 1000);
}
export const CLIENT_HISTORY_UPCOMING = [
  { id: "u1", title: "Теннис, корт 2", when: "14 апр., 18:00", place: "Корт 2", status: "Подтверждено", tone: "ok" },
  { id: "u2", title: "Зал функционала", when: "15 апр., 09:30", place: "Зал B", status: "Ожидает оплаты", tone: "warn" },
];
export const CLIENT_HISTORY_PAST = [
  { id: "p1", title: "Йога, мини-группа", when: "10 апр., 08:00", place: "Зал A", status: "Посещено", tone: "muted" },
  { id: "p2", title: "Теннис, корт 1", when: "5 апр., 19:00", place: "Корт 1", status: "Отменено", tone: "cancel" },
  { id: "p3", title: "Персональная тренировка", when: "1 апр., 12:00", place: "Зал силы", status: "Посещено", tone: "muted" },
];
export const CLIENT_PAYMENTS_MOCK = [
  {
    id: "1",
    title: "Абонемент «10 посещений»",
    amount: "4 500 руб.",
    date: "12 апр. 2026",
    status: "Оплачено",
    hint: "Чек отправлен на email",
  },
  {
    id: "2",
    title: "Разовое занятие — зал функционала",
    amount: "800 руб.",
    date: "15 апр. 2026",
    status: "К оплате",
    hint: "Оплатите до начала занятия",
  },
  {
    id: "3",
    title: "Теннис, корт 2",
    amount: "1 200 руб.",
    date: "3 апр. 2026",
    status: "Оплачено",
    hint: null,
  },
];
