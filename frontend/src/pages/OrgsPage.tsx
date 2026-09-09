import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Organization, User } from "../types";
import styles from "./OrgsPage.module.css";

export function OrgsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addChoice, setAddChoice] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    return Promise.all([api.organizations.list(), api.users.list()]).then(([o, u]) => {
      setOrgs(o);
      setUsers(u);
    });
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load organizations."))
      .finally(() => setLoading(false));
  }, []);

  async function run<T>(key: string, fn: () => Promise<T>) {
    setBusyId(key);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.organizations.create(newName.trim());
      setNewName("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the organization.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(org: Organization) {
    setEditingId(org.id);
    setEditName(org.name);
  }

  async function saveEdit(org: Organization) {
    if (!editName.trim() || editName.trim() === org.name) {
      setEditingId(null);
      return;
    }
    await run(`rename-${org.id}`, () => api.organizations.rename(org.id, editName.trim()));
    setEditingId(null);
  }

  async function handleDelete(org: Organization) {
    if (
      !confirm(
        `Delete "${org.name}"? Its ${org.members.length} member(s) will keep their own plants but stop sharing them.`
      )
    )
      return;
    await run(`delete-${org.id}`, () => api.organizations.remove(org.id));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.section}>
        <h2>New organization</h2>
        <p className={styles.note}>
          Members of an organization share every plant the org owns — anyone can view, edit, and delete them,
          and the map's "my plants" filter shows the whole org's plants.
        </p>
        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="orgName">Name</label>
            <input
              id="orgName"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Prairie Restoration Crew"
              required
            />
          </div>
          <div className={styles.buttonRow}>
            <button type="submit" className={styles.primaryButton} disabled={creating}>
              {creating ? "Creating…" : "Create organization"}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <h2>Organizations</h2>
        {error && <div className={styles.error}>{error}</div>}
        {loading && <p className={styles.note}>Loading…</p>}
        {!loading && orgs.length === 0 && <p className={styles.note}>No organizations yet.</p>}

        <div className={styles.list}>
          {orgs.map((org) => {
            const memberIds = new Set(org.members.map((m) => m.id));
            const addable = users.filter((u) => !memberIds.has(u.id));
            return (
              <div key={org.id} className={styles.orgCard}>
                <div className={styles.orgHeader}>
                  {editingId === org.id ? (
                    <input
                      className={styles.renameInput}
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(org);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => saveEdit(org)}
                    />
                  ) : (
                    <h3 className={styles.orgName}>{org.name}</h3>
                  )}
                  <div className={styles.orgActions}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => (editingId === org.id ? saveEdit(org) : startEdit(org))}
                    >
                      {editingId === org.id ? "Save" : "Rename"}
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDelete(org)}
                      disabled={busyId === `delete-${org.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className={styles.members}>
                  {org.members.length === 0 && <p className={styles.note}>No members yet.</p>}
                  {org.members.map((m) => (
                    <div key={m.id} className={styles.memberRow}>
                      <span>
                        {m.display_name} <span className={styles.memberMeta}>@{m.username}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() =>
                          run(`rm-${org.id}-${m.id}`, () => api.organizations.removeMember(org.id, m.id))
                        }
                        disabled={busyId === `rm-${org.id}-${m.id}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.addRow}>
                  <select
                    value={addChoice[org.id] ?? ""}
                    onChange={(e) => setAddChoice((prev) => ({ ...prev, [org.id]: e.target.value }))}
                  >
                    <option value="">Add a member…</option>
                    {addable.map((u) => {
                      const currentOrg = u.org_id ? orgs.find((o) => o.id === u.org_id) : null;
                      return (
                        <option key={u.id} value={u.id}>
                          {u.display_name}
                          {currentOrg ? ` (moving from ${currentOrg.name})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className={styles.smallButton}
                    disabled={!addChoice[org.id] || busyId === `add-${org.id}`}
                    onClick={() =>
                      run(`add-${org.id}`, async () => {
                        await api.organizations.addMember(org.id, addChoice[org.id]);
                        setAddChoice((prev) => ({ ...prev, [org.id]: "" }));
                      })
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
