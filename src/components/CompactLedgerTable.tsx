import React from 'react';
import { Observation } from '../types';
import { 
  Trees,
  Building,
  Edit3, 
  Trash2, 
  User,
  MapPin
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
      <div className="py-16 text-center bg-white border border-[#e6dfd3] rounded-2xl shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#f4efe6] text-[#828d7e] mx-auto flex items-center justify-center mb-3">
          <Trees className="w-6 h-6 text-[#2e4a36]" />
        </div>
        <h3 className="text-base font-bold text-[#1f241d] font-serif-species">No Sightings Found</h3>
        <p className="text-xs text-[#6b7568] max-w-sm mx-auto mt-1">
          No records match your active search and filter criteria. Try clearing filters or logging a new species.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e6dfd3] rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#faf8f4] border-b border-[#e6dfd3] text-[#576054] font-semibold text-[11px] font-mono-tag uppercase tracking-wider">
              <th className="py-2.5 px-3 w-12 text-center">Status</th>
              <th className="py-2.5 px-3">Species</th>
              <th className="py-2.5 px-3 hidden sm:table-cell">Taxonomy</th>
              <th className="py-2.5 px-3">Location</th>
              <th className="py-2.5 px-3 hidden md:table-cell">Tags & ID</th>
              <th className="py-2.5 px-3 text-right">Date</th>
              <th className="py-2.5 px-3 w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0eae0]">
            {observations.map(obs => {
              const isWild = obs.wildStatus === 'wild';
              return (
                <tr
                  key={obs.id}
                  className="hover:bg-[#fbf9f5] transition-colors group cursor-pointer"
                  onClick={() => onSelectObservation(obs)}
                >
                  {/* Status / Lifer indicator */}
                  <td className="py-2.5 px-3 text-center align-middle" onClick={e => e.stopPropagation()}>
                    {obs.isLifer ? (
                      <span 
                        title="Life List First (Lifer)" 
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold shadow-2xs"
                      >
                        ★
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#828d7e] font-mono-tag">#{obs.count || 1}</span>
                    )}
                  </td>

                  {/* Species Name Column */}
                  <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      {obs.photoUrl && (
                        <img
                          src={obs.photoUrl}
                          alt={obs.vernacularName || obs.scientificName}
                          className="w-9 h-9 rounded-lg object-cover border border-[#d8d0c4] shrink-0 shadow-2xs"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#1f241d] group-hover:text-[#2e4a36] text-[13px] font-serif-species">
                            {obs.vernacularName || obs.scientificName}
                          </span>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTaxon(obs.scientificName);
                            }}
                            className="font-serif-species italic text-[#6b7568] hover:text-[#2e4a36] hover:underline inline-flex items-center gap-0.5 text-xs"
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
                  <td className="py-2.5 px-3 text-[#576054] hidden sm:table-cell align-middle">
                    <div className="text-[11px] font-mono-tag">
                      <span className="text-[#1f241d] font-semibold">{obs.taxonomy?.class}</span>
                      <span className="text-[#c5beaf] mx-1">›</span>
                      <span>{obs.taxonomy?.order}</span>
                      <span className="text-[#c5beaf] mx-1">›</span>
                      <span className="text-[#828d7e]">{obs.taxonomy?.family}</span>
                    </div>
                  </td>

                  {/* Location & Exhibit */}
                  <td className="py-2.5 px-3 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        isWild 
                          ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                          : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
                      }`}>
                        {isWild ? <Trees className="w-2.5 h-2.5" /> : <Building className="w-2.5 h-2.5" />}
                        <span>{isWild ? 'Wild' : 'Captive'}</span>
                      </span>
                      <span className="font-semibold text-[#1f241d] truncate max-w-[170px]" title={obs.venueName}>
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
                  <td className="py-2.5 px-3 text-[#6b7568] hidden md:table-cell align-middle">
                    <div className="flex items-center gap-1 flex-wrap">
                      {obs.individualNameOrTag && (
                        <span className="inline-flex items-center gap-0.5 bg-[#eef4f8] text-[#2a4d69] px-2 py-0.5 rounded-full text-[10px] font-mono-tag border border-[#cadbe7]">
                          <User className="w-2.5 h-2.5" />
                          <span>{obs.individualNameOrTag}</span>
                        </span>
                      )}
                      {(obs.tags || []).slice(0, 2).map((t, idx) => (
                        <span key={idx} className="bg-[#f4efe6] text-[#576054] px-2 py-0.5 rounded-full text-[10px]">
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
                  <td className="py-2.5 px-3 text-right font-mono-tag text-[11px] text-[#1f241d] whitespace-nowrap align-middle">
                    <div className="font-semibold">{obs.date}</div>
                    {obs.count > 1 && (
                      <span className="text-[10px] text-[#6b7568] bg-[#f4efe6] px-1.5 py-0.2 rounded-full font-bold">
                        x{obs.count}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap align-middle" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEditObservation(obs)}
                        title="Edit Sighting"
                        className="p-1.5 text-[#6b7568] hover:text-[#2e4a36] hover:bg-[#eef3ed] rounded-lg transition-colors cursor-pointer"
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
                        className="p-1.5 text-[#6b7568] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
