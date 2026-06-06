import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeTask,
  createAdminTask,
  createDirectorTask,
  getTasksForRole,
  subscribeTaskCenter,
} from "../../data/taskCenterStore";
function toDateInput(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}
const TASK_SECTION_OPTIONS = [
  "Операционные",
  "Клиенты",
  "Финансы",
  "Персонал",
  "Маркетинг",
  "Залы и инвентарь",
  "Документы",
  "Система",
];
export default function TaskCenterPopover({ role, directorAssignees = [] }) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState(() => getTasksForRole(role));
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("Операционные");
  const [deadline, setDeadline] = useState(toDateInput(1));
  const [comment, setComment] = useState("");
  const [assigneeKey, setAssigneeKey] = useState("admin-on-shift");
  const wrapRef = useRef(null);
  const resolvedAssignees = useMemo(
    () =>
      directorAssignees.length
        ? directorAssignees
        : [
            { key: "director-self", role: "director", id: "director-self", label: "Себе (руководитель)" },
            { key: "admin-on-shift", role: "admin", id: "admin-on-shift", label: "Администратор на смене" },
          ],
    [directorAssignees],
  );
  useEffect(() => {
    setTasks(getTasksForRole(role));
    return subscribeTaskCenter(() => setTasks(getTasksForRole(role)));
  }, [role]);
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const taskSections = useMemo(() => {
    const fromDirector = tasks.filter((t) => t.source === "director" && t.status !== "done");
    const own = tasks.filter((t) => t.source !== "director" && t.status !== "done");
    const ownDirector = tasks.filter(
      (t) => t.source === "director" && t.assigneeRole === "director" && t.status !== "done",
    );
    const toAdmins = tasks.filter(
      (t) => t.source === "director" && t.assigneeRole === "admin" && t.status !== "done",
    );
    const done = tasks.filter((t) => t.status === "done");
    return { fromDirector, own, ownDirector, toAdmins, done };
  }, [tasks]);
  function submitTask(e) {
    e.preventDefault();
    const payload = { title, section, deadline, comment };
    if (!title.trim()) return;
    if (role === "director") {
      const target = resolvedAssignees.find((item) => item.key === assigneeKey) ?? resolvedAssignees[0] ?? null;
      createDirectorTask({
        ...payload,
        assigneeRole: target?.role ?? "admin",
        assigneeId: target?.id ?? "admin-on-shift",
        assigneeLabel: target?.label ?? "Администратор на смене",
      });
    } else {
      createAdminTask(payload);
    }
    setTitle("");
    setSection("Операционные");
    setDeadline(toDateInput(1));
    setComment("");
    setFormOpen(false);
  }
  const unresolvedCount = tasks.filter((t) => t.status !== "done").length;
  return (
    <div className={`taskCenterWrap${open ? " taskCenterWrap--open" : ""}`} ref={wrapRef}>
      <button type="button" className="btn btnSecondary taskCenterBtn" onClick={() => setOpen((v) => !v)}>
        Задачи
        {unresolvedCount > 0 ? <span className="taskCenterBtnBadge">{unresolvedCount}</span> : null}
      </button>
      {open ? (
        <div className="taskCenterPopover" role="region" aria-label="Центр задач">
          <div className="taskCenterHead">
            <strong>Центр задач</strong>
            <span>{role === "director" ? "Руководитель" : "Администратор"}</span>
          </div>
          {role === "admin" ? (
            <>
              <section className="taskCenterSection">
                <h4>От руководителя</h4>
                <ul className="taskCenterList">
                  {taskSections.fromDirector.map((t) => (
                    <li key={t.id} className="taskCenterItem">
                      <div>
                        <strong>{t.title}</strong>
                        <p>{t.section}</p>
                        {t.comment ? <p>{t.comment}</p> : null}
                        <span>Дедлайн: {t.deadline}</span>
                      </div>
                      <button type="button" className="taskCenterDoneBtn" onClick={() => completeTask(t.id)}>
                        Готово
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="taskCenterSection">
                <h4>Мои задачи</h4>
                <ul className="taskCenterList">
                  {taskSections.own.map((t) => (
                    <li key={t.id} className="taskCenterItem">
                      <div>
                        <strong>{t.title}</strong>
                        <p>{t.section}</p>
                        {t.comment ? <p>{t.comment}</p> : null}
                        <span>Дедлайн: {t.deadline}</span>
                      </div>
                      <button type="button" className="taskCenterDoneBtn" onClick={() => completeTask(t.id)}>
                        Готово
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className="taskCenterSection">
                <h4>Мои задачи руководителя</h4>
                <ul className="taskCenterList">
                  {taskSections.ownDirector.map((t) => (
                    <li key={t.id} className="taskCenterItem">
                      <div>
                        <strong>{t.title}</strong>
                        <p>{t.section}</p>
                        {t.comment ? <p>{t.comment}</p> : null}
                        <span>Дедлайн: {t.deadline}</span>
                      </div>
                      <button type="button" className="taskCenterDoneBtn" onClick={() => completeTask(t.id)}>
                        Готово
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="taskCenterSection">
                <h4>Задачи для администратора</h4>
                <ul className="taskCenterList">
                  {taskSections.toAdmins.map((t) => (
                    <li key={t.id} className="taskCenterItem">
                      <div>
                        <strong>{t.title}</strong>
                        <p>{t.section}</p>
                        {t.comment ? <p>{t.comment}</p> : null}
                        <span>
                          {t.assigneeLabel ? `${t.assigneeLabel} · ` : ""}Дедлайн: {t.deadline}
                        </span>
                      </div>
                      <button type="button" className="taskCenterDoneBtn" onClick={() => completeTask(t.id)}>
                        Готово
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          {taskSections.done.length > 0 ? (
            <section className="taskCenterSection">
              <h4>Выполненные</h4>
              <ul className="taskCenterList">
                {taskSections.done.slice(0, 4).map((t) => (
                  <li key={t.id} className="taskCenterItem taskCenterItem--done">
                    <div>
                      <strong>{t.title}</strong>
                      {t.comment ? <p>{t.comment}</p> : null}
                      <span>Дедлайн: {t.deadline}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <button type="button" className="taskCenterFab" onClick={() => setFormOpen(true)}>
            + Новая задача
          </button>
          {formOpen ? (
            <form className="taskCenterForm" onSubmit={submitTask}>
              <h4>{role === "director" ? "Поставить задачу админу" : "Добавить задачу"}</h4>
              <label>
                <span>Задача</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что нужно сделать" />
              </label>
              {role === "director" ? (
                <label>
                  <span>Кому поставить</span>
                  <div className="taskCenterSelectWrap">
                    <select value={assigneeKey} onChange={(e) => setAssigneeKey(e.target.value)}>
                      {resolvedAssignees.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              ) : null}
              <label>
                <span>Раздел</span>
                <div className="taskCenterSelectWrap">
                  <select value={section} onChange={(e) => setSection(e.target.value)}>
                    {TASK_SECTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="taskCenterSectionQuick">
                  {TASK_SECTION_OPTIONS.slice(0, 6).map((opt) => (
                    <button
                      key={`quick-${opt}`}
                      type="button"
                      className={`taskCenterSectionQuickBtn${section === opt ? " taskCenterSectionQuickBtn--active" : ""}`}
                      onClick={() => setSection(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                <span>Дедлайн</span>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label>
                <span>Комментарий к задаче</span>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Дополнительные детали, шаги, контекст"
                />
              </label>
              <div className="taskCenterFormActions">
                <button type="submit" className="btn btnPrimary">
                  Сохранить
                </button>
                <button type="button" className="btn btnSecondary" onClick={() => setFormOpen(false)}>
                  Отмена
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
