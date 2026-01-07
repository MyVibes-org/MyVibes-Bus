'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { STOPS_478, ROUTE_SHAPE_478, getMockBuses } from '../lib/mockData';
import { Bus, Stop } from '../lib/utils';
import RouteTimeline from '../components/RouteTimeline';
import { estimateETA } from '../lib/routeLogic';

const MapComponent = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Map...</div>
});

export default function Home() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [notificationStopId, setNotificationStopId] = useState<string | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [notificationThreshold, setNotificationThreshold] = useState<number>(5);
  const [useMock, setUseMock] = useState<boolean>(true);

  // Mock Data Setup
  const stops = STOPS_478;
  const routeShape = ROUTE_SHAPE_478;

  // Fetch Logic
  useEffect(() => {
    const fetchBuses = async () => {
        if (useMock) {
            setBuses(getMockBuses());
        } else {
            try {
                const response = await fetch('/api/buses');
                if (!response.ok) throw new Error('API Failed');
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                     setBuses(data);
                } else {
                    // Fallback to mock if API returns empty array (common in dev/sandbox)
                    console.warn('API returned empty, falling back to mock');
                    setBuses(getMockBuses());
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setBuses(getMockBuses()); // Fallback
            }
        }
    };

    // Initial fetch
    fetchBuses();
    const interval = setInterval(fetchBuses, 1000);

    return () => clearInterval(interval);
  }, [useMock]);


  // Notification Logic
  useEffect(() => {
    if (!notificationStopId) return;

    const targetStop = stops.find(s => s.id === notificationStopId);
    if (!targetStop) return;

    // Find min ETA
    let minEta = Infinity;
    buses.forEach(bus => {
      const eta = estimateETA(
        { lat: bus.lat, lon: bus.lon },
        { lat: targetStop.lat, lon: targetStop.lon },
        routeShape,
        bus.speed * 3.6 // speed usually in m/s, convert to km/h if needed by logic
      );
      if (eta !== null && eta < minEta) minEta = eta;
    });

    // Trigger Notification
    if (minEta < notificationThreshold && minEta > 0) {
        const now = Date.now();
        // Cooldown: Don't notify again if we notified recently (e.g., within threshold timeframe)
        if (now - lastNotificationTime > notificationThreshold * 60 * 1000) {
            if (Notification.permission === 'granted') {
                new Notification(`Bus Arriving Soon!`, {
                    body: `Route 478 is ${Math.ceil(minEta)} mins away from ${targetStop.name}`,
                    // icon: '/icon.png'
                });
                setLastNotificationTime(now);
            }
        }
    }

  }, [buses, notificationStopId, lastNotificationTime, stops, routeShape, notificationThreshold]);

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

  return (
    <main className="flex flex-col h-screen md:flex-row bg-gray-50 overflow-hidden">
      {/* Map Panel (Mobile: Top, Desktop: Right) */}
      <div className="h-1/2 md:h-full md:w-2/3 md:order-2 relative bg-gray-200">
         <MapComponent
            buses={buses}
            stops={stops}
            routeShape={routeShape}
            selectedStop={selectedStop}
            onStopSelect={setSelectedStop}
            userLocation={null} // TODO: Add geolocation
            selectedRouteId="478"
         />
      </div>

      {/* List Panel (Mobile: Bottom, Desktop: Left) */}
      <div className="h-1/2 md:h-full md:w-1/3 md:order-1 flex flex-col border-r border-gray-200 z-10 shadow-xl bg-white">
        <div className="p-4 bg-blue-600 text-white shadow-md z-20 flex-shrink-0">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold flex items-center">
                        <span>Route 478</span>
                        <span className="ml-2 text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full font-bold">LIVE</span>
                    </h1>
                    <p className="text-blue-100 text-sm mt-1">Bandar Utama - Kwasa Sentral</p>
                </div>
                {/* Data Toggle */}
                <button
                    onClick={() => setUseMock(!useMock)}
                    className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded border border-blue-500 transition-colors"
                >
                    {useMock ? 'Using Mock Data' : 'Using Real API'}
                </button>
            </div>

            <div className="mt-2 text-xs bg-blue-700/50 p-2 rounded border border-blue-500/30 flex items-start gap-2">
                <span>ℹ️</span>
                <span>{useMock ? 'Simulated data for reliability.' : 'Attempting to fetch real GTFS data.'}</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
            <RouteTimeline
                stops={stops}
                buses={buses}
                routeShape={routeShape}
                selectedStop={selectedStop}
                onStopSelect={setSelectedStop}
                notificationEnabledStopId={notificationStopId}
                onToggleNotification={toggleNotification}
                notificationThreshold={notificationThreshold}
                onThresholdChange={setNotificationThreshold}
            />
        </div>
      </div>
    </main>
  );
}
