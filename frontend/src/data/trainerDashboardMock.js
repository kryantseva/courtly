export const TRAINER_SELF_MOCK = {
  fullName: "Ильин Алексей",
  email: "trainer.courtly.demo@courtly.demo",
  phone: "+7 900 111-22-33",
  specialties: "Теннис, функциональный тренинг",
  bio: "Кандидат в мастера спорта. Работа с детьми и взрослыми, подготовка к турнирам.",
  photoUrl: "",
};
export const TRAINER_MY_SESSIONS = [
  {
    id: "t1",
    dateLabel: "15 апреля 2026",
    dateKey: "2026-04-15",
    time: "10:00–11:00",
    title: "Персональная тренировка",
    place: "Корт 2",
    clientSummary: "Алина С.",
    status: "Подтверждено",
    tone: "ok",
    clients: [{ id: "c1", name: "Смирнова Алина", contact: "you@example.com" }],
  },
  {
    id: "t2",
    dateLabel: "15 апреля 2026",
    dateKey: "2026-04-15",
    time: "14:00–15:30",
    title: "Парная игра + разбор",
    place: "Корт 1",
    clientSummary: "Дмитрий К., Елена В.",
    status: "Подтверждено",
    tone: "ok",
    clients: [
      { id: "c2", name: "Козлов Дмитрий", contact: "d.kozlov@example.com" },
      { id: "c3", name: "Волкова Елена", contact: "e.volkova@example.com" },
    ],
  },
  {
    id: "t3",
    dateLabel: "15 апреля 2026",
    dateKey: "2026-04-15",
    time: "18:00–19:00",
    title: "Функционал",
    place: "Зал B",
    clientSummary: "Группа до 6 чел.",
    status: "Нужно подтверждение",
    tone: "warn",
    clients: [
      { id: "c4", name: "Новиков Илья", contact: "i.novikov@example.com" },
      { id: "c5", name: "Гость (ожидание)", contact: "—" },
    ],
  },
];
export const TRAINER_TODAY_SESSIONS = TRAINER_MY_SESSIONS;
export const TRAINER_CALENDAR_WEEK = [
  {
    id: "w1",
    day: "Пн",
    date: "14 апр.",
    loadPct: 72,
    segments: [
      { type: "free", range: "08:00–10:00" },
      { type: "busy", range: "10:00–12:00", label: "2 занятия" },
      { type: "free", range: "12:00–14:00" },
      { type: "busy", range: "14:00–18:00", label: "Зал B" },
      { type: "free", range: "18:00–21:00" },
    ],
  },
  {
    id: "w2",
    day: "Вт",
    date: "15 апр.",
    loadPct: 88,
    segments: [
      { type: "busy", range: "09:00–12:00", label: "Корт 1–2" },
      { type: "free", range: "12:00–13:30" },
      { type: "busy", range: "14:00–19:30", label: "Пик" },
      { type: "free", range: "19:30–21:00" },
    ],
  },
  {
    id: "w3",
    day: "Ср",
    date: "16 апр.",
    loadPct: 0,
    segments: [{ type: "free", range: "08:00–21:00", label: "Нет записей (ваша доступность)" }],
  },
  {
    id: "w4",
    day: "Чт",
    date: "17 апр.",
    loadPct: 55,
    segments: [
      { type: "busy", range: "10:00–11:30" },
      { type: "free", range: "11:30–14:00" },
      { type: "busy", range: "14:00–16:00" },
      { type: "free", range: "16:00–21:00" },
    ],
  },
  {
    id: "w5",
    day: "Пт",
    date: "18 апр.",
    loadPct: 65,
    segments: [
      { type: "busy", range: "08:00–12:00" },
      { type: "free", range: "12:00–15:00" },
      { type: "busy", range: "15:00–19:00" },
      { type: "free", range: "19:00–21:00" },
    ],
  },
];
export const TRAINER_WEEK_PREVIEW = TRAINER_CALENDAR_WEEK.map((r) => ({
  id: r.id,
  day: `${r.day} ${r.date}`,
  slots: r.segments.map((s) => `${s.range}${s.label ? ` (${s.label})` : ""}`).join(" · "),
}));
