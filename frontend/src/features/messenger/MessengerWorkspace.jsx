import { useEffect, useMemo, useRef, useState } from "react";
import { filterConversationsVisibleForViewer, hideChatForViewer } from "../../utils/messengerHiddenChats";
function formatNowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function initialsFromName(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
export default function MessengerWorkspace({
  title,
  subtitle,
  folders,
  conversations,
  threads,
  primaryActionLabel,
  chatTemplates = [],
  canManageChats = false,
  storageRole = "",
  participantRoster = [],
  focusConversationId,
}) {
  const [folderId, setFolderId] = useState(folders[0]?.id ?? "all");
  const [search, setSearch] = useState("");
  const [convList, setConvList] = useState(() =>
    filterConversationsVisibleForViewer(storageRole, conversations),
  );
  const [messagesByChat, setMessagesByChat] = useState(() => ({ ...threads }));
  const [activeId, setActiveId] = useState(() => {
    const v = filterConversationsVisibleForViewer(storageRole, conversations);
    return v[0]?.id ?? null;
  });
  const [draft, setDraft] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTemplateId, setCreateTemplateId] = useState(chatTemplates[0]?.id ?? "");
  const [createName, setCreateName] = useState("");
  const [createSelectedIds, setCreateSelectedIds] = useState(() => new Set());
  const listRef = useRef(null);
  const lastFocusConversationRef = useRef("");
  useEffect(() => {
    if (!convList.some((c) => c.id === activeId)) {
      setActiveId(convList[0]?.id ?? null);
    }
  }, [convList, activeId]);
  useEffect(() => {
    if (!focusConversationId) {
      lastFocusConversationRef.current = "";
      return;
    }
    if (focusConversationId === lastFocusConversationRef.current) return;
    if (!convList.some((c) => c.id === focusConversationId)) return;
    lastFocusConversationRef.current = focusConversationId;
    setFolderId("all");
    setActiveId(focusConversationId);
    setConvList((list) => list.map((c) => (c.id === focusConversationId ? { ...c, unread: 0 } : c)));
  }, [focusConversationId, convList]);
  const folderUnread = useMemo(() => {
    const m = { all: 0 };
    for (const f of folders) m[f.id] = 0;
    for (const c of convList) {
      m.all += c.unread;
      m[c.folder] = (m[c.folder] ?? 0) + c.unread;
    }
    return m;
  }, [convList, folders]);
  const filtered = useMemo(() => {
    let list = convList.filter((c) => folderId === "all" || c.folder === folderId);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q) ||
          (c.subtitle ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [convList, folderId, search]);
  const activeConv = convList.find((c) => c.id === activeId) ?? null;
  const messages = activeId ? messagesByChat[activeId] ?? [] : [];
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [activeId, messages.length]);
  function selectConversation(id) {
    setActiveId(id);
    setConvList((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }
  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    const time = formatNowTime();
    const msg = { id: `m-${Date.now()}`, dir: "out", text, time };
    setMessagesByChat((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
    setConvList((list) => list.map((c) => (c.id === activeId ? { ...c, lastMessage: text, time } : c)));
    setDraft("");
  }
  function openCreateModal() {
    if (!canManageChats || !chatTemplates.length) return;
    setCreateTemplateId(chatTemplates[0]?.id ?? "");
    setCreateName("");
    setCreateSelectedIds(new Set());
    setShowCreateModal(true);
  }
  function toggleCreateParticipant(pid) {
    setCreateSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }
  function submitCreateModal(e) {
    e.preventDefault();
    const template = chatTemplates.find((t) => t.id === createTemplateId);
    if (!template || !canManageChats) return;
    const id = `new-${template.id}-${Date.now()}`;
    const picked = participantRoster.filter((p) => createSelectedIds.has(p.id));
    const displayName = createName.trim() || template.name;
    const conv = {
      id,
      folder: template.folder,
      name: displayName,
      subtitle: picked.length ? `${picked.length} участников` : "Добавьте участников в настройках чата",
      lastMessage: picked.length
        ? `Состав: ${picked.map((p) => p.name).join(", ")}`
        : template.description,
      time: "сейчас",
      unread: 0,
      isGroup: true,
      chatType: template.chatType,
      participants: picked,
      participantsHint: `${picked.length || "Нет"} участников`,
      linkedEntity: null,
    };
    const intro =
      picked.length > 0
        ? `Канал «${displayName}». Участники: ${picked.map((p) => p.name).join(", ")}. ${template.startText}`
        : `Канал «${displayName}». ${template.startText}`;
    setConvList((prev) => [conv, ...prev]);
    setMessagesByChat((prev) => ({
      ...prev,
      [id]: [{ id: `${id}-1`, dir: "in", text: intro, time: "сейчас" }],
    }));
    setActiveId(id);
    setFolderId(template.folder || "all");
    setShowCreateModal(false);
    setCreateName("");
    setCreateSelectedIds(new Set());
  }
  function addParticipantToActive(person) {
    if (!activeId || !person || activeConv?.chatProtected) return;
    setConvList((cl) =>
      cl.map((c) => {
        if (c.id !== activeId) return c;
        const cur = c.participants ?? [];
        if (cur.some((x) => x.id === person.id)) return c;
        const nextP = [...cur, person];
        return { ...c, participants: nextP, subtitle: `${nextP.length} участников` };
      }),
    );
  }
  function removeParticipantFromActive(pid) {
    if (!activeId || activeConv?.chatProtected) return;
    setConvList((cl) =>
      cl.map((c) => {
        if (c.id !== activeId) return c;
        const nextP = (c.participants ?? []).filter((p) => p.id !== pid);
        return { ...c, participants: nextP, subtitle: `${nextP.length} участников` };
      }),
    );
  }
  const deleteTarget = deleteConfirmId ? convList.find((c) => c.id === deleteConfirmId) ?? null : null;
  function confirmDeleteChat() {
    if (!deleteConfirmId || !storageRole) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    hideChatForViewer(storageRole, id);
    const nextList = convList.filter((c) => c.id !== id);
    setConvList(nextList);
    if (activeId === id) {
      setActiveId(nextList[0]?.id ?? null);
    }
  }
  const rosterAddable = useMemo(() => {
    if (!activeConv || !participantRoster.length) return [];
    const cur = activeConv.participants ?? [];
    const ids = new Set(cur.map((p) => p.id));
    return participantRoster.filter((p) => !ids.has(p.id));
  }, [activeConv, participantRoster]);
  const participantSummary = activeConv
    ? (activeConv.participants ?? []).map((p) => p.name).join(", ") || "Участники не добавлены"
    : "";
  return (
    <div className="messengerPage messengerPage--chatFirst">
      <div className="tgBranchChat tgBranchChat--page messengerWorkspace">
        <aside className="tgBranchChatRail" aria-label="Папки чатов">
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`tgBranchChatRailBtn${folderId === f.id ? " tgBranchChatRailBtn--active" : ""}`}
              onClick={() => setFolderId(f.id)}
              title={f.label}
              aria-pressed={folderId === f.id}
            >
              <span className="tgBranchChatRailEmoji" aria-hidden>
                {f.emoji}
              </span>
              {(folderUnread[f.id] ?? 0) > 0 ? (
                <span className="tgBranchChatRailBadge">{folderUnread[f.id] > 99 ? "99+" : folderUnread[f.id]}</span>
              ) : null}
            </button>
          ))}
        </aside>
        <div className="tgBranchChatListCol">
          <div className="tgBranchChatSearch tgBranchChatSearch--top">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по чатам, людям и ролям"
              autoComplete="off"
            />
          </div>
          <div className="messengerListHead messengerListHead--compact">
            <div className="messengerListTitleWrap">
              <h1 className="messengerListTitle" title={subtitle ? `${title} — ${subtitle}` : title}>
                {title}
              </h1>
              {subtitle ? (
                <p className="messengerListSubtitle" title={subtitle}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            {canManageChats && chatTemplates.length > 0 && primaryActionLabel ? (
              <button type="button" className="btn btnPrimary messengerNewChatBtn" onClick={openCreateModal}>
                {primaryActionLabel}
              </button>
            ) : null}
          </div>
          <div className="messengerSidebarMeta">
            <strong>{convList.length}</strong> чатов в Courtly Messenger
          </div>
          <div className="tgBranchChatListScroll" role="listbox" aria-label="Список чатов">
            {filtered.length === 0 ? (
              <p className="tgBranchChatEmpty">Нет чатов по фильтру</p>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className={`tgBranchChatConvRow${c.id === activeId ? " tgBranchChatConvRow--active" : ""}`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.id === activeId}
                    className={`tgBranchChatConv${c.id === activeId ? " tgBranchChatConv--active" : ""}`}
                    onClick={() => selectConversation(c.id)}
                  >
                    <span className="tgBranchChatAvatar" aria-hidden>
                      {initialsFromName(c.name)}
                    </span>
                    <span className="tgBranchChatConvBody">
                      <span className="tgBranchChatConvTop">
                        <span className="tgBranchChatConvName">{c.name}</span>
                        <span className="tgBranchChatConvTime">{c.time}</span>
                      </span>
                      <span className="tgBranchChatConvPreview">
                        <span className="tgBranchChatConvLast">{c.lastMessage}</span>
                        {c.unread > 0 ? (
                          <span className="tgBranchChatConvUnread">{c.unread > 99 ? "99+" : c.unread}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  {storageRole && !c.chatProtected ? (
                    <button
                      type="button"
                      className="tgBranchChatConvDelete"
                      aria-label={`Скрыть чат «${c.name}» у вас`}
                      title="Скрыть у себя"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirmId(c.id);
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
        <section className="tgBranchChatMain" aria-label="Переписка">
          {activeConv ? (
            <>
              <header className="tgBranchChatMainHead">
                <span className="tgBranchChatAvatar tgBranchChatAvatar--lg" aria-hidden>
                  {initialsFromName(activeConv.name)}
                </span>
                <div className="tgBranchChatMainHeadText">
                  <h2 className="tgBranchChatMainTitle">{activeConv.name}</h2>
                  <p className="tgBranchChatMainSub">{activeConv.subtitle ?? (activeConv.isGroup ? "групповой чат" : "личный чат")}</p>
                </div>
                <span className="messengerChatType">Чат</span>
              </header>
              {canManageChats ? (
                <div className="messengerChatSettings">
                  <button
                    type="button"
                    className="messengerChatSettingsToggle"
                    onClick={() => setChatSettingsOpen((v) => !v)}
                    aria-expanded={chatSettingsOpen}
                  >
                    <span className="messengerChatSettingsToggleLabel">Настройки чата и участники</span>
                    <span className="messengerChatSettingsToggleIcon" aria-hidden>
                      {chatSettingsOpen ? "▼" : "▶"}
                    </span>
                  </button>
                  {chatSettingsOpen ? (
                    <div className="messengerChatSettingsBody">
                      {activeConv.chatProtected ? (
                        <p className="messengerChatSettingsHint">
                          Системный канал: состав фиксируется платформой. История и уведомления сохраняются у всех
                          участников.
                        </p>
                      ) : (
                        <p className="messengerChatSettingsHint">
                          Вы сами формируете состав: добавляйте и удаляйте людей из сетевого справочника. У других
                          участников переписка и история не затрагиваются.
                        </p>
                      )}
                      <p className="messengerChatSettingsRosterPreview" title={participantSummary}>
                        <strong>Сейчас в чате:</strong> {participantSummary}
                      </p>
                      <div
                        className="messengerChatSettingsListPool"
                        role="region"
                        aria-label="Список участников, прокрутка при большом составе"
                      >
                        <ul className="messengerChatSettingsList">
                          {(activeConv.participants ?? []).map((p) => (
                            <li key={p.id} className="messengerChatSettingsMember">
                              <span>
                                <span className="messengerChatSettingsMemberName">{p.name}</span>
                                <span className="messengerChatSettingsMemberMeta">
                                  {p.role}
                                  {p.branch ? ` · ${p.branch}` : ""}
                                </span>
                              </span>
                              {!activeConv.chatProtected ? (
                                <button
                                  type="button"
                                  className="messengerChatSettingsRemove"
                                  onClick={() => removeParticipantFromActive(p.id)}
                                  aria-label={`Убрать ${p.name} из чата`}
                                >
                                  ×
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {!activeConv.chatProtected ? (
                        rosterAddable.length > 0 ? (
                          <label className="messengerChatSettingsAddRow">
                            <span className="messengerChatSettingsAddLabel">Добавить участника из справочника</span>
                            <select
                              className="messengerChatSettingsSelect"
                              defaultValue=""
                              onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                const person = participantRoster.find((x) => x.id === v);
                                if (person) addParticipantToActive(person);
                                e.target.value = "";
                              }}
                            >
                              <option value="">Выберите человека…</option>
                              {rosterAddable.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {p.role} ({p.branch})
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : participantRoster.length > 0 ? (
                          <p className="messengerChatSettingsAddEmpty">Все люди из справочника уже в этом чате.</p>
                        ) : null
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="tgBranchChatPinned" role="note">
                  <span className="tgBranchChatPinnedIcon" aria-hidden>
                    📌
                  </span>
                  <span>
                    Скрыть чат у себя можно крестиком в списке — у собеседников история сохранится. Новые каналы в сети
                    создаёт руководитель.
                  </span>
                </div>
              )}
              <div className="tgBranchChatMsgScroll" ref={listRef}>
                <div className="tgBranchChatMsgInner">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`tgBranchChatBubbleRow tgBranchChatBubbleRow--${msg.dir}`}>
                      <div className={`tgBranchChatBubble tgBranchChatBubble--${msg.dir}`}>
                        {msg.fromName ? <span className="tgBranchChatBubbleForward">{msg.fromName}</span> : null}
                        <p className="tgBranchChatBubbleText">{msg.text}</p>
                        <span className="tgBranchChatBubbleMeta">
                          <time>{msg.time}</time>
                          {msg.dir === "out" ? <span className="tgBranchChatBubbleChecks">✓✓</span> : null}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <form className="tgBranchChatComposer" onSubmit={send}>
                <button type="button" className="tgBranchChatAttach" disabled title="Будет доступно в следующем этапе">
                  📎
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Написать сообщение внутри Courtly…"
                  autoComplete="off"
                  maxLength={4000}
                />
                <button type="submit" className="tgBranchChatSend" disabled={!draft.trim()}>
                  Отпр.
                </button>
              </form>
            </>
          ) : (
            <div className="tgBranchChatPlaceholder">
              <p>Выберите чат слева</p>
            </div>
          )}
        </section>
      </div>
      {showCreateModal && canManageChats ? (
        <div className="messengerDeleteOverlay" role="presentation" onClick={() => setShowCreateModal(false)}>
          <div className="messengerCreateDialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="messengerCreateDialogTitle">Новый чат</h2>
            <p className="messengerCreateDialogLead">
              Укажите название, тип канала и сразу отметьте людей из сети. Состав потом можно изменить в настройках чата.
            </p>
            <form onSubmit={submitCreateModal} className="messengerCreateForm">
              <label className="messengerCreateField">
                <span>Название</span>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Например: Операции Riverside"
                  autoComplete="off"
                />
              </label>
              <fieldset className="messengerCreateFieldset">
                <legend>Тип канала</legend>
                <div className="messengerCreateRadioList">
                  {chatTemplates.map((t) => (
                    <label key={t.id} className="messengerCreateRadio">
                      <input
                        type="radio"
                        name="create-template"
                        checked={createTemplateId === t.id}
                        onChange={() => setCreateTemplateId(t.id)}
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="messengerCreateField">
                <span>Участники (можно несколько)</span>
                <div className="messengerCreateChecks">
                  {participantRoster.map((p) => (
                    <label key={p.id} className="messengerCreateCheck">
                      <input
                        type="checkbox"
                        checked={createSelectedIds.has(p.id)}
                        onChange={() => toggleCreateParticipant(p.id)}
                      />
                      <span>
                        {p.name} <span className="messengerCreateCheckMeta">— {p.role}, {p.branch}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="messengerCreateDialogActions">
                <button type="button" className="btn btnSecondary" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btnPrimary">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {deleteConfirmId && deleteTarget ? (
        <div className="messengerDeleteOverlay" role="presentation" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="messengerDeleteDialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="messenger-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="messenger-delete-title" className="messengerDeleteDialogTitle">
              Скрыть чат у вас?
            </h2>
            <p className="messengerDeleteDialogText">
              Чат «{deleteTarget.name}» исчезнет только из вашего списка. У других участников переписка и история
              останутся без изменений.
            </p>
            <div className="messengerDeleteDialogActions">
              <button type="button" className="btn btnSecondary" onClick={() => setDeleteConfirmId(null)}>
                Отмена
              </button>
              <button type="button" className="btn btnPrimary" onClick={confirmDeleteChat}>
                Скрыть у меня
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
