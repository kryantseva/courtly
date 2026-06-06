import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminBranchChat from "../components/admin/AdminBranchChat";
import AdminHeaderShiftControls from "../components/admin/AdminHeaderShiftControls";
import RoleNotificationsBell from "../components/common/RoleNotificationsBell";
import TaskCenterPopover from "../components/tasks/TaskCenterPopover";
import CourtlyLogo from "../components/CourtlyLogo";
import AdminShiftCheckPrompt from "../components/admin/AdminShiftCheckPrompt";
import { clearActiveBranch, getActiveBranch } from "../utils/activeBranch";
import { loadNavOrder, reorderTabs, saveNavOrder } from "../utils/navCustomization";
const ADMIN_NAV_ORDER_KEY = "courtly.admin.nav.order.v2";
const ADMIN_NAV_DEFAULT = [
  { id: "schedule", to: "/admin", label: "Журнал записи", end: true },
  { id: "overview", to: "/admin/overview", label: "Обзор" },
  { id: "chat", to: "/admin/chat", label: "Чат" },
  { id: "slots", to: "/admin/slots", label: "Слоты" },
  { id: "events", to: "/admin/events", label: "События" },
  { id: "bookings", to: "/admin/bookings", label: "Брони" },
  { id: "clients", to: "/admin/clients", label: "Клиенты" },
  { id: "staff", to: "/admin/staff", label: "Команда" },
  { id: "rooms", to: "/admin/rooms", label: "Залы" },
  { id: "payments", to: "/admin/payments", label: "Оплаты" },
  { id: "notifications", to: "/admin/notifications", label: "Уведомления" },
  { id: "reports", to: "/admin/reports", label: "Отчёты" },
  { id: "settings", to: "/admin/settings", label: "Настройки" },
];
function CustomizeTabsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 15l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export default function AdminShell() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState(() => getActiveBranch());
  const [editNavMode, setEditNavMode] = useState(false);
  const [navTabs, setNavTabs] = useState(() => loadNavOrder(ADMIN_NAV_ORDER_KEY, ADMIN_NAV_DEFAULT));
  const [dragTabId, setDragTabId] = useState("");
  const [showCustomizeHint, setShowCustomizeHint] = useState(false);
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
    saveNavOrder(ADMIN_NAV_ORDER_KEY, navTabs);
  }, [navTabs]);
  function moveTab(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setNavTabs((prev) => reorderTabs(prev, sourceId, targetId));
  }
  return (
    <div className="clientShell clientShell--admin">
      <header className="clientShellHeader">
        <div className="clientShellHeaderInner">
          <Link to="/admin" className="clientShellBrand" aria-label="Courtly — панель филиала">
            <CourtlyLogo size={32} />
            <div className="clientShellBrandText">
              <span className="clientShellBrandName">{branch.branchName}</span>
              <span className="clientShellBrandMeta">Администрирование филиала</span>
            </div>
          </Link>
          <div className="clientShellHeaderActions adminShellHeaderActions">
            <AdminHeaderShiftControls />
            <TaskCenterPopover role="admin" />
            <RoleNotificationsBell role="admin" listPath="/admin/notifications" />
            <Link to="/help" className="btn btnSecondary">
              Помощь
            </Link>
            <button type="button" className="btn btnSecondary" onClick={handleChangeBranch}>
              Сменить филиал
            </button>
          </div>
        </div>
        <nav className="clientNav adminNav" aria-label="Разделы администратора">
          <div className={`clientNavInner adminNavInner${editNavMode ? " adminNavInner--editMode" : ""}`}>
            {navTabs.map((tab) => (
              <div
                key={tab.id}
                className={`adminNavTabWrap${editNavMode ? " adminNavTabWrap--draggable" : ""}`}
                draggable={editNavMode}
                onDragStart={() => setDragTabId(tab.id)}
                onDragOver={(e) => {
                  if (!editNavMode) return;
                  e.preventDefault();
                }}
                onDrop={() => {
                  if (!editNavMode) return;
                  moveTab(dragTabId, tab.id);
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
                onClick={() => {
                  setEditNavMode((v) => {
                    const next = !v;
                    if (next) setShowCustomizeHint(true);
                    return next;
                  });
                }}
                title="Режим настройки вкладок"
                aria-label={editNavMode ? "Завершить настройку вкладок" : "Настройка вкладок"}
              >
                <CustomizeTabsIcon />
              </button>
              {showCustomizeHint && editNavMode ? (
                <div className="adminNavCustomizeHint" role="note">
                  <span>Теперь можно перемещать вкладки мышью.</span>
                  <button
                    type="button"
                    className="adminNavCustomizeHintClose"
                    onClick={() => setShowCustomizeHint(false)}
                    aria-label="Закрыть подсказку"
                  >
                    ×
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </nav>
      </header>
      <main className="clientShellMain staffShellMain staffShellMain--chatDock">
        <Outlet />
      </main>
      <div className="clientFloatingStack">
        <AdminBranchChat />
      </div>
      <AdminShiftCheckPrompt />
    </div>
  );
}
