import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { QrLoginCredentials } from "../types";
import { LoginPage } from "./LoginPage";
import styles from "./LoginPage.module.css";

/**
 * Landing page for a scanned login QR code (see UsersPage's "Login QR code" action). Exchanges
 * the token in the URL for the fresh username/password it was minted for, fills them into the
 * normal login form, and submits it immediately — scan and go, no typing or tapping required.
 * (This goes through the same login as typing it in by hand, just automated — App.tsx redirects
 * away from this URL once it succeeds and `user` is set.) The tradeoff: browsers only offer to
 * remember a password the user actually typed or pasted themselves, so this flow — built for
 * non-technical/kid users who just need to scan and be in — won't trigger a save-password prompt.
 */
export function QrLoginPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<QrLoginCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards against redeeming the (single-use) token twice — e.g. React StrictMode's double effect
  // invocation in dev — which would otherwise burn it before it ever reaches the login form.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    api.auth
      .revealQrLoginCredentials(token)
      .then(setCredentials)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this QR code."));
  }, [token]);

  if (credentials) {
    return (
      <LoginPage initialUsername={credentials.username} initialPassword={credentials.password} autoSubmit />
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Invasive Plant Tracker</h1>
        {error ? (
          <>
            <p className={styles.subtitle}>{error}</p>
            <button className={styles.submit} type="button" onClick={() => navigate("/", { replace: true })}>
              Back to sign in
            </button>
          </>
        ) : (
          <p className={styles.subtitle}>Loading…</p>
        )}
      </div>
    </div>
  );
}
