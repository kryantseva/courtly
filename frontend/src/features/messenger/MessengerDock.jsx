import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
function ChatIcon() {
  return (
    <svg className="clientChatIcon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M5 18l1.2-3H18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconExpand() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 3H5a2 2 0 00-2 2v4M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconCollapse() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M4 12h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function formatNowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
export default function MessengerDock({ title, hint, fullPath, conversations, threads }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [convList, setConvList] = useState(conversations);
  const [messagesByChat, setMessagesByChat] = useState(threads);
  const [activeId, setActiveId] = useState(() => conversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const active = useMemo(() => convList.find((item) => item.id === activeId) ?? null, [convList, activeId]);
  const messages = activeId ? messagesByChat[activeId] ?? [] : [];
  const activeIndex = useMemo(() => convList.findIndex((item) => item.id === activeId), [convList, activeId]);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length, activeId]);
  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    const time = formatNowTime();
    setMessagesByChat((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), { id: `dock-${Date.now()}`, dir: "out", text, time }],
    }));
    setConvList((prev) => prev.map((item) => (item.id === activeId ? { ...item, lastMessage: text, time } : item)));
    setDraft("");
  }
  function switchConversation(delta) {
    if (!convList.length) return;
    const baseIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex = (baseIndex + delta + convList.length) % convList.length;
    setActiveId(convList[nextIndex]?.id ?? null);
  }
  return (
    <div className="clientChatDock messengerDock">
      {open ? (
        <div
          id="messenger-dock-panel"
          className={`clientChatPanel messengerDockPanel${expanded ? " clientChatPanel--expanded" : ""}`}
          role="dialog"
          aria-modal="false"
          aria-label={title}
        >
          <div className="clientChatPanelHead">
            <div className="clientChatPanelTitle">
              <span className="clientChatPanelName">{title}</span>
              <span className="clientChatPanelHint">
                {hint} ·{" "}
                <Link to={fullPath} onClick={() => setOpen(false)} className="adminBranchChatFullLink">
                  полная версия
                </Link>
              </span>
            </div>
            <div className="clientChatPanelActions">
              <button
                type="button"
                className="clientChatPanelMin"
                onClick={() => setExpanded((v) => !v)}
                aria-pressed={expanded}
                aria-label={expanded ? "Уменьшить окно" : "Расширить окно"}
              >
                {expanded ? <IconCollapse /> : <IconExpand />}
              </button>
              <button type="button" className="clientChatPanelMin" onClick={() => setOpen(false)} aria-label="Свернуть">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="messengerDockSwitchRow">
            <button
              type="button"
              className="messengerDockSwitchBtn"
              onClick={() => switchConversation(-1)}
              aria-label="Предыдущий чат"
              disabled={convList.length <= 1}
            >
              ←
            </button>
            <div className="messengerDockActiveTitle" title={active?.name ?? ""}>
              {active ? active.name : "Выберите чат"}
            </div>
            <button
              type="button"
              className="messengerDockSwitchBtn"
              onClick={() => switchConversation(1)}
              aria-label="Следующий чат"
              disabled={convList.length <= 1}
            >
              →
            </button>
          </div>
          <div className="adminBranchChatQuickTabs adminBranchChatQuickTabs--scroll" role="tablist" aria-label="Быстрый выбор диалога">
            {convList.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === activeId}
                className={`adminBranchChatTab${c.id === activeId ? " adminBranchChatTab--active" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="clientChatMessages adminBranchChatMessages" ref={listRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`clientChatMsg clientChatMsg--${msg.dir === "out" ? "user" : "admin"}`}>
                {msg.fromName ? <span className="clientChatMsgMention">{msg.fromName}</span> : null}
                {msg.text}
              </div>
            ))}
          </div>
          <form className="clientChatForm" onSubmit={send}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={active ? `Сообщение для ${active.name}…` : "Выберите диалог…"}
              autoComplete="off"
              maxLength={2000}
              disabled={!active}
            />
            <button type="submit" className="clientChatSend" disabled={!draft.trim() || !active}>
              Отпр.
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        className="clientChatToggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? "messenger-dock-panel" : undefined}
        aria-label={open ? "Свернуть чат" : title}
      >
        <ChatIcon />
      </button>
    </div>
  );
}
