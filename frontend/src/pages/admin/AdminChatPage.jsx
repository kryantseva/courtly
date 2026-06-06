import { Link, useLocation } from "react-router-dom";
import MessengerWorkspace from "../../features/messenger/MessengerWorkspace";
import { getMessengerConfig } from "../../features/messenger/messengerMock";
export default function AdminChatPage() {
  const location = useLocation();
  const messengerFocusId =
    location.state && typeof location.state === "object" && location.state.messengerFocusId
      ? String(location.state.messengerFocusId)
      : undefined;
  const config = getMessengerConfig("admin");
  return (
    <div className="staffPage adminChatPage">
      <p className="clientPageLead adminChatPageLead">
        Courtly Messenger заменяет внешние мессенджеры для работы филиала: переписки с клиентами, сотрудниками и чаты по
        записям. <Link to="/admin">К журналу</Link>
      </p>
      <MessengerWorkspace {...config} focusConversationId={messengerFocusId} />
    </div>
  );
}
