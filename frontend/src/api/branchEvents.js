import { apiDelete, apiGet, apiPatch, apiPost } from "./http";
export function promoteEventWaitlistStaff(eventId, waitlistEntryId) {
  return apiPost(
    `/events/${encodeURIComponent(eventId)}/waitlist/${encodeURIComponent(waitlistEntryId)}/promote/`,
    {},
    { withAuth: true },
  );
}
export function fetchEventDetail(eventId) {
  return apiGet(`/events/${encodeURIComponent(eventId)}/`, { withAuth: true });
}
export function fetchBranchEvents(branchId, range = {}) {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();
  const path = `/branches/${encodeURIComponent(branchId)}/events/${qs ? `?${qs}` : ""}`;
  return apiGet(path, { withAuth: true });
}
export function createBranchEvent(branchId, body) {
  return apiPost(`/branches/${encodeURIComponent(branchId)}/events/`, body, { withAuth: true });
}
export function patchBranchEvent(eventId, body) {
  return apiPatch(`/events/${encodeURIComponent(eventId)}/`, body, { withAuth: true });
}
export function registerForEvent(eventId) {
  return apiPost(`/events/${encodeURIComponent(eventId)}/registrations/me/`, {}, { withAuth: true });
}
export function cancelEventRegistration(eventId) {
  return apiDelete(`/events/${encodeURIComponent(eventId)}/registrations/me/`, { withAuth: true });
}
export function joinEventWaitlist(eventId) {
  return apiPost(`/events/${encodeURIComponent(eventId)}/waitlist/me/`, {}, { withAuth: true });
}
export function leaveEventWaitlist(eventId) {
  return apiDelete(`/events/${encodeURIComponent(eventId)}/waitlist/me/`, { withAuth: true });
}
export function fetchEventWaitlist(eventId) {
  return apiGet(`/events/${encodeURIComponent(eventId)}/waitlist/`, { withAuth: true });
}
export function deleteEventWaitlistStaff(eventId, waitlistEntryId) {
  return apiDelete(
    `/events/${encodeURIComponent(eventId)}/waitlist/${encodeURIComponent(waitlistEntryId)}/`,
    { withAuth: true },
  );
}
export function fetchEventRegistrations(eventId) {
  return apiGet(`/events/${encodeURIComponent(eventId)}/registrations/`, { withAuth: true });
}
export function deleteEventRegistrationStaff(eventId, registrationId) {
  return apiDelete(
    `/events/${encodeURIComponent(eventId)}/registrations/${encodeURIComponent(registrationId)}/`,
    { withAuth: true },
  );
}
