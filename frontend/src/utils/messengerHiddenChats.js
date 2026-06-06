function storageKey(role) {
  return `courtly.messenger.hiddenForMe.${role}.v1`;
}
export function loadHiddenChatIds(role) {
  if (!role) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(role));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}
export function hideChatForViewer(role, chatId) {
  if (!role || !chatId) return;
  const next = loadHiddenChatIds(role);
  next.add(chatId);
  localStorage.setItem(storageKey(role), JSON.stringify([...next]));
}
export function filterConversationsVisibleForViewer(role, conversations) {
  const hidden = loadHiddenChatIds(role);
  return conversations.filter((c) => !hidden.has(c.id));
}
