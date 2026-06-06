import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BookingDrawer from "../components/booking/BookingDrawer";
import ClientBookingFab from "../components/booking/ClientBookingFab";
import ClientAdminChat from "../components/client/ClientAdminChat";
import ClientNotificationsBell from "../components/client/ClientNotificationsBell";
import CourtlyLogo from "../components/CourtlyLogo";
import { BookingDrawerProvider } from "../context/BookingDrawerContext";
import { clearActiveBranch, getActiveBranch } from "../utils/activeBranch";
import { loadNavOrder, reorderTabs, saveNavOrder } from "../utils/navCustomization";
const CLIENT_NAV_KEY = "courtly.client.nav.order.v1";
const CLIENT_NAV_DEFAULT = [
  { id: "home", to: "/app", label: "Главная", end: true },
  { id: "booking", to: "/app/booking", label: "Запись" },
  { id: "events", to: "/app/events", label: "События" },
  { id: "history", to: "/app/history", label: "История" },
  { id: "chat", to: "/app/chat", label: "Чаты" },
  { id: "memberships", to: "/app/memberships", label: "Абонементы" },
  { id: "trainers", to: "/app/trainers", label: "Наши тренера" },
  { id: "profile", to: "/app/profile", label: "Профиль" },
  { id: "faq", to: "/app/faq", label: "FAQ" },
];
function CustomizeTabsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 15l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export default function ClientShell() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState(() => getActiveBranch());
  const [editNavMode, setEditNavMode] = useState(false);
  const [navTabs, setNavTabs] = useState(() => loadNavOrder(CLIENT_NAV_KEY, CLIENT_NAV_DEFAULT));
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
    saveNavOrder(CLIENT_NAV_KEY, navTabs);
  }, [navTabs]);
  return (
    <div className="clientShell clientShell--client">
      <header className="clientShellHeader">
        <div className="clientShellHeaderInner">
          <Link to="/app" className="clientShellBrand" aria-label="Courtly — главная в кабинете">
            <CourtlyLogo size={32} />
            <div className="clientShellBrandText">
              <span className="clientShellBrandName">{branch.branchName}</span>
              <span className="clientShellBrandMeta">Личный кабинет · клиент</span>
            </div>
          </Link>
          <div className="clientShellHeaderActions">
            <ClientNotificationsBell />
            <button type="button" className="btn btnSecondary" onClick={handleChangeBranch}>
              Сменить филиал
            </button>
          </div>
        </div>
        <nav className="clientNav" aria-label="Разделы личного кабинета">
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
          </div>
        </nav>
      </header>
      <BookingDrawerProvider branchName={branch.branchName}>
        <main className="clientShellMain">
          <Outlet />
        </main>
        <div className="clientFloatingStack">
          <ClientAdminChat />
          <ClientBookingFab />
        </div>
        <BookingDrawer />
      </BookingDrawerProvider>
    </div>
  );
}
