
import React from 'react';

interface Route {
  id: string;
  shortName: string;
  longName: string;
}

interface DirectionData {
  headsign: string;
}

interface RouteDetail {
  id: string;
  directions: {
    '0': DirectionData | null;
    '1': DirectionData | null;
  };
}

interface Props {
  routes: Route[];
  selectedRouteId: string;
  selectedDirectionId: '0' | '1';
  onRouteChange: (routeId: string) => void;
  onDirectionChange: (directionId: '0' | '1') => void;
  routeDetails: RouteDetail | null;
}

export default function RouteDirectionPicker({
  routes,
  selectedRouteId,
  selectedDirectionId,
  onRouteChange,
  onDirectionChange,
  routeDetails
}: Props) {
  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  return (

    <div className="p-4 bg-white border-b border-stone-200 shrink-0 sticky top-0 z-20 md:static md:z-auto">
      <div className="flex flex-col gap-3">
        {/* Header & Route Selector */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
             <div className="bg-stone-900 text-white font-bold px-2 py-1 rounded text-lg shrink-0">
                {selectedRoute ? selectedRoute.shortName : '...'}
             </div>
             <p className="font-bold text-stone-800 text-lg leading-tight truncate">
                {selectedRoute ? selectedRoute.longName : 'Select a route'}
             </p>
          </div>
          <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse shrink-0 ml-2">
            LIVE
          </span>
        </div>

        {/* Direction Toggles */}
        {routeDetails && (
          <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
            <button
              className={`flex-1 py-2 px-2 text-xs rounded-md transition-all font-medium truncate ${
                selectedDirectionId === '0'
                  ? 'bg-white text-amber-700 shadow-sm border border-stone-100'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              onClick={() => onDirectionChange('0')}
              disabled={!routeDetails.directions['0']}
            >
              {routeDetails.directions['0']?.headsign || 'Direction 1'}
            </button>
            <button
              className={`flex-1 py-2 px-2 text-xs rounded-md transition-all font-medium truncate ${
                selectedDirectionId === '1'
                  ? 'bg-white text-amber-700 shadow-sm border border-stone-100'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              onClick={() => onDirectionChange('1')}
              disabled={!routeDetails.directions['1']}
            >
               {routeDetails.directions['1']?.headsign || 'Direction 2'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
