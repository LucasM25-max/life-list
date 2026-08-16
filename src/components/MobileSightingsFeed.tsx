import React from 'react';
import { Observation } from '../types';
import { 
  Sparkles, 
  MapPin, 
  Tag, 
  Trash2, 
  Edit3, 
  ExternalLink,
  User,
  Trees,
  Building,
  Zap,
  Calendar,
  Layers
} from 'lucide-react';
import { SpeciesImage } from './SpeciesImage';

interface MobileSightingsFeedProps {
  observations: Observation[];
  onSelectObservation: (obs: Observation) => void;
  onEditObservation: (obs: Observation) => void;
  onDeleteObservation: (id: string) => void;
  onViewTaxon: (scientificName: string) => void;
  onOpenQuickLog: () => void;
}

export const MobileSightingsFeed: React.FC<MobileSightingsFeedProps> = ({
  observations,
  onSelectObservation,
  onEditObservation,
  onDeleteObservation,
  onViewTaxon,
  onOpenQuickLog
}) => {
  if (observations.length === 0) {
    return (
      <div className="py-12 px-4 text-center bg-white border border-[#e6dfd3] rounded-2xl shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#eef3ed] text-[#2e4a36] mx-auto flex items-center justify-center shadow-xs">
          <Zap className="w-7 h-7 fill-current text-[#2e4a36]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#1f241d] font-serif-species">Your Life List is Fresh</h3>
          <p className="text-xs text-[#6b7568] max-w-xs mx-auto">
            Ready to log what you see! Tap Quick Log below to rapidly record aquarium tanks, aviaries, or wildlife.
          </p>
        </div>
        <button
          onClick={onOpenQuickLog}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e4a36] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
        >
          <Zap className="w-4 h-4 fill-current text-[#a9d9b6]" />
          <span>Launch Quick Log</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {observations.map((obs) => {
        const isWild = obs.wildStatus === 'wild';
        return (
          <div
            key={obs.id}
            onClick={() => onSelectObservation(obs)}
            className="bg-white border border-[#e6dfd3] active:border-[#2e4a36] rounded-xl p-3.5 shadow-2xs transition-all active:bg-[#faf9f6] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2.5">
              <SpeciesImage
                scientificName={obs.scientificName}
                commonName={obs.vernacularName}
                fallbackPhotoUrl={obs.photoUrl}
                observations={observations}
                className="w-14 h-14 rounded-lg object-cover border border-[#d8d0c4] shrink-0 shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                {/* Header Pills */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {obs.isLifer && (
                    <span className="inline-flex items-center gap-1 bg-[#fefcbf] text-[#744210] border border-[#f6e05e] px-1.5 py-0.2 rounded text-[10px] font-bold">
                      ★ Lifer
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                    isWild 
                      ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                      : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
                  }`}>
                    {isWild ? '🌿 Wild' : '🏛️ Captive'}
                  </span>
                  <span className="text-[10px] font-mono-tag text-[#828d7e]">
                    {obs.taxonomy?.class}
                  </span>
                </div>

                {/* Common Name & Scientific Name */}
                <h3 className="font-bold text-sm text-[#1f241d] leading-tight truncate">
                  {obs.vernacularName || obs.scientificName}
                </h3>
                <div className="flex items-center gap-1 text-xs text-[#576054] font-serif-species italic mt-0.5 truncate">
                  <span>{obs.scientificName}</span>
                </div>
              </div>

              {/* Date & Count */}
              <div className="text-right shrink-0">
                <span className="font-mono-tag text-[11px] font-semibold text-[#1f241d] block">
                  {obs.date}
                </span>
                {obs.count > 1 && (
                  <span className="text-[10px] bg-[#f2ede4] text-[#576054] px-1.5 py-0.2 rounded font-mono-tag inline-block mt-0.5">
                    Count: {obs.count}
                  </span>
                )}
              </div>
            </div>

            {/* Venue & Exhibit Location */}
            <div className="mt-2 pt-2 border-t border-[#f0eae0] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#6b7568] min-w-0 truncate pr-2">
                <MapPin className="w-3.5 h-3.5 text-[#2e4a36] shrink-0" />
                <span className="font-medium text-[#1f241d] truncate">{obs.venueName}</span>
                {obs.exhibitOrHabitat && (
                  <span className="text-[#828d7e] truncate">• {obs.exhibitOrHabitat}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onEditObservation(obs)}
                  className="p-1 text-[#828d7e] hover:text-[#2e4a36] active:bg-[#eef3ed] rounded-md"
                  title="Edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteObservation(obs.id);
                  }}
                  className="p-1 text-[#828d7e] hover:text-red-700 active:bg-red-50 rounded-md cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
