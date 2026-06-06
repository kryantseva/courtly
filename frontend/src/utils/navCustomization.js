export function loadNavOrder(storageKey, defaultTabs) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultTabs;
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return defaultTabs;
    const byId = new Map(defaultTabs.map((tab) => [tab.id, tab]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    const missing = defaultTabs.filter((tab) => !ids.includes(tab.id));
    return [...ordered, ...missing];
  } catch {
    return defaultTabs;
  }
}
export function saveNavOrder(storageKey, tabs) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tabs.map((tab) => tab.id)));
  } catch {
  }
}
export function reorderTabs(tabs, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return tabs;
  const from = tabs.findIndex((tab) => tab.id === sourceId);
  const to = tabs.findIndex((tab) => tab.id === targetId);
  if (from < 0 || to < 0) return tabs;
  const next = [...tabs];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
