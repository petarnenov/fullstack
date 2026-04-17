import { useTheme } from "../theme/ThemeContext";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className={styles.icon} aria-hidden>
        {isDark ? (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        )}
      </span>
      <span className={styles.label}>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
