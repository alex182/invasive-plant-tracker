/**
 * Best-effort hint to the browser's password manager, via the Credential Management API, that a
 * username/password just worked and is worth remembering.
 *
 * This exists because our login "form" submits through `fetch`, not a native POST + page
 * navigation — the signal most browsers' save-password heuristics actually key off of. Without
 * this, Chrome in particular often won't offer to save a credential that was filled in
 * programmatically (e.g. from a QR login link) rather than typed by hand, even though the same
 * fields, name attributes, and autocomplete hints are in place either way.
 *
 * `PasswordCredential` isn't in TypeScript's DOM lib (only the more generic `CredentialsContainer`
 * is), and Safari/Firefox don't implement it at all — so this is Chromium-only, feature-detected,
 * and never throws. It's also a no-op outside a secure context (HTTPS, or localhost), same as the
 * app's other browser-permission features like geolocation.
 */
export async function offerToSaveCredential(username: string, password: string): Promise<void> {
  try {
    const PasswordCredentialCtor = (
      window as typeof window & {
        PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential;
      }
    ).PasswordCredential;
    if (!PasswordCredentialCtor || !navigator.credentials?.store) return;

    await navigator.credentials.store(new PasswordCredentialCtor({ id: username, password, name: username }));
  } catch {
    // Never let a password-manager quirk block or fail a login.
  }
}
