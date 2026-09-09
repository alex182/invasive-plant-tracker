import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import styles from "./TopBar.module.css";

export function TopBar({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, stopImpersonating } = useAuth();
  return (
    <>
      {user?.impersonating && (
        <div className={styles.impersonationBar}>
          <span>
            Viewing as <strong>{user.display_name}</strong> — impersonated by {user.real_admin?.display_name}
          </span>
          <button className={styles.stopButton} onClick={() => stopImpersonating()}>
            Stop impersonating
          </button>
        </div>
      )}
      <header className={styles.bar}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.actions}>
          {user?.role === "admin" && (
            <Link to="/settings" className={styles.toggle} aria-label="Settings">
              ⚙️
            </Link>
          )}
          <Link to="/account" className={styles.toggle} aria-label="Your account">
            👤
          </Link>
          <button
            className={styles.toggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className={styles.toggle} onClick={() => logout()} aria-label="Log out">
            🚪
          </button>
        </div>
      </header>
    </>
  );
}
