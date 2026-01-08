
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const CATEGORIES = ['rapid-bus-kl', 'rapid-bus-mrtfeeder'];
const OUTPUT_DIR = 'public/data';

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

interface TripsIndex {
  [tripId: string]: {
    routeId: string;
    directionId: '0' | '1';
    headsign: string;
  }
}

interface StopsIndex {
  [stopId: string]: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  }
}

interface StopOnRoute {
  id: string;
  name: string;
  lat: number;
  lon: number;
  sequence: number;
}

interface DirectionData {
  headsign: string;
  stops: StopOnRoute[];
  shape: [number, number][];
}

interface RouteDetail {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  textColor: string;
  directions: {
    '0': DirectionData | null;
    '1': DirectionData | null;
  }
}

async function main() {
  console.log('🚌 Generating GTFS data...');

  // Ensure output directories exist
  await fs.mkdir(path.join(OUTPUT_DIR, 'routes'), { recursive: true });

  const allRoutes: RoutesIndex = {};
  const allTrips: TripsIndex = {};
  const allStops: StopsIndex = {};

  for (const category of CATEGORIES) {
    console.log(`📦 Processing ${category}...`);

    try {
      // 1. Fetch ZIP from data.gov.my
      const response = await fetch(
        `https://api.data.gov.my/gtfs-static/prasarana?category=${category}`
      );
      
      if (!response.ok) {
          console.error(`Failed to fetch ${category}: ${response.statusText}`);
          continue;
      }

      const buffer = await response.arrayBuffer();

      // 2. Extract with JSZip
      const zip = await JSZip.loadAsync(buffer);

      // Helper to read and parse CSV
      const readCsv = async (filename: string) => {
        const file = zip.file(filename);
        if (!file) return [];
        const text = await file.async('string');
        return parse(text, { columns: true, skip_empty_lines: true });
      };

      // 3. Parse files
      const routes = await readCsv('routes.txt');
      const trips = await readCsv('trips.txt');
      const stops = await readCsv('stops.txt');
      const stopTimes = await readCsv('stop_times.txt');
      const shapes = await readCsv('shapes.txt');

      console.log(`   - Routes: ${routes.length}`);
      console.log(`   - Trips: ${trips.length}`);
      console.log(`   - Stops: ${stops.length}`);

      // 4. Process Routes
      for (const r of routes) {
        allRoutes[r.route_id] = {
          id: r.route_id,
          shortName: r.route_short_name,
          longName: r.route_long_name,
          color: r.route_color || '000000',
          textColor: r.route_text_color || 'FFFFFF',
          category: category
        };
      }

      // 5. Process Stops
      const stopsMap = new Map<string, any>();
      for (const s of stops) {
        const stopData = {
          id: s.stop_id,
          name: s.stop_name,
          lat: parseFloat(s.stop_lat),
          lon: parseFloat(s.stop_lon)
        };
        allStops[s.stop_id] = stopData;
        stopsMap.set(s.stop_id, stopData);
      }

      // 6. Process Trips
      const routeTrips = new Map<string, any[]>();
      
      for (const t of trips) {
        allTrips[t.trip_id] = {
          routeId: t.route_id,
          directionId: t.direction_id as '0' | '1',
          headsign: t.trip_headsign
        };

        if (!routeTrips.has(t.route_id)) {
            routeTrips.set(t.route_id, []);
        }
        routeTrips.get(t.route_id)?.push(t);
      }
      
      // 7. Group Stop Times by Trip
      // We need to pick one pattern per direction for the route detail
      const stopTimesByTrip = new Map<string, any[]>();
      for (const st of stopTimes) {
          if (!stopTimesByTrip.has(st.trip_id)) {
              stopTimesByTrip.set(st.trip_id, []);
          }
          stopTimesByTrip.get(st.trip_id)?.push(st);
      }

       // 8. Process Shapes
      const shapesByShapeId = new Map<string, [number, number][]>();
      for (const sh of shapes) {
          if (!shapesByShapeId.has(sh.shape_id)) {
              shapesByShapeId.set(sh.shape_id, []);
          }
           // Store as [lat, lon]
          shapesByShapeId.get(sh.shape_id)?.push([parseFloat(sh.shape_pt_lat), parseFloat(sh.shape_pt_lon)]);
      }


      // 9. Generate Route Details
      for (const [routeId, rTrips] of routeTrips) {
          const route = allRoutes[routeId];
          if(!route) continue;

          const routeDetail: RouteDetail = {
              ...route,
              directions: { '0': null, '1': null }
          };

          // Process each direction
          for (const directionId of ['0', '1'] as const) {
              const tripsInDir = rTrips.filter(t => t.direction_id === directionId);
              if (tripsInDir.length === 0) continue;

              // Pick the most common shape or just the first trip's shape
              // Ideally update to pick the most "representative" trip (e.g. max stops)
              // For now, let's pick the trip with the most stops to ensure we cover the full route
              
              let selectedTrip = tripsInDir[0];
              let maxStops = 0;

              for(const t of tripsInDir) {
                  const st = stopTimesByTrip.get(t.trip_id);
                  if (st && st.length > maxStops) {
                      maxStops = st.length;
                      selectedTrip = t;
                  }
              }

              if (!selectedTrip) continue;

              const selectedStopTimes = stopTimesByTrip.get(selectedTrip.trip_id);
              if(!selectedStopTimes) continue;

              // Sort by sequence
              selectedStopTimes.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

              const stopsOnRoute: StopOnRoute[] = selectedStopTimes.map((st, index) => {
                  const s = stopsMap.get(st.stop_id);
                  return {
                      id: st.stop_id,
                      name: s ? s.name : st.stop_id,
                      lat: s ? s.lat : 0,
                      lon: s ? s.lon : 0,
                      sequence: index // re-index to be safe
                  };
              });

              const shape = shapesByShapeId.get(selectedTrip.shape_id) || [];

              routeDetail.directions[directionId] = {
                  headsign: selectedTrip.trip_headsign,
                  stops: stopsOnRoute,
                  shape: shape
              };
          }

          // Write route detail file
          await fs.writeFile(
              path.join(OUTPUT_DIR, 'routes', `${routeId}.json`),
              JSON.stringify(routeDetail)
          );
      }

    } catch (e) {
      console.error(`Error processing ${category}:`, e);
    }
  }

  // Write indexes
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'routes.json'),
    JSON.stringify(allRoutes)
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'trips.json'),
    JSON.stringify(allTrips)
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'stops.json'),
    JSON.stringify(allStops)
  );

  console.log('✅ GTFS data generation complete!');
}

main();
