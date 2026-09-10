import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./SettingsPage.module.css";

export function AccountPage() {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.section}>
        <h2>Account</h2>
        <p className={styles.note}>
          Signed in as <strong>{user.display_name}</strong> (@{user.username}) · {user.role}
        </p>
        <p className={styles.note}>
          Organization:{" "}
          {user.org_name ? <strong>{user.org_name}</strong> : "not part of an organization"}
        </p>
      </div>

      <div className={styles.section}>
        <h2>Change password</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <div className={styles.buttonRow}>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
