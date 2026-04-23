import { NavLink, Outlet } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { useTheme } from "../../hooks/useTheme";
import styles from "./Layout.module.css";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/about", label: "About" },
  { to: "/documents", label: "Documents" },
  { to: "/trends", label: "Health Trends" },
  { to: "/summary", label: "Summary" },
  { to: "/chat", label: "Smart Chat" },
  { to: "/medications", label: "Medications" },
  { to: "/goals", label: "Health Goals" },
];

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function Logo() {
  return (
    <div className={styles.logo}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="34" height="34" rx="10" fill="url(#logoGrad)" />
        <path
          d="M7 18.5h4.5l2.5-6 4 11 3-9 2 4H27"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="logoGrad"
            x1="0"
            y1="0"
            x2="34"
            y2="34"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.logoText}>
        <span className={styles.logoWord}>MedDoc</span>
        <span className={styles.logoAi}>AI</span>
      </div>
    </div>
  );
}

function Layout() {
  const { isDark, toggle } = useTheme();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Logo />

        <nav className={styles.nav}>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userArea}>
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
  );
}

export default Layout;
