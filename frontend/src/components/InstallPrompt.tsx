import { useInstallPrompt } from "../hooks/useInstallPrompt";
import styles from "./InstallPrompt.module.css";

/**
 * A dismissible banner nudging installation to the home screen — see useInstallPrompt for why:
 * once installed, reopening the icon reuses the same long-lived session, so nobody needs a browser,
 * a URL, or (after the first QR scan) a login screen ever again.
 */
export function InstallPrompt() {
  const { visible, canPromptNatively, isIos, promptInstall, dismiss } = useInstallPrompt();
  if (!visible) return null;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.text}>
        {canPromptNatively ? (
          <>
            <strong>Install this app</strong> so it opens with one tap — no browser, no login screen.
          </>
        ) : isIos ? (
          <>
            <strong>Add this to your Home Screen:</strong> tap the Share button, then "Add to Home Screen".
          </>
        ) : (
          <>
            <strong>Add this to your Home Screen</strong> for one-tap access — look for "Install" or "Add to
            Home Screen" in your browser's menu.
          </>
        )}
      </div>
      <div className={styles.actions}>
        {canPromptNatively && (
          <button type="button" className={styles.installButton} onClick={promptInstall}>
            Install
          </button>
        )}
        <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
