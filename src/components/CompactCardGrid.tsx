import React from 'react';
import { Observation } from '../types';
import { Sparkles, MapPin, Tag, User, Trees, Building, Calendar, Edit3, Trash2 } from 'lucide-react';

interface CompactCardGridProps {
  observations: Observation[];
  onSelectObservation: (obs: Observation) => void;
  onEditObservation: (obs: Observation) => void;
  onDeleteObservation: (id: string) => void;
  onViewTaxon: (scientificName: string) => void;
}

export const CompactCardGrid: React.FC<CompactCardGridProps> = ({
  observations,
  onSelectObservation,
  onEditObservation,
  onDeleteObservation,
  onViewTaxon
}) => {
  if (observations.length === 0) {
    return (
      <div className="py-16 text-center bg-white border border-[#e6dfd3] rounded-md">
        <div className="w-12 h-12 rounded-full bg-[#eee9e0] text-[#828d7e] mx-auto flex items-center justify-center mb-3">
          <Trees className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#1f241d] font-serif-species">No Sightings Found</h3>
        <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1">
          No records match your active search and filter criteria. Try clearing filters or logging a new species.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {observations.map(obs => {
        const isWild = obs.wildStatus === 'wild';
        return (
          <div
            key={obs.id}
            onClick={() => onSelectObservation(obs)}
            className="bg-white border border-[#e6dfd3] hover:border-[#2e4a36]/60 rounded-md p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              {/* Header with status badges */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {obs.isLifer && (
                    <span className="inline-flex items-center gap-0.5 bg-[#fefcbf] text-[#744210] border border-[#f6e05e] px-1.5 py-0.2 rounded-xs text-[10px] font-bold">
                      ★ Lifer
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded-xs border ${
                    isWild 
                      ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                      : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
                  }`}>
                    {isWild ? <Trees className="w-2.5 h-2.5" /> : <Building className="w-2.5 h-2.5" />}
                    {isWild ? 'Wild' : 'Zoo'}
                  </span>
                  <span className="text-[10px] font-mono-tag text-[#828d7e]">
                    {obs.taxonomy?.class}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => onEditObservation(obs)}
                    className="p-1 text-[#6b7568] hover:text-[#2e4a36] rounded"
                    title="Edit"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteObservation(obs.id);
                    }}
                    className="p-1 text-[#6b7568] hover:text-red-700 rounded cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Species Name & Binomial & Thumbnail */}
              <div className="mb-2 flex items-start gap-2.5">
                {obs.photoUrl && (
                  <img
                    src={obs.photoUrl}
                    alt={obs.vernacularName || obs.scientificName}
                    className="w-12 h-12 rounded object-cover border border-[#d8d0c4] shrink-0 shadow-2xs"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-[#1f241d] leading-tight truncate">
                    {obs.vernacularName || obs.scientificName}
                  </div>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTaxon(obs.scientificName);
                    }}
                    className="font-serif-species italic text-xs text-[#576054] hover:text-[#2e4a36] mt-0.5 cursor-pointer truncate"
                  >
                    {obs.scientificName}
                  </div>
                </div>
              </div>

              {/* Venue & Exhibit */}
              <div className="text-xs text-[#576054] flex items-start gap-1 mb-1.5">
                <MapPin className="w-3 h-3 text-[#828d7e] shrink-0 mt-0.5" />
                <div className="truncate">
                  <span className="font-medium text-[#1f241d]">{obs.venueName}</span>
                  {obs.exhibitOrHabitat && (
                    <span className="text-[#6b7568]"> • {obs.exhibitOrHabitat}</span>
                  )}
                </div>
              </div>

              {/* Notes excerpt if any */}
              {obs.notes && (
                <p className="text-[11px] text-[#6b7568] line-clamp-2 italic bg-[#f9f8f5] p-1.5 rounded-sm border border-[#f0eae0] mb-2">
                  "{obs.notes}"
                </p>
              )}
            </div>

            {/* Bottom bar */}
            <div className="pt-2 border-t border-[#f0eae0] flex items-center justify-between text-[11px] text-[#828d7e]">
              <div className="flex items-center gap-1 font-mono-tag">
                <Calendar className="w-3 h-3" />
                <span>{obs.date}</span>
                {obs.count > 1 && <span className="text-[#1f241d] font-semibold">(x{obs.count})</span>}
              </div>

              {obs.individualNameOrTag ? (
                <span className="text-[10px] bg-[#e8eef3] text-[#2a4d69] px-1.5 py-0.2 rounded font-mono-tag">
                  {obs.individualNameOrTag}
                </span>
              ) : (
                <span className="text-[10px] font-mono-tag">
                  {obs.taxonomy?.family}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
