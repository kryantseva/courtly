import RoleNotificationsBell from "../common/RoleNotificationsBell";
const USE_API = import.meta.env.VITE_USE_API === "true";
export default function ClientNotificationsBell({ listPath = "/app/notifications" }) {
  return (
    <RoleNotificationsBell role="client" listPath={listPath} enableApiNotifications={USE_API} />
  );
}
