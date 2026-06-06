import { apiGet } from "./http";
export function fetchBranchJournalDay(branchId, isoDate) {
  const q = new URLSearchParams({ date: isoDate });
  return apiGet(`/branches/${encodeURIComponent(branchId)}/journal/?${q}`);
}
