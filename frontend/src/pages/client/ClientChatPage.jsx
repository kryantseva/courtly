import { Link } from "react-router-dom";
import MessengerWorkspace from "../../features/messenger/MessengerWorkspace";
import { getMessengerConfig } from "../../features/messenger/messengerMock";
export default function ClientChatPage() {
  const config = getMessengerConfig("client");
  return (
    <div className="clientPage">
      <p className="clientPageLead">
        Courtly Messenger для клиента: чаты только с администраторами филиала и тренерами, с которыми есть запись или
        история занятий. <Link to="/app">К главной</Link>
      </p>
      <MessengerWorkspace {...config} />
    </div>
  );
}
