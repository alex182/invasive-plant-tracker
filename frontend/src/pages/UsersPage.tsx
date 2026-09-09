import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Role, User } from "../types";
import styles from "./UsersPage.module.css";

function randomPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function UsersPage() {
  const { user: currentUser, impersonate } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [password, setPassword] = useState(randomPassword());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  const [rowMessage, setRowMessage] = useState<{ id: string; text: string } | null>(null);

  function loadUsers() {
    return api.users.list().then(setUsers);
  }

  useEffect(() => {
    loadUsers().finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreatedMessage(null);
    try {
      const created = await api.users.create({ username, password, role, display_name: displayName });
      setUsers((prev) => [...prev, created]);
      setCreatedMessage(`Created "${created.username}" — give them this temporary password: ${password}`);
      setUsername("");
      setDisplayName("");
      setRole("user");
      setPassword(randomPassword());
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Couldn't create the user.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(user: User, newRole: Role) {
    const updated = await api.users.update(user.id, { role: newRole });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
  }

  async function handleToggleActive(user: User) {
    const updated = await api.users.update(user.id, { active: !user.active });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
  }

  async function handleResetPassword(user: User) {
    const newPassword = randomPassword();
    if (!confirm(`Reset the password for "${user.username}"? Their current session will be signed out.`)) return;
    await api.users.resetPassword(user.id, newPassword);
    setRowMessage({ id: user.id, text: `New temporary password: ${newPassword}` });
  }

  async function handleImpersonate(user: User) {
    setImpersonating(user.id);
    setImpersonateError(null);
    try {
      await impersonate(user.id);
      // The app now sees this user's role — if they're not an admin, App.tsx
      // routes away from here automatically once the auth state updates.
    } catch (err) {
      setImpersonateError(err instanceof Error ? err.message : "Couldn't impersonate that user.");
    } finally {
      setImpersonating(null);
    }
  }

  if (loading) return <div className={styles.wrap}>Loading…</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.section}>
        <h2>New user</h2>
        <p className={styles.note}>
          Set a temporary password and share it with them directly — there's no email invite. They can't reset
          it themselves; come back here if they need a new one.
        </p>
        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="password">Temporary password</label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>
          {createError && <div className={styles.error}>{createError}</div>}
          {createdMessage && <div className={styles.success}>{createdMessage}</div>}
          <div className={styles.buttonRow}>
            <button type="submit" className={styles.primaryButton} disabled={creating}>
              {creating ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <h2>All users</h2>
        <p className={styles.note}>
          Impersonate a user to see the app exactly as they do. You'll act as them everywhere — including losing
          admin access if they're not one — until you stop impersonating from the banner at the top of the app.
        </p>
        {impersonateError && <div className={styles.error}>{impersonateError}</div>}
        <div className={styles.list}>
          {users.map((u) => (
            <div key={u.id} className={styles.userRow}>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {u.display_name}
                  {!u.active && <span className={styles.inactiveBadge}>Deactivated</span>}
                </div>
                <div className={styles.userMeta}>@{u.username}</div>
                {rowMessage?.id === u.id && <div className={styles.success}>{rowMessage.text}</div>}
              </div>
              <select value={u.role} onChange={(e) => handleRoleChange(u, e.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {u.id !== currentUser?.id && u.active && (
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => handleImpersonate(u)}
                  disabled={impersonating === u.id}
                >
                  {impersonating === u.id ? "Switching…" : "Impersonate"}
                </button>
              )}
              <button type="button" className={styles.smallButton} onClick={() => handleResetPassword(u)}>
                Reset password
              </button>
              <button type="button" className={styles.smallButton} onClick={() => handleToggleActive(u)}>
                {u.active ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
