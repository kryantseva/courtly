import { apiGet, apiPatch, apiPost } from "./http";
export function fetchEventBracket(eventId) {
  return apiGet(`/events/${encodeURIComponent(eventId)}/bracket/`, { withAuth: true });
}
export function generateEventBracket(eventId, body = {}) {
  return apiPost(`/events/${encodeURIComponent(eventId)}/bracket/`, body, { withAuth: true });
}
export function patchBracketMatch(eventId, matchId, body) {
  return apiPatch(
    `/events/${encodeURIComponent(eventId)}/bracket/matches/${encodeURIComponent(matchId)}/`,
    body,
    { withAuth: true },
  );
}
