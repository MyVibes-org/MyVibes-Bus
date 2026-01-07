'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import L from 'leaflet';
import { Bus, Stop } from '../lib/utils';
import { useEffect } from 'react';

// Icons
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // A simple bus icon
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

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
  className: 'hue-rotate-180' // CSS trick to change color if possible, or just bigger
});

const userIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});


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
            icon={busIcon}
        >
          <Popup>
            <strong>{bus.route_short_name}</strong><br />
            {bus.route_long_name}<br />
            Speed: {bus.speed ? (bus.speed * 3.6).toFixed(1) : 0} km/h
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
