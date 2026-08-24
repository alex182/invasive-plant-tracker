import { useState } from "react";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function friendlyGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location access is blocked for this site. Enable it in your browser's site settings, or long-press the map to place a pin manually.";
    case err.POSITION_UNAVAILABLE:
      return "Couldn't determine your location right now. Try again outdoors, or long-press the map to place a pin manually.";
    case err.TIMEOUT:
      return "Getting your location took too long. Try again, or long-press the map to place a pin manually.";
    default:
      return err.message || "Couldn't get your location.";
  }
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getPosition(): Promise<GeoPosition> {
    setLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = "Geolocation is not supported on this device.";
        setError(msg);
        setLoading(false);
        reject(new Error(msg));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          setLoading(false);
          const msg = friendlyGeoError(err);
          setError(msg);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  return { getPosition, loading, error };
}
