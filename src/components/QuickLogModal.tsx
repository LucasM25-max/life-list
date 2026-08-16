import React, { useState, useEffect, useRef } from 'react';
import { Observation, Taxon, WildStatus, EnclosureRecord, EnclosureSpecies, VenueType, TripRecord, Coordinates } from '../types';
import { searchTaxonomy } from '../services/taxonomyApi';
import { CameraCaptureModal } from './CameraCaptureModal';
import { processImageFile } from '../utils/imageUtils';
import { computeCentroid, formatCoordinates } from '../utils/geoUtils';
import { useDeviceGps } from '../hooks/useDeviceGps';
import { GpsStatusBadge } from './GpsStatusBadge';
import { 
  X, 
  Search, 
  Zap, 
  Plus, 
  Check, 
  Loader2, 
  Trash2, 
  MapPin, 
  Camera, 
  AlertCircle,
  Hash,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
  FolderPlus,
  Compass
} from 'lucide-react';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (observations: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[]) => void;
  onSaveEnclosureAndObservations?: (enclosure: EnclosureRecord, newObservations: Observation[]) => void;
  recentVenues: string[];
  defaultVenueName?: string;
  defaultVenueType?: VenueType;
  defaultEnclosurePrefix?: string;
  enclosureIndex?: number;
  activeTrip?: TripRecord | null;
  renderModeSwitcher?: () => React.ReactNode;
}

interface QuickLogItem {
  tempId: string;
  taxon: Taxon;
  enclosureName: string;
  notes?: string;
  photoUrl?: string;
  signPhotoUrl?: string;
  isFromSign?: boolean;
  coordinates?: Coordinates;
  addedAt?: number;
}

interface EnclosureMeta {
  name: string;
  signPhotoUrl?: string;
  coordinates?: Coordinates;
}

