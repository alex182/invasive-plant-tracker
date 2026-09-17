import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";

export function LoginPage({
  initialUsername = "",
  initialPassword = "",
  autoSubmit = false,
  subtitle,
}: {
  /** Pre-fills the fields — used by the QR login flow so scanning a code lands here filled in. */
  initialUsername?: string;
  initialPassword?: string;
  /** Submits immediately on mount once both initial values are set — a true "scan and go" for
   * kids/non-technical users, at the cost of the browser's own save-password prompt (it only
   * offers to remember a password the user actually typed or pasted in, not one filled by JS). */
  autoSubmit?: boolean;
  subtitle?: string;
} = {}) {
  const { login } = useAuth();
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against submitting twice — e.g. React StrictMode's double effect invocation in dev.
  const autoSubmitted = useRef(false);

  async function doLogin(u: string, p: string) {
    setSubmitting(true);
    setError(null);
    try {
      await login(u, p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!autoSubmit || autoSubmitted.current || !initialUsername || !initialPassword) return;
    autoSubmitted.current = true;
    doLogin(initialUsername, initialPassword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin(username, password);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Invasive Plant Tracker</h1>
        <p className={styles.subtitle}>{subtitle ?? "Sign in with the account your admin created for you."}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
