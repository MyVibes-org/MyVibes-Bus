'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { STOPS_478, ROUTE_SHAPE_478 } from '../lib/mockData';
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
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [notificationStopId, setNotificationStopId] = useState<string | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [notificationThreshold, setNotificationThreshold] = useState<number>(5);

  // Load Routes List
  useEffect(() => {
    fetch('/data/routes.json')
      .then(res => res.json())
      .then(data => {
        const routesList = Object.values(data) as RouteInfo[];
        // Ensure 478 is present for the demo
        if (!routesList.find(r => r.id === 'U4780')) {
             routesList.unshift({ id: 'U4780', short_name: '478', long_name: 'Bandar Utama - Kwasa Sentral' });
        }
        // Sort by short_name
        routesList.sort((a, b) => a.short_name.localeCompare(b.short_name, undefined, { numeric: true }));
        setRoutes(routesList);
      })
      .catch(err => console.error('Failed to load routes:', err));
  }, []);

  // Determine active stops and shape based on selection
  const currentStops = useMemo(() => {
      return selectedRouteId === 'U4780' ? STOPS_478 : [];
  }, [selectedRouteId]);

  const currentShape = useMemo(() => {
      return selectedRouteId === 'U4780' ? ROUTE_SHAPE_478 : [];
  }, [selectedRouteId]);

  // Fetch Live Buses
  useEffect(() => {
    const fetchBuses = async () => {
        try {
            const response = await fetch('/api/buses');
            if (!response.ok) throw new Error('API Failed');
            const data = await response.json();

            // Filter for selected route
            // API returns object with { buses: [...] } usually, let's check API code
            // The API returns { buses: [...] } or { error }
            if (data && Array.isArray(data.buses)) {
                 const filtered = data.buses.filter((b: any) => b.route_id === selectedRouteId || b.route_short_name === selectedRouteId);
                 setBuses(filtered);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            // No fallback to mock data as requested
            setBuses([]);
        }
    };

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000); // 10s refresh

    return () => clearInterval(interval);
  }, [selectedRouteId]);


  // Notification Logic
  useEffect(() => {
    if (!notificationStopId) return;

    const targetStop = currentStops.find(s => s.id === notificationStopId);
    if (!targetStop) return;

    // Find min ETA
    let minEta = Infinity;
    buses.forEach(bus => {
      const eta = estimateETA(
        { lat: bus.lat, lon: bus.lon },
        { lat: targetStop.lat, lon: targetStop.lon },
        currentShape,
        bus.speed ? bus.speed * 3.6 : 0 // handle missing speed
      );
      if (eta !== null && eta < minEta) minEta = eta;
    });

    // Trigger Notification
    if (minEta < notificationThreshold && minEta > 0) {
        const now = Date.now();
        if (now - lastNotificationTime > notificationThreshold * 60 * 1000) {
            if (Notification.permission === 'granted') {
                new Notification(`Bus Arriving Soon!`, {
                    body: `Route ${selectedRouteId === 'U4780' ? '478' : selectedRouteId} is ${Math.ceil(minEta)} mins away from ${targetStop.name}`,
                });
                setLastNotificationTime(now);
            }
        }
    }

  }, [buses, notificationStopId, lastNotificationTime, currentStops, currentShape, notificationThreshold, selectedRouteId]);

  // Request Notification Permission
  const toggleNotification = (stop: Stop) => {
    if (notificationStopId === stop.id) {
        setNotificationStopId(null);
    } else {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications');
            return;
        }

        if (Notification.permission === 'granted') {
            setNotificationStopId(stop.id);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    setNotificationStopId(stop.id);
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
                                setNotificationStopId(null);
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
                    notificationEnabledStopId={notificationStopId}
                    onToggleNotification={toggleNotification}
                    notificationThreshold={notificationThreshold}
                    onThresholdChange={setNotificationThreshold}
                />
            ) : (
                <div className="p-8 text-center text-gray-500">
                    <p className="mb-2 text-lg font-semibold">Stops data unavailable</p>
                    <p className="text-sm">Stop list and route shape are currently only available for Route 478.</p>
                    <p className="text-sm mt-4">You can still view live bus positions on the map.</p>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
