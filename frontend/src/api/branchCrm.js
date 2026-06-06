import { apiGet } from "./http";
export function fetchBranchCrmClients(branchId) {
  return apiGet(`/branches/${encodeURIComponent(branchId)}/crm/clients/`, { withAuth: true });
}
export function fetchBranchCrmClient(branchId, clientRef) {
  const enc = encodeURIComponent(clientRef);
  return apiGet(`/branches/${encodeURIComponent(branchId)}/crm/clients/${enc}/`, { withAuth: true });
}
