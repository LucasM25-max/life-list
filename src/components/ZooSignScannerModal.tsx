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
            <div className="p-1.5 bg-white/10 rounded-lg text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif-species tracking-wide text-white">
                Scan Sign
              </h2>
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
              className="text-[#c2d1bf] hover:text-white p-1 rounded-md transition-colors cursor-pointer"
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
          <div className="flex-1 flex flex-col min-h-0 bg-black text-white relative overflow-hidden">
            
            {/* Live Camera Viewfinder or Error State */}
            <div className="relative flex-1 min-h-[360px] sm:min-h-[460px] bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-xs text-white space-y-4 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-white font-serif-species">
                      Sign Camera Unavailable
                    </p>
                    <p className="text-[11px] text-white/70">
                      {cameraError}
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e4a36] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#3d5e45] cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
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
                  <div className="absolute inset-6 sm:inset-10 border border-amber-400/30 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 border-t-3 border-l-3 border-amber-400 absolute -top-1 -left-1 rounded-tl-xl shadow-lg" />
                    <div className="w-10 h-10 sm:w-14 sm:h-14 border-t-3 border-r-3 border-amber-400 absolute -top-1 -right-1 rounded-tr-xl shadow-lg" />
                    <div className="w-10 h-10 sm:w-14 sm:h-14 border-b-3 border-l-3 border-amber-400 absolute -bottom-1 -left-1 rounded-bl-xl shadow-lg" />
                    <div className="w-10 h-10 sm:w-14 sm:h-14 border-b-3 border-r-3 border-amber-400 absolute -bottom-1 -right-1 rounded-br-xl shadow-lg" />

                    <div className="text-[10px] text-amber-300 font-mono-tag tracking-wider bg-black/60 px-3 py-1 rounded-full border border-amber-400/30 shadow-md">
                      Align sign or plaque inside frame
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/65 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15 pointer-events-none text-center">
                    <span className="text-[11px] text-white/90 font-medium">
                      Ensure species text is legible and in focus
                    </span>
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

            {/* Capture & Switch Controls Tray */}
            <div className="p-4 sm:p-5 bg-[#17241b] border-t border-[#2d4232] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 text-xs font-semibold text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                title="Upload an image file"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Upload Image</span>
                <span className="sm:hidden">Upload</span>
              </button>

              {!cameraError && (
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
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
                onClick={toggleFacingMode}
                className="px-3.5 py-2.5 text-xs font-semibold text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Flip</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Processing AI State */}
        {step === 'processing' && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-3 bg-[#faf7f2]">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-3 border-[#2e4a36]/20 border-t-[#2e4a36] animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1f241d] font-serif-species">
                Scanning Sign...
              </h3>
              <p className="text-xs text-[#6b7568] max-w-sm mt-0.5">
                Extracting species details from image.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review, Tick Seen Status & Edit Details */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf7f2] text-xs">
            
            {/* Top Bar: Venue, Enclosure & Location */}
            <div className="bg-white border border-[#e2dacd] rounded-lg p-3 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2e4a36] flex items-center gap-1.5 font-serif-species text-xs">
                  <Layers className="w-3.5 h-3.5 text-[#2e4a36]" />
                  Location & Exhibit
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
                  <label className="block text-[10px] font-mono-tag uppercase text-[#576054] mb-0.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                    className="w-full bg-[#fdfbf7] border border-[#d8d0c4] rounded px-2.5 py-1.5 text-xs text-[#1f241d] focus:outline-none focus:ring-1 focus:ring-[#2e4a36]"
                    placeholder="e.g. San Diego Zoo Safari Park"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono-tag uppercase text-[#576054] mb-0.5">
                    Exhibit / Area
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
                <h4 className="font-bold text-xs text-[#1f241d] font-serif-species">
                  Species on Sign ({scannedSpecies.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-[11px] font-medium text-[#2e4a36] hover:underline cursor-pointer"
                >
                  Tick All
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
                  className={`p-2.5 rounded-lg border transition-all ${
                    sp.isSeen 
                      ? 'bg-white border-[#2e4a36]/40 shadow-xs' 
                      : 'bg-[#f4efe6]/60 border-[#ded5c8] opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    
                    {/* Checkbox & Name */}
                    <div className="flex items-start gap-2 flex-1 min-w-0">
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

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#788574]">
                          {sp.taxonomy?.class && <span>{sp.taxonomy.class}</span>}
                          {sp.taxonomy?.family && <span>• {sp.taxonomy.family}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Seen Status Badge & Remove */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        sp.isSeen 
                          ? 'bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce]' 
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        {sp.isSeen ? <Eye className="w-3 h-3 text-[#2e4a36]" /> : <EyeOff className="w-3 h-3 text-stone-500" />}
                        <span>{sp.isSeen ? 'Seen' : 'Not Seen'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveSpecies(sp.id)}
                        className="text-[#9ea89b] hover:text-red-700 p-1 rounded cursor-pointer"
                        title="Remove"
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
                <span>Add Species</span>
              </button>
            ) : (
              <div className="bg-white border border-[#2e4a36]/30 p-3 rounded-lg space-y-2">
                <div className="font-bold text-[#2e4a36] text-xs">Add Species</div>
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
                    className="px-2 py-1 text-xs text-[#576054] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualSpecies}
                    className="px-3 py-1 bg-[#2e4a36] text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
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
                Retake
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-[#576054] hover:text-[#1f241d] text-xs font-medium cursor-pointer"
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
                    Save ({scannedSpecies.filter(s => s.isSeen).length} seen)
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-[#576054] hover:text-[#1f241d] text-xs font-medium ml-auto cursor-pointer"
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
