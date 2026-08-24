import type { PlantStatus } from "../types";

export const STATUS_LABEL: Record<PlantStatus, string> = {
  planned: "Planned",
  pending: "In progress",
  removed: "Removed",
};

export const STATUS_COLOR: Record<PlantStatus, string> = {
  planned: "var(--status-planned)",
  pending: "var(--status-pending)",
  removed: "var(--status-removed)",
};

export const STATUS_ORDER: PlantStatus[] = ["planned", "pending", "removed"];
