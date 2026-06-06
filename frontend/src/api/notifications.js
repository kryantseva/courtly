import { apiGet, apiPost } from "./http";
export function fetchMyNotifications() {
  return apiGet("/notifications/", { withAuth: true });
}
export function markNotificationRead(notificationId) {
  return apiPost(
    `/notifications/${encodeURIComponent(notificationId)}/read/`,
    {},
    { withAuth: true },
  );
}
