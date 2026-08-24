import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { offlineQueueEvents, pendingPlants } from "../lib/offlineQueue";
import type { Plant } from "../types";

export function usePlants() {
  const [serverPlants, setServerPlants] = useState<Plant[]>([]);
  const [pending, setPending] = useState<Plant[]>(pendingPlants());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    return api.plants
      .list()
      .then(setServerPlants)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    function onQueueChange() {
      setPending(pendingPlants());
    }
    function onSynced() {
      setPending(pendingPlants());
      refetch();
    }
    offlineQueueEvents.addEventListener("change", onQueueChange);
    offlineQueueEvents.addEventListener("synced", onSynced);
    return () => {
      offlineQueueEvents.removeEventListener("change", onQueueChange);
      offlineQueueEvents.removeEventListener("synced", onSynced);
    };
  }, [refetch]);

  return { plants: [...serverPlants, ...pending], loading, error, refetch };
}
