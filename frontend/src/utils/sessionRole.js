const STORAGE_KEY = "courtly_dev_role";
export const DEV_ROLES = ["client", "trainer", "admin", "director"];
export function getDevRole() {
  const r = sessionStorage.getItem(STORAGE_KEY);
  if (r === "trainer" || r === "admin" || r === "client" || r === "director") return r;
  return "client";
}
export function setDevRole(role) {
  if (DEV_ROLES.includes(role)) sessionStorage.setItem(STORAGE_KEY, role);
}
export function cabinetPathForRole(role) {
  if (role === "trainer") return "/trainer";
  if (role === "admin") return "/admin";
  if (role === "director") return "/director/select";
  return "/app";
}
