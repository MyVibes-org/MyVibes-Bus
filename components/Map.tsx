'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import L from 'leaflet';
import { Bus, Stop } from '../lib/utils';
import { useEffect } from 'react';

// Icons
const stopIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448833.png', // A simple stop icon
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -6],
});

const selectedStopIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448833.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
  className: 'hue-rotate-180' 
});

const userIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

// Helper to create rotated bus icon
const createBusIcon = (bearing: number) => {
    return L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="transform: rotate(${bearing}deg); width: 30px; height: 30px; display: flex; justify-content: center; align-items: center;">
            <img src="/icons/bus-top-view.png" style="width: 100%; height: 100%;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3448/3448339.png'" />
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

// We don't have a top-view bus icon yet, so let's use an emoji or fallback for now
// Or better: an SVG arrow pointer.
const createArrowIcon = (bearing: number, routeShortName: string) => {
    return L.divIcon({
        className: 'bus-marker',
        html: `
            <div class="relative w-8 h-8 flex items-center justify-center">
                <div style="transform: rotate(${bearing}deg);" class="absolute inset-0 flex items-center justify-center">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2">
                      <path d="M12 2L4.5 20.29C4.24 21.03 5.09 21.68 5.76 21.34L12 18.21L18.24 21.34C18.91 21.68 19.76 21.03 19.5 20.29L12 2Z" />
                   </svg>
                </div>
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-1 rounded shadow-sm border border-white z-10">
                    ${routeShortName}
                </span>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};


interface MapComponentProps {
  buses: Bus[];
  stops: Stop[];
  routeShape: [number, number][];
  userLocation: { lat: number, lng: number } | null;
  selectedRouteId: string | null;
  onStopSelect: (stop: Stop) => void;
  selectedStop: Stop | null;
}

function LocationMarker({ location }: { location: { lat: number, lng: number } | null }) {
    return location === null ? null : (
        <Marker position={location} icon={userIcon}>
            <Popup>You are here</Popup>
        </Marker>
    );
}

function RouteFitter({ shape }: { shape: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (shape && shape.length > 0) {
            // Add padding to ensure points are not at the very edge
            map.fitBounds(shape as L.LatLngTuple[], { padding: [50, 50] });
        }
    }, [shape, map]);
    return null;
}

export default function MapComponent({ buses, stops, routeShape, userLocation, selectedRouteId, onStopSelect, selectedStop }: MapComponentProps) {
  const defaultCenter = [3.1390, 101.6869];

  return (
    <MapContainer center={defaultCenter as L.LatLngExpression} zoom={13} style={{ height: '100%', width: '100%' }}>
      {/* Google Maps-like Style (CartoDB Voyager) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <LocationMarker location={userLocation} />
      <RouteFitter shape={routeShape} />

      {/* Route Line */}
      {routeShape.length > 0 && (
          <Polyline positions={routeShape} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />
      )}

      {/* Stops */}
      {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lon]}
            icon={selectedStop?.id === stop.id ? selectedStopIcon : stopIcon}
            eventHandlers={{
                click: () => onStopSelect(stop),
            }}
          >
              <Popup>
                  <strong>{stop.name}</strong>
              </Popup>
          </Marker>
      ))}

      {/* Buses */}
      {buses.map((bus) => (
        <Marker
            key={bus.id}
            position={[bus.lat, bus.lon]}
            icon={createArrowIcon(bus.bearing, bus.routeShortName)}
        >
          <Popup>
            <strong>Bus {bus.routeShortName}</strong><br />
            To: {bus.headsign}<br />
            Speed: {bus.speed ? (bus.speed * 3.6).toFixed(1) : 0} km/h
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
