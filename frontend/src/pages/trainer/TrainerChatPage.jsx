import { Link } from "react-router-dom";
import MessengerWorkspace from "../../features/messenger/MessengerWorkspace";
import { getMessengerConfig } from "../../features/messenger/messengerMock";
export default function TrainerChatPage() {
  const config = getMessengerConfig("trainer");
  return (
    <div className="staffPage trainerChatPage">
      <p className="clientPageLead trainerChatPageLead">
        Чаты с клиентами и администраторами. <Link to="/trainer">К сегодня</Link>
      </p>
      <MessengerWorkspace {...config} />
    </div>
  );
}
