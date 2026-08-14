import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { EnclosureRecord, EnclosureSpecies, Observation } from '../types';
import { 
  MapPin, 
  Layers, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Compass, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Clock
} from 'lucide-react';

interface EnclosureMapViewProps {
  enclosures: EnclosureRecord[];
  observations: Observation[];
  selectedVenueName?: string;
  onToggleSpeciesSeen: (enclosureId: string, speciesId: string) => void;
  onSelectSpeciesDossier: (scientificName: string) => void;
  onSelectObservation: (obs: Observation) => void;
}

// Custom Paw Print SVG generator for Leaflet DivIcon
function createPawPrintIcon(seenCount: number, totalCount: number, isSelected: boolean) {
  const isAllSeen = seenCount === totalCount && totalCount > 0;
  const isPartiallySeen = seenCount > 0 && seenCount < totalCount;
  
  let bgColor = '#2e4a36'; // Pine green
  let borderColor = '#ffffff';
  let badgeColor = '#1f3424';

  if (isPartiallySeen) {
    bgColor = '#b45309'; // Amber
    badgeColor = '#78350f';
  } else if (seenCount === 0 && totalCount > 0) {
    bgColor = '#475569'; // Slate
    badgeColor = '#334155';
  }

  const pawSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18">
      <!-- Main pad -->
      <path d="M12 11.5c-2.4 0-4.3 1.9-4.3 4.2 0 1.8 1.4 3.3 3.3 3.3.6 0 1.1-.1 1-.1.1 0 .6.1 1 .1 1.9 0 3.3-1.5 3.3-3.3 0-2.3-1.9-4.2-4.3-4.2z" />
      <!-- Toe pads -->
      <ellipse cx="6.5" cy="9.5" rx="1.8" ry="2.2" transform="rotate(-20 6.5 9.5)" />
      <ellipse cx="10" cy="6.5" rx="1.8" ry="2.2" transform="rotate(-8 10 6.5)" />
      <ellipse cx="14" cy="6.5" rx="1.8" ry="2.2" transform="rotate(8 14 6.5)" />
      <ellipse cx="17.5" cy="9.5" rx="1.8" ry="2.2" transform="rotate(20 17.5 9.5)" />
    </svg>
  `;

  return L.divIcon({
    className: 'custom-paw-marker-container',
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        background-color: ${bgColor};
        border: 2.5px solid ${borderColor};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) ${isSelected ? 'scale(1.2)' : 'scale(1)'};
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          ${pawSvg}
        </div>
        ${totalCount > 0 ? `
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: ${badgeColor};
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            font-family: monospace;
            padding: 1px 4px;
            border-radius: 9999px;
            border: 1.5px solid #ffffff;
            transform: rotate(45deg);
          ">
            ${seenCount}/${totalCount}
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });
}

// Fallback zoo coordinates generator if no GPS is provided
const DEFAULT_ZOO_COORDINATES: Record<string, [number, number]> = {
  'singapore zoo': [1.4043, 103.7930],
  'mandai wildlife reserve': [1.4043, 103.7930],
  'san diego zoo safari park': [33.0975, -116.9957],
  'san diego zoo': [32.7353, -117.1490],
  'chester zoo': [53.2274, -2.8841],
  'london zoo': [51.5353, -0.1534],
  'zsl london zoo': [51.5353, -0.1534],
  'taronga zoo': [-33.8435, 151.2413],
  'bronx zoo': [40.8506, -73.8770],
  'berlin zoological garden': [52.5080, 13.3376],
  'serengeti national park': [-2.3333, 34.8333],
  'kruger national park': [-23.9884, 31.5547]
};

