import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import styles from "./TopBar.module.css";

export function TopBar({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        <Link to="/settings" className={styles.toggle} aria-label="Settings">
          ⚙️
        </Link>
        <button
          className={styles.toggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
