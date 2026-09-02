import type {
  IdentifyResult,
  IdentifySettings,
  NtfySettings,
  Plant,
  PlantPhoto,
  Species,
  Treatment,
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
    regrowth: (id: string, data: { logged_by?: string | null }) =>
      request<{ plant: Plant; treatment: Treatment }>(`/plants/${id}/regrowth`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  photos: {
    list: (plantId: string) => request<PlantPhoto[]>(`/plants/${plantId}/photos`),
    upload: async (
      plantId: string,
      file: File,
      opts?: { caption?: string; taken_on?: string; treatment_id?: string | null }
    ) => {
      const form = new FormData();
      form.append("photo", await downscaleImage(file));
      if (opts?.caption) form.append("caption", opts.caption);
      if (opts?.taken_on) form.append("taken_on", opts.taken_on);
      if (opts?.treatment_id) form.append("treatment_id", opts.treatment_id);
      return request<PlantPhoto>(`/plants/${plantId}/photos`, { method: "POST", body: form });
    },
    update: (id: string, data: { caption?: string; taken_on?: string; treatment_id?: string | null }) =>
      request<PlantPhoto>(`/photos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
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
};
