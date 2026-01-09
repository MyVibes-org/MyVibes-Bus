'use client';

import { useState } from 'react';
import { Stop, Bus } from '../lib/utils';
import { estimateETA } from '../lib/routeLogic';
import { useAlerts } from '../hooks/useAlerts';
import AlertDialog from './AlertDialog';
import { Bell, BellRing } from 'lucide-react';

interface RouteTimelineProps {
  stops: Stop[];
  buses: Bus[];
  routeShape: [number, number][];
  selectedStop: Stop | null;
  onStopSelect: (stop: Stop) => void;
  routeId: string;
  routeShortName: string;
  directionId: '0' | '1';
  headsign: string;
}

export default function RouteTimeline({
  stops,
  buses,
  routeShape,
  selectedStop,
  onStopSelect,
  routeId,
  routeShortName,
  directionId,
  headsign
}: RouteTimelineProps) {
  const { addNewAlert, alerts } = useAlerts();
  const [alertStop, setAlertStop] = useState<Stop | null>(null);
  const [minutesBefore, setMinutesBefore] = useState(5);

  const activeAlerts = alerts.filter(a => a.status === 'active');

  const handleAddAlert = () => {
    if (!alertStop) return;
    
    addNewAlert({
      routeId,
      routeShortName,
      directionId,
      headsign,
      stopId: alertStop.id,
      stopName: alertStop.name,
      minutesBefore
    });
    setAlertStop(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="relative pl-4 py-4 space-y-6 flex-1 overflow-y-auto">
        {/* Vertical Line */}
        <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-stone-300 z-0"></div>

        {stops.map((stop) => {
          // Find nearest ETA from any bus
          let minEta = Infinity;

          buses.forEach(bus => {
            const eta = estimateETA(
              { lat: bus.lat, lon: bus.lon },
              { lat: stop.lat, lon: stop.lon },
              routeShape,
              bus.speed * 3.6 // convert m/s to km/h
            );
            if (eta !== null && eta < minEta) {
              minEta = eta;
            }
          });

          const etaText = minEta === Infinity
            ? 'Departed'
            : minEta < 1
              ? 'Arriving'
              : `${Math.ceil(minEta)} min`;

          const isPassed = minEta === Infinity;
          const isSelected = selectedStop?.id === stop.id;
          
          // Check if an alert exists for this stop and this route/direction
          const hasAlert = activeAlerts.some(a => 
            a.stopId === stop.id && 
            a.routeId === routeId && 
            a.directionId === directionId
          );

          return (
            <div
              key={stop.id}
              className={`relative z-10 flex items-start cursor-pointer transition-opacity ${isPassed ? 'opacity-50' : 'opacity-100'}`}
              onClick={() => onStopSelect(stop)}
            >
              {/* Dot */}
              <div className={`w-6 h-6 rounded-full border-4 shrink-0 mr-4 bg-white transition-all ${isSelected ? 'border-amber-600 scale-110 shadow-lg' : 'border-stone-400'}`}></div>

              <div className={`flex-1 p-3 rounded-lg shadow-sm border transition-colors ${isSelected ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100 hover:border-amber-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-stone-800">{stop.name}</h3>
                    <p className={`text-sm font-medium ${isPassed ? 'text-stone-400' : 'text-green-700'}`}>
                      {etaText}
                    </p>
                  </div>

                  {/* Alert Button */}
                  {!hasAlert && (
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              setAlertStop(stop);
                          }}
                          className="p-2 text-stone-300 hover:text-amber-600 transition-colors"
                          title="Set Alert"
                      >
                         <Bell className="w-5 h-5" />
                      </button>
                  )}
                  {hasAlert && (
                      <span className="text-amber-500 p-2" title="Alert Active"><BellRing className="w-5 h-5 fill-current" /></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Dialog */}
      {alertStop && (
        <AlertDialog
          stopName={alertStop.name}
          minutesBefore={minutesBefore}
          onMinutesChange={setMinutesBefore}
          onConfirm={handleAddAlert}
          onCancel={() => setAlertStop(null)}
        />
      )}
    </div>
  );
}
