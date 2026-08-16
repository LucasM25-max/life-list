import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { EnclosureRecord, Observation, TripRecord, Coordinates } from '../types';
import { formatCoordinates, getAccurateDeviceLocation } from '../utils/geoUtils';
import { 
  MapPin, 
  Layers, 
  Calendar, 
  Clock, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ExternalLink, 
  Crosshair, 
  History, 
  ChevronRight, 
  Trees, 
  Building2, 
  AlertCircle,
  Navigation,
  Compass,
  Maximize2
} from 'lucide-react';
import { SpeciesImage } from './SpeciesImage';

interface EnclosureMapViewProps {
  enclosures: EnclosureRecord[];
  observations: Observation[];
  trips?: TripRecord[];
  activeTrip?: TripRecord | null;
  selectedVenueName?: string;
  onToggleSpeciesSeen: (enclosureId: string, speciesId: string) => void;
  onSelectSpeciesDossier: (scientificName: string) => void;
  onSelectObservation: (obs: Observation) => void;
}

// Leaflet custom SVG paw-print icon generator
const createPawPrintIcon = (
  seenCount: number, 
  totalCount: number, 
  isSelected: boolean = false, 
  isHistorical: boolean = false
) => {
  const isFullySeen = seenCount === totalCount && totalCount > 0;
  const isPartiallySeen = seenCount > 0 && seenCount < totalCount;
  
  let bgColor = '#2e4a36'; // deep forest green (default / fully seen)
  let ringColor = isSelected ? '#10b981' : '#ffffff';
  let badgeColor = '#ffffff';
  let textColor = '#2e4a36';

  if (isHistorical) {
    bgColor = '#526053'; // muted slate for previous visit
  } else if (!isFullySeen && isPartiallySeen) {
    bgColor = '#b45309'; // warm amber for partially seen
  } else if (totalCount > 0 && seenCount === 0) {
    bgColor = '#78716c'; // neutral stone for missed all
  }

  const iconSize = isSelected ? 44 : 36;
  const pinSvg = `
    <div style="position: relative; width: ${iconSize}px; height: ${iconSize}px; transform: translate(-50%, -50%); cursor: pointer;">
      <div style="
        width: ${iconSize}px; 
        height: ${iconSize}px; 
        border-radius: 50%; 
        background: ${bgColor}; 
        border: ${isSelected ? '3px' : '2px'} solid ${ringColor}; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex; 
        align-items: center; 
        justify-content: center; 
        transition: transform 0.2s ease;
        ${isHistorical ? 'border-style: dashed;' : ''}
      ">
        <svg width="${isSelected ? '22' : '18'}" height="${isSelected ? '22' : '18'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="15" r="4" fill="white" />
          <circle cx="6.5" cy="9.5" r="2.5" fill="white" />
          <circle cx="17.5" cy="9.5" r="2.5" fill="white" />
          <circle cx="10" cy="5.5" r="2" fill="white" />
          <circle cx="14" cy="5.5" r="2" fill="white" />
        </svg>
      </div>
      ${totalCount > 0 ? `
        <div style="
          position: absolute; 
          bottom: -4px; 
          right: -4px; 
          background: ${badgeColor}; 
          color: ${textColor}; 
          font-size: 10px; 
          font-weight: 800; 
          font-family: monospace; 
          padding: 1px 5px; 
          border-radius: 9999px; 
          border: 1px solid #d1d5db; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          white-space: nowrap;
        ">
          ${seenCount}/${totalCount}
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html: pinSvg,
    className: 'custom-paw-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Device live location marker
const createUserLocationIcon = () => {
  const userSvg = `
    <div style="position: relative; width: 24px; height: 24px; transform: translate(-50%, -50%);">
      <div style="position: absolute; inset: 0; border-radius: 50%; background: #3b82f6; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 18px; height: 18px; margin: 3px; border-radius: 50%; background: #2563eb; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
    </div>
  `;
  return L.divIcon({
    html: userSvg,
    className: 'user-loc-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export const EnclosureMapView: React.FC<EnclosureMapViewProps> = ({
  enclosures,
  observations,
  trips = [],
  activeTrip,
  selectedVenueName,
  onToggleSpeciesSeen,
  onSelectSpeciesDossier,
  onSelectObservation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [activeEnclosure, setActiveEnclosure] = useState<EnclosureRecord | null>(null);
  const [mapTileStyle, setMapTileStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [selectedVisitFilter, setSelectedVisitFilter] = useState<string>('combined');
  const [deviceLocation, setDeviceLocation] = useState<Coordinates | null>(null);
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);

  // Fetch device GPS on mount for map centering if needed
  useEffect(() => {
    getAccurateDeviceLocation()
      .then(coords => setDeviceLocation(coords))
      .catch(() => {});
  }, []);

  // Filter enclosures for current venue
  const venueEnclosures = useMemo(() => {
    return selectedVenueName
      ? enclosures.filter(e => e.venueName.trim().toLowerCase() === selectedVenueName.trim().toLowerCase())
      : enclosures;
  }, [enclosures, selectedVenueName]);

  // Filter observations for current venue
  const venueObservations = useMemo(() => {
    return selectedVenueName
      ? observations.filter(o => o.venueName.trim().toLowerCase() === selectedVenueName.trim().toLowerCase())
      : observations;
  }, [observations, selectedVenueName]);

  // Identify distinct visits / dates for this venue
  const distinctVisits = useMemo(() => {
    const visits = new Map<string, { label: string; date: string; tripId?: string; isCurrent: boolean }>();
    
    const isActiveVenue = activeTrip && (!selectedVenueName || activeTrip.venueName.trim().toLowerCase() === selectedVenueName.trim().toLowerCase());
    if (isActiveVenue) {
      visits.set('current', {
        label: `Active Trip (${activeTrip.startDate})`,
        date: activeTrip.startDate,
        tripId: activeTrip.id,
        isCurrent: true
      });
    }

    venueEnclosures.forEach(e => {
      const key = e.tripId || e.date;
      if (!visits.has(key)) {
        const isCur = Boolean(activeTrip && (e.tripId === activeTrip.id || (e.date === activeTrip.startDate && isActiveVenue)));
        visits.set(key, {
          label: isCur ? `Active Trip (${e.date})` : `Visit on ${e.date}`,
          date: e.date,
          tripId: e.tripId,
          isCurrent: isCur
        });
      }
    });

    return Array.from(visits.entries()).map(([key, val]) => ({ key, ...val }));
  }, [venueEnclosures, activeTrip, selectedVenueName]);

  // Filter enclosures based on visit selection
  const filteredByVisitEnclosures = useMemo(() => {
    if (selectedVisitFilter === 'combined') {
      return venueEnclosures;
    }
    if (selectedVisitFilter === 'current') {
      if (!activeTrip) return venueEnclosures;
      return venueEnclosures.filter(e => 
        e.tripId === activeTrip.id || 
        (e.createdAt >= activeTrip.startTime && e.venueName.trim().toLowerCase() === activeTrip.venueName.trim().toLowerCase())
      );
    }
    return venueEnclosures.filter(e => e.tripId === selectedVisitFilter || e.date === selectedVisitFilter);
  }, [venueEnclosures, selectedVisitFilter, activeTrip]);

  // Filter enclosures with valid GPS
  const enclosuresWithCoords = useMemo(() => {
    return filteredByVisitEnclosures
      .filter(enc => 
        enc.coordinates && 
        typeof enc.coordinates.latitude === 'number' && 
        typeof enc.coordinates.longitude === 'number' && 
        !isNaN(enc.coordinates.latitude) && 
        !isNaN(enc.coordinates.longitude)
      )
      .map(enc => {
        const isHistorical = Boolean(
          activeTrip && 
          enc.venueName.trim().toLowerCase() === activeTrip.venueName.trim().toLowerCase() && 
          enc.tripId !== activeTrip.id && 
          enc.createdAt < activeTrip.startTime
        );

        return {
          ...enc,
          isHistorical,
          resolvedCoords: [enc.coordinates!.latitude, enc.coordinates!.longitude] as [number, number]
        };
      });
  }, [filteredByVisitEnclosures, activeTrip]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = deviceLocation 
        ? [deviceLocation.latitude, deviceLocation.longitude] 
        : [51.5074, -0.1278];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 15,
        zoomControl: true,
        attributionControl: false
      });

      const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }
  }, []);

  // Update Tile Layer if user toggles style
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    if (mapTileStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (mapTileStyle === 'terrain') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    L.tileLayer(url, {
      maxZoom: 19,
      subdomains: mapTileStyle === 'streets' ? 'abcd' : 'abc'
    }).addTo(map);
  }, [mapTileStyle]);

  // Update Paw Print Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    if (enclosuresWithCoords.length === 0) {
      if (deviceLocation && mapInstanceRef.current) {
        mapInstanceRef.current.setView([deviceLocation.latitude, deviceLocation.longitude], 15);
      }
      return;
    }

    const bounds = L.latLngBounds([]);

    enclosuresWithCoords.forEach((enc) => {
      const encSeen = enc.speciesList.filter(s => s.isSeen).length;
      const encTotal = enc.speciesList.length;
      const isSelected = activeEnclosure?.id === enc.id;

      const icon = createPawPrintIcon(encSeen, encTotal, isSelected, enc.isHistorical);
      const marker = L.marker(enc.resolvedCoords, { icon });

      marker.on('click', () => {
        setActiveEnclosure(enc);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(enc.resolvedCoords, { animate: true });
        }
      });

      marker.bindTooltip(`<b>🐾 ${enc.enclosureName}</b><br/>${encSeen}/${encTotal} species spotted`, {
        direction: 'top',
        offset: [0, -18]
      });

      marker.addTo(markersLayer);
      bounds.extend(enc.resolvedCoords);
    });

    if (deviceLocation) {
      const userMarker = L.marker([deviceLocation.latitude, deviceLocation.longitude], {
        icon: createUserLocationIcon()
      });
      userMarker.bindTooltip('📍 Your Current GPS Location', { direction: 'top' });
      userMarker.addTo(markersLayer);
      userMarkerRef.current = userMarker;
    }

    // Auto-fit bounds
    if (bounds.isValid() && !activeEnclosure) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [enclosuresWithCoords, activeEnclosure, deviceLocation]);

  // Handle "Center on My Location"
  const handleLocateMe = async () => {
    setIsLocatingDevice(true);
    try {
      const coords = await getAccurateDeviceLocation();
      setIsLocatingDevice(false);
      setDeviceLocation(coords);

      if (mapInstanceRef.current) {
        const latLng: [number, number] = [coords.latitude, coords.longitude];
        mapInstanceRef.current.setView(latLng, 17, { animate: true });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(latLng);
        } else {
          const userMarker = L.marker(latLng, { icon: createUserLocationIcon() });
          userMarker.bindTooltip('📍 Your Current GPS Location', { direction: 'top' });
          userMarker.addTo(mapInstanceRef.current);
          userMarkerRef.current = userMarker;
        }
      }
    } catch (err: any) {
      setIsLocatingDevice(false);
      if (err.message === 'denied') {
        alert('Browser location permission was denied. Please allow location in your address bar.');
      } else {
        alert('Could not determine current GPS position.');
      }
    }
  };

  const handleFocusEnclosure = (enc: EnclosureRecord) => {
    setActiveEnclosure(enc);
    if (enc.coordinates && mapInstanceRef.current) {
      mapInstanceRef.current.setView([enc.coordinates.latitude, enc.coordinates.longitude], 17, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-[#e6dfd3] bg-[#eae5dc] flex flex-col md:flex-row shadow-xs">
      
      {/* Interactive Map Canvas */}
      <div className="relative flex-1 h-full min-h-[340px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top-Left: Clean Visit Filter Pill */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-[#d8d0c4] rounded-xl p-1 shadow-sm text-xs">
          <button
            onClick={() => setSelectedVisitFilter('combined')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedVisitFilter === 'combined'
                ? 'bg-[#2e4a36] text-white shadow-2xs font-bold'
                : 'text-[#576054] hover:bg-slate-100'
            }`}
          >
            All Exhibits ({venueEnclosures.length})
          </button>

          {activeTrip && (
            <button
              onClick={() => setSelectedVisitFilter('current')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                selectedVisitFilter === 'current'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Current Trip</span>
            </button>
          )}

          {distinctVisits.length > 1 && (
            <select
              value={selectedVisitFilter}
              onChange={e => setSelectedVisitFilter(e.target.value)}
              className="bg-transparent text-[11px] text-[#576054] font-medium border-l border-[#d8d0c4] pl-2 pr-1 py-1 focus:outline-none cursor-pointer"
            >
              <option value="combined">Combined Map</option>
              {distinctVisits.map(v => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Top-Right: Map Style & Locate Me */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            onClick={handleLocateMe}
            disabled={isLocatingDevice}
            className="bg-white/95 backdrop-blur-xs border border-[#d8d0c4] rounded-xl px-2.5 py-1.5 shadow-sm text-xs font-bold text-[#2e4a36] hover:bg-[#eef3ed] transition-colors cursor-pointer flex items-center gap-1"
            title="Center on My Live Device GPS Location"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocatingDevice ? 'animate-spin text-blue-600' : 'text-[#2e4a36]'}`} />
            <span className="hidden sm:inline text-[11px]">GPS</span>
          </button>

          <div className="flex items-center bg-white/95 backdrop-blur-xs border border-[#d8d0c4] rounded-xl p-0.5 shadow-sm text-xs">
            <button
              onClick={() => setMapTileStyle('streets')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                mapTileStyle === 'streets' ? 'bg-[#2e4a36] text-white' : 'text-[#576054] hover:bg-slate-100'
              }`}
            >
              Streets
            </button>
            <button
              onClick={() => setMapTileStyle('satellite')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                mapTileStyle === 'satellite' ? 'bg-[#2e4a36] text-white' : 'text-[#576054] hover:bg-slate-100'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Bottom-Left: Sleek Map Legend */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-[#d8d0c4] rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-3 text-[11px] text-[#576054]">
          <span className="font-bold text-[#1f241d] flex items-center gap-1">
            🐾 Pins:
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2e4a36]" />
            <span>Spotted All</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
            <span>Partial</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#78716c]" />
            <span>Missed</span>
          </span>
        </div>
      </div>

      {/* Exhibit Details & Browser Sidebar */}
      <div className="w-full md:w-[360px] bg-[#faf7f2] border-t md:border-t-0 md:border-l border-[#e2dacd] flex flex-col h-[320px] md:h-full z-10">
        
        {activeEnclosure ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Exhibit Header */}
            <div className="p-3.5 bg-white border-b border-[#e2dacd] shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#1f241d] font-serif-species truncate">
                    🐾 {activeEnclosure.enclosureName}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#6b7568] mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#2e4a36]" />
                      <span>{activeEnclosure.date}</span>
                    </span>
                    {activeEnclosure.coordinates && (
                      <span className="flex items-center gap-1 text-[#2e4a36] font-mono bg-[#eef3ed] px-1.5 py-0.2 rounded">
                        <Navigation className="w-2.5 h-2.5" />
                        <span>{formatCoordinates(activeEnclosure.coordinates)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setActiveEnclosure(null)}
                  className="text-[#828d7e] hover:text-[#1f241d] p-1 rounded-md cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Spotted badge */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[#576054]">Exhibit Checklist:</span>
                <span className="font-mono font-bold text-[#2e4a36] bg-[#eef3ed] px-2 py-0.5 rounded-full border border-[#cfddce] text-[11px]">
                  {activeEnclosure.speciesList.filter(s => s.isSeen).length} / {activeEnclosure.speciesList.length} Spotted
                </span>
              </div>
            </div>

            {/* Species Checklist */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {activeEnclosure.speciesList.map((sp) => {
                const obs = venueObservations.find(o => o.scientificName.toLowerCase() === sp.scientificName.toLowerCase() || o.id === sp.observationId);
                const hasPhoto = sp.photoUrl || obs?.photoUrl;

                return (
                  <div
                    key={sp.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      sp.isSeen
                        ? 'bg-white border-[#2e4a36]/30 shadow-2xs'
                        : 'bg-[#f4efe6] border-[#ded5c8] opacity-90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Toggle Checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleSpeciesSeen(activeEnclosure.id, sp.id)}
                          className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                            sp.isSeen
                              ? 'bg-[#2e4a36] text-white hover:bg-[#243b2a]'
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
                          className="w-9 h-9 rounded-lg object-cover border border-[#d8d0c4] shrink-0"
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
                          {sp.taxonomy?.class && (
                            <div className="text-[9px] text-[#788574] mt-0.5">
                              {sp.taxonomy.class} {sp.taxonomy.family ? `· ${sp.taxonomy.family}` : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photo / Status */}
                      <div className="shrink-0">
                        {hasPhoto ? (
                          <img
                            src={hasPhoto}
                            alt={sp.vernacularName}
                            className="w-8 h-8 rounded-lg object-cover border border-[#d8d0c4]"
                          />
                        ) : (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                            sp.isSeen 
                              ? 'bg-[#eef3ed] text-[#2e4a36]' 
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {sp.isSeen ? 'Spotted' : 'Missed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="p-2.5 bg-white border-t border-[#e2dacd] flex items-center justify-between text-xs shrink-0">
              <button
                onClick={() => setActiveEnclosure(null)}
                className="text-[11px] text-[#6b7568] hover:text-[#1f241d] font-semibold"
              >
                Back to Exhibit List
              </button>
              <button
                onClick={() => {
                  const obs = venueObservations.find(o => o.enclosureId === activeEnclosure.id);
                  if (obs) onSelectObservation(obs);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2e4a36] hover:underline cursor-pointer"
              >
                <span>Observation Log</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        ) : (
          /* Exhibit Browser (When no marker is selected) */
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 bg-white border-b border-[#e2dacd] shrink-0">
              <h4 className="font-bold text-xs text-[#1f241d] font-serif-species flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#2e4a36]" />
                <span>Exhibits in this Location ({filteredByVisitEnclosures.length})</span>
              </h4>
              <p className="text-[10px] text-[#6b7568] mt-0.5">
                Click any exhibit to center and inspect on the map:
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredByVisitEnclosures.map(enc => {
                const encSeen = enc.speciesList.filter(s => s.isSeen).length;
                const encTotal = enc.speciesList.length;

                return (
                  <button
                    key={enc.id}
                    onClick={() => handleFocusEnclosure(enc)}
                    className="w-full text-left p-2.5 rounded-xl bg-white border border-[#e2dacd] hover:border-[#2e4a36] hover:bg-[#faf9f6] flex items-center justify-between text-xs transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#1f241d] group-hover:text-[#2e4a36] truncate">
                        🐾 {enc.enclosureName}
                      </div>
                      <div className="text-[10px] text-[#6b7568] flex items-center gap-1.5 mt-0.5">
                        <span>{enc.date}</span>
                        {enc.coordinates && <span className="text-[#2e4a36]">📍 GPS</span>}
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 border ${
                      encSeen === encTotal
                        ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                        : encSeen > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {encSeen}/{encTotal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
