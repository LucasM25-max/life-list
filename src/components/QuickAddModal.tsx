import React, { useState, useEffect, useRef } from 'react';
import { Observation, Taxon, WildStatus, VenueType, TripRecord, Coordinates } from '../types';
import { searchTaxonomy } from '../services/taxonomyApi';
import { CameraCaptureModal } from './CameraCaptureModal';
import { processImageFile } from '../utils/imageUtils';
import { useDeviceGps } from '../hooks/useDeviceGps';
import { GpsStatusBadge } from './GpsStatusBadge';
import { 
  X, 
  Search, 
  Sparkles, 
  MapPin, 
  Tag, 
  Calendar, 
  Check, 
  Trees, 
  Building2, 
  Loader2, 
  ExternalLink, 
  ChevronDown, 
  Camera, 
  Upload, 
  Trash2, 
  AlertCircle,
  Hash,
  Compass
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (obs: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>) => void;
  existingObservations: Observation[];
  editingObservation?: Observation | null;
  activeTrip?: TripRecord | null;
  onOpenScanModal?: (defaultVenueName?: string) => void;
  renderModeSwitcher?: () => React.ReactNode;
}

const PRESET_TAGS = [
  'Lifer',
  'Foraging',
  'Juvenile',
  'Breeding',
  'Vocalizing',
  'Basking',
  'Enrichment',
  'Target'
];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingObservations,
  editingObservation,
  activeTrip,
  onOpenScanModal,
  renderModeSwitcher
}) => {
  // Search query & results
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Taxon[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTaxon, setSelectedTaxon] = useState<Taxon | null>(null);

  // Form Fields
  const [scientificName, setScientificName] = useState('');
  const [vernacularName, setVernacularName] = useState('');
  const [authorship, setAuthorship] = useState('');
  const [kingdom, setKingdom] = useState('Animalia');
  const [phylum, setPhylum] = useState('Chordata');
  const [className, setClassName] = useState('Mammalia');
  const [orderName, setOrderName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [genusName, setGenusName] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('zoo');
  const [wildStatus, setWildStatus] = useState<WildStatus>('captive');
  const [notes, setNotes] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  // Camera capture modal & file input
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Hook into device GPS
  const gps = useDeviceGps(isOpen);

  // Taxon hierarchy manual expand
  const [showAdvancedTaxonomy, setShowAdvancedTaxonomy] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Recent venues for quick-click
  const recentVenues = Array.from(new Set(existingObservations.map(o => o.venueName.trim()).filter(Boolean))).slice(0, 6);

  // Sync GPS coordinates when gps.coordinates updates if not editing with existing coordinates
  useEffect(() => {
    if (gps.coordinates && !editingObservation?.coordinates) {
      setCoordinates(gps.coordinates);
    }
  }, [gps.coordinates, editingObservation]);

  // Initialize or reset when opened or when editing
  useEffect(() => {
    if (!isOpen) return;

    if (editingObservation) {
      setScientificName(editingObservation.scientificName);
      setVernacularName(editingObservation.vernacularName);
      setAuthorship(editingObservation.authorship || '');
      setKingdom(editingObservation.taxonomy?.kingdom || 'Animalia');
      setPhylum(editingObservation.taxonomy?.phylum || 'Chordata');
      setClassName(editingObservation.taxonomy?.class || 'Mammalia');
      setOrderName(editingObservation.taxonomy?.order || '');
      setFamilyName(editingObservation.taxonomy?.family || '');
      setGenusName(editingObservation.taxonomy?.genus || '');

      setDate(editingObservation.date);
      setTime(editingObservation.time || '');
      setVenueName(editingObservation.venueName);
      setVenueType(editingObservation.venueType);
      setWildStatus(editingObservation.wildStatus);
      if (editingObservation.coordinates) {
        setCoordinates(editingObservation.coordinates);
      }
      
      // If editing existing obs with tags but not in notes, include tags in notes
      let initialNotes = editingObservation.notes || '';
      if (editingObservation.tags && editingObservation.tags.length > 0) {
        const missingTags = editingObservation.tags.filter(
          t => !initialNotes.toLowerCase().includes(`#${t.toLowerCase()}`)
        );
        if (missingTags.length > 0) {
          const tagsString = missingTags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
          initialNotes = initialNotes ? `${initialNotes} ${tagsString}` : tagsString;
        }
      }
      setNotes(initialNotes);

      setPhotoUrl(editingObservation.photoUrl || '');
      setFormError(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTaxon(null);
    } else {
      // If there is an active trip, automatically pre-fill active trip details!
      if (activeTrip) {
        setVenueName(activeTrip.venueName);
        setVenueType(activeTrip.venueType);
        setWildStatus(activeTrip.wildStatus);
        setDate(new Date().toISOString().split('T')[0]);
      } else {
        const lastObs = existingObservations[0];
        if (lastObs) {
          setVenueName(lastObs.venueName);
          setVenueType(lastObs.venueType);
          setWildStatus(lastObs.wildStatus);
          setDate(lastObs.date || new Date().toISOString().split('T')[0]);
        } else {
          setVenueName('San Diego Zoo');
          setVenueType('zoo');
          setWildStatus('captive');
          setDate(new Date().toISOString().split('T')[0]);
        }
      }

      setScientificName('');
      setVernacularName('');
      setAuthorship('');
      setOrderName('');
      setFamilyName('');
      setGenusName('');
      setNotes('');
      setCustomTagInput('');
      setPhotoUrl('');
      setFormError(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTaxon(null);

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingObservation, activeTrip]);

  // Debounced search against Catalogue of Life
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchTaxonomy(searchQuery);
        if (isMounted) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch (err) {
        if (isMounted) setIsSearching(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSelectTaxon = (taxon: Taxon) => {
    setSelectedTaxon(taxon);
    setScientificName(taxon.scientificName);
    setVernacularName(taxon.vernacularName || taxon.allVernaculars?.[0] || '');
    setAuthorship(taxon.authorship || '');
    setKingdom(taxon.kingdom || 'Animalia');
    setPhylum(taxon.phylum || 'Chordata');
    setClassName(taxon.class || '');
    setOrderName(taxon.order || '');
    setFamilyName(taxon.family || '');
    setGenusName(taxon.genus || taxon.scientificName.split(' ')[0] || '');
    setSearchResults([]);
    setSearchQuery('');
  };

  // Toggle or append tag directly inside the notes text
  const toggleTagInNotes = (tag: string) => {
    const formattedTag = `#${tag.replace(/\s+/g, '')}`;
    const regex = new RegExp(`(^|\\s)${formattedTag}(\\s|$)`, 'gi');
    
    if (regex.test(notes)) {
      // Remove tag from notes
      const updatedNotes = notes.replace(regex, ' ').replace(/\s+/g, ' ').trim();
      setNotes(updatedNotes);
    } else {
      // Append tag to notes
      const updatedNotes = notes.trim() ? `${notes.trim()} ${formattedTag}` : formattedTag;
      setNotes(updatedNotes);
    }
    notesTextareaRef.current?.focus();
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const cleanTag = customTagInput.trim().replace(/^#+/, '');
      if (cleanTag) {
        toggleTagInNotes(cleanTag);
      }
      setCustomTagInput('');
    }
  };

  const isTagInNotes = (tag: string) => {
    const formattedTag = `#${tag.replace(/\s+/g, '')}`;
    const regex = new RegExp(`(^|\\s)${formattedTag}(\\s|$)`, 'i');
    return regex.test(notes);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageFile(file);
      setPhotoUrl(dataUrl);
    } catch (err) {
      setFormError('Could not process the selected image.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scientificName.trim()) {
      setFormError('Please select or enter a species scientific name.');
      return;
    }
    if (!venueName.trim()) {
      setFormError('Please enter a location or venue name.');
      return;
    }

    // Extract all hashtags from notes for structured tagging
    const extractedTags = Array.from(
      new Set((notes.match(/#[\w-]+/g) || []).map(t => t.slice(1)))
    );

    onSave({
      taxonId: selectedTaxon?.id || `custom-${Date.now()}`,
      scientificName: scientificName.trim(),
      vernacularName: vernacularName.trim() || scientificName.trim(),
      authorship: authorship.trim(),
      taxonomy: {
        kingdom: kingdom.trim() || 'Animalia',
        phylum: phylum.trim() || 'Chordata',
        class: className.trim() || 'Mammalia',
        order: orderName.trim() || '',
        family: familyName.trim() || '',
        genus: genusName.trim() || scientificName.trim().split(' ')[0] || ''
      },
      date,
      time: time.trim(),
      venueName: venueName.trim(),
      venueType,
      wildStatus,
      tripId: editingObservation?.tripId || activeTrip?.id || undefined,
      coordinates: coordinates || gps.coordinates || undefined,
      exhibitOrHabitat: '',
      individualNameOrTag: '',
      count: 1,
      sex: 'unspecified',
      lifeStage: 'adult',
      notes: notes.trim(),
      tags: extractedTags,
      photoUrl: photoUrl.trim() || undefined
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#e6dfd3] rounded-lg shadow-xl w-full max-w-xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#f9f8f5] border-b border-[#e6dfd3] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2e4a36] text-white flex items-center justify-center text-xs font-serif-species font-bold">
              +
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1f241d] font-serif-species">
                {editingObservation ? 'Edit Sighting' : 'Single Log'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {renderModeSwitcher && (
              <div className="hidden sm:block">
                {renderModeSwitcher()}
              </div>
            )}
            <button
              onClick={onClose}
              className="text-[#828d7e] hover:text-[#1f241d] p-1 rounded-md hover:bg-[#eee9e0] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher */}
        {renderModeSwitcher && (
          <div className="sm:hidden bg-[#f0ede6] px-3 py-1.5 border-b border-[#e6dfd3] flex justify-center">
            {renderModeSwitcher()}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded flex items-center justify-between text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setFormError(null)} 
                className="text-red-600 hover:text-red-900 font-bold ml-2 p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. SPECIES LOOKUP BAR */}
          <div>
            <label className="block text-[11px] font-mono-tag uppercase tracking-wider text-[#576054] mb-1 font-semibold">
              Species
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#828d7e]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search common or scientific name..."
                className="w-full bg-[#faf9f6] border border-[#d8d0c4] focus:border-[#2e4a36] focus:bg-white rounded-md pl-9 pr-8 py-2 text-xs text-[#1f241d] placeholder-[#828d7e] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#2e4a36] animate-spin" />
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1 bg-white border border-[#2e4a36] rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-[#eee9e0] z-20 relative">
                {searchResults.map(taxon => (
                  <div
                    key={taxon.id}
                    onClick={() => handleSelectTaxon(taxon)}
                    className="p-2.5 hover:bg-[#eef3ed] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-[#1f241d]">
                        {taxon.vernacularName || taxon.scientificName}
                      </div>
                      <div className="font-serif-species italic text-[#576054] text-[11px]">
                        {taxon.scientificName} {taxon.authorship && <span className="text-[#828d7e] font-sans font-normal text-[10px]">{taxon.authorship}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono-tag bg-[#eee9e0] text-[#576054] px-1.5 py-0.5 rounded">
                        {taxon.class} › {taxon.family}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Species Summary Card */}
            {(scientificName || vernacularName) && (
              <div className="mt-2 p-2.5 bg-[#eef3ed] border border-[#cfddce] rounded-md flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#2e4a36] text-xs">
                    {vernacularName || scientificName}
                  </div>
                  <div className="font-serif-species italic text-[#576054] text-[11px]">
                    {scientificName} {authorship && <span className="text-[#828d7e] font-sans font-normal text-[10px]">({authorship})</span>}
                  </div>
                </div>
                <span className="text-[10px] font-mono-tag text-[#2e4a36] bg-white px-2 py-0.5 rounded border border-[#cfddce]">
                  {className || 'Taxon'} • {familyName}
                </span>
              </div>
            )}

            {/* Advanced Taxonomy Accordion */}
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowAdvancedTaxonomy(!showAdvancedTaxonomy)}
                className="flex items-center gap-1 text-[10px] text-[#576054] hover:text-[#1f241d] font-mono-tag cursor-pointer"
              >
                <span>Taxonomy: {className || 'Class'} › {orderName || 'Order'} › {familyName || 'Family'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedTaxonomy ? 'rotate-180' : ''}`} />
              </button>

              {showAdvancedTaxonomy && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-1">
                  <div>
                    <label className="block text-[9px] font-mono-tag text-[#828d7e]">CLASS</label>
                    <input
                      type="text"
                      value={className}
                      onChange={e => setClassName(e.target.value)}
                      className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono-tag text-[#828d7e]">ORDER</label>
                    <input
                      type="text"
                      value={orderName}
                      onChange={e => setOrderName(e.target.value)}
                      className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono-tag text-[#828d7e]">FAMILY</label>
                    <input
                      type="text"
                      value={familyName}
                      onChange={e => setFamilyName(e.target.value)}
                      className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono-tag text-[#828d7e]">GENUS</label>
                    <input
                      type="text"
                      value={genusName}
                      onChange={e => setGenusName(e.target.value)}
                      className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. WILD VS CAPTIVE & VENUE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Status Selector */}
            <div>
              <label className="block text-[11px] font-mono-tag uppercase tracking-wider text-[#576054] mb-1 font-semibold">
                Status
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setWildStatus('captive');
                    if (venueType === 'national_park' || venueType === 'wilderness') {
                      setVenueType('zoo');
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                    wildStatus === 'captive'
                      ? 'bg-[#99582a] text-white border-[#87491d] shadow-xs'
                      : 'bg-white text-[#576054] border-[#d8d0c4] hover:bg-[#faf9f6]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Captive</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWildStatus('wild');
                    if (venueType === 'zoo' || venueType === 'aquarium') {
                      setVenueType('national_park');
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                    wildStatus === 'wild'
                      ? 'bg-[#2e4a36] text-white border-[#243b2a] shadow-xs'
                      : 'bg-white text-[#576054] border-[#d8d0c4] hover:bg-[#faf9f6]'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>Wild</span>
                </button>
              </div>
            </div>

            {/* Venue Type */}
            <div>
              <label className="block text-[11px] font-mono-tag uppercase tracking-wider text-[#576054] mb-1 font-semibold">
                Type
              </label>
              <select
                value={venueType}
                onChange={e => setVenueType(e.target.value as VenueType)}
                className="w-full bg-white border border-[#d8d0c4] rounded-md px-2 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
              >
                <option value="zoo">Zoo</option>
                <option value="aquarium">Aquarium</option>
                <option value="safari_park">Safari Park</option>
                <option value="wildlife_sanctuary">Wildlife Sanctuary</option>
                <option value="national_park">National Park</option>
                <option value="nature_reserve">Nature Reserve</option>
                <option value="wilderness">Wilderness</option>
                <option value="pelagic">Pelagic / Ocean</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Location & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
                Location
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                placeholder="e.g. San Diego Zoo Safari Park"
                className="w-full bg-white border border-[#d8d0c4] rounded-md px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
              />
              {recentVenues.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px] text-[#828d7e]">
                  <span>Recent:</span>
                  {recentVenues.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVenueName(v)}
                      className="bg-[#f2ede4] hover:bg-[#e4dcce] text-[#576054] px-1.5 py-0.2 rounded transition-colors cursor-pointer"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-[#d8d0c4] rounded-md px-2 py-1.5 text-xs text-[#1f241d]"
              />
            </div>
          </div>

          {/* Real-time GPS Location Status Badge */}
          <GpsStatusBadge
            coordinates={coordinates || gps.coordinates}
            status={gps.status}
            errorMessage={gps.errorMessage}
            isLocating={gps.isLocating}
            onRefresh={gps.refreshGps}
            onApplyManualCoords={(lat, lng) => {
              const ok = gps.applyManualCoords(lat, lng);
              if (ok) {
                setCoordinates({
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                  accuracy: 5,
                  capturedAt: Date.now()
                });
              }
              return ok;
            }}
          />

          {/* 3. FIELD NOTES WITH INTEGRATED TAG FUNCTIONALITY */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold">
                Notes & Tags
              </label>
              <span className="text-[10px] text-[#828d7e]">
                Click tags to add or type #tag directly
              </span>
            </div>

            {/* Quick Tag Pills that insert/toggle in notes */}
            <div className="flex flex-wrap items-center gap-1 mb-1.5">
              {PRESET_TAGS.map(t => {
                const active = isTagInNotes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTagInNotes(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer flex items-center gap-0.5 ${
                      active
                        ? 'bg-[#2e4a36] text-white border-[#2e4a36] shadow-2xs'
                        : 'bg-[#faf9f6] text-[#576054] border-[#d8d0c4] hover:bg-[#f2ede4]'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5 opacity-70" />
                    <span>{t}</span>
                  </button>
                );
              })}

              <div className="inline-flex items-center">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value)}
                  onKeyDown={handleAddCustomTag}
                  placeholder="+ #tag..."
                  className="w-20 bg-white border border-[#d8d0c4] rounded px-1.5 py-0.5 text-[10px] text-[#1f241d]"
                />
              </div>
            </div>

            <textarea
              ref={notesTextareaRef}
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Field observations, behaviors, or hashtags (e.g. #Foraging in canopy, vocalizing)..."
              className="w-full bg-white border border-[#d8d0c4] rounded-md px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
            />
          </div>

          {/* Photo & Camera Capture Section */}
          <div className="bg-[#faf9f6] border border-[#e6dfd3] rounded-md p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#2e4a36]" />
                <span>Photo</span>
              </span>
              {photoUrl && (
                <span className="text-[9px] bg-[#eef3ed] text-[#2e4a36] font-mono-tag font-bold px-1.5 py-0.2 rounded border border-[#cfddce]">
                  Attached
                </span>
              )}
            </div>

            {photoUrl ? (
              <div className="flex items-center gap-3 bg-white p-2 rounded-md border border-[#d8d0c4]">
                <img
                  src={photoUrl}
                  alt="Captured species"
                  className="w-14 h-14 object-cover rounded-md border border-[#e6dfd3] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-[#1f241d] truncate">
                    {vernacularName || scientificName || 'Observation Photo'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#2e4a36] hover:underline font-medium cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#576054] hover:underline font-medium cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline font-medium ml-auto cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="flex items-center justify-center gap-2 p-2 bg-white hover:bg-[#eef3ed] border border-[#d8d0c4] hover:border-[#2e4a36] rounded-md transition-colors text-left cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#2e4a36]" />
                  <span className="font-medium text-xs text-[#1f241d]">Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-2 bg-white hover:bg-[#f2ede4] border border-[#d8d0c4] rounded-md transition-colors text-left cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#576054]" />
                  <span className="font-medium text-xs text-[#1f241d]">Upload Photo</span>
                </button>
              </div>
            )}

            {/* Hidden native input for camera/gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2.5 border-t border-[#e6dfd3] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#576054] hover:text-[#1f241d] hover:bg-[#f2ede4] rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2e4a36] hover:bg-[#243b2a] rounded-md shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingObservation ? 'Save Changes' : 'Save Sighting'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(dataUrl) => setPhotoUrl(dataUrl)}
        title={vernacularName ? `Capture Photo for ${vernacularName}` : 'Capture Species Photo'}
      />
    </div>
  );
};
