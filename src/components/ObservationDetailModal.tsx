import React, { useState } from 'react';
import { Observation } from '../types';
import { 
  X, 
  MapPin, 
  User, 
  Edit3, 
  Trash2, 
  ExternalLink,
  Camera,
  Maximize2
} from 'lucide-react';

interface ObservationDetailModalProps {
  observation: Observation | null;
  onClose: () => void;
  onEdit: (obs: Observation) => void;
  onDelete: (id: string) => void;
  onViewTaxon: (scientificName: string) => void;
}

export const ObservationDetailModal: React.FC<ObservationDetailModalProps> = ({
  observation,
  onClose,
  onEdit,
  onDelete,
  onViewTaxon
}) => {
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);

  if (!observation) return null;

  const isWild = observation.wildStatus === 'wild';

  return (
    <div className="flex flex-col bg-white overflow-hidden animate-in fade-in duration-150 sm:rounded-2xl border border-[#e6dfd3] shadow-sm w-full mx-auto max-w-3xl flex-1 mb-6">
      <div className="flex flex-col w-full h-full text-xs">
        {/* Header */}
        <div className="bg-[#faf8f4] border-b border-[#e6dfd3] p-4 sm:p-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              {observation.isLifer && (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs">
                  ★ Lifer
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isWild 
                  ? 'bg-[#eef3ed] text-[#2e4a36] border-[#cfddce]'
                  : 'bg-[#faf0e6] text-[#99582a] border-[#ecd8c8]'
              }`}>
                {isWild ? 'Wild' : 'Captive'}
              </span>
              <span className="text-[10px] font-mono-tag text-[#828d7e]">
                {observation.taxonomy?.class}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#1f241d] font-serif-species leading-tight">
              {observation.vernacularName || observation.scientificName}
            </h2>
            <button
              onClick={() => onViewTaxon(observation.scientificName)}
              className="font-serif-species italic text-xs sm:text-sm text-[#6b7568] hover:text-[#2e4a36] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              <span>{observation.scientificName}</span>
              {observation.authorship && <span className="text-xs text-[#828d7e] not-italic">{observation.authorship}</span>}
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(observation)}
              className="p-2 text-[#576054] hover:text-[#2e4a36] hover:bg-[#eef3ed] rounded-xl transition-colors cursor-pointer"
              title="Edit sighting"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDelete(observation.id);
                onClose();
              }}
              className="p-2 text-[#576054] hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Delete sighting"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#828d7e] hover:text-[#1f241d] hover:bg-[#f4efe6] rounded-xl transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
          {/* Captured Field Photo */}
          {observation.photoUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#d8d0c4] bg-black relative group shadow-sm">
              <img
                src={observation.photoUrl}
                alt={observation.vernacularName || observation.scientificName}
                className="w-full max-h-64 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
                onClick={() => setIsPhotoExpanded(true)}
              />
              <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Camera className="w-3 h-3 text-[#a9d9b6]" />
                <span>Field Photo</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoExpanded(true)}
                className="absolute bottom-2.5 right-2.5 bg-black/70 hover:bg-black text-white p-2 rounded-xl transition-opacity"
                title="Expand photo"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Location & Exhibit Card */}
          <div className="bg-[#faf8f4] border border-[#e6dfd3] rounded-2xl p-3.5">
            <div className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
              Location & Habitat
            </div>
            <div className="font-bold text-sm text-[#1f241d] font-serif-species flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2e4a36]" />
              <span>{observation.venueName}</span>
            </div>
            {observation.exhibitOrHabitat && (
              <div className="text-xs text-[#576054] mt-1 pl-5">
                Exhibit / Habitat: <span className="font-semibold text-[#1f241d]">{observation.exhibitOrHabitat}</span>
              </div>
            )}
            {observation.country && (
              <div className="text-[11px] text-[#828d7e] pl-5 mt-0.5">
                {observation.region ? `${observation.region}, ` : ''}{observation.country}
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono-tag">
            <div className="bg-white p-2.5 rounded-xl border border-[#e6dfd3]">
              <div className="text-[9px] text-[#828d7e]">DATE</div>
              <div className="font-bold text-[#1f241d]">{observation.date}</div>
              {observation.time && <div className="text-[10px] text-[#828d7e]">{observation.time}</div>}
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-[#e6dfd3]">
              <div className="text-[9px] text-[#828d7e]">COUNT</div>
              <div className="font-bold text-[#1f241d]">{observation.count || 1} individual{observation.count > 1 ? 's' : ''}</div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-[#e6dfd3]">
              <div className="text-[9px] text-[#828d7e]">SEX</div>
              <div className="font-bold text-[#1f241d] capitalize">{observation.sex || 'unspecified'}</div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-[#e6dfd3]">
              <div className="text-[9px] text-[#828d7e]">STAGE</div>
              <div className="font-bold text-[#1f241d] capitalize">{observation.lifeStage || 'adult'}</div>
            </div>
          </div>

          {/* Individual animal tag */}
          {observation.individualNameOrTag && (
            <div className="bg-[#eef4f8] p-3 rounded-2xl border border-[#cadbe7] flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#2a4d69]" />
              <div>
                <div className="text-[10px] uppercase font-mono-tag text-[#2a4d69] font-semibold">Individual Animal / Tag</div>
                <div className="font-bold text-xs text-[#1f241d]">{observation.individualNameOrTag}</div>
              </div>
            </div>
          )}

          {/* Taxonomic Hierarchy */}
          <div className="bg-[#faf8f4] p-3 rounded-2xl border border-[#e6dfd3]">
            <div className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
              Taxonomic Hierarchy
            </div>
            <div className="text-xs font-mono-tag text-[#576054] space-y-0.5">
              <div>Class: <span className="font-semibold text-[#1f241d]">{observation.taxonomy?.class}</span></div>
              <div>Order: <span className="font-semibold text-[#1f241d]">{observation.taxonomy?.order}</span></div>
              <div>Family: <span className="font-semibold text-[#1f241d]">{observation.taxonomy?.family}</span></div>
              <div>Genus: <span className="font-serif-species italic font-semibold text-[#1f241d]">{observation.taxonomy?.genus}</span></div>
            </div>
          </div>

          {/* Field Notes */}
          {observation.notes && (
            <div>
              <div className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
                Field Notes
              </div>
              <p className="text-xs text-[#1f241d] bg-[#faf8f4] p-3 rounded-2xl border border-[#e6dfd3] whitespace-pre-wrap leading-relaxed">
                {observation.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {(observation.tags || []).length > 0 && (
            <div>
              <div className="text-[10px] font-mono-tag uppercase text-[#6b7568] font-bold mb-1">
                Tags & Behaviors
              </div>
              <div className="flex flex-wrap gap-1.5">
                {observation.tags.map((t, idx) => (
                  <span key={idx} className="bg-[#f4efe6] text-[#576054] px-2.5 py-0.5 rounded-full text-xs border border-[#ded6c9]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Photo Lightbox */}
      {isPhotoExpanded && observation.photoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsPhotoExpanded(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={observation.photoUrl}
              alt={observation.vernacularName || observation.scientificName}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
            <div className="text-white text-center mt-2.5 space-y-0.5">
              <div className="font-bold text-sm">{observation.vernacularName || observation.scientificName}</div>
              <div className="text-xs text-white/70">{observation.venueName} • {observation.date}</div>
            </div>
            <button
              onClick={() => setIsPhotoExpanded(false)}
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
