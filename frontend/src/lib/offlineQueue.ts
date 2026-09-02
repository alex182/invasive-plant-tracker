import { api } from "./api";
import type { Plant, Treatment } from "../types";

const STORAGE_KEY = "ipt-offline-queue";
const PENDING_PREFIX = "local-";

interface QueuedPlant {
  kind: "plant";
  tempId: string;
  payload: Partial<Plant>;
  createdAt: number;
}

interface QueuedTreatment {
  kind: "treatment";
  tempId: string;
  /** Either a real plant id, or another item's tempId if that plant hasn't synced yet. */
  plantRef: string;
  payload: Partial<Treatment>;
  createdAt: number;
}

type QueueItem = QueuedPlant | QueuedTreatment;

export const offlineQueueEvents = new EventTarget();

function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  offlineQueueEvents.dispatchEvent(new Event("change"));
}

export function isPendingId(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

export function queuePlantCreate(payload: Partial<Plant>): string {
  const tempId = `${PENDING_PREFIX}${crypto.randomUUID()}`;
  const item: QueuedPlant = { kind: "plant", tempId, payload, createdAt: Date.now() };
  writeQueue([...readQueue(), item]);
  return tempId;
}

export function queueTreatmentCreate(plantRef: string, payload: Partial<Treatment>): string {
  const tempId = `${PENDING_PREFIX}${crypto.randomUUID()}`;
  const item: QueuedTreatment = { kind: "treatment", tempId, plantRef, payload, createdAt: Date.now() };
  writeQueue([...readQueue(), item]);
  return tempId;
}

export function pendingCount(): number {
  return readQueue().length;
}

export function pendingPlants(): Plant[] {
  return readQueue()
    .filter((i): i is QueuedPlant => i.kind === "plant")
    .map((i) => {
      const iso = new Date(i.createdAt).toISOString();
      return {
        id: i.tempId,
        species_id: i.payload.species_id ?? "",
        latitude: i.payload.latitude ?? 0,
        longitude: i.payload.longitude ?? 0,
        gps_accuracy_m: i.payload.gps_accuracy_m ?? null,
        status: i.payload.status ?? "planned",
        method: i.payload.method ?? null,
        notes: i.payload.notes ?? "",
        photo_path: null,
        date_identified: i.payload.date_identified ?? iso.slice(0, 10),
        date_started: i.payload.date_started ?? null,
        date_removed: i.payload.date_removed ?? null,
        geometry: i.payload.geometry ?? null,
        logged_by: i.payload.logged_by ?? null,
        created_at: iso,
        updated_at: iso,
      };
    });
}

function removeItem(tempId: string): void {
  writeQueue(readQueue().filter((i) => i.tempId !== tempId));
}

function replaceTempId(tempId: string, realId: string): void {
  const q = readQueue();
  for (const item of q) {
    if (item.kind === "treatment" && item.plantRef === tempId) item.plantRef = realId;
  }
  writeQueue(q);
}

let flushing = false;

/** Replays queued creates in order, resolving plant->treatment dependencies. Safe to call repeatedly. */
export async function flushQueue(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const item of readQueue()) {
        if (item.kind === "plant") {
          try {
            const created = await api.plants.create(item.payload);
            replaceTempId(item.tempId, created.id);
            removeItem(item.tempId);
            progressed = true;
            offlineQueueEvents.dispatchEvent(new Event("synced"));
          } catch {
            // Still offline or request invalid; try again next pass/trigger.
          }
        } else {
          if (isPendingId(item.plantRef)) continue; // parent plant hasn't synced yet
          try {
            await api.treatments.create(item.plantRef, item.payload);
            removeItem(item.tempId);
            progressed = true;
            offlineQueueEvents.dispatchEvent(new Event("synced"));
          } catch {
            // Skip for now.
          }
        }
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue();
  });
}
