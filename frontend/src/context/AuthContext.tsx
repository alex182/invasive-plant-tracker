import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { offerToSaveCredential } from "../lib/credentials";
import type { SessionUser } from "../types";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.auth.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function login(username: string, password: string) {
    setUser(await api.auth.login(username, password));
    // Fire-and-forget: our login submits via fetch, not a native form POST, which many browsers'
    // save-password heuristics don't reliably pick up on — this nudges them directly instead.
    void offerToSaveCredential(username, password);
  }

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  }

  async function impersonate(userId: string) {
    setUser(await api.auth.impersonate(userId));
  }

  async function stopImpersonating() {
    setUser(await api.auth.stopImpersonating());
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const updated = await api.auth.changePassword(currentPassword, newPassword);
    setUser(updated);
    void offerToSaveCredential(updated.username, newPassword);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refresh, impersonate, stopImpersonating, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
