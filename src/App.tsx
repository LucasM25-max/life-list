import React, { useState, useEffect, useMemo } from 'react';
import { Observation, LifeListFilter, EnclosureRecord, TripRecord, VenueType, WildStatus } from './types';
import { 
  recalculateLifers,
  deduplicateObservations,
  loadObservations,
  loadTrips,
  loadEnclosures,
  loadActiveTrip,
  saveObservations,
  saveTrips,
  saveEnclosures,
  saveActiveTrip
} from './utils/storage';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ActiveTripBar } from './components/ActiveTripBar';
import { StartTripModal } from './components/StartTripModal';
import { EndTripModal } from './components/EndTripModal';
import { CompactLedgerTable } from './components/CompactLedgerTable';
import { CompactCardGrid } from './components/CompactCardGrid';
import { TaxonomyTreeView } from './components/TaxonomyTreeView';
import { VenuesMatrix } from './components/VenuesMatrix';
import { MilestonesDashboard } from './components/MilestonesDashboard';
import { UnifiedLogModal, UnifiedLogMode } from './components/UnifiedLogModal';
import { ObservationDetailModal } from './components/ObservationDetailModal';
import { SpeciesDetailModal } from './components/SpeciesDetailModal';
import { ExportImportModal } from './components/ExportImportModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileMoreDrawer } from './components/MobileMoreDrawer';
import { MobileSightingsFeed } from './components/MobileSightingsFeed';
import { Trophy } from 'lucide-react';

