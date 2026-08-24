import { useTheme } from "../context/ThemeContext";
import styles from "./TopBar.module.css";

export function TopBar({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{title}</h1>
      <button
        className={styles.toggle}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </header>
  );
}
