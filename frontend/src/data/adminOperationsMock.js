export const ADMIN_BOOKINGS_LIST_MOCK = [
  {
    id: "bk1",
    time: "Сегодня 10:00",
    hall: "Корт 2",
    client: "Смирнова А.",
    clientId: "c-alina",
    trainer: "Ильин А.",
    trainerStaffId: "s1",
    status: "Подтверждено",
    kind: "lesson",
  },
  {
    id: "bk2",
    time: "Сегодня 14:30",
    hall: "Зал B",
    client: "Группа функционал",
    clientId: null,
    trainer: "Ильин А.",
    trainerStaffId: "s1",
    status: "Подтверждено",
    kind: "group",
    isGroup: true,
  },
  {
    id: "bk3",
    time: "Сегодня 18:00",
    hall: "Корт 1",
    client: "Козлов Д.",
    clientId: "c-dmitry",
    trainer: "—",
    trainerStaffId: null,
    status: "Ожидает",
    kind: "lesson",
  },
  {
    id: "bk4",
    time: "Завтра 09:00",
    hall: "Корт 3",
    client: "Смирнова А.",
    clientId: "c-alina",
    trainer: "Петрова М.",
    trainerStaffId: "s2",
    status: "Подтверждено",
    kind: "lesson",
  },
];
export function getAdminBookingsForClient(clientId) {
  if (!clientId) return [];
  return ADMIN_BOOKINGS_LIST_MOCK.filter((b) => b.clientId === clientId);
}
export const ADMIN_ROOMS_MOCK = [
  { id: "r1", label: "Корт 1", type: "Теннис", status: "Активен" },
  { id: "r2", label: "Корт 2", type: "Теннис", status: "Активен" },
  { id: "r3", label: "Зал функционала", type: "Групповой", status: "Активен" },
];
export const ADMIN_PAYMENTS_MOCK = [
  {
    id: "p1",
    client: "Смирнова А.",
    amount: "1 200 ₽",
    status: "Оплачено",
    booking: "Корт 2, сегодня 10:00",
    method: "Карта",
    bookingId: "bk1",
  },
  {
    id: "p2",
    client: "Козлов Д.",
    amount: "800 ₽",
    status: "К оплате",
    booking: "Корт 1, сегодня 18:00",
    method: "—",
    bookingId: "bk3",
  },
  {
    id: "p3",
    client: "Группа функционал",
    amount: "4 500 ₽",
    status: "Частично",
    booking: "Зал B, группа",
    method: "Счёт",
    bookingId: "bk2",
  },
  {
    id: "p4",
    client: "Смирнова А.",
    amount: "1 500 ₽",
    status: "Оплачено",
    booking: "Корт 3, завтра 09:00",
    method: "СБП",
    bookingId: "bk4",
  },
];
export function getAdminPaymentsForBooking(bookingId) {
  return ADMIN_PAYMENTS_MOCK.filter((p) => p.bookingId === bookingId);
}
export const ADMIN_EVENTS_MOCK = [
  {
    id: "ev1",
    title: "Весенний турнир одиночек (NTRP 3.5)",
    kind: "tournament",
    startLabel: "25 апр. 2026",
    endLabel: "27 апр. 2026",
    venue: "Корты 1–4, Courtly Riverside",
    status: "Регистрация открыта",
    format: "Олимпийская система, матч за 3-е место",
    maxParticipants: 32,
    registered: 18,
    notes: "Судейство: штат тренеров. Призы — сертификаты сети.",
  },
  {
    id: "ev2",
    title: "День открытых дверей",
    kind: "open_day",
    startLabel: "3 мая 2026",
    endLabel: "3 мая 2026",
    venue: "Весь филиал",
    status: "Черновик",
    maxParticipants: 200,
    registered: 0,
  },
  {
    id: "ev3",
    title: "Детский лагерь «Мини-теннис»",
    kind: "camp",
    startLabel: "1 июня 2026",
    endLabel: "14 июня 2026",
    venue: "Корт 3 + зал B",
    status: "Планируется",
    format: "Группы по 8 человек, 2 смены",
    maxParticipants: 48,
    registered: 12,
  },
];
export const ADMIN_EVENT_KIND_LABELS = {
  tournament: "Турнир",
  open_day: "День открытых дверей",
  camp: "Лагерь / интенсив",
  maintenance_block: "Блок под обслуживание",
  corporate: "Корпоративное мероприятие",
};
export const ADMIN_SLOT_HALL_OPTIONS = ADMIN_ROOMS_MOCK.map((r) => ({ id: r.id, label: r.label }));
