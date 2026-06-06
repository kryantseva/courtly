const TASKS_KEY = "courtly.tasks.v1";
const TASK_NOTES_KEY = "courtly.taskNotifications.v1";
const listeners = new Set();
const INITIAL_TASKS = [
  {
    id: "task-seed-1",
    title: "Проверить оплаты по утренним броням",
    section: "Операционные",
    deadline: "2026-04-18",
    status: "todo",
    source: "director",
    assigneeRole: "admin",
    assigneeId: "admin-on-shift",
    assigneeLabel: "Администратор на смене",
    comment: "Проверить до 11:00 и подтвердить в отчёте.",
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: "task-seed-2",
    title: "Обновить приветственный скрипт ресепшена",
    section: "Клиенты",
    deadline: "2026-04-19",
    status: "todo",
    source: "admin",
    assigneeRole: "admin",
    assigneeId: "self-admin",
    assigneeLabel: "Я",
    comment: "Уточнить формулировки и передать команде.",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
];
const INITIAL_NOTES = [
  {
    id: "task-note-seed-1",
    role: "admin",
    title: "Новая задача от руководителя",
    text: "Проверить оплаты по утренним броням.",
    time: "сегодня",
    read: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  },
];
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
let tasksState = typeof window === "undefined" ? [...INITIAL_TASKS] : readJson(TASKS_KEY, [...INITIAL_TASKS]);
let taskNotesState =
  typeof window === "undefined" ? [...INITIAL_NOTES] : readJson(TASK_NOTES_KEY, [...INITIAL_NOTES]);
function emit() {
  for (const l of listeners) l();
}
function persistAll() {
  saveJson(TASKS_KEY, tasksState);
  saveJson(TASK_NOTES_KEY, taskNotesState);
}
function formatTaskTime() {
  return "только что";
}
function addTaskNote(role, title, text) {
  taskNotesState = [
    {
      id: `task-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      title,
      text,
      time: formatTaskTime(),
      read: false,
      createdAt: Date.now(),
    },
    ...taskNotesState,
  ];
}
function createTaskBase({
  title,
  section,
  deadline,
  comment = "",
  source,
  assigneeRole,
  assigneeId = "",
  assigneeLabel = "",
}) {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    section: section.trim() || "Без раздела",
    deadline,
    comment: comment.trim(),
    status: "todo",
    source,
    assigneeRole,
    assigneeId,
    assigneeLabel,
    createdAt: Date.now(),
  };
}
export function getTasksForRole(role) {
  if (role === "director") return tasksState;
  return tasksState.filter((task) => task.assigneeRole === role);
}
export function getTaskNotificationsForRole(role) {
  return taskNotesState.filter((n) => n.role === role);
}
export function createAdminTask({ title, section, deadline, comment = "" }) {
  const task = createTaskBase({
    title,
    section,
    deadline,
    comment,
    source: "admin",
    assigneeRole: "admin",
    assigneeId: "self-admin",
    assigneeLabel: "Я",
  });
  tasksState = [task, ...tasksState];
  addTaskNote("admin", "Новая задача", `${task.title}.`);
  persistAll();
  emit();
}
export function createDirectorTask({
  title,
  section,
  deadline,
  comment = "",
  assigneeRole = "admin",
  assigneeId = "admin-on-shift",
  assigneeLabel = "Администратор на смене",
}) {
  const task = createTaskBase({
    title,
    section,
    deadline,
    comment,
    source: "director",
    assigneeRole,
    assigneeId,
    assigneeLabel,
  });
  tasksState = [task, ...tasksState];
  if (assigneeRole === "admin") {
    addTaskNote("admin", "Новая задача от руководителя", `${task.title}.`);
    addTaskNote("director", "Задача отправлена администратору", `${task.title}.`);
  } else {
    addTaskNote("director", "Вы добавили задачу себе", `${task.title}.`);
  }
  persistAll();
  emit();
}
export function createDirectorTaskForAdmin({ title, section, deadline, comment = "" }) {
  createDirectorTask({
    title,
    section,
    deadline,
    comment,
    assigneeRole: "admin",
    assigneeId: "admin-on-shift",
    assigneeLabel: "Администратор на смене",
  });
}
export function completeTask(taskId) {
  tasksState = tasksState.map((task) => (task.id === taskId ? { ...task, status: "done" } : task));
  persistAll();
  emit();
}
export function markTaskNotificationRead(role, notificationId) {
  taskNotesState = taskNotesState.map((n) => (n.role === role && n.id === notificationId ? { ...n, read: true } : n));
  persistAll();
  emit();
}
export function subscribeTaskCenter(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
