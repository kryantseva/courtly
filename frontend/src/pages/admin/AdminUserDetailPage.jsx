import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchBranchCrmClient } from "../../api/branchCrm";
import { ADMIN_STAFF_MOCK } from "../../data/adminDashboardMock";
import { getClientBaseRecord } from "../../data/clientBaseMock";
import ClientProfileFull from "../../components/staff/ClientProfileFull";
import { getActiveBranch } from "../../utils/activeBranch";
const USE_API = import.meta.env.VITE_USE_API === "true";
function mapCrmToClientRecord(d, branchLabel) {
  const ref = String(d.clientRef ?? "");
  const debt = d.debt && typeof d.debt === "object" ? d.debt : null;
  const pending = debt && typeof debt.pendingPaymentCount === "number" ? debt.pendingPaymentCount : 0;
  const unpaid = debt && typeof debt.unpaidBookingCount === "number" ? debt.unpaidBookingCount : 0;
  return {
    id: ref,
    branchId: String(d.branchId ?? ""),
    branchName: String(d.branchName ?? branchLabel),
    name: String(d.name ?? ref),
    email: String(d.email ?? ""),
    phone: String(d.phone ?? ""),
    status: pending > 0 || unpaid > 0 ? "Требует внимания" : "Активен",
    tags: pending > 0 ? ["к оплате"] : [],
    lastVisit: String(d.lastVisit ?? "—"),
    adminMessengerConversationId: null,
    upcomingBookings: Array.isArray(d.upcomingBookings) ? d.upcomingBookings : [],
    visitHistory: Array.isArray(d.visitHistory) ? d.visitHistory : [],
    payments: Array.isArray(d.payments)
      ? d.payments.map((p) => ({
          id: String(p.id),
          date: String(p.date),
          amount: String(p.amount),
          method: String(p.method ?? ""),
          status: String(p.status),
          label: String(p.label ?? ""),
        }))
      : [],
  };
}
const STAFF_DRAFT_STORAGE_PREFIX = "courtly.admin.staffDraft.";
function loadStaffDraft(staffId) {
  try {
    const raw = sessionStorage.getItem(STAFF_DRAFT_STORAGE_PREFIX + staffId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveStaffDraft(staffId, data) {
  sessionStorage.setItem(STAFF_DRAFT_STORAGE_PREFIX + staffId, JSON.stringify(data));
}
export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const clientRecord = userId ? getClientBaseRecord(userId) : null;
  const staffBase = useMemo(() => (userId ? ADMIN_STAFF_MOCK.find((s) => s.id === userId) : null), [userId]);
  const branch = getActiveBranch();
  const [crmRaw, setCrmRaw] = useState( (null));
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmError, setCrmError] = useState( (null));
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [savedFlash, setSavedFlash] = useState("");
  useEffect(() => {
    if (clientRecord || !userId || !USE_API || !branch?.branchId) {
      setCrmRaw(null);
      setCrmError(null);
      setCrmLoading(false);
      return;
    }
    let cancelled = false;
    setCrmLoading(true);
    setCrmError(null);
    fetchBranchCrmClient(branch.branchId, userId)
      .then((raw) => {
        const d = raw.data ?? raw;
        if (!cancelled) setCrmRaw(d && typeof d === "object" ? d : null);
      })
      .catch((e) => {
        if (!cancelled) {
          setCrmRaw(null);
          setCrmError(e instanceof Error ? e.message : "Не удалось загрузить карточку");
        }
      })
      .finally(() => {
        if (!cancelled) setCrmLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientRecord, userId, branch?.branchId]);
  useEffect(() => {
    if (!staffBase) return;
    const draft = loadStaffDraft(staffBase.id);
    setName(draft?.name ?? staffBase.name);
    setRole(draft?.role ?? staffBase.role);
    setContact(draft?.contact ?? staffBase.contact);
    setPhone(draft?.phone ?? "");
    setNote(draft?.note ?? "");
  }, [staffBase]);
  if (clientRecord) {
    return (
      <ClientProfileFull client={clientRecord} variant="admin" backTo="/admin/clients" backLabel="Клиентская база" />
    );
  }
  if (USE_API && crmLoading) {
    return (
      <div className="clientPage">
        <p className="clientPanelHint">Загрузка карточки клиента…</p>
        <Link to="/admin/clients" className="btn btnSecondary">
          К клиентской базе
        </Link>
      </div>
    );
  }
  if (crmRaw && branch?.branchName) {
    const crmClient = mapCrmToClientRecord(crmRaw, branch.branchName);
    const debt = crmRaw.debt && typeof crmRaw.debt === "object" ? crmRaw.debt : null;
    return (
      <div className="clientPage">
        <ClientProfileFull client={crmClient} variant="admin" backTo="/admin/clients" backLabel="Клиентская база" />
        {debt ? (
          <section className="clientPanel">
            <h2>Задолженности и контроль оплат</h2>
            <p className="clientPanelHint">{String(debt.summary ?? "")}</p>
            {typeof debt.pendingRubHint === "number" && debt.pendingRubHint > 0 ? (
              <p className="clientPanelHint">
                Оценка суммы по позициям «К оплате» (по подписям): {debt.pendingRubHint} ₽
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    );
  }
  if (!staffBase) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Пользователь не найден</h1>
        {crmError ? <p className="authError">{crmError}</p> : null}
        <Link to="/admin/clients" className="btn btnSecondary">
          К клиентской базе
        </Link>
      </div>
    );
  }
  function handleStaffSave(e) {
    e.preventDefault();
    saveStaffDraft(staffBase.id, { name, role, contact, phone, note });
    setSavedFlash("Изменения сохранены локально (демо). После API — синхронизация с сервером.");
    window.setTimeout(() => setSavedFlash(""), 4000);
  }
  function handleResetDemo() {
    sessionStorage.removeItem(STAFF_DRAFT_STORAGE_PREFIX + staffBase.id);
    setName(staffBase.name);
    setRole(staffBase.role);
    setContact(staffBase.contact);
    setPhone("");
    setNote("");
    setSavedFlash("Сброшено к демо-данным.");
    window.setTimeout(() => setSavedFlash(""), 3000);
  }
  return (
    <div className="clientPage">
      <p className="clientPageLead">
        <Link to="/admin/staff" className="clientPanelLink">
          ← Команда
        </Link>
      </p>
      <h1 className="clientPageTitle">{name || staffBase.name}</h1>
      <p className="clientPanelHint">{role || staffBase.role}</p>
      {savedFlash ? (
        <p className="adminOpsToast" role="status">
          {savedFlash}
        </p>
      ) : null}
      <section className="clientPanel adminStaffEditCard">
        <h2>Карточка сотрудника</h2>
        <p className="clientPanelHint">
          Редактирование для демо сохраняется в <code className="adminInlineCode">sessionStorage</code>. В продукте —
          права, график, ставки и доступы завязаны на API и роли сети.
        </p>
        <form className="adminOpsForm" onSubmit={handleStaffSave}>
          <label className="authField">
            <span>ФИО</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
          <label className="authField">
            <span>Роль на филиале</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} list="adminStaffRoleHints" />
            <datalist id="adminStaffRoleHints">
              <option value="Тренер" />
              <option value="Старший тренер" />
              <option value="Администратор смены" />
              <option value="Менеджер зала" />
            </datalist>
          </label>
          <label className="authField">
            <span>Email / логин</span>
            <input value={contact} onChange={(e) => setContact(e.target.value)} type="email" autoComplete="email" />
          </label>
          <label className="authField">
            <span>Телефон</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" />
          </label>
          <label className="authField">
            <span>Внутренняя заметка</span>
            <textarea
              className="adminOpsTextarea"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="График, особенности работы с клиентами…"
            />
          </label>
          <div className="staffQuickActions">
            <button type="submit" className="btn btnPrimary">
              Сохранить (демо)
            </button>
            <button type="button" className="btn btnSecondary" onClick={handleResetDemo}>
              Сбросить к моку
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
