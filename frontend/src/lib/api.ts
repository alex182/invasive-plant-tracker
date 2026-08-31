import type { IdentifyResult, IdentifySettings, NtfySettings, Plant, Species, Treatment } from "../types";
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
