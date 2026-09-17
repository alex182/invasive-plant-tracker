import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { api } from "../lib/api";
import type { User } from "../types";
import styles from "./QrLoginModal.module.css";

const DEFAULT_TTL_MINUTES = 10;
/** Remembers the last base URL an admin typed here (e.g. a LAN IP so a phone can reach it) per device. */
const BASE_URL_STORAGE_KEY = "ipt.qrLoginModal.baseUrl";

function loadStoredBaseUrl(): string {
  try {
    return localStorage.getItem(BASE_URL_STORAGE_KEY) || window.location.origin;
  } catch {
    return window.location.origin;
  }
}

/** Builds `<base>/login/qr/<token>`, tolerating a base URL typed with or without a trailing slash. */
function buildLoginUrl(baseUrl: string, token: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const parsed = new URL(`${normalizedBase}/login/qr/${encodeURIComponent(token)}`);
  return parsed.toString();
}

/**
 * Shows a QR code that opens `user`'s login page on whatever device scans it, with their
 * username/password already filled in — so they just tap "Sign in" and their browser can offer to
 * remember it, with no typing on a shared phone or field tablet. Generating a code resets their
 * password to a new one (like an admin's password reset always does); the reveal link itself is
 * single-use and expires on its own, but the password it hands over keeps working normally
 * afterward. Both how long the link lasts and the URL it points at (e.g. a LAN IP so a phone on
 * the same network can reach it) can be adjusted here.
 */
export function QrLoginModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [neverExpires, setNeverExpires] = useState(false);
  const [ttlBounds, setTtlBounds] = useState({ min: 1, max: 1440 });
  const [ttlMinutes, setTtlMinutes] = useState(DEFAULT_TTL_MINUTES);
  const [baseUrl, setBaseUrl] = useState(loadStoredBaseUrl);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mint = useCallback(
    async (minutes: number) => {
      setMinting(true);
      setError(null);
      setCopied(false);
      try {
        const result = await api.users.createQrLoginToken(user.id, minutes);
        setToken(result.token);
        setExpiresAt(result.expires_at);
        setNeverExpires(result.never_expires);
        setTtlBounds({ min: result.min_ttl_minutes, max: result.max_ttl_minutes });
      } catch (err) {
        setToken(null);
        setExpiresAt(null);
        setNeverExpires(false);
        setError(err instanceof Error ? err.message : "Couldn't create a login QR code.");
      } finally {
        setMinting(false);
      }
    },
    [user.id]
  );

  useEffect(() => {
    mint(DEFAULT_TTL_MINUTES);
    // Only on mount — changing the TTL field shouldn't re-mint until "New code" is clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    try {
      localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
    } catch {
      // per-device convenience only — fine if storage is unavailable
    }
  }, [baseUrl]);

  const link = useMemo(() => {
    if (!token) return null;
    try {
      return buildLoginUrl(baseUrl, token);
    } catch {
      return null;
    }
  }, [baseUrl, token]);

  useEffect(() => {
    if (!link) {
      setQrImage(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 440 })
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't render the QR code for that URL.");
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn't copy the link — you can select and copy it manually.");
    }
  }

  const urlLooksInvalid = token !== null && link === null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Log in as {user.display_name}</h2>
            <p className={styles.subtitle}>@{user.username}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {qrImage ? (
          <div className={styles.qrWrap}>
            <img className={styles.qrImage} src={qrImage} alt={`QR code to log in as ${user.display_name}`} />
          </div>
        ) : (
          !error && <div className={styles.status}>{minting ? "Generating…" : "—"}</div>
        )}

        {expiresAt &&
          (neverExpires ? (
            <p className={styles.warning}>
              Never expires — this link stays live until it's used or you generate a new code.
            </p>
          ) : (
            <p className={styles.expiry}>
              Expires at {new Date(expiresAt).toLocaleTimeString()}, or as soon as it's used.
            </p>
          ))}

        <div className={styles.field}>
          <label htmlFor="qr-base-url">URL to share</label>
          <input
            id="qr-base-url"
            className={styles.textInput}
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={window.location.origin}
            spellCheck={false}
          />
          {urlLooksInvalid && <div className={styles.error}>That doesn't look like a valid URL.</div>}
        </div>

        {link && (
          <div className={styles.linkRow}>
            <input className={styles.linkInput} type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
            <button type="button" className={styles.smallButton} onClick={copyLink}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="qr-ttl">Expires after (minutes)</label>
          <input
            id="qr-ttl"
            className={styles.textInput}
            type="number"
            min={0}
            max={ttlBounds.max}
            value={ttlMinutes}
            onChange={(e) => setTtlMinutes(Number(e.target.value))}
          />
          <span className={styles.hint}>
            {ttlBounds.min}–{ttlBounds.max} minutes, or 0 for a code that never expires
          </span>
        </div>

        <p className={styles.note}>
          Scan this with the phone or tablet they'll use — it opens their login page with the username and
          password already filled in, ready to submit. If it's on the same network but not this computer, swap
          the URL above for this machine's LAN address (localhost won't reach it from another device). This reset
          {user.display_name}'s password just now, so their old one no longer works — and anyone who scans this
          code can sign in as them, so keep it private and don't leave it on screen
          {neverExpires ? ", especially since this one never expires on its own" : ""}.
        </p>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.smallButton} disabled={minting} onClick={() => mint(ttlMinutes)}>
            {minting ? "Generating…" : "New code"}
          </button>
        </div>
      </div>
    </div>
  );
}
