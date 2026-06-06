import MessengerDock from "../../features/messenger/MessengerDock";
import { getMessengerDockConfig } from "../../features/messenger/messengerMock";
export default function TrainerBranchChat() {
  return <MessengerDock {...getMessengerDockConfig("trainer")} />;
}
