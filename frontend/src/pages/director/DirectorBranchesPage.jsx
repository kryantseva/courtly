import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { createDirectorBranch, deleteDirectorBranch, fetchDirectorBranches } from "../../api/director";
import { getApiToken } from "../../utils/apiAuth";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
const USE_API = import.meta.env.VITE_USE_API === "true";
function unwrap(raw) {
  if (raw && typeof raw === "object" && raw.data != null) return raw.data;
  return raw;
}
export default function DirectorBranchesPage() {
  const { branches, networkName } = useManagerNetwork();
  const tryApi = USE_API && Boolean(getApiToken());
  const [serverBranches, setServerBranches] = useState( ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState( (null));
  const [newName, setNewName] = useState("");
  const [newHint, setNewHint] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const reloadServer = useCallback(() => {
    if (!tryApi) return;
    setLoading(true);
    setError(null);
    fetchDirectorBranches()
      .then((raw) => {
        const d = unwrap(raw);
        setServerBranches(Array.isArray(d?.branches) ? d.branches : []);
      })
      .catch((e) => {
        setServerBranches([]);
        setError(e instanceof Error ? e.message : "Не удалось загрузить филиалы");
      })
      .finally(() => setLoading(false));
  }, [tryApi]);
  useEffect(() => {
    reloadServer();
  }, [reloadServer]);
  async function handleCreateServerBranch(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreatePending(true);
    setError(null);
    try {
      await createDirectorBranch({ name: newName.trim(), hint: newHint.trim() || undefined });
      setNewName("");
      setNewHint("");
      reloadServer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
    } finally {
      setCreatePending(false);
    }
  }
  async function handleDeleteServerBranch(id, name) {
    if (!window.confirm(`Удалить филиал «${name}» на сервере? Только если нет броней.`)) return;
    setError(null);
    try {
      await deleteDirectorBranch(id);
      reloadServer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }
  return (
    <div className="clientPage">
      <div className="directorWizardHead">
        <div>
          <h1 className="clientPageTitle">Филиалы сети</h1>
          <p className="clientPageLead">
            Сеть «{networkName}»: мастер настройки (локально) и серверные филиалы для API (роль director).
          </p>
        </div>
        <Link to="/director/branches/new" className="btn btnPrimary">
          Мастер: новый филиал
        </Link>
      </div>
      {tryApi ? (
        <section className="clientPanel clientPanel--schedule">
          <h2>Филиалы на сервере</h2>
          <p className="clientPanelHint">
            Создание через API добавляет филиал, зал по умолчанию и ваш доступ. Код подключения можно скопировать в
            карточке (редактирование кода — позже в отдельной форме).
          </p>
          {error ? (
            <p className="authError" role="alert">
              {error}
            </p>
          ) : null}
          <form className="adminOpsForm directorBranchServerCreate" onSubmit={handleCreateServerBranch}>
            <div className="adminOpsFormRow">
              <label className="authField">
                <span>Название</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="Courtly North" />
              </label>
              <label className="authField">
                <span>Подсказка (необяз.)</span>
                <input value={newHint} onChange={(e) => setNewHint(e.target.value)} placeholder="У метро" />
              </label>
            </div>
            <button type="submit" className="btn btnPrimary" disabled={createPending}>
              {createPending ? "Создание…" : "Создать на сервере"}
            </button>
          </form>
          {loading ? <p className="clientPanelHint">Загрузка списка…</p> : null}
          <ul className="clientList">
            {serverBranches.map((b) => (
              <li key={b.id} className="clientListItem">
                <div>
                  <span className="clientListTitle">{b.name}</span>
                  <span className="clientListMeta">
                    id: {b.id} · залов: {b.roomsCount ?? "—"} · код: {b.connectionCode || "—"}
                  </span>
                </div>
                <div className="staffQuickActions">
                  <button type="button" className="btn btnSecondary" onClick={() => handleDeleteServerBranch(b.id, b.name)}>
                    Удалить (без броней)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="clientPanel directorPanel--hint">
          <p className="clientPanelHint">Включите VITE_USE_API и войдите — появится создание филиалов на сервере.</p>
        </section>
      )}
      {branches.length === 0 ? (
        <section className="directorPanel directorPanel--hint">
          <h2>Пока нет филиалов в мастере</h2>
          <p className="clientPanelHint">
            Локальный мастер и сервер независимы: можно начать с сервера выше или с мастера ниже.
          </p>
          <Link to="/director/branches/new" className="btn btnPrimary">
            Настроить первый филиал (мастер)
          </Link>
        </section>
      ) : (
        <section className="clientPanel clientPanel--schedule">
          <h2>Мастер (локально)</h2>
          <ul className="clientList">
            {branches.map((b) => (
              <li key={b.id} className="clientListItem">
                <div>
                  <span className="clientListTitle">{b.name}</span>
                  <span className="clientListMeta">
                    {b.city}, {b.address || "адрес уточняется"} · {b.rooms.length} помещ. · параллельных броней до{" "}
                    {b.maxConcurrentBookingsPerRoom}
                  </span>
                </div>
                <Link to={`/director/branches/${b.id}`} className="btn btnSecondary">
                  Редактировать
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
