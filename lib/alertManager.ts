
export interface Alert {
  id: string;                    // UUID
  routeId: string;               // "U4000"
  routeShortName: string;        // "400"
  directionId: '0' | '1';        // Which direction
  headsign: string;              // "HAB LEBUH PUDU"
  stopId: string;
  stopName: string;
  minutesBefore: number;         // Notify N minutes before ETA
  createdAt: number;             // timestamp
  status: 'active' | 'triggered' | 'expired';
}

const STORAGE_KEY = 'rapidbus_alerts';

export function getAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'status'>): Alert {
  const alerts = getAlerts();
  const newAlert: Alert = {
    ...alert,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
    createdAt: Date.now(),
    status: 'active',
  };
  alerts.push(newAlert);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  return newAlert;
}

export function removeAlert(id: string): void {
  const alerts = getAlerts().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function markAlertTriggered(id: string): void {
  const alerts = getAlerts().map(a => 
    a.id === id ? { ...a, status: 'triggered' as const } : a
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function cleanupTriggeredAlerts(): void {
  if (typeof window === 'undefined') return;
  // Remove alerts that were triggered more than 1 hour ago
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const alerts = getAlerts().filter(a => 
    a.status !== 'triggered' || a.createdAt > oneHourAgo
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}
