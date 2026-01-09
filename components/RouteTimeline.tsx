'use client';

import { Stop, Bus } from '../lib/utils';
import { estimateETA } from '../lib/routeLogic';

interface RouteTimelineProps {
  stops: Stop[];
  buses: Bus[];
  routeShape: [number, number][];
  selectedStop: Stop | null;
  onStopSelect: (stop: Stop) => void;
  alerts: Record<string, number>;
  onToggleNotification: (stop: Stop) => void;
}

export default function RouteTimeline({
  stops,
  buses,
  routeShape,
  selectedStop,
  onStopSelect,
  alerts,
  onToggleNotification
}: RouteTimelineProps) {

  return (
    <div className="flex flex-col h-full">
      <div className="relative pl-4 py-4 space-y-6 flex-1 overflow-y-auto">
      {/* Vertical Line */}
      <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-blue-200 z-0"></div>

      {stops.map((stop, index) => {
        // Find nearest ETA from any bus
        let minEta = Infinity;
        // let approachingBus = null;

        buses.forEach(bus => {
          const eta = estimateETA(
            { lat: bus.lat, lon: bus.lon },
            { lat: stop.lat, lon: stop.lon },
            routeShape,
            bus.speed * 3.6 // convert m/s to km/h
          );
          if (eta !== null && eta < minEta) {
            minEta = eta;
            // approachingBus = bus;
          }
        });

        const etaText = minEta === Infinity
          ? 'Departed'
          : minEta < 1
            ? 'Arriving'
            : `${Math.ceil(minEta)} min`;

        const isPassed = minEta === Infinity;
        const isSelected = selectedStop?.id === stop.id;
        const isNotifying = !!alerts[stop.id];
        const threshold = alerts[stop.id];

        return (
          <div
            key={stop.id}
            className={`relative z-10 flex items-start cursor-pointer transition-opacity ${isPassed ? 'opacity-50' : 'opacity-100'}`}
            onClick={() => onStopSelect(stop)}
          >
            {/* Dot */}
            <div className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mr-4 bg-white transition-all ${isSelected ? 'border-blue-600 scale-110' : 'border-blue-400'}`}></div>

            <div className={`flex-1 p-3 rounded-lg shadow-sm border transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{stop.name}</h3>
                  <p className={`text-sm font-medium ${isPassed ? 'text-gray-400' : 'text-green-600'}`}>
                    {etaText}
                  </p>
                  {isNotifying && (
                      <p className="text-xs text-blue-500 mt-1">
                          Alert: {threshold}m
                      </p>
                  )}
                </div>

                {/* Notification Button */}
                {!isPassed && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleNotification(stop);
                        }}
                        className={`p-2 rounded-full transition-colors ${isNotifying ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
                        title={isNotifying ? `Alert set for ${threshold} mins` : "Set alert"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill={isNotifying ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                    </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
