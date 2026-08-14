import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Sparkles, 
  MapPin, 
  AlertCircle, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Plus, 
  Info,
  Layers,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { EnclosureRecord, EnclosureSpecies, Observation, VenueType } from '../types';

interface ZooSignScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVenueName?: string;
  defaultVenueType?: VenueType;
  defaultEnclosurePrefix?: string;
  enclosureIndex?: number;
  onSaveEnclosureAndObservations: (
    enclosure: EnclosureRecord,
    newObservations: Observation[]
  ) => void;
  renderModeSwitcher?: () => React.ReactNode;
}

export function ZooSignScannerModal({
  isOpen,
  onClose,
  defaultVenueName = '',
  defaultVenueType = 'zoo',
  defaultEnclosurePrefix = 'Exhibit / Enclosure',
  enclosureIndex = 1,
  onSaveEnclosureAndObservations,
  renderModeSwitcher,
}: ZooSignScannerModalProps) {
  // Mode: 'capture' (camera/upload) | 'processing' | 'review'
  const [step, setStep] = useState<'capture' | 'processing' | 'review'>('capture');
  
  // Camera stream state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  // Captured sign photo
  const [signPhotoUrl, setSignPhotoUrl] = useState<string>('');
  
  // Scanned / Review form state
  const [venueName, setVenueName] = useState<string>(defaultVenueName || '');
  const [enclosureName, setEnclosureName] = useState<string>(`${defaultEnclosurePrefix} ${enclosureIndex}`);
  const [signNotes, setSignNotes] = useState<string>('');
  const [scannedSpecies, setScannedSpecies] = useState<EnclosureSpecies[]>([]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual species add input
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customVernacular, setCustomVernacular] = useState('');
  const [customScientific, setCustomScientific] = useState('');

  // Grab GPS coordinates when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultVenueName) setVenueName(defaultVenueName);
      setEnclosureName(`${defaultEnclosurePrefix} ${enclosureIndex}`);
      setStep('capture');
      setSignPhotoUrl('');
      setScannedSpecies([]);
      setErrorMessage(null);
      fetchCurrentGps();
    } else {
      stopCamera();
    }
  }, [isOpen, defaultVenueName, defaultEnclosurePrefix, enclosureIndex]);

  // Start camera when entering capture step
  useEffect(() => {
    if (isOpen && step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported on this device/browser. Please upload an image instead.');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Unable to access camera directly. You can upload or take a photo with the file selector.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const fetchCurrentGps = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy)
        });
        setIsGettingLocation(false);
      },
      (err) => {
        console.warn('GPS location fetch error:', err.message);
        // Fallback default coordinates if at a famous zoo or neutral
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Capture frame from live video
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setSignPhotoUrl(dataUrl);
    processImageWithAI(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      stopCamera();
      setSignPhotoUrl(dataUrl);
      processImageWithAI(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Send image to backend Gemini parser
  const processImageWithAI = async (base64Img: string) => {
    setStep('processing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scan-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Img })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server failed to analyze sign image.');
      }

      const data = await res.json();
      if (!data.species || data.species.length === 0) {
        throw new Error('No wildlife species could be detected on this sign. Try taking a closer photo of the species names.');
      }

      if (data.exhibitTitle && (!enclosureName || enclosureName.startsWith(defaultEnclosurePrefix))) {
        setEnclosureName(data.exhibitTitle);
      }
      if (data.venueName && !venueName) {
        setVenueName(data.venueName);
      }

      setScannedSpecies(data.species);
      setStep('review');
    } catch (err: any) {
      console.error('Sign scan error:', err);
      setErrorMessage(err.message || 'Could not recognize sign. You can retry or enter details manually.');
      setStep('capture');
    }
  };

  // Toggle seen status for a specific species on the sign
  const handleToggleSeen = (speciesId: string) => {
    setScannedSpecies(prev => 
      prev.map(sp => sp.id === speciesId ? { ...sp, isSeen: !sp.isSeen } : sp)
    );
  };

  const handleSelectAll = (seen: boolean) => {
    setScannedSpecies(prev => prev.map(sp => ({ ...sp, isSeen: seen })));
  };

  const handleAddManualSpecies = () => {
    if (!customScientific.trim() && !customVernacular.trim()) return;
    const newSp: EnclosureSpecies = {
      id: `sp-manual-${Date.now()}`,
      scientificName: customScientific.trim() || customVernacular.trim(),
      vernacularName: customVernacular.trim() || customScientific.trim(),
      taxonomy: {
        kingdom: 'Animalia',
        phylum: 'Chordata',
        class: 'Aves',
        order: '',
        family: '',
        genus: customScientific.trim().split(' ')[0] || ''
      },
      iucnCategory: 'LC',
      isSeen: true,
      notes: 'Manually added to sign exhibit'
    };

    setScannedSpecies(prev => [...prev, newSp]);
    setCustomVernacular('');
    setCustomScientific('');
    setIsAddingCustom(false);
  };

  const handleRemoveSpecies = (id: string) => {
    setScannedSpecies(prev => prev.filter(sp => sp.id !== id));
  };

  // Commit enclosure record + generate observations for seen species
  const handleCommitEnclosure = () => {
    if (scannedSpecies.length === 0) {
      setErrorMessage('Please include at least one species in this enclosure.');
      return;
    }
    if (!venueName.trim()) {
      setErrorMessage('Please enter a location / zoo venue name.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const timestamp = Date.now();
    const enclosureId = `enc-${timestamp}-${Math.random().toString(36).substring(2, 6)}`;

    // Prepare observations for species marked as Seen
    const newObservations: Observation[] = [];
    const updatedSpeciesList: EnclosureSpecies[] = [];

    for (const sp of scannedSpecies) {
      if (sp.isSeen) {
        const obsId = `obs-sign-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const obs: Observation = {
          id: obsId,
          taxonId: `taxon-${sp.scientificName.toLowerCase().replace(/\s+/g, '-')}`,
          scientificName: sp.scientificName,
          vernacularName: sp.vernacularName,
          taxonomy: sp.taxonomy || {
            kingdom: 'Animalia',
            phylum: 'Chordata',
            class: 'Aves',
            order: '',
            family: '',
            genus: sp.scientificName.split(' ')[0] || ''
          },
          date: dateStr,
          time: timeStr,
          venueName: venueName.trim(),
          venueType: defaultVenueType,
          wildStatus: 'captive',
          exhibitOrHabitat: enclosureName.trim(),
          enclosureId: enclosureId,
          enclosureName: enclosureName.trim(),
          coordinates: coordinates || undefined,
          signPhotoUrl: signPhotoUrl || undefined,
          isFromSign: true,
          notes: sp.notes ? `[Sign Exhibit: ${enclosureName}] ${sp.notes}` : `Logged via Zoo Sign Scan at ${enclosureName}`,
          tags: ['Zoo Sign Scan', 'Exhibit Inventory'],
          count: 1,
          sex: 'unspecified',
          lifeStage: 'adult',
          createdAt: timestamp,
          updatedAt: timestamp
        };
        newObservations.push(obs);
        updatedSpeciesList.push({
          ...sp,
          observationId: obsId,
          seenAt: `${dateStr} ${timeStr}`
        });
      } else {
        // Unseen species: stays in enclosure inventory, not added to life list
        updatedSpeciesList.push({
          ...sp,
          observationId: undefined
        });
      }
    }

    const enclosureRecord: EnclosureRecord = {
      id: enclosureId,
      venueName: venueName.trim(),
      enclosureName: enclosureName.trim() || `Exhibit ${enclosureIndex}`,
      timestamp,
      date: dateStr,
      time: timeStr,
      coordinates: coordinates || undefined,
      signPhotoUrl: signPhotoUrl || undefined,
      notes: signNotes.trim() || undefined,
      speciesList: updatedSpeciesList,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    onSaveEnclosureAndObservations(enclosureRecord, newObservations);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white border border-[#2e4a36]/30 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#2e4a36] text-[#f4efe6] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-500/20 rounded border border-amber-400/40 text-amber-300">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif-species tracking-wide text-white flex items-center gap-1.5">
                <span>Zoo Sign Optical Scanner</span>
                <span className="text-[10px] bg-[#3d6046] text-[#eef3ed] px-1.5 py-0.5 rounded font-mono">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-[10px] text-[#c2d1bf]">
                Point camera at exhibit plaque to scan multi-species signs & log seen status
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {renderModeSwitcher && (
              <div className="hidden sm:block">
                {renderModeSwitcher()}
              </div>
            )}
            <button
              onClick={onClose}
              className="text-[#c2d1bf] hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher if available */}
        {renderModeSwitcher && (
          <div className="sm:hidden bg-[#243c2c] px-3 py-2 border-b border-[#3d5e44] flex justify-center">
            {renderModeSwitcher()}
          </div>
        )}

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold text-xs p-1">
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Camera Live Capture / Upload */}
        {step === 'capture' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[380px] bg-[#1a2119] text-white">
            
            {/* Live Camera Viewfinder or Error State */}
            <div className="relative w-full max-w-lg aspect-4/3 bg-black rounded-lg overflow-hidden border border-[#3d4f3b] flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center text-xs text-[#a6b5a2] space-y-3">
                  <Camera className="w-10 h-10 mx-auto text-[#6b7c67] opacity-60" />
                  <p>{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2e4a36] text-white rounded-md text-xs font-semibold hover:bg-[#3d6046] transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Sign Image</span>
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Framing Overlay for Sign Plaque */}
                  <div className="absolute inset-4 border-2 border-dashed border-amber-400/70 rounded-lg pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between items-center text-[10px] text-amber-200 bg-black/60 px-2 py-1 rounded backdrop-blur-xs w-fit">
                      <span>Center zoo plaque / species board inside box</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-white/70">
                      <span>Supports multi-species signs</span>
                      {coordinates && <span>📍 GPS Ready</span>}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Hidden canvas & file input */}
            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Capture & Switch Controls */}
            <div className="mt-4 w-full max-w-lg flex items-center justify-between gap-3 px-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#2a3828] hover:bg-[#3a4d37] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Upload image from device"
              >
                <Upload className="w-4 h-4 text-[#a7baa4]" />
                <span className="hidden sm:inline">Upload Image</span>
              </button>

              {!cameraError && (
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold rounded-full shadow-lg text-sm transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-slate-950" />
                  <span>Snap Sign Photo</span>
                </button>
              )}

              {!cameraError && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 bg-[#2a3828] hover:bg-[#3a4d37] text-white rounded-lg text-xs transition-colors cursor-pointer"
                  title="Flip camera"
                >
                  <RefreshCw className="w-4 h-4 text-[#a7baa4]" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#8e9e8b] mt-3 text-center">
              Works on single species signs, multi-species aviaries, reptile houses, and safari exhibits.
            </p>
          </div>
        )}

        {/* Step 2: Processing AI State */}
        {step === 'processing' && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4 bg-[#faf7f2]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-[#2e4a36]/20 border-t-[#2e4a36] animate-spin" />
              <Sparkles className="w-7 h-7 text-amber-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1f241d] font-serif-species">
                Reading Zoo Sign Plaque...
              </h3>
              <p className="text-xs text-[#576054] max-w-sm mt-1">
                Gemini Vision is extracting species binomials, vernacular names, and IUCN statuses from the sign.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review, Tick Seen Status & Edit Details */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#faf7f2] text-xs">
            
            {/* Top Bar: Venue, Enclosure & Location */}
            <div className="bg-white border border-[#e2dacd] rounded-lg p-3 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2e4a36] flex items-center gap-1.5 font-serif-species text-sm">
                  <Layers className="w-4 h-4 text-[#2e4a36]" />
                  Exhibit & Location Details
                </span>
                {coordinates && (
                  <span className="text-[10px] font-mono bg-[#eef3ed] text-[#2e4a36] px-2 py-0.5 rounded border border-[#cfddce] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2e4a36]" />
                    {coordinates.latitude}, {coordinates.longitude}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#576054] mb-0.5">
                    Location / Zoo Venue
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                    className="w-full bg-[#fdfbf7] border border-[#d8d0c4] rounded px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                    placeholder="e.g. Singapore Zoo"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#576054] mb-0.5">
                    Enclosure / Exhibit Name
                  </label>
                  <input
                    type="text"
                    value={enclosureName}
                    onChange={e => setEnclosureName(e.target.value)}
                    className="w-full bg-[#fdfbf7] border border-[#d8d0c4] rounded px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                    placeholder="e.g. Hornbill Aviary"
                  />
                </div>
              </div>
            </div>

            {/* Species Checklist Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="font-bold text-sm text-[#1f241d] font-serif-species flex items-center gap-1.5">
                  <span>Species on Sign ({scannedSpecies.length})</span>
                  <span className="text-[11px] font-sans font-normal text-[#6b7568]">
                    — Tick whether each species was seen
                  </span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-[11px] font-medium text-[#2e4a36] hover:underline cursor-pointer"
                >
                  Tick All Seen
                </button>
                <span className="text-[#c2d1bf]">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-[11px] font-medium text-[#6b7568] hover:underline cursor-pointer"
                >
                  Untick All
                </button>
              </div>
            </div>

            {/* Species Items List with Ticking */}
            <div className="space-y-2">
              {scannedSpecies.map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  className={`p-3 rounded-lg border transition-all ${
                    sp.isSeen 
                      ? 'bg-white border-[#2e4a36]/40 shadow-xs' 
                      : 'bg-[#f4efe6]/60 border-[#ded5c8] opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Checkbox & Name */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSeen(sp.id)}
                        className={`mt-0.5 p-1 rounded transition-colors cursor-pointer shrink-0 ${
                          sp.isSeen 
                            ? 'bg-[#2e4a36] text-white' 
                            : 'bg-white border border-[#b8ae9f] text-transparent hover:text-slate-300'
                        }`}
                        title={sp.isSeen ? 'Mark as Not Seen' : 'Mark as Seen'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#1f241d] text-xs font-serif-species">
                            {sp.vernacularName}
                          </span>
                          <span className="italic text-[#576054] text-[11px]">
                            ({sp.scientificName})
                          </span>
                          {sp.iucnCategory && sp.iucnCategory !== 'LC' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              {sp.iucnCategory}
                            </span>
                          )}
                        </div>

                        {sp.alternateNames && sp.alternateNames.length > 0 && (
                          <div className="text-[10px] text-[#6b7568] mt-0.5">
                            Also: {sp.alternateNames.join(', ')}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#788574]">
                          {sp.taxonomy?.class && <span>Class: {sp.taxonomy.class}</span>}
                          {sp.taxonomy?.order && <span>• Order: {sp.taxonomy.order}</span>}
                          {sp.taxonomy?.family && <span>• Family: {sp.taxonomy.family}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Seen Status Badge & Remove */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        sp.isSeen 
                          ? 'bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce]' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {sp.isSeen ? <Eye className="w-3 h-3 text-[#2e4a36]" /> : <EyeOff className="w-3 h-3 text-amber-700" />}
                        <span>{sp.isSeen ? 'Seen (Life List)' : 'Held in Exhibit · Not Seen'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveSpecies(sp.id)}
                        className="text-[#9ea89b] hover:text-red-700 p-1 rounded"
                        title="Remove from list"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add manual species button / form */}
            {!isAddingCustom ? (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="w-full py-2 border border-dashed border-[#b8ae9f] hover:border-[#2e4a36] text-[#576054] hover:text-[#2e4a36] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Species to this Sign</span>
              </button>
            ) : (
              <div className="bg-white border border-[#2e4a36]/30 p-3 rounded-lg space-y-2">
                <div className="font-bold text-[#2e4a36] text-xs">Add Extra Species</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Common Name (e.g. Wrinkled Hornbill)"
                    value={customVernacular}
                    onChange={e => setCustomVernacular(e.target.value)}
                    className="border border-[#d8d0c4] rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Scientific Name (e.g. Aceros corrugatus)"
                    value={customScientific}
                    onChange={e => setCustomScientific(e.target.value)}
                    className="border border-[#d8d0c4] rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-2 py-1 text-xs text-[#576054]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualSpecies}
                    className="px-3 py-1 bg-[#2e4a36] text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Add Species
                  </button>
                </div>
              </div>
            )}

            {/* Explanation Note */}
            <div className="bg-[#eef3ed] border border-[#cfddce] rounded-lg p-2.5 text-[11px] text-[#2e4a36] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#2e4a36]" />
              <div>
                <strong>How this works:</strong> Species ticked as <strong>Seen</strong> are added to your main Life List. Species left unticked are preserved in this enclosure's inventory at <strong>{venueName}</strong>, so you can track all species held at the zoo and see what you missed!
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-[#f4efe6] border-t border-[#e2dacd] px-4 py-3 flex items-center justify-between shrink-0">
          {step === 'review' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('capture')}
                className="px-3 py-1.5 border border-[#c5bcad] text-[#576054] hover:bg-white rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Retake Photo
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-[#576054] hover:text-[#1f241d] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitEnclosure}
                  className="px-4 py-1.5 bg-[#2e4a36] hover:bg-[#233a2a] text-white rounded-md text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Save Enclosure & Log {scannedSpecies.filter(s => s.isSeen).length} Seen
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-[#576054] hover:text-[#1f241d] text-xs font-medium ml-auto"
              >
                Close
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
