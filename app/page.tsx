'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Stop } from '../lib/utils';
import RouteTimeline from '../components/RouteTimeline';
import RouteDirectionPicker from '../components/RouteDirectionPicker';
import AlertsPanel from '../components/AlertsPanel';
import { useAlertChecker } from '../hooks/useAlertChecker';
import { useGeolocation } from '../hooks/useGeolocation';
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
  const [buses, setBuses] = useState<Bus[]>([]); // All buses
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedDirectionId, setSelectedDirectionId] = useState<'0' | '1'>('0');
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [activeTab, setActiveTab] = useState<'routes' | 'alerts'>('routes');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Loading States
  const [isLoadingBuses, setIsLoadingBuses] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Geolocation
  const { latitude, longitude } = useGeolocation();
  const userLocation = useMemo(() => 
    (latitude && longitude) ? { lat: latitude, lng: longitude } : null,
    [latitude, longitude]
  );

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
        
        // If current selection is invalid, reset to null
        if (selectedRouteId && !routesList.find(r => r.id === selectedRouteId)) {
             setSelectedRouteId(null);
        }
      })
      .catch(err => console.error('Failed to load routes:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Route Details (Stops/Shape)
  useEffect(() => {
    if (!selectedRouteId) {
        setRouteDetails(null);
        return;
    }

    setIsLoadingRoute(true);
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
        })
        .finally(() => setIsLoadingRoute(false));
  }, [selectedRouteId]);

  // Determine active stops and shape based on selection
  const currentStops = useMemo(() => {
      return routeDetails?.directions?.[selectedDirectionId]?.stops || [];
  }, [routeDetails, selectedDirectionId]);

  const currentShape = useMemo(() => {
      return routeDetails?.directions?.[selectedDirectionId]?.shape || [];
  }, [routeDetails, selectedDirectionId]);

  // Fetch Live Buses with Page Visibility
  useEffect(() => {
    let isMounted = true;
    
    const fetchBuses = async () => {
        if (document.hidden) return; // Pause if tab hidden

        try {
            const response = await fetch('/api/buses');
            if (!response.ok) throw new Error('API Failed');
            const data = await response.json();

            if (isMounted && data && Array.isArray(data.buses)) {
                 setBuses(data.buses);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            if (isMounted) setBuses([]);
        } finally {
            if (isMounted) setIsLoadingBuses(false);
        }
    };

    fetchBuses();
    const interval = setInterval(fetchBuses, 10000); 

    const handleVisibilityChange = () => {
        if (!document.hidden) fetchBuses();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        isMounted = false;
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Filter buses for display
  const filteredBuses = useMemo(() => {
      if (!selectedRouteId) return buses; // Show all buses if no route selected

      const selectedRoute = routes.find(r => r.id === selectedRouteId);
      if (!selectedRoute) return [];

      return buses.filter(b => 
         (b.routeId === selectedRouteId || b.routeShortName === selectedRoute.shortName) &&
         b.directionId === selectedDirectionId
      );
  }, [buses, selectedRouteId, selectedDirectionId, routes]);

  // Initialize Alert Checker (Pass ALL buses)
  useAlertChecker(buses, routeDetails);

  // Filter routes for search
  const filteredRoutes = useMemo(() => {
     if (!searchTerm && !isSearching) return [];
     if (!searchTerm && isSearching) return routes;
     
     return routes.filter(r => 
        r.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.longName.toLowerCase().includes(searchTerm.toLowerCase())
     );
  }, [searchTerm, routes, isSearching]);

  const handleRouteSelect = useCallback((routeId: string) => {
      setSelectedRouteId(routeId);
      setSearchTerm('');
      setIsSearching(false);
      setSelectedStop(null);
  }, []);

  return (
    <main className="relative h-screen w-full bg-stone-50 overflow-hidden">
      
      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0">
         <MapComponent
            buses={filteredBuses}
            stops={currentStops}
            routeShape={currentShape}
            selectedStop={selectedStop}
            onStopSelect={setSelectedStop}
            userLocation={userLocation} 
            selectedRouteId={selectedRouteId || ''}
         />
      </div>

      {/* Loading Overlay for Buses (Initial only) */}
      {isLoadingBuses && buses.length === 0 && (
          <div className="absolute top-4 right-4 z-[60] bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse text-amber-600">
              Connecting to satellites...
          </div>
      )}

      {/* MOBILE UI LAYER */}
      <div className="absolute top-0 left-0 right-0 z-[100] md:hidden p-4 pointer-events-none">
         <div className="pointer-events-auto bg-white/90 backdrop-blur-sm shadow-xl rounded-xl border border-stone-200/50">
             <RouteSearch 
                searchTerm={searchTerm} 
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setIsSearching(!!val);
                }} 
                onFocus={() => setIsSearching(true)}
                onClose={() => setIsSearching(false)}
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
             selectedRouteId ? (
                 <>
                    <RouteDirectionPicker 
                        routes={routes}
                        selectedRouteId={selectedRouteId}
                        selectedDirectionId={selectedDirectionId}
                        onRouteChange={handleRouteSelect}
                        onDirectionChange={setSelectedDirectionId}
                        routeDetails={routeDetails}
                    />
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        {isLoadingRoute ? (
                            <div className="p-8 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            </div>
                        ) : currentStops.length > 0 ? (
                            <RouteTimeline
                                stops={currentStops}
                                buses={filteredBuses}
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
                 </>
             ) : (
                <div className="p-8 text-center text-stone-500">
                    <p className="mb-2 text-lg font-bold">Welcome to Rapid Bus PWA</p>
                    <p className="text-sm">Search for a bus route above to get started.</p>
                </div>
             )
         ) : (
             <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <AlertsPanel />
             </div>
         )}
      </BottomSheet>


      {/* DESKTOP UI LAYER */}
      
      {/* 1. Floating Search Bar */}
      <div className="hidden md:block absolute top-4 left-4 z-50 w-[400px]">
          <RouteSearch 
            searchTerm={searchTerm} 
            onSearchChange={(val) => {
                setSearchTerm(val);
                setIsSearching(!!val);
            }}
          />
           {isSearching && filteredRoutes.length > 0 && (
               <div className="bg-white rounded-xl shadow-lg border border-stone-100 max-h-[400px] overflow-y-auto mt-2">
                   {filteredRoutes.map(r => (
                       <button
                          key={r.id}
                          className="w-full text-left p-3 hover:bg-stone-50 flex items-center gap-3 transition-colors border-b border-stone-50 last:border-0"
                          onClick={() => handleRouteSelect(r.id)}
                       >
                           <span className="font-bold bg-stone-100 text-stone-800 px-2 py-1 rounded text-xs shrink-0">{r.shortName}</span>
                           <span className="truncate text-sm text-stone-600 font-medium">{r.longName}</span>
                       </button>
                   ))}
               </div>
           )}
      </div>

      {/* 2. Sidebar Content */}
      {selectedRouteId && (
        <div className="hidden md:flex absolute top-[88px] left-4 bottom-4 w-[400px] z-40 flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
            
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
            <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
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
                      <div className="flex-1 overflow-y-auto overflow-x-hidden">
                          {isLoadingRoute ? (
                              <div className="h-full flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                              </div>
                          ) : currentStops.length > 0 ? (
                              <RouteTimeline
                                  stops={currentStops}
                                  buses={filteredBuses}
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
                   </>
               ) : (
                   <div className="flex-1 overflow-y-auto overflow-x-hidden">
                       <AlertsPanel />
                   </div>
               )}
            </div>
        </div>
      )}
    </main>
  );
}
