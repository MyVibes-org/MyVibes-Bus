
import { useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './ui/drawer';

interface Props {
  children: React.ReactNode;
  activeTab: 'routes' | 'alerts';
  onTabChange: (tab: 'routes' | 'alerts') => void;
}

export default function BottomSheet({ children, activeTab, onTabChange }: Props) {
  // Use snap points: 0.15 (collapsed/slight), 0.45 (half), 0.95 (full)
  const [snap, setSnap] = useState<number | string | null>(0.15);

  return (
    <div className="md:hidden"> 
      <Drawer
        snapPoints={[0.15, 0.45, 0.95]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        open={true}
        modal={false}
        dismissible={false}
      >
        <DrawerContent className="md:hidden h-full max-h-[96vh] border-stone-200 bg-white/95 backdrop-blur-sm shadow-xl pb-safe">
            {/* Accessibility */}
            <DrawerTitle className="sr-only">Bus Route Navigation</DrawerTitle>
            <DrawerDescription className="sr-only">
              {activeTab === 'routes' ? 'Search and view bus routes' : 'View active bus arrival alerts'}
            </DrawerDescription>
            
            {/* Header / Tabs */}
            <div className="px-4 py-2 flex gap-2 border-b border-stone-100 shrink-0">
                <button
                    onClick={() => {
                        onTabChange('routes');
                        // Optional: Start searching or viewing route
                    }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'routes' 
                        ? 'bg-stone-800 text-white shadow-md' 
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                >
                    Routes
                </button>
                <button
                    onClick={() => {
                        onTabChange('alerts');
                        // Ensure we snap up if viewing alerts so we can see them
                        if (typeof snap === 'number' && snap < 0.45) setSnap(0.45);
                    }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'alerts' 
                        ? 'bg-amber-700 text-white shadow-md' 
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                >
                    Alerts
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-stone-50">
                {children}
            </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
