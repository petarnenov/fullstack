import { useAuthenticatedUser } from "../auth/AuthContext";
import TeamBadge from "../components/TeamBadge";
import { useTheme, type ThemeMode } from "../theme/ThemeContext";
import styles from "./SettingsPage.module.css";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function SettingsPage() {
  const user = useAuthenticatedUser();
  const { mode, resolved, setMode } = useTheme();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform settings</h1>
          <p className={styles.subtitle}>
            Shell-owned page. No MFE is loaded here.
          </p>
        </div>
        <TeamBadge team="shell" />
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Appearance</h2>
        <p className={styles.cardHint}>
          The shell owns the theme. It writes <code>data-theme</code> on{" "}
          <code>&lt;html&gt;</code>; every MFE reads the same CSS variables.
        </p>
        <div className={styles.segmented} role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              className={`${styles.segment} ${mode === option.value ? styles.segmentActive : ""}`}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={styles.cardMeta}>
          Active: <strong>{resolved}</strong>
          {mode === "system" && " (follows OS)"}
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Signed-in user</h2>
        <dl className={styles.dl}>
          <dt>Name</dt>
          <dd>{user.fullName}</dd>
          <dt>Role</dt>
          <dd>{user.role}</dd>
          <dt>Tenant</dt>
          <dd>{user.tenantId}</dd>
          <dt>User ID</dt>
          <dd>
            <code>{user.id}</code>
          </dd>
        </dl>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Federated remotes</h2>
        <ul className={styles.remoteList}>
          <li>
            <code>mfe_billing</code> →{" "}
            <code>http://localhost:5175/assets/remoteEntry.js</code>
            <TeamBadge team="billing" />
          </li>
          <li>
            <code>mfe_open_account</code> →{" "}
            <code>http://localhost:5174/assets/remoteEntry.js</code>
            <TeamBadge team="accounts" />
          </li>
          <li>
            <code>mfe_trading</code> →{" "}
            <code>http://localhost:5176/assets/remoteEntry.js</code>
            <TeamBadge team="trading" />
          </li>
        </ul>
        <p className={styles.note}>
          Configured in <code>platform-shell/vite.config.ts</code>. Each remote
          is owned and deployed independently by its team.
        </p>
      </section>
    </div>
  );
}
