export const ADMIN_SELF_MOCK = {
  id: "adm-orlova",
  fullName: "Орлова Мария",
  email: "admin.courtly.demo@courtly.demo",
  phone: "+7 900 444-55-66",
  branchRole: "Администратор филиала",
};
export const ADMIN_KPI_MOCK = [
  { label: "Записей сегодня", value: "24", hint: "+3 к прошлой неделе" },
  { label: "Загрузка залов", value: "68%", hint: "Пик 17:00–20:00" },
  { label: "К оплате", value: "3", hint: "Напоминания отправлены" },
];
export const ADMIN_TODAY_TIMELINE = [
  { id: "a1", time: "08:00", title: "Открытие смены", place: "Ресепшен", note: "Смена: А. Козлов" },
  { id: "a2", time: "10:00", title: "Детская группа теннис", place: "Корт 3", note: "Тренер: Петрова М." },
  { id: "a3", time: "12:30", title: "Аренда зала A", place: "Зал A", note: "Корпоратив" },
  { id: "a4", time: "18:00", title: "Пик нагрузки", place: "Все корты", note: "Дежурный админ" },
];
export const ADMIN_STAFF_MOCK = [
  { id: "s1", name: "Ильин Алексей", role: "Тренер", contact: "trainer.courtly.demo@courtly.demo" },
  { id: "s2", name: "Петрова Мария", role: "Тренер", contact: "m.petrova@example.com" },
  { id: "s3", name: "Козлов Антон", role: "Администратор смены", contact: "reception@example.com" },
];
