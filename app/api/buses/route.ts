import { NextRequest, NextResponse } from 'next/server';
import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fs from 'fs';
import path from 'path';

// Define the types for the static data
interface RouteInfo {
  id: string;
  short_name: string;
  long_name: string;
  color: string;
  text_color: string;
}

interface TripInfo {
  route_id: string;
  direction_id: string;
  headsign: string;
}

// Cache the static data in memory to avoid reading files on every request
// In a serverless environment (like Vercel), this might be re-initialized frequently,
// but it's better than reading from disk every time.
let routesCache: Record<string, RouteInfo> | null = null;
let tripsCache: Record<string, TripInfo> | null = null;

const loadStaticData = () => {
  if (!routesCache) {
    try {
      const routesPath = path.join(process.cwd(), 'public/data/routes.json');
      const routesData = fs.readFileSync(routesPath, 'utf8');
      routesCache = JSON.parse(routesData);
    } catch (e) {
      console.error('Error loading routes.json:', e);
    }
  }

  if (!tripsCache) {
    try {
      const tripsPath = path.join(process.cwd(), 'public/data/trips.json');
      const tripsData = fs.readFileSync(tripsPath, 'utf8');
      tripsCache = JSON.parse(tripsData);
    } catch (e) {
      console.error('Error loading trips.json:', e);
    }
  }
};

export async function GET(request: NextRequest) {
  // Load static data if not loaded
  loadStaticData();

  try {
    const response = await fetch('https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl', {
      method: 'GET',
      headers: {
        // 'Cache-Control': 'no-cache', // Data is updated every 30s
      },
      next: { revalidate: 15 } // Next.js caching
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS-R: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    const buses = feed.entity.map((entity) => {
      if (entity.vehicle) {
        const vehicle = entity.vehicle;
        const tripId = vehicle.trip?.tripId || '';
        const tripInfo = tripsCache ? tripsCache[tripId] : null;
        const routeId = vehicle.trip?.routeId || tripInfo?.route_id || '';
        const routeInfo = routesCache ? routesCache[routeId] : null;

        // Fallback for routeId if not present in vehicle.trip
        // Sometimes vehicle.trip.routeId is empty, so we look up tripId in trips.json

        return {
          id: vehicle.vehicle?.id,
          trip_id: tripId,
          route_id: routeId,
          route_short_name: routeInfo?.short_name || routeId, // Fallback to ID
          route_long_name: routeInfo?.long_name || '',
          lat: vehicle.position?.latitude,
          lon: vehicle.position?.longitude,
          bearing: vehicle.position?.bearing,
          speed: vehicle.position?.speed,
          timestamp: vehicle.timestamp,
          headsign: tripInfo?.headsign || ''
        };
      }
      return null;
    }).filter(Boolean);

    return NextResponse.json({ buses });

  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json({ error: 'Failed to fetch bus data' }, { status: 500 });
  }
}
