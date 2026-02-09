
import { useEffect, useState, useRef } from 'react';
import { useAlerts } from './useAlerts';
import { Bus, Stop } from '../lib/utils';
import { estimateETA } from '../lib/routeLogic';

interface RouteDetail {
  id: string;
  directions: {
    [key: string]: {
      stops: Stop[];
      shape: [number, number][];
    } | null;
  };
}

export function useAlertChecker(buses: Bus[], currentRouteDetails: RouteDetail | null) {
  const { alerts, triggerAlert } = useAlerts();
  const [cachedRoutes, setCachedRoutes] = useState<Record<string, RouteDetail>>({});
  const processingRef = useRef(false);

  // Sync current route details to cache
  useEffect(() => {
    if (currentRouteDetails) {
      setCachedRoutes(prev => ({
        ...prev,
        [currentRouteDetails.id]: currentRouteDetails
      }));
    }
  }, [currentRouteDetails]);

  // Fetch missing routes for active alerts
  useEffect(() => {
    const activeAlerts = alerts.filter(a => a.status === 'active');
    // Identify routes we need but don't have
    const neededRoutes = new Set(activeAlerts.map(a => a.routeId));
    
    // Also exclude current route as we already have it (or it will sync)
    if (currentRouteDetails) {
        neededRoutes.delete(currentRouteDetails.id);
    }

    neededRoutes.forEach(routeId => {
      if (!cachedRoutes[routeId]) {
        fetch(`/data/routes/${routeId}.json`)
          .then(res => {
              if (!res.ok) throw new Error('Route not found');
              return res.json();
          })
          .then(data => {
            if (data) {
              setCachedRoutes(prev => ({ ...prev, [routeId]: data }));
            }
          })
          .catch(err => console.error(`Failed to fetch route ${routeId} for alerts`, err));
      }
    });
  }, [alerts, cachedRoutes, currentRouteDetails]);

  useEffect(() => {
    if (processingRef.current || !buses.length) return;
    processingRef.current = true;

    const activeAlerts = alerts.filter(a => a.status === 'active');
    
    for (const alert of activeAlerts) {
      // Get route details from cache (or current)
      const routeData = cachedRoutes[alert.routeId] || (currentRouteDetails?.id === alert.routeId ? currentRouteDetails : null);
      if (!routeData) continue;

      // Find buses matching this alert's route AND direction
      const matchingBuses = buses.filter(b => 
        (b.routeId === alert.routeId || b.routeShortName === alert.routeShortName) && 
        b.directionId === alert.directionId
      );
      
      if (matchingBuses.length === 0) continue;
      
      const direction = routeData.directions[alert.directionId];
      if (!direction) continue;
      
      const targetStop = direction.stops.find(s => s.id === alert.stopId);
      if (!targetStop) continue;

      for (const bus of matchingBuses) {
        const eta = estimateETA(
          { lat: bus.lat, lon: bus.lon },
          { lat: targetStop.lat, lon: targetStop.lon },
          direction.shape,
          bus.speed * 3.6 
        );
        
        // Check if ETA matches the alert threshold (with 1 min buffer/window)
        // We trigger if ETA is less than threshold but positive (or slightly negative if "arriving")
        if (eta !== null && eta <= alert.minutesBefore && eta > -0.5) {
          triggerNotification(alert, eta);
          triggerAlert(alert.id); 
          break; // One notification per alert is enough
        }
      }
    }
    
    processingRef.current = false;
  }, [buses, alerts, cachedRoutes, currentRouteDetails, triggerAlert]);
}

function triggerNotification(alert: any, eta: number) {
  if (!('Notification' in window)) return;
  
  const title = `Bus ${alert.routeShortName} Arriving!`;
  const body = `${Math.ceil(eta)} min to ${alert.stopName}\nHeading: ${alert.headsign}`;
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      tag: alert.id,
      icon: '/favicon.ico', // Optional: Add an icon if available
    });
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