export default function App() {
  const [observations, setObservations] = useState<Observation[]>(() => loadObservations());
  const [enclosures, setEnclosures] = useState<EnclosureRecord[]>(() => loadEnclosures());
  const [trips, setTrips] = useState<TripRecord[]>(() => loadTrips());
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(() => loadActiveTrip());

  // Trip Modals state
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);
  const [isEndTripOpen, setIsEndTripOpen] = useState(false);
  const [startTripDefaultVenue, setStartTripDefaultVenue] = useState<string>('');

  // Filters and views
  const [filter, setFilter] = useState<LifeListFilter>({
    search: '',
    classFilter: '',
    orderFilter: '',
    familyFilter: '',
    wildStatus: 'all',
    venue: '',
    year: '',
    tag: '',
    sortBy: 'date_desc',
    viewMode: 'compact_table'
  });

  // Unified modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalInitialMode, setLogModalInitialMode] = useState<UnifiedLogMode>('scan');
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [selectedSpeciesDossier, setSelectedSpeciesDossier] = useState<string | null>(null);

  // Synchronize observations to local storage
  useEffect(() => {
    saveObservations(observations);
  }, [observations]);

  // Synchronize enclosures to local storage
  useEffect(() => {
    saveEnclosures(enclosures);
  }, [enclosures]);

  // Synchronize trips to local storage
  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  // Synchronize active trip to local storage
  useEffect(() => {
    saveActiveTrip(activeTrip);
  }, [activeTrip]);

  // Global Keyboard Shortcuts (⌘K for single add, ⌘Q for single quick log, ⌘S for scan sign)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setEditingObservation(null);
        setLogModalInitialMode('detailed');
        setIsLogModalOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setEditingObservation(null);
        setLogModalInitialMode('walkthrough');
        setIsLogModalOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setEditingObservation(null);
        setLogModalInitialMode('scan');
        setIsLogModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter & Sort computation
  const filteredObservations = useMemo(() => {
    return observations.filter(obs => {
      // 1. Text search
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const match = 
          obs.scientificName.toLowerCase().includes(q) ||
          obs.vernacularName.toLowerCase().includes(q) ||
          obs.venueName.toLowerCase().includes(q) ||
          (obs.exhibitOrHabitat && obs.exhibitOrHabitat.toLowerCase().includes(q)) ||
          (obs.individualNameOrTag && obs.individualNameOrTag.toLowerCase().includes(q)) ||
          (obs.notes && obs.notes.toLowerCase().includes(q)) ||
          (obs.taxonomy?.class && obs.taxonomy.class.toLowerCase().includes(q)) ||
          (obs.taxonomy?.order && obs.taxonomy.order.toLowerCase().includes(q)) ||
          (obs.taxonomy?.family && obs.taxonomy.family.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 2. Wild status filter
      if (filter.wildStatus !== 'all' && obs.wildStatus !== filter.wildStatus) {
        return false;
      }

      // 3. Class filter
      if (filter.classFilter && obs.taxonomy?.class !== filter.classFilter) {
        return false;
      }

      // 4. Venue filter
      if (filter.venue && obs.venueName.trim() !== filter.venue) {
        return false;
      }

      // 5. Year filter
      if (filter.year && (!obs.date || !obs.date.startsWith(filter.year))) {
        return false;
      }

      // 6. Tag filter
      if (filter.tag && (!obs.tags || !obs.tags.includes(filter.tag))) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filter.sortBy === 'date_desc') {
        const d = b.date.localeCompare(a.date);
        return d !== 0 ? d : (b.time || '').localeCompare(a.time || '');
      }
      if (filter.sortBy === 'date_asc') {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
      }
      if (filter.sortBy === 'vernacular_asc') {
        return (a.vernacularName || a.scientificName).localeCompare(b.vernacularName || b.scientificName);
      }
      if (filter.sortBy === 'scientific_asc') {
        return a.scientificName.localeCompare(b.scientificName);
      }
      if (filter.sortBy === 'taxonomic') {
        const classComp = (a.taxonomy?.class || '').localeCompare(b.taxonomy?.class || '');
        if (classComp !== 0) return classComp;
        const orderComp = (a.taxonomy?.order || '').localeCompare(b.taxonomy?.order || '');
        if (orderComp !== 0) return orderComp;
        const famComp = (a.taxonomy?.family || '').localeCompare(b.taxonomy?.family || '');
        if (famComp !== 0) return famComp;
        return a.scientificName.localeCompare(b.scientificName);
      }
      return 0;
    });
  }, [observations, filter]);

  // Trip Handlers
  const handleStartTrip = (
    tripInput: { venueName: string; venueType: VenueType; wildStatus: WildStatus; notes?: string; startDate?: string } | string,
    argVenueType?: VenueType,
    argWildStatus?: WildStatus,
    argNotes?: string
  ) => {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    let venueName = '';
    let venueType: VenueType = 'zoo';
    let wildStatus: WildStatus = 'captive';
    let notes: string | undefined = undefined;

    if (typeof tripInput === 'object' && tripInput !== null) {
      venueName = tripInput.venueName;
      venueType = tripInput.venueType;
      wildStatus = tripInput.wildStatus;
      notes = tripInput.notes;
    } else if (typeof tripInput === 'string') {
      venueName = tripInput;
      venueType = argVenueType || 'zoo';
      wildStatus = argWildStatus || 'captive';
      notes = argNotes;
    }

    const newTrip: TripRecord = {
      id: `trip-${now}-${Math.random().toString(36).substring(2, 7)}`,
      venueName: venueName.trim(),
      venueType,
      wildStatus,
      startDate: todayStr,
      startTime: now,
      status: 'active',
      notes: notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    setActiveTrip(newTrip);
    setTrips(prev => [newTrip, ...prev.filter(t => t.id !== newTrip.id)]);
    setIsStartTripOpen(false);

    // Automatically set filter venue to active trip's venue
    setFilter(prev => ({
      ...prev,
      venue: newTrip.venueName
    }));
  };

  const handleEndTrip = (notes?: string) => {
    if (!activeTrip) return;
    const now = Date.now();
    const completedTrip: TripRecord = {
      ...activeTrip,
      endTime: now,
      endDate: new Date().toISOString().split('T')[0],
      status: 'completed',
      notes: notes?.trim() || activeTrip.notes,
      updatedAt: now
    };

    setTrips(prev => prev.map(t => t.id === activeTrip.id ? completedTrip : t));
    setActiveTrip(null);
    setIsEndTripOpen(false);
  };

  const handleDiscardActiveTrip = () => {
    if (!activeTrip) return;
    setTrips(prev => prev.filter(t => t.id !== activeTrip.id));
    setActiveTrip(null);
    setIsEndTripOpen(false);
  };

  const handleStartTripAtVenue = (venueName: string) => {
    setStartTripDefaultVenue(venueName);
    setIsStartTripOpen(true);
  };

  // Handlers
  const handleSaveObservation = (obsData: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>) => {
    if (editingObservation) {
      // Update existing
      setObservations(prev => {
        const updated = prev.map(item => 
          item.id === editingObservation.id
            ? { ...item, ...obsData, updatedAt: Date.now() }
            : item
        );
        return deduplicateObservations(updated);
      });
      setEditingObservation(null);
    } else {
      // Create new
      const newObs: Observation = {
        id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...obsData,
        tripId: obsData.tripId || activeTrip?.id || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setObservations(prev => deduplicateObservations([newObs, ...prev]));
    }
  };

  const handleSaveBatch = (batchList: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[]) => {
    const newItems: Observation[] = batchList.map((item, idx) => ({
      id: `obs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      ...item,
      tripId: item.tripId || activeTrip?.id || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    setObservations(prev => deduplicateObservations([...newItems, ...prev]));
  };

  // Save Enclosure Record & its Seen Observations from Zoo Sign Scanner
  const handleSaveEnclosureAndObservations = (
    enclosure: EnclosureRecord,
    newObservations: Observation[]
  ) => {
    const encWithTrip = {
      ...enclosure,
      tripId: enclosure.tripId || activeTrip?.id || undefined
    };
    setEnclosures(prev => [encWithTrip, ...prev]);

    if (newObservations.length > 0) {
      const obsWithTrip = newObservations.map(o => ({
        ...o,
        tripId: o.tripId || activeTrip?.id || undefined
      }));
      setObservations(prev => deduplicateObservations([...obsWithTrip, ...prev]));
    }
  };

  // Toggle Seen / Missed status for a species in an enclosure
  const handleToggleSpeciesSeen = (enclosureId: string, speciesId: string) => {
    let toggledToSeen = false;
    let targetSpecies: any = null;
    let targetEnclosure: EnclosureRecord | null = null;
    let generatedObsId = `obs-toggle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setEnclosures(prev => prev.map(enc => {
      if (enc.id !== enclosureId) return enc;
      targetEnclosure = enc;
      const updatedSpeciesList = enc.speciesList.map(sp => {
        if (sp.id !== speciesId) return sp;
        toggledToSeen = !sp.isSeen;
        targetSpecies = sp;
        return {
          ...sp,
          isSeen: toggledToSeen,
          observationId: toggledToSeen ? (sp.observationId || generatedObsId) : undefined
        };
      });
      return {
        ...enc,
        speciesList: updatedSpeciesList,
        updatedAt: Date.now()
      };
    }));

    if (toggledToSeen && targetSpecies && targetEnclosure) {
      // Create new observation for the spotted animal
      const enc = targetEnclosure as EnclosureRecord;
      const newObs: Observation = {
        id: targetSpecies.observationId || generatedObsId,
        taxonId: `taxon-${targetSpecies.scientificName.toLowerCase().replace(/\s+/g, '-')}`,
        scientificName: targetSpecies.scientificName,
        vernacularName: targetSpecies.vernacularName,
        taxonomy: targetSpecies.taxonomy || {
          kingdom: 'Animalia',
          phylum: 'Chordata',
          class: 'Aves',
          order: '',
          family: '',
          genus: targetSpecies.scientificName.split(' ')[0] || ''
        },
        date: enc.date || new Date().toISOString().split('T')[0],
        time: enc.time || new Date().toTimeString().slice(0, 5),
        venueName: enc.venueName,
        venueType: 'zoo',
        wildStatus: 'captive',
        tripId: enc.tripId || activeTrip?.id || undefined,
        exhibitOrHabitat: enc.enclosureName,
        enclosureId: enc.id,
        enclosureName: enc.enclosureName,
        coordinates: enc.coordinates,
        signPhotoUrl: enc.signPhotoUrl,
        isFromSign: true,
        tags: ['Zoo Sign Walkthrough'],
        count: 1,
        sex: 'unspecified',
        lifeStage: 'adult',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setObservations(prev => recalculateLifers([newObs, ...prev]));
    } else if (!toggledToSeen && targetSpecies) {
      // Remove linked observation
      setObservations(prev => recalculateLifers(
        prev.filter(o => o.scientificName.toLowerCase() !== targetSpecies.scientificName.toLowerCase() || o.enclosureId !== enclosureId)
      ));
    }
  };

  const handleDeleteObservation = (id: string) => {
    setObservations(prev => recalculateLifers(prev.filter(item => item.id !== id)));
    if (selectedObservation?.id === id) {
      setSelectedObservation(null);
    }
  };

  const handleEditObservation = (obs: Observation) => {
    setSelectedObservation(null);
    setEditingObservation(obs);
    setLogModalInitialMode('detailed');
    setIsLogModalOpen(true);
  };

  const handleFilterByVenue = (venueName: string) => {
    setFilter(prev => ({
      ...prev,
      venue: venueName,
      viewMode: 'venues_matrix'
    }));
  };

  const handleOpenLogModal = (mode: UnifiedLogMode = 'scan') => {
    setEditingObservation(null);
    setLogModalInitialMode(mode);
    setIsLogModalOpen(true);
  };

  const isFiltered = Boolean(
    filter.search || 
    filter.classFilter || 
    filter.wildStatus !== 'all' || 
    filter.venue || 
    filter.year || 
    filter.tag
  );

  const recentVenues = Array.from(new Set([
    ...observations.map(o => o.venueName.trim()),
    ...enclosures.map(e => e.venueName.trim())
  ].filter(Boolean)));

  return (
    <div className="min-h-screen bg-[#f9f8f5] flex flex-col selection:bg-[#2e4a36] selection:text-white pb-20 md:pb-8">
      {/* Streamlined Sticky Header */}
      <Header
        observations={observations}
        filter={filter}
        setFilter={setFilter}
        activeTrip={activeTrip}
        onOpenLogModal={() => handleOpenLogModal('scan')}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenStartTrip={() => {
          setStartTripDefaultVenue(filter.venue || recentVenues[0] || '');
          setIsStartTripOpen(true);
        }}
        onOpenEndTrip={() => setIsEndTripOpen(true)}
        onOpenMobileMore={() => setIsMobileMoreOpen(true)}
      />

      {/* Persistent Active Trip Status Banner */}
      {activeTrip && (
        <ActiveTripBar
          activeTrip={activeTrip}
          observations={observations}
          enclosures={enclosures}
          onOpenLogModal={() => handleOpenLogModal('walkthrough')}
          onOpenEndTripModal={() => setIsEndTripOpen(true)}
          onViewTripMap={() => {
            setFilter(prev => ({
              ...prev,
              venue: activeTrip.venueName,
              viewMode: 'venues_matrix'
            }));
          }}
        />
      )}

      {/* Unified Search & Filter Toolbar - shown on Life List views */}
      {(filter.viewMode === 'compact_table' || filter.viewMode === 'ledger_cards') && (
        <FilterBar
          observations={observations}
          filter={filter}
          setFilter={setFilter}
          onOpenMobileFilters={() => setIsMobileMoreOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex flex-col">
        {selectedObservation ? (
          <ObservationDetailModal
            observation={selectedObservation}
            onClose={() => setSelectedObservation(null)}
            onEdit={handleEditObservation}
            onDelete={handleDeleteObservation}
            onViewTaxon={setSelectedSpeciesDossier}
          />
        ) : selectedSpeciesDossier ? (
          <SpeciesDetailModal
            scientificName={selectedSpeciesDossier}
            observations={observations}
            onClose={() => setSelectedSpeciesDossier(null)}
            onSelectObservation={setSelectedObservation}
          />
        ) : (
          <>
            {/* Life List Ledger View (Table & Cards) */}
            {filter.viewMode === 'compact_table' && (
              <>
                {/* Desktop / Tablet: Full Ledger Table */}
                <div className="hidden md:block">
                  <CompactLedgerTable
                    observations={filteredObservations}
                    onSelectObservation={setSelectedObservation}
                    onEditObservation={handleEditObservation}
                    onDeleteObservation={handleDeleteObservation}
                    onViewTaxon={setSelectedSpeciesDossier}
                  />
                </div>

                {/* Mobile-optimized clean sightings feed */}
                <div className="md:hidden">
                  <MobileSightingsFeed
                    observations={filteredObservations}
                    onSelectObservation={setSelectedObservation}
                    onEditObservation={handleEditObservation}
                    onDeleteObservation={handleDeleteObservation}
                    onViewTaxon={setSelectedSpeciesDossier}
                    onOpenQuickLog={() => handleOpenLogModal('walkthrough')}
                  />
                </div>
              </>
            )}

            {filter.viewMode === 'ledger_cards' && (
              <CompactCardGrid
                observations={filteredObservations}
                onSelectObservation={setSelectedObservation}
                onEditObservation={handleEditObservation}
                onDeleteObservation={handleDeleteObservation}
                onViewTaxon={setSelectedSpeciesDossier}
              />
            )}

            {/* Tree of Life View */}
            {filter.viewMode === 'taxonomy_tree' && (
              <TaxonomyTreeView
                observations={filteredObservations}
                onSelectObservation={setSelectedObservation}
                onViewTaxon={setSelectedSpeciesDossier}
              />
            )}

            {/* Locations & Enclosures Interactive View */}
            {filter.viewMode === 'venues_matrix' && (
              <VenuesMatrix
                observations={observations}
                enclosures={enclosures}
                trips={trips}
                activeTrip={activeTrip}
                onFilterByVenue={handleFilterByVenue}
                onOpenScanModal={(defaultVenue) => {
                  setFilter(prev => ({ ...prev, venue: defaultVenue || prev.venue }));
                  handleOpenLogModal('scan');
                }}
                onToggleSpeciesSeen={handleToggleSpeciesSeen}
                onSelectSpeciesDossier={setSelectedSpeciesDossier}
                onSelectObservation={setSelectedObservation}
                onStartTripAtVenue={handleStartTripAtVenue}
              />
            )}

            {/* Milestones / Field Achievements View */}
            {filter.viewMode === 'milestones' && (
              <MilestonesDashboard observations={observations} />
            )}
          </>
        )}
      </main>

      {/* Streamlined Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={filter.viewMode}
        onSelectView={(mode) => setFilter(prev => ({ ...prev, viewMode: mode }))}
        onOpenLogModal={() => handleOpenLogModal('scan')}
        onOpenMore={() => setIsMobileMoreOpen(true)}
        isFilterActive={isFiltered}
        totalLogs={observations.length}
      />

      {/* Mobile More & Filters Drawer */}
      <MobileMoreDrawer
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        filter={filter}
        setFilter={setFilter}
        observations={observations}
        onOpenLogModal={() => handleOpenLogModal('scan')}
        onOpenExportImport={() => setIsExportImportOpen(true)}
      />

      {/* Start Field Trip Modal */}
      <StartTripModal
        isOpen={isStartTripOpen}
        onClose={() => setIsStartTripOpen(false)}
        onStartTrip={handleStartTrip}
        recentVenues={recentVenues}
        defaultVenue={startTripDefaultVenue || filter.venue || recentVenues[0] || ''}
      />

      {/* End / Finish Field Trip Modal */}
      <EndTripModal
        isOpen={isEndTripOpen}
        onClose={() => setIsEndTripOpen(false)}
        activeTrip={activeTrip}
        observations={observations}
        enclosures={enclosures}
        onEndTrip={handleEndTrip}
        onDiscardTrip={handleDiscardActiveTrip}
      />

      {/* Unified Logging Modal (Scan / Walkthrough / Detailed Single Entry) */}
      <UnifiedLogModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingObservation(null);
        }}
        initialMode={logModalInitialMode}
        recentVenues={recentVenues}
        defaultVenueName={activeTrip?.venueName || filter.venue || recentVenues[0] || ''}
        defaultVenueType={activeTrip?.venueType || 'zoo'}
        defaultEnclosurePrefix="Enclosure"
        enclosureIndex={enclosures.filter(e => e.venueName.toLowerCase() === (activeTrip?.venueName || filter.venue || recentVenues[0] || '').toLowerCase()).length + 1}
        existingObservations={observations}
        editingObservation={editingObservation}
        activeTrip={activeTrip}
        onSaveSingle={handleSaveObservation}
        onSaveBatch={handleSaveBatch}
        onSaveEnclosureAndObservations={handleSaveEnclosureAndObservations}
      />

      {/* Data Backup & Export/Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        observations={observations}
        enclosures={enclosures}
        onImportObservations={setObservations}
        onImportEnclosures={setEnclosures}
      />
    </div>
  );
}
