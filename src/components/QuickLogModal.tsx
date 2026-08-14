import React, { useState, useEffect, useRef } from 'react';
import { Observation, Taxon, WildStatus, VenueType } from '../types';
import { searchTaxonomy } from '../services/taxonomyApi';
import { CameraCaptureModal } from './CameraCaptureModal';
import { processImageFile } from '../utils/imageUtils';
import { 
  X, 
  Search, 
  Zap, 
  Plus, 
  Check, 
  Loader2, 
  Trash2,
  Calendar,
  MapPin,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Camera,
  Upload,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (observations: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[]) => void;
  recentVenues: string[];
  onOpenScanModal?: (defaultVenueName?: string) => void;
  renderModeSwitcher?: () => React.ReactNode;
}

interface QuickLogItem {
  tempId: string;
  taxon: Taxon;
  exhibit: string;
  notes?: string;
  count: number;
  photoUrl?: string;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  recentVenues,
  onOpenScanModal,
  renderModeSwitcher
}) => {
  const [venueName, setVenueName] = useState(recentVenues[0] || '');
  const [wildStatus, setWildStatus] = useState<WildStatus>('captive');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Enclosure tracking: starts at 1, incrementing adds Enclosure 2, 3, etc.
  const [enclosureIndex, setEnclosureIndex] = useState(1);
  const [customEnclosurePrefix, setCustomEnclosurePrefix] = useState('Enclosure');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Taxon[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [batchList, setBatchList] = useState<QuickLogItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Camera capture modal state for specific staged item
  const [activeCameraTargetTempId, setActiveCameraTargetTempId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileTargetTempId, setFileTargetTempId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const currentEnclosureName = `${customEnclosurePrefix} ${enclosureIndex}`;

  useEffect(() => {
    if (isOpen) {
      setEnclosureIndex(1);
      setCustomEnclosurePrefix('Enclosure');
      setBatchList([]);
      setSearchQuery('');
      setSearchResults([]);
      setActiveCameraTargetTempId(null);
      setFileTargetTempId(null);
      setFormError(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    setSelectedIndex(0);

    const timer = setTimeout(async () => {
      try {
        const results = await searchTaxonomy(searchQuery);
        if (isMounted) {
          setSearchResults(results.slice(0, 10));
          setIsSearching(false);
        }
      } catch (err) {
        if (isMounted) setIsSearching(false);
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleNextEnclosure = () => {
    setEnclosureIndex(prev => prev + 1);
    searchInputRef.current?.focus();
  };

  const addTaxonToBatch = (taxon: Taxon) => {
    setBatchList(prev => [
      {
        tempId: Math.random().toString(36).substring(2, 9),
        taxon,
        exhibit: currentEnclosureName,
        count: 1,
        notes: ''
      },
      ...prev
    ]);
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const removeBatchItem = (tempId: string) => {
    setBatchList(prev => prev.filter(item => item.tempId !== tempId));
  };

  const updateBatchItemCount = (tempId: string, count: number) => {
    setBatchList(prev => prev.map(item => item.tempId === tempId ? { ...item, count: Math.max(1, count) } : item));
  };

  const updateBatchItemNotes = (tempId: string, notes: string) => {
    setBatchList(prev => prev.map(item => item.tempId === tempId ? { ...item, notes } : item));
  };

  const updateBatchItemPhoto = (tempId: string, photoUrl?: string) => {
    setBatchList(prev => prev.map(item => item.tempId === tempId ? { ...item, photoUrl } : item));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fileTargetTempId) return;
    try {
      const dataUrl = await processImageFile(file);
      updateBatchItemPhoto(fileTargetTempId, dataUrl);
      setFileTargetTempId(null);
    } catch (err) {
      setFormError('Could not process the selected image.');
    }
  };

  const triggerUploadForItem = (tempId: string) => {
    setFileTargetTempId(tempId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        addTaxonToBatch(searchResults[selectedIndex]);
      }
    }
  };

  const handleCommit = () => {
    if (batchList.length === 0) {
      setFormError('Please add at least one species to your Quick Log batch.');
      return;
    }
    if (!venueName.trim()) {
      setFormError('Please enter a venue or location name.');
      return;
    }

    const prepared: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[] = batchList.map(item => ({
      taxonId: item.taxon.id,
      scientificName: item.taxon.scientificName,
      vernacularName: item.taxon.vernacularName || item.taxon.scientificName,
      authorship: item.taxon.authorship || '',
      taxonomy: {
        kingdom: item.taxon.kingdom || 'Animalia',
        phylum: item.taxon.phylum || 'Chordata',
        class: item.taxon.class || 'Mammalia',
        order: item.taxon.order || '',
        family: item.taxon.family || '',
        genus: item.taxon.genus || item.taxon.scientificName.split(' ')[0]
      },
      date,
      venueName: venueName.trim(),
      venueType: wildStatus === 'captive' ? 'aquarium' : 'national_park',
      wildStatus,
      exhibitOrHabitat: item.exhibit,
      individualNameOrTag: '',
      count: item.count || 1,
      sex: 'unspecified',
      lifeStage: 'adult',
      notes: item.notes || '',
      photoUrl: item.photoUrl,
      tags: ['Quick Log', item.exhibit]
    }));

    onSaveBatch(prepared);
    onClose();
  };

  // Group items by enclosure for clean condensed display
  const enclosureGroups = React.useMemo(() => {
    const map = new Map<string, QuickLogItem[]>();
    // Group in order of appearance
    batchList.forEach(item => {
      const key = item.exhibit || 'Enclosure 1';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [batchList]);

  const activeTargetItem = batchList.find(i => i.tempId === activeCameraTargetTempId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#fcfbf9] sm:border border-[#ded6c9] sm:rounded-xl shadow-2xl w-full max-w-xl h-full sm:h-auto sm:max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-xs">
        
        {/* Condensed Header */}
        <div className="bg-[#1b2b20] text-white px-3 py-2.5 sm:rounded-t-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2e4a36] text-[#a9d9b6] flex items-center justify-center font-bold">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-serif-species tracking-wide">
                Walkthrough Log
              </h2>
              <span className="text-[10px] bg-[#2e4a36] text-[#c2d6c6] px-1.5 py-0.2 rounded font-mono-tag font-medium hidden xs:inline">
                Rapid Multi-Tank
              </span>
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
              className="text-[#c2d6c6] hover:text-white p-1 rounded hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher */}
        {renderModeSwitcher && (
          <div className="sm:hidden bg-[#16231a] px-3 py-1.5 border-b border-[#2d4533] flex justify-center">
            {renderModeSwitcher()}
          </div>
        )}

        {/* Condensed Controls & Enclosure Bar */}
        <div className="bg-[#f4efe6] border-b border-[#e2dacd] p-2.5 space-y-2 shrink-0">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded flex items-center justify-between text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
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

          {/* Venue & Date Row */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-6 sm:col-span-7 relative">
              <MapPin className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#828d7e]" />
              <input
                type="text"
                required
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                placeholder="Venue / Aquarium name..."
                className="w-full bg-white border border-[#d8d0c4] rounded pl-6 pr-2 py-1 text-xs font-semibold text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
              />
            </div>

            <div className="col-span-3 sm:col-span-3 relative">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-[#d8d0c4] rounded px-1.5 py-1 text-[11px] text-[#1f241d]"
              />
            </div>

            <div className="col-span-3 sm:col-span-2">
              <button
                type="button"
                onClick={() => setWildStatus(prev => prev === 'captive' ? 'wild' : 'captive')}
                className={`w-full py-1 rounded text-[10px] font-bold border truncate transition-colors ${
                  wildStatus === 'captive'
                    ? 'bg-[#99582a] text-white border-[#87491d]'
                    : 'bg-[#2e4a36] text-white border-[#243b2a]'
                }`}
                title="Toggle Captive / Wild status"
              >
                {wildStatus === 'captive' ? '🏛️ Captive' : '🌿 Wild'}
              </button>
            </div>
          </div>

          {/* ACTIVE ENCLOSURE BAR & "+ New Enclosure" BUTTON */}
          <div className="flex items-center justify-between gap-2 bg-white border border-[#d8d0c4] rounded-lg px-2.5 py-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-3.5 h-3.5 text-[#2e4a36] shrink-0" />
              <span className="text-[11px] text-[#6b7568] shrink-0">Current:</span>
              <span className="text-xs font-bold text-[#1f241d] font-mono-tag bg-[#eef3ed] text-[#2e4a36] px-2 py-0.5 rounded border border-[#cfddce] truncate">
                {currentEnclosureName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenScanModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScanModal(venueName);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Hover camera over zoo sign to auto-recognize all species"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>📸 Scan Sign</span>
                </button>
              )}

              {/* Prominent + New Enclosure Action */}
              <button
                type="button"
                onClick={handleNextEnclosure}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2e4a36] hover:bg-[#223929] active:scale-95 text-white rounded text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Start logging next tank/enclosure"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Enclosure</span>
              </button>
            </div>
          </div>
        </div>

        {/* Condensed Body */}
        <div className="p-2.5 overflow-y-auto flex-1 space-y-2">
          {/* Rapid Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2e4a36]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add species to ${currentEnclosureName}... (e.g. Clownfish, Ray, Penguin)`}
              className="w-full bg-white border-2 border-[#2e4a36] rounded-lg pl-8 pr-8 py-2 text-xs sm:text-sm text-[#1f241d] font-semibold placeholder-[#828d7e] focus:outline-none focus:ring-2 focus:ring-[#2e4a36]/20 shadow-xs"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2e4a36] animate-spin" />
            )}

            {/* Instant Floating Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-[#2e4a36] rounded-lg shadow-xl max-h-52 overflow-y-auto divide-y divide-[#f0eae0]">
                {searchResults.map((taxon, idx) => (
                  <div
                    key={taxon.id}
                    onClick={() => addTaxonToBatch(taxon)}
                    className={`p-2 cursor-pointer flex items-center justify-between transition-colors ${
                      selectedIndex === idx ? 'bg-[#eef3ed] text-[#2e4a36]' : 'hover:bg-[#faf9f6]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#1f241d]">
                          {taxon.vernacularName || taxon.scientificName}
                        </span>
                        <span className="font-serif-species italic text-[#576054] text-[11px] truncate">
                          {taxon.scientificName}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#828d7e] font-mono-tag">
                        {taxon.class} • {taxon.family}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs bg-[#2e4a36] text-white px-2 py-0.5 rounded font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staged Species List Grouped by Enclosure */}
          {batchList.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[#d8d0c4] rounded-lg bg-[#faf9f6] text-[#828d7e]">
              <div className="w-7 h-7 rounded-full bg-[#eee9e0] text-[#828d7e] mx-auto flex items-center justify-center mb-1">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="font-semibold text-xs text-[#1f241d]">Enclosure 1 is ready</div>
              <p className="text-[11px] text-[#6b7568] max-w-xs mx-auto mt-0.5">
                Type any species in the search box above. Click <b>+ New Enclosure</b> whenever you move to the next tank or exhibit!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[50vh] sm:max-h-80 overflow-y-auto pr-0.5">
              {enclosureGroups.map(([enclosureName, items]) => (
                <div key={enclosureName} className="bg-white border border-[#ded6c9] rounded-lg overflow-hidden shadow-2xs">
                  {/* Enclosure Subheader */}
                  <div className="bg-[#f4efe6] px-2.5 py-1 border-b border-[#ded6c9] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-[#1f241d]">
                      <Layers className="w-3 h-3 text-[#2e4a36]" />
                      <span>{enclosureName}</span>
                      <span className="text-[10px] text-[#828d7e] font-normal">
                        ({items.length} species)
                      </span>
                    </div>
                    {enclosureName === currentEnclosureName && (
                      <span className="text-[9px] bg-[#2e4a36] text-white px-1.5 py-0.2 rounded font-mono-tag font-bold">
                        Active Target
                      </span>
                    )}
                  </div>

                  {/* Species in this Enclosure */}
                  <div className="divide-y divide-[#f0eae0]">
                    {items.map((item) => (
                      <div
                        key={item.tempId}
                        className="p-1.5 sm:p-2 flex items-center justify-between gap-2 hover:bg-[#fdfcfb]"
                      >
                        {/* Photo Thumbnail / Quick Capture Button */}
                        <div className="shrink-0">
                          {item.photoUrl ? (
                            <div className="relative group">
                              <img
                                src={item.photoUrl}
                                alt="Captured photo"
                                className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-md border border-[#2e4a36] shadow-2xs"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-md transition-opacity flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveCameraTargetTempId(item.tempId)}
                                  className="p-0.5 text-white hover:text-[#a9d9b6]"
                                  title="Retake photo"
                                >
                                  <Camera className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBatchItemPhoto(item.tempId, undefined)}
                                  className="p-0.5 text-white hover:text-red-400"
                                  title="Remove photo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setActiveCameraTargetTempId(item.tempId)}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#faf9f6] hover:bg-[#eef3ed] border border-[#d8d0c4] hover:border-[#2e4a36] text-[#576054] hover:text-[#2e4a36] flex flex-col items-center justify-center transition-colors cursor-pointer"
                                title="Take photo with camera"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-xs text-[#1f241d]">
                              {item.taxon.vernacularName || item.taxon.scientificName}
                            </span>
                            <span className="font-serif-species italic text-[#6b7568] text-[11px] truncate">
                              {item.taxon.scientificName}
                            </span>
                            {item.photoUrl && (
                              <span className="text-[9px] font-mono-tag bg-[#eef3ed] text-[#2e4a36] px-1 py-0.2 rounded border border-[#cfddce]">
                                📷 Photo
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={e => updateBatchItemNotes(item.tempId, e.target.value)}
                            placeholder="Optional note / tag..."
                            className="w-full text-[10px] bg-[#faf9f6] border border-[#eee9e0] rounded px-1.5 py-0.5 mt-0.5 text-[#1f241d]"
                          />
                        </div>

                        {/* Count & Delete controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center bg-[#f2ede4] rounded border border-[#d8d0c4] text-xs">
                            <button
                              type="button"
                              onClick={() => updateBatchItemCount(item.tempId, item.count - 1)}
                              className="px-1.5 py-0.5 font-bold text-[#576054] hover:bg-[#e4dcce] rounded-l cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-1.5 py-0.5 bg-white text-[11px] font-bold text-[#1f241d] min-w-[20px] text-center">
                              {item.count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateBatchItemCount(item.tempId, item.count + 1)}
                              className="px-1.5 py-0.5 font-bold text-[#576054] hover:bg-[#e4dcce] rounded-r cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeBatchItem(item.tempId)}
                            className="p-1 text-[#828d7e] hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Condensed Footer Action Bar */}
        <div className="p-2.5 border-t border-[#ded6c9] bg-[#f4efe6] sm:rounded-b-xl flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-xs font-medium text-[#576054] hover:bg-[#e6dfd3] rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {batchList.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchList([])}
                className="text-[11px] text-red-700 hover:underline px-1.5 py-1 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleCommit}
              disabled={batchList.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2e4a36] hover:bg-[#223929] disabled:opacity-40 disabled:cursor-not-allowed rounded shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save {batchList.length} Species ({enclosureGroups.length} Enclosures)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Hidden File Input for Mobile Native Camera / Image File Trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Live Camera Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={Boolean(activeCameraTargetTempId)}
        onClose={() => setActiveCameraTargetTempId(null)}
        onCapture={(dataUrl) => {
          if (activeCameraTargetTempId) {
            updateBatchItemPhoto(activeCameraTargetTempId, dataUrl);
            setActiveCameraTargetTempId(null);
          }
        }}
        title={activeTargetItem ? `Photo for ${activeTargetItem.taxon.vernacularName || activeTargetItem.taxon.scientificName}` : 'Capture Species Photo'}
      />
    </div>
  );
};
