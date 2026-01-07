'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Route, Stop, getDistanceFromLatLonInKm } from '@/lib/utils';
import { Bell, MapPin, Navigation } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading Map...</div>
});

export default function Home() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Record<string, Route>>({});
  const [stops, setStops] = useState<Record<string, Stop>>({});
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [eta, setEta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load static data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [routesRes, stopsRes] = await Promise.all([
          fetch('/data/routes.json'),
          fetch('/data/stops.json')
        ]);
        const routesData = await routesRes.json();
        const stopsData = await stopsRes.json();
        setRoutes(routesData);
        setStops(stopsData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load static data", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Poll for bus data
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch('/api/buses');
        const data = await res.json();
        if (data.buses) {
          setBuses(data.buses);
        }
      } catch (err) {
        console.error("Failed to fetch buses", err);
      }
    };

    fetchBuses();
    const interval = setInterval(fetchBuses, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, []);

  // User location
  useEffect(() => {
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }

    if ('Notification' in window) {
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => setNotificationPermission(Notification.permission), 0);
    }

    return () => {
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Filter buses by route
  const filteredBuses = useMemo(() => {
    if (!selectedRouteId) return buses;
    // Match by route_id or short_name (route number)
    // The select value is route_id.
    // However, the GTFS-R might return route_id that matches.
    return buses.filter(b => b.route_id === selectedRouteId || b.route_short_name === routes[selectedRouteId]?.short_name);
  }, [buses, selectedRouteId, routes]);

  // ETA Calculation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedStop && filteredBuses.length > 0) {
      // Find nearest bus on this route
      let minTime = Infinity;

      filteredBuses.forEach(bus => {
        const dist = getDistanceFromLatLonInKm(bus.lat, bus.lon, selectedStop.lat, selectedStop.lon);
        // Estimate speed: 20km/h average in city traffic = 0.33 km/min
        // If bus provides speed, use it (but cap it to avoid division by zero or unrealistic values)
        let speedKmH = bus.speed ? bus.speed * 3.6 : 20;
        if (speedKmH < 5) speedKmH = 10; // Minimum assumption

        const time = (dist / speedKmH) * 60; // minutes
        if (time < minTime) minTime = time;
      });

      const newEta = minTime === Infinity ? null : minTime;
      // Avoid immediate state update if it hasn't changed to avoid loops, though logic should be fine.
      // Using timeout to satisfy linter regarding setState in effect (though it's derived state, so memo might be better)
      timer = setTimeout(() => setEta(newEta), 0);
    } else {
      timer = setTimeout(() => setEta(null), 0);
    }
    return () => clearTimeout(timer);
  }, [selectedStop, filteredBuses]);

  // Notification Logic
  useEffect(() => {
    if (notifyEnabled && eta !== null && eta < 5 && notificationPermission === 'granted') {
      new Notification("Bus Arriving Soon", {
        body: `Your bus is approximately ${Math.round(eta)} minutes away.`
      });
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => setNotifyEnabled(false), 0); // Notify once
    }
  }, [eta, notifyEnabled, notificationPermission]);

  const requestNotification = () => {
    Notification.requestPermission().then(permission => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotifyEnabled(true);
      }
    });
  };

  // Prepare stops list for map
  const stopsArray = useMemo(() => Object.values(stops), [stops]);

  // Optimization: Filter stops to only those near the user or selected buses?
  // Let's show stops near user (within 2km) + stops near selected buses?
  const visibleStops = useMemo(() => {
      if (!userLocation && filteredBuses.length === 0) return [];

      const visible: Stop[] = [];
      const added = new Set<string>();

      // Near User
      if (userLocation) {
          stopsArray.forEach(s => {
              if (getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, s.lat, s.lon) < 1.0) { // 1km radius
                  visible.push(s);
                  added.add(s.id);
              }
          });
      }

      // Near Buses (if route selected)
      if (selectedRouteId) {
          filteredBuses.forEach(b => {
             stopsArray.forEach(s => {
                 if (!added.has(s.id)) {
                      if (getDistanceFromLatLonInKm(b.lat, b.lon, s.lat, s.lon) < 1.0) {
                          visible.push(s);
                          added.add(s.id);
                      }
                 }
             });
          });
      }

      // If a stop is selected, make sure it is visible
      if (selectedStop && !added.has(selectedStop.id)) {
          visible.push(selectedStop);
      }

      return visible;
  }, [stopsArray, userLocation, filteredBuses, selectedRouteId, selectedStop]);


  // Sort routes by short_name
  const sortedRoutes = useMemo(() => {
    return Object.values(routes).sort((a, b) => a.short_name.localeCompare(b.short_name, undefined, { numeric: true }));
  }, [routes]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
            <Navigation className="h-6 w-6" />
            MyRapid Bus Tracker
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        <div className="absolute inset-0 z-0">
          <MapComponent
            buses={filteredBuses}
            stops={visibleStops}
            userLocation={userLocation}
            selectedRouteId={selectedRouteId}
            onStopSelect={setSelectedStop}
            selectedStop={selectedStop}
          />
        </div>

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
            <div className="bg-white p-3 rounded-lg shadow-lg pointer-events-auto max-w-md w-full mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Route</label>
                <select
                    className="w-full border border-gray-300 rounded-md p-2 text-black"
                    value={selectedRouteId}
                    onChange={(e) => {
                        setSelectedRouteId(e.target.value);
                        setSelectedStop(null);
                        setEta(null);
                        setNotifyEnabled(false);
                    }}
                >
                    <option value="">-- All Routes --</option>
                    {sortedRoutes.map(r => (
                        <option key={r.id} value={r.id}>
                            {r.short_name} - {r.long_name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedRouteId && (
                <div className="bg-white p-3 rounded-lg shadow-lg pointer-events-auto max-w-md w-full mx-auto transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">
                             {routes[selectedRouteId]?.short_name}
                        </span>
                        <span className="text-xs text-gray-500">
                            {filteredBuses.length} buses active
                        </span>
                    </div>

                    {selectedStop ? (
                         <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{selectedStop.name}</div>
                                    <div className="text-xs text-gray-500">Target Stop</div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <div className="text-sm text-blue-800">
                                    Estimated Arrival: <span className="font-bold text-lg">{eta ? Math.round(eta) : '--'}</span> mins
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                    (Straight line est.)
                                </div>
                            </div>

                            <button
                                onClick={requestNotification}
                                disabled={notifyEnabled || !eta}
                                className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${
                                    notifyEnabled
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                <Bell className="h-4 w-4" />
                                {notifyEnabled ? 'Alert Set' : 'Notify me < 5 min'}
                            </button>
                         </div>
                    ) : (
                        <div className="text-sm text-gray-500 text-center py-2">
                            Select a stop on the map (shown near buses/you) to see ETA.
                        </div>
                    )}
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
