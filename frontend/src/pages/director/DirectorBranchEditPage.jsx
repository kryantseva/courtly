import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BranchPricingEditor from "../../components/director/BranchPricingEditor";
import { useManagerNetwork } from "../../context/ManagerNetworkContext";
import { generateBranchConnectionCode } from "../../utils/branchConnectionCode";
export default function DirectorBranchEditPage() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { branches, updateBranch, removeBranch } = useManagerNetwork();
  const branch = useMemo(() => branches.find((b) => b.id === branchId), [branches, branchId]);
  const [tab, setTab] = useState( ("main"));
  if (!branch) {
    return (
      <div className="clientPage">
        <h1 className="clientPageTitle">Филиал не найден</h1>
        <p className="clientPageLead">Возможно, он был удалён или ссылка устарела.</p>
        <Link to="/director/branches" className="btn btnPrimary">
          К филиалам
        </Link>
      </div>
    );
  }
  function patch(p) {
    updateBranch(branch.id, p);
  }
  function handleDelete() {
    if (!window.confirm(`Удалить филиал «${branch.name}» из сети? Это действие демонстрационное.`)) return;
    removeBranch(branch.id);
    navigate("/director/branches");
  }
  return (
    <div className="clientPage">
      <div className="directorWizardHead">
        <div>
          <h1 className="clientPageTitle">{branch.name}</h1>
          <p className="clientPageLead">
            Полная настройка филиала: помещения, роли, администраторы, правила брони и тарифы. Каждый объект сети может
            иметь свои особенности — изменения сохраняются локально в браузере до подключения API.
          </p>
        </div>
        <div className="staffQuickActions">
          <Link to="/director/branches" className="btn btnSecondary">
            Все филиалы
          </Link>
          <button type="button" className="btn btnSecondary" onClick={handleDelete}>
            Удалить филиал
          </button>
        </div>
      </div>
      <div className="directorTabs" role="tablist" aria-label="Разделы настройки филиала">
        {[
          { id: "main", label: "Основное" },
          { id: "rooms", label: "Помещения" },
          { id: "roles", label: "Роли" },
          { id: "admins", label: "Администраторы" },
          { id: "rules", label: "Правила и тарифы" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`directorTab${tab === t.id ? " directorTab--active" : ""}`}
            onClick={() => setTab( (t.id))}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="directorWizardCard">
        {tab === "main" ? (
          <div className="directorWizardFields">
            <label className="authField">
              <span>Название</span>
              <input value={branch.name} onChange={(e) => patch({ name: e.target.value })} />
            </label>
            <label className="authField">
              <span>Город</span>
              <input value={branch.city} onChange={(e) => patch({ city: e.target.value })} />
            </label>
            <label className="authField">
              <span>Адрес</span>
              <input value={branch.address} onChange={(e) => patch({ address: e.target.value })} />
            </label>
            <label className="authField">
              <span>Телефон</span>
              <input value={branch.phone} onChange={(e) => patch({ phone: e.target.value })} type="tel" />
            </label>
            <label className="authField">
              <span>Email</span>
              <input value={branch.email} onChange={(e) => patch({ email: e.target.value })} type="email" />
            </label>
            <label className="authField">
              <span>Часы (будни)</span>
              <input value={branch.workHoursWeekday} onChange={(e) => patch({ workHoursWeekday: e.target.value })} />
            </label>
            <label className="authField">
              <span>Часы (выходные)</span>
              <input value={branch.workHoursWeekend} onChange={(e) => patch({ workHoursWeekend: e.target.value })} />
            </label>
            <div className="branchCodeIssuePanel">
              <h3 className="branchCodeIssueTitle">Код подключения филиала</h3>
              <p className="clientPanelHint">
                Выдайте этот код администратору филиала или тренерам для входа в приложение. После API — ротация на
                сервере и журнал выдачи.
              </p>
              <div className="branchCodeIssueRow">
                <code className="branchCodeIssueValue" title="Текущий код">
                  {branch.connectionCode || "—"}
                </code>
                <div className="staffQuickActions branchCodeIssueActions">
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() => {
                      const code = branch.connectionCode?.trim();
                      if (!code) return;
                      void navigator.clipboard?.writeText(code);
                    }}
                  >
                    Копировать
                  </button>
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={() => {
                      if (!window.confirm("Сгенерировать новый код? Старый перестанет работать в демо.")) return;
                      patch({ connectionCode: generateBranchConnectionCode() });
                    }}
                  >
                    Новый код
                  </button>
                </div>
              </div>
            </div>
            <label className="authField">
              <span>Редактировать код вручную</span>
              <input value={branch.connectionCode} onChange={(e) => patch({ connectionCode: e.target.value })} />
            </label>
            <p className="clientPanelHint">Создан: {new Date(branch.createdAt).toLocaleString("ru-RU")}</p>
          </div>
        ) : null}
        {tab === "rooms" ? (
          <div className="directorWizardFields">
            {branch.rooms.map((room) => (
              <div key={room.id} className="directorRoomCard">
                <label className="authField">
                  <span>Помещение</span>
                  <input
                    value={room.name}
                    onChange={(e) =>
                      patch({ rooms: branch.rooms.map((r) => (r.id === room.id ? { ...r, name: e.target.value } : r)) })
                    }
                  />
                </label>
                <label className="authField">
                  <span>Режим</span>
                  <select
                    value={room.capacityMode}
                    onChange={(e) =>
                      patch({
                        rooms: branch.rooms.map((r) =>
                          r.id === room.id ? { ...r, capacityMode:  (e.target.value) } : r,
                        ),
                      })
                    }
                  >
                    <option value="solo">Индивидуально</option>
                    <option value="group">Группа</option>
                    <option value="both">Оба варианта</option>
                  </select>
                </label>
                <div className="directorRoomCardRow directorRoomCardRow--split">
                  <label className="authField">
                    <span>Макс. (индив.)</span>
                    <input
                      type="number"
                      min={1}
                      value={room.maxSolo}
                      onChange={(e) =>
                        patch({
                          rooms: branch.rooms.map((r) =>
                            r.id === room.id ? { ...r, maxSolo: Number(e.target.value) || 1 } : r,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="authField">
                    <span>Макс. (группа)</span>
                    <input
                      type="number"
                      min={1}
                      value={room.maxGroup}
                      onChange={(e) =>
                        patch({
                          rooms: branch.rooms.map((r) =>
                            r.id === room.id ? { ...r, maxGroup: Number(e.target.value) || 1 } : r,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btnSecondary"
              onClick={() =>
                patch({
                  rooms: [
                    ...branch.rooms,
                    {
                      id: `room-${Date.now()}`,
                      name: `Зал ${branch.rooms.length + 1}`,
                      capacityMode: "group",
                      maxSolo: 1,
                      maxGroup: 10,
                    },
                  ],
                })
              }
            >
              + Помещение
            </button>
          </div>
        ) : null}
        {tab === "roles" ? (
          <div className="directorWizardFields">
            <label className="authCheck directorWizardCheck">
              <input
                type="checkbox"
                checked={branch.rolesPersonalTrainers}
                onChange={(e) => patch({ rolesPersonalTrainers: e.target.checked })}
              />
              <span>Персональные тренеры</span>
            </label>
            <label className="authCheck directorWizardCheck">
              <input
                type="checkbox"
                checked={branch.rolesGroupCoaches}
                onChange={(e) => patch({ rolesGroupCoaches: e.target.checked })}
              />
              <span>Групповые тренеры</span>
            </label>
            <label className="authCheck directorWizardCheck">
              <input
                type="checkbox"
                checked={branch.rolesHallAdmin}
                onChange={(e) => patch({ rolesHallAdmin: e.target.checked })}
              />
              <span>Администратор зала / смены</span>
            </label>
          </div>
        ) : null}
        {tab === "admins" ? (
          <div className="directorWizardFields">
            {branch.admins.map((a) => (
              <div key={a.id} className="directorAdminCard">
                <p className="clientPanelHint">
                  {a.mode === "existing" ? `Пользователь: ${a.userId || "—"}` : `Email: ${a.email}`}
                </p>
                {a.note ? <p className="directorAdminNote">{a.note}</p> : null}
              </div>
            ))}
            <p className="clientPanelHint">Расширенное редактирование списка администраторов — в мастере создания или после API.</p>
            <Link to="/director/branches/new" className="btn btnSecondary">
              Создать ещё филиал
            </Link>
          </div>
        ) : null}
        {tab === "rules" ? (
          <div className="directorWizardFields">
            <label className="authCheck directorWizardCheck">
              <input
                type="checkbox"
                checked={branch.allowConcurrentInRoom}
                onChange={(e) => patch({ allowConcurrentInRoom: e.target.checked })}
              />
              <span>Разрешить параллельные записи в помещении</span>
            </label>
            <label className="authField">
              <span>Лимит одновременных броней</span>
              <input
                type="number"
                min={1}
                value={branch.maxConcurrentBookingsPerRoom}
                onChange={(e) => patch({ maxConcurrentBookingsPerRoom: Number(e.target.value) || 1 })}
              />
            </label>
            <BranchPricingEditor
              membershipProducts={branch.membershipProducts}
              pricingMatrix={branch.pricingMatrix}
              pricingSummary={branch.pricingSummary}
              onChange={(next) =>
                patch({
                  membershipProducts: next.membershipProducts,
                  pricingMatrix: next.pricingMatrix,
                  pricingSummary: next.pricingSummary,
                })
              }
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
