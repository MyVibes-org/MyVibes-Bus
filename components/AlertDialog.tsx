import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  stopName: string;
  minutesBefore: number;
  onMinutesChange: (m: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AlertDialog({
  stopName,
  minutesBefore,
  onMinutesChange,
  onConfirm,
  onCancel
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200">
        <h3 className="font-bold text-lg mb-2">Set Alert</h3>
        <p className="text-stone-600 text-sm mb-4">
          Get notified when bus arrives at <span className="font-semibold text-amber-700">{stopName}</span>
        </p>

        <label className="block text-sm font-medium text-stone-700 mb-2">
          Notify me {minutesBefore} minutes before
        </label>
        
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={minutesBefore}
          onChange={(e) => onMinutesChange(parseInt(e.target.value))}
          className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer mb-6 accent-amber-600"
        />

          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-800 shadow-md shadow-amber-200 transition-colors"
          >
            Set Alert
          </button>
      </div>
    </div>,
    document.body
  );
}
