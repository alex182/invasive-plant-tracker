import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Species } from "../types";

export function useSpecies() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.species
      .list()
      .then((data) => {
        if (!cancelled) setSpecies(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { species, loading, error };
}
