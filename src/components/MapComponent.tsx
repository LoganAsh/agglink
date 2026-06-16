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
    <div style="animation: markerPop 0.3s ease-out; transform-origin: 50% 100%;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="26" viewBox="0 0 16 26">
        <line x1="8" y1="12" x2="8" y2="25" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="8" cy="7" r="6" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
        <circle cx="6" cy="5" r="1.6" fill="white" opacity="0.7"/>
      </svg>
    </div>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [16, 26],
    iconAnchor: [8, 25],
    popupAnchor: [0, -25],
  });
}

// Marker palette chosen to stay clear of the app's orange/blue/emerald theme accents
// and to remain readable on the light CartoDB tiles.
const jobSiteIcon = makePinIcon('#dc2626', '#7f1d1d'); // red — destination
const pitIcon     = makePinIcon('#ca8a04', '#713f12'); // gold/amber — earthy, distinct from theme orange
const dumpIcon    = makePinIcon('#7c3aed', '#4c1d95'); // violet — distinct from theme blue
const bothIcon    = makePinIcon('#0d9488', '#134e4a'); // teal — distinct from theme emerald

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
  renderFacilityPopup,
}: {
  jobLat?: number;
  jobLon?: number;
  jobAddress?: string;
  facilities?: any[];
  onMapClick?: (lat: number, lon: number) => void;
  interactive?: boolean;
  renderFacilityPopup?: (facility: any) => React.ReactNode;
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
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, USGS, NPS'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
      />
      <MapController center={center} zoom={zoom} />
      <ClickHandler onMapClick={onMapClick} />

      {hasJob && (
        <Marker position={[jobLat!, jobLon!]} icon={jobSiteIcon}>
          <Popup>
            <div style={{ background: '#ffffff', color: '#18181b', padding: '6px 8px', borderRadius: '6px', minWidth: '120px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>Job Site</div>
              {jobAddress && (
                <div style={{ fontSize: '11px', color: '#71717a', marginTop: '3px', maxWidth: '180px' }}>{jobAddress}</div>
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
              {renderFacilityPopup ? renderFacilityPopup(fac) : (
                <div style={{ background: '#ffffff', color: '#18181b', padding: '6px 8px', borderRadius: '6px', minWidth: '120px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{fac.name}</div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '3px' }}>{typeLabel}</div>
                </div>
              )}
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
        className="absolute top-2 right-2 z-[1000] bg-white/95 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 p-1.5 rounded-md shadow-lg transition-all"
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
            className="fixed inset-[10%] z-[2001] rounded-xl overflow-hidden border border-zinc-300 shadow-2xl"
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
              className="absolute top-2 right-2 z-[2100] bg-white/95 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 p-1.5 rounded-md shadow-lg transition-all"
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
