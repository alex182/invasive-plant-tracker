import type {
  AuditLogEntry,
  IdentifyResult,
  IdentifySettings,
  NtfySettings,
  Organization,
  PhotoPhase,
  Plant,
  PlantPhoto,
  Role,
  SessionUser,
  Species,
  Treatment,
  User,
} from "../types";
import { downscaleImage } from "./resizeImage";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  species: {
    list: () => request<Species[]>("/species"),
    get: (id: string) => request<Species>(`/species/${id}`),
    seasonNow: (month?: number) =>
      request<Species[]>(`/species/season-now${month ? `?month=${month}` : ""}`),
  },
  plants: {
    list: (filters?: { status?: string; species_id?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.species_id) params.set("species_id", filters.species_id);
      const qs = params.toString();
      return request<Plant[]>(`/plants${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<Plant>(`/plants/${id}`),
    create: (data: Partial<Plant>) =>
      request<Plant>("/plants", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Plant>) =>
      request<Plant>(`/plants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/plants/${id}`, { method: "DELETE" }),
    uploadPhoto: async (id: string, file: File) => {
      const form = new FormData();
      form.append("photo", await downscaleImage(file));
      return request<Plant>(`/plants/${id}/photo`, { method: "POST", body: form });
    },
    regrowth: (id: string) =>
      request<{ plant: Plant; treatment: Treatment }>(`/plants/${id}/regrowth`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    bulkReassign: (plantIds: string[], ownerId: string) =>
      request<{ updated_count: number; updated_ids: string[] }>("/plants/bulk-reassign", {
        method: "POST",
        body: JSON.stringify({ plant_ids: plantIds, owner_id: ownerId }),
      }),
    duplicates: () =>
      request<{ groups: { species_id: string; species_name: string | null; plants: Plant[] }[] }>(
        "/plants/duplicates"
      ),
    bulkCopy: (plantIds: string[], ownerId: string) =>
      request<{ created_count: number; created_ids: string[] }>("/plants/bulk-copy", {
        method: "POST",
        body: JSON.stringify({ plant_ids: plantIds, owner_id: ownerId }),
      }),
    bulkDelete: (plantIds: string[]) =>
      request<{ deleted_count: number; deleted_ids: string[] }>("/plants/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ plant_ids: plantIds }),
      }),
  },
  photos: {
    list: (plantId: string) => request<PlantPhoto[]>(`/plants/${plantId}/photos`),
    upload: async (
      plantId: string,
      file: File,
      opts?: { caption?: string; taken_on?: string; treatment_id?: string | null; phase?: PhotoPhase | null }
    ) => {
      const form = new FormData();
      form.append("photo", await downscaleImage(file));
      if (opts?.caption) form.append("caption", opts.caption);
      if (opts?.taken_on) form.append("taken_on", opts.taken_on);
      if (opts?.treatment_id) form.append("treatment_id", opts.treatment_id);
      if (opts?.phase) form.append("phase", opts.phase);
      return request<PlantPhoto>(`/plants/${plantId}/photos`, { method: "POST", body: form });
    },
    update: (
      id: string,
      data: { caption?: string; taken_on?: string; treatment_id?: string | null; phase?: PhotoPhase | null }
    ) => request<PlantPhoto>(`/photos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/photos/${id}`, { method: "DELETE" }),
  },
  identify: {
    fromPhoto: async (file: File) => {
      const form = new FormData();
      form.append("photo", await downscaleImage(file));
      return request<{ results: IdentifyResult[] }>("/identify", { method: "POST", body: form });
    },
    getSettings: () => request<IdentifySettings>("/identify/settings"),
    saveSettings: (data: { apiKey?: string; project?: string }) =>
      request<IdentifySettings>("/identify/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
  ntfy: {
    getSettings: () => request<NtfySettings>("/ntfy/settings"),
    saveSettings: (data: { server: string; topic: string; token?: string }) =>
      request<NtfySettings>("/ntfy/settings", { method: "PUT", body: JSON.stringify(data) }),
    test: (data: { server: string; topic: string; token?: string }) =>
      request<{ ok: boolean }>("/ntfy/test", { method: "POST", body: JSON.stringify(data) }),
  },
  treatments: {
    listAll: () => request<Treatment[]>("/treatments"),
    list: (plantId: string) => request<Treatment[]>(`/plants/${plantId}/treatments`),
    create: (plantId: string, data: Partial<Treatment>) =>
      request<Treatment>(`/plants/${plantId}/treatments`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Treatment>) =>
      request<Treatment>(`/treatments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  auth: {
    me: () => request<SessionUser>("/auth/me"),
    login: (username: string, password: string) =>
      request<SessionUser>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<SessionUser>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    impersonate: (userId: string) =>
      request<SessionUser>(`/auth/impersonate/${userId}`, { method: "POST" }),
    stopImpersonating: () => request<SessionUser>("/auth/stop-impersonating", { method: "POST" }),
  },
  users: {
    list: () => request<User[]>("/users"),
    create: (data: { username: string; password: string; role: Role; display_name: string }) =>
      request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { role?: Role; display_name?: string; active?: boolean }) =>
      request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    resetPassword: (id: string, newPassword: string) =>
      request<User>(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) }),
  },
  organizations: {
    list: () => request<Organization[]>("/organizations"),
    create: (name: string) =>
      request<Organization>("/organizations", { method: "POST", body: JSON.stringify({ name }) }),
    rename: (id: string, name: string) =>
      request<Organization>(`/organizations/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    remove: (id: string) => request<void>(`/organizations/${id}`, { method: "DELETE" }),
    addMember: (id: string, userId: string) =>
      request<Organization>(`/organizations/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }),
    removeMember: (id: string, userId: string) =>
      request<Organization>(`/organizations/${id}/members/${userId}`, { method: "DELETE" }),
  },
  auditLog: {
    list: (filters?: { limit?: number; before?: string; actor_id?: string; action?: string }) => {
      const params = new URLSearchParams();
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.before) params.set("before", filters.before);
      if (filters?.actor_id) params.set("actor_id", filters.actor_id);
      if (filters?.action) params.set("action", filters.action);
      const qs = params.toString();
      return request<{ entries: AuditLogEntry[]; next_before: string | null }>(
        `/audit-log${qs ? `?${qs}` : ""}`
      );
    },
  },
};
