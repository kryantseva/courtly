export const TRAINER_CHAT_FOLDERS = [
  { id: "all", label: "Все", emoji: "💬" },
  { id: "clients", label: "Клиенты", emoji: "👤" },
  { id: "admin", label: "Админ", emoji: "🛎️" },
];
export const TRAINER_CHAT_CONVERSATIONS = [
  {
    id: "adm",
    folder: "admin",
    name: "Администратор филиала",
    subtitle: "Орлова М.",
    lastMessage: "Подтвердите слот на субботу 10:00",
    time: "10:22",
    unread: 1,
  },
  {
    id: "cl-smir",
    folder: "clients",
    name: "Алина Смирнова",
    subtitle: "клиент",
    lastMessage: "Спасибо, до встречи на корте!",
    time: "Вчера",
    unread: 0,
  },
  {
    id: "cl-group",
    folder: "clients",
    name: "Мини-группа · йога",
    subtitle: "6 участников",
    lastMessage: "Петрова М.: перенос на 18:00 согласован",
    time: "Пн",
    unread: 0,
    isGroup: true,
  },
];
export const TRAINER_CHAT_THREAD_SEED = {
  adm: [
    { id: "1", dir: "in", text: "Добрый день! Нужна ваша отметка по слоту суббота 10:00 — клиент ждёт подтверждения.", time: "10:20" },
    { id: "2", dir: "out", text: "Да, веду. Подтверждаю.", time: "10:21" },
    { id: "3", dir: "in", text: "Подтвердите слот на субботу 10:00", time: "10:22" },
  ],
  "cl-smir": [
    { id: "s1", dir: "in", text: "До встречи! На корте 2 буду в 17:50", time: "Вчера" },
    { id: "s2", dir: "out", text: "Спасибо, до встречи на корте!", time: "Вчера" },
  ],
  "cl-group": [
    { id: "g1", dir: "in", text: "Девочки, кто на чт в 18:00?", time: "Пн", fromName: "Участник" },
    { id: "g2", dir: "in", text: "перенос на 18:00 согласован", time: "Пн", fromName: "Петрова М." },
  ],
};
export const TRAINER_DOCK_CONVERSATION_IDS = ["adm", "cl-smir"];