const POPULAR_TAGS = [
  'Lifer',
  'Foraging',
  'Juvenile',
  'Breeding',
  'Vocalizing',
  'Basking',
  'Target'
];

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  onSaveEnclosureAndObservations,
  recentVenues,
  defaultVenueName = '',
  defaultVenueType = 'zoo',
  defaultEnclosurePrefix = 'Enclosure',
  enclosureIndex = 1,
  activeTrip,
  renderModeSwitcher
}) => {
  // Venue & Settings
  const [venueName, setVenueName] = useState(
    activeTrip?.venueName || defaultVenueName || recentVenues[0] || 'San Diego Zoo'
  );
  const [venueType, setVenueType] = useState<VenueType>(
    activeTrip?.venueType || defaultVenueType
  );
  const [wildStatus, setWildStatus] = useState<WildStatus>(
    activeTrip?.wildStatus || 'captive'
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Enclosures State
  const [enclosures, setEnclosures] = useState<EnclosureMeta[]>([
    { name: `${defaultEnclosurePrefix} ${enclosureIndex}` }
  ]);
  const [activeEnclosureName, setActiveEnclosureName] = useState<string>(
    `${defaultEnclosurePrefix} ${enclosureIndex}`
  );
  const [isEditingEnclosureName, setIsEditingEnclosureName] = useState(false);
  const [customEnclosureInput, setCustomEnclosureInput] = useState('');

  // Taxon Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Taxon[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Staged Sightings List
  const [batchList, setBatchList] = useState<QuickLogItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const latestGpsRef = useRef<Coordinates | null>(null);

  // Single Species Photo Capture State
  const [activeCameraTargetTempId, setActiveCameraTargetTempId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileTargetTempId, setFileTargetTempId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // INTEGRATED SCAN SIGN STATE & FLOW
  // -------------------------------------------------------------
  const [isScanSignActive, setIsScanSignActive] = useState(false);
  const [scanStep, setScanStep] = useState<'capture' | 'processing' | 'review'>('capture');
  const [signCameraFacing, setSignCameraFacing] = useState<'environment' | 'user'>('environment');
  const [signCameraStream, setSignCameraStream] = useState<MediaStream | null>(null);
  const [signCameraError, setSignCameraError] = useState<string | null>(null);
  const [signPhotoUrl, setSignPhotoUrl] = useState<string>('');
  const [scannedSpeciesList, setScannedSpeciesList] = useState<EnclosureSpecies[]>([]);
  const [suggestedExhibitTitle, setSuggestedExhibitTitle] = useState<string>('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  // Hook into continuous device GPS
  const gps = useDeviceGps(isOpen);

  const signVideoRef = useRef<HTMLVideoElement>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const signFileInputRef = useRef<HTMLInputElement>(null);

  // Sync GPS updates
  useEffect(() => {
    if (gps.coordinates) {
      setCoordinates(gps.coordinates);
      latestGpsRef.current = gps.coordinates;
    }
  }, [gps.coordinates]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      const initialEncName = `${defaultEnclosurePrefix} ${enclosureIndex}`;
      setVenueName(
        activeTrip?.venueName || defaultVenueName || recentVenues[0] || 'San Diego Zoo'
      );
      setVenueType(activeTrip?.venueType || defaultVenueType);
      setWildStatus(activeTrip?.wildStatus || 'captive');
      setDate(new Date().toISOString().split('T')[0]);
      setEnclosures([{ name: initialEncName }]);
      setActiveEnclosureName(initialEncName);
      setBatchList([]);
      setSearchQuery('');
      setSearchResults([]);
      setActiveCameraTargetTempId(null);
      setFileTargetTempId(null);
      setFormError(null);
      setIsScanSignActive(false);

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    } else {
      stopSignCamera();
    }
  }, [isOpen, defaultVenueName, defaultEnclosurePrefix, enclosureIndex, activeTrip]);

  // Debounced search against Catalogue of Life
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

  // -------------------------------------------------------------
  // ENCLOSURE MANAGEMENT HELPERS
  // -------------------------------------------------------------
  const handleAddNewEnclosure = () => {
    // Generate next number e.g. "Enclosure 2"
    let nextNum = enclosures.length + 1;
    let newName = `${defaultEnclosurePrefix} ${nextNum}`;
    while (enclosures.some(e => e.name.toLowerCase() === newName.toLowerCase())) {
      nextNum++;
      newName = `${defaultEnclosurePrefix} ${nextNum}`;
    }

    const currentCoords = latestGpsRef.current || coordinates || undefined;
    setEnclosures(prev => [...prev, { name: newName, coordinates: currentCoords }]);
    setActiveEnclosureName(newName);
    searchInputRef.current?.focus();
  };

  const handleSelectEnclosure = (name: string) => {
    setActiveEnclosureName(name);
    searchInputRef.current?.focus();
  };

  const handleStartRenameEnclosure = () => {
    setCustomEnclosureInput(activeEnclosureName);
    setIsEditingEnclosureName(true);
  };

  const handleSaveEnclosureRename = () => {
    const trimmed = customEnclosureInput.trim();
    if (!trimmed || trimmed === activeEnclosureName) {
      setIsEditingEnclosureName(false);
      return;
    }

    // Update enclosure in enclosures array
    setEnclosures(prev => prev.map(e => e.name === activeEnclosureName ? { ...e, name: trimmed } : e));
    // Update staged items that had old enclosure name
    setBatchList(prev => prev.map(item => item.enclosureName === activeEnclosureName ? { ...item, enclosureName: trimmed } : item));
    setActiveEnclosureName(trimmed);
    setIsEditingEnclosureName(false);
  };

  // -------------------------------------------------------------
  // SPECIES ADDING & STAGING WITH INSTANT GPS CAPTURE
  // -------------------------------------------------------------
  const addTaxonToActiveEnclosure = (taxon: Taxon) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    const addedAt = Date.now();
    const initialCoords: Coordinates | undefined = gps.coordinates 
      ? { ...gps.coordinates, capturedAt: addedAt } 
      : (coordinates ? { ...coordinates, capturedAt: addedAt } : undefined);

    setBatchList(prev => [
      {
        tempId,
        taxon,
        enclosureName: activeEnclosureName,
        notes: '',
        coordinates: initialCoords,
        addedAt
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

  const updateBatchItemNotes = (tempId: string, notes: string) => {
    setBatchList(prev => prev.map(item => item.tempId === tempId ? { ...item, notes } : item));
  };

  const toggleTagOnItem = (tempId: string, tag: string) => {
    const formattedTag = `#${tag.replace(/\s+/g, '')}`;
    const regex = new RegExp(`(^|\\s)${formattedTag}(\\s|$)`, 'gi');

    setBatchList(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const currentNotes = item.notes || '';
      let updatedNotes = '';
      if (regex.test(currentNotes)) {
        updatedNotes = currentNotes.replace(regex, ' ').replace(/\s+/g, ' ').trim();
      } else {
        updatedNotes = currentNotes.trim() ? `${currentNotes.trim()} ${formattedTag}` : formattedTag;
      }
      return { ...item, notes: updatedNotes };
    }));
  };

  const isTagInItemNotes = (notes: string | undefined, tag: string) => {
    if (!notes) return false;
    const formattedTag = `#${tag.replace(/\s+/g, '')}`;
    const regex = new RegExp(`(^|\\s)${formattedTag}(\\s|$)`, 'i');
    return regex.test(notes);
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
        addTaxonToActiveEnclosure(searchResults[selectedIndex]);
      }
    }
  };

  // -------------------------------------------------------------
  // SIGN CAMERA & SCAN LOGIC
  // -------------------------------------------------------------
  const startSignCamera = async () => {
    stopSignCamera();
    setSignCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setSignCameraError('Camera not supported. Please upload an image.');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: signCameraFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setSignCameraStream(mediaStream);
      if (signVideoRef.current) {
        signVideoRef.current.srcObject = mediaStream;
        signVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Sign Camera access error:', err);
      setSignCameraError('Camera inaccessible. Please upload a photo instead.');
    }
  };

  const stopSignCamera = () => {
    if (signCameraStream) {
      signCameraStream.getTracks().forEach(track => track.stop());
      setSignCameraStream(null);
    }
    if (signVideoRef.current) {
      signVideoRef.current.srcObject = null;
    }
  };

  const handleOpenScanSign = () => {
    setIsScanSignActive(true);
    setScanStep('capture');
    setSignPhotoUrl('');
    setScannedSpeciesList([]);
    setSuggestedExhibitTitle('');
    setFormError(null);
    setTimeout(() => {
      startSignCamera();
    }, 50);
  };

  const handleCloseScanSign = () => {
    stopSignCamera();
    setIsScanSignActive(false);
  };

  const handleSnapSignPhoto = () => {
    if (!signVideoRef.current) return;
    const video = signVideoRef.current;
    const canvas = signCanvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopSignCamera();
    setSignPhotoUrl(dataUrl);
    processSignImage(dataUrl);
  };

  const handleSignFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      stopSignCamera();
      setSignPhotoUrl(dataUrl);
      processSignImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processSignImage = async (base64Img: string) => {
    setScanStep('processing');
    setFormError(null);

    try {
      const res = await fetch('/api/scan-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Img })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze sign image.');
      }

      const data = await res.json();
      if (!data.species || data.species.length === 0) {
        throw new Error('No wildlife species detected on this sign. Try taking a closer photo of species names.');
      }

      if (data.exhibitTitle) {
        setSuggestedExhibitTitle(data.exhibitTitle);
      }
      if (data.venueName && !venueName) {
        setVenueName(data.venueName);
      }

      setScannedSpeciesList(data.species.map((sp: any) => ({ ...sp, isSeen: true })));
      setScanStep('review');
    } catch (err: any) {
      console.error('Sign scan error:', err);
      setFormError(err.message || 'Could not recognize sign. You can retry or enter details manually.');
      setScanStep('capture');
      startSignCamera();
    }
  };

  const handleToggleScannedSpeciesSeen = (id: string) => {
    setScannedSpeciesList(prev => prev.map(sp => sp.id === id ? { ...sp, isSeen: !sp.isSeen } : sp));
  };

  const handleImportScannedSpecies = () => {
    const seenOnSign = scannedSpeciesList.filter(sp => sp.isSeen);
    if (seenOnSign.length === 0) {
      setFormError('Please select at least one species from the sign.');
      return;
    }

    let targetEnclosureName = activeEnclosureName;

    // If sign had an exhibit title, update current enclosure name if it was a generic default
    if (suggestedExhibitTitle.trim()) {
      const trimmedTitle = suggestedExhibitTitle.trim();
      if (activeEnclosureName.startsWith(defaultEnclosurePrefix)) {
        targetEnclosureName = trimmedTitle;
        setActiveEnclosureName(trimmedTitle);
        setEnclosures(prev => prev.map(e => e.name === activeEnclosureName ? { ...e, name: trimmedTitle, signPhotoUrl } : e));
      } else {
        // Save sign photo on enclosure meta
        setEnclosures(prev => prev.map(e => e.name === activeEnclosureName ? { ...e, signPhotoUrl } : e));
      }
    } else if (signPhotoUrl) {
      setEnclosures(prev => prev.map(e => e.name === activeEnclosureName ? { ...e, signPhotoUrl } : e));
    }

    const importTime = Date.now();
    const importCoords = latestGpsRef.current 
      ? { ...latestGpsRef.current, capturedAt: importTime } 
      : (coordinates ? { ...coordinates, capturedAt: importTime } : undefined);

    const newItems: QuickLogItem[] = seenOnSign.map(sp => ({
      tempId: Math.random().toString(36).substring(2, 9),
      taxon: {
        id: sp.id || `taxon-${sp.scientificName.toLowerCase().replace(/\s+/g, '-')}`,
        scientificName: sp.scientificName,
        vernacularName: sp.vernacularName,
        authorship: '',
        kingdom: sp.taxonomy?.kingdom || 'Animalia',
        phylum: sp.taxonomy?.phylum || 'Chordata',
        class: sp.taxonomy?.class || 'Mammalia',
        order: sp.taxonomy?.order || '',
        family: sp.taxonomy?.family || '',
        genus: sp.taxonomy?.genus || sp.scientificName.split(' ')[0]
      },
      enclosureName: targetEnclosureName,
      signPhotoUrl: signPhotoUrl || undefined,
      isFromSign: true,
      notes: sp.notes || '',
      coordinates: importCoords,
      addedAt: importTime
    }));

    setBatchList(prev => [...newItems, ...prev]);
    handleCloseScanSign();
  };

  // -------------------------------------------------------------
  // COMMIT BATCH OBSERVATIONS & ENCLOSURES
  // -------------------------------------------------------------
  const handleCommit = async () => {
    if (batchList.length === 0) {
      setFormError('Please add at least one species to your Quick Log.');
      return;
    }
    if (!venueName.trim()) {
      setFormError('Please enter a location name.');
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const timestamp = Date.now();

    // Group items by enclosure for enclosure records
    const distinctEnclosures: string[] = Array.from(new Set<string>(batchList.map(item => item.enclosureName)));

    const preparedObservations: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[] = [];

    distinctEnclosures.forEach((encName: string, encIdx: number) => {
      const encMeta = enclosures.find(e => e.name === encName);
      const enclosureId = `enc-${timestamp}-${encIdx}-${Math.random().toString(36).substring(2, 6)}`;
      const itemsInEnc = batchList.filter(i => i.enclosureName === encName);

      // Centroid Calculation: Combine actual device GPS coordinates of sightings in this enclosure
      const encCentroid = computeCentroid(itemsInEnc.map(i => i.coordinates)) || 
        encMeta?.coordinates || 
        gps.coordinates || 
        coordinates || 
        undefined;

      const encObservations: Observation[] = [];
      const encSpeciesList: EnclosureSpecies[] = [];

      itemsInEnc.forEach((item, itemIdx) => {
        const itemNotes = item.notes?.trim() || '';
        const extractedTags: string[] = Array.from(
          new Set<string>((itemNotes.match(/#[\w-]+/g) || []).map((t: string) => t.slice(1)))
        );

        const obsId = `obs-ql-${timestamp}-${encIdx}-${itemIdx}`;
        // Sighting coordinates: use exact device location captured when the item was added
        const obsCoordinates = item.coordinates || encCentroid || gps.coordinates || coordinates || undefined;

        const obsData: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'> = {
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
          time: timeStr,
          venueName: venueName.trim(),
          venueType,
          wildStatus,
          tripId: activeTrip?.id || undefined,
          exhibitOrHabitat: encName,
          enclosureId,
          enclosureName: encName,
          coordinates: obsCoordinates,
          signPhotoUrl: item.signPhotoUrl || encMeta?.signPhotoUrl || undefined,
          photoUrl: item.photoUrl || undefined,
          isFromSign: Boolean(item.isFromSign),
          notes: itemNotes,
          tags: extractedTags,
          count: 1,
          sex: 'unspecified' as const,
          lifeStage: 'adult' as const
        };

        preparedObservations.push(obsData);

        const completeObs: Observation = {
          id: obsId,
          ...obsData,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        encObservations.push(completeObs);

        encSpeciesList.push({
          id: `enc-sp-${itemIdx}-${item.taxon.scientificName}`,
          scientificName: item.taxon.scientificName,
          vernacularName: item.taxon.vernacularName || item.taxon.scientificName,
          taxonomy: obsData.taxonomy,
          isSeen: true,
          observationId: obsId,
          seenAt: `${date} ${timeStr}`
        });
      });

      // Save EnclosureRecord with calculated Centroid and its Observations
      if (onSaveEnclosureAndObservations) {
        const enclosureRecord: EnclosureRecord = {
          id: enclosureId,
          tripId: activeTrip?.id || undefined,
          venueName: venueName.trim(),
          enclosureName: encName,
          timestamp,
          date,
          time: timeStr,
          coordinates: encCentroid,
          signPhotoUrl: encMeta?.signPhotoUrl || undefined,
          speciesList: encSpeciesList,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        onSaveEnclosureAndObservations(enclosureRecord, encObservations);
      }
    });

    // Save batch of observations ONLY when onSaveEnclosureAndObservations is not provided
    // (This prevents adding 2 entries for each species!)
    if (!onSaveEnclosureAndObservations) {
      onSaveBatch(preparedObservations);
    }

    onClose();
  };

  const activeTargetItem = batchList.find(i => i.tempId === activeCameraTargetTempId);
  const activeEnclosureSpeciesCount = batchList.filter(i => i.enclosureName === activeEnclosureName).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fcfbf9] overflow-hidden animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-3xl mx-auto h-[100dvh] text-xs">
        
        {/* Header */}
        <div className="bg-[#1b2b20] text-white px-3 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2e4a36] text-[#a9d9b6] flex items-center justify-center font-bold">
              <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif-species tracking-wide">
                Quick Log
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
              className="text-[#c2d6c6] hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
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

        {/* Controls & Venue Bar */}
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

          {/* Venue, Date & Wild/Captive Row */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            <div className="col-span-6 sm:col-span-7 relative">
              <MapPin className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#828d7e]" />
              <input
                type="text"
                required
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                placeholder="Location / Zoo..."
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
                className={`w-full py-1 rounded text-[10px] font-bold border truncate transition-colors cursor-pointer ${
                  wildStatus === 'captive'
                    ? 'bg-[#99582a] text-white border-[#87491d]'
                    : 'bg-[#2e4a36] text-white border-[#243b2a]'
                }`}
              >
                {wildStatus === 'captive' ? 'Captive' : 'Wild'}
              </button>
            </div>
          </div>

          {/* Live Device GPS Indicator & Controls */}
          <GpsStatusBadge
            coordinates={coordinates || gps.coordinates}
            status={gps.status}
            errorMessage={gps.errorMessage}
            isLocating={gps.isLocating}
            onRefresh={gps.refreshGps}
            onApplyManualCoords={(lat, lng) => {
              const ok = gps.applyManualCoords(lat, lng);
              if (ok) {
                const manual = {
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                  accuracy: 5,
                  capturedAt: Date.now()
                };
                setCoordinates(manual);
                latestGpsRef.current = manual;
              }
              return ok;
            }}
          />

          {/* ENCLOSURE BAR & SCAN SIGN BUTTON */}
          <div className="pt-1 border-t border-[#ded6c9] flex flex-wrap items-center justify-between gap-1.5">
            {/* Enclosure Tabs / Selector */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
              <span className="text-[10px] font-mono-tag text-[#6b7568] uppercase font-bold shrink-0 flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#2e4a36]" />
                <span>Enclosures:</span>
              </span>

              {enclosures.map(enc => {
                const isActive = enc.name === activeEnclosureName;
                const count = batchList.filter(b => b.enclosureName === enc.name).length;
                return (
                  <button
                    key={enc.name}
                    type="button"
                    onClick={() => handleSelectEnclosure(enc.name)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#2e4a36] text-white border-[#2e4a36] shadow-2xs'
                        : 'bg-white text-[#576054] border-[#d8d0c4] hover:bg-[#ede7dc]'
                    }`}
                  >
                    <span>{enc.name}</span>
                    {count > 0 && (
                      <span className={`text-[9px] px-1 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#e2dacd] text-[#1f241d]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleAddNewEnclosure}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#e6ded0] hover:bg-[#dbd1c1] text-[#2e4a36] border border-[#cfc4b2] flex items-center gap-0.5 cursor-pointer shrink-0 transition-colors"
                title="Add new enclosure / exhibit"
              >
                <Plus className="w-3 h-3" />
                <span>Enclosure</span>
              </button>
            </div>

            {/* Scan Sign Trigger Button */}
            <button
              type="button"
              onClick={handleOpenScanSign}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 border border-amber-500 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              title="Scan Zoo Sign / Exhibit Plaque with AI"
            >
              <Camera className="w-3.5 h-3.5 text-slate-900" />
              <span>Scan Sign</span>
            </button>
          </div>

          {/* Active Enclosure Name Editor */}
          <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
            <span className="text-[#828d7e]">Current exhibit:</span>
            {isEditingEnclosureName ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={customEnclosureInput}
                  onChange={e => setCustomEnclosureInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEnclosureRename()}
                  className="bg-white border border-[#2e4a36] rounded px-1.5 py-0.5 text-xs text-[#1f241d] font-bold flex-1"
                  placeholder="Exhibit / Tank Name..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveEnclosureRename}
                  className="px-2 py-0.5 bg-[#2e4a36] text-white rounded text-[10px] font-bold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingEnclosureName(false)}
                  className="px-1.5 py-0.5 text-[#828d7e] text-[10px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartRenameEnclosure}
                className="font-bold text-[#1f241d] hover:text-[#2e4a36] hover:underline cursor-pointer flex items-center gap-1"
                title="Click to rename exhibit"
              >
                <span>{activeEnclosureName}</span>
                <span className="text-[10px] text-[#828d7e] font-normal">(rename)</span>
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-2.5 overflow-y-auto flex-1 space-y-2.5">
          
          {/* Rapid Species Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2e4a36]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add species to ${activeEnclosureName}... (or click Scan Sign)`}
              className="w-full bg-white border border-[#2e4a36] rounded-lg pl-8 pr-8 py-2 text-xs sm:text-sm text-[#1f241d] font-semibold placeholder-[#828d7e] focus:outline-none focus:ring-1 focus:ring-[#2e4a36] shadow-xs"
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
                    onClick={() => addTaxonToActiveEnclosure(taxon)}
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
            <div className="p-6 text-center border border-dashed border-[#d8d0c4] rounded-lg bg-[#faf9f6] text-[#828d7e] space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#eee9e0] text-[#2e4a36] mx-auto flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-[#1f241d]">Ready to log sightings</div>
                <p className="text-[11px] text-[#6b7568] max-w-sm mx-auto mt-0.5">
                  Type any species name or click <strong className="text-[#1f241d]">Scan Sign</strong> to extract all species from zoo exhibit signs into your enclosures.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenScanSign}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Sign for {activeEnclosureName}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] sm:max-h-76 overflow-y-auto pr-0.5">
              {/* Group items by enclosure */}
              {(Array.from(new Set<string>(batchList.map(item => item.enclosureName)))).map((encName: string) => {
                const encItems = batchList.filter(item => item.enclosureName === encName);
                const isActive = encName === activeEnclosureName;

                return (
                  <div key={encName} className="border border-[#ded6c9] rounded-lg bg-white overflow-hidden shadow-2xs">
                    {/* Enclosure Group Header */}
                    <div className={`px-2.5 py-1.5 border-b border-[#ded6c9] flex items-center justify-between ${
                      isActive ? 'bg-[#eef3ed] text-[#2e4a36]' : 'bg-[#f7f4ed] text-[#576054]'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="font-bold text-xs font-serif-species">
                          {encName}
                        </span>
                        <span className="text-[10px] font-mono-tag bg-white/80 px-1.5 py-0.2 rounded border border-[#ded6c9]">
                          {encItems.length} {encItems.length === 1 ? 'species' : 'species'}
                        </span>
                      </div>

                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSelectEnclosure(encName)}
                          className="text-[10px] text-[#2e4a36] font-semibold hover:underline cursor-pointer"
                        >
                          Make active
                        </button>
                      )}
                    </div>

                    {/* Enclosure Items */}
                    <div className="p-2 divide-y divide-[#f0eae0] space-y-2">
                      {encItems.map(item => (
                        <div key={item.tempId} className="pt-2 first:pt-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {/* Photo Thumbnail / Quick Capture Button */}
                            <div className="shrink-0">
                              {item.photoUrl ? (
                                <div className="relative group">
                                  <img
                                    src={item.photoUrl}
                                    alt="Captured photo"
                                    className="w-10 h-10 object-cover rounded-md border border-[#2e4a36] shadow-2xs"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-md transition-opacity flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setActiveCameraTargetTempId(item.tempId)}
                                      className="p-0.5 text-white hover:text-[#a9d9b6] cursor-pointer"
                                      title="Retake photo"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateBatchItemPhoto(item.tempId, undefined)}
                                      className="p-0.5 text-white hover:text-red-400 cursor-pointer"
                                      title="Remove photo"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveCameraTargetTempId(item.tempId)}
                                  className="w-9 h-9 rounded-md bg-[#faf9f6] hover:bg-[#eef3ed] border border-[#d8d0c4] hover:border-[#2e4a36] text-[#576054] hover:text-[#2e4a36] flex flex-col items-center justify-center transition-colors cursor-pointer"
                                  title="Take Photo"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Species Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-xs text-[#1f241d]">
                                  {item.taxon.vernacularName || item.taxon.scientificName}
                                </span>
                                <span className="font-serif-species italic text-[#6b7568] text-[11px] truncate">
                                  {item.taxon.scientificName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#828d7e] font-mono-tag">
                                <span>{item.taxon.class} • {item.taxon.family}</span>
                                {item.isFromSign && (
                                  <span className="text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">
                                    Sign
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Delete Item */}
                            <button
                              type="button"
                              onClick={() => removeBatchItem(item.tempId)}
                              className="p-1 text-[#828d7e] hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Notes & Tags Bar for this item */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              {POPULAR_TAGS.map(tag => {
                                const active = isTagInItemNotes(item.notes, tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTagOnItem(item.tempId, tag)}
                                    className={`px-1.5 py-0.2 text-[9px] rounded font-medium border transition-colors cursor-pointer flex items-center gap-0.5 ${
                                      active
                                        ? 'bg-[#2e4a36] text-white border-[#2e4a36]'
                                        : 'bg-[#faf9f6] text-[#576054] border-[#ded6c9] hover:bg-[#f2ede4]'
                                    }`}
                                  >
                                    <Hash className="w-2 h-2 opacity-70" />
                                    <span>{tag}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={e => updateBatchItemNotes(item.tempId, e.target.value)}
                              placeholder="Notes or #tags..."
                              className="w-full text-[11px] bg-[#faf9f6] border border-[#eee9e0] rounded px-2 py-0.5 text-[#1f241d] focus:bg-white focus:outline-none focus:border-[#2e4a36]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
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
              <span>Save ({batchList.length} across {Array.from(new Set(batchList.map(i => i.enclosureName))).length} enclosures)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Hidden File Input for Single Sighting Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Single Species Live Camera Viewfinder Modal */}
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

      {/* ------------------------------------------------------------- */}
      {/* INTEGRATED SCAN SIGN OVERLAY MODAL */}
      {/* ------------------------------------------------------------- */}
      {isScanSignActive && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
          <div className="bg-[#142017] text-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl overflow-hidden flex flex-col border border-[#2e4a36]/60 shadow-2xl">
            
            {/* Scan Sign Header */}
            <div className="px-4 py-3 bg-[#1a281e] border-b border-[#2d4232] flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30 font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm font-serif-species tracking-wide text-white truncate">
                    Scan Zoo Sign
                  </h3>
                  <span className="text-[10px] text-amber-300/90 font-mono-tag uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    Target: {activeEnclosureName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {scanStep === 'capture' && !signCameraError && (
                  <button
                    type="button"
                    onClick={() => {
                      setSignCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
                      setTimeout(() => startSignCamera(), 50);
                    }}
                    className="p-2 rounded-lg text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                    title="Flip Camera (Front/Back)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleCloseScanSign}
                  className="p-2 rounded-lg text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scan Sign Body: Capture / Processing / Review */}
            <div className="flex-1 flex flex-col min-h-0 bg-black overflow-hidden relative">
              
              {/* Step 1: Capture Viewfinder */}
              {scanStep === 'capture' && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* Large Viewfinder Area */}
                  <div className="relative flex-1 min-h-[360px] sm:min-h-[480px] bg-black flex items-center justify-center overflow-hidden">
                    {signCameraError ? (
                      <div className="p-6 text-center text-xs text-white space-y-4 max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-white font-serif-species">
                            Sign Camera Preview Unavailable
                          </p>
                          <p className="text-[11px] text-white/70">
                            {signCameraError}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => signFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e4a36] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#3d5e45] cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Sign Photo</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={signVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Sign Document Framing Overlay */}
                        <div className="absolute inset-6 sm:inset-10 border border-amber-400/30 rounded-2xl pointer-events-none flex items-center justify-center">
                          {/* 4 Golden Document Framing Brackets */}
                          <div className="w-10 h-10 sm:w-14 sm:h-14 border-t-3 border-l-3 border-amber-400 absolute -top-1 -left-1 rounded-tl-xl shadow-lg" />
                          <div className="w-10 h-10 sm:w-14 sm:h-14 border-t-3 border-r-3 border-amber-400 absolute -top-1 -right-1 rounded-tr-xl shadow-lg" />
                          <div className="w-10 h-10 sm:w-14 sm:h-14 border-b-3 border-l-3 border-amber-400 absolute -bottom-1 -left-1 rounded-bl-xl shadow-lg" />
                          <div className="w-10 h-10 sm:w-14 sm:h-14 border-b-3 border-r-3 border-amber-400 absolute -bottom-1 -right-1 rounded-br-xl shadow-lg" />

                          {/* Subtle center guide mark */}
                          <div className="text-[10px] text-amber-300 font-mono-tag tracking-wider bg-black/60 px-3 py-1 rounded-full border border-amber-400/30 shadow-md">
                            Align exhibit plaque or sign inside box
                          </div>
                        </div>

                        {/* Floating bottom instructions */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/65 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15 pointer-events-none text-center">
                          <span className="text-[11px] text-white/90 font-medium">
                            Make sure species names and text are clearly lit
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <canvas ref={signCanvasRef} className="hidden" />
                  <input
                    ref={signFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSignFileUpload}
                  />

                  {/* Shutter & Controls Tray */}
                  <div className="p-4 sm:p-5 bg-[#17241b] border-t border-[#2d4232] flex items-center justify-between gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => signFileInputRef.current?.click()}
                      className="px-3.5 py-2.5 text-xs font-semibold text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      title="Upload an existing sign photo"
                    >
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span className="hidden sm:inline">Upload Image</span>
                      <span className="sm:hidden">Upload</span>
                    </button>

                    {!signCameraError && (
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleSnapSignPhoto}
                          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-amber-400/50 bg-amber-400/20 hover:bg-amber-400/30 active:scale-90 transition-all flex items-center justify-center shadow-xl cursor-pointer"
                          title="Snap & Scan Sign"
                        >
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center shadow-md">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-900 bg-slate-900 flex items-center justify-center text-amber-400">
                              <Camera className="w-5 h-5" />
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSignCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
                        setTimeout(() => startSignCamera(), 50);
                      }}
                      className="px-3.5 py-2.5 text-xs font-semibold text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      title="Flip Camera"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span className="hidden sm:inline">Flip</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Processing View */}
              {scanStep === 'processing' && (
                <div className="flex-1 min-h-[380px] bg-[#142017] flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-amber-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <div className="font-bold text-base text-white font-serif-species tracking-wide">
                      Analyzing Sign with AI
                    </div>
                    <p className="text-xs text-white/70">
                      Extracting scientific names, common names, and exhibit details...
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Review Scanned Species */}
              {scanStep === 'review' && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#fcfbf9] text-[#1f241d] p-4 sm:p-5 overflow-y-auto space-y-4">
                  
                  {/* Top Sign Preview Card */}
                  <div className="p-3 bg-[#f4efe6] border border-[#ded6c9] rounded-xl flex items-center gap-3">
                    {signPhotoUrl && (
                      <img
                        src={signPhotoUrl}
                        alt="Scanned sign"
                        className="w-16 h-16 object-cover rounded-lg border border-[#2e4a36]/30 shrink-0 shadow-2xs"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono-tag uppercase text-[#6b7568] block">
                        Detected Exhibit Title:
                      </span>
                      <input
                        type="text"
                        value={suggestedExhibitTitle || activeEnclosureName}
                        onChange={e => setSuggestedExhibitTitle(e.target.value)}
                        placeholder="Exhibit Title..."
                        className="font-bold text-sm text-[#1f241d] bg-white border border-[#d8d0c4] rounded px-2 py-0.5 mt-0.5 w-full focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                      />
                    </div>
                  </div>

                  {/* Extracted Species List Header */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-serif-species text-[#1f241d]">
                        Detected Species ({scannedSpeciesList.length})
                      </span>
                      <span className="text-xs font-mono-tag bg-[#eef3ed] text-[#2e4a36] px-2 py-0.5 rounded-full border border-[#cfddce]">
                        {scannedSpeciesList.filter(s => s.isSeen).length} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setScannedSpeciesList(prev => prev.map(s => ({ ...s, isSeen: true })))}
                        className="text-[#2e4a36] hover:underline font-semibold cursor-pointer"
                      >
                        Select all
                      </button>
                      <span className="text-[#d8d0c4]">|</span>
                      <button
                        type="button"
                        onClick={() => setScannedSpeciesList(prev => prev.map(s => ({ ...s, isSeen: false })))}
                        className="text-[#828d7e] hover:underline font-medium cursor-pointer"
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>

                  {/* Species Item Cards */}
                  <div className="space-y-2 flex-1 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                    {scannedSpeciesList.map(sp => (
                      <div
                        key={sp.id}
                        onClick={() => handleToggleScannedSpeciesSeen(sp.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          sp.isSeen
                            ? 'bg-white border-[#2e4a36] shadow-xs ring-1 ring-[#2e4a36]/20'
                            : 'bg-[#faf9f6] border-[#ded6c9] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white transition-colors ${
                            sp.isSeen ? 'bg-[#2e4a36]' : 'border-2 border-[#b8ae9f]'
                          }`}>
                            {sp.isSeen && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-[#1f241d]">
                              {sp.vernacularName}
                            </div>
                            <div className="italic text-[#576054] text-xs font-serif-species">
                              {sp.scientificName}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono-tag text-[#828d7e] bg-[#f0eae0] px-2 py-0.5 rounded border border-[#ded6c9]">
                          {sp.taxonomy?.class || 'Chordata'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Review Footer Actions */}
                  <div className="pt-3 border-t border-[#ded6c9] flex items-center justify-between gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setScanStep('capture');
                        startSignCamera();
                      }}
                      className="px-4 py-2 text-xs font-semibold text-[#576054] hover:bg-[#eee9e0] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Sign</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleImportScannedSpecies}
                      disabled={scannedSpeciesList.filter(s => s.isSeen).length === 0}
                      className="px-5 py-2.5 bg-[#2e4a36] hover:bg-[#223929] disabled:opacity-40 text-white font-bold rounded-xl shadow-md text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        Import {scannedSpeciesList.filter(s => s.isSeen).length} into {suggestedExhibitTitle || activeEnclosureName}
                      </span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
