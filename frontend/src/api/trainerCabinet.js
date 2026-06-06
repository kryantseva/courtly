import { apiDelete, apiGet, apiPatch, apiPost } from "./http";
export function fetchMyTrainerBookings(opts = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.branch_id) params.set("branch_id", opts.branch_id);
  if (opts.status) params.set("status", opts.status);
  if (opts.session_outcome) params.set("session_outcome", opts.session_outcome);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiGet(`/me/trainer/bookings/${qs ? `?${qs}` : ""}`, { withAuth: true });
}
export function fetchMyTrainerEarnings(opts = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.branch_id) params.set("branch_id", opts.branch_id);
  const qs = params.toString();
  return apiGet(`/me/trainer/earnings/${qs ? `?${qs}` : ""}`, { withAuth: true });
}
export function postTrainerSessionOutcome(bookingId, body) {
  return apiPost(`/bookings/${encodeURIComponent(bookingId)}/trainer/session/`, body, { withAuth: true });
}
export function fetchTrainerAvailability(branchId) {
  return apiGet(`/branches/${encodeURIComponent(branchId)}/trainer/availability/`, { withAuth: true });
}
export function createTrainerAvailabilityWindow(branchId, body) {
  return apiPost(`/branches/${encodeURIComponent(branchId)}/trainer/availability/`, body, { withAuth: true });
}
export function patchTrainerAvailabilityWindow(branchId, windowId, body) {
  return apiPatch(
    `/branches/${encodeURIComponent(branchId)}/trainer/availability/${encodeURIComponent(windowId)}/`,
    body,
    { withAuth: true },
  );
}
export function deleteTrainerAvailabilityWindow(branchId, windowId) {
  return apiDelete(`/branches/${encodeURIComponent(branchId)}/trainer/availability/${encodeURIComponent(windowId)}/`, {
    withAuth: true,
  });
}
