import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { authApi, type DemoCredential } from "../auth/authApi";
import ThemeToggle from "../components/ThemeToggle";
import styles from "./LoginPage.module.css";

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login, status } = useAuth();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const demoCredentials = useQuery({
    queryKey: ["auth", "demo-credentials"],
    queryFn: authApi.demoCredentials,
    staleTime: Infinity,
  });

  useEffect(() => {
    setError(null);
  }, [email, password]);

  if (status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError("Invalid email or password.");
      setSubmitting(false);
    }
  };

  const fillFrom = (cred: DemoCredential) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>AM</span>
          <span className={styles.brandText}>Asset Platform</span>
        </div>
        <ThemeToggle />
      </header>

      <main className={styles.card}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Authentication is owned by the Platform Core team. Every micro-frontend
          reads your session through a runtime contract the shell installs on{" "}
          <code>window.__AMP_PLATFORM__</code>.
        </p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submit}
            disabled={submitting || !email || !password}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {demoCredentials.data && demoCredentials.data.length > 0 && (
          <section className={styles.demo}>
            <div className={styles.demoTitle}>Demo credentials</div>
            <ul className={styles.demoList}>
              {demoCredentials.data.map((cred) => (
                <li key={cred.email}>
                  <button
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => fillFrom(cred)}
                  >
                    <span className={styles.demoRole}>{cred.role}</span>
                    <span className={styles.demoEmail}>{cred.email}</span>
                    <span className={styles.demoUse}>Use →</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.demoHint}>
              Demo-only endpoint. In production the credentials list would not be
              exposed — this is here to keep the 30-min talk moving.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
