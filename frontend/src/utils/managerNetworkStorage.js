const STORAGE_KEY = "courtly_manager_network_v1";
export function loadManagerNetwork() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}
export function saveManagerNetwork(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function clearManagerNetwork() {
  localStorage.removeItem(STORAGE_KEY);
}
