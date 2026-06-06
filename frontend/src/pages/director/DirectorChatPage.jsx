import { Link } from "react-router-dom";
import MessengerWorkspace from "../../features/messenger/MessengerWorkspace";
import { getMessengerConfig } from "../../features/messenger/messengerMock";
export default function DirectorChatPage() {
  const config = getMessengerConfig("director");
  return (
    <div className="clientPage">
      <p className="clientPageLead">
        Courtly Messenger уровня manager: каналы сети, филиалы, руководители и операционные команды внутри одной
        экосистемы. <Link to="/director">К журналу</Link>
      </p>
      <MessengerWorkspace {...config} />
    </div>
  );
}
