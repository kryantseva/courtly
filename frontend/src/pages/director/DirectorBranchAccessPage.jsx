import { useCallback, useEffect, useState } from "react";
import {
  addDirectorBranchMember,
  fetchDirectorBranches,
  fetchDirectorBranchMembers,
  patchDirectorBranchMemberRole,
  removeDirectorBranchMember,
} from "../../api/director";
import { getApiToken } from "../../utils/apiAuth";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
const USE_API = import.meta.env.VITE_USE_API === "true";
const ACCESS_ROWS_MOCK = [
  { user: "Орлова М. (админ)", userId: "u-orlova", access: ["Riverside"] },
  { user: "Козлов А. (админ)", userId: "u-kozlov", access: ["Downtown"] },
  { user: "Ильин А. (тренер)", userId: "u-ilin", access: ["Downtown", "Riverside"] },
];
const ROLE_OPTIONS = [
  { value: "client", label: "Клиент" },
  { value: "trainer", label: "Тренер" },
  { value: "admin", label: "Админ филиала" },
];
function unwrap(raw) {
  if (raw && typeof raw === "object" && raw.data != null) return raw.data;
  return raw;
}
export default function DirectorBranchAccessPage() {
  const { branches } = useManagerNetwork();
  const branchNames = branches.map((b) => b.name);
  const tryApi = USE_API && Boolean(getApiToken());
  const [serverBranches, setServerBranches] = useState( ([]));
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [members, setMembers] = useState( ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [toast, setToast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busyUserId, setBusyUserId] = useState( (null));
  const loadBranches = useCallback(() => {
    if (!tryApi) return;
    fetchDirectorBranches()
      .then((raw) => {
        const d = unwrap(raw);
        const list = Array.isArray(d?.branches) ? d.branches : [];
        setServerBranches(list.map((b) => ({ id: b.id, name: b.name })));
        setSelectedBranchId((prev) => prev || (list[0] ? list[0].id : ""));
      })
      .catch(() => setServerBranches([]));
  }, [tryApi]);
  const loadMembers = useCallback(() => {
    if (!tryApi || !selectedBranchId) return;
    setLoading(true);
    setError(null);
    fetchDirectorBranchMembers(selectedBranchId)
      .then((raw) => {
        const d = unwrap(raw);
        setMembers(Array.isArray(d?.members) ? d.members : []);
      })
      .catch((e) => {
        setMembers([]);
        setError(e instanceof Error ? e.message : "Ошибка");
      })
      .finally(() => setLoading(false));
  }, [tryApi, selectedBranchId]);
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);
  async function handleAddMember(e) {
    e.preventDefault();
    if (!selectedBranchId || !newEmail.trim()) return;
    setError(null);
    setBusyUserId(-1);
    try {
      await addDirectorBranchMember(selectedBranchId, { email: newEmail.trim() });
      setNewEmail("");
      setToast("Пользователь добавлен в филиал");
      window.setTimeout(() => setToast(""), 3000);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setBusyUserId(null);
    }
  }
  async function handleRoleChange(userId, role) {
    if (!selectedBranchId) return;
    setBusyUserId(userId);
    setError(null);
    try {
      await patchDirectorBranchMemberRole(selectedBranchId, userId, { role });
      setToast("Роль обновлена (глобально для профиля пользователя)");
      window.setTimeout(() => setToast(""), 3500);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить роль");
    } finally {
      setBusyUserId(null);
    }
  }
  async function handleRemove(userId) {
    if (!selectedBranchId || !window.confirm("Отозвать доступ к этому филиалу?")) return;
    setBusyUserId(userId);
    setError(null);
    try {
      await removeDirectorBranchMember(selectedBranchId, userId);
      setToast("Доступ отозван");
      window.setTimeout(() => setToast(""), 2500);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setBusyUserId(null);
    }
  }
  return (
    <div className="clientPage">
      <h1 className="clientPageTitle">Доступ к филиалам</h1>
      <p className="clientPageLead">
        Матрица: кто видит какие объекты. На сервере доступ задаётся членством в филиале; роль профиля влияет на права в
        приложении (admin / trainer / client). Роль director назначается отдельно.
      </p>
      {branches.length > 0 ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>Филиалы в мастере (локально)</h2>
          <p className="clientPanelHint">{branchNames.join(", ") || "—"}</p>
        </section>
      ) : null}
      {tryApi ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>Управление на сервере</h2>
          {toast ? (
            <p className="adminOpsToast" role="status">
              {toast}
            </p>
          ) : null}
          {error ? (
            <p className="authError" role="alert">
              {error}
            </p>
          ) : null}
          <div className="directorKpiFiltersRow">
            <label className="authField">
              <span>Филиал</span>
              <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                <option value="">—</option>
                {serverBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedBranchId ? (
            <>
              <form className="adminOpsForm directorAccessAddForm" onSubmit={handleAddMember}>
                <h3>Пригласить по email</h3>
                <label className="authField">
                  <span>Email учётной записи Courtly</span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    autoComplete="off"
                  />
                </label>
                <button type="submit" className="btn btnPrimary" disabled={busyUserId !== null}>
                  Выдать доступ к филиалу
                </button>
              </form>
              <h3>Участники</h3>
              {loading ? <p className="clientPanelHint">Загрузка…</p> : null}
              <div className="staffTableWrap">
                <table className="staffTable">
                  <thead>
                    <tr>
                      <th>Пользователь</th>
                      <th>Роль (профиль)</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={3} className="clientPanelHint">
                          Нет участников
                        </td>
                      </tr>
                    ) : null}
                    {members.map((m) => (
                      <tr key={m.userId}>
                        <td>
                          <strong>{m.displayName || m.email}</strong>
                          <div className="clientPanelHint">{m.email}</div>
                        </td>
                        <td>
                          <select
                            className="staffTableSelect"
                            value={m.role}
                            disabled={m.role === "director" || busyUserId === m.userId}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                            title={m.role === "director" ? "Роль руководителя не меняется здесь" : ""}
                          >
                            {m.role === "director" ? <option value="director">Руководитель</option> : null}
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btnSecondary"
                            disabled={busyUserId !== null}
                            onClick={() => handleRemove(m.userId)}
                          >
                            Отозвать
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="clientPanelHint">Нет филиалов на сервере — создайте в разделе «Филиалы».</p>
          )}
        </section>
      ) : null}
      <section className="clientPanel clientPanel--schedule">
        <h2>Матрица (демо, без API)</h2>
        <div className="staffTableWrap">
          <table className="staffTable">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Филиалы с доступом</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS_ROWS_MOCK.map((row) => (
                <tr key={row.userId}>
                  <td>{row.user}</td>
                  <td>{row.access.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
