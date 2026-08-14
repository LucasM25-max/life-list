import React, { useState } from 'react';
import { Observation } from '../types';
import { curatedTaxa } from '../data/curatedTaxa';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Building2, 
  Trees, 
  User, 
  Layers, 
  Compass,
  Tag,
  Camera,
  Maximize2
} from 'lucide-react';

interface SpeciesDetailModalProps {
  scientificName: string | null;
  observations: Observation[];
  onClose: () => void;
  onSelectObservation: (obs: Observation) => void;
}

export const SpeciesDetailModal: React.FC<SpeciesDetailModalProps> = ({
  scientificName,
  observations,
  onClose,
  onSelectObservation
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!scientificName) return null;

  // Filter observations of this exact species
  const speciesObs = observations.filter(
    o => o.scientificName.toLowerCase() === scientificName.toLowerCase()
  );

  // Match taxon details from curated data if available
  const taxonInfo = curatedTaxa.find(
    t => t.scientificName.toLowerCase() === scientificName.toLowerCase()
  );

  const repObs = speciesObs[0];
  const commonName = repObs?.vernacularName || taxonInfo?.vernacularName || scientificName;
  const authorship = repObs?.authorship || taxonInfo?.authorship || '';
  const totalCountSeen = speciesObs.reduce((acc, o) => acc + (o.count || 1), 0);
  const wildCount = speciesObs.filter(o => o.wildStatus === 'wild').length;
  const captiveCount = speciesObs.filter(o => o.wildStatus === 'captive').length;

  // Photos from observations
  const obsWithPhotos = speciesObs.filter(o => o.photoUrl);
  const heroPhoto = obsWithPhotos[0]?.photoUrl;

  const taxonomy = repObs?.taxonomy || {
    kingdom: taxonInfo?.kingdom || 'Animalia',
    phylum: taxonInfo?.phylum || 'Chordata',
    class: taxonInfo?.class || 'Mammalia',
    order: taxonInfo?.order || '',
    family: taxonInfo?.family || '',
    genus: taxonInfo?.genus || scientificName.split(' ')[0]
  };

  const liferObs = speciesObs.find(o => o.isLifer) || speciesObs[speciesObs.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#e6dfd3] rounded-lg shadow-xl w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#f9f8f5] border-b border-[#e6dfd3] p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            {heroPhoto && (
              <img
                src={heroPhoto}
                alt={commonName}
                onClick={() => setSelectedPhoto(heroPhoto)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover border border-[#2e4a36] shadow-xs cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
                title="Click to expand species photo"
              />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {obsWithPhotos.length > 0 && (
                  <span className="text-[10px] font-mono-tag bg-[#eef3ed] text-[#2e4a36] px-1.5 py-0.2 rounded border border-[#cfddce] flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>{obsWithPhotos.length} Photo{obsWithPhotos.length > 1 ? 's' : ''}</span>
                  </span>
                )}
                {taxonInfo?.iucnCategory && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    taxonInfo.iucnCategory === 'CR' ? 'bg-red-100 text-red-800' :
                    taxonInfo.iucnCategory === 'EN' ? 'bg-orange-100 text-orange-800' :
                    taxonInfo.iucnCategory === 'VU' ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    IUCN: {taxonInfo.iucnCategory}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-[#1f241d] leading-tight">
                {commonName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-serif-species italic text-sm text-[#576054]">
                  {scientificName}
                </span>
                {authorship && (
                  <span className="text-xs text-[#828d7e]">
                    {authorship}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#828d7e] hover:text-[#1f241d] p-1 rounded-md hover:bg-[#eee9e0] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Photo Gallery If Multiple Observations have Photos */}
          {obsWithPhotos.length > 0 && (
            <div className="bg-[#faf9f6] border border-[#e6dfd3] rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono-tag uppercase font-semibold text-[#6b7568] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#2e4a36]" />
                  <span>Field Photo Gallery ({obsWithPhotos.length})</span>
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {obsWithPhotos.map((obs) => (
                  <div
                    key={obs.id}
                    onClick={() => setSelectedPhoto(obs.photoUrl!)}
                    className="relative group rounded-md overflow-hidden border border-[#d8d0c4] aspect-square cursor-pointer bg-black"
                  >
                    <img
                      src={obs.photoUrl}
                      alt={obs.venueName}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5 text-white">
                      <div className="text-[10px] font-bold truncate">{obs.venueName}</div>
                      <div className="text-[9px] text-white/80">{obs.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Taxonomic Lineage */}
          <div className="bg-[#faf9f6] border border-[#e6dfd3] rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono-tag uppercase font-semibold text-[#6b7568]">
                Taxonomic Classification
              </span>
              <a
                href={`https://www.catalogueoflife.org/data/search?q=${encodeURIComponent(scientificName)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-[#2e4a36] hover:underline"
              >
                <span>External Reference</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[11px] font-mono-tag">
              <div className="bg-white p-1.5 rounded border border-[#eee9e0]">
                <div className="text-[9px] text-[#828d7e]">KINGDOM</div>
                <div className="font-bold text-[#1f241d] truncate">{taxonomy.kingdom}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#eee9e0]">
                <div className="text-[9px] text-[#828d7e]">PHYLUM</div>
                <div className="font-bold text-[#1f241d] truncate">{taxonomy.phylum}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#eee9e0]">
                <div className="text-[9px] text-[#828d7e]">CLASS</div>
                <div className="font-bold text-[#2e4a36] truncate">{taxonomy.class}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#eee9e0]">
                <div className="text-[9px] text-[#828d7e]">ORDER</div>
                <div className="font-bold text-[#1f241d] truncate">{taxonomy.order}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#eee9e0]">
                <div className="text-[9px] text-[#828d7e]">FAMILY</div>
                <div className="font-bold text-[#1f241d] truncate">{taxonomy.family}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-[#eee9e0]">
                <div className="text-[9px] text-[#828d7e]">GENUS</div>
                <div className="font-bold text-[#1f241d] font-serif-species italic truncate">{taxonomy.genus}</div>
              </div>
            </div>
          </div>

          {/* Sighting Summary Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#f9f8f5] p-2.5 rounded border border-[#e6dfd3] text-center">
              <div className="text-[10px] text-[#828d7e] uppercase font-mono-tag">Total Encounters</div>
              <div className="text-base font-bold text-[#1f241d]">{speciesObs.length} logs</div>
              <div className="text-[10px] text-[#6b7568]">({totalCountSeen} individuals)</div>
            </div>
            <div className="bg-[#eef3ed] p-2.5 rounded border border-[#cfddce] text-center">
              <div className="text-[10px] text-[#465f4c] uppercase font-mono-tag">Wild Sightings</div>
              <div className="text-base font-bold text-[#2e4a36]">{wildCount}</div>
              <div className="text-[10px] text-[#465f4c]">Free-ranging</div>
            </div>
            <div className="bg-[#faf0e6] p-2.5 rounded border border-[#ecd8c8] text-center">
              <div className="text-[10px] text-[#99582a] uppercase font-mono-tag">Zoo / Captive</div>
              <div className="text-base font-bold text-[#99582a]">{captiveCount}</div>
              <div className="text-[10px] text-[#99582a]">Managed habitat</div>
            </div>
          </div>

          {/* Historical Encounters Timeline */}
          <div>
            <h3 className="text-xs font-bold text-[#1f241d] font-mono-tag uppercase tracking-wider mb-2">
              Encounters Timeline ({speciesObs.length})
            </h3>

            <div className="space-y-2">
              {speciesObs.map((obs) => (
                <div
                  key={obs.id}
                  onClick={() => onSelectObservation(obs)}
                  className="bg-white border border-[#e6dfd3] hover:border-[#2e4a36] p-2.5 rounded-md transition-all cursor-pointer group flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {obs.photoUrl && (
                      <img
                        src={obs.photoUrl}
                        alt="Encounter thumbnail"
                        className="w-10 h-10 rounded object-cover border border-[#d8d0c4] shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {obs.isLifer && (
                          <span className="bg-[#fefcbf] text-[#744210] border border-[#f6e05e] px-1.5 py-0.2 rounded text-[10px] font-bold">
                            ★ Lifer Record
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                          obs.wildStatus === 'wild'
                            ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                            : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
                        }`}>
                          {obs.wildStatus === 'wild' ? '🌿 Wild' : '🏛️ Zoo'}
                        </span>
                        <span className="font-semibold text-xs text-[#1f241d] group-hover:text-[#2e4a36] truncate">
                          {obs.venueName}
                        </span>
                      </div>

                      {obs.exhibitOrHabitat && (
                        <div className="text-[11px] text-[#6b7568] mt-0.5 truncate">
                          📍 {obs.exhibitOrHabitat}
                        </div>
                      )}

                      {obs.individualNameOrTag && (
                        <div className="text-[10px] text-[#2a4d69] font-mono-tag mt-0.5 truncate">
                          🏷️ Animal: {obs.individualNameOrTag}
                        </div>
                      )}

                      {obs.notes && (
                        <p className="text-[11px] text-[#6b7568] italic mt-1 bg-[#f9f8f5] p-1 rounded border border-[#f0eae0] line-clamp-2">
                          "{obs.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-tag text-[11px] font-semibold text-[#1f241d]">
                      {obs.date}
                    </div>
                    {obs.count > 1 && (
                      <div className="text-[10px] text-[#828d7e]">
                        Count: {obs.count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={selectedPhoto}
              alt={commonName}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <div className="text-white text-center mt-2.5">
              <div className="font-bold text-sm">{commonName}</div>
              <div className="font-serif-species italic text-xs text-white/70">{scientificName}</div>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
