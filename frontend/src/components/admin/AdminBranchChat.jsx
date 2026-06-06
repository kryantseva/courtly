import MessengerDock from "../../features/messenger/MessengerDock";
import { getMessengerDockConfig } from "../../features/messenger/messengerMock";
export default function AdminBranchChat() {
  return <MessengerDock {...getMessengerDockConfig("admin")} />;
}
