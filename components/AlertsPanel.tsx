
import { useAlerts } from '../hooks/useAlerts';

export default function AlertsPanel() {
  const { alerts, deleteAlert } = useAlerts();
  const activeAlerts = alerts.filter(a => a.status === 'active');

  if (activeAlerts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm bg-gray-50 border-b">
        No active alerts. Tap 🔔 on a stop to add one.
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border-b border-yellow-100">
      <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span>🔔</span> Active Alerts ({activeAlerts.length})
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
                  → {alert.headsign}
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
