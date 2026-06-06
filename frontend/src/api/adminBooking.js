import { apiGet } from "./http";
export function unwrapApiPayload(raw) {
  if (raw && typeof raw === "object" && raw.data != null && typeof raw.data === "object" && "id" in raw.data) {
    return raw.data;
  }
  return raw;
}
export function fetchAdminBookingDetail(bookingId) {
  return apiGet(`/bookings/${encodeURIComponent(bookingId)}/`, { withAuth: true }).then(unwrapApiPayload);
}
