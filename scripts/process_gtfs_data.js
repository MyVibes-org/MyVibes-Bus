const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DATA_DIR = path.join(__dirname, '../public/data');
const TEMP_DIR = path.join(__dirname, '../temp_gtfs');
const ROUTES_OUTPUT_DIR = path.join(DATA_DIR, 'routes');

const CATEGORIES = ['rapid-bus-kl', 'rapid-bus-mrtfeeder'];

// Manual override for specific routes (e.g., U4780 -> 400)
// We will read the manual file and inject/merge it.
const MANUAL_ROUTES = ['U4780'];

async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function processGtfsData() {
  console.log('Processing GTFS data...');

  const allRoutes = {};
  const allTrips = {}; // trip_id -> { route_id, direction_id, headsign }

  // To build route details, we need stops, stop_times, trips, shapes
  // This can be heavy, so we'll try to be efficient.

  for (const category of CATEGORIES) {
    const extractPath = path.join(TEMP_DIR, category);

    if (!fs.existsSync(extractPath)) {
        console.warn(`Skipping ${category} (not found)`);
        continue;
    }

    console.log(`Parsing ${category}...`);

    try {
        // 1. Routes
        const routes = await parseCsv(path.join(extractPath, 'routes.txt'));
        routes.forEach(r => {
            allRoutes[r.route_id] = {
                id: r.route_id,
                short_name: r.route_short_name,
                long_name: r.route_long_name,
                color: r.route_color,
                text_color: r.route_text_color
            };
        });

        // 2. Trips
        const trips = await parseCsv(path.join(extractPath, 'trips.txt'));
        // Group trips by route for easier processing later
        const tripsByRoute = {}; // route_id -> [trip]

        trips.forEach(t => {
            allTrips[t.trip_id] = {
                route_id: t.route_id,
                direction_id: t.direction_id,
                headsign: t.trip_headsign,
                shape_id: t.shape_id
            };

            if (!tripsByRoute[t.route_id]) tripsByRoute[t.route_id] = [];
            tripsByRoute[t.route_id].push(t);
        });

        // 3. Stops
        const stops = await parseCsv(path.join(extractPath, 'stops.txt'));
        const stopsMap = {}; // stop_id -> stop obj
        stops.forEach(s => {
            stopsMap[s.stop_id] = {
                id: s.stop_id,
                name: s.stop_name,
                lat: parseFloat(s.stop_lat),
                lon: parseFloat(s.stop_lon)
            };
        });
        // Save stops.json global lookup
        // fs.writeFileSync(path.join(DATA_DIR, 'stops.json'), JSON.stringify(stopsMap));

        // 4. Shapes
        // Shapes can be huge. We only load if needed or stream process?
        // Let's load all for now, assuming memory holds.
        const shapes = await parseCsv(path.join(extractPath, 'shapes.txt'));
        const shapesMap = {}; // shape_id -> [{lat, lon, seq}]
        shapes.forEach(s => {
            if (!shapesMap[s.shape_id]) shapesMap[s.shape_id] = [];
            shapesMap[s.shape_id].push({
                lat: parseFloat(s.shape_pt_lat),
                lon: parseFloat(s.shape_pt_lon),
                seq: parseInt(s.shape_pt_sequence)
            });
        });

        // Sort shapes
        Object.values(shapesMap).forEach(arr => arr.sort((a, b) => a.seq - b.seq));

        // 5. Stop Times
        // We need to link stops to routes.
        // Strategy: For each route, pick one representative trip per direction to show stops and shape.
        const stopTimes = await parseCsv(path.join(extractPath, 'stop_times.txt'));
        const stopTimesByTrip = {}; // trip_id -> [stop_time]
        stopTimes.forEach(st => {
             if (!stopTimesByTrip[st.trip_id]) stopTimesByTrip[st.trip_id] = [];
             stopTimesByTrip[st.trip_id].push({
                 stop_id: st.stop_id,
                 seq: parseInt(st.stop_sequence)
             });
        });

        // Process each route to generate detailed JSON
        for (const routeId in tripsByRoute) {
            const routeTrips = tripsByRoute[routeId];
            const routeDetail = {
                ...allRoutes[routeId],
                directions: {}
            };

            // Find representative trips for direction 0 and 1
            const dirs = ['0', '1'];
            for (const dir of dirs) {
                const trip = routeTrips.find(t => t.direction_id === dir);
                if (trip) {
                    const shapePoints = shapesMap[trip.shape_id]?.map(p => [p.lat, p.lon]) || [];
                    const tripStopTimes = stopTimesByTrip[trip.trip_id] || [];
                    tripStopTimes.sort((a, b) => a.seq - b.seq);

                    const routeStops = tripStopTimes.map(st => stopsMap[st.stop_id]).filter(Boolean);

                    routeDetail.directions[dir] = {
                        trip_id: trip.trip_id,
                        shape: shapePoints,
                        stops: routeStops
                    };
                }
            }

            // Write detailed file
            fs.writeFileSync(path.join(ROUTES_OUTPUT_DIR, `${routeId}.json`), JSON.stringify(routeDetail, null, 2));
        }

    } catch (err) {
        console.error(`Error processing ${category}:`, err);
    }
  }

  // Inject Manual Routes
  for (const manualId of MANUAL_ROUTES) {
      try {
          const manualPath = path.join(ROUTES_OUTPUT_DIR, `${manualId}.json`);
          if (fs.existsSync(manualPath)) {
              const manualData = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
              allRoutes[manualId] = {
                  id: manualData.id,
                  short_name: manualData.short_name,
                  long_name: manualData.long_name,
                  color: manualData.color,
                  text_color: manualData.text_color
              };
              console.log(`Injected manual route ${manualId} (Bus ${manualData.short_name})`);
          }
      } catch (e) {
          console.error(`Failed to inject ${manualId}:`, e);
      }
  }

  // Write summary files
  fs.writeFileSync(path.join(DATA_DIR, 'routes.json'), JSON.stringify(Object.values(allRoutes), null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'trips.json'), JSON.stringify(allTrips, null, 2));

  console.log('GTFS processing complete.');
}

processGtfsData().catch(console.error);
