export const DIRECTOR_SELF_MOCK = {
  fullName: "Соколов Дмитрий",
  email: "director.courtly.demo@courtly.demo",
  phone: "+7 900 777-88-99",
  title: "Руководитель сети Courtly",
};
export const DIRECTOR_NETWORK_KPI = [
  { label: "Филиалов в сети", value: "4", hint: "2 в регионе, 2 за МКАД" },
  { label: "Активных абонементов", value: "1 284", hint: "+6% к прошлому месяцу" },
  { label: "Записей на неделе", value: "3 420", hint: "По всем площадкам" },
  { label: "Средняя загрузка", value: "71%", hint: "Пик вт–чт 17:00–21:00" },
];
export const DIRECTOR_BRANCHES_COMPARISON = [
  { id: "b1", name: "Courtly Downtown", bookingsWeek: "912", load: "78%", revenue: "1,42 млн ₽", note: "Выше плана" },
  { id: "b2", name: "Courtly Riverside", bookingsWeek: "688", load: "65%", revenue: "0,98 млн ₽", note: "Нужны промо в будни" },
  { id: "b3", name: "Courtly West", bookingsWeek: "534", load: "62%", revenue: "0,76 млн ₽", note: "Открыт 4 мес. назад" },
  { id: "b4", name: "Courtly Arena", bookingsWeek: "1 286", load: "74%", revenue: "1,89 млн ₽", note: "Корты + зал силы" },
];
export const DIRECTOR_ALERTS = [
  { id: "al1", text: "В филиале Riverside 3 необработанные заявки на групповые занятия.", tone: "warn" },
  { id: "al2", text: "Договор с поставщиком оборудования истекает через 30 дней (Arena).", tone: "neutral" },
  { id: "al3", text: "Downtown: выполнение плана по выручке за квартал — 102%.", tone: "ok" },
];
