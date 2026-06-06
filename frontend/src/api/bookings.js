import { apiGet, apiPatch, apiPost } from "./http";
export function createBranchBooking(branchId, payload) {
  return apiPost(`/branches/${encodeURIComponent(branchId)}/bookings/`, payload, { withAuth: true });
}
export function patchBooking(bookingId, payload) {
  return apiPatch(`/bookings/${encodeURIComponent(bookingId)}/`, payload, { withAuth: true });
}
export function fetchBooking(bookingId) {
  return apiGet(`/bookings/${encodeURIComponent(bookingId)}/`, { withAuth: true });
}
export function cancelMyBooking(bookingId) {
  return apiPost(`/bookings/${encodeURIComponent(bookingId)}/cancel/me/`, {}, { withAuth: true });
}
export function rescheduleMyBooking(bookingId, payload) {
  return apiPost(`/bookings/${encodeURIComponent(bookingId)}/reschedule/me/`, payload, { withAuth: true });
}
