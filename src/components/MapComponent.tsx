/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── SVG DivIcon factory ───────────────────────────────────────────────────────
// Ball pin: round head with a thin straight needle pointing to the geo location
function makePinIcon(fill: string, stroke: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="26" viewBox="0 0 16 26">
      <line x1="8" y1="12" x2="8" y2="25" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="8" cy="7" r="6" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
      <circle cx="6" cy="5" r="1.6" fill="white" opacity="0.7"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [16, 26],
    iconAnchor: [8, 25],
    popupAnchor: [0, -25],
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

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(id);
  }, [map]);
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
  const [isMaximized, setIsMaximized] = useState(false);

  const getFacilityIcon = useCallback((fac: any) => {
    if (fac.isDump !== undefined) return fac.isDump ? dumpIcon : pitIcon;
    if (fac.type === 'dump') return dumpIcon;
    if (fac.type === 'both') return bothIcon;
    return pitIcon;
  }, []);

  const renderMapChildren = () => (
    <>
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
    </>
  );

  return (
    <div className="h-full w-full relative">
      {interactive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-slate-400 text-xs px-3 py-1.5 rounded-full border border-slate-700 pointer-events-none shadow-lg tracking-wide">
          Click to place job site
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); setIsMaximized(true); }}
        className="absolute top-2 right-2 z-[1000] bg-slate-900/80 hover:bg-slate-800 border border-slate-600 text-white p-1.5 rounded-md shadow-lg transition-all"
        title="Expand map"
      >
        <i className="fa-solid fa-expand text-xs"></i>
      </button>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
      >
        {renderMapChildren()}
      </MapContainer>

      {isMaximized && (
        <>
          <div
            className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMaximized(false)}
          />
          <div
            className="fixed inset-[10%] z-[2001] rounded-xl overflow-hidden border border-slate-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={true}
            >
              {renderMapChildren()}
              <InvalidateSizeOnMount />
            </MapContainer>
            <button
              onClick={() => setIsMaximized(false)}
              className="absolute top-2 right-2 z-[2100] bg-slate-900/80 hover:bg-slate-800 border border-slate-600 text-white p-1.5 rounded-md shadow-lg transition-all"
              title="Close fullscreen"
            >
              <i className="fa-solid fa-compress text-xs"></i>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
