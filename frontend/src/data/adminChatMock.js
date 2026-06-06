export const ADMIN_CHAT_FOLDERS = [
  { id: "all", label: "Все чаты", emoji: "💬" },
  { id: "clients", label: "Клиенты", emoji: "👤" },
  { id: "staff", label: "Команда", emoji: "🏋️" },
  { id: "system", label: "Система", emoji: "⚙️" },
];
export const ADMIN_CHAT_CONVERSATIONS = [
  {
    id: "c-alina",
    folder: "clients",
    name: "Алина Смирнова",
    subtitle: "была недавно",
    lastMessage: "Можно перенести запись на 19:00?",
    time: "12:42",
    unread: 2,
  },
  {
    id: "c-dmitry",
    folder: "clients",
    name: "Дмитрий К.",
    subtitle: "в сети",
    lastMessage: "Оплатил разовое — чек в приложении",
    time: "11:05",
    unread: 0,
  },
  {
    id: "g-branch",
    folder: "clients",
    name: "Общий чат филиала",
    subtitle: "12 участников",
    lastMessage: "Ильин А.: ок, жду на корте",
    time: "Вчера",
    unread: 0,
    isGroup: true,
  },
  {
    id: "t-ilin",
    folder: "staff",
    name: "Ильин Алексей",
    subtitle: "на смене",
    lastMessage: "Подтвердите замену зала на «Корт 2»",
    time: "09:18",
    unread: 1,
  },
  {
    id: "t-petrova",
    folder: "staff",
    name: "Петрова Мария",
    subtitle: "была 2 ч назад",
    lastMessage: "Группу в чт перенесла на 18:00",
    time: "Пн",
    unread: 0,
  },
  {
    id: "s-pay",
    folder: "system",
    name: "Платежи · уведомления",
    subtitle: "авто",
    lastMessage: "Не прошла оплата по брони #4821",
    time: "08:02",
    unread: 3,
  },
];
export const ADMIN_CHAT_THREAD_SEED = {
  "c-alina": [
    { id: "a1", dir: "in", text: "Здравствуйте! Подскажите, могу ли я перенести сегодняшнюю запись?", time: "12:38" },
    { id: "a2", dir: "out", text: "Добрый день! Да, если есть свободные слоты. На какое время удобно?", time: "12:39" },
    { id: "a3", dir: "in", text: "Можно перенести запись на 19:00?", time: "12:42" },
  ],
  "c-dmitry": [
    { id: "d1", dir: "in", text: "Оплатил разовое — чек в приложении", time: "11:05" },
    { id: "d2", dir: "out", text: "Получили, спасибо! Ждём вас на занятии.", time: "11:06" },
  ],
  "g-branch": [
    { id: "g1", dir: "in", text: "Кто-нибудь свободен подменить в пятницу утром?", time: "Вчера", fromName: "Орлова М." },
    { id: "g2", dir: "in", text: "ок, жду на корте", time: "Вчера", fromName: "Ильин А." },
  ],
  "t-ilin": [
    { id: "i1", dir: "in", text: "Подтвердите замену зала на «Корт 2» для пары в 17:30", time: "09:18" },
  ],
  "t-petrova": [
    { id: "p1", dir: "in", text: "Группу в чт перенесла на 18:00", time: "Пн" },
    { id: "p2", dir: "out", text: "Принято, в расписании отметила.", time: "Пн" },
  ],
  "s-pay": [
    { id: "s1", dir: "in", text: "Не прошла оплата по брони #4821 — клиент уведомлён.", time: "08:02" },
  ],
};
export const ADMIN_DOCK_CONVERSATION_IDS = ["c-alina", "t-ilin", "c-dmitry"];
