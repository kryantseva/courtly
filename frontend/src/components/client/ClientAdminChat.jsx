import { useAdminOnShift } from "../../hooks/useAdminOnShift";
import MessengerDock from "../../features/messenger/MessengerDock";
import { getMessengerDockConfig } from "../../features/messenger/messengerMock";
export default function ClientAdminChat() {
  const adminOnShift = useAdminOnShift();
  return <MessengerDock {...getMessengerDockConfig("client", { adminOnShift })} />;
}
