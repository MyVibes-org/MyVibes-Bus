
import { useAlerts } from '../hooks/useAlerts';
import { Bell, BellRing, ArrowRight, Trash2 } from 'lucide-react';

export default function AlertsPanel() {
  const { alerts, deleteAlert } = useAlerts();
  const activeAlerts = alerts.filter(a => a.status === 'active');

  if (activeAlerts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm bg-gray-50 border-b">
        No active alerts. Tap <BellRing className="w-4 h-4 inline" /> on a stop to add one.
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border-b border-yellow-100">
      <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Bell className="w-4 h-4" /> Active Alerts ({activeAlerts.length})
      </h3>

      <div className="space-y-2">
        {activeAlerts.map(alert => (
          <div key={alert.id} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm flex justify-between items-center group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {alert.routeShortName}
                </span>
                <span className="text-xs text-gray-500 truncate block max-w-[150px]">
                  <ArrowRight className="w-3 h-3 inline mx-1" /> {alert.headsign}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {alert.stopName}
              </p>
              <p className="text-xs text-yellow-600 font-medium">
                Notify {alert.minutesBefore}m before
              </p>
            </div>
            
            <button
              onClick={() => deleteAlert(alert.id)}
              className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove alert"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
