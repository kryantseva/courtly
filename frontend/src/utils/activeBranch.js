const KEY = "courtly.activeBranch";
export function setActiveBranch(data) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
  }
}
export function getActiveBranch() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.branchName === "string") return parsed;
  } catch {
  }
  return null;
}
export function clearActiveBranch() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
  }
}
