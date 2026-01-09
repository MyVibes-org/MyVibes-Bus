'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Stop } from '../lib/utils';
import RouteTimeline from '../components/RouteTimeline';
import { estimateETA } from '../lib/routeLogic';

const MapComponent = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Map...</div>
});

interface RouteInfo {
  id: string;
  short_name: string;
  long_name: string;
}

export default function Home() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('U4780'); // Default to 478
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  // New notification state
  // alerts: stopId -> threshold (minutes)
  const [alerts, setAlerts] = useState<Record<string, number>>({});
  const [lastNotificationTimes, setLastNotificationTimes] = useState<Record<string, number>>({});

  // Load Routes List
  useEffect(() => {
    fetch('/data/routes.json')
      .then(res => res.json())
      .then(data => {
        // data can be array or object depending on generation script
        // My script generates Array.
        const routesList = Array.isArray(data) ? data : Object.values(data) as RouteInfo[];

        // Ensure 478 is present for the demo if not in list
        if (!routesList.find(r => r.id === 'U4780')) {
             routesList.unshift({ id: 'U4780', short_name: '478', long_name: 'Bandar Utama - Kwasa Sentral' });
        }

        // Sort by short_name
        routesList.sort((a, b) => a.short_name.localeCompare(b.short_name, undefined, { numeric: true }));
        setRoutes(routesList);
      })
      .catch(err => console.error('Failed to load routes:', err));
  }, []);

  // Fetch Route Details (Stops/Shape)
  useEffect(() => {
    setRouteDetails(null);
    fetch(`/data/routes/${selectedRouteId}.json`)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
        })
        .then(data => setRouteDetails(data))
        .catch(err => {
            console.error('Failed to load route details', err);
            setRouteDetails(null);
        });
  }, [selectedRouteId]);

  // Determine active stops and shape based on selection
  const currentStops = useMemo(() => {
      // Prefer direction 0, fallback to 1 or empty
      return routeDetails?.directions?.['0']?.stops || routeDetails?.directions?.['1']?.stops || [];
  }, [routeDetails]);

  const currentShape = useMemo(() => {
      return routeDetails?.directions?.['0']?.shape || routeDetails?.directions?.['1']?.shape || [];
  }, [routeDetails]);

  // Fetch Live Buses
  useEffect(() => {
    const fetchBuses = async () => {
        try {
            const response = await fetch('/api/buses');
            if (!response.ok) throw new Error('API Failed');
            const data = await response.json();

            if (data && Array.isArray(data.buses)) {
                 const filtered = data.buses.filter((b: any) => b.route_id === selectedRouteId || b.route_short_name === selectedRouteId);
                 setBuses(filtered);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setBuses([]);
        }
    };

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000); // 10s refresh

    return () => clearInterval(interval);
  }, [selectedRouteId]);


  // Notification Logic
  useEffect(() => {
    if (Object.keys(alerts).length === 0) return;

    const now = Date.now();
    const newLastNotificationTimes = { ...lastNotificationTimes };
    let updated = false;

    Object.entries(alerts).forEach(([stopId, threshold]) => {
      const targetStop = currentStops.find((s: Stop) => s.id === stopId);
      if (!targetStop) return;

      // Find min ETA and verify direction
      let minEta = Infinity;

      buses.forEach(bus => {
        const eta = estimateETA(
          { lat: bus.lat, lon: bus.lon },
          { lat: targetStop.lat, lon: targetStop.lon },
          currentShape,
          bus.speed ? bus.speed * 3.6 : 0
        );

        if (eta !== null && eta < minEta) {
           // Direction Check
           // Calculate bearing of route near bus (simplification: bearing to stop)

           const dLon = (targetStop.lon - bus.lon);
           const y = Math.sin(dLon * Math.PI / 180) * Math.cos(targetStop.lat * Math.PI / 180);
           const x = Math.cos(bus.lat * Math.PI / 180) * Math.sin(targetStop.lat * Math.PI / 180) -
                     Math.sin(bus.lat * Math.PI / 180) * Math.cos(targetStop.lat * Math.PI / 180) * Math.cos(dLon * Math.PI / 180);
           let brng = Math.atan2(y, x) * 180 / Math.PI;
           brng = (brng + 360) % 360; // Bearing from bus to stop

           let diff = Math.abs(bus.bearing - brng);
           if (diff > 180) diff = 360 - diff;

           // If angle is less than 90, we are generally facing the stop.
           if (diff < 90) {
               minEta = eta;
           }
        }
      });

      // Trigger Notification
      if (minEta < threshold && minEta > 0) {
          if (!lastNotificationTimes[stopId] || now - lastNotificationTimes[stopId] > threshold * 60 * 1000) {
              if (Notification.permission === 'granted') {
                  const routeName = selectedRouteId === 'U4780' ? '400' : (routes.find(r => r.id === selectedRouteId)?.short_name || selectedRouteId);
                  new Notification(`Bus Arriving!`, {
                      body: `Bus ${routeName} is ~${Math.ceil(minEta)} mins from ${targetStop.name}`,
                  });
                  newLastNotificationTimes[stopId] = now;
                  updated = true;
              }
          }
      }
    });

    if (updated) {
        setLastNotificationTimes(newLastNotificationTimes);
    }

  }, [buses, alerts, lastNotificationTimes, currentStops, currentShape, selectedRouteId, routes]);

  // Request Notification Permission and Add Alert
  const toggleNotification = (stop: Stop) => {
    if (alerts[stop.id]) {
        // Remove alert
        const newAlerts = { ...alerts };
        delete newAlerts[stop.id];
        setAlerts(newAlerts);
    } else {
        // Add alert
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications');
            return;
        }

        const addAlert = () => {
             const minutes = window.prompt(`Notify how many minutes before arrival at ${stop.name}?`, "5");
             if (minutes === null) return;
             const threshold = parseInt(minutes);
             if (isNaN(threshold) || threshold <= 0) {
                 alert("Please enter a valid number of minutes.");
                 return;
             }
             setAlerts(prev => ({ ...prev, [stop.id]: threshold }));
        };

        if (Notification.permission === 'granted') {
            addAlert();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    addAlert();
                }
            });
        } else {
            alert('Notifications are blocked. Please enable them in your browser settings.');
        }
    }
  };

  const selectedRouteInfo = routes.find(r => r.id === selectedRouteId);

  return (
    <main className="flex flex-col h-screen md:flex-row bg-gray-50 overflow-hidden">
      {/* Map Panel (Mobile: Top, Desktop: Right) */}
      <div className="h-1/2 md:h-full md:w-2/3 md:order-2 relative bg-gray-200">
         <MapComponent
            buses={buses}
            stops={currentStops}
            routeShape={currentShape}
            selectedStop={selectedStop}
            onStopSelect={setSelectedStop}
            userLocation={null} // TODO: Add geolocation
            selectedRouteId={selectedRouteId}
         />
      </div>

      {/* List Panel (Mobile: Bottom, Desktop: Left) */}
      <div className="h-1/2 md:h-full md:w-1/3 md:order-1 flex flex-col border-r border-gray-200 z-10 shadow-xl bg-white">
        <div className="p-4 bg-blue-600 text-white shadow-md z-20 flex-shrink-0">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold flex items-center">
                        <span className="mr-2">Route</span>
                        <select
                            value={selectedRouteId}
                            onChange={(e) => {
                                setSelectedRouteId(e.target.value);
                                setSelectedStop(null);
                            }}
                            className="text-black text-sm rounded px-2 py-1 max-w-[150px]"
                        >
                            {routes.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.short_name}
                                </option>
                            ))}
                        </select>
                    </h1>
                    <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full font-bold">LIVE</span>
                </div>
                <p className="text-blue-100 text-sm truncate">
                    {selectedRouteInfo ? selectedRouteInfo.long_name : 'Select a route'}
                </p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
            {currentStops.length > 0 ? (
                <RouteTimeline
                    stops={currentStops}
                    buses={buses}
                    routeShape={currentShape}
                    selectedStop={selectedStop}
                    onStopSelect={setSelectedStop}
                    alerts={alerts}
                    onToggleNotification={toggleNotification}
                />
            ) : (
                <div className="p-8 text-center text-gray-500">
                    <p className="mb-2 text-lg font-semibold">Stops data unavailable</p>
                    <p className="text-sm">Stop list and route shape not found for this route ID.</p>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
