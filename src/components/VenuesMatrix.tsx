import React, { useState, useMemo } from 'react';
import { Observation, EnclosureRecord, VenueSummary, TripRecord } from '../types';
import { computeVenues } from '../utils/storage';
import { EnclosureMapView } from './EnclosureMapView';
import { SpeciesImage } from './SpeciesImage';
import { 
  MapPin, 
  Building2, 
  Trees, 
  Calendar, 
  ArrowRight, 
  Compass, 
  Camera, 
  Eye, 
  EyeOff, 
  Check, 
  Search, 
  Layers, 
  Clock, 
  ExternalLink,
  Navigation,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  CheckCircle2,
  Sparkles,
  Map as MapIcon,
  List
} from 'lucide-react';

interface VenuesMatrixProps {
  observations: Observation[];
  enclosures: EnclosureRecord[];
  trips?: TripRecord[];
  activeTrip?: TripRecord | null;
  onFilterByVenue: (venueName: string) => void;
  onOpenScanModal: (defaultVenueName?: string) => void;
  onToggleSpeciesSeen: (enclosureId: string, speciesId: string) => void;
  onSelectSpeciesDossier: (scientificName: string) => void;
  onSelectObservation: (obs: Observation) => void;
  onStartTripAtVenue?: (venueName: string) => void;
}

