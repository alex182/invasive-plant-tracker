import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

interface Tab {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const TABS: Tab[] = [
  { to: "/", label: "Map", icon: "\u{1F5FA}️", end: true },
  { to: "/plants", label: "Plants", icon: "\u{1F4CB}" },
  { to: "/calendar", label: "Calendar", icon: "\u{1F4C5}" },
  { to: "/dashboard", label: "Stats", icon: "\u{1F4CA}" },
  { to: "/guide", label: "Guide", icon: "\u{1F4D6}" },
  { to: "/add", label: "Add", icon: "➕" },
];

/** A simplified account only gets Map (read-only) + Add — nothing else to navigate to. */
export const SIMPLIFIED_TABS: Tab[] = [
  { to: "/", label: "Map", icon: "\u{1F5FA}️", end: true },
  { to: "/add", label: "Add", icon: "➕" },
];

export function BottomNav({ tabs = TABS }: { tabs?: Tab[] }) {
  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
