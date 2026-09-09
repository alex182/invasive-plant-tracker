import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AuditLogEntry, User } from "../types";
import styles from "./AuditLogPage.module.css";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.change_password": "Changed password",
  "auth.impersonate_start": "Started impersonating",
  "auth.impersonate_stop": "Stopped impersonating",
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.reset_password": "Reset a user's password",
  "plant.create": "Added plant",
  "plant.update": "Edited plant",
  "plant.delete": "Deleted plant",
  "plant.regrowth": "Logged regrowth",
  "plant.bulk_reassign": "Bulk-reassigned plants",
  "plant.bulk_copy": "Bulk-copied plants",
  "treatment.create": "Logged treatment",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.users.list().then(setUsers);
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    api.auditLog
      .list({ actor_id: actorFilter || undefined, action: actionFilter || undefined })
      .then(({ entries, next_before }) => {
        setEntries(entries);
        setNextBefore(next_before);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the audit log."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [actorFilter, actionFilter]);

  async function loadMore() {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      const { entries: more, next_before } = await api.auditLog.list({
        before: nextBefore,
        actor_id: actorFilter || undefined,
        action: actionFilter || undefined,
      });
      setEntries((prev) => [...prev, ...more]);
      setNextBefore(next_before);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load more entries.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filterRow}>
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} aria-label="Filter by user">
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.display_name}
            </option>
          ))}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} aria-label="Filter by action">
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className={styles.note}>{error}</p>}
      {loading && <p className={styles.note}>Loading…</p>}
      {!loading && entries.length === 0 && <p className={styles.note}>No activity recorded yet.</p>}

      {entries.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className={styles.time}>{formatTime(e.created_at)}</td>
                  <td>
                    <div className={styles.actor}>{e.actor_display_name ?? e.actor_username ?? "Unknown"}</div>
                    {e.impersonated_by_display_name && (
                      <div className={styles.actorMeta}>via {e.impersonated_by_display_name} impersonating</div>
                    )}
                  </td>
                  <td>
                    <span className={styles.actionBadge}>{actionLabel(e.action)}</span>
                  </td>
                  <td className={styles.detail}>{e.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextBefore && (
        <button type="button" className={styles.loadMore} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load older entries"}
        </button>
      )}
    </div>
  );
}
