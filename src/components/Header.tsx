import React from 'react';
import { Observation, LifeListFilter } from '../types';
import appLogo from '../assets/images/bold_app_logo_1786709233012.jpg';
import { 
  Plus, 
  Table, 
  Network, 
  MapPin, 
  Download, 
  SlidersHorizontal,
  Layers,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  observations: Observation[];
  filter: LifeListFilter;
  setFilter: React.Dispatch<React.SetStateAction<LifeListFilter>>;
  onOpenLogModal: () => void;
  onOpenExportImport: () => void;
  onOpenMobileMore?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  observations,
  filter,
  setFilter,
  onOpenLogModal,
  onOpenExportImport,
  onOpenMobileMore
}) => {
  const uniqueSpecies = new Set(observations.map(o => o.scientificName.toLowerCase())).size;
  const wildCount = new Set(observations.filter(o => o.wildStatus === 'wild').map(o => o.scientificName.toLowerCase())).size;
  const captiveCount = new Set(observations.filter(o => o.wildStatus === 'captive').map(o => o.scientificName.toLowerCase())).size;
  const totalVenues = new Set(observations.map(o => o.venueName.trim()).filter(Boolean)).size;

  // Determine active primary navigation tab (Life List, Taxonomy Tree, Locations)
  const isLifeListView = filter.viewMode === 'compact_table' || filter.viewMode === 'ledger_cards';

  return (
    <header className="bg-white border-b border-[#e6dfd3] sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <img
            src={appLogo}
            alt="Life Logo"
            referrerPolicy="no-referrer"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover shadow-2xs border border-[#233a2b]/30 shrink-0"
          />
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1f241d] font-serif-species leading-tight">
              Life
            </h1>
            <p className="text-[10px] text-[#6b7568] hidden xs:block">
              Field & Aquarium Life List
            </p>
          </div>
        </div>

        {/* Center: Clean 3-Tab Desktop Navigation */}
        <nav className="hidden md:flex items-center bg-[#f4efe6] p-1 rounded-lg border border-[#ded6c9] text-xs">
          <button
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              viewMode: prev.viewMode === 'ledger_cards' ? 'ledger_cards' : 'compact_table' 
            }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              isLifeListView
                ? 'bg-white text-[#1f241d] shadow-2xs'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-[#2e4a36]" />
            <span>Life List</span>
            <span className="text-[10px] font-mono-tag bg-[#eef3ed] text-[#2e4a36] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {uniqueSpecies}
            </span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, viewMode: 'taxonomy_tree' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              filter.viewMode === 'taxonomy_tree'
                ? 'bg-white text-[#1f241d] shadow-2xs'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-[#2e4a36]" />
            <span>Taxonomy Tree</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, viewMode: 'venues_matrix' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              filter.viewMode === 'venues_matrix'
                ? 'bg-white text-[#1f241d] shadow-2xs'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#2e4a36]" />
            <span>Locations</span>
            {totalVenues > 0 && (
              <span className="text-[10px] font-mono-tag bg-[#eee8dc] text-[#6b7568] px-1.5 py-0.2 rounded-full font-medium ml-0.5">
                {totalVenues}
              </span>
            )}
          </button>
        </nav>

        {/* Right: Key Stats + Unified "+ Log Sighting" Action */}
        <div className="flex items-center gap-2">
          {/* Compact Stats Pill (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono-tag text-[#6b7568] bg-[#f9f8f5] px-2.5 py-1 rounded-md border border-[#e6dfd3]">
            <span className="text-[#2e4a36] font-semibold">{wildCount} Wild</span>
            <span>·</span>
            <span className="text-[#99582a] font-semibold">{captiveCount} Captive</span>
          </div>

          {/* Backup / Data Button */}
          <button
            onClick={onOpenExportImport}
            title="Export CSV / JSON backup or restore data"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#576054] hover:text-[#1f241d] hover:bg-[#f2ede4] border border-[#e6dfd3] rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Data</span>
          </button>

          {/* SINGLE UNIFIED PRIMARY BUTTON: + Log Sighting */}
          <button
            id="unified-log-btn"
            onClick={onOpenLogModal}
            title="Scan zoo signs, rapid walkthrough log, or single entry (⌘K / ⌘Q)"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-[#2e4a36] hover:bg-[#233a2b] rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Sighting</span>
            <span className="hidden md:inline-block px-1.5 py-0.2 bg-white/20 text-white text-[9px] rounded font-mono-tag">
              ⌘K
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
