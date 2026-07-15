import { NavLink, Outlet, useLocation } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { useTheme } from "../../hooks/useTheme";
import { useState, useEffect } from "react";
import CommandPalette from "../CommandPalette/CommandPalette";
import styles from "./Layout.module.css";

const NAV = [
  {
    to: "/dashboard", label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: "/about", label: "About",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    to: "/documents", label: "Documents",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    to: "/trends", label: "Health Trends",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: "/timeline", label: "Timeline",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
      </svg>
    ),
  },
  {
    to: "/summary", label: "Summary",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    to: "/chat", label: "Smart Chat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    to: "/medications", label: "Medications",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
      </svg>
    ),
  },
  {
    to: "/goals", label: "Health Goals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    to: "/compare", label: "Compare Reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="2" y="3" width="8" height="18" rx="1" /><rect x="14" y="3" width="8" height="18" rx="1" />
        <line x1="10" y1="8" x2="14" y2="8" /><line x1="10" y1="12" x2="14" y2="12" /><line x1="10" y1="16" x2="14" y2="16" />
      </svg>
    ),
  },
];

// Sidebar sections — order + grouping of NAV items by route
const GROUPS = [
  { label: "Overview",    items: ["/dashboard", "/timeline", "/about"] },
  { label: "Health data", items: ["/documents", "/trends", "/summary"] },
  { label: "Tools",       items: ["/chat", "/medications", "/goals", "/compare"] },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function Logo({ collapsed }) {
  return (
    <div className={`${styles.logo} ${collapsed ? styles.logoCollapsed : ""}`}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <rect width="34" height="34" rx="10" fill="url(#logoGrad)" />
        <path d="M7 18.5h4.5l2.5-6 4 11 3-9 2 4H27" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      {!collapsed && (
        <div className={styles.logoText}>
          <span className={styles.logoWord}>MedDoc</span>
          <span className={styles.logoAi}>AI</span>
        </div>
      )}
    </div>
  );
}

function Layout() {
  const { isDark, toggle } = useTheme();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  function toggleCollapse() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar-collapsed", String(!v));
      return !v;
    });
  }

  return (
    <div className={styles.wrapper}>
      <CommandPalette />
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          {collapsed ? (
            <button
              className={styles.collapseBtnCenter}
              onClick={toggleCollapse}
              title="Expand sidebar"
            >
              <ChevronRightIcon />
            </button>
          ) : (
            <>
              <Logo collapsed={false} />
              <button
                className={styles.collapseBtn}
                onClick={toggleCollapse}
                title="Collapse sidebar"
              >
                <ChevronLeftIcon />
              </button>
            </>
          )}
        </div>

        {/* Search / command palette affordance */}
        <button
          className={`${styles.searchBtn} ${collapsed ? styles.searchBtnCollapsed : ""}`}
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
          }
          title="Search (Ctrl+K)"
        >
          <SearchIcon />
          {!collapsed && (
            <>
              <span className={styles.searchLabel}>Search…</span>
              <kbd className={styles.searchKbd}>Ctrl K</kbd>
            </>
          )}
        </button>

        <nav className={styles.nav}>
          {GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              {!collapsed && <span className={styles.navGroupLabel}>{group.label}</span>}
              {group.items.map((to) => {
                const item = NAV.find((n) => n.to === to);
                if (!item) return null;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `${styles.navLink} ${collapsed ? styles.navLinkCollapsed : ""} ${isActive ? styles.active : ""}`
                    }
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={`${styles.sidebarFooter} ${collapsed ? styles.sidebarFooterCollapsed : ""}`}>
          <button
            className={`${styles.themeToggle} ${collapsed ? styles.themeToggleCollapsed : ""}`}
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            {!collapsed && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
          </button>
          <div className={`${styles.userRow} ${collapsed ? styles.userRowCollapsed : ""}`}>
            <UserButton afterSignOutUrl="/" />
            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.fullName || user?.firstName || "Account"}</span>
                <span className={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Main area */}
      <div className={styles.mainArea}>
        {/* Mobile top bar */}
        <header className={styles.topBar}>
          <button
            className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ""}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <span /><span /><span />
          </button>
          <Logo collapsed={false} />
          <div className={styles.topBarRight}>
            <button
              className={styles.themeToggle}
              onClick={toggle}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
