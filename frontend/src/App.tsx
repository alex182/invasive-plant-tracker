import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { MapPage } from "./pages/MapPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GuidePage } from "./pages/GuidePage";
import { PlantFormPage } from "./pages/PlantFormPage";
import { PlantDetailPage } from "./pages/PlantDetailPage";
import { PlantsListPage } from "./pages/PlantsListPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";
import { LoginPage } from "./pages/LoginPage";
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
};

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

  if (!user) return <LoginPage />;

  if (user.must_change_password) return <ChangePasswordPage />;

  return (
    <>
      <TopBar title={titleFor(location.pathname)} />
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
          <Route
            path="/settings"
            element={user.role === "admin" ? <SettingsPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/settings/users"
            element={user.role === "admin" ? <UsersPage /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}
