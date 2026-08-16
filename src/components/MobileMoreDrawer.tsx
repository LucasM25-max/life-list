import React from 'react';
import { LifeListFilter, Observation, TripRecord } from '../types';
import { 
  X, 
  Download, 
  Trophy, 
  SlidersHorizontal, 
  RotateCcw, 
  Plus,
  Navigation,
  LogOut
} from 'lucide-react';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filter: LifeListFilter;
  setFilter: React.Dispatch<React.SetStateAction<LifeListFilter>>;
  observations: Observation[];
  activeTrip?: TripRecord | null;
  onOpenStartTrip?: () => void;
  onOpenEndTrip?: () => void;
  onOpenLogModal: () => void;
  onOpenExportImport: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  filter,
  setFilter,
  observations,
  activeTrip,
  onOpenStartTrip,
  onOpenEndTrip,
  onOpenLogModal,
  onOpenExportImport
}) => {
  if (!isOpen) return null;

  const classes = Array.from(new Set(observations.map(o => o.taxonomy?.class).filter(Boolean))).sort();
  const venues = Array.from(new Set(observations.map(o => o.venueName.trim()).filter(Boolean))).sort();
  const years = Array.from(new Set(observations.map(o => o.date ? o.date.substring(0, 4) : '').filter(Boolean))).sort().reverse();
  const isFiltered = Boolean(filter.search || filter.classFilter || filter.wildStatus !== 'all' || filter.venue || filter.year || filter.tag);

  const resetFilters = () => {
    setFilter(prev => ({
      ...prev,
      search: '',
      classFilter: '',
      orderFilter: '',
      familyFilter: '',
      wildStatus: 'all',
      venue: '',
      year: '',
      tag: '',
      sortBy: 'date_desc'
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in duration-150">
      <div 
        onClick={onClose} 
        className="flex-1 w-full"
      />
      
      <div className="bg-white rounded-t-2xl border-t border-[#e6dfd3] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-[#d8d0c4] rounded-full mx-auto my-2.5 shrink-0" />

        {/* Drawer Header */}
        <div className="px-4 py-2 border-b border-[#f0eae0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#2e4a36]" />
            <h3 className="font-bold text-sm text-[#1f241d] font-serif-species">
              Tools & Filters
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#828d7e] hover:bg-[#f2ede4] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Active Visit OR Start Visit Card */}
          {activeTrip ? (
            <div className="p-3 bg-linear-to-r from-[#172e1f] to-[#2e4a36] text-white rounded-xl shadow-xs border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-mono-tag uppercase tracking-wider text-emerald-300 font-bold">
                    Active Field Visit
                  </span>
                </div>
                {onOpenEndTrip && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEndTrip();
                    }}
                    className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded font-bold cursor-pointer"
                  >
                    Finish Visit
                  </button>
                )}
              </div>
              <div className="font-serif-species font-bold text-sm text-white truncate">
                {activeTrip.venueName}
              </div>
            </div>
          ) : (
            onOpenStartTrip && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStartTrip();
                }}
                className="w-full flex items-center justify-between p-3 bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce] rounded-xl font-bold shadow-2xs hover:bg-[#dbe7dc] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2e4a36] text-white flex items-center justify-center">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#1f241d]">Start a Field Trip / Visit</div>
                    <div className="text-[10px] text-[#6b7568] font-normal">Track zoo visits & sessions</div>
                  </div>
                </div>
                <span className="text-xs bg-[#2e4a36] text-white px-2.5 py-1 rounded font-semibold">Start</span>
              </button>
            )
          )}

          {/* Unified Log Action Card */}
          <button
            onClick={() => {
              onClose();
              onOpenLogModal();
            }}
            className="w-full flex items-center justify-between p-3 bg-[#2e4a36] text-white rounded-xl font-bold shadow-2xs hover:bg-[#233a2b] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">Log Life Sighting</div>
                <div className="text-[10px] text-emerald-200 font-normal">Single, batch, or zoo sign scan</div>
              </div>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded font-mono">Open</span>
          </button>

          {/* Quick View Modes */}
          <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#e6dfd3] space-y-2">
            <div className="font-bold text-[#1f241d]">Views & Analytics</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setFilter(prev => ({ ...prev, viewMode: 'compact_table' }));
                  onClose();
                }}
                className={`p-2 rounded-lg text-left font-medium border text-xs transition-all cursor-pointer ${
                  filter.viewMode === 'compact_table' || filter.viewMode === 'ledger_cards'
                    ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                    : 'bg-white text-[#1f241d] border-[#d8d0c4]'
                }`}
              >
                📜 Life List Feed
              </button>
              <button
                onClick={() => {
                  setFilter(prev => ({ ...prev, viewMode: 'taxonomy_tree' }));
                  onClose();
                }}
                className={`p-2 rounded-lg text-left font-medium border text-xs transition-all cursor-pointer ${
                  filter.viewMode === 'taxonomy_tree'
                    ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                    : 'bg-white text-[#1f241d] border-[#d8d0c4]'
                }`}
              >
                🌳 Tree of Life
              </button>
              <button
                onClick={() => {
                  setFilter(prev => ({ ...prev, viewMode: 'venues_matrix' }));
                  onClose();
                }}
                className={`p-2 rounded-lg text-left font-medium border text-xs transition-all cursor-pointer ${
                  filter.viewMode === 'venues_matrix'
                    ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                    : 'bg-white text-[#1f241d] border-[#d8d0c4]'
                }`}
              >
                🗺️ Locations Matrix
              </button>
              <button
                onClick={() => {
                  setFilter(prev => ({ ...prev, viewMode: 'milestones' }));
                  onClose();
                }}
                className={`p-2 rounded-lg text-left font-medium border text-xs transition-all cursor-pointer ${
                  filter.viewMode === 'milestones'
                    ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                    : 'bg-white text-[#1f241d] border-[#d8d0c4]'
                }`}
              >
                🏆 Milestones
              </button>
            </div>
          </div>

          {/* Quick Filter: Wild vs Captive */}
          <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#e6dfd3] space-y-2">
            <div className="font-bold text-[#1f241d] flex items-center justify-between">
              <span>Habitat Filter</span>
              {filter.wildStatus !== 'all' && (
                <span className="text-[10px] text-[#2e4a36] font-mono-tag">Active</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setFilter(prev => ({ ...prev, wildStatus: 'all' }))}
                className={`py-2 px-1 rounded-lg text-center font-medium border text-[11px] transition-all cursor-pointer ${
                  filter.wildStatus === 'all'
                    ? 'bg-[#1f241d] text-white border-[#1f241d]'
                    : 'bg-white text-[#576054] border-[#d8d0c4]'
                }`}
              >
                All Logs
              </button>
              <button
                onClick={() => setFilter(prev => ({ ...prev, wildStatus: 'wild' }))}
                className={`py-2 px-1 rounded-lg text-center font-medium border text-[11px] transition-all cursor-pointer ${
                  filter.wildStatus === 'wild'
                    ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                    : 'bg-white text-[#2e4a36] border-[#cfddce]'
                }`}
              >
                🌿 Wild Only
              </button>
              <button
                onClick={() => setFilter(prev => ({ ...prev, wildStatus: 'captive' }))}
                className={`py-2 px-1 rounded-lg text-center font-medium border text-[11px] transition-all cursor-pointer ${
                  filter.wildStatus === 'captive'
                    ? 'bg-[#99582a] text-white border-[#99582a]'
                    : 'bg-white text-[#99582a] border-[#ecd8c8]'
                }`}
              >
                🏛️ Captive Only
              </button>
            </div>
          </div>

          {/* Taxonomic Class & Venue Selectors */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
                Filter by Class
              </label>
              <select
                value={filter.classFilter}
                onChange={e => setFilter(prev => ({ ...prev, classFilter: e.target.value }))}
                className="w-full bg-white border border-[#d8d0c4] rounded-lg p-2 text-xs text-[#1f241d]"
              >
                <option value="">All Classes ({classes.length})</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
                Filter by Venue
              </label>
              <select
                value={filter.venue}
                onChange={e => setFilter(prev => ({ ...prev, venue: e.target.value }))}
                className="w-full bg-white border border-[#d8d0c4] rounded-lg p-2 text-xs text-[#1f241d]"
              >
                <option value="">All Venues ({venues.length})</option>
                {venues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
                Sort Order
              </label>
              <select
                value={filter.sortBy}
                onChange={e => setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full bg-white border border-[#d8d0c4] rounded-lg p-2 text-xs text-[#1f241d]"
              >
                <option value="date_desc">Date (Newest first)</option>
                <option value="date_asc">Date (Oldest first)</option>
                <option value="vernacular_asc">Common Name (A–Z)</option>
                <option value="scientific_asc">Scientific Name (A–Z)</option>
                <option value="taxonomic">Phylogenetic Taxonomy</option>
              </select>
            </div>
          </div>

          {/* Utilities */}
          <div className="pt-2 border-t border-[#f0eae0] space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenExportImport();
              }}
              className="w-full flex items-center justify-between p-2.5 bg-white border border-[#e6dfd3] rounded-lg text-xs font-semibold text-[#1f241d] hover:bg-[#faf9f6] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#2e4a36]" />
                <span>Data Backup & Export</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer with Reset & Done buttons */}
        <div className="p-3 border-t border-[#e6dfd3] bg-[#faf9f6] flex items-center justify-between gap-3 shrink-0">
          {isFiltered ? (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-xs text-[#99582a] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          ) : (
            <span className="text-xs text-[#828d7e] pl-1">{observations.length} Sightings Logged</span>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#2e4a36] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
