import { buildClientChatContacts } from "../../data/clientChatContactsMock";
import { CLIENT_BOOKINGS_BY_ID } from "../../data/clientScheduleMock";
import { ADMIN_CHAT_CONVERSATIONS, ADMIN_CHAT_FOLDERS, ADMIN_CHAT_THREAD_SEED } from "../../data/adminChatMock";
import { DIRECTOR_BRANCHES_COMPARISON } from "../../data/directorDashboardMock";
import { TRAINER_CHAT_CONVERSATIONS, TRAINER_CHAT_FOLDERS, TRAINER_CHAT_THREAD_SEED } from "../../data/trainerChatMock";
const DIRECTOR_FOLDERS = [
  { id: "all", label: "Все", emoji: "💬" },
  { id: "branches", label: "Филиалы", emoji: "🏢" },
  { id: "leaders", label: "Руководство", emoji: "📈" },
  { id: "system", label: "Система", emoji: "⚙️" },
];
export const DIRECTOR_PARTICIPANT_ROSTER = [
  { id: "roster-orlova", name: "Орлова Мария", role: "Управляющая", branch: "Courtly Riverside" },
  { id: "roster-volkov", name: "Волков Павел", role: "Управляющая", branch: "Courtly North" },
  { id: "roster-sokol", name: "Соколова Анна", role: "Управляющая", branch: "Courtly West" },
  { id: "roster-moroz", name: "Морозов Илья", role: "Операционный директор", branch: "Офис сети" },
  { id: "roster-nikitina", name: "Никитина Елена", role: "HR-партнёр", branch: "Офис сети" },
  { id: "roster-fedotov", name: "Федотов Артём", role: "Администратор", branch: "Courtly Riverside" },
  { id: "roster-guseva", name: "Гусева Ксения", role: "Администратор", branch: "Courtly North" },
  { id: "roster-levin", name: "Левин Олег", role: "Тренер ведущий", branch: "Courtly Riverside" },
  { id: "roster-belaya", name: "Белая Дарья", role: "Тренер", branch: "Courtly West" },
];
const DIRECTOR_CONVERSATIONS = [
  {
    id: "dir-branch-leads",
    folder: "leaders",
    name: "Управляющие филиалами",
    subtitle: "сеть · 4 филиала",
    lastMessage: "Собираем статусы по загрузке на выходные",
    time: "09:30",
    unread: 2,
    isGroup: true,
    participants: [
      { id: "roster-orlova", name: "Орлова Мария", role: "Управляющая", branch: "Courtly Riverside" },
      { id: "roster-volkov", name: "Волков Павел", role: "Управляющая", branch: "Courtly North" },
      { id: "roster-sokol", name: "Соколова Анна", role: "Управляющая", branch: "Courtly West" },
      { id: "roster-moroz", name: "Морозов Илья", role: "Операционный директор", branch: "Офис сети" },
    ],
  },
  {
    id: "dir-admins",
    folder: "branches",
    name: "Администраторы сети",
    subtitle: "операционный канал",
    lastMessage: "Нужно подтвердить переносы по Riverside",
    time: "08:55",
    unread: 3,
    isGroup: true,
    participants: [
      { id: "roster-fedotov", name: "Федотов Артём", role: "Администратор", branch: "Courtly Riverside" },
      { id: "roster-guseva", name: "Гусева Ксения", role: "Администратор", branch: "Courtly North" },
      { id: "roster-orlova", name: "Орлова Мария", role: "Управляющая", branch: "Courtly Riverside" },
    ],
  },
  {
    id: "dir-system",
    folder: "system",
    name: "Courtly System",
    subtitle: "авто",
    lastMessage: "3 филиала без ответственного за вечернюю смену",
    time: "08:10",
    unread: 1,
    participants: [{ id: "courtly-bot", name: "Courtly Bot", role: "Система", branch: "—" }],
  },
];
const DIRECTOR_THREADS = {
  "dir-branch-leads": [
    { id: "d1", dir: "in", text: "Собираем статусы по загрузке на выходные", time: "09:30", fromName: "Сеть" },
    { id: "d2", dir: "out", text: "Ок, нужен отчёт по всем филиалам до 12:00", time: "09:34" },
  ],
  "dir-admins": [
    { id: "da1", dir: "in", text: "Нужно подтвердить переносы по Riverside", time: "08:55", fromName: "Орлова М." },
    { id: "da2", dir: "out", text: "Подключите тренеров в чат записи и дайте итог до 10:00", time: "09:02" },
  ],
  "dir-system": [
    { id: "ds1", dir: "in", text: "3 филиала без ответственного за вечернюю смену", time: "08:10" },
  ],
};
const CHAT_TYPE_LABELS = {
  direct: "Личный",
  booking: "По записи",
  group: "Групповой",
  branch: "Филиал",
  support: "System",
};
function cloneThreads(threads) {
  const out = {};
  for (const [k, v] of Object.entries(threads)) out[k] = [...v];
  return out;
}
function mapByIds(source, ids) {
  return ids.map((id) => source.find((item) => item.id === id)).filter(Boolean);
}
function enrichConversation(conv, extra = {}) {
  return {
    chatType: "direct",
    participantsHint: extra.participantsHint ?? "2 участника",
    linkedEntity: null,
    ...conv,
    ...extra,
  };
}
function summarizeEntity(entity) {
  if (!entity) return "";
  return `${entity.kindLabel}: ${entity.label}`;
}
function buildClientEntityOptions(contacts) {
  const upcomingBookingOptions = Object.values(CLIENT_BOOKINGS_BY_ID)
    .filter((item) => item.segment === "upcoming")
    .map((item) => ({
      id: `booking-${item.id}`,
      name: item.title,
      chatName: `${item.title} · чат по записи`,
      summary: `${item.whenLabel} · ${item.place}`,
      entity: {
        kind: "booking",
        kindLabel: "Запись",
        entityId: item.id,
        label: item.title,
        context: item.whenLabel,
      },
    }));
  const trainerOptions = contacts
    .filter((item) => item.role !== "Администратор")
    .map((item) => ({
      id: `trainer-${item.id}`,
      name: item.name,
      chatName: `Вопрос тренеру · ${item.name}`,
      summary: item.onShift ? "Тренер на смене" : "Тренер из ваших занятий",
      entity: {
        kind: "direct",
        kindLabel: "Контакт",
        entityId: item.id,
        label: item.name,
        context: item.role,
      },
    }));
  const admin = contacts.find((item) => item.role === "Администратор");
  const adminOptions = admin
    ? [
        {
          id: `admin-${admin.id}`,
          name: admin.name,
          chatName: `Вопрос админу · ${admin.name}`,
          summary: admin.onShift ? "Администратор на смене" : "Администратор филиала",
          entity: {
            kind: "direct",
            kindLabel: "Контакт",
            entityId: admin.id,
            label: admin.name,
            context: admin.role,
          },
        },
      ]
    : [];
  return { upcomingBookingOptions, trainerOptions, adminOptions };
}
function buildDirectorEntityOptions() {
  return {
    branchOptions: DIRECTOR_BRANCHES_COMPARISON.map((item) => ({
      id: `director-branch-${item.id}`,
      name: item.name,
      chatName: `Канал · ${item.name}`,
      summary: `${item.bookingsWeek} записей · ${item.load}`,
      entity: {
        kind: "branch",
        kindLabel: "Филиал",
        entityId: item.id,
        label: item.name,
        context: item.note,
      },
    })),
    systemOptions: [
      {
        id: "director-system-critical",
        name: "Критические алерты",
        chatName: "System · критические алерты",
        summary: "Смена, загрузка, инциденты",
        entity: {
          kind: "support",
          kindLabel: "System",
          entityId: "critical-alerts",
          label: "Критические алерты",
          context: "Операционный контроль",
        },
      },
    ],
  };
}
function mapAdminConversations() {
  return ADMIN_CHAT_CONVERSATIONS.map((conv) =>
    enrichConversation(conv, {
      chatType: conv.folder === "system" ? "support" : conv.isGroup ? "group" : conv.folder === "staff" ? "branch" : "direct",
      participantsHint:
        conv.folder === "staff" ? "2-6 участников" : conv.isGroup ? "12 участников" : conv.folder === "system" ? "Courtly bot" : "2 участника",
      linkedEntity:
        conv.id === "c-alina"
          ? { kind: "booking", kindLabel: "Запись", entityId: "u1", label: "Теннис, корт 2", context: "Сегодня, 18:00" }
          : conv.id === "t-ilin"
            ? { kind: "branch", kindLabel: "Смена", entityId: "a4", label: "Пик нагрузки", context: "18:00 · Все корты" }
            : conv.id === "s-pay"
              ? { kind: "support", kindLabel: "Оплата", entityId: "pay-4821", label: "Бронь #4821", context: "Ошибка оплаты" }
              : null,
    }),
  );
}
function mapTrainerConversations() {
  return TRAINER_CHAT_CONVERSATIONS.map((conv) =>
    enrichConversation(conv, {
      chatType: conv.id === "adm" ? "branch" : conv.isGroup ? "group" : "direct",
      participantsHint: conv.isGroup ? "6 участников" : conv.id === "adm" ? "2 сотрудника" : "2 участника",
      linkedEntity:
        conv.id === "adm"
          ? { kind: "branch", kindLabel: "Подтверждение", entityId: "t3", label: "Функционал", context: "Суббота 10:00" }
          : conv.id === "cl-group"
            ? { kind: "group", kindLabel: "Мини-группа", entityId: "t3", label: "Функционал", context: "до 6 человек" }
            : { kind: "direct", kindLabel: "Клиент", entityId: "c1", label: conv.name, context: "Персональная тренировка" },
    }),
  );
}
export function getMessengerConfig(role, options = {}) {
  if (role === "admin") {
    const adminConversations = mapAdminConversations();
    return {
      storageRole: "admin",
      title: "Courtly Messenger · администратор",
      subtitle:
        "Клиенты, сотрудники филиала и системные уведомления внутри Courtly. Новые чаты создаёт только руководитель.",
      folders: ADMIN_CHAT_FOLDERS,
      conversations: adminConversations,
      threads: cloneThreads(ADMIN_CHAT_THREAD_SEED),
      dockConversations: mapByIds(adminConversations, ["c-alina", "t-ilin", "c-dmitry"]),
      restrictions: [
        "Клиентам доступны только администраторы и тренеры, с которыми есть запись.",
        "Создание новых каналов и состав участников настраивает руководитель.",
      ],
    };
  }
  if (role === "trainer") {
    const trainerConversations = mapTrainerConversations();
    return {
      storageRole: "trainer",
      title: "Courtly Messenger · тренер",
      subtitle:
        "Чаты с администраторами, клиентами своих занятий и мини-группами. Создание новых каналов — у руководителя.",
      folders: TRAINER_CHAT_FOLDERS,
      conversations: trainerConversations,
      threads: cloneThreads(TRAINER_CHAT_THREAD_SEED),
      dockConversations: mapByIds(trainerConversations, ["adm", "cl-smir"]),
      restrictions: [
        "Тренер видит только своих клиентов и staff-чаты филиала.",
        "Новые служебные чаты создаёт руководитель и сам назначает участников.",
      ],
    };
  }
  if (role === "director") {
    const directorEntities = buildDirectorEntityOptions();
    const directorConversations = [
      enrichConversation(DIRECTOR_CONVERSATIONS[0], {
        chatType: "group",
        participantsHint: "8 участников",
        linkedEntity: { kind: "branch", kindLabel: "Сеть", entityId: "network", label: "Руководители филиалов", context: "4 филиала" },
      }),
      enrichConversation(DIRECTOR_CONVERSATIONS[1], {
        chatType: "branch",
        participantsHint: "10 участников",
        linkedEntity: { kind: "branch", kindLabel: "Филиал", entityId: "b2", label: "Courtly Riverside", context: "Нужны переносы" },
      }),
      enrichConversation(DIRECTOR_CONVERSATIONS[2], {
        chatType: "support",
        chatProtected: true,
        participantsHint: "Courtly bot",
        linkedEntity: { kind: "support", kindLabel: "System", entityId: "ops", label: "Критические алерты", context: "Операционный контроль" },
      }),
    ];
    return {
      storageRole: "director",
      title: "Courtly Messenger · manager",
      subtitle:
        "Создание новых чатов и состав участников — только у руководителя: вы создаёте канал и добавляете людей вручную.",
      folders: DIRECTOR_FOLDERS,
      conversations: directorConversations,
      threads: cloneThreads(DIRECTOR_THREADS),
      dockConversations: directorConversations,
      participantRoster: DIRECTOR_PARTICIPANT_ROSTER,
      canManageChats: true,
      primaryActionLabel: "Создать чат",
      primaryActionHint: "Новый канал: участников добавьте вручную после создания",
      chatTemplates: [
        {
          id: "director-branch",
          label: "Канал филиала",
          folder: "branches",
          name: "Канал филиала",
          description: "Операционный канал по одному филиалу.",
          startText:
            "Чат создан. Добавьте нужных сотрудников и руководителей вручную в карточке чата (настройка состава).",
          chatType: "branch",
          entityOptions: directorEntities.branchOptions,
        },
        {
          id: "director-management",
          label: "Руководители",
          folder: "leaders",
          name: "Чат руководителей",
          description: "Закрытый чат для управляющих и ключевых ответственных.",
          startText:
            "Чат создан. Пригласите управляющих и ответственных вручную — список участников настраивается вами.",
          chatType: "group",
          entityOptions: directorEntities.branchOptions,
        },
        {
          id: "director-system",
          label: "Support/System",
          folder: "system",
          name: "Системный канал",
          description: "Канал с авто-уведомлениями и разбором операционных проблем.",
          startText:
            "Чат создан. Подключите ответственных за мониторинг вручную; системные уведомления можно настроить отдельно.",
          chatType: "support",
          entityOptions: directorEntities.systemOptions,
        },
      ],
      restrictions: [
        "Руководитель видит только staff-коммуникацию и системные каналы сети.",
        "Клиентские личные переписки не попадают в сетевой обзор без специальных прав.",
      ],
    };
  }
  const clientContacts = buildClientChatContacts(options.adminOnShift);
  const clientEntities = buildClientEntityOptions(clientContacts);
  const clientConversations = clientContacts.map((c, idx) =>
    enrichConversation(
      {
        id: c.id,
        folder: c.role === "Администратор" ? "admins" : "trainers",
        name: c.name,
        subtitle: c.onShift ? `${c.role} · на смене` : c.role,
        lastMessage:
          c.role === "Администратор"
            ? "Здравствуйте! Помогу с записью, переносом или оплатой."
            : "Можем обсудить детали тренировки прямо здесь.",
        time: idx === 0 ? "сейчас" : "Вчера",
        unread: idx === 0 ? 1 : 0,
      },
      {
        chatType: "direct",
        participantsHint: "2 участника",
        linkedEntity:
          c.role === "Администратор"
            ? clientEntities.upcomingBookingOptions[0]?.entity ?? null
            : {
                kind: "direct",
                kindLabel: "Тренер",
                entityId: c.id,
                label: c.name,
                context: c.onShift ? "На смене" : "Ваш тренер",
              },
      },
    ),
  );
  const clientThreads = Object.fromEntries(
    clientContacts.map((c, idx) => [
      c.id,
      [
        {
          id: `${c.id}-w`,
          dir: "in",
          text:
            c.role === "Администратор"
              ? "Здравствуйте! Помогу с записью, переносом или оплатой."
              : "Здравствуйте! Пишите сюда, если нужно уточнить детали тренировки.",
          time: idx === 0 ? "сейчас" : "Вчера",
        },
      ],
    ]),
  );
  return {
    storageRole: "client",
    title: "Courtly Messenger · клиент",
    subtitle:
      "Личные чаты только с администраторами филиала и тренерами по вашим занятиям. Новые служебные чаты открывает руководитель.",
    folders: [
      { id: "all", label: "Все", emoji: "💬" },
      { id: "admins", label: "Админы", emoji: "🛎️" },
      { id: "trainers", label: "Тренеры", emoji: "🏋️" },
    ],
    conversations: clientConversations,
    threads: clientThreads,
    dockConversations: clientConversations.slice(0, 3),
    restrictions: [
      "Клиент не видит внутренние staff-чаты филиала.",
      "Доступны только существующие диалоги с администраторами и тренерами по вашим записям.",
    ],
  };
}
export function getMessengerDockConfig(role, options = {}) {
  const config = getMessengerConfig(role, options);
  return {
    title: config.title,
    hint: config.primaryActionHint ?? "Переписка внутри Courtly",
    fullPath:
      role === "admin"
        ? "/admin/chat"
        : role === "trainer"
          ? "/trainer/chat"
          : role === "director"
            ? "/director/chat"
            : "/app/chat",
    conversations: config.dockConversations ?? config.conversations.slice(0, 3),
    threads: config.threads,
    quickTemplates: config.chatTemplates ?? [],
  };
}
export function getChatTypeLabel(type) {
  return CHAT_TYPE_LABELS[type] ?? "Чат";
}
export function getLinkedEntitySummary(entity) {
  return summarizeEntity(entity);
}
