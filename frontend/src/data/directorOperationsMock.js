export const DIRECTOR_BOOKINGS_VIEW_MOCK = [
  { id: "bk1", time: "Сегодня 10:00", hall: "Корт 2", client: "Смирнова А.", trainer: "Ильин А.", status: "Подтверждено" },
  { id: "bk2", time: "Сегодня 14:30", hall: "Зал B", client: "Группа функционал", trainer: "Ильин А.", status: "Подтверждено" },
  { id: "bk3", time: "Сегодня 18:00", hall: "Корт 1", client: "Козлов Д.", trainer: "—", status: "Ожидает" },
];
export const DIRECTOR_CALENDAR_LOAD_MOCK = [
  { hour: "08:00", court1: 40, court2: 20, hallA: 60 },
  { hour: "12:00", court1: 85, court2: 70, hallA: 55 },
  { hour: "17:00", court1: 100, court2: 95, hallA: 90 },
  { hour: "20:00", court1: 75, court2: 88, hallA: 40 },
];
export const DIRECTOR_NOTIFICATIONS_MOCK = [
  { id: "n1", title: "Пик нагрузки", detail: "Филиал Downtown: слоты 18:00–21:00 заполнены на 94%.", at: "10 мин назад", tone: "info" },
  { id: "n2", title: "Рост отмен", detail: "Riverside: +12% отмен за неделю к прошлой. Рекомендуем проверить политику переноса.", at: "2 ч назад", tone: "warn" },
  { id: "n3", title: "Система", detail: "Экспорт отчёта «Выручка по филиалам» готов к скачиванию.", at: "вчера", tone: "success" },
];
export const DIRECTOR_REVENUE_TREND_MOCK = [
  { month: "Янв", valuePct: 62 },
  { month: "Фев", valuePct: 71 },
  { month: "Мар", valuePct: 68 },
  { month: "Апр", valuePct: 84 },
];
export const DIRECTOR_TRAINER_EFFICIENCY_MOCK = [
  { name: "Ильин А.", loadPct: 88, revenueIdx: 112, cancelPct: "4%" },
  { name: "Петрова М.", loadPct: 76, revenueIdx: 98, cancelPct: "6%" },
  { name: "Новиков П.", loadPct: 52, revenueIdx: 67, cancelPct: "11%" },
];
export const DIRECTOR_PROBLEM_ZONES_MOCK = [
  { zone: "Riverside · будни 09:00–12:00", issue: "Низкая загрузка зала A (средняя 34%)", severity: "Средний" },
  { zone: "Downtown · вечер", issue: "Перегруз корта 1 — риск конфликтов смен", severity: "Высокий" },
  { zone: "Сеть", issue: "Рост отмен в категории «групповой функционал»", severity: "Средний" },
];
