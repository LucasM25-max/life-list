import React, { useState, useEffect } from 'react';
import { VenueType, WildStatus, TripRecord } from '../types';
import { getAccurateDeviceLocation } from '../utils/geoUtils';
import { 
  MapPin, 
  Trees, 
  Building2, 
  Compass, 
  Sparkles, 
  X, 
  Navigation, 
  Clock, 
  Check, 
  Flag,
  ChevronRight
} from 'lucide-react';

interface StartTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTrip: (tripData: Omit<TripRecord, 'id' | 'startTime' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  recentVenues: string[];
  defaultVenue?: string;
}

const POPULAR_SUGGESTIONS = [
  { name: 'San Diego Zoo', type: 'zoo' as VenueType, wild: 'captive' as WildStatus },
  { name: 'San Diego Zoo Safari Park', type: 'safari_park' as VenueType, wild: 'captive' as WildStatus },
  { name: 'Monterey Bay Aquarium', type: 'aquarium' as VenueType, wild: 'captive' as WildStatus },
  { name: 'Chester Zoo', type: 'zoo' as VenueType, wild: 'captive' as WildStatus },
  { name: 'ZSL London Zoo', type: 'zoo' as VenueType, wild: 'captive' as WildStatus },
  { name: 'Singapore Zoo', type: 'zoo' as VenueType, wild: 'captive' as WildStatus },
  { name: 'Taronga Zoo Sydney', type: 'zoo' as VenueType, wild: 'captive' as WildStatus },
  { name: 'Bronx Zoo', type: 'zoo' as VenueType, wild: 'captive' as WildStatus },
  { name: 'Kruger National Park', type: 'national_park' as VenueType, wild: 'wild' as WildStatus },
  { name: 'Serengeti National Park', type: 'national_park' as VenueType, wild: 'wild' as WildStatus },
  { name: 'Yellowstone National Park', type: 'national_park' as VenueType, wild: 'wild' as WildStatus }
];

export const StartTripModal: React.FC<StartTripModalProps> = ({
  isOpen,
  onClose,
  onStartTrip,
  recentVenues,
  defaultVenue
}) => {
  const [venueName, setVenueName] = useState(defaultVenue || '');
  const [venueType, setVenueType] = useState<VenueType>('zoo');
  const [wildStatus, setWildStatus] = useState<WildStatus>('captive');
  const [notes, setNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVenueName(defaultVenue || recentVenues[0] || '');
      setNotes('');
      setError(null);
    }
  }, [isOpen, defaultVenue, recentVenues]);

  if (!isOpen) return null;

  const handleLocateMe = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const coords = await getAccurateDeviceLocation();
      setIsLocating(false);
      if (!venueName.trim()) {
        setVenueName(`Field Survey (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`);
        setWildStatus('wild');
        setVenueType('nature_reserve');
      }
    } catch (err: any) {
      setIsLocating(false);
      if (err.message === 'denied') {
        setError('Location access was denied in browser permissions. Please allow location in your address bar.');
      } else {
        setError('Could not retrieve GPS position. Please enter the venue name manually.');
      }
    }
  };

  const handleSelectSuggestion = (name: string, type: VenueType, wild: WildStatus) => {
    setVenueName(name);
    setVenueType(type);
    setWildStatus(wild);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim()) {
      setError('Please enter the name of the zoo, park, or reserve.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    onStartTrip({
      venueName: venueName.trim(),
      venueType,
      wildStatus,
      startDate: today,
      notes: notes.trim() || undefined,
      observationIds: [],
      enclosureIds: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#e6dfd3] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-linear-to-r from-[#243d2c] to-[#2e4a36] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Compass className="w-5 h-5 text-[#a9d9b6] animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif-species tracking-wide">
                Start Field Trip
              </h2>
              <p className="text-xs text-[#c2d1bf]">
                Lock your visit location, track real-time GPS sightings, and map exhibits
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs text-[#1f241d]">
          {error && (
            <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs border border-red-200 flex items-center gap-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Venue Name input with Locate button */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1f241d] flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2e4a36]" />
                Destination / Institution Name *
              </span>
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="text-[11px] text-[#2e4a36] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting...' : 'Detect GPS'}</span>
              </button>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={venueName}
              onChange={e => {
                setVenueName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. San Diego Zoo, Monterey Bay Aquarium..."
              className="w-full px-3 py-2.5 bg-[#faf9f6] border border-[#d8d0c4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2e4a36] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Quick suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#6b7568] uppercase font-mono-tag tracking-wider">
              Popular Destinations & Recent
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none py-0.5">
              {recentVenues.slice(0, 4).map(v => (
                <button
                  key={`rec-${v}`}
                  type="button"
                  onClick={() => setVenueName(v)}
                  className="px-2.5 py-1 bg-[#eef3ed] text-[#2e4a36] hover:bg-[#dfeada] rounded-lg text-xs font-semibold border border-[#cfddce] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-[#2e4a36]" />
                  <span>{v}</span>
                </button>
              ))}
              {POPULAR_SUGGESTIONS.slice(0, 5).map(s => (
                <button
                  key={`pop-${s.name}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(s.name, s.type, s.wild)}
                  className="px-2.5 py-1 bg-[#faf9f6] text-[#576054] hover:bg-[#f2ede4] rounded-lg text-xs font-medium border border-[#e6dfd3] transition-colors cursor-pointer"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Habitat Status & Venue Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Wild Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1f241d] text-xs">
                Setting / Context
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setWildStatus('captive')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    wildStatus === 'captive'
                      ? 'bg-[#2e4a36] text-white border-[#2e4a36] shadow-xs'
                      : 'bg-[#faf9f6] text-[#576054] border-[#e6dfd3] hover:bg-[#f2ede4]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Captive / Zoo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWildStatus('wild')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    wildStatus === 'wild'
                      ? 'bg-[#2e4a36] text-white border-[#2e4a36] shadow-xs'
                      : 'bg-[#faf9f6] text-[#576054] border-[#e6dfd3] hover:bg-[#f2ede4]'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>Wild / Reserve</span>
                </button>
              </div>
            </div>

            {/* Venue Type */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1f241d] text-xs">
                Institution / Venue Type
              </label>
              <select
                value={venueType}
                onChange={e => setVenueType(e.target.value as VenueType)}
                className="w-full px-3 py-2 bg-[#faf9f6] border border-[#d8d0c4] rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2e4a36] focus:bg-white"
              >
                <option value="zoo">Zoo (Zoological Park)</option>
                <option value="safari_park">Safari Park</option>
                <option value="aquarium">Aquarium</option>
                <option value="nature_reserve">Nature Reserve</option>
                <option value="national_park">National Park</option>
                <option value="botanical_garden">Botanical Garden / Aviary</option>
                <option value="wildlife_sanctuary">Wildlife Sanctuary</option>
                <option value="other">Other / Expedition</option>
              </select>
            </div>
          </div>

          {/* Expedition Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1f241d] text-xs">
              Expedition Goal / Initial Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Searching for rare reptiles, afternoon bird photography..."
              className="w-full px-3 py-2 bg-[#faf9f6] border border-[#d8d0c4] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2e4a36] focus:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f0eae0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#576054] hover:text-[#1f241d] hover:bg-[#f2ede4] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#2e4a36] hover:bg-[#233a2a] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Start Field Trip</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
