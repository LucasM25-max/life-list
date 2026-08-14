import React, { useState, useMemo } from 'react';
import { Observation, EnclosureRecord, EnclosureSpecies, VenueSummary } from '../types';
import { computeVenues } from '../utils/storage';
import { EnclosureMapView } from './EnclosureMapView';
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
  Filter, 
  Search, 
  ChevronLeft, 
  Layers, 
  Clock, 
  ExternalLink,
  Plus,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

interface VenuesMatrixProps {
  observations: Observation[];
  enclosures: EnclosureRecord[];
  onFilterByVenue: (venueName: string) => void;
  onOpenScanModal: (defaultVenueName?: string) => void;
  onToggleSpeciesSeen: (enclosureId: string, speciesId: string) => void;
  onSelectSpeciesDossier: (scientificName: string) => void;
  onSelectObservation: (obs: Observation) => void;
}

export const VenuesMatrix: React.FC<VenuesMatrixProps> = ({
  observations,
  enclosures,
  onFilterByVenue,
  onOpenScanModal,
  onToggleSpeciesSeen,
  onSelectSpeciesDossier,
  onSelectObservation
}) => {
  const venues = useMemo(() => computeVenues(observations, enclosures), [observations, enclosures]);

  // Selected Venue for detailed Enclosure Walkthrough & Map
  const [selectedVenue, setSelectedVenue] = useState<string | null>(() => {
    return venues.length > 0 ? venues[0].venueName : null;
  });

  // Mode inside Venue Hub: 'walkthrough' | 'map'
  const [subView, setSubView] = useState<'walkthrough' | 'map'>('walkthrough');

  // Filters within the selected venue
  const [statusFilter, setStatusFilter] = useState<'all' | 'seen' | 'unseen'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Enclosures for selected venue sorted chronologically
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

  // Available classes in this venue for filter dropdown
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
      <div className="bg-white border border-[#e6dfd3] rounded-xl p-12 text-center shadow-xs">
        <MapPin className="w-10 h-10 text-[#828d7e] mx-auto mb-3 opacity-60" />
        <h3 className="text-base font-semibold text-[#1f241d] font-serif-species">No Locations or Enclosures Logged</h3>
        <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1 mb-4">
          Point your camera at a zoo sign or log a sighting to automatically build your location expedition timeline!
        </p>
        <button
          onClick={() => onOpenScanModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2e4a36] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#233a2a] transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Zoo Sign Plaque</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Top Venue Selector Bar */}
      <div className="bg-white border border-[#e6dfd3] rounded-xl p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#f0eae0]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2e4a36]" />
            <h2 className="text-sm font-bold text-[#1f241d] font-serif-species">
              Locations & Enclosure Expeditions
            </h2>
            <span className="text-[11px] text-[#6b7568] font-mono-tag">
              ({venues.length} Locations)
            </span>
          </div>

          {/* Quick Scan Sign Button */}
          <button
            onClick={() => onOpenScanModal(selectedVenue || undefined)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2e4a36] hover:bg-[#233a2a] text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Zoo Sign</span>
          </button>
        </div>

        {/* Venue Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2.5 pb-1">
          {venues.map(v => {
            const isSelected = selectedVenue?.toLowerCase() === v.venueName.toLowerCase();
            return (
              <button
                key={v.venueName}
                onClick={() => setSelectedVenue(v.venueName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#2e4a36] text-white border-[#2e4a36] shadow-xs'
                    : 'bg-[#faf9f6] text-[#576054] border-[#e6dfd3] hover:border-[#2e4a36]'
                }`}
              >
                {v.wildStatus === 'wild' ? <Trees className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                <span className="font-semibold">{v.venueName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#eef3ed] text-[#2e4a36]'
                }`}>
                  {v.speciesCount + (v.unseenSpeciesCount || 0)} species
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Venue Hub Header */}
      {selectedVenue && (
        <div className="bg-white border border-[#e6dfd3] rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#99582a] bg-[#faf0e6] px-2 py-0.5 rounded border border-[#ecd8c8]">
                  {activeVenueStats?.wildStatus === 'wild' ? 'Wild Reserve' : 'Zoological Venue'}
                </span>
                {venueEnclosures.length > 0 && (
                  <span className="text-[10px] font-bold text-[#2e4a36] bg-[#eef3ed] px-2 py-0.5 rounded border border-[#cfddce]">
                    🐾 {venueEnclosures.length} Enclosures Documented
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-[#1f241d] font-serif-species mt-1">
                {selectedVenue}
              </h3>
            </div>

            {/* Sub-view switcher: Walkthrough vs Map */}
            <div className="flex items-center gap-1 bg-[#f2ede4] p-1 rounded-lg border border-[#e2dacd] self-start md:self-auto">
              <button
                onClick={() => setSubView('walkthrough')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  subView === 'walkthrough' 
                    ? 'bg-white text-[#2e4a36] shadow-xs' 
                    : 'text-[#576054] hover:text-[#1f241d]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Enclosure Walkthrough</span>
              </button>

              <button
                onClick={() => setSubView('map')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  subView === 'map' 
                    ? 'bg-white text-[#2e4a36] shadow-xs' 
                    : 'text-[#576054] hover:text-[#1f241d]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Paw-Print Map</span>
              </button>
            </div>
          </div>

          {/* Metrics summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#f0eae0]">
            <div className="bg-[#faf9f6] p-2 rounded-lg border border-[#eee9e0]">
              <div className="text-[10px] text-[#828d7e] uppercase font-mono-tag">Total Exhibit Species</div>
              <div className="text-base font-bold text-[#1f241d] mt-0.5">
                {(activeVenueStats?.speciesCount || 0) + (activeVenueStats?.unseenSpeciesCount || 0)}
              </div>
            </div>

            <div className="bg-[#eef3ed] p-2 rounded-lg border border-[#cfddce]">
              <div className="text-[10px] text-[#2e4a36] uppercase font-mono-tag">Spotted / Seen</div>
              <div className="text-base font-bold text-[#2e4a36] mt-0.5 flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{activeVenueStats?.speciesCount || 0}</span>
              </div>
            </div>

            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
              <div className="text-[10px] text-amber-800 uppercase font-mono-tag">Held · Missed</div>
              <div className="text-base font-bold text-amber-900 mt-0.5 flex items-center gap-1">
                <EyeOff className="w-4 h-4" />
                <span>{activeVenueStats?.unseenSpeciesCount || 0}</span>
              </div>
            </div>

            <div className="bg-[#faf9f6] p-2 rounded-lg border border-[#eee9e0]">
              <div className="text-[10px] text-[#828d7e] uppercase font-mono-tag">Sighting Rate</div>
              <div className="text-base font-bold text-[#1f241d] mt-0.5 font-mono">
                {(() => {
                  const seen = activeVenueStats?.speciesCount || 0;
                  const total = seen + (activeVenueStats?.unseenSpeciesCount || 0);
                  if (total === 0) return '0%';
                  return `${Math.round((seen / total) * 100)}%`;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view: Paw Print Map View */}
      {subView === 'map' && (
        <div className="space-y-3">
          <EnclosureMapView
            enclosures={enclosures}
            observations={observations}
            selectedVenueName={selectedVenue || undefined}
            onToggleSpeciesSeen={onToggleSpeciesSeen}
            onSelectSpeciesDossier={onSelectSpeciesDossier}
            onSelectObservation={onSelectObservation}
          />
        </div>
      )}

      {/* Sub-view: Chronological Enclosure Walkthrough */}
      {subView === 'walkthrough' && (
        <div className="space-y-3">
          
          {/* Filter and Search Bar for Enclosure Species */}
          <div className="bg-white border border-[#e6dfd3] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-xs text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#828d7e] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter species or exhibit name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#fdfbf7] border border-[#d8d0c4] rounded-md text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center bg-[#f2ede4] p-0.5 rounded-md border border-[#e2dacd]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-[#2e4a36] font-bold shadow-2xs' : 'text-[#576054]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('seen')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'seen' ? 'bg-white text-[#2e4a36] font-bold shadow-2xs' : 'text-[#576054]'
                  }`}
                >
                  Seen (✅)
                </button>
                <button
                  onClick={() => setStatusFilter('unseen')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'unseen' ? 'bg-white text-amber-800 font-bold shadow-2xs' : 'text-[#576054]'
                  }`}
                >
                  Missed (⭕)
                </button>
              </div>

              {/* Class Filter */}
              {availableClasses.length > 0 && (
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="bg-white border border-[#d8d0c4] rounded-md px-2 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                >
                  <option value="all">All Classes</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Enclosures List in Chronological Order */}
          {venueEnclosures.length > 0 ? (
            <div className="space-y-3">
              {venueEnclosures.map((enc, encIdx) => {
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

                const seenCount = enc.speciesList.filter(s => s.isSeen).length;
                const totalCount = enc.speciesList.length;

                return (
                  <div 
                    key={enc.id}
                    className="bg-white border border-[#e6dfd3] rounded-xl overflow-hidden shadow-xs hover:border-[#2e4a36]/40 transition-all"
                  >
                    {/* Enclosure Header */}
                    <div className="bg-[#f9f7f2] border-b border-[#eee7db] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#2e4a36] text-white flex items-center justify-center text-xs font-bold font-mono">
                          {encIdx + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1f241d] font-serif-species flex items-center gap-2">
                            <span>🐾 {enc.enclosureName}</span>
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-[#6b7568] mt-0.5">
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
                              <span className="flex items-center gap-1 font-mono">
                                <MapPin className="w-3 h-3 text-[#2e4a36]" />
                                <span>{enc.coordinates.latitude}, {enc.coordinates.longitude}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sighting ratio badge */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                          seenCount === totalCount
                            ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                            : seenCount > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          <span>{seenCount}/{totalCount} Species Spotted</span>
                        </span>
                      </div>
                    </div>

                    {/* Species Cards Grid within this Enclosure */}
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filteredSpecies.map(sp => (
                        <div
                          key={sp.id}
                          className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
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
                                className={`mt-0.5 p-1 rounded transition-colors cursor-pointer shrink-0 ${
                                  sp.isSeen
                                    ? 'bg-[#2e4a36] text-white hover:bg-[#233a2a]'
                                    : 'bg-white border border-[#b8ae9f] text-transparent hover:text-slate-400'
                                }`}
                                title={sp.isSeen ? 'Mark as Not Seen' : 'Mark as Seen'}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

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

                              {/* Seen / Missed Status Pill */}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                                sp.isSeen
                                  ? 'bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce]'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {sp.isSeen ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                <span>{sp.isSeen ? 'Spotted' : 'Missed'}</span>
                              </span>
                            </div>

                            {/* Alternate names or taxonomy */}
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

                          {/* Quick action link */}
                          <div className="pt-2 mt-2 border-t border-[#f0eae0] flex items-center justify-between text-[10px]">
                            {sp.isSeen ? (
                              <button
                                onClick={() => {
                                  const obs = venueObservations.find(o => o.scientificName.toLowerCase() === sp.scientificName.toLowerCase());
                                  if (obs) onSelectObservation(obs);
                                }}
                                className="text-[#2e4a36] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>View Observation</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onToggleSpeciesSeen(enc.id, sp.id)}
                                className="text-amber-800 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Click check to record sighting</span>
                              </button>
                            )}

                            <button
                              onClick={() => onSelectSpeciesDossier(sp.scientificName)}
                              className="text-[#6b7568] hover:text-[#1f241d] inline-flex items-center gap-0.5"
                            >
                              <span>Dossier</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-[#e6dfd3] rounded-xl p-8 text-center shadow-xs">
              <Camera className="w-8 h-8 text-[#828d7e] mx-auto mb-2 opacity-60" />
              <h4 className="font-bold text-sm text-[#1f241d] font-serif-species">
                No Enclosure Signs Scanned for {selectedVenue}
              </h4>
              <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1 mb-3">
                Scan exhibit signs at {selectedVenue} to log the full list of species held here, track seen vs missed animals, and plot them on the interactive paw-print map!
              </p>
              <button
                onClick={() => onOpenScanModal(selectedVenue)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2e4a36] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#233a2a] transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan First Sign at {selectedVenue}</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
