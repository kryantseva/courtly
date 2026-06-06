const LS_KEY = "courtly:admin-on-shift";
let cacheRaw = undefined;
let cacheVal = null;
export function adminFirstNameFromFull(fullName) {
  const p = fullName.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0];
  return p[1];
}
export function getAdminOnShift() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === cacheRaw) return cacheVal;
    cacheRaw = raw;
    if (!raw) {
      cacheVal = null;
      return null;
    }
    const o = JSON.parse(raw);
    if (!o || typeof o.id !== "string" || typeof o.fullName !== "string") {
      cacheVal = null;
      return null;
    }
    cacheVal = { id: o.id, fullName: o.fullName };
    return cacheVal;
  } catch {
    cacheRaw = undefined;
    cacheVal = null;
    return null;
  }
}
export function setAdminOnShift(v) {
  localStorage.setItem(LS_KEY, JSON.stringify(v));
  cacheRaw = localStorage.getItem(LS_KEY);
  cacheVal = { id: v.id, fullName: v.fullName };
  window.dispatchEvent(new CustomEvent("courtly-admin-on-shift"));
}
export function clearAdminOnShift() {
  localStorage.removeItem(LS_KEY);
  cacheRaw = null;
  cacheVal = null;
  window.dispatchEvent(new CustomEvent("courtly-admin-on-shift"));
}
export function subscribeAdminOnShift(cb) {
  const fn = () => cb();
  window.addEventListener("courtly-admin-on-shift", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("courtly-admin-on-shift", fn);
    window.removeEventListener("storage", fn);
  };
}
