
import { Search, X, ChevronDown } from 'lucide-react';

interface Props {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isMobile?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
}

export default function RouteSearch({ searchTerm, onSearchChange, isMobile = false, onFocus, onClose }: Props) {
  return (
    <div className={`relative z-30 ${isMobile ? 'shadow-lg' : 'mb-4'}`}>
      <div className="relative group flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400 group-focus-within:text-amber-700 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border-none rounded-xl leading-5 bg-white placeholder-stone-400 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 sm:text-sm shadow-sm transition-all"
            placeholder="Search bus route (e.g. 400)"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onFocus}
          />
          {/* Close/Clear Button */}
          {(searchTerm || onClose) && (
            <button 
              onClick={() => {
                if (searchTerm) {
                  onSearchChange('');
                } else {
                  onClose?.();
                }
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 p-2"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
