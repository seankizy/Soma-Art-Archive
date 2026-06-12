"use client";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { imageUrl } from "@/lib/supabase";
import type { Artwork } from "@/lib/types";

// A photo thumbnail rendered as a Leaflet marker (parchment-framed circle + pointer).
function photoIcon(url: string | null, title: string) {
  const bg = url
    ? `background-image:url('${url}');background-size:cover;background-position:center;`
    : "background:#c2643c;";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;transform:translate(-50%,-100%);">
        <div style="width:54px;height:54px;border-radius:50%;border:3px solid #f4efe6;
             box-shadow:0 6px 16px -6px rgba(26,22,20,.6);${bg}"></div>
        <div style="width:0;height:0;margin:-2px auto 0;border-left:7px solid transparent;
             border-right:7px solid transparent;border-top:10px solid #f4efe6;"></div>
      </div>`,
    iconSize: [54, 66],
    iconAnchor: [27, 66],
    popupAnchor: [0, -64],
  });
}

// Cluster bubble: representative photo from a child marker + a small count badge.
function clusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 50 : count < 50 ? 60 : 70;
  // Pull the first child's photo URL out of its icon markup.
  const markers = cluster.getAllChildMarkers();
  const html0 = markers?.[0]?.options?.icon?.options?.html ?? "";
  const m = html0.match(/url\('([^']+)'\)/);
  const bg = m
    ? `background-image:url('${m[1]}');background-size:cover;background-position:center;`
    : "background:#ec5a2a;";
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
        <div style="width:100%;height:100%;border-radius:50%;border:3px solid #faf4e8;
             ${bg}box-shadow:0 6px 18px -6px rgba(36,26,16,.6);"></div>
        <div style="position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 5px;
             border-radius:11px;background:#ec5a2a;color:#faf4e8;border:2px solid #faf4e8;
             display:flex;align-items:center;justify-content:center;
             font-family:Georgia,serif;font-weight:600;font-size:12px;">${count}</div>
      </div>`,
    className: "",
    iconSize: L.point(size, size),
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 9);
    else map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
  }, [points, map]);
  return null;
}

export default function ArchiveMap({
  artworks,
  onSelect,
}: {
  artworks: Artwork[];
  onSelect: (a: Artwork) => void;
}) {
  const placed = useMemo(
    () => artworks.filter((a) => a.latitude != null && a.longitude != null),
    [artworks]
  );
  const points = useMemo(
    () => placed.map((a) => [a.latitude!, a.longitude!] as [number, number]),
    [placed]
  );

  return (
    <MapContainer
      center={[30, -30]}
      zoom={2}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", background: "#e8e0d2", borderRadius: 4 }}
    >
      {/* Soft, low-saturation base that suits the parchment palette */}
      <TileLayer
        attribution='&copy; OpenStreetMap, &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds points={points} />
      <MarkerClusterGroup
        iconCreateFunction={clusterIcon}
        showCoverageOnHover={false}
        maxClusterRadius={50}
        spiderfyOnMaxZoom
      >
        {placed.map((a) => (
          <Marker
            key={a.id}
            position={[a.latitude!, a.longitude!]}
            icon={photoIcon(imageUrl(a.image_path), a.title)}
            eventHandlers={{ click: () => onSelect(a) }}
          >
            <Popup>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 15 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "#9b8b73" }}>
                {[a.artist, a.year].filter(Boolean).join(", ")}
              </div>
              {a.location && <div style={{ fontSize: 11, marginTop: 2 }}>{a.location}</div>}
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
