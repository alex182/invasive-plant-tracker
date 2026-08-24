import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Treatment } from "../types";

export function useTreatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.treatments
      .listAll()
      .then((data) => {
        if (!cancelled) setTreatments(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { treatments, loading };
}
