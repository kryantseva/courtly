import { apiGet, apiPost } from "./http";
export function fetchBranchList() {
  return apiGet("/branches/", { withAuth: true });
}
export function joinBranchByCode(code) {
  return apiPost("/branches/join/", { code }, { withAuth: true });
}
