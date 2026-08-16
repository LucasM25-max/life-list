import React, { useState } from 'react';
import { Observation, LifeListFilter } from '../types';
import { 
  Search, 
  X, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Table, 
  Grid,
  ChevronDown
} from 'lucide-react';

interface FilterBarProps {
  observations: Observation[];
  filter: LifeListFilter;
  setFilter: React.Dispatch<React.SetStateAction<LifeListFilter>>;
  onOpenMobileFilters?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  observations,
  filter,
  setFilter,
  onOpenMobileFilters
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Extract distinct values for dropdown filters
  const classes = Array.from(new Set(observations.map(o => o.taxonomy?.class).filter(Boolean))).sort();
  const venues = Array.from(new Set(observations.map(o => o.venueName.trim()).filter(Boolean))).sort();
  const years = Array.from(new Set(observations.map(o => o.date ? o.date.substring(0, 4) : '').filter(Boolean))).sort().reverse();

  const isFiltered = Boolean(
    filter.search || 
    filter.classFilter || 
    filter.wildStatus !== 'all' || 
    filter.venue || 
    filter.year || 
    filter.tag
  );

  const activeFilterCount = [
    filter.classFilter,
    filter.wildStatus !== 'all' ? filter.wildStatus : null,
    filter.venue,
    filter.year,
    filter.tag
  ].filter(Boolean).length;

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
    setShowFilterDropdown(false);
  };

  const isLifeListView = filter.viewMode === 'compact_table' || filter.viewMode === 'ledger_cards';

  return (
    <div className="bg-[#f5f1e8] border-b border-[#e6dfd3] px-3 sm:px-6 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 text-xs">
        {/* Left: Clean Search input */}
        <div className="relative flex-1 max-w-md min-w-[170px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#828d7e]" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search species, places, tags..."
            value={filter.search}
            onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-white border border-[#d8d0c4] rounded-xl pl-8.5 pr-7 py-1.5 text-xs text-[#1f241d] placeholder-[#828d7e] focus:outline-none focus:ring-1 focus:ring-[#2e4a36] focus:border-[#2e4a36] shadow-2xs"
          />
          {filter.search && (
            <button
              onClick={() => setFilter(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#828d7e] hover:text-[#1f241d] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Wild / Captive Pill Toggle */}
          <div className="hidden sm:inline-flex rounded-xl bg-[#e8e2d5] p-0.5 border border-[#d8d0c4]">
            <button
              onClick={() => setFilter(prev => ({ ...prev, wildStatus: 'all' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filter.wildStatus === 'all'
                  ? 'bg-white text-[#1f241d] shadow-2xs font-bold'
                  : 'text-[#6b7568] hover:text-[#1f241d]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, wildStatus: 'wild' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filter.wildStatus === 'wild'
                  ? 'bg-[#2e4a36] text-white shadow-2xs font-bold'
                  : 'text-[#2e4a36] hover:bg-white/40'
              }`}
            >
              🌿 Wild
            </button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, wildStatus: 'captive' }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filter.wildStatus === 'captive'
                  ? 'bg-[#99582a] text-white shadow-2xs font-bold'
                  : 'text-[#99582a] hover:bg-white/40'
              }`}
            >
              🏛️ Captive
            </button>
          </div>

          {/* Desktop Filter Popover Menu */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-[#eef3ed] border-[#2e4a36] text-[#2e4a36] font-bold shadow-2xs'
                  : 'bg-white border-[#d8d0c4] text-[#1f241d] hover:bg-[#faf9f6]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#2e4a36] text-white text-[10px] flex items-center justify-center font-mono font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Popover Menu Content */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-1.5 w-68 bg-white border border-[#d8d0c4] rounded-2xl shadow-xl p-3.5 z-40 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2">
                  <span className="font-bold text-[#1f241d] text-xs font-serif-species">Filter Life List</span>
                  {isFiltered && (
                    <button
                      onClick={resetFilters}
                      className="text-[11px] text-[#99582a] hover:underline font-semibold cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7568] uppercase mb-1">Taxonomic Class</label>
                  <select
                    value={filter.classFilter}
                    onChange={e => setFilter(prev => ({ ...prev, classFilter: e.target.value }))}
                    className="w-full bg-[#faf8f5] border border-[#d8d0c4] rounded-xl px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                  >
                    <option value="">All Classes ({classes.length})</option>
                    {classes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7568] uppercase mb-1">Location / Venue</label>
                  <select
                    value={filter.venue}
                    onChange={e => setFilter(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full bg-[#faf8f5] border border-[#d8d0c4] rounded-xl px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                  >
                    <option value="">All Locations ({venues.length})</option>
                    {venues.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {years.length > 1 && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#6b7568] uppercase mb-1">Observation Year</label>
                    <select
                      value={filter.year}
                      onChange={e => setFilter(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full bg-[#faf8f5] border border-[#d8d0c4] rounded-xl px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                    >
                      <option value="">All Years</option>
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(false)}
                  className="w-full py-1.5 bg-[#2e4a36] hover:bg-[#233a2b] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#828d7e] hidden xs:block" />
            <select
              id="filter-sort-select"
              value={filter.sortBy}
              onChange={e => setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="bg-white border border-[#d8d0c4] rounded-xl px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36] shadow-2xs cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="vernacular_asc">Common Name</option>
              <option value="scientific_asc">Scientific Name</option>
              <option value="taxonomic">Taxonomic Tree</option>
            </select>
          </div>

          {/* Life List Layout Toggle (Table vs Cards) */}
          {isLifeListView && (
            <div className="hidden sm:inline-flex rounded-xl bg-[#e8e2d5] p-0.5 border border-[#d8d0c4] ml-1">
              <button
                onClick={() => setFilter(prev => ({ ...prev, viewMode: 'compact_table' }))}
                title="Table Ledger Layout"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  filter.viewMode === 'compact_table'
                    ? 'bg-white text-[#2e4a36] shadow-2xs'
                    : 'text-[#6b7568] hover:text-[#1f241d]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFilter(prev => ({ ...prev, viewMode: 'ledger_cards' }))}
                title="Visual Cards Layout"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  filter.viewMode === 'ledger_cards'
                    ? 'bg-white text-[#2e4a36] shadow-2xs'
                    : 'text-[#6b7568] hover:text-[#1f241d]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Filter Sheet Trigger Button */}
          {onOpenMobileFilters && (
            <button
              onClick={onOpenMobileFilters}
              className="md:hidden flex items-center gap-1 bg-white border border-[#d8d0c4] px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#1f241d] cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2e4a36]" />
              {activeFilterCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#99582a]" />
              )}
            </button>
          )}

          {/* Fast Clear Filter Button */}
          {isFiltered && (
            <button
              id="reset-filter-btn"
              onClick={resetFilters}
              title="Reset all filters"
              className="hidden sm:inline-block px-2 py-1 text-[11px] text-[#99582a] hover:bg-[#ebd5c8] rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
