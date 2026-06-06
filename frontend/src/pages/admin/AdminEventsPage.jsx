import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createBranchEvent,
  deleteEventRegistrationStaff,
  deleteEventWaitlistStaff,
  fetchBranchEvents,
  fetchEventRegistrations,
  fetchEventWaitlist,
  patchBranchEvent,
  promoteEventWaitlistStaff,
} from "../../api/branchEvents";
import { fetchBranchRooms } from "../../api/branchRooms";
import { ADMIN_EVENTS_MOCK, ADMIN_EVENT_KIND_LABELS } from "../../data/adminOperationsMock";
import { getActiveBranch } from "../../utils/activeBranch";
const USE_API = import.meta.env.VITE_USE_API === "true";
const EVENT_KIND_OPTIONS =  ([
  "tournament",
  "open_day",
  "camp",
  "maintenance_block",
  "corporate",
]);
const EVENT_STATUSES = [
  "Черновик",
  "Планируется",
  "Регистрация открыта",
  "Идёт",
  "Завершено",
  "Отменено",
];
function statusOptions(current) {
  return Array.from(new Set([...EVENT_STATUSES, current].filter(Boolean)));
}
function minutesToTimeInput(m) {
  if (m == null || typeof m !== "number" || Number.isNaN(m)) return "";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function timeInputToMinutes(s) {
  if (s == null || typeof s !== "string") return null;
  const p = s.trim();
  if (!p) return null;
  const m = p.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59 || h < 0 || mm < 0) return null;
  return h * 60 + mm;
}
function formatRegistrationTime(iso) {
  if (!iso || typeof iso !== "string") return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
export default function AdminEventsPage() {
  const branch = getActiveBranch();
  const branchId = branch?.branchId;
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("tournament");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [venue, setVenue] = useState("");
  const [roomId, setRoomId] = useState("");
  const [journalBlockStart, setJournalBlockStart] = useState("");
  const [journalBlockEnd, setJournalBlockEnd] = useState("");
  const [branchRooms, setBranchRooms] = useState( ([]));
  const [format, setFormat] = useState("Олимпийская система");
  const [maxParticipants, setMaxParticipants] = useState(32);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");
  const [formError, setFormError] = useState("");
  const [formPending, setFormPending] = useState(false);
  const [apiEvents, setApiEvents] = useState( (null));
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState( (null));
  const [rowBusy, setRowBusy] = useState( ({}));
  const [editingId, setEditingId] = useState( (null));
  const [editDraft, setEditDraft] = useState(
    null,
  );
  const [editError, setEditError] = useState("");
  const [participantsPanelForId, setParticipantsPanelForId] = useState( (null));
  const [participantsRows, setParticipantsRows] = useState(
     ({}),
  );
  const [participantRemoveBusy, setParticipantRemoveBusy] = useState( ({}));
  const [waitlistRemoveBusy, setWaitlistRemoveBusy] = useState( ({}));
  const [waitlistPromoteBusy, setWaitlistPromoteBusy] = useState( ({}));
  const useServer = USE_API && Boolean(branchId);
  const range = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setFullYear(to.getFullYear() + 1);
    const y = (d) => d.toISOString().slice(0, 10);
    return { from: y(from), to: y(to) };
  }, []);
  const loadEvents = useCallback(() => {
    if (!useServer || !branchId) return;
    setListLoading(true);
    setListError(null);
    fetchBranchEvents(branchId, range)
      .then((data) => {
        if (Array.isArray(data.events)) setApiEvents(data.events);
      })
      .catch((e) => {
        setApiEvents(null);
        setListError(e instanceof Error ? e.message : "Не удалось загрузить события");
      })
      .finally(() => setListLoading(false));
  }, [branchId, range.from, range.to, useServer]);
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  useEffect(() => {
    if (!useServer || !branchId) {
      setBranchRooms([]);
      return;
    }
    let cancelled = false;
    fetchBranchRooms(branchId)
      .then((data) => {
        if (!cancelled && Array.isArray(data.rooms)) setBranchRooms(data.rooms);
      })
      .catch(() => {
        if (!cancelled) setBranchRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [useServer, branchId]);
  const displayEvents = !useServer ? ADMIN_EVENTS_MOCK : apiEvents !== null ? apiEvents : [];
  const showEventsLoading = useServer && listLoading && apiEvents === null;
  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    if (useServer && (!start || !end)) {
      setFormError("Укажите даты начала и окончания");
      return;
    }
    if (!useServer || !branchId) {
      setToast("Черновик события подготовлен. Включите API и выберите филиал для сохранения на сервере.");
      window.setTimeout(() => setToast(""), 4000);
      return;
    }
    const jbs = timeInputToMinutes(journalBlockStart);
    const jbe = timeInputToMinutes(journalBlockEnd);
    if ((jbs == null) !== (jbe == null)) {
      setFormError("Время в журнале: заполните «с» и «по» или оставьте оба пустыми (весь день).");
      return;
    }
    setFormPending(true);
    try {
      await createBranchEvent(branchId, {
        title,
        kind,
        start_date: start,
        end_date: end,
        venue,
        room_id: roomId || null,
        journal_block_start_min: jbs,
        journal_block_end_min: jbe,
        status: "Черновик",
        format: kind === "tournament" ? format : "",
        max_participants: kind === "tournament" ? maxParticipants : null,
        registered: 0,
        notes,
      });
      setTitle("");
      setVenue("");
      setRoomId("");
      setJournalBlockStart("");
      setJournalBlockEnd("");
      setNotes("");
      setToast("Событие сохранено");
      window.setTimeout(() => setToast(""), 3000);
      loadEvents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setFormPending(false);
    }
  }
  const onStatusChange = useCallback(
    async (eventId, status) => {
      if (!useServer) return;
      setRowBusy((b) => ({ ...b, [eventId]: true }));
      setListError(null);
      try {
        const updated = await patchBranchEvent(eventId, { status });
        setApiEvents((prev) => (prev ? prev.map((ev) => (ev.id === eventId ? updated : ev)) : prev));
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Не удалось обновить статус");
      } finally {
        setRowBusy((b) => {
          const n = { ...b };
          delete n[eventId];
          return n;
        });
      }
    },
    [useServer],
  );
  const closeEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft(null);
    setEditError("");
  }, []);
  const openEdit = useCallback(
    (ev) => {
      if (!useServer) return;
      if (!ev.start_date || !ev.end_date) {
        setListError("Для редактирования нужны даты события — обновите страницу или список.");
        return;
      }
      setListError(null);
      setEditingId(ev.id);
      setEditError("");
      setEditDraft({
        title: ev.title,
        kind: ev.kind,
        start_date: ev.start_date,
        end_date: ev.end_date,
        venue: ev.venue || "",
        room_id: ev.roomId ?? "",
        journalStart: minutesToTimeInput(ev.journalBlockStartMin),
        journalEnd: minutesToTimeInput(ev.journalBlockEndMin),
        format: ev.format || "",
        max_participants: typeof ev.maxParticipants === "number" ? ev.maxParticipants : 32,
        registered: typeof ev.registered === "number" ? ev.registered : 0,
        notes: ev.notes || "",
      });
    },
    [useServer],
  );
  const toggleParticipantsPanel = useCallback(
    (ev) => {
      if (participantsPanelForId === ev.id) {
        setParticipantsPanelForId(null);
        return;
      }
      setParticipantsPanelForId(ev.id);
      setParticipantsRows((m) => ({ ...m, [ev.id]: { loading: true } }));
      Promise.all([fetchEventRegistrations(ev.id), fetchEventWaitlist(ev.id)])
        .then(([regData, wlData]) => {
          setParticipantsRows((m) => ({
            ...m,
            [ev.id]: {
              loading: false,
              rows: Array.isArray(regData.registrations) ? regData.registrations : [],
              count: typeof regData.count === "number" ? regData.count : 0,
              waitlistRows: Array.isArray(wlData.waitlist) ? wlData.waitlist : [],
              waitlistCount: typeof wlData.count === "number" ? wlData.count : 0,
            },
          }));
        })
        .catch((e) => {
          setParticipantsRows((m) => ({
            ...m,
            [ev.id]: {
              loading: false,
              error: e instanceof Error ? e.message : "Не удалось загрузить списки",
            },
          }));
        });
    },
    [participantsPanelForId],
  );
  const removeStaffRegistration = useCallback(async (ev, regRow) => {
    const rid = regRow.id;
    setParticipantRemoveBusy((b) => ({ ...b, [rid]: true }));
    setParticipantsRows((m) => {
      const cur = m[ev.id];
      if (!cur) return m;
      const next = { ...cur };
      delete next.removeError;
      return { ...m, [ev.id]: next };
    });
    try {
      const data = await deleteEventRegistrationStaff(ev.id, rid);
      if (data.event) {
        setApiEvents((prev) =>
          prev ? prev.map((x) => (x.id === data.event.id ? { ...x, ...data.event } : x)) : prev,
        );
      }
      const [fresh, freshWl] = await Promise.all([fetchEventRegistrations(ev.id), fetchEventWaitlist(ev.id)]);
      setParticipantsRows((m) => ({
        ...m,
        [ev.id]: {
          loading: false,
          rows: Array.isArray(fresh.registrations) ? fresh.registrations : [],
          count: typeof fresh.count === "number" ? fresh.count : 0,
          waitlistRows: Array.isArray(freshWl.waitlist) ? freshWl.waitlist : [],
          waitlistCount: typeof freshWl.count === "number" ? freshWl.count : 0,
        },
      }));
      setToast("Участник снят с мероприятия");
      window.setTimeout(() => setToast(""), 2500);
    } catch (e) {
      setParticipantsRows((m) => ({
        ...m,
        [ev.id]: {
          ...m[ev.id],
          removeError: e instanceof Error ? e.message : "Не удалось снять участника",
        },
      }));
    } finally {
      setParticipantRemoveBusy((b) => {
        const n = { ...b };
        delete n[rid];
        return n;
      });
    }
  }, []);
  const removeStaffWaitlist = useCallback(async (ev, row) => {
    const wid = row.id;
    setWaitlistRemoveBusy((b) => ({ ...b, [wid]: true }));
    setParticipantsRows((m) => {
      const cur = m[ev.id];
      if (!cur) return m;
      const next = { ...cur };
      delete next.removeError;
      return { ...m, [ev.id]: next };
    });
    try {
      const data = await deleteEventWaitlistStaff(ev.id, wid);
      if (data.event) {
        setApiEvents((prev) =>
          prev ? prev.map((x) => (x.id === data.event.id ? { ...x, ...data.event } : x)) : prev,
        );
      }
      const [fresh, freshWl] = await Promise.all([fetchEventRegistrations(ev.id), fetchEventWaitlist(ev.id)]);
      setParticipantsRows((m) => ({
        ...m,
        [ev.id]: {
          loading: false,
          rows: Array.isArray(fresh.registrations) ? fresh.registrations : [],
          count: typeof fresh.count === "number" ? fresh.count : 0,
          waitlistRows: Array.isArray(freshWl.waitlist) ? freshWl.waitlist : [],
          waitlistCount: typeof freshWl.count === "number" ? freshWl.count : 0,
        },
      }));
      setToast("Удалено из листа ожидания");
      window.setTimeout(() => setToast(""), 2500);
    } catch (e) {
      setParticipantsRows((m) => ({
        ...m,
        [ev.id]: {
          ...m[ev.id],
          removeError: e instanceof Error ? e.message : "Не удалось удалить из листа ожидания",
        },
      }));
    } finally {
      setWaitlistRemoveBusy((b) => {
        const n = { ...b };
        delete n[wid];
        return n;
      });
    }
  }, []);
  const promoteStaffWaitlist = useCallback(async (ev, row) => {
    const wid = row.id;
    setWaitlistPromoteBusy((b) => ({ ...b, [wid]: true }));
    setParticipantsRows((m) => {
      const cur = m[ev.id];
      if (!cur) return m;
      const next = { ...cur };
      delete next.removeError;
      return { ...m, [ev.id]: next };
    });
    try {
      const raw = await promoteEventWaitlistStaff(ev.id, wid);
      const evUpd = raw.data?.event ?? raw.event;
      if (evUpd) {
        setApiEvents((prev) =>
          prev ? prev.map((x) => (x.id === evUpd.id ? { ...x, ...evUpd } : x)) : prev,
        );
      }
      const [fresh, freshWl] = await Promise.all([fetchEventRegistrations(ev.id), fetchEventWaitlist(ev.id)]);
      setParticipantsRows((m) => ({
        ...m,
        [ev.id]: {
          loading: false,
          rows: Array.isArray(fresh.registrations) ? fresh.registrations : [],
          count: typeof fresh.count === "number" ? fresh.count : 0,
          waitlistRows: Array.isArray(freshWl.waitlist) ? freshWl.waitlist : [],
          waitlistCount: typeof freshWl.count === "number" ? freshWl.count : 0,
        },
      }));
      setToast("Запись переведена из листа ожидания в участники");
      window.setTimeout(() => setToast(""), 2500);
    } catch (e) {
      setParticipantsRows((m) => ({
        ...m,
        [ev.id]: {
          ...m[ev.id],
          removeError: e instanceof Error ? e.message : "Не удалось перевести из листа ожидания",
        },
      }));
    } finally {
      setWaitlistPromoteBusy((b) => {
        const n = { ...b };
        delete n[wid];
        return n;
      });
    }
  }, []);
  async function handleEditSave(e, eventId) {
    e.preventDefault();
    if (!editDraft) return;
    setEditError("");
    if (!editDraft.start_date || !editDraft.end_date) {
      setEditError("Укажите даты начала и окончания");
      return;
    }
    const ejbs = timeInputToMinutes(editDraft.journalStart);
    const ejbe = timeInputToMinutes(editDraft.journalEnd);
    if ((ejbs == null) !== (ejbe == null)) {
      setEditError("Время в журнале: заполните «с» и «по» или оставьте оба пустыми.");
      return;
    }
    setRowBusy((b) => ({ ...b, [eventId]: true }));
    setListError(null);
    try {
      const body = {
        title: editDraft.title,
        kind: editDraft.kind,
        start_date: editDraft.start_date,
        end_date: editDraft.end_date,
        venue: editDraft.venue,
        room_id: editDraft.room_id || null,
        journal_block_start_min: ejbs,
        journal_block_end_min: ejbe,
        format: editDraft.kind === "tournament" ? editDraft.format : "",
        max_participants: editDraft.kind === "tournament" ? editDraft.max_participants : null,
        registered: editDraft.registered,
        notes: editDraft.notes,
      };
      const updated = await patchBranchEvent(eventId, body);
      setApiEvents((prev) => (prev ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev));
      closeEdit();
      setToast("Событие обновлено");
      window.setTimeout(() => setToast(""), 3000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setRowBusy((b) => {
        const n = { ...b };
        delete n[eventId];
        return n;
      });
    }
  }
  return (
    <div className="clientPage adminEventsPage">
      <h1 className="clientPageTitle">События и турниры</h1>
      <p className="clientPageLead">
        Единая точка для <strong>турниров</strong>, открытых дней, лагерей и блоков под мероприятия. Дальше — этапы
        регистрации, сетка, судьи, призы и связь с календарём кортов (без двойных броней).
      </p>
      <p className="clientPageLead">
        <Link to="/admin/slots" className="clientPanelLink">
          Слоты и переносы
        </Link>
        {" · "}
        <Link to="/admin" className="clientPanelLink">
          Журнал записи
        </Link>
      </p>
      {USE_API && !branchId ? (
        <p className="clientPanelHint" role="note">
          Выберите филиал, чтобы работать с событиями через API.
        </p>
      ) : null}
      {listError ? (
        <p className="authError" role="alert">
          {listError}
        </p>
      ) : null}
      {toast ? (
        <p className="adminOpsToast" role="status">
          {toast}
        </p>
      ) : null}
      <div className="adminEventsLayout">
        <section className="clientPanel adminOpsCard">
          <h2>Добавить событие</h2>
          <form className="adminOpsForm" onSubmit={handleCreate}>
            {formError ? <p className="authError">{formError}</p> : null}
            <label className="authField">
              <span>Название</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Кубок весны 2026"
                required
              />
            </label>
            <label className="authField">
              <span>Тип</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {EVENT_KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {ADMIN_EVENT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <div className="adminOpsFormRow">
              <label className="authField">
                <span>Начало</span>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label className="authField">
                <span>Окончание</span>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            </div>
            <label className="authField">
              <span>Площадка</span>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Корты, залы, весь филиал"
              />
            </label>
            {useServer ? (
              <label className="authField">
                <span>Зал в журнале</span>
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={formPending}>
                  <option value="">Не привязан к корту</option>
                  {branchRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {useServer ? (
              <>
                <div className="adminOpsFormRow">
                  <label className="authField">
                    <span>Занятость в журнале, с</span>
                    <input
                      type="time"
                      step={60}
                      value={journalBlockStart}
                      onChange={(e) => setJournalBlockStart(e.target.value)}
                      disabled={formPending}
                    />
                  </label>
                  <label className="authField">
                    <span>по</span>
                    <input
                      type="time"
                      step={60}
                      value={journalBlockEnd}
                      onChange={(e) => setJournalBlockEnd(e.target.value)}
                      disabled={formPending}
                    />
                  </label>
                </div>
                <p className="clientPanelHint">
                  Если зал выбран: пустые поля — учёт пересечений на весь день; иначе только в этом интервале.
                </p>
              </>
            ) : null}
            {kind === "tournament" ? (
              <>
                <label className="authField">
                  <span>Формат турнира</span>
                  <select value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="Олимпийская система">Олимпийская система</option>
                    <option value="Круговая (в группах)">Круговая (в группах)</option>
                    <option value="Швейцарская">Швейцарская</option>
                    <option value="Плей-офф из групп">Плей-офф из групп</option>
                  </select>
                </label>
                <label className="authField">
                  <span>Лимит участников</span>
                  <input
                    type="number"
                    min={2}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value) || 0)}
                  />
                </label>
              </>
            ) : null}
            <label className="authField">
              <span>Заметки</span>
              <textarea
                className="adminOpsTextarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Судьи, призовой фонд, возрастные категории…"
              />
            </label>
            <button type="submit" className="btn btnPrimary" disabled={formPending}>
              {formPending ? "Сохранение…" : useServer ? "Сохранить на сервере" : "Сохранить черновик (демо)"}
            </button>
          </form>
        </section>
        <section className="clientPanel">
          <h2>План филиала</h2>
          {showEventsLoading ? <p className="clientPanelHint">Загрузка…</p> : null}
          <ul className="adminEventsList">
            {!showEventsLoading && useServer && displayEvents.length === 0 ? (
              <li className="clientPanelHint">Нет событий в выбранном периоде.</li>
            ) : null}
            {!showEventsLoading
              ? displayEvents.map((ev) => (
              <li key={ev.id} className="adminEventsCard">
                <div className="adminEventsCardHead">
                  <span className="adminEventsKind">{ADMIN_EVENT_KIND_LABELS[ev.kind] ?? ev.kind}</span>
                  {useServer ? (
                    <select
                      className="staffTableSelect adminEventsStatusSelect"
                      value={ev.status}
                      disabled={Boolean(rowBusy[ev.id])}
                      aria-label={`Статус: ${ev.title}`}
                      onChange={(e) => onStatusChange(ev.id, e.target.value)}
                    >
                      {statusOptions(ev.status).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`adminEventsStatus adminEventsStatus--${ev.status.includes("открыта") ? "open" : "draft"}`}>
                      {ev.status}
                    </span>
                  )}
                </div>
                {editingId === ev.id && editDraft ? (
                  <form className="adminOpsForm adminEventsEditForm" onSubmit={(e) => handleEditSave(e, ev.id)}>
                    {editError ? (
                      <p className="authError" role="alert">
                        {editError}
                      </p>
                    ) : null}
                    <label className="authField">
                      <span>Название</span>
                      <input
                        value={editDraft.title}
                        onChange={(e) => setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                        required
                      />
                    </label>
                    <label className="authField">
                      <span>Тип</span>
                      <select
                        value={editDraft.kind}
                        onChange={(e) => setEditDraft((d) => (d ? { ...d, kind: e.target.value } : d))}
                      >
                        {EVENT_KIND_OPTIONS.map((k) => (
                          <option key={k} value={k}>
                            {ADMIN_EVENT_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="adminOpsFormRow">
                      <label className="authField">
                        <span>Начало</span>
                        <input
                          type="date"
                          value={editDraft.start_date}
                          onChange={(e) => setEditDraft((d) => (d ? { ...d, start_date: e.target.value } : d))}
                          required
                        />
                      </label>
                      <label className="authField">
                        <span>Окончание</span>
                        <input
                          type="date"
                          value={editDraft.end_date}
                          onChange={(e) => setEditDraft((d) => (d ? { ...d, end_date: e.target.value } : d))}
                          required
                        />
                      </label>
                    </div>
                    <label className="authField">
                      <span>Площадка</span>
                      <input
                        value={editDraft.venue}
                        onChange={(e) => setEditDraft((d) => (d ? { ...d, venue: e.target.value } : d))}
                      />
                    </label>
                    <label className="authField">
                      <span>Зал в журнале</span>
                      <select
                        value={editDraft.room_id}
                        onChange={(e) => setEditDraft((d) => (d ? { ...d, room_id: e.target.value } : d))}
                        disabled={Boolean(rowBusy[ev.id])}
                      >
                        <option value="">Не привязан к корту</option>
                        {branchRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="adminOpsFormRow">
                      <label className="authField">
                        <span>В журнале, с</span>
                        <input
                          type="time"
                          step={60}
                          value={editDraft.journalStart}
                          onChange={(e) => setEditDraft((d) => (d ? { ...d, journalStart: e.target.value } : d))}
                          disabled={Boolean(rowBusy[ev.id])}
                        />
                      </label>
                      <label className="authField">
                        <span>по</span>
                        <input
                          type="time"
                          step={60}
                          value={editDraft.journalEnd}
                          onChange={(e) => setEditDraft((d) => (d ? { ...d, journalEnd: e.target.value } : d))}
                          disabled={Boolean(rowBusy[ev.id])}
                        />
                      </label>
                    </div>
                    {editDraft.kind === "tournament" ? (
                      <>
                        <label className="authField">
                          <span>Формат турнира</span>
                          <select
                            value={editDraft.format}
                            onChange={(e) => setEditDraft((d) => (d ? { ...d, format: e.target.value } : d))}
                          >
                            <option value="Олимпийская система">Олимпийская система</option>
                            <option value="Круговая (в группах)">Круговая (в группах)</option>
                            <option value="Швейцарская">Швейцарская</option>
                            <option value="Плей-офф из групп">Плей-офф из групп</option>
                          </select>
                        </label>
                        <label className="authField">
                          <span>Лимит участников</span>
                          <input
                            type="number"
                            min={2}
                            value={editDraft.max_participants}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, max_participants: Number(e.target.value) || 0 } : d))
                            }
                          />
                        </label>
                      </>
                    ) : null}
                    <label className="authField">
                      <span>Записано участников</span>
                      <input
                        type="number"
                        min={typeof ev.onlineRegisteredCount === "number" ? ev.onlineRegisteredCount : 0}
                        max={
                          typeof editDraft.max_participants === "number" && editDraft.max_participants > 0
                            ? editDraft.max_participants
                            : undefined
                        }
                        value={editDraft.registered}
                        onChange={(e) =>
                          setEditDraft((d) => (d ? { ...d, registered: Number(e.target.value) || 0 } : d))
                        }
                      />
                    </label>
                    {typeof ev.onlineRegisteredCount === "number" && ev.onlineRegisteredCount > 0 ? (
                      <p className="clientPanelHint">
                        Онлайн-записей через приложение: <strong>{ev.onlineRegisteredCount}</strong>. Счётчик не может
                        быть меньше — снимите участников в списке ниже карточки.
                      </p>
                    ) : null}
                    <label className="authField">
                      <span>Заметки</span>
                      <textarea
                        className="adminOpsTextarea"
                        rows={3}
                        value={editDraft.notes}
                        onChange={(e) => setEditDraft((d) => (d ? { ...d, notes: e.target.value } : d))}
                      />
                    </label>
                    <div className="staffQuickActions">
                      <button type="submit" className="btn btnPrimary" disabled={Boolean(rowBusy[ev.id])}>
                        {rowBusy[ev.id] ? "Сохранение…" : "Сохранить"}
                      </button>
                      <button type="button" className="btn btnSecondary" disabled={Boolean(rowBusy[ev.id])} onClick={closeEdit}>
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h3 className="adminEventsTitle">{ev.title}</h3>
                    <p className="adminEventsMeta">
                      {ev.startLabel}
                      {ev.endLabel !== ev.startLabel ? ` — ${ev.endLabel}` : ""} · {ev.venue}
                    </p>
                    {useServer && ev.roomLabel ? (
                      <p className="adminEventsMeta adminEventsRoomLine">Зал в журнале: {ev.roomLabel}</p>
                    ) : null}
                    {useServer && ev.journalBlockRangeLabel ? (
                      <p className="adminEventsMeta">Интервал в журнале: {ev.journalBlockRangeLabel}</p>
                    ) : null}
                    {ev.format ? <p className="adminEventsFormat">Формат: {ev.format}</p> : null}
                    {typeof ev.maxParticipants === "number" ? (
                      <p className="adminEventsReg">
                        Участники: {ev.registered ?? 0} / {ev.maxParticipants}
                        {useServer &&
                        typeof ev.onlineRegisteredCount === "number" &&
                        ev.onlineRegisteredCount > 0 ? (
                          <> · онлайн-записей: {ev.onlineRegisteredCount}</>
                        ) : null}
                      </p>
                    ) : useServer &&
                      typeof ev.onlineRegisteredCount === "number" &&
                      ev.onlineRegisteredCount > 0 ? (
                      <p className="adminEventsReg">
                        Записано по счётчику: {ev.registered ?? 0} · онлайн-записей: {ev.onlineRegisteredCount}
                      </p>
                    ) : null}
                    {ev.notes ? <p className="adminEventsNotes">{ev.notes}</p> : null}
                    <div className="staffQuickActions">
                      {useServer && ev.kind === "tournament" ? (
                        <Link to={`/admin/events/${ev.id}/bracket`} className="btn btnSecondary">
                          Сетка турнира
                        </Link>
                      ) : (
                        <button type="button" className="btn btnSecondary" disabled>
                          Сетка турнира
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btnSecondary"
                        disabled={!useServer}
                        onClick={() => toggleParticipantsPanel(ev)}
                      >
                        {participantsPanelForId === ev.id ? "Скрыть участников" : "Записанные участники"}
                      </button>
                      <button
                        type="button"
                        className="btn btnSecondary"
                        disabled={!useServer || Boolean(rowBusy[ev.id])}
                        onClick={() => openEdit(ev)}
                      >
                        Редактировать
                      </button>
                    </div>
                    {useServer && participantsPanelForId === ev.id ? (
                      <div className="adminEventsParticipants">
                        {participantsRows[ev.id]?.loading ? (
                          <p className="clientPanelHint">Загрузка списка…</p>
                        ) : null}
                        {participantsRows[ev.id]?.error ? (
                          <p className="authError" role="alert">
                            {participantsRows[ev.id].error}
                          </p>
                        ) : null}
                        {participantsRows[ev.id]?.removeError ? (
                          <p className="authError" role="alert">
                            {participantsRows[ev.id].removeError}
                          </p>
                        ) : null}
                        {participantsRows[ev.id]?.rows && !participantsRows[ev.id]?.loading ? (
                          participantsRows[ev.id].rows.length === 0 ? (
                            <p className="clientPanelHint">
                              Пока никто не записался через приложение (счётчик «Записано» в карточке может учитывать и
                              ручной ввод).
                            </p>
                          ) : (
                            <ul className="adminEventsParticipantsList">
                              {participantsRows[ev.id].rows.map((r) => (
                                <li key={r.id} className="adminEventsParticipantRow">
                                  <span className="adminEventsParticipantMain">
                                    <strong className="adminEventsParticipantName">
                                      {r.displayName || r.email || `Пользователь ${r.userId}`}
                                    </strong>
                                    {r.displayName && r.email ? (
                                      <span className="adminEventsParticipantEmail">{r.email}</span>
                                    ) : null}
                                    {r.phone ? <span className="adminEventsParticipantPhone">{r.phone}</span> : null}
                                  </span>
                                  <span className="adminEventsParticipantWhen" title={r.createdAt}>
                                    {formatRegistrationTime(r.createdAt)}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btnSecondary adminEventsParticipantRemove"
                                    disabled={Boolean(participantRemoveBusy[r.id])}
                                    onClick={() => removeStaffRegistration(ev, r)}
                                  >
                                    {participantRemoveBusy[r.id] ? "…" : "Снять"}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : null}
                        <h4 className="adminEventsParticipantsSubhead">Лист ожидания</h4>
                        {participantsRows[ev.id]?.waitlistRows &&
                        !participantsRows[ev.id]?.loading &&
                        participantsRows[ev.id].waitlistRows.length === 0 ? (
                          <p className="clientPanelHint">В листе ожидания никого нет.</p>
                        ) : null}
                        {participantsRows[ev.id]?.waitlistRows &&
                        !participantsRows[ev.id]?.loading &&
                        participantsRows[ev.id].waitlistRows.length > 0 ? (
                          <ul className="adminEventsParticipantsList adminEventsWaitlistList">
                            {participantsRows[ev.id].waitlistRows.map((w) => (
                              <li key={w.id} className="adminEventsParticipantRow adminEventsWaitlistRow">
                                <span className="adminEventsWaitlistPosition" title="Позиция в очереди">
                                  {w.position}
                                </span>
                                <span className="adminEventsParticipantMain">
                                  <strong className="adminEventsParticipantName">
                                    {w.displayName || w.email || `Пользователь ${w.userId}`}
                                  </strong>
                                  {w.displayName && w.email ? (
                                    <span className="adminEventsParticipantEmail">{w.email}</span>
                                  ) : null}
                                  {w.phone ? <span className="adminEventsParticipantPhone">{w.phone}</span> : null}
                                </span>
                                <span className="adminEventsParticipantWhen" title={w.createdAt}>
                                  {formatRegistrationTime(w.createdAt)}
                                </span>
                                {useServer ? (
                                  <button
                                    type="button"
                                    className="btn btnPrimary adminEventsWaitlistPromote"
                                    disabled={
                                      Boolean(waitlistPromoteBusy[w.id]) ||
                                      Boolean(waitlistRemoveBusy[w.id]) ||
                                      (typeof ev.maxParticipants === "number" &&
                                        typeof ev.registered === "number" &&
                                        ev.registered >= ev.maxParticipants)
                                    }
                                    title={
                                      typeof ev.maxParticipants === "number" &&
                                      typeof ev.registered === "number" &&
                                      ev.registered >= ev.maxParticipants
                                        ? "Нет свободных мест"
                                        : "Перевести в список участников"
                                    }
                                    onClick={() => promoteStaffWaitlist(ev, w)}
                                  >
                                    {waitlistPromoteBusy[w.id] ? "…" : "В участники"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="btn btnSecondary adminEventsParticipantRemove"
                                  disabled={Boolean(waitlistRemoveBusy[w.id]) || Boolean(waitlistPromoteBusy[w.id])}
                                  onClick={() => removeStaffWaitlist(ev, w)}
                                >
                                  {waitlistRemoveBusy[w.id] ? "…" : "Убрать"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </li>
                ))
              : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
