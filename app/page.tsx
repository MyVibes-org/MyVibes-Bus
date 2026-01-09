'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Stop } from '../lib/utils';
import RouteTimeline from '../components/RouteTimeline';
import RouteDirectionPicker from '../components/RouteDirectionPicker';
import AlertsPanel from '../components/AlertsPanel';
import { useAlertChecker } from '../hooks/useAlertChecker';
import RouteSearch from '../components/RouteSearch';
import BottomSheet from '../components/BottomSheet';

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
  const [activeTab, setActiveTab] = useState<'routes' | 'alerts'>('routes');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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

  // Filter routes for search
  const filteredRoutes = useMemo(() => {
     if (!searchTerm) return [];
     return routes.filter(r => 
        r.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.longName.toLowerCase().includes(searchTerm.toLowerCase())
     );
  }, [searchTerm, routes]);

  const handleRouteSelect = (routeId: string) => {
      setSelectedRouteId(routeId);
      setSearchTerm('');
      setIsSearching(false);
      setSelectedStop(null);
  };

  return (
    <main className="relative h-screen w-full bg-stone-50 overflow-hidden">
      
      {/* MAP LAYER - Absolute Full Screen */}
      <div className="absolute inset-0 z-0">
         <MapComponent
            buses={buses}
            stops={currentStops}
            routeShape={currentShape}
            selectedStop={selectedStop}
            onStopSelect={setSelectedStop}
            userLocation={null} 
            selectedRouteId={selectedRouteId}
         />
      </div>

      {/* MOBILE UI LAYER */}
      {/* Search Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 md:hidden p-4 pointer-events-none">
         <div className="pointer-events-auto bg-white/90 backdrop-blur-sm shadow-xl rounded-xl border border-stone-200/50">
             <RouteSearch 
                searchTerm={searchTerm} 
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setIsSearching(!!val);
                }} 
                isMobile={true} 
             />
             {isSearching && filteredRoutes.length > 0 && (
                 <div className="max-h-[40vh] overflow-y-auto border-t border-stone-100/50">
                     {filteredRoutes.map(r => (
                         <button
                            key={r.id}
                            className="w-full text-left p-3 border-b border-stone-50 hover:bg-stone-50 flex items-center gap-3 transition-colors"
                            onClick={() => handleRouteSelect(r.id)}
                         >
                             <span className="font-bold bg-stone-100 text-stone-800 px-2 py-1 rounded text-xs">{r.shortName}</span>
                             <span className="truncate text-sm text-stone-600 font-medium">{r.longName}</span>
                         </button>
                     ))}
                 </div>
             )}
         </div>
      </div>

      {/* Bottom Sheet Drawer */}
      <BottomSheet activeTab={activeTab} onTabChange={setActiveTab}>
         {activeTab === 'routes' ? (
             <>
                <RouteDirectionPicker 
                    routes={routes}
                    selectedRouteId={selectedRouteId}
                    selectedDirectionId={selectedDirectionId}
                    onRouteChange={handleRouteSelect}
                    onDirectionChange={setSelectedDirectionId}
                    routeDetails={routeDetails}
                />
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
             </>
         ) : (
             <AlertsPanel />
         )}
      </BottomSheet>


      {/* DESKTOP UI LAYER - Floating Sidebar */}
      <div className="hidden md:flex absolute top-4 left-4 bottom-4 w-[400px] z-10 flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-stone-200 overflow-hidden">
          {/* Header & Search */}
          <div className="p-4 border-b border-stone-100 bg-stone-50/80 shrink-0 relative z-20">
             <RouteSearch 
                searchTerm={searchTerm} 
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setIsSearching(!!val);
                }}
             />
             {isSearching && filteredRoutes.length > 0 && (
                 <div className="absolute top-[80px] left-4 right-4 bg-white rounded-xl border border-stone-200 shadow-xl z-50 max-h-[300px] overflow-y-auto">
                     {filteredRoutes.map(r => (
                         <button
                            key={r.id}
                            className="w-full text-left p-3 border-b border-stone-50 hover:bg-stone-50 flex items-center gap-3 transition-colors"
                            onClick={() => handleRouteSelect(r.id)}
                         >
                             <span className="font-bold bg-stone-100 text-stone-800 px-2 py-1 rounded text-xs">{r.shortName}</span>
                             <span className="truncate text-sm text-stone-600 font-medium">{r.longName}</span>
                         </button>
                     ))}
                 </div>
             )}
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-stone-200 bg-white shrink-0">
             <button 
                onClick={() => setActiveTab('routes')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'routes' ? 'border-amber-600 text-amber-800 bg-amber-50/30' : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
             >
                Routes
             </button>
             <button 
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'alerts' ? 'border-amber-600 text-amber-800 bg-amber-50/30' : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
             >
                My Alerts
             </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto relative bg-white">
             {activeTab === 'routes' ? (
                 <div className="flex flex-col min-h-full">
                    <RouteDirectionPicker 
                        routes={routes}
                        selectedRouteId={selectedRouteId}
                        selectedDirectionId={selectedDirectionId}
                        onRouteChange={handleRouteSelect}
                        onDirectionChange={setSelectedDirectionId}
                        routeDetails={routeDetails}
                    />
                    <div className="flex-1">
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
                            <div className="p-8 text-center text-stone-400">
                                <p className="mb-2 text-lg font-semibold">Stops data unavailable</p>
                                <p className="text-sm">Stop list not found for this route/direction.</p>
                            </div>
                        )}
                    </div>
                 </div>
             ) : (
                 <AlertsPanel />
             )}
          </div>
      </div>
    </main>
  );
}
