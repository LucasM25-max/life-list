import React, { useState, useEffect } from 'react';
import { TripRecord, Observation, EnclosureRecord } from '../types';
import { 
  CheckCircle2, 
  Trophy, 
  MapPin, 
  Clock, 
  Sparkles, 
  Compass, 
  Layers, 
  Award, 
  X,
  ArrowRight,
  Eye,
  Calendar,
  Trash2
} from 'lucide-react';

interface EndTripModalProps {
  isOpen: boolean;
  activeTrip?: TripRecord | null;
  observations: Observation[];
  enclosures: EnclosureRecord[];
  onClose: () => void;
  onEndTrip: (notes?: string) => void;
  onDiscardTrip?: () => void;
}

export const EndTripModal: React.FC<EndTripModalProps> = ({
  isOpen,
  activeTrip,
  observations,
  enclosures,
  onClose,
  onEndTrip,
  onDiscardTrip
}) => {
  const [closingNotes, setClosingNotes] = useState('');

  useEffect(() => {
    if (activeTrip) {
      setClosingNotes(activeTrip.notes || '');
    }
  }, [activeTrip, isOpen]);

  if (!isOpen || !activeTrip) return null;

  // Filter observations and enclosures that occurred during this trip
  const tripObs = observations.filter(o => 
    o.tripId === activeTrip.id || 
    (o.venueName.trim().toLowerCase() === activeTrip.venueName.trim().toLowerCase() && 
     o.createdAt >= activeTrip.startTime)
  );

  const tripEnclosures = enclosures.filter(e => 
    e.tripId === activeTrip.id || 
    (e.venueName.trim().toLowerCase() === activeTrip.venueName.trim().toLowerCase() && 
     e.createdAt >= activeTrip.startTime)
  );

  const uniqueTaxa = new Set(tripObs.map(o => o.scientificName.toLowerCase()));
  const lifersCount = tripObs.filter(o => o.isLifer).length;

  // Elapsed time calculation
  const elapsedMs = Math.max(0, Date.now() - activeTrip.startTime);
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`;

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    onEndTrip(closingNotes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#e6dfd3] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-linear-to-r from-[#2e4a36] to-[#1f3424] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif-species tracking-wide">
                Conclude Field Trip
              </h2>
              <p className="text-xs text-[#c2d1bf]">
                Archive expedition stats, GPS paths, and mapped enclosures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleComplete} className="p-4 sm:p-5 space-y-4 text-xs text-[#1f241d]">
          {/* Venue & Time Summary Pill */}
          <div className="bg-[#faf9f6] p-3.5 rounded-xl border border-[#e6dfd3] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#2e4a36]" />
              <div>
                <h3 className="font-bold text-sm text-[#1f241d] font-serif-species">
                  {activeTrip.venueName}
                </h3>
                <span className="text-[11px] text-[#6b7568] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {activeTrip.startDate}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#828d7e] font-mono-tag uppercase">Duration</div>
              <div className="font-bold text-xs text-[#2e4a36] font-mono-tag flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                {durationString}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#eef3ed] p-3 rounded-xl border border-[#cfddce] text-center">
              <div className="text-[10px] font-bold text-[#2e4a36] uppercase font-mono-tag">Species Logged</div>
              <div className="text-xl font-bold text-[#2e4a36] mt-0.5 font-mono">
                {uniqueTaxa.size}
              </div>
              <div className="text-[10px] text-[#576054]">({tripObs.length} sightings)</div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
              <div className="text-[10px] font-bold text-amber-800 uppercase font-mono-tag">Lifers Found</div>
              <div className="text-xl font-bold text-amber-900 mt-0.5 font-mono flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                {lifersCount}
              </div>
              <div className="text-[10px] text-amber-700">New species</div>
            </div>

            <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#e6dfd3] text-center">
              <div className="text-[10px] font-bold text-[#6b7568] uppercase font-mono-tag">Enclosures</div>
              <div className="text-xl font-bold text-[#1f241d] mt-0.5 font-mono">
                {tripEnclosures.length}
              </div>
              <div className="text-[10px] text-[#6b7568]">GPS mapped</div>
            </div>
          </div>

          {/* Species Preview List */}
          {tripObs.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#6b7568] uppercase font-mono-tag">
                Trip Highlights ({tripObs.length})
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-[#fcfbf9] rounded-xl border border-[#eee9e0] text-xs">
                {tripObs.slice(0, 10).map((obs) => (
                  <div key={obs.id} className="flex items-center justify-between py-1 border-b border-[#f4efe6] last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2e4a36]" />
                      <span className="font-semibold text-[#1f241d] truncate">{obs.vernacularName}</span>
                      <span className="text-[11px] italic text-[#6b7568] truncate hidden sm:inline">({obs.scientificName})</span>
                    </div>
                    {obs.isLifer && (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded font-bold font-mono-tag shrink-0">
                        ⭐ Lifer
                      </span>
                    )}
                  </div>
                ))}
                {tripObs.length > 10 && (
                  <p className="text-[10px] text-center text-[#828d7e] pt-1">
                    + {tripObs.length - 10} more species recorded
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Closing Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1f241d] text-xs">
              Expedition Field Summary / Journal Notes
            </label>
            <textarea
              rows={2}
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              placeholder="e.g. Great morning visit. Spotted the baby panda and all crocs active during feeding..."
              className="w-full px-3 py-2 bg-[#faf9f6] border border-[#d8d0c4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#2e4a36] focus:bg-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#f0eae0]">
            {onDiscardTrip ? (
              <button
                type="button"
                onClick={onDiscardTrip}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Discard active trip without archiving"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard Trip</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-[#576054] hover:text-[#1f241d] hover:bg-[#f2ede4] rounded-lg transition-colors cursor-pointer"
              >
                Keep Running
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2e4a36] hover:bg-[#233a2a] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete & Save</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
