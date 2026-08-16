import React from 'react';
import { Observation, TripRecord } from '../types';
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
  Layers,
  Navigation,
  Plus
} from 'lucide-react';
import { SpeciesImage } from './SpeciesImage';

interface MobileSightingsFeedProps {
  observations: Observation[];
  activeTrip?: TripRecord | null;
  onOpenStartTrip?: () => void;
  onOpenEndTrip?: () => void;
  onSelectObservation: (obs: Observation) => void;
  onEditObservation: (obs: Observation) => void;
  onDeleteObservation: (id: string) => void;
  onViewTaxon: (scientificName: string) => void;
  onOpenQuickLog: () => void;
}

export const MobileSightingsFeed: React.FC<MobileSightingsFeedProps> = ({
  observations,
  activeTrip,
  onOpenStartTrip,
  onOpenEndTrip,
  onSelectObservation,
  onEditObservation,
  onDeleteObservation,
  onViewTaxon,
  onOpenQuickLog
}) => {
  return (
    <div className="space-y-3">
      {/* Top Visit Banner (Active or Start New Visit) */}
      {activeTrip ? (
        <div className="bg-[#1b3322] text-white p-3 rounded-xl border border-[#2e4a36] shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-mono-tag text-emerald-300 font-bold uppercase tracking-wider">
                Active Visit
              </div>
              <div className="text-xs font-bold font-serif-species truncate">
                {activeTrip.venueName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenQuickLog}
              className="px-2.5 py-1.5 bg-[#2e4a36] hover:bg-[#253f2c] text-white rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log</span>
            </button>
            {onOpenEndTrip && (
              <button
                onClick={onOpenEndTrip}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      ) : (
        onOpenStartTrip && (
          <div className="bg-[#f4efe6] border border-[#e6dfd3] p-3 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#eef3ed] text-[#2e4a36] flex items-center justify-center shrink-0 border border-[#cfddce]">
                <Navigation className="w-4 h-4 text-[#2e4a36]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1f241d]">At a Zoo or Nature Reserve?</div>
                <div className="text-[10px] text-[#6b7568]">Start a visit to log your session</div>
              </div>
            </div>
            <button
              onClick={onOpenStartTrip}
              className="px-3 py-1.5 bg-[#2e4a36] text-white rounded-lg text-xs font-bold shadow-2xs hover:bg-[#233a2b] transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Start Visit</span>
            </button>
          </div>
        )
      )}

      {/* Empty State */}
      {observations.length === 0 ? (
        <div className="py-10 px-4 text-center bg-white border border-[#e6dfd3] rounded-2xl shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#eef3ed] text-[#2e4a36] mx-auto flex items-center justify-center shadow-2xs">
            <Zap className="w-7 h-7 fill-current text-[#2e4a36]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1f241d] font-serif-species">Your Life List is Fresh</h3>
            <p className="text-xs text-[#6b7568] max-w-xs mx-auto">
              Ready to log what you see! Start a visit or tap Log Sighting to record wildlife and exhibits.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {onOpenStartTrip && (
              <button
                onClick={onOpenStartTrip}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#eef3ed] text-[#2e4a36] rounded-xl font-bold text-xs border border-[#cfddce] transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Visit</span>
              </button>
            )}
            <button
              onClick={onOpenQuickLog}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#2e4a36] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current text-[#a9d9b6]" />
              <span>Log Sighting</span>
            </button>
          </div>
        </div>
      ) : (
        /* Feed Items */
        observations.map((obs) => {
          const isWild = obs.wildStatus === 'wild';
          return (
            <div
              key={obs.id}
              onClick={() => onSelectObservation(obs)}
              className="bg-white border border-[#e6dfd3] active:border-[#2e4a36] rounded-xl p-3.5 shadow-2xs transition-all active:bg-[#faf9f6] flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2.5">
                <SpeciesImage
                  scientificName={obs.scientificName}
                  commonName={obs.vernacularName}
                  fallbackPhotoUrl={obs.photoUrl}
                  observations={observations}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewTaxon(obs.scientificName);
                  }}
                  className="w-14 h-14 rounded-lg object-cover border border-[#d8d0c4] shrink-0 shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
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
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTaxon(obs.scientificName);
                    }}
                    className="flex items-center gap-1 text-xs text-[#576054] font-serif-species italic mt-0.5 truncate hover:text-[#2e4a36]"
                  >
                    <span>{obs.scientificName}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
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
                    className="p-1 text-[#828d7e] hover:text-[#2e4a36] active:bg-[#eef3ed] rounded-md cursor-pointer"
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
        })
      )}
    </div>
  );
};

