/// <reference types="google.maps" />
// Loader for the Google Maps JS API. Loads once, returns a promise that
// resolves to the google.maps namespace.

let loaderPromise: Promise<typeof google.maps> | null = null;

declare global {
  interface Window {
    __initPathfinderMap?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser"));
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      reject(new Error("Google Maps browser key is missing"));
      return;
    }
    window.__initPathfinderMap = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initPathfinderMap${channel ? `&channel=${channel}` : ""}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
