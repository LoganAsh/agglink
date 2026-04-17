/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── SVG DivIcon factory ───────────────────────────────────────────────────────
// Clean teardrop pins using inline SVG — no external image dependencies
function makePinIcon(fill: string, stroke: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 24 14 24S28 23.63 28 14C28 6.27 21.73 0 14 0z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5.5" fill="white" opacity="0.95"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });
}

const jobSiteIcon = makePinIcon('#ef4444', '#b91c1c'); // red    — job site
const pitIcon     = makePinIcon('#f97316', '#c2410c'); // orange — material pit
const dumpIcon    = makePinIcon('#3b82f6', '#1d4ed8'); // blue   — dump site
const bothIcon    = makePinIcon('#10b981', '#047857'); // green  — pit & dump

// ── Helpers ───────────────────────────────────────────────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapComponent({
  jobLat,
  jobLon,
  jobAddress,
  facilities = [],
  onMapClick,
  interactive = false,
}: {
  jobLat?: number;
  jobLon?: number;
  jobAddress?: string;
  facilities?: any[];
  onMapClick?: (lat: number, lon: number) => void;
  interactive?: boolean;
}) {
  const hasJob = !!(jobLat && jobLon);
  const center: [number, number] = hasJob ? [jobLat!, jobLon!] : [40.7608, -111.891];
  const zoom = hasJob ? 11 : 10;

  const getFacilityIcon = useCallback((fac: any) => {
    if (fac.isDump !== undefined) return fac.isDump ? dumpIcon : pitIcon;
    if (fac.type === 'dump') return dumpIcon;
    if (fac.type === 'both') return bothIcon;
    return pitIcon;
  }, []);

  return (
    <div className="h-full w-full relative">
      {interactive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-slate-400 text-xs px-3 py-1.5 rounded-full border border-slate-700 pointer-events-none shadow-lg tracking-wide">
          Click to place job site
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={center} zoom={zoom} />
        <ClickHandler onMapClick={onMapClick} />

        {/* Job site pin */}
        {hasJob && (
          <Marker position={[jobLat!, jobLon!]} icon={jobSiteIcon}>
            <Popup>
              <div style={{ background: '#1e293b', color: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', minWidth: '120px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Job Site</div>
                {jobAddress && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', maxWidth: '180px' }}>{jobAddress}</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Facility markers */}
        {facilities.map((fac, idx) => {
          const lat = fac.lat ?? fac.latitude;
          const lon = fac.lon ?? fac.longitude;
          if (!lat || !lon) return null;
          const typeLabel =
            fac.type === 'dump' ? 'Dump / Recycle Site' :
            fac.type === 'both' ? 'Pit & Dump Site' :
            fac.isDump ? 'Dump Site' :
            'Material Pit';
          return (
            <Marker key={fac.id ?? idx} position={[lat, lon]} icon={getFacilityIcon(fac)}>
              <Popup>
                <div style={{ background: '#1e293b', color: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', minWidth: '120px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{fac.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{typeLabel}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
