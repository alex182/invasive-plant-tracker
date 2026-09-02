import type { PlantStatus } from "../types";

export const STATUS_LABEL: Record<PlantStatus, string> = {
  planned: "Planned",
  pending: "In progress",
  monitoring: "Monitoring",
  removed: "Removed",
};

export const STATUS_COLOR: Record<PlantStatus, string> = {
  planned: "var(--status-planned)",
  pending: "var(--status-pending)",
  monitoring: "var(--status-monitoring)",
  removed: "var(--status-removed)",
};

export const STATUS_ORDER: PlantStatus[] = ["planned", "pending", "monitoring", "removed"];
