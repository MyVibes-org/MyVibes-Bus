import { NextRequest, NextResponse } from 'next/server';
import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fs from 'fs';
import path from 'path';

// Types from our data generation
interface TripsIndex {
  [tripId: string]: {
    routeId: string;
    directionId: '0' | '1';
    headsign: string;
  }
}

interface RoutesIndex {
  [routeId: string]: {
    id: string;
    shortName: string;
    longName: string;
    color: string;
    textColor: string;
    category: string;
  }
}

interface Bus {
  id: string;
  tripId: string;
  routeId: string;
  routeShortName: string;
  directionId: '0' | '1';
  headsign: string;
  lat: number;
  lon: number;
  bearing: number;      // degrees from North
  speed: number;        // m/s
  timestamp: number;
}

// Global cache
let tripsCache: TripsIndex | null = null;
let routesCache: RoutesIndex | null = null;

const loadStaticData = () => {
  try {
    if (!routesCache) {
      const routesPath = path.join(process.cwd(), 'public/data/routes.json');
      const routesData = fs.readFileSync(routesPath, 'utf8');
      routesCache = JSON.parse(routesData);
    }
    if (!tripsCache) {
      const tripsPath = path.join(process.cwd(), 'public/data/trips.json');
      const tripsData = fs.readFileSync(tripsPath, 'utf8');
      tripsCache = JSON.parse(tripsData);
    }
  } catch (e) {
    console.error('Error loading static GTFS data:', e);
  }
};

export async function GET(request: NextRequest) {
  loadStaticData();
  
  const categories = ['rapid-bus-kl', 'rapid-bus-mrtfeeder'];
  const allBuses: Bus[] = [];
  
  try {
    for (const category of categories) {
      const response = await fetch(
        `https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=${category}`,
        { next: { revalidate: 15 } }
      );
      
      if (!response.ok) {
          console.warn(`Failed to fetch ${category}: ${response.statusText}`);
          continue;
      }

      const buffer = await response.arrayBuffer();
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      );

      for (const entity of feed.entity) {
        if (!entity.vehicle) continue;
        
        const v = entity.vehicle;
        const tripId = v.trip?.tripId || '';
        const tripInfo = tripsCache?.[tripId];
        
        const routeId = v.trip?.routeId || tripInfo?.routeId || '';
        const routeInfo = routesCache?.[routeId];

        allBuses.push({
          id: v.vehicle?.id || '',
          tripId,
          routeId,
          routeShortName: routeInfo?.shortName || routeId,
          directionId: tripInfo?.directionId || '0',
          headsign: tripInfo?.headsign || '',
          lat: v.position?.latitude || 0,
          lon: v.position?.longitude || 0,
          bearing: v.position?.bearing || 0,
          speed: v.position?.speed || 0,
          timestamp: Number(v.timestamp) || Date.now(),
        });
      }
    }

    return NextResponse.json({ 
      buses: allBuses,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in buses API:', error);
    return NextResponse.json({ error: 'Failed to fetch bus data' }, { status: 500 });
  }
}

