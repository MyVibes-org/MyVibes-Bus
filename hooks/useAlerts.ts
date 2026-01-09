
import { useState, useEffect } from 'react';
import { Alert, getAlerts, addAlert, removeAlert, markAlertTriggered, cleanupTriggeredAlerts } from '../lib/alertManager';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const refreshAlerts = () => {
    setAlerts(getAlerts());
  };

  useEffect(() => {
    refreshAlerts();
    
    // Cleanup old alerts on mount
    cleanupTriggeredAlerts();
    refreshAlerts();

    // Listen for storage changes (cross-tab sync)
    const handleStorage = () => refreshAlerts();
    window.addEventListener('storage', handleStorage);
    
    // Custom event for same-tab sync
    window.addEventListener('alerts-updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('alerts-updated', handleStorage);
    };
  }, []);

  const addNewAlert = (alert: Omit<Alert, 'id' | 'createdAt' | 'status'>) => {
    addAlert(alert);
    window.dispatchEvent(new Event('alerts-updated'));
    refreshAlerts();
  };

  const deleteAlert = (id: string) => {
    removeAlert(id);
    window.dispatchEvent(new Event('alerts-updated'));
    refreshAlerts();
  };

  const triggerAlert = (id: string) => {
    markAlertTriggered(id);
    window.dispatchEvent(new Event('alerts-updated'));
    refreshAlerts();
  };

  return { alerts, addNewAlert, deleteAlert, triggerAlert };
}
