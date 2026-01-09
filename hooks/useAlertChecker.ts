
import { useEffect } from 'react';
import { useAlerts } from './useAlerts';
import { Bus, Stop } from '../lib/utils';
import { estimateETA } from '../lib/routeLogic';

// We need to know the shape for the alert's route/direction.
// In this implementation, we assume we only check alerts for the CURRENTLY active route context
// provided via routeDetails. 
// If we wanted to support background alerts for other routes, we'd need to fetch their shapes.

interface RouteDetail {
  id: string;
  directions: {
    [key: string]: {
      stops: Stop[];
      shape: [number, number][];
    } | null;
  };
}

export function useAlertChecker(buses: Bus[], routeDetails: RouteDetail | null) {
  const { alerts, triggerAlert } = useAlerts();
  
  useEffect(() => {
    if (!routeDetails || !buses.length) return;

    const activeAlerts = alerts.filter(a => a.status === 'active');
    
    for (const alert of activeAlerts) {
      // 1. Check if this alert belongs to the current route (optimization)
      if (alert.routeId !== routeDetails.id) continue;

      // 2. Find buses matching this alert's route AND direction
      const matchingBuses = buses.filter(b => 
        (b.routeId === alert.routeId || b.routeShortName === alert.routeShortName) && 
        b.directionId === alert.directionId
      );
      
      if (matchingBuses.length === 0) continue;
      
      // 3. Get the stop and route shape for this direction
      const direction = routeDetails.directions[alert.directionId];
      if (!direction) continue;
      
      const targetStop = direction.stops.find(s => s.id === alert.stopId);
      if (!targetStop) continue;

      // 4. Calculate ETA for each matching bus
      for (const bus of matchingBuses) {
        const eta = estimateETA(
          { lat: bus.lat, lon: bus.lon },
          { lat: targetStop.lat, lon: targetStop.lon },
          direction.shape,
          bus.speed * 3.6 // m/s to km/h
        );
        
        // Check if ETA matches the alert threshold (with 1 min buffer/window)
        // We trigger if ETA is less than threshold but positive
        if (eta !== null && eta <= alert.minutesBefore && eta > -0.5) {
          triggerNotification(alert, eta);
          triggerAlert(alert.id); // Mark as triggered so we don't spam
          break; // One notification per alert is enough
        }
      }
    }
  }, [buses, alerts, routeDetails, triggerAlert]);
}

function triggerNotification(alert: any, eta: number) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(`Bus ${alert.routeShortName} Arriving!`, {
      body: `${Math.ceil(eta)} min to ${alert.stopName}\nHeading: ${alert.headsign}`,
      tag: alert.id, // Prevents duplicate notifications
    });
  }
}