export function EnclosureMapView({
  enclosures,
  observations,
  selectedVenueName,
  onToggleSpeciesSeen,
  onSelectSpeciesDossier,
  onSelectObservation
}: EnclosureMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeEnclosure, setActiveEnclosure] = useState<EnclosureRecord | null>(null);
  const [mapTileStyle, setMapTileStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');

  // Filter enclosures matching venue if selected
  const filteredEnclosures = selectedVenueName
    ? enclosures.filter(e => e.venueName.trim().toLowerCase() === selectedVenueName.trim().toLowerCase())
    : enclosures;

  // Filter observations matching venue if selected
  const venueObservations = selectedVenueName
    ? observations.filter(o => o.venueName.trim().toLowerCase() === selectedVenueName.trim().toLowerCase())
    : observations;

  // Compute resolved coordinates for each enclosure
  const enclosuresWithCoords = filteredEnclosures.map((enc, idx) => {
    if (enc.coordinates && enc.coordinates.latitude && enc.coordinates.longitude) {
      return {
        ...enc,
        resolvedCoords: [enc.coordinates.latitude, enc.coordinates.longitude] as [number, number]
      };
    }
    
    // Check if venue has known base coords and offset slightly by index
    const vKey = enc.venueName.trim().toLowerCase();
    const base = DEFAULT_ZOO_COORDINATES[vKey] || [1.4043, 103.7930]; // default Singapore Zoo
    const angle = (idx * 65 * Math.PI) / 180;
    const distance = 0.0008 * (idx + 1); // ~80m offset
    const offsetLat = base[0] + distance * Math.cos(angle);
    const offsetLng = base[1] + distance * Math.sin(angle);
    return {
      ...enc,
      resolvedCoords: [offsetLat, offsetLng] as [number, number]
    };
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [1.4043, 103.7930],
        zoom: 16,
        zoomControl: true,
        attributionControl: false
      });

      // Default OpenStreetMap / CartoDB tiles
      const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount handled gracefully
    };
  }, []);

  // Update Tile Layer if user toggles satellite/streets
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

  // Update Paw Print Markers whenever enclosures or active selection change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    if (enclosuresWithCoords.length === 0) return;

    const bounds = L.latLngBounds([]);

    enclosuresWithCoords.forEach((enc) => {
      const seenCount = enc.speciesList.filter(s => s.isSeen).length;
      const totalCount = enc.speciesList.length;
      const isSelected = activeEnclosure?.id === enc.id;

      const icon = createPawPrintIcon(seenCount, totalCount, isSelected);
      const marker = L.marker(enc.resolvedCoords, { icon });

      marker.on('click', () => {
        setActiveEnclosure(enc);
        mapInstanceRef.current?.panTo(enc.resolvedCoords, { animate: true, duration: 0.5 });
      });

      marker.bindTooltip(`
        <div style="font-weight:bold; font-size:11px; font-family:sans-serif; color:#1f241d;">
          🐾 ${enc.enclosureName}
        </div>
        <div style="font-size:10px; color:#576054;">
          ${seenCount}/${totalCount} species spotted
        </div>
      `, { direction: 'top', offset: [0, -32] });

      marker.addTo(markersLayer);
      bounds.extend(enc.resolvedCoords);
    });

    // Fit map bounds
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [enclosuresWithCoords, activeEnclosure]);

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-[#d8d0c4] bg-[#eae5dc] flex flex-col sm:flex-row shadow-sm">
      
      {/* Interactive Map Area */}
      <div className="relative flex-1 h-full min-h-[350px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map View Controls Overlay */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-[#cfddce] rounded-lg p-1 shadow-md text-xs">
          <button
            onClick={() => setMapTileStyle('streets')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              mapTileStyle === 'streets' ? 'bg-[#2e4a36] text-white font-bold' : 'text-[#576054] hover:bg-slate-100'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setMapTileStyle('satellite')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              mapTileStyle === 'satellite' ? 'bg-[#2e4a36] text-white font-bold' : 'text-[#576054] hover:bg-slate-100'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapTileStyle('terrain')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              mapTileStyle === 'terrain' ? 'bg-[#2e4a36] text-white font-bold' : 'text-[#576054] hover:bg-slate-100'
            }`}
          >
            Terrain
          </button>
        </div>

        {/* Map Legend Floating Pill */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-[#d8d0c4] rounded-lg px-3 py-1.5 shadow-md flex items-center gap-3 text-[11px] text-[#576054]">
          <span className="font-bold font-serif-species text-[#1f241d] flex items-center gap-1">
            🐾 Paw Print Legend:
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2e4a36]" />
            <span>All Seen</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
            <span>Partially Seen</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
            <span>Sign Only</span>
          </span>
        </div>
      </div>

      {/* Selected Enclosure Details Sidebar / Drawer */}
      <div className="w-full sm:w-[360px] bg-[#faf7f2] border-t sm:border-t-0 sm:border-l border-[#e2dacd] flex flex-col h-[320px] sm:h-full z-10">
        
        {activeEnclosure ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Enclosure Header */}
            <div className="p-3.5 bg-white border-b border-[#e2dacd] shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono-tag uppercase tracking-wider text-[#6b7568] font-bold">
                    {activeEnclosure.venueName}
                  </span>
                  <h3 className="font-bold text-sm text-[#1f241d] font-serif-species flex items-center gap-1.5 mt-0.5">
                    <span>🐾 {activeEnclosure.enclosureName}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setActiveEnclosure(null)}
                  className="text-[#828d7e] hover:text-[#1f241d] p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date / Time / Stats bar */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6b7568]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#2e4a36]" />
                  <span>{activeEnclosure.date}</span>
                </span>
                {activeEnclosure.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#2e4a36]" />
                    <span>{activeEnclosure.time}</span>
                  </span>
                )}
                <span className="ml-auto font-mono font-bold bg-[#eef3ed] text-[#2e4a36] px-1.5 py-0.2 rounded border border-[#cfddce]">
                  {activeEnclosure.speciesList.filter(s => s.isSeen).length} / {activeEnclosure.speciesList.length} Spotted
                </span>
              </div>
            </div>

            {/* Species List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              <div className="font-semibold text-[11px] text-[#576054] flex items-center justify-between pb-1 border-b border-[#eee7db]">
                <span>Species in this Enclosure:</span>
                <span className="text-[10px] text-[#828d7e]">
                  Click check to toggle sighting
                </span>
              </div>

              {activeEnclosure.speciesList.map((sp) => (
                <div
                  key={sp.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    sp.isSeen
                      ? 'bg-white border-[#2e4a36]/30 shadow-2xs'
                      : 'bg-[#f4efe6] border-[#ded5c8] opacity-85'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    
                    {/* Toggle Checkbox & Names */}
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleSpeciesSeen(activeEnclosure.id, sp.id)}
                        className={`mt-0.5 p-1 rounded transition-colors cursor-pointer shrink-0 ${
                          sp.isSeen
                            ? 'bg-[#2e4a36] text-white hover:bg-[#243b2a]'
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
                        {sp.taxonomy?.class && (
                          <div className="text-[9px] text-[#788574] mt-0.5">
                            {sp.taxonomy.class} {sp.taxonomy.order ? `• ${sp.taxonomy.order}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                        sp.isSeen 
                          ? 'bg-[#eef3ed] text-[#2e4a36] border border-[#cfddce]' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {sp.isSeen ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                        <span>{sp.isSeen ? 'Seen' : 'Missed'}</span>
                      </span>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-2.5 bg-white border-t border-[#e2dacd] flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-[#6b7568]">
                {activeEnclosure.speciesList.length} species documented
              </span>
              <button
                onClick={() => {
                  // Find first observation linked to this enclosure
                  const obs = venueObservations.find(o => o.enclosureId === activeEnclosure.id);
                  if (obs) onSelectObservation(obs);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2e4a36] hover:underline cursor-pointer"
              >
                <span>View Full Log</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#6b7568] space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#eef3ed] border border-[#cfddce] flex items-center justify-center text-[#2e4a36]">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <h4 className="font-bold text-sm text-[#1f241d] font-serif-species">
              Select an Enclosure Marker
            </h4>
            <p className="text-xs max-w-[220px]">
              Click any 🐾 Paw Print icon on the map to explore the species roster held in that exhibit.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
