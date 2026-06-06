export const CLIENT_BASE_MOCK = [
  {
    id: "c-alina",
    branchId: "b2",
    branchName: "Courtly Riverside",
    name: "Алина Смирнова",
    email: "a.smirnova@example.com",
    phone: "+7 900 111-22-33",
    status: "Активен",
    tags: ["абонемент", "теннис"],
    lastVisit: "12 апр. 2026",
    adminMessengerConversationId: "c-alina",
    upcomingBookings: [
      {
        id: "bk-alina-1",
        whenLabel: "Сегодня, 18:00",
        title: "Теннис, индивидуально",
        trainerName: "Ильин Алексей",
        trainerStaffId: "s1",
        place: "Корт 2",
      },
      {
        id: "bk-alina-2",
        whenLabel: "Сб, 15:00",
        title: "Теннис, корт 1",
        trainerName: "Петрова Мария",
        trainerStaffId: "s2",
        place: "Корт 1",
      },
    ],
    visitHistory: [
      { id: "v-a1", date: "10 апр. 2026", summary: "Теннис · Ильин А.", place: "Корт 2" },
      { id: "v-a2", date: "3 апр. 2026", summary: "Группа · настольный теннис", place: "Зал B" },
      { id: "v-a3", date: "22 мар. 2026", summary: "Теннис · Ильин А.", place: "Корт 3" },
    ],
    payments: [
      {
        id: "p-a1",
        date: "11 апр. 2026",
        amount: "4 500 ₽",
        method: "Карта",
        status: "Оплачено",
        label: "Разовое занятие",
      },
      {
        id: "p-a2",
        date: "1 мар. 2026",
        amount: "12 000 ₽",
        method: "Счёт",
        status: "Оплачено",
        label: "Абонемент 8 посещений",
      },
    ],
  },
  {
    id: "c-dmitry",
    branchId: "b2",
    branchName: "Courtly Riverside",
    name: "Дмитрий Козлов",
    email: "d.kozlov@example.com",
    phone: "+7 900 222-44-55",
    status: "Долг по абонементу",
    tags: ["разовые"],
    lastVisit: "8 апр. 2026",
    adminMessengerConversationId: "c-dmitry",
    upcomingBookings: [
      {
        id: "bk-d1",
        whenLabel: "Завтра, 10:00",
        title: "Зал силы · персонально",
        trainerName: "Петрова Мария",
        trainerStaffId: "s2",
        place: "Зал A",
      },
    ],
    visitHistory: [
      { id: "v-d1", date: "8 апр. 2026", summary: "Зал · Петрова М.", place: "Зал A" },
      { id: "v-d2", date: "1 апр. 2026", summary: "Корт · Ильин А.", place: "Корт 2" },
    ],
    payments: [
      {
        id: "p-d1",
        date: "8 апр. 2026",
        amount: "2 200 ₽",
        method: "СБП",
        status: "Оплачено",
        label: "Разовое",
      },
      {
        id: "p-d2",
        date: "15 мар. 2026",
        amount: "8 000 ₽",
        method: "Карта",
        status: "Ожидает доплаты",
        label: "Абонемент (частично)",
      },
    ],
  },
  {
    id: "c-elena",
    branchId: "b1",
    branchName: "Courtly Downtown",
    name: "Волкова Елена",
    email: "e.volkova@example.com",
    phone: "+7 900 333-66-77",
    status: "Активен",
    tags: ["группы"],
    lastVisit: "14 апр. 2026",
    adminMessengerConversationId: null,
    upcomingBookings: [
      {
        id: "bk-e1",
        whenLabel: "Пт, 19:30",
        title: "Группа · функционал",
        trainerName: "Козлов Антон",
        place: "Зал B",
      },
    ],
    visitHistory: [
      { id: "v-e1", date: "14 апр. 2026", summary: "Группа", place: "Зал B" },
      { id: "v-e2", date: "7 апр. 2026", summary: "Группа", place: "Зал B" },
    ],
    payments: [
      {
        id: "p-e1",
        date: "10 апр. 2026",
        amount: "6 400 ₽",
        method: "Карта",
        status: "Оплачено",
        label: "Пакет групповых",
      },
    ],
  },
  {
    id: "c-ilya",
    branchId: "b3",
    branchName: "Courtly West",
    name: "Новиков Илья",
    email: "i.novikov@example.com",
    phone: "+7 900 444-88-00",
    status: "Новый",
    tags: ["пробное"],
    lastVisit: "—",
    adminMessengerConversationId: null,
    upcomingBookings: [
      {
        id: "bk-i1",
        whenLabel: "Чт, 12:00",
        title: "Пробное · теннис",
        trainerName: "Белая Дарья",
        place: "Корт 1",
      },
    ],
    visitHistory: [],
    payments: [],
  },
];
export function filterClientsByBranchId(branchId) {
  if (!branchId) return CLIENT_BASE_MOCK;
  return CLIENT_BASE_MOCK.filter((c) => c.branchId === branchId);
}
export function filterClientsForAdminBranch(branchNameFromSession) {
  if (!branchNameFromSession) return CLIENT_BASE_MOCK;
  const q = branchNameFromSession.trim().toLowerCase();
  const matched = CLIENT_BASE_MOCK.filter((c) => c.branchName.toLowerCase().includes(q));
  return matched.length ? matched : CLIENT_BASE_MOCK;
}
export function getClientBaseRecord(id) {
  return CLIENT_BASE_MOCK.find((c) => c.id === id) ?? null;
}
