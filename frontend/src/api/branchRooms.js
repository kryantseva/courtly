import { apiGet } from "./http";
export function fetchBranchRooms(branchId) {
  return apiGet(`/branches/${encodeURIComponent(branchId)}/rooms/`, { withAuth: true });
}
