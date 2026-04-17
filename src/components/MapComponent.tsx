/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── SVG DivIcon factory ───────────────────────────────────────────────────────
// Slim teardrop: tall & narrow with a sharp point, small inner dot
function makePinIcon(fill: string, stroke: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="26" viewBox="0 0 16 26">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 5.25 8 18 8 18S16 13.25 16 8C16 3.58 12.42 0 8 0z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
      <circle cx="8" cy="8" r="3" fill="white" opacity="0.92"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [16, 26],
    iconAnchor: [8, 26],
    popupAnchor: [0, -28],
  });
}

const jobSiteIcon = makePinIcon('#ef4444', '#b91c1c');
const pitIcon     = makePinIcon('#f97316', '#c2410c');
const dumpIcon    = makePinIcon('#3b82f6', '#1d4ed8');
const bothIcon    = makePinIcon('#10b981', '#047857');

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

        {facilities.map((fac, idx) => {
          const lat = fac.lat ?? fac.latitude;
          const lon = fac.lon ?? fac.longitude;
          if (!lat || !lon) return null;
          const typeLabel =
            fac.type === 'dump' ? 'Dump / Recycle Site' :
            fac.type === 'both' ? 'Pit & Dump Site' :
            fac.isDump ? 'Dump Site' : 'Material Pit';
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
