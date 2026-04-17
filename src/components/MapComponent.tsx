/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path issues in Next.js
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const jobIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pitIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dumpIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const bothIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Handles click-to-place when onMapClick is provided
function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function MapComponent({
  jobLat,
  jobLon,
  facilities = [],
  onMapClick,
  interactive = false,
}: {
  jobLat?: number;
  jobLon?: number;
  facilities?: any[];
  onMapClick?: (lat: number, lon: number) => void;
  interactive?: boolean;
}) {
  // Default center: Salt Lake City
  const center: [number, number] = jobLat && jobLon ? [jobLat, jobLon] : [40.7608, -111.891];
  const zoom = jobLat && jobLon ? 11 : 10;

  const getFacilityIcon = useCallback((type: string) => {
    if (type === 'pit') return pitIcon;
    if (type === 'dump') return dumpIcon;
    if (type === 'both') return bothIcon;
    // Legacy fallback from old isDump prop
    return pitIcon;
  }, []);

  return (
    <div className={`h-full w-full z-0 ${interactive ? 'cursor-crosshair' : ''}`}>
      {interactive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-600 pointer-events-none shadow-lg">
          📍 Click the map to place your job site
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
        {jobLat && jobLon && (
          <Marker position={[jobLat, jobLon]} icon={jobIcon}>
            <Popup>
              <b>📍 Job Site</b>
              <br />
              <span className="text-xs text-gray-500">
                {jobLat.toFixed(5)}, {jobLon.toFixed(5)}
              </span>
            </Popup>
          </Marker>
        )}

        {/* Facility markers */}
        {facilities.map((fac, idx) => {
          const lat = fac.lat ?? fac.latitude;
          const lon = fac.lon ?? fac.longitude;
          if (!lat || !lon) return null;
          const icon = fac.isDump !== undefined
            ? (fac.isDump ? dumpIcon : pitIcon)
            : getFacilityIcon(fac.type);
          return (
            <Marker key={fac.id ?? idx} position={[lat, lon]} icon={icon}>
              <Popup>
                <b>{fac.name}</b>
                <br />
                <span className="text-xs capitalize text-gray-500">
                  {fac.type === 'pit' && '🟠 Material Pit'}
                  {fac.type === 'dump' && '🔵 Dump / Recycle Site'}
                  {fac.type === 'both' && '🟢 Pit & Dump Site'}
                  {fac.isDump !== undefined && (fac.isDump ? '🔵 Dump Site' : '🟠 Material Supplier')}
                </span>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      {facilities.length > 0 && (
        <div className="absolute bottom-2 right-2 z-[1000] bg-slate-900/90 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700 space-y-1 pointer-events-none">
          <div className="flex items-center space-x-2"><span>🔴</span><span>Job Site</span></div>
          <div className="flex items-center space-x-2"><span>🟠</span><span>Material Pit</span></div>
          <div className="flex items-center space-x-2"><span>🔵</span><span>Dump Site</span></div>
          <div className="flex items-center space-x-2"><span>🟢</span><span>Pit &amp; Dump</span></div>
        </div>
      )}
    </div>
  );
}
