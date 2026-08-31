import { useEffect, useState } from "react";
import { api } from "../lib/api";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const [server, setServer] = useState("https://ntfy.sh");
  const [topic, setTopic] = useState("");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keyFromEnv, setKeyFromEnv] = useState(false);
  const [project, setProject] = useState("all");
  const [savingId, setSavingId] = useState(false);
  const [idMessage, setIdMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.ntfy.getSettings().then((s) => {
        setServer(s.server);
        setTopic(s.topic);
        setHasToken(s.hasToken);
      }),
      api.identify.getSettings().then((s) => {
        setHasKey(s.hasKey);
        setKeyFromEnv(s.keyFromEnv);
        setProject(s.project);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleSaveIdentify(e: React.FormEvent) {
    e.preventDefault();
    setSavingId(true);
    setIdMessage(null);
    try {
      const saved = await api.identify.saveSettings({ apiKey: apiKey || undefined, project });
      setHasKey(saved.hasKey);
      setKeyFromEnv(saved.keyFromEnv);
      setProject(saved.project);
      setApiKey("");
      setIdMessage("Saved.");
    } catch (err) {
      setIdMessage(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSavingId(false);
    }
  }

  async function handleClearKey() {
    setSavingId(true);
    setIdMessage(null);
    try {
      const saved = await api.identify.saveSettings({ apiKey: "" });
      setHasKey(saved.hasKey);
      setKeyFromEnv(saved.keyFromEnv);
      setApiKey("");
      setIdMessage("API key cleared.");
    } catch (err) {
      setIdMessage(err instanceof Error ? err.message : "Couldn't clear the key.");
    } finally {
      setSavingId(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await api.ntfy.saveSettings({ server, topic, token: token || undefined });
      setHasToken(saved.hasToken);
      setToken("");
      setSaveMessage("Settings saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearToken() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await api.ntfy.saveSettings({ server, topic, token: "" });
      setHasToken(saved.hasToken);
      setToken("");
      setSaveMessage("Access token cleared.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Couldn't clear the token.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestMessage(null);
    try {
      await api.ntfy.test({ server, topic, token: token || undefined });
      setTestMessage({ ok: true, text: "Sent — check your device for the notification." });
    } catch (err) {
      setTestMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't send the test notification." });
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <div className={styles.wrap}>Loading…</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.section}>
        <h2>Plant identification (Pl@ntNet)</h2>
        <p className={styles.note}>
          The "Identify from photo" feature uses the{" "}
          <a href="https://my.plantnet.org/" target="_blank" rel="noreferrer">Pl@ntNet API</a> (free for
          non-commercial use). Paste your API key below to enable it.
          {keyFromEnv && " A key is currently set from the server environment; saving one here overrides it."}
        </p>

        <form className={styles.form} onSubmit={handleSaveIdentify}>
          <div className={styles.field}>
            <label htmlFor="plantnetKey">API key</label>
            <input
              id="plantnetKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "Set — leave blank to keep it" : "e.g. 2b10xxxxxxxxxxxxxxxxxxxxxx"}
              autoComplete="off"
            />
            {hasKey && !keyFromEnv && (
              <button type="button" className={styles.linkButton} onClick={handleClearKey} disabled={savingId}>
                Clear saved key
              </button>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="plantnetProject">Flora dataset</label>
            <input
              id="plantnetProject"
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="all"
            />
          </div>

          {idMessage && <div className={styles.note}>{idMessage}</div>}

          <div className={styles.buttonRow}>
            <button type="submit" className={styles.primaryButton} disabled={savingId}>
              {savingId ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <h2>Follow-up notifications (ntfy)</h2>
        <p className={styles.note}>
          Set up a topic on <a href="https://ntfy.sh" target="_blank" rel="noreferrer">ntfy.sh</a> (or your own ntfy
          server) to receive push notifications for this tracker. To receive them, install the ntfy app and
          subscribe to the same topic, or open <code>{server}/{topic || "<topic>"}</code> in a browser.
        </p>

        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.field}>
            <label htmlFor="ntfyServer">Server</label>
            <input
              id="ntfyServer"
              type="url"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="https://ntfy.sh"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ntfyTopic">Topic</label>
            <input
              id="ntfyTopic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. invasive-plant-followup"
              pattern="[A-Za-z0-9_-]+"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ntfyToken">Access token (optional)</label>
            <input
              id="ntfyToken"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? "Set — leave blank to keep it" : "Only needed for a private topic/server"}
              autoComplete="off"
            />
            {hasToken && (
              <button type="button" className={styles.linkButton} onClick={handleClearToken} disabled={saving}>
                Clear saved token
              </button>
            )}
          </div>

          {saveMessage && <div className={styles.note}>{saveMessage}</div>}

          <div className={styles.buttonRow}>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleTest} disabled={testing || !topic}>
              {testing ? "Sending…" : "Send test notification"}
            </button>
          </div>

          {testMessage && (
            <div className={testMessage.ok ? styles.success : styles.error}>{testMessage.text}</div>
          )}
        </form>
      </div>
    </div>
  );
}
