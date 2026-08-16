import React, { useState, useEffect } from 'react';
import { TripRecord, Observation, EnclosureRecord } from '../types';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  Flag, 
  Eye, 
  ChevronRight,
  Square,
  Navigation
} from 'lucide-react';

interface ActiveTripBarProps {
  activeTrip: TripRecord;
  observations: Observation[];
  enclosures: EnclosureRecord[];
  onOpenLogModal: () => void;
  onOpenEndTripModal: () => void;
  onViewTripMap: (venueName: string) => void;
}

export const ActiveTripBar: React.FC<ActiveTripBarProps> = ({
  activeTrip,
  observations,
  enclosures,
  onOpenLogModal,
  onOpenEndTripModal,
  onViewTripMap
}) => {
  const [elapsedString, setElapsedString] = useState('');

  // Live timer update
  useEffect(() => {
    if (!activeTrip) return;

    const updateElapsed = () => {
      const ms = Math.max(0, Date.now() - activeTrip.startTime);
      const totalSec = Math.floor(ms / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      if (hrs > 0) {
        setElapsedString(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setElapsedString(`${mins}m ${secs}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTrip?.startTime]);

  if (!activeTrip) return null;

  // Trip stats
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
  const uniqueTaxa = new Set(tripObs.map(o => o.scientificName.toLowerCase())).size;
  const lifersCount = tripObs.filter(o => o.isLifer).length;

  return (
    <div className="bg-linear-to-r from-[#172e1f] via-[#213b28] to-[#2e4a36] text-white px-3 sm:px-6 py-2.5 border-b border-[#36593e] shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Left: Live Indicator, Venue & Timer */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono-tag font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>ACTIVE TRIP</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="font-bold text-xs sm:text-sm font-serif-species truncate tracking-wide">
              {activeTrip.venueName}
            </span>
            <span className="text-[11px] text-[#c2d1bf] font-mono-tag shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-300" />
              {elapsedString}
            </span>
          </div>
        </div>

        {/* Right: Sighting metrics + Action buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Sighting metrics pill */}
          <div className="flex items-center gap-2 text-xs font-mono-tag bg-white/10 px-3 py-1 rounded-xl border border-white/15">
            <span className="font-bold text-white flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-emerald-300" />
              <span>{tripObs.length} sightings</span>
            </span>
            <span className="text-white/40">·</span>
            <span className="text-emerald-200">{uniqueTaxa} spp</span>
            {lifersCount > 0 && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-amber-300 font-bold flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>{lifersCount} lifers</span>
                </span>
              </>
            )}
            {tripEnclosures.length > 0 && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-white/80">🐾 {tripEnclosures.length} exhibits</span>
              </>
            )}
          </div>

          {/* View Trip Map Button */}
          <button
            onClick={() => onViewTripMap(activeTrip.venueName)}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer"
          >
            <span>Live Map</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {/* Finish Trip Button */}
          <button
            onClick={onOpenEndTripModal}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Finish Trip</span>
          </button>
        </div>

      </div>
    </div>
  );
};
