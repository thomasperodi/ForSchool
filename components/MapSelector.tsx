import { useEffect, useRef, useState } from "react";
import 'leaflet/dist/leaflet.css';
// Fix per marker che non si vede in Next.js/Leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapSelector({ coords, onSelect }: { coords: { lat: number, lon: number } | null, onSelect: (point: { lat: number, lon: number, citta?: string }) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  // Trova la posizione attuale all'apertura
  const [initialCoords, setInitialCoords] = useState<{ lat: number, lon: number } | null>(null);
  useEffect(() => {
    if (!coords) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => setInitialCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => setInitialCoords({ lat: 45.4642, lon: 9.19 })
        );
      } else {
        setInitialCoords({ lat: 45.4642, lon: 9.19 });
      }
    } else {
      setInitialCoords(coords);
    }
  }, [coords]);

  useEffect(() => {
    let marker: import("leaflet").Marker | undefined;
    async function loadMap() {
      const L = await import("leaflet");
      if (!mapRef.current || !initialCoords) return;
      // Destroy previous map instance if exists
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      mapInstance.current = L.map(mapRef.current).setView([initialCoords.lat, initialCoords.lon], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);
      if (coords) {
        marker = L.marker([coords.lat, coords.lon]).addTo(mapInstance.current);
      }
      mapInstance.current.on("click", async function(e: import("leaflet").LeafletMouseEvent) {
        if (marker && mapInstance.current) mapInstance.current.removeLayer(marker);
        if (mapInstance.current) {
          marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(mapInstance.current);
          // Reverse geocoding con Nominatim
          let citta = "";
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
            const data = await res.json();
            citta = data.address?.city || data.address?.town || data.address?.village || data.address?.hamlet || data.address?.municipality || "";
          } catch {}
          onSelect({ lat: e.latlng.lat, lon: e.latlng.lng, citta });
        }
      });
    }
    loadMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [coords, initialCoords, onSelect]);
  return <div ref={mapRef} style={{ width: "100%", height: "350px", borderRadius: "8px" }} />;
}
