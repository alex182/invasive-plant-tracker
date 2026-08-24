import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { MapPage } from "./pages/MapPage";
import { CalendarPage } from "./pages/CalendarPage";
import { GuidePage } from "./pages/GuidePage";
import { PlantFormPage } from "./pages/PlantFormPage";
import { PlantDetailPage } from "./pages/PlantDetailPage";
import { flushQueue } from "./lib/offlineQueue";

const TITLES: Record<string, string> = {
  "/": "Map",
  "/calendar": "Calendar",
  "/guide": "Guide",
  "/add": "New plant",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.endsWith("/edit")) return "Edit plant";
  if (pathname.startsWith("/plants/")) return "Plant detail";
  return "Invasive Plant Tracker";
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    flushQueue();
  }, []);

  return (
    <>
      <TopBar title={titleFor(location.pathname)} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/add" element={<PlantFormPage />} />
          <Route path="/plants/:id" element={<PlantDetailPage />} />
          <Route path="/plants/:id/edit" element={<PlantFormPage />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}
