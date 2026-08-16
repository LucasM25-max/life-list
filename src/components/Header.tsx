import React from 'react';
import { Observation, LifeListFilter, TripRecord } from '../types';
import appLogo from '../assets/images/bold_app_logo_1786709233012.jpg';
import { 
  Plus, 
  Table, 
  Network, 
  MapPin, 
  Download, 
  Trophy,
  Navigation
} from 'lucide-react';

interface HeaderProps {
  observations: Observation[];
  filter: LifeListFilter;
  setFilter: React.Dispatch<React.SetStateAction<LifeListFilter>>;
  activeTrip?: TripRecord | null;
  onOpenLogModal: () => void;
  onOpenExportImport: () => void;
  onOpenStartTrip?: () => void;
  onOpenEndTrip?: () => void;
  onOpenMobileMore?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  observations,
  filter,
  setFilter,
  activeTrip,
  onOpenLogModal,
  onOpenExportImport,
  onOpenStartTrip,
  onOpenEndTrip
}) => {
  const uniqueSpecies = new Set(observations.map(o => o.scientificName.toLowerCase())).size;
  const wildCount = new Set(observations.filter(o => o.wildStatus === 'wild').map(o => o.scientificName.toLowerCase())).size;
  const captiveCount = new Set(observations.filter(o => o.wildStatus === 'captive').map(o => o.scientificName.toLowerCase())).size;
  const totalVenues = new Set(observations.map(o => o.venueName.trim()).filter(Boolean)).size;

  // Determine active primary navigation tab (Life List, Taxonomy Tree, Locations)
  const isLifeListView = filter.viewMode === 'compact_table' || filter.viewMode === 'ledger_cards';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#e6dfd3] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <img
            src={appLogo}
            alt="Life Logo"
            referrerPolicy="no-referrer"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-2xs border border-[#233a2b]/30 shrink-0"
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

        {/* Center: Clean Desktop Navigation */}
        <nav className="hidden md:flex items-center bg-[#f4efe6] p-1 rounded-xl border border-[#ded6c9] text-xs">
          <button
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              viewMode: prev.viewMode === 'ledger_cards' ? 'ledger_cards' : 'compact_table' 
            }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              isLifeListView
                ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Life List</span>
            <span className="text-[10px] font-mono-tag bg-[#eef3ed] text-[#2e4a36] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {uniqueSpecies}
            </span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, viewMode: 'taxonomy_tree' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter.viewMode === 'taxonomy_tree'
                ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Tree</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, viewMode: 'venues_matrix' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter.viewMode === 'venues_matrix'
                ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations</span>
            {totalVenues > 0 && (
              <span className="text-[10px] font-mono-tag bg-[#eee8dc] text-[#6b7568] px-1.5 py-0.2 rounded-full font-medium ml-0.5">
                {totalVenues}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, viewMode: 'milestones' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter.viewMode === 'milestones'
                ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                : 'text-[#6b7568] hover:text-[#1f241d]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Milestones</span>
          </button>
        </nav>

        {/* Right: Key Stats + Primary Action */}
        <div className="flex items-center gap-2">
          {/* Compact Stats Pill (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono-tag text-[#6b7568] bg-[#f9f8f5] px-3 py-1.5 rounded-xl border border-[#e6dfd3]">
            <span className="text-[#2e4a36] font-semibold">{wildCount} Wild</span>
            <span>·</span>
            <span className="text-[#99582a] font-semibold">{captiveCount} Captive</span>
          </div>

          {/* Trip Button: Active trip badge OR Start trip button */}
          {activeTrip ? (
            <button
              onClick={onOpenEndTrip}
              title={`Active Field Trip at ${activeTrip.venueName}. Click to review or finish.`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer animate-pulse-subtle border border-emerald-500"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trip:</span>
              <span className="max-w-[100px] truncate">{activeTrip.venueName}</span>
            </button>
          ) : (
            onOpenStartTrip && (
              <button
                onClick={onOpenStartTrip}
                title="Start a new Field Trip at a zoo or nature reserve"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2e4a36] bg-[#eef3ed] hover:bg-[#dbe7dc] border border-[#cfddce] rounded-xl transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#2e4a36]" />
                <span>Start Trip</span>
              </button>
            )
          )}

          {/* Backup / Data Button */}
          <button
            onClick={onOpenExportImport}
            title="Export CSV / JSON backup or restore data"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#576054] hover:text-[#1f241d] hover:bg-[#f2ede4] border border-[#e6dfd3] rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Data</span>
          </button>

          {/* SINGLE UNIFIED PRIMARY BUTTON: + Log Sighting */}
          <button
            id="unified-log-btn"
            onClick={onOpenLogModal}
            title="Scan zoo signs, quick log, or single log (⌘K / ⌘Q)"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-[#2e4a36] hover:bg-[#233a2b] rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Sighting</span>
            <span className="hidden md:inline-block px-1.5 py-0.2 bg-white/20 text-white text-[9px] rounded-md font-mono-tag">
              ⌘K
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
