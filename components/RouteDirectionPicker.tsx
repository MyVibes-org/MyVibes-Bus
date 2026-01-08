
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
    <div className="p-4 bg-blue-600 text-white shadow-md z-20 flex-shrink-0">
      <div className="flex flex-col gap-3">
        {/* Header & Route Selector */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-bold text-lg whitespace-nowrap">Bus</span>
            <select
              value={selectedRouteId}
              onChange={(e) => onRouteChange(e.target.value)}
              className="text-black text-sm rounded px-2 py-1 flex-1 max-w-[200px] font-medium"
            >
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.shortName}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
            LIVE
          </span>
        </div>

        {/* Route Long Name */}
        <p className="text-blue-100 text-xs truncate">
          {selectedRoute ? selectedRoute.longName : 'Select a route'}
        </p>

        {/* Direction Toggles */}
        {routeDetails && (
          <div className="flex bg-blue-800 p-1 rounded-lg">
            <button
              className={`flex-1 py-1 px-2 text-xs rounded transition-colors truncate ${
                selectedDirectionId === '0'
                  ? 'bg-white text-blue-700 font-bold shadow-sm'
                  : 'text-blue-200 hover:bg-blue-700 hover:text-white'
              }`}
              onClick={() => onDirectionChange('0')}
              disabled={!routeDetails.directions['0']}
            >
              {routeDetails.directions['0']?.headsign || 'Direction 1'}
            </button>
            <button
              className={`flex-1 py-1 px-2 text-xs rounded transition-colors truncate ${
                selectedDirectionId === '1'
                  ? 'bg-white text-blue-700 font-bold shadow-sm'
                  : 'text-blue-200 hover:bg-blue-700 hover:text-white'
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
