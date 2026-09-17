import { useEffect, useState } from "react";

const DISMISSED_KEY = "ipt.installPromptDismissed";

/** The non-standard event Chromium fires when a page qualifies as installable — not in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // iOS Safari's own non-standard flag for "launched from the home screen icon".
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export interface InstallPromptState {
  /** Whether there's something worth showing right now. */
  visible: boolean;
  /** True when we can trigger the browser's own install flow directly (Chromium/Android). */
  canPromptNatively: boolean;
  /** True on iOS Safari, where there's no native prompt to trigger — only manual instructions apply. */
  isIos: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Surfaces "install this as an app" — the point being a kid (or anyone on a shared device) taps a
 * home-screen icon straight into an already-signed-in session, never seeing a browser chrome, a
 * URL, or a login screen again after the first QR scan. Chromium browsers get a real one-tap
 * install via `beforeinstallprompt`. Firefox and Safari expose no equivalent event at all — there's
 * no way to detect or trigger installability from the page — so those (and anything else) fall
 * back to manual instructions instead of just showing nothing. Dismissal is remembered per device.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const iosDevice = isIos();
  // Unlike before, this doesn't require a detected `beforeinstallprompt` or iOS — Firefox (and
  // anything else) still gets the banner, just with generic instructions instead of a one-tap button.
  const visible = !installed && !dismissed;

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // per-device convenience only — fine if storage is unavailable
    }
  }

  return { visible, canPromptNatively: deferred !== null, isIos: iosDevice, promptInstall, dismiss };
}
