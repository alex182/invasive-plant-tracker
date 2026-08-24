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

  useEffect(() => {
    api.ntfy
      .getSettings()
      .then((s) => {
        setServer(s.server);
        setTopic(s.topic);
        setHasToken(s.hasToken);
      })
      .finally(() => setLoading(false));
  }, []);

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
