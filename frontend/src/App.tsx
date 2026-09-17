import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav, SIMPLIFIED_TABS } from "./components/BottomNav";
import { InstallPrompt } from "./components/InstallPrompt";
import { TopBar } from "./components/TopBar";
import { MapPage } from "./pages/MapPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GuidePage } from "./pages/GuidePage";
import { PlantFormPage } from "./pages/PlantFormPage";
import { PlantDetailPage } from "./pages/PlantDetailPage";
import { PlantsListPage } from "./pages/PlantsListPage";
import { SimplifiedAddPlantPage } from "./pages/SimplifiedAddPlantPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";
import { OrgsPage } from "./pages/OrgsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { AccountPage } from "./pages/AccountPage";
import { LoginPage } from "./pages/LoginPage";
import { QrLoginPage } from "./pages/QrLoginPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { flushQueue } from "./lib/offlineQueue";
import { useAuth } from "./context/AuthContext";

const TITLES: Record<string, string> = {
  "/": "Map",
  "/plants": "Plants",
  "/calendar": "Calendar",
  "/dashboard": "Stats",
  "/guide": "Guide",
  "/add": "New plant",
  "/settings": "Settings",
  "/settings/users": "Users",
  "/settings/orgs": "Organizations",
  "/settings/audit-log": "Audit log",
  "/account": "Account",
};

const QR_LOGIN_PATH = /^\/login\/qr\/([^/]+)$/;

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.endsWith("/edit")) return "Edit plant";
  if (pathname.startsWith("/plants/")) return "Plant detail";
  return "Invasive Plant Tracker";
}

export default function App() {
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) flushQueue();
  }, [user]);

  if (loading) return null;

  if (!user) {
    // Reachable while signed out — scanning a login QR code (see UsersPage) opens this link.
    const qrMatch = location.pathname.match(QR_LOGIN_PATH);
    if (qrMatch) return <QrLoginPage token={decodeURIComponent(qrMatch[1])} />;
    return <LoginPage />;
  }

  // Signing in from the QR flow above leaves the URL on /login/qr/:token, which isn't a real
  // route — bounce to the map once there's a session so the Routes below have something to match.
  if (QR_LOGIN_PATH.test(location.pathname)) return <Navigate to="/" replace />;

  // Skip the forced-change screen while impersonating — that's the impersonated user's own
  // business, not something to make the admin deal with mid-impersonation.
  if (user.must_change_password && !user.impersonating) return <ChangePasswordPage />;

  // A simplified account only gets a read-only map (see, not edit or manage) and its own
  // dedicated add-a-plant screen — no list, calendar, stats, guide, or settings. (An admin
  // impersonating a simplified user sees exactly this too, same as impersonating anyone else.)
  if (user.role === "simplified") {
    return (
      <>
        <TopBar title={titleFor(location.pathname)} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/add" element={<SimplifiedAddPlantPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav tabs={SIMPLIFIED_TABS} />
      </>
    );
  }

  return (
    <>
      <TopBar title={titleFor(location.pathname)} />
      <InstallPrompt />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/plants" element={<PlantsListPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/add" element={<PlantFormPage />} />
          <Route path="/plants/:id" element={<PlantDetailPage />} />
          <Route path="/plants/:id/edit" element={<PlantFormPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route
            path="/settings"
            element={user.role === "admin" ? <SettingsPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/settings/users"
            element={user.role === "admin" ? <UsersPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/settings/orgs"
            element={user.role === "admin" ? <OrgsPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/settings/audit-log"
            element={user.role === "admin" ? <AuditLogPage /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}
