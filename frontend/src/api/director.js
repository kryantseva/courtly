import { apiDelete, apiGet, apiPatch, apiPost } from "./http";
export function fetchDirectorKpi(params = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.branchId) q.set("branch_id", params.branchId);
  const qs = q.toString();
  const path = qs ? `/director/dashboard/kpi/?${qs}` : "/director/dashboard/kpi/";
  return apiGet(path, { withAuth: true });
}
export function fetchDirectorFinanceDrilldown(params = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.branchId) q.set("branch_id", params.branchId);
  if (params.groupBy) q.set("group_by", params.groupBy);
  return apiGet(`/director/finance/drilldown/?${q}`, { withAuth: true });
}
export function fetchDirectorPersonnelKpi(params = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.branchId) q.set("branch_id", params.branchId);
  return apiGet(`/director/personnel/kpi/?${q}`, { withAuth: true });
}
export function fetchDirectorBranches() {
  return apiGet("/director/branches/", { withAuth: true });
}
export function createDirectorBranch(body) {
  return apiPost("/director/branches/", body, { withAuth: true });
}
export function patchDirectorBranch(branchId, body) {
  return apiPatch(`/director/branches/${encodeURIComponent(branchId)}/`, body, { withAuth: true });
}
export function deleteDirectorBranch(branchId) {
  return apiDelete(`/director/branches/${encodeURIComponent(branchId)}/`, { withAuth: true });
}
export function fetchDirectorBranchMembers(branchId) {
  return apiGet(`/director/branches/${encodeURIComponent(branchId)}/members/`, { withAuth: true });
}
export function addDirectorBranchMember(branchId, body) {
  return apiPost(`/director/branches/${encodeURIComponent(branchId)}/members/`, body, { withAuth: true });
}
export function patchDirectorBranchMemberRole(branchId, userId, body) {
  return apiPatch(`/director/branches/${encodeURIComponent(branchId)}/members/${userId}/`, body, { withAuth: true });
}
export function removeDirectorBranchMember(branchId, userId) {
  return apiDelete(`/director/branches/${encodeURIComponent(branchId)}/members/${userId}/`, { withAuth: true });
}
