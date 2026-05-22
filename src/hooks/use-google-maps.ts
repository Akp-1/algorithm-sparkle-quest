import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/loader";

export function useGoogleMaps() {
  const [maps, setMaps] = useState<typeof google.maps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((m) => {
        if (!cancelled) setMaps(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { maps, error };
}

export function useMapInstance(
  containerRef: React.RefObject<HTMLDivElement | null>,
  maps: typeof google.maps | null,
  options?: google.maps.MapOptions,
) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!maps || !containerRef.current || mapRef.current) return;
    const m = new maps.Map(containerRef.current, {
      center: { lat: 40.7484, lng: -73.9857 }, // NYC default
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      backgroundColor: "#1a1f2e",
      styles: DARK_MAP_STYLE,
      ...options,
    });
    mapRef.current = m;
    setMap(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps]);

  return map;
}

// Dark map style tuned to match the app palette.
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1f2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1f2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b95ad" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b5c0d6" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b7280" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1f2a22" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a3142" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#323a4d" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3d4660" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8b95ad" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f1420" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3b6fa0" }],
  },
];
