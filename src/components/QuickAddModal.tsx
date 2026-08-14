import React, { useState, useEffect, useRef } from 'react';
import { Observation, Taxon, WildStatus, VenueType } from '../types';
import { searchTaxonomy } from '../services/taxonomyApi';
import { CameraCaptureModal } from './CameraCaptureModal';
import { processImageFile } from '../utils/imageUtils';
import { 
  X, 
  Search, 
  Sparkles, 
  MapPin, 
  Tag, 
  Calendar, 
  Clock, 
  Check, 
  Trees, 
  Building2, 
  User,
  Plus,
  Loader2,
  ExternalLink,
  ChevronDown,
  Camera,
  Upload,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (obs: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>) => void;
  existingObservations: Observation[];
  editingObservation?: Observation | null;
  onOpenScanModal?: (defaultVenueName?: string) => void;
  renderModeSwitcher?: () => React.ReactNode;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingObservations,
  editingObservation,
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
  const [exhibitOrHabitat, setExhibitOrHabitat] = useState('');
  const [individualNameOrTag, setIndividualNameOrTag] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [count, setCount] = useState<number>(1);
  const [sex, setSex] = useState<'unspecified' | 'male' | 'female' | 'mixed_group'>('unspecified');
  const [lifeStage, setLifeStage] = useState<'adult' | 'juvenile' | 'subadult' | 'chick_cub_larva' | 'various'>('adult');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Camera capture modal & file input
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Taxon hierarchy manual expand
  const [showAdvancedTaxonomy, setShowAdvancedTaxonomy] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Recent venues for quick-click
  const recentVenues = Array.from(new Set(existingObservations.map(o => o.venueName.trim()).filter(Boolean))).slice(0, 6);

  // Popular quick tags
  const PRESET_TAGS = [
    'Enrichment',
    'Breeding plumage',
    'Vocalizing',
    'Foraging / Feeding',
    'Basking',
    'Juvenile / Cub',
    'Target species',
    'Wild lifer'
  ];

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
      setExhibitOrHabitat(editingObservation.exhibitOrHabitat || '');
      setIndividualNameOrTag(editingObservation.individualNameOrTag || '');
      setCountry(editingObservation.country || '');
      setRegion(editingObservation.region || '');
      setCount(editingObservation.count || 1);
      setSex(editingObservation.sex || 'unspecified');
      setLifeStage(editingObservation.lifeStage || 'adult');
      setNotes(editingObservation.notes || '');
      setSelectedTags(editingObservation.tags || []);
      setPhotoUrl(editingObservation.photoUrl || '');
      setFormError(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTaxon(null);
    } else {
      // New log defaults
      const lastObs = existingObservations[0];
      if (lastObs) {
        // Pre-fill last used venue for rapid sequential entry
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

      setScientificName('');
      setVernacularName('');
      setAuthorship('');
      setOrderName('');
      setFamilyName('');
      setGenusName('');
      setExhibitOrHabitat('');
      setIndividualNameOrTag('');
      setCount(1);
      setSex('unspecified');
      setLifeStage('adult');
      setNotes('');
      setSelectedTags([]);
      setPhotoUrl('');
      setFormError(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTaxon(null);

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingObservation]);

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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const t = customTagInput.trim();
      if (!selectedTags.includes(t)) {
        setSelectedTags([...selectedTags, t]);
      }
      setCustomTagInput('');
    }
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
      exhibitOrHabitat: exhibitOrHabitat.trim(),
      individualNameOrTag: individualNameOrTag.trim(),
      country: country.trim(),
      region: region.trim(),
      count: Math.max(1, count),
      sex,
      lifeStage,
      notes: notes.trim(),
      tags: selectedTags,
      photoUrl: photoUrl.trim() || undefined
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#e6dfd3] rounded-lg shadow-xl w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#f9f8f5] border-b border-[#e6dfd3] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2e4a36] text-white flex items-center justify-center text-xs font-serif-species font-bold">
              +
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1f241d] font-serif-species">
                {editingObservation ? 'Edit Life Sighting' : 'Single Sighting Entry'}
              </h2>
              <p className="text-[11px] text-[#6b7568]">
                Full custom taxonomy, tags & individual metadata
              </p>
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
              className="text-[#828d7e] hover:text-[#1f241d] p-1 rounded-md hover:bg-[#eee9e0] transition-colors"
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
              1. Catalogue of Life Species Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#828d7e]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search common name (e.g. Cheetah, Shoebill) or binomial (Panthera leo)..."
                className="w-full bg-[#faf9f6] border border-[#d8d0c4] focus:border-[#2e4a36] focus:bg-white rounded-md pl-9 pr-8 py-2 text-xs text-[#1f241d] placeholder-[#828d7e] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#2e4a36] animate-spin" />
              )}
            </div>

            {/* Live Autocomplete Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1 bg-white border border-[#d8d0c4] rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-[#f0eae0] z-20">
                {searchResults.map(taxon => (
                  <div
                    key={taxon.id}
                    onClick={() => handleSelectTaxon(taxon)}
                    className="p-2.5 hover:bg-[#eef3ed] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#1f241d]">
                          {taxon.vernacularName || taxon.scientificName}
                        </span>
                        <span className="font-serif-species italic text-[11px] text-[#576054]">
                          {taxon.scientificName}
                        </span>
                        {taxon.iucnCategory && (
                          <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                            taxon.iucnCategory === 'CR' ? 'bg-red-100 text-red-800' :
                            taxon.iucnCategory === 'EN' ? 'bg-orange-100 text-orange-800' :
                            taxon.iucnCategory === 'VU' ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {taxon.iucnCategory}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#828d7e] font-mono-tag mt-0.5">
                        {taxon.class} › {taxon.order} › {taxon.family}
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#f2ede4] text-[#576054] px-1.5 py-0.5 rounded font-mono-tag">
                      Select
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Species Card (Compact) */}
          <div className="bg-[#f9f8f5] border border-[#e6dfd3] rounded-md p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <div>
                  <label className="block text-[10px] font-mono-tag text-[#6b7568] uppercase">Common Name</label>
                  <input
                    type="text"
                    required
                    value={vernacularName}
                    onChange={e => setVernacularName(e.target.value)}
                    placeholder="e.g. Snow Leopard"
                    className="w-full bg-white border border-[#d8d0c4] rounded px-2 py-1 text-xs font-semibold text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono-tag text-[#6b7568] uppercase">Scientific Binomial</label>
                  <input
                    type="text"
                    required
                    value={scientificName}
                    onChange={e => setScientificName(e.target.value)}
                    placeholder="e.g. Panthera uncia"
                    className="w-full bg-white border border-[#d8d0c4] rounded px-2 py-1 text-xs font-serif-species italic text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Full Taxonomy Hierarchy */}
            <div className="mt-2 pt-2 border-t border-[#eee9e0]">
              <button
                type="button"
                onClick={() => setShowAdvancedTaxonomy(!showAdvancedTaxonomy)}
                className="flex items-center gap-1 text-[10px] text-[#576054] hover:text-[#1f241d] font-mono-tag"
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
                2. Status & Venue Context
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
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                    wildStatus === 'captive'
                      ? 'bg-[#99582a] text-white border-[#87491d] shadow-xs'
                      : 'bg-white text-[#576054] border-[#d8d0c4] hover:bg-[#faf9f6]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>🏛️ Captive / Zoo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWildStatus('wild');
                    if (venueType === 'zoo' || venueType === 'aquarium') {
                      setVenueType('national_park');
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                    wildStatus === 'wild'
                      ? 'bg-[#2e4a36] text-white border-[#243b2a] shadow-xs'
                      : 'bg-white text-[#576054] border-[#d8d0c4] hover:bg-[#faf9f6]'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>🌿 Free Wild</span>
                </button>
              </div>
            </div>

            {/* Venue Type */}
            <div>
              <label className="block text-[11px] font-mono-tag uppercase tracking-wider text-[#576054] mb-1 font-semibold">
                Venue Type
              </label>
              <select
                value={venueType}
                onChange={e => setVenueType(e.target.value as VenueType)}
                className="w-full bg-white border border-[#d8d0c4] rounded-md px-2 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
              >
                <option value="zoo">Zoological Park</option>
                <option value="aquarium">Public Aquarium</option>
                <option value="safari_park">Safari Park / Drive-Thru</option>
                <option value="wildlife_sanctuary">Wildlife Sanctuary</option>
                <option value="national_park">National Park</option>
                <option value="nature_reserve">Nature Reserve</option>
                <option value="wilderness">Wilderness / Field</option>
                <option value="pelagic">Pelagic / Open Ocean</option>
                <option value="other">Other Location</option>
              </select>
            </div>
          </div>

          {/* Venue Name & Preset suggestions */}
          <div>
            <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
              Venue / Institution / Park Name
            </label>
            <input
              type="text"
              required
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              placeholder="e.g. San Diego Zoo Safari Park, Kruger National Park..."
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
                    className="bg-[#f2ede4] hover:bg-[#e4dcce] text-[#576054] px-1.5 py-0.2 rounded transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exhibit / Habitat & Individual Animal Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
                Exhibit / Habitat Zone (Optional)
              </label>
              <input
                type="text"
                value={exhibitOrHabitat}
                onChange={e => setExhibitOrHabitat(e.target.value)}
                placeholder="e.g. African Woods Aviary, River Hippo Pool"
                className="w-full bg-white border border-[#d8d0c4] rounded-md px-2 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
                Individual Animal Name / ID (Optional)
              </label>
              <input
                type="text"
                value={individualNameOrTag}
                onChange={e => setIndividualNameOrTag(e.target.value)}
                placeholder="e.g. Fiona, Old Scarface, Banding #402"
                className="w-full bg-white border border-[#d8d0c4] rounded-md px-2 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
              />
            </div>
          </div>

          {/* 3. DATE, COUNT, SEX & LIFE STAGE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#f0eae0]">
            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-0.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-[#d8d0c4] rounded px-2 py-1 text-xs text-[#1f241d]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-0.5">Count</label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="px-2 py-1 bg-[#f2ede4] border border-[#d8d0c4] rounded-l text-xs hover:bg-[#e6dfd3]"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={count}
                  onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border-y border-[#d8d0c4] py-1 text-center text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setCount(count + 1)}
                  className="px-2 py-1 bg-[#f2ede4] border border-[#d8d0c4] rounded-r text-xs hover:bg-[#e6dfd3]"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-0.5">Sex</label>
              <select
                value={sex}
                onChange={e => setSex(e.target.value as any)}
                className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-1 text-xs"
              >
                <option value="unspecified">Unspecified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="mixed_group">Mixed Group</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-0.5">Stage</label>
              <select
                value={lifeStage}
                onChange={e => setLifeStage(e.target.value as any)}
                className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-1 text-xs"
              >
                <option value="adult">Adult</option>
                <option value="juvenile">Juvenile</option>
                <option value="subadult">Subadult</option>
                <option value="chick_cub_larva">Chick / Cub</option>
                <option value="various">Various</option>
              </select>
            </div>
          </div>

          {/* Quick Tags */}
          <div>
            <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
              Field Tags & Behaviors
            </label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {PRESET_TAGS.map(t => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                      isSelected
                        ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                        : 'bg-[#faf9f6] text-[#576054] border-[#d8d0c4] hover:bg-[#f2ede4]'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {t}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={customTagInput}
              onChange={e => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              placeholder="Type custom tag & press Enter..."
              className="w-full bg-white border border-[#d8d0c4] rounded px-2 py-1 text-xs text-[#1f241d]"
            />
          </div>

          {/* Field Notes */}
          <div>
            <label className="block text-[10px] font-mono-tag uppercase text-[#6b7568] mb-1">
              Field Notes & Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Observed hunting dive into tidal pool, distinctive vocalization, breeding plumage..."
              className="w-full bg-white border border-[#d8d0c4] rounded-md px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:border-[#2e4a36]"
            />
          </div>

          {/* Photo & Camera Capture Section */}
          <div className="bg-[#faf9f6] border border-[#e6dfd3] rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#2e4a36]" />
                <span>Species Photo / Camera Capture</span>
              </span>
              {photoUrl && (
                <span className="text-[9px] bg-[#eef3ed] text-[#2e4a36] font-mono-tag font-bold px-1.5 py-0.2 rounded border border-[#cfddce]">
                  Photo Attached
                </span>
              )}
            </div>

            {photoUrl ? (
              <div className="flex items-center gap-3 bg-white p-2 rounded-md border border-[#d8d0c4]">
                <img
                  src={photoUrl}
                  alt="Captured species"
                  className="w-16 h-16 object-cover rounded-md border border-[#e6dfd3] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-[#1f241d] truncate">
                    Photo recorded for {vernacularName || scientificName || 'Observation'}
                  </div>
                  <div className="text-[10px] text-[#828d7e] mt-0.5">
                    Saved directly to species dossier & ledger view
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#2e4a36] hover:underline font-medium"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#576054] hover:underline font-medium"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="inline-flex items-center gap-1 text-[11px] text-red-700 hover:underline font-medium ml-auto"
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
                  className="flex items-center justify-center gap-2 p-2.5 bg-white hover:bg-[#eef3ed] border border-[#d8d0c4] hover:border-[#2e4a36] rounded-md transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#2e4a36] text-white flex items-center justify-center shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#1f241d]">Take Photo</div>
                    <div className="text-[10px] text-[#6b7568]">Device camera</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-2.5 bg-white hover:bg-[#f2ede4] border border-[#d8d0c4] rounded-md transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#eee9e0] text-[#576054] flex items-center justify-center shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#1f241d]">Upload Photo</div>
                    <div className="text-[10px] text-[#6b7568]">Image file / library</div>
                  </div>
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
          <div className="pt-3 border-t border-[#e6dfd3] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#576054] hover:text-[#1f241d] hover:bg-[#f2ede4] rounded transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2e4a36] hover:bg-[#243b2a] rounded-md shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingObservation ? 'Save Changes' : 'Record in Life List'}</span>
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
