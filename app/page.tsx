'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Stop } from '../lib/utils';
import RouteTimeline from '../components/RouteTimeline';
import RouteDirectionPicker from '../components/RouteDirectionPicker';
import AlertsPanel from '../components/AlertsPanel';
import { useAlertChecker } from '../hooks/useAlertChecker';

const MapComponent = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Map...</div>
});

interface RouteInfo {
  id: string;
  shortName: string;
  longName: string;
}

export default function Home() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('U4000'); // Default to 400
  const [selectedDirectionId, setSelectedDirectionId] = useState<'0' | '1'>('0');
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  // Load Routes List
  useEffect(() => {
    fetch('/data/routes.json')
      .then(res => res.json())
      .then(data => {
        const routesList = Array.isArray(data) ? data : Object.values(data) as RouteInfo[];

        // Sort by shortName, handle numeric sorting
        routesList.sort((a, b) => {
            const numA = parseInt(a.shortName.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.shortName.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        
        setRoutes(routesList);
        
        // If current selection not in list, pick first
        if (routesList.length > 0 && !routesList.find(r => r.id === selectedRouteId)) {
             setSelectedRouteId(routesList[0].id);
        }
      })
      .catch(err => console.error('Failed to load routes:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Route Details (Stops/Shape)
  useEffect(() => {
    setRouteDetails(null);
    fetch(`/data/routes/${selectedRouteId}.json`)
        .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
        })
        .then(data => {
            setRouteDetails(data);
            // Default to direction 0 if available, else 1
            if (data.directions['0']) setSelectedDirectionId('0');
            else if (data.directions['1']) setSelectedDirectionId('1');
        })
        .catch(err => {
            console.error('Failed to load route details', err);
            setRouteDetails(null);
        });
  }, [selectedRouteId]);

  // Determine active stops and shape based on selection
  const currentStops = useMemo(() => {
      return routeDetails?.directions?.[selectedDirectionId]?.stops || [];
  }, [routeDetails, selectedDirectionId]);

  const currentShape = useMemo(() => {
      return routeDetails?.directions?.[selectedDirectionId]?.shape || [];
  }, [routeDetails, selectedDirectionId]);

  // Fetch Live Buses
  useEffect(() => {
    const fetchBuses = async () => {
        try {
            const response = await fetch('/api/buses');
            if (!response.ok) throw new Error('API Failed');
            const data = await response.json();

            if (data && Array.isArray(data.buses)) {
                 const filtered = data.buses.filter((b: any) => 
                    (b.routeId === selectedRouteId || b.routeShortName === selectedRouteId) &&
                    b.directionId === selectedDirectionId
                 );
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
  }, [selectedRouteId, selectedDirectionId]);


  // Initialize Alert Checker
  useAlertChecker(buses, routeDetails);

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
        
        <RouteDirectionPicker 
            routes={routes}
            selectedRouteId={selectedRouteId}
            selectedDirectionId={selectedDirectionId}
            onRouteChange={(id) => {
                setSelectedRouteId(id);
                setSelectedStop(null);
            }}
            onDirectionChange={setSelectedDirectionId}
            routeDetails={routeDetails}
        />

        <AlertsPanel />

        <div className="flex-1 overflow-y-auto bg-gray-50">
            {currentStops.length > 0 ? (
                <RouteTimeline
                    stops={currentStops}
                    buses={buses}
                    routeShape={currentShape}
                    selectedStop={selectedStop}
                    onStopSelect={setSelectedStop}
                    routeId={selectedRouteId}
                    routeShortName={routes.find(r => r.id === selectedRouteId)?.shortName || ''}
                    directionId={selectedDirectionId}
                    headsign={routeDetails?.directions?.[selectedDirectionId]?.headsign || ''}
                />
            ) : (
                <div className="p-8 text-center text-gray-500">
                    <p className="mb-2 text-lg font-semibold">Stops data unavailable</p>
                    <p className="text-sm">Stop list and route shape not found for this route/direction.</p>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}

