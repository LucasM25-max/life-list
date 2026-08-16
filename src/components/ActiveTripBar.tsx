import React, { useState, useEffect } from 'react';
import { TripRecord, Observation, EnclosureRecord } from '../types';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  Flag, 
  CheckCircle2, 
  Compass, 
  Zap, 
  Eye, 
  ChevronRight,
  Square
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
    <div className="bg-linear-to-r from-[#1b3022] via-[#243d2c] to-[#2e4a36] text-white px-3 sm:px-6 py-2 border-b border-[#3d5e44] shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Left: Live Indicator, Venue & Timer */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono-tag font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>LIVE TRIP</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#a9d9b6] shrink-0" />
            <span className="font-bold text-xs sm:text-sm font-serif-species truncate tracking-wide">
              {activeTrip.venueName}
            </span>
            <span className="text-[11px] text-[#c2d1bf] font-mono-tag shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#a9d9b6]" />
              {elapsedString}
            </span>
          </div>
        </div>

        {/* Right: Sighting metrics + Action buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Sighting metrics pill */}
          <div className="flex items-center gap-2 text-xs font-mono-tag bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
            <span className="text-[#a9d9b6] font-bold">
              🐾 {uniqueTaxa} species
            </span>
            {lifersCount > 0 && (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {lifersCount} lifers
              </span>
            )}
            <span className="text-[#c2d1bf] hidden md:inline">
              ({tripEnclosures.length} encs)
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onViewTripMap(activeTrip.venueName)}
              className="px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-[#e2dacd] hover:text-white rounded-lg border border-white/15 transition-colors cursor-pointer flex items-center gap-1"
              title="View Paw-Print map for this trip"
            >
              <Compass className="w-3.5 h-3.5 text-[#a9d9b6]" />
              <span className="hidden sm:inline">Trip Map</span>
            </button>

            <button
              onClick={onOpenLogModal}
              className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Log Sighting</span>
            </button>

            <button
              onClick={onOpenEndTripModal}
              className="px-2.5 py-1 text-xs font-bold bg-[#8b3a2b] hover:bg-[#a64534] text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Conclude and save this trip"
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">End Trip</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