export const VenuesMatrix: React.FC<VenuesMatrixProps> = ({
  observations,
  enclosures,
  trips = [],
  activeTrip,
  onFilterByVenue,
  onOpenScanModal,
  onToggleSpeciesSeen,
  onSelectSpeciesDossier,
  onSelectObservation,
  onStartTripAtVenue
}) => {
  const venues = useMemo(() => computeVenues(observations, enclosures), [observations, enclosures]);

  // Selected Venue
  const [selectedVenue, setSelectedVenue] = useState<string | null>(() => {
    return venues.length > 0 ? venues[0].venueName : null;
  });

  // Mode: 'map' | 'walkthrough' | 'all_venues'
  const [viewMode, setViewMode] = useState<'map' | 'walkthrough'>('map');

  // Filters within the selected venue
  const [statusFilter, setStatusFilter] = useState<'all' | 'seen' | 'unseen'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded enclosure IDs in walkthrough mode (all expanded by default)
  const [collapsedEnclosures, setCollapsedEnclosures] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedEnclosures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Enclosures for selected venue
  const venueEnclosures = useMemo(() => {
    if (!selectedVenue) return [];
    return enclosures
      .filter(e => e.venueName.trim().toLowerCase() === selectedVenue.trim().toLowerCase())
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [enclosures, selectedVenue]);

  // Observations for selected venue
  const venueObservations = useMemo(() => {
    if (!selectedVenue) return [];
    return observations.filter(o => o.venueName.trim().toLowerCase() === selectedVenue.trim().toLowerCase());
  }, [observations, selectedVenue]);

  // Summary stats for current venue
  const activeVenueStats = useMemo(() => {
    if (!selectedVenue) return null;
    return venues.find(v => v.venueName.toLowerCase() === selectedVenue.toLowerCase()) || null;
  }, [venues, selectedVenue]);

  // Available classes in this venue
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    venueEnclosures.forEach(e => {
      e.speciesList.forEach(s => {
        if (s.taxonomy?.class) set.add(s.taxonomy.class);
      });
    });
    venueObservations.forEach(o => {
      if (o.taxonomy?.class) set.add(o.taxonomy.class);
    });
    return Array.from(set).sort();
  }, [venueEnclosures, venueObservations]);

  if (venues.length === 0 && enclosures.length === 0) {
    return (
      <div className="bg-white border border-[#e6dfd3] rounded-2xl p-12 text-center shadow-xs">
        <div className="w-14 h-14 bg-[#eef3ed] rounded-full flex items-center justify-center mx-auto mb-3 text-[#2e4a36]">
          <MapPin className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#1f241d] font-serif-species">No Locations Logged Yet</h3>
        <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1 mb-5">
          Scan a zoo exhibit sign or record an observation to start building your interactive paw-print map and location list.
        </p>
        <button
          onClick={() => onOpenScanModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e4a36] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#233a2a] transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Zoo Sign</span>
        </button>
      </div>
    );
  }

  const seenCount = activeVenueStats?.speciesCount || 0;
  const missedCount = activeVenueStats?.unseenSpeciesCount || 0;
  const totalCount = seenCount + missedCount;
  const encounterRate = totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* UNIFIED LOCATION COMMAND BAR */}
      <div className="bg-white border border-[#e6dfd3] rounded-2xl p-3 sm:p-4 shadow-xs">
        {/* Top Line: Venue Selector + Sub-View Toggle + Main Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Venue Selector / Dropdown Pill */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 p-1 bg-[#f4efe6] rounded-xl border border-[#ded6c9] max-w-full overflow-x-auto">
              {venues.map(v => {
                const isSelected = selectedVenue?.toLowerCase() === v.venueName.toLowerCase();
                return (
                  <button
                    key={v.venueName}
                    onClick={() => setSelectedVenue(v.venueName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#2e4a36] text-white shadow-2xs'
                        : 'text-[#576054] hover:text-[#1f241d] hover:bg-white/60'
                    }`}
                  >
                    {v.wildStatus === 'wild' ? <Trees className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    <span className="truncate max-w-[160px] sm:max-w-[220px]">{v.venueName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#e5ded2] text-[#6b7568]'
                    }`}>
                      {v.speciesCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Controls: Map/List View Switcher + Context Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#f4efe6] p-1 rounded-xl border border-[#ded6c9] text-xs">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                    : 'text-[#6b7568] hover:text-[#1f241d]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setViewMode('walkthrough')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'walkthrough'
                    ? 'bg-white text-[#2e4a36] shadow-2xs font-bold'
                    : 'text-[#6b7568] hover:text-[#1f241d]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Exhibits ({venueEnclosures.length})</span>
              </button>
            </div>

            {/* Start Field Trip Button */}
            {onStartTripAtVenue && (!activeTrip || activeTrip.venueName.toLowerCase() !== selectedVenue?.toLowerCase()) && (
              <button
                type="button"
                onClick={() => selectedVenue && onStartTripAtVenue(selectedVenue)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce] hover:bg-[#2e4a36] hover:text-white transition-colors cursor-pointer"
                title="Start a live field survey trip here"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Start Trip</span>
              </button>
            )}

            {/* Scan Zoo Sign Button */}
            <button
              onClick={() => onOpenScanModal(selectedVenue || undefined)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2e4a36] hover:bg-[#233a2a] text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Sign</span>
            </button>
          </div>
        </div>

        {/* Compact Stat Ribbon */}
        {selectedVenue && (
          <div className="mt-3 pt-3 border-t border-[#f0eae0] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
              <div className="flex items-center gap-1.5 text-[#576054]">
                <span className="text-[#828d7e] font-medium">Total Species:</span>
                <span className="font-bold text-[#1f241d] font-mono">{totalCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#2e4a36]">
                <Eye className="w-3.5 h-3.5" />
                <span className="font-medium">Spotted:</span>
                <span className="font-bold font-mono">{seenCount}</span>
              </div>
              {missedCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-800">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="font-medium">Missed:</span>
                  <span className="font-bold font-mono">{missedCount}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[#576054]">
                <span className="text-[#828d7e] font-medium">Encounter Rate:</span>
                <span className="font-bold text-[#2e4a36] font-mono">{encounterRate}%</span>
              </div>
            </div>

            {venueEnclosures.length > 0 && (
              <div className="text-[11px] text-[#6b7568] flex items-center gap-1 font-mono-tag">
                <span>🐾 {venueEnclosures.length} Enclosures Documented</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW MODE 1: INTERACTIVE PAW PRINT MAP */}
      {viewMode === 'map' && (
        <EnclosureMapView
          enclosures={enclosures}
          observations={observations}
          trips={trips}
          activeTrip={activeTrip}
          selectedVenueName={selectedVenue || undefined}
          onToggleSpeciesSeen={onToggleSpeciesSeen}
          onSelectSpeciesDossier={onSelectSpeciesDossier}
          onSelectObservation={onSelectObservation}
        />
      )}

      {/* VIEW MODE 2: CLEAN EXHIBITS & WALKTHROUGH LIST */}
      {viewMode === 'walkthrough' && (
        <div className="space-y-3">
          
          {/* Search & Quick Filter Bar */}
          <div className="bg-white border border-[#e6dfd3] rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs text-xs">
            <div className="relative flex-1 min-w-[180px] max-w-md">
              <Search className="w-3.5 h-3.5 text-[#828d7e] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search species or exhibit name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#fdfbf7] border border-[#d8d0c4] rounded-xl text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Seen / Missed toggle */}
              <div className="flex items-center bg-[#f4efe6] p-0.5 rounded-lg border border-[#ded6c9]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-[#2e4a36] shadow-2xs font-bold' : 'text-[#6b7568]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('seen')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === 'seen' ? 'bg-white text-[#2e4a36] shadow-2xs font-bold' : 'text-[#6b7568]'
                  }`}
                >
                  Spotted (✅)
                </button>
                <button
                  onClick={() => setStatusFilter('unseen')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === 'unseen' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-[#6b7568]'
                  }`}
                >
                  Missed (⭕)
                </button>
              </div>

              {/* Class Dropdown */}
              {availableClasses.length > 0 && (
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="bg-white border border-[#d8d0c4] rounded-lg px-2.5 py-1 text-xs text-[#1f241d] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Classes</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Exhibits List */}
          {venueEnclosures.length > 0 ? (
            <div className="space-y-3">
              {venueEnclosures.map((enc, encIdx) => {
                const isCollapsed = collapsedEnclosures.has(enc.id);
                
                // Filter species inside this enclosure
                const filteredSpecies = enc.speciesList.filter(sp => {
                  if (statusFilter === 'seen' && !sp.isSeen) return false;
                  if (statusFilter === 'unseen' && sp.isSeen) return false;
                  if (classFilter !== 'all' && sp.taxonomy?.class !== classFilter) return false;
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const match = 
                      sp.vernacularName.toLowerCase().includes(q) ||
                      sp.scientificName.toLowerCase().includes(q) ||
                      enc.enclosureName.toLowerCase().includes(q) ||
                      (sp.taxonomy?.family && sp.taxonomy.family.toLowerCase().includes(q));
                    if (!match) return false;
                  }
                  return true;
                });

                if (filteredSpecies.length === 0 && (statusFilter !== 'all' || classFilter !== 'all' || searchQuery)) {
                  return null;
                }

                const encSeenCount = enc.speciesList.filter(s => s.isSeen).length;
                const encTotalCount = enc.speciesList.length;

                return (
                  <div 
                    key={enc.id}
                    className="bg-white border border-[#e6dfd3] rounded-2xl overflow-hidden shadow-xs hover:border-[#2e4a36]/40 transition-all"
                  >
                    {/* Exhibit Header */}
                    <div 
                      onClick={() => toggleCollapse(enc.id)}
                      className="bg-[#faf8f4] border-b border-[#eee7db] px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#f5f1e8] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#2e4a36] text-white flex items-center justify-center text-xs font-bold font-mono shrink-0">
                          {encIdx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-[#1f241d] font-serif-species truncate">
                            🐾 {enc.enclosureName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-[#6b7568] mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#2e4a36]" />
                              <span>{enc.date}</span>
                            </span>
                            {enc.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#2e4a36]" />
                                <span>{enc.time}</span>
                              </span>
                            )}
                            {enc.coordinates && (
                              <span className="flex items-center gap-1 font-mono text-[#2e4a36]">
                                <MapPin className="w-3 h-3" />
                                <span>{enc.coordinates.latitude}, {enc.coordinates.longitude}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Spotted count + Collapse arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          encSeenCount === encTotalCount
                            ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                            : encSeenCount > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {encSeenCount}/{encTotalCount} Spotted
                        </span>
                        <div className="text-[#828d7e]">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Species List */}
                    {!isCollapsed && (
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredSpecies.map(sp => {
                          const obs = venueObservations.find(o => o.scientificName.toLowerCase() === sp.scientificName.toLowerCase());
                          return (
                            <div
                              key={sp.id}
                              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                                sp.isSeen
                                  ? 'bg-white border-[#2e4a36]/30 shadow-2xs'
                                  : 'bg-[#faf7f2] border-[#e2dacd] opacity-90'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  {/* Toggle Checkbox Button */}
                                  <button
                                    type="button"
                                    onClick={() => onToggleSpeciesSeen(enc.id, sp.id)}
                                    className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                                      sp.isSeen
                                        ? 'bg-[#2e4a36] text-white hover:bg-[#233a2a]'
                                        : 'bg-white border border-[#b8ae9f] text-transparent hover:text-slate-400'
                                    }`}
                                    title={sp.isSeen ? 'Mark as Not Seen' : 'Mark as Seen'}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>

                                  <SpeciesImage
                                    scientificName={sp.scientificName}
                                    commonName={sp.vernacularName}
                                    fallbackPhotoUrl={sp.photoUrl || obs?.photoUrl}
                                    observations={observations}
                                    className="w-10 h-10 rounded-lg object-cover border border-[#d8d0c4] shrink-0"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => onSelectSpeciesDossier(sp.scientificName)}
                                      className="font-bold text-[#1f241d] hover:text-[#2e4a36] hover:underline text-left text-xs font-serif-species block truncate"
                                    >
                                      {sp.vernacularName}
                                    </button>
                                    <div className="italic text-[10px] text-[#576054] truncate">
                                      {sp.scientificName}
                                    </div>
                                  </div>

                                  {/* Status Pill */}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                                    sp.isSeen
                                      ? 'bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce]'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}>
                                    {sp.isSeen ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                    <span>{sp.isSeen ? 'Spotted' : 'Missed'}</span>
                                  </span>
                                </div>

                                {/* Tags / Taxonomy */}
                                <div className="mt-2 text-[10px] text-[#788574] flex flex-wrap items-center gap-1.5">
                                  {sp.taxonomy?.class && (
                                    <span className="bg-[#f2ede4] px-1.5 py-0.2 rounded text-[#576054]">
                                      {sp.taxonomy.class}
                                    </span>
                                  )}
                                  {sp.taxonomy?.family && (
                                    <span className="bg-[#f2ede4] px-1.5 py-0.2 rounded text-[#576054]">
                                      {sp.taxonomy.family}
                                    </span>
                                  )}
                                  {sp.iucnCategory && sp.iucnCategory !== 'LC' && (
                                    <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      {sp.iucnCategory}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Footer */}
                              <div className="pt-2 mt-2 border-t border-[#f0eae0] flex items-center justify-between text-[10px]">
                                {sp.isSeen && obs ? (
                                  <button
                                    onClick={() => onSelectObservation(obs)}
                                    className="text-[#2e4a36] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Observation Details</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onToggleSpeciesSeen(enc.id, sp.id)}
                                    className="text-amber-800 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Record Sighting</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => onSelectSpeciesDossier(sp.scientificName)}
                                  className="text-[#6b7568] hover:text-[#1f241d] inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>Dossier</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-[#e6dfd3] rounded-2xl p-8 text-center shadow-xs">
              <Camera className="w-8 h-8 text-[#828d7e] mx-auto mb-2 opacity-60" />
              <h4 className="font-bold text-sm text-[#1f241d] font-serif-species">
                No Exhibit Signs Scanned for {selectedVenue}
              </h4>
              <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1 mb-3">
                Scan exhibit signs at {selectedVenue} to log the full list of species held here, track seen vs missed animals, and plot them on the interactive paw-print map!
              </p>
              <button
                onClick={() => onOpenScanModal(selectedVenue)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2e4a36] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#233a2a] transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Sign at {selectedVenue}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
