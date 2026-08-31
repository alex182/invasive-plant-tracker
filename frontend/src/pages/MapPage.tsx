import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, Polyline, Circle, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "../leaflet-overrides.css";
import { usePlants } from "../hooks/usePlants";
import { useSpecies } from "../hooks/useSpecies";
import { useGeolocation, friendlyGeoError } from "../hooks/useGeolocation";
import { isPendingId } from "../lib/offlineQueue";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "../lib/status";
import type { Plant, PlantStatus, Species } from "../types";
import styles from "./MapPage.module.css";

const BONNER_SPRINGS: [number, number] = [39.06, -94.88];

/** Minimum movement (meters) before a new GPS reading is accepted as a walk-mode vertex, to filter out GPS jitter while standing still. */
const MIN_WALK_STEP_M = 3;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function ClusteredMarkers({
  plants,
  speciesById,
  onSelect,
}: {
  plants: Plant[];
  speciesById: Map<string, Species>;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup();
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    for (const plant of plants) {
      const species = speciesById.get(plant.species_id);
      const pending = isPendingId(plant.id);
      const icon = L.divIcon({
        className: "",
        html: `<span class="marker-dot${pending ? " marker-dot-pending" : ""}" style="background:${STATUS_COLOR[plant.status]}"></span>`,
        iconSize: [16, 16],
      });
      const marker = L.marker([plant.latitude, plant.longitude], { icon });

      const el = document.createElement("div");
      el.className = "plant-popup";
      el.innerHTML = `
        <strong>${species?.common_name ?? "Unknown species"}</strong>
        <div>Status: ${STATUS_LABEL[plant.status]}</div>
        <div>Identified: ${plant.date_identified}</div>
        ${plant.date_removed ? `<div>Removed: ${plant.date_removed}</div>` : ""}
        ${pending ? `<div>⏳ Pending sync</div>` : ""}
      `;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plant-popup-link";
      btn.textContent = "View detail →";
      btn.onclick = () => onSelect(plant.id);
      el.appendChild(btn);

      marker.bindPopup(el);
      group.addLayer(marker);
    }
  }, [plants, speciesById, onSelect]);

  return null;
}

