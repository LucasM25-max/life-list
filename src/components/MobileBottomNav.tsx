import React from 'react';
import { LifeListFilter } from '../types';
import { 
  Table, 
  Network, 
  MapPin, 
  SlidersHorizontal,
  Plus
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: LifeListFilter['viewMode'];
  onSelectView: (mode: LifeListFilter['viewMode']) => void;
  onOpenLogModal: () => void;
  onOpenMore: () => void;
  isFilterActive: boolean;
  totalLogs: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenLogModal,
  onOpenMore,
  isFilterActive
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e6dfd3] px-2 py-1.5 shadow-lg safe-area-bottom"
    >
      <div className="flex items-center justify-around">
        {/* Sightings List */}
        <button
          onClick={() => onSelectView('compact_table')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-colors min-w-[56px] cursor-pointer ${
            currentView === 'compact_table' || currentView === 'ledger_cards'
              ? 'text-[#2e4a36] font-bold'
              : 'text-[#6b7568]'
          }`}
        >
          <Table className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Life List</span>
        </button>

        {/* Tree of Life */}
        <button
          onClick={() => onSelectView('taxonomy_tree')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-colors min-w-[56px] cursor-pointer ${
            currentView === 'taxonomy_tree'
              ? 'text-[#2e4a36] font-bold'
              : 'text-[#6b7568]'
          }`}
        >
          <Network className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Tree</span>
        </button>

        {/* PROMINENT CENTER LOG / SCAN BUTTON */}
        <button
          onClick={onOpenLogModal}
          className="flex flex-col items-center justify-center -mt-5 bg-[#2e4a36] hover:bg-[#233a2a] text-white p-3.5 rounded-full shadow-lg active:scale-95 transition-all border-4 border-white cursor-pointer"
          title="Log Sighting or Scan Zoo Sign"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-bold tracking-tight px-1 font-mono-tag">LOG</span>
        </button>

        {/* Locations & Enclosures */}
        <button
          onClick={() => onSelectView('venues_matrix')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-colors min-w-[56px] cursor-pointer ${
            currentView === 'venues_matrix'
              ? 'text-[#2e4a36] font-bold'
              : 'text-[#6b7568]'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Locations</span>
        </button>

        {/* More / Filters / Backups */}
        <button
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-colors min-w-[56px] relative cursor-pointer ${
            isFilterActive || currentView === 'milestones' ? 'text-[#2e4a36] font-bold' : 'text-[#6b7568]'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">More</span>
          {isFilterActive && (
            <span className="w-2 h-2 rounded-full bg-[#99582a] absolute top-1 right-3" />
          )}
        </button>
      </div>
    </nav>
  );
};
