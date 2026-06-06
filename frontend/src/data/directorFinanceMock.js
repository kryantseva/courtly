export const DIRECTOR_PAYROLL_BY_BRANCH = [
  {
    branchName: "Все филиалы (агрегат)",
    staff: "47 чел.",
    accrualsMonth: "2,84 млн ₽",
    paid: "2,61 млн ₽",
    pending: "230 тыс. ₽",
    note: "Выплаты до 20-го",
  },
  {
    branchName: "Courtly Downtown",
    staff: "14 чел.",
    accrualsMonth: "920 тыс. ₽",
    paid: "900 тыс. ₽",
    pending: "20 тыс. ₽",
    note: "Премии тренерам",
  },
  {
    branchName: "Courtly Riverside",
    staff: "11 чел.",
    accrualsMonth: "640 тыс. ₽",
    paid: "640 тыс. ₽",
    pending: "0",
    note: "Закрыто",
  },
];
export const DIRECTOR_PAYROLL_DETAIL_MOCK = [
  { id: "pay1", role: "Тренер", name: "Ильин А.", branch: "Downtown", monthAccrual: "118 000 ₽", status: "К выплате" },
  { id: "pay2", role: "Админ смены", name: "Козлов А.", branch: "Downtown", monthAccrual: "52 000 ₽", status: "Выплачено" },
  { id: "pay3", role: "Тренер", name: "Петрова М.", branch: "Riverside", monthAccrual: "96 000 ₽", status: "Выплачено" },
];
export const DIRECTOR_PAYMENTS_HISTORY_MOCK = [
  { id: "pm1", date: "14.04.2026", payer: "Смирнова А.", amount: "1 200 ₽", channel: "Карта", branch: "Downtown" },
  { id: "pm2", date: "14.04.2026", payer: "Козлов Д.", amount: "4 500 ₽", channel: "Счёт юрлица", branch: "Downtown" },
  { id: "pm3", date: "13.04.2026", payer: "Волкова Е.", amount: "800 ₽", channel: "SBP", branch: "Riverside" },
];
