import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const makeIcon = (kind) =>
  L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin pin-${kind}"><i></i></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 41],
    popupAnchor: [0, -38],
  });

const icons = {
  spot: makeIcon("spot"),
  me: makeIcon("me"),
  selected: makeIcon("selected"),
  off: makeIcon("off"),
};

// markers: [{ lat, lng, kind, title, subtitle }]
export default function MapView({
  center,
  zoom = 14,
  markers = [],
  line,
  fit = false,
  flyTo,
  onMapClick,
  height = "100%",
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    const map = L.map(elRef.current).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo(flyTo, Math.max(mapRef.current.getZoom(), 15));
    }
  }, [flyTo]);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const points = [];
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: icons[m.kind || "spot"] }).addTo(layer);
      if (m.title) {
        marker.bindPopup(
          `<strong>${esc(m.title)}</strong>${m.subtitle ? `<br/>${esc(m.subtitle)}` : ""}`
        );
      }
      points.push([m.lat, m.lng]);
    });
    if (line) {
      L.polyline(line, { color: "#2563eb", weight: 4, opacity: 0.7, dashArray: "8 8" }).addTo(layer);
    }
    if (fit && points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }, [markers, line, fit]);

  return <div ref={elRef} style={{ height, width: "100%" }} />;
}