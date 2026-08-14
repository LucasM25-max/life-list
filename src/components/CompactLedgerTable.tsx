import React from 'react';
import { Observation } from '../types';
import { 
  Sparkles, 
  MapPin, 
  Tag, 
  Info, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  User,
  Trees,
  Building
} from 'lucide-react';

interface CompactLedgerTableProps {
  observations: Observation[];
  onSelectObservation: (obs: Observation) => void;
  onEditObservation: (obs: Observation) => void;
  onDeleteObservation: (id: string) => void;
  onViewTaxon: (scientificName: string) => void;
}

export const CompactLedgerTable: React.FC<CompactLedgerTableProps> = ({
  observations,
  onSelectObservation,
  onEditObservation,
  onDeleteObservation,
  onViewTaxon
}) => {
  if (observations.length === 0) {
    return (
      <div className="py-16 text-center">
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
    <div className="bg-white border border-[#e6dfd3] rounded-md shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#f9f8f5] border-b border-[#e6dfd3] text-[#576054] font-medium text-[11px] font-mono-tag uppercase tracking-wider">
              <th className="py-2 px-3 w-12 text-center">Status</th>
              <th className="py-2 px-3">Species</th>
              <th className="py-2 px-3 hidden sm:table-cell">Classification</th>
              <th className="py-2 px-3">Location</th>
              <th className="py-2 px-3 hidden md:table-cell">Notes & Tags</th>
              <th className="py-2 px-3 text-right">Date</th>
              <th className="py-2 px-2.5 w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0eae0]">
            {observations.map(obs => {
              const isWild = obs.wildStatus === 'wild';
              return (
                <tr
                  key={obs.id}
                  className="row-hover-highlight transition-colors group cursor-pointer"
                  onClick={() => onSelectObservation(obs)}
                >
                  {/* Status / Lifer indicator */}
                  <td className="py-2 px-3 text-center align-middle" onClick={e => e.stopPropagation()}>
                    {obs.isLifer ? (
                      <span 
                        title="Life List First (Lifer)" 
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f6e05e]/30 text-[#8d6b05] border border-[#d69e2e]/40 text-[10px] font-bold shadow-2xs"
                      >
                        ★
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#a0a89d] font-mono-tag">#{obs.count || 1}</span>
                    )}
                  </td>

                  {/* Species Name Column */}
                  <td className="py-2 px-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      {obs.photoUrl && (
                        <img
                          src={obs.photoUrl}
                          alt={obs.vernacularName || obs.scientificName}
                          className="w-8 h-8 rounded object-cover border border-[#d8d0c4] shrink-0 shadow-2xs"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#1f241d] hover:text-[#2e4a36] text-[13px]">
                            {obs.vernacularName || obs.scientificName}
                          </span>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTaxon(obs.scientificName);
                            }}
                            className="font-serif-species italic text-[#576054] hover:text-[#2e4a36] hover:underline inline-flex items-center gap-0.5 text-xs"
                          >
                            {obs.scientificName}
                          </button>
                        </div>

                        {/* Mobile taxonomic badge */}
                        <div className="sm:hidden text-[10px] text-[#828d7e] mt-0.5">
                          {obs.taxonomy?.class} • {obs.taxonomy?.family}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Taxonomy Breadcrumb */}
                  <td className="py-2 px-3 text-[#576054] hidden sm:table-cell align-middle">
                    <div className="text-[11px] font-mono-tag">
                      <span className="text-[#1f241d] font-medium">{obs.taxonomy?.class}</span>
                      <span className="text-[#c5beaf] mx-1">›</span>
                      <span>{obs.taxonomy?.order}</span>
                      <span className="text-[#c5beaf] mx-1">›</span>
                      <span className="text-[#828d7e]">{obs.taxonomy?.family}</span>
                    </div>
                  </td>

                  {/* Location & Exhibit */}
                  <td className="py-2 px-3 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded-xs border shrink-0 ${
                        isWild 
                          ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                          : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
                      }`}>
                        {isWild ? <Trees className="w-2.5 h-2.5" /> : <Building className="w-2.5 h-2.5" />}
                        {isWild ? 'Wild' : 'Zoo'}
                      </span>
                      <span className="font-medium text-[#1f241d] truncate max-w-[170px]" title={obs.venueName}>
                        {obs.venueName}
                      </span>
                    </div>
                    {obs.exhibitOrHabitat && (
                      <div className="text-[11px] text-[#6b7568] truncate max-w-[200px] mt-0.5">
                        📍 {obs.exhibitOrHabitat}
                      </div>
                    )}
                  </td>

                  {/* Tags & Individual Tag */}
                  <td className="py-2 px-3 text-[#6b7568] hidden md:table-cell align-middle">
                    <div className="flex items-center gap-1 flex-wrap">
                      {obs.individualNameOrTag && (
                        <span className="inline-flex items-center gap-0.5 bg-[#e8eef3] text-[#2a4d69] px-1.5 py-0.2 rounded text-[10px] font-mono-tag border border-[#cadbe7]">
                          <User className="w-2.5 h-2.5" />
                          {obs.individualNameOrTag}
                        </span>
                      )}
                      {(obs.tags || []).slice(0, 2).map((t, idx) => (
                        <span key={idx} className="bg-[#f2ede4] text-[#576054] px-1.5 py-0.2 rounded text-[10px]">
                          {t}
                        </span>
                      ))}
                      {(obs.tags || []).length > 2 && (
                        <span className="text-[10px] text-[#828d7e]">
                          +{obs.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date Column */}
                  <td className="py-2 px-3 text-right font-mono-tag text-[11px] text-[#1f241d] whitespace-nowrap align-middle">
                    <div>{obs.date}</div>
                    {obs.count > 1 && (
                      <span className="text-[10px] text-[#6b7568] bg-[#f2ede4] px-1 rounded">
                        x{obs.count}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-2.5 text-right whitespace-nowrap align-middle" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEditObservation(obs)}
                        title="Edit Sighting"
                        className="p-1 text-[#6b7568] hover:text-[#2e4a36] hover:bg-[#eef3ed] rounded transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteObservation(obs.id);
                        }}
                        title="Delete Sighting"
                        className="p-1 text-[#6b7568] hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
