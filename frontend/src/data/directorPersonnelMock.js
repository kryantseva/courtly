export const DIRECTOR_STAFF_LIST_MOCK = [
  { id: "u-ilin", name: "Ильин Алексей", role: "Тренер", branchLabel: "Downtown", activity: "Активен", lastActive: "сегодня" },
  { id: "u-petrova", name: "Петрова Мария", role: "Тренер", branchLabel: "Riverside", activity: "Активен", lastActive: "сегодня" },
  { id: "u-kozlov", name: "Козлов Антон", role: "Администратор", branchLabel: "Downtown", activity: "На смене", lastActive: "сейчас" },
  { id: "u-orlova", name: "Орлова Мария", role: "Администратор", branchLabel: "Riverside", activity: "Не в сети", lastActive: "вчера" },
  { id: "u-sokolov", name: "Соколов Дмитрий", role: "Руководитель", branchLabel: "Вся сеть", activity: "Активен", lastActive: "сегодня" },
];
export const DIRECTOR_ROLE_HISTORY_MOCK = {
  "u-ilin": [
    { at: "12.03.2026", from: "Тренер", to: "Старший тренер", by: "Соколов Д." },
    { at: "01.01.2025", from: "—", to: "Тренер", by: "Система" },
  ],
  "u-petrova": [{ at: "15.02.2026", from: "Тренер", to: "Тренер (группы)", by: "Орлова М." }],
};
