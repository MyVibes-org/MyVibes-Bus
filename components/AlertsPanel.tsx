
import { useAlerts } from '../hooks/useAlerts';
import { Bell, BellRing, ArrowRight, Trash2 } from 'lucide-react';

export default function AlertsPanel() {
  const { alerts, deleteAlert } = useAlerts();
  const activeAlerts = alerts.filter(a => a.status === 'active');

  if (activeAlerts.length === 0) {
    return (
      <div className="p-4 text-center text-stone-400 text-sm bg-stone-50 border-b border-stone-100">
        No active alerts. Tap <BellRing className="w-4 h-4 inline" /> on a stop to add one.
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50/50 border-b border-amber-100">
      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-700" /> Active Alerts ({activeAlerts.length})
      </h3>

      <div className="space-y-2">
        {activeAlerts.map(alert => (
          <div key={alert.id} className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm flex justify-between items-center group hover:border-amber-300 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-stone-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {alert.routeShortName}
                </span>
                <span className="text-xs text-gray-500 truncate block max-w-[150px]">
                  <ArrowRight className="w-3 h-3 inline mx-1" /> {alert.headsign}
                </span>
              </div>
              <p className="text-sm font-semibold text-stone-800 truncate">
                {alert.stopName}
              </p>
              <p className="text-xs text-amber-700 font-medium">
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