function PatchPolygons({
  patches,
  speciesById,
  onSelect,
}: {
  patches: Plant[];
  speciesById: Map<string, Species>;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {patches.map((patch) => {
        const species = speciesById.get(patch.species_id);
        const pending = isPendingId(patch.id);
        const color = STATUS_COLOR[patch.status];
        return (
          <Polygon
            key={patch.id}
            positions={patch.geometry as [number, number][]}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 2, dashArray: pending ? "6 4" : undefined }}
            eventHandlers={{ click: () => onSelect(patch.id) }}
          >
            <Popup>
              <div className="plant-popup">
                <strong>{species?.common_name ?? "Unknown species"}</strong>
                <div>Status: {STATUS_LABEL[patch.status]}</div>
                <div>Identified: {patch.date_identified}</div>
                {patch.date_removed && <div>Removed: {patch.date_removed}</div>}
                {pending && <div>⏳ Pending sync</div>}
                <button type="button" className="plant-popup-link" onClick={() => onSelect(patch.id)}>
                  View detail →
                </button>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}

function DrawPatchCapture({ active, onPoint }: { active: boolean; onPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function WalkTracker({
  active,
  paused,
  onTick,
  onPoint,
  onError,
}: {
  active: boolean;
  paused: boolean;
  onTick: (lat: number, lng: number, accuracy: number) => void;
  onPoint: (lat: number, lng: number) => void;
  onError: (message: string) => void;
}) {
  const map = useMap();
  const lastPointRef = useRef<[number, number] | null>(null);
  const pausedRef = useRef(paused);
  const callbacksRef = useRef({ onTick, onPoint, onError });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    callbacksRef.current = { onTick, onPoint, onError };
  }, [onTick, onPoint, onError]);

  useEffect(() => {
    if (!active) {
      lastPointRef.current = null;
      return;
    }
    if (!navigator.geolocation) {
      callbacksRef.current.onError("Geolocation is not supported on this device.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        callbacksRef.current.onTick(point[0], point[1], pos.coords.accuracy);
        map.panTo(point, { animate: true });
        if (pausedRef.current) return;
        const last = lastPointRef.current;
        if (!last || haversineMeters(last, point) >= MIN_WALK_STEP_M) {
          lastPointRef.current = point;
          callbacksRef.current.onPoint(point[0], point[1]);
        }
      },
      (err) => callbacksRef.current.onError(friendlyGeoError(err)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, map]);

  return null;
}

function LongPressCapture({ onLongPress }: { onLongPress: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startPoint: { x: number; y: number } | null = null;

    function clear() {
      if (timer) clearTimeout(timer);
      timer = null;
      startPoint = null;
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startPoint = { x: touch.clientX, y: touch.clientY };
      timer = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
        const latlng = map.containerPointToLatLng(point);
        onLongPress(latlng.lat, latlng.lng);
      }, 600);
    }

    function onTouchMove(e: TouchEvent) {
      if (!startPoint) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startPoint.x;
      const dy = touch.clientY - startPoint.y;
      if (Math.sqrt(dx * dx + dy * dy) > 12) clear();
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", clear);
    container.addEventListener("touchcancel", clear);

    function onContextMenu(e: L.LeafletMouseEvent) {
      onLongPress(e.latlng.lat, e.latlng.lng);
    }
    map.on("contextmenu", onContextMenu);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", clear);
      container.removeEventListener("touchcancel", clear);
      map.off("contextmenu", onContextMenu);
    };
  }, [map, onLongPress]);

  return null;
}

function RecenterOnLocate({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

export function MapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnToAddRef = useRef<URLSearchParams | null>(null);
  const { plants } = usePlants();
  const { species } = useSpecies();
  const { getPosition, loading: locating } = useGeolocation();
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [myAccuracy, setMyAccuracy] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<PlantStatus>>(new Set(STATUS_ORDER));
  const [speciesFilter, setSpeciesFilter] = useState<Set<string> | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [walkMode, setWalkMode] = useState(false);
  const [walkPaused, setWalkPaused] = useState(false);
  const [walkPos, setWalkPos] = useState<[number, number] | null>(null);
  const [walkAccuracy, setWalkAccuracy] = useState<number | null>(null);

  useEffect(() => {
    const draw = searchParams.get("draw");
    if (draw !== "tap" && draw !== "walk") return;
    const rest = new URLSearchParams(searchParams);
    rest.delete("draw");
    returnToAddRef.current = rest;
    startDrawing(draw);
    setSearchParams({}, { replace: true });
    // Runs once on mount to consume the incoming ?draw= handoff from the Add form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speciesById = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);

  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      if (!statusFilter.has(p.status)) return false;
      if (speciesFilter && !speciesFilter.has(p.species_id)) return false;
      return true;
    });
  }, [plants, statusFilter, speciesFilter]);

  const markerPlants = useMemo(
    () => filteredPlants.filter((p) => !p.geometry || p.geometry.length < 3),
    [filteredPlants]
  );
  const patchPlants = useMemo(
    () => filteredPlants.filter((p) => p.geometry && p.geometry.length >= 3),
    [filteredPlants]
  );

  function toggleStatus(status: PlantStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleSpecies(id: string) {
    setSpeciesFilter((prev) => {
      const base = prev ?? new Set(species.map((s) => s.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDropPin() {
    try {
      const pos = await getPosition();
      navigate(`/add?lat=${pos.latitude}&lng=${pos.longitude}&accuracy=${pos.accuracy}`);
    } catch {
      setHint("Couldn't get GPS location. Long-press the map to place a pin manually.");
      setTimeout(() => setHint(null), 4000);
    }
  }

  async function handleLocateMe() {
    try {
      const pos = await getPosition();
      setMyPos([pos.latitude, pos.longitude]);
      setMyAccuracy(pos.accuracy);
    } catch {
      setHint("Couldn't get GPS location.");
      setTimeout(() => setHint(null), 4000);
    }
  }

  function handleLongPress(lat: number, lng: number) {
    if (drawing) return;
    navigate(`/add?lat=${lat}&lng=${lng}`);
  }

  function startDrawing(mode: "tap" | "walk") {
    setFiltersOpen(false);
    setDrawing(true);
    setWalkMode(mode === "walk");
    setWalkPaused(false);
    setDrawPoints([]);
    setHint(
      mode === "walk"
        ? "Walk the edge of the patch — points are added automatically as you go."
        : "Tap the map to add points, then finish the patch outline."
    );
  }

  function cancelDrawing() {
    const returnToAdd = returnToAddRef.current;
    returnToAddRef.current = null;
    setDrawing(false);
    setWalkMode(false);
    setWalkPaused(false);
    setWalkPos(null);
    setWalkAccuracy(null);
    setDrawPoints([]);
    setHint(null);
    if (returnToAdd) navigate(`/add?${returnToAdd.toString()}`);
  }

  function undoLastPoint() {
    setDrawPoints((prev) => prev.slice(0, -1));
  }

  function finishDrawing() {
    if (drawPoints.length < 3) return;
    const lat = drawPoints.reduce((sum, p) => sum + p[0], 0) / drawPoints.length;
    const lng = drawPoints.reduce((sum, p) => sum + p[1], 0) / drawPoints.length;
    const params = returnToAddRef.current ?? new URLSearchParams();
    params.set("lat", String(lat));
    params.set("lng", String(lng));
    params.set("geometry", JSON.stringify(drawPoints));
    returnToAddRef.current = null;
    setDrawing(false);
    setWalkMode(false);
    setWalkPaused(false);
    setWalkPos(null);
    setWalkAccuracy(null);
    setDrawPoints([]);
    setHint(null);
    navigate(`/add?${params.toString()}`);
  }

  return (
    <div className={styles.wrap}>
      {hint && <div className={styles.hint}>{hint}</div>}
      <MapContainer center={BONNER_SPRINGS} zoom={13} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusteredMarkers
          plants={markerPlants}
          speciesById={speciesById}
          onSelect={(id) => navigate(`/plants/${id}`)}
        />
        <PatchPolygons patches={patchPlants} speciesById={speciesById} onSelect={(id) => navigate(`/plants/${id}`)} />
        {drawPoints.length >= 3 ? (
          <Polygon
            positions={drawPoints}
            pathOptions={{ color: "var(--accent)", dashArray: "6 4", fillOpacity: 0.15 }}
          />
        ) : (
          drawPoints.length >= 2 && (
            <Polyline positions={drawPoints} pathOptions={{ color: "var(--accent)", dashArray: "6 4" }} />
          )
        )}
        {walkMode && walkPos && (
          <>
            <Circle center={walkPos} radius={walkAccuracy ?? 10} pathOptions={{ color: "var(--accent)", fillOpacity: 0.08, weight: 1 }} />
            <CircleMarker
              center={walkPos}
              radius={6}
              pathOptions={{ color: "var(--accent)", fillColor: "var(--accent)", fillOpacity: 1, weight: 2 }}
            />
          </>
        )}
        {!walkMode && myPos && (
          <>
            <Circle
              center={myPos}
              radius={myAccuracy ?? 15}
              pathOptions={{ color: "var(--event-start)", fillColor: "var(--event-start)", fillOpacity: 0.08, weight: 1 }}
            />
            <CircleMarker
              center={myPos}
              radius={7}
              pathOptions={{ color: "#fff", fillColor: "var(--event-start)", fillOpacity: 1, weight: 2 }}
            />
          </>
        )}
        <DrawPatchCapture
          active={drawing && !walkMode}
          onPoint={(lat, lng) => setDrawPoints((prev) => [...prev, [lat, lng]])}
        />
        <WalkTracker
          active={drawing && walkMode}
          paused={walkPaused}
          onTick={(lat, lng, accuracy) => {
            setWalkPos([lat, lng]);
            setWalkAccuracy(accuracy);
          }}
          onPoint={(lat, lng) => setDrawPoints((prev) => [...prev, [lat, lng]])}
          onError={(msg) => setHint(msg)}
        />
        <LongPressCapture onLongPress={handleLongPress} />
        <RecenterOnLocate position={myPos} />
      </MapContainer>

      <button
        className={styles.filterButton}
        style={{ position: "absolute", top: 10, right: 10, zIndex: 16 }}
        onClick={() => setFiltersOpen((v) => !v)}
        aria-label={filtersOpen ? "Close filters" : "Open filters"}
      >
        {filtersOpen ? "✕" : "🔎"}
      </button>

      {filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterPanelHeader}>
            <h2>Filters</h2>
            <button type="button" className={styles.filterCloseButton} onClick={() => setFiltersOpen(false)}>
              Close
            </button>
          </div>
          <div className={styles.filterGroup}>
            <h3>Status</h3>
            {STATUS_ORDER.map((status) => (
              <label key={status} className={styles.checkRow}>
                <input type="checkbox" checked={statusFilter.has(status)} onChange={() => toggleStatus(status)} />
                {STATUS_LABEL[status]}
              </label>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <h3>Species</h3>
            {species.map((s) => (
              <label key={s.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={!speciesFilter || speciesFilter.has(s.id)}
                  onChange={() => toggleSpecies(s.id)}
                />
                {s.common_name}
              </label>
            ))}
          </div>
        </div>
      )}

      {drawing ? (
        <div className={styles.drawToolbar}>
          <span className={styles.drawCount}>
            {walkMode ? "🚶 " : ""}
            {drawPoints.length} point{drawPoints.length === 1 ? "" : "s"}
            {walkMode && walkPaused ? " · paused" : ""}
          </span>
          {walkMode ? (
            <button type="button" onClick={() => setWalkPaused((v) => !v)}>
              {walkPaused ? "Resume" : "Pause"}
            </button>
          ) : (
            <button type="button" onClick={undoLastPoint} disabled={drawPoints.length === 0}>
              Undo
            </button>
          )}
          <button type="button" onClick={cancelDrawing}>
            Cancel
          </button>
          <button type="button" className={styles.drawFinish} onClick={finishDrawing} disabled={drawPoints.length < 3}>
            Finish
          </button>
        </div>
      ) : (
        <div className={styles.fab}>
          <button
            className={styles.filterButton}
            onClick={handleLocateMe}
            disabled={locating}
            aria-label="Show my current location on the map"
          >
            {locating ? "…" : "🎯"}
          </button>
          <button
            className={styles.fabButton}
            onClick={() => startDrawing("walk")}
            aria-label="Walk a patch outline using GPS"
          >
            🚶
          </button>
          <button
            className={styles.fabButton}
            onClick={() => startDrawing("tap")}
            aria-label="Draw a patch outline"
          >
            ⬟
          </button>
          <button
            className={styles.fabButton}
            onClick={handleDropPin}
            disabled={locating}
            aria-label="Drop pin at current GPS location"
          >
            {locating ? "…" : "📍"}
          </button>
        </div>
      )}
    </div>
  );
}
