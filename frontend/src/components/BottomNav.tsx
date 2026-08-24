import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

const TABS = [
  { to: "/", label: "Map", icon: "\u{1F5FA}️", end: true },
  { to: "/calendar", label: "Calendar", icon: "\u{1F4C5}" },
  { to: "/guide", label: "Guide", icon: "\u{1F4D6}" },
  { to: "/add", label: "Add", icon: "➕" },
];

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
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
