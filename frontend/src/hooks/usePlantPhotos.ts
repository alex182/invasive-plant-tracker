import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PlantPhoto } from "../types";

export function usePlantPhotos(plantId: string | undefined, enabled = true) {
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!plantId || !enabled) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    try {
      setPhotos(await api.photos.list(plantId));
    } finally {
      setLoading(false);
    }
  }, [plantId, enabled]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload().catch(() => {
      if (!cancelled) setPhotos([]);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { photos, loading, reload };
}
