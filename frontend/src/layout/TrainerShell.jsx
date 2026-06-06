import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import RoleNotificationsBell from "../components/common/RoleNotificationsBell";
import TrainerBranchChat from "../components/trainer/TrainerBranchChat";
import CourtlyLogo from "../components/CourtlyLogo";
import { clearActiveBranch, getActiveBranch } from "../utils/activeBranch";
import { loadNavOrder, reorderTabs, saveNavOrder } from "../utils/navCustomization";
const TRAINER_NAV_KEY = "courtly.trainer.nav.order.v1";
const TRAINER_NAV_DEFAULT = [
  { id: "today", to: "/trainer", label: "Сегодня", end: true },
  { id: "chat", to: "/trainer/chat", label: "Чат" },
  { id: "schedule", to: "/trainer/schedule", label: "Календарь" },
  { id: "availability", to: "/trainer/availability", label: "Доступность" },
  { id: "sessions", to: "/trainer/sessions", label: "Записи" },
  { id: "earnings", to: "/trainer/earnings", label: "Выплаты" },
  { id: "profile", to: "/trainer/profile", label: "Профиль" },
];
function CustomizeTabsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 15l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export default function TrainerShell() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState(() => getActiveBranch());
  const [editNavMode, setEditNavMode] = useState(false);
  const [navTabs, setNavTabs] = useState(() => loadNavOrder(TRAINER_NAV_KEY, TRAINER_NAV_DEFAULT));
  const [dragTabId, setDragTabId] = useState("");
  useEffect(() => {
    const b = getActiveBranch();
    if (!b?.branchName) {
      navigate("/branches", { replace: true });
      return;
    }
    setBranch(b);
  }, [navigate]);
  function handleChangeBranch() {
    clearActiveBranch();
    navigate("/branches");
  }
  if (!branch?.branchName) {
    return null;
  }
  const navClass = ({ isActive }) => `clientNavLink${isActive ? " clientNavLink--active" : ""}`;
  useEffect(() => {
    saveNavOrder(TRAINER_NAV_KEY, navTabs);
  }, [navTabs]);
  return (
    <div className="clientShell clientShell--trainer">
      <header className="clientShellHeader">
        <div className="clientShellHeaderInner">
          <Link to="/trainer" className="clientShellBrand" aria-label="Courtly — кабинет тренера">
            <CourtlyLogo size={32} />
            <div className="clientShellBrandText">
              <span className="clientShellBrandName">{branch.branchName}</span>
              <span className="clientShellBrandMeta">Кабинет тренера</span>
            </div>
          </Link>
          <div className="clientShellHeaderActions">
            <RoleNotificationsBell role="trainer" listPath="/trainer/notifications" />
            <Link to="/help" className="btn btnSecondary">
              Помощь
            </Link>
            <button type="button" className="btn btnSecondary" onClick={handleChangeBranch}>
              Сменить филиал
            </button>
          </div>
        </div>
        <nav className="clientNav" aria-label="Разделы кабинета тренера">
          <div className={`clientNavInner${editNavMode ? " adminNavInner--editMode" : ""}`}>
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
      <main className="clientShellMain staffShellMain staffShellMain--chatDock">
        <Outlet />
      </main>
      <div className="clientFloatingStack">
        <TrainerBranchChat />
      </div>
    </div>
  );
}
