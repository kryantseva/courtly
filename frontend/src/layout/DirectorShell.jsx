import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import RoleNotificationsBell from "../components/common/RoleNotificationsBell";
import CourtlyLogo from "../components/CourtlyLogo";
import DirectorTeamChat from "../components/director/DirectorTeamChat";
import TaskCenterPopover from "../components/tasks/TaskCenterPopover";
import { useManagerNetwork } from "../context/ManagerNetworkContext";
import { getAdminOnShift } from "../utils/adminOnShiftStorage";
import { loadNavOrder, reorderTabs, saveNavOrder } from "../utils/navCustomization";
const DIRECTOR_NAV_KEY = "courtly.director.nav.order.v2";
const DIRECTOR_NAV_DEFAULT = [
  { id: "calendar", to: "/director", label: "Журнал записи", end: true },
  { id: "home", to: "/director/overview", label: "Обзор" },
  { id: "branches", to: "/director/branches", label: "Филиалы" },
  { id: "chat", to: "/director/chat", label: "Чаты" },
  { id: "bookings", to: "/director/bookings", label: "Брони" },
  { id: "clients", to: "/director/clients", label: "Клиенты" },
  { id: "personnel", to: "/director/personnel", label: "Персонал" },
  { id: "access", to: "/director/access", label: "Доступ" },
  { id: "finance", to: "/director/finance", label: "Финансы" },
  { id: "analytics", to: "/director/analytics", label: "Аналитика" },
  { id: "notifications", to: "/director/notifications", label: "Уведомления" },
  { id: "reports", to: "/director/reports", label: "Отчёты" },
  { id: "organization", to: "/director/organization", label: "Организация" },
  { id: "profile", to: "/director/profile", label: "Профиль" },
];
function CustomizeTabsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 15l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export default function DirectorShell() {
  const navigate = useNavigate();
  const {
    networkName,
    subscriptionActive,
    subscriptionPlan,
    branches,
    activeBranchContextId,
    setActiveBranchContextId,
  } = useManagerNetwork();
  const navClass = ({ isActive }) => `clientNavLink${isActive ? " clientNavLink--active" : ""}`;
  const [editNavMode, setEditNavMode] = useState(false);
  const [navTabs, setNavTabs] = useState(() => loadNavOrder(DIRECTOR_NAV_KEY, DIRECTOR_NAV_DEFAULT));
  const [dragTabId, setDragTabId] = useState("");
  const shiftAdmin = getAdminOnShift();
  const branchAdminOptions = branches.flatMap((b) =>
    (Array.isArray(b.admins) ? b.admins : []).map((a, idx) => ({
      key: `branch-${b.id}-${idx}`,
      role: "admin",
      id: a.userId || a.email || `${b.id}-${idx}`,
      label: `${a.userId || a.email || "Администратор"} · ${b.name}`,
    })),
  );
  const directorAssignees = [
    { key: "director-self", role: "director", id: "director-self", label: "Себе (руководитель)" },
    shiftAdmin
      ? {
          key: "admin-on-shift",
          role: "admin",
          id: shiftAdmin.id,
          label: `Админ на смене · ${shiftAdmin.fullName}`,
        }
      : { key: "admin-on-shift", role: "admin", id: "admin-on-shift", label: "Администратор на смене" },
    ...branchAdminOptions,
  ];
  useEffect(() => {
    saveNavOrder(DIRECTOR_NAV_KEY, navTabs);
  }, [navTabs]);
  return (
    <div className="clientShell clientShell--director">
      <header className="clientShellHeader">
        <div className="clientShellHeaderInner">
          <Link to="/director" className="clientShellBrand" aria-label="Courtly — кабинет руководителя сети">
            <CourtlyLogo size={32} />
            <div className="clientShellBrandText">
              <span className="clientShellBrandName">{networkName}</span>
              <span className="clientShellBrandMeta">
                Кабинет руководителя · {subscriptionActive ? subscriptionPlan : "требуется подписка"}
              </span>
            </div>
          </Link>
          <div className="clientShellHeaderActions directorHeaderTools">
            <label className="directorBranchSelectLabel">
              <span className="visuallyHidden">Контекст филиала</span>
              <select
                className="directorBranchSelect"
                value={activeBranchContextId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setActiveBranchContextId(v === "" ? null : v);
                }}
                aria-label="Филиал для фильтрации дашборда"
              >
                <option value="">Вся сеть</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btnSecondary" onClick={() => navigate("/director/select")}>
              Выбор филиала
            </button>
            {subscriptionActive ? (
              <span className="directorHeaderBadge" title="В продукте — после оплаты подписки Courtly Manager">
                Подписка активна
              </span>
            ) : (
              <span className="directorHeaderBadge directorHeaderBadge--muted">Нет подписки</span>
            )}
            <TaskCenterPopover role="director" directorAssignees={directorAssignees} />
            <RoleNotificationsBell role="director" listPath="/director/notifications" />
            <Link to="/help" className="btn btnSecondary">
              Помощь
            </Link>
            <button type="button" className="btn btnSecondary" onClick={() => navigate("/login")}>
              Сменить аккаунт
            </button>
          </div>
        </div>
        <nav className="clientNav directorNav" aria-label="Разделы кабинета руководителя">
          <div className={`clientNavInner directorNavInner${editNavMode ? " adminNavInner--editMode" : ""}`}>
            {navTabs.map((tab) => (
              <div
                key={tab.id}
                className={editNavMode ? "adminNavTabWrap--draggable" : ""}
                draggable={editNavMode}
                onDragStart={() => setDragTabId(tab.id)}
                onDragOver={(e) => {
                  if (!editNavMode) return;
                  e.preventDefault();
                }}
                onDrop={() => {
                  if (!editNavMode) return;
                  setNavTabs((prev) => reorderTabs(prev, dragTabId, tab.id));
                  setDragTabId("");
                }}
              >
                <NavLink to={tab.to} end={tab.end} className={navClass}>
                  {tab.label}
                </NavLink>
              </div>
            ))}
            <div className="navCustomizeControls">
              <button
                type="button"
                className={`adminNavCustomizeBtn${editNavMode ? " adminNavCustomizeBtn--active" : ""}`}
                onClick={() => setEditNavMode((v) => !v)}
                aria-label={editNavMode ? "Завершить настройку вкладок" : "Настройка вкладок"}
              >
                <CustomizeTabsIcon />
              </button>
            </div>
            <NavLink to="/login" className={`${navClass({ isActive: false })} navCustomizeLogoutLink`}>
              Выйти
            </NavLink>
          </div>
        </nav>
      </header>
      <main className="clientShellMain staffShellMain directorShellMain">
        <Outlet />
      </main>
      <div className="clientFloatingStack">
        <DirectorTeamChat />
      </div>
    </div>
  );
}
