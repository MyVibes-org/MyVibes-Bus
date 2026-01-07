export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface Bus {
  id: string;
  trip_id: string;
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  lat: number;
  lon: number;
  bearing: number;
  speed: number;
  timestamp: number;
  headsign: string;
}

export interface Route {
  id: string;
  short_name: string;
  long_name: string;
  color: string;
  text_color: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}
