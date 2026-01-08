import { Bus, Stop } from './utils';

export const STOPS_478: Stop[] = [
  { id: '1', name: 'MRT Bandar Utama (Pintu A)', lat: 3.1490, lon: 101.6150 },
  { id: '2', name: 'Centrepoint Bandar Utama', lat: 3.1450, lon: 101.6120 },
  { id: '3', name: 'Kolej KDU Damansara', lat: 3.1420, lon: 101.6080 },
  { id: '4', name: 'Dataran Sunway (Timur)', lat: 3.1510, lon: 101.5960 },
  { id: '5', name: 'MRT Surian (Pintu A)', lat: 3.1520, lon: 101.5940 },
  { id: '6', name: 'Palm Spring Damansara', lat: 3.1550, lon: 101.5920 },
  { id: '7', name: 'Seksyen 6 Kota Damansara', lat: 3.1600, lon: 101.5850 },
  { id: '8', name: 'Seksyen 8 Kota Damansara', lat: 3.1650, lon: 101.5800 },
  { id: '9', name: 'Seksyen 10 Kota Damansara', lat: 3.1700, lon: 101.5750 },
  { id: '10', name: 'MRT Kwasa Sentral', lat: 3.1760, lon: 101.5720 },
];

// Simplified shape connecting the stops
export const ROUTE_SHAPE_478: [number, number][] = [
  [3.1490, 101.6150], // Start
  [3.1450, 101.6120],
  [3.1420, 101.6080],
  [3.1480, 101.6020], // Curve
  [3.1510, 101.5960],
  [3.1520, 101.5940],
  [3.1550, 101.5920],
  [3.1600, 101.5850],
  [3.1650, 101.5800],
  [3.1700, 101.5750],
  [3.1760, 101.5720], // End
];

// Total approximate distance for basic interpolation
const TOTAL_DIST_KM = 8.0;
const SPEED_KMH = 30; // 30 km/h
const TRIP_DURATION_MINS = (TOTAL_DIST_KM / SPEED_KMH) * 60; // 16 mins
const TRIP_DURATION_MS = TRIP_DURATION_MINS * 60 * 1000;

function interpolatePosition(progress: number): { lat: number, lon: number, bearing: number } {
  // progress 0 to 1
  // Find which segment we are in
  // For simplicity, assume uniform distribution of shape points (which is false, but okay for mock)
  const totalPoints = ROUTE_SHAPE_478.length;
  const segmentLength = 1 / (totalPoints - 1);
  const index = Math.floor(progress / segmentLength);
  const segmentProgress = (progress % segmentLength) / segmentLength;

  const start = ROUTE_SHAPE_478[index];
  const end = ROUTE_SHAPE_478[index + 1] || start;

  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lon = start[1] + (end[1] - start[1]) * segmentProgress;

  // Calculate bearing
  const y = Math.sin(end[1] - start[1]) * Math.cos(end[0]);
  const x = Math.cos(start[0]) * Math.sin(end[0]) -
            Math.sin(start[0]) * Math.cos(end[0]) * Math.cos(end[1] - start[1]);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  return { lat, lon, bearing };
}

export function getMockBuses(): Bus[] {
  const now = Date.now();
  // Create 2 buses on the route
  const bus1Progress = (now % TRIP_DURATION_MS) / TRIP_DURATION_MS;
  const bus2Progress = ((now + TRIP_DURATION_MS / 2) % TRIP_DURATION_MS) / TRIP_DURATION_MS;

  const pos1 = interpolatePosition(bus1Progress);
  const pos2 = interpolatePosition(bus2Progress);

  return [
    {
      id: 'mock-bus-1',
      trip_id: 'mock-trip-1',
      route_id: '478',
      route_short_name: '478',
      route_long_name: 'Bandar Utama - Kwasa Sentral',
      lat: pos1.lat,
      lon: pos1.lon,
      bearing: pos1.bearing,
      speed: 30 / 3.6, // m/s
      timestamp: Math.floor(now / 1000),
      headsign: 'Kwasa Sentral'
    },
    {
      id: 'mock-bus-2',
      trip_id: 'mock-trip-2',
      route_id: '478',
      route_short_name: '478',
      route_long_name: 'Bandar Utama - Kwasa Sentral',
      lat: pos2.lat,
      lon: pos2.lon,
      bearing: pos2.bearing,
      speed: 30 / 3.6, // m/s
      timestamp: Math.floor(now / 1000),
      headsign: 'Kwasa Sentral'
    }
  ];
}
