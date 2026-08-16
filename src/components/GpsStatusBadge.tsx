import React, { useState } from 'react';
import { Coordinates } from '../types';
import { GpsStatus, formatCoordinates } from '../utils/geoUtils';
import { Navigation, RefreshCw, AlertTriangle, CheckCircle2, MapPin, Edit3, X } from 'lucide-react';

interface GpsStatusBadgeProps {
  coordinates: Coordinates | null;
  status: GpsStatus;
  errorMessage?: string | null;
  isLocating: boolean;
  onRefresh: () => void;
  onApplyManualCoords: (lat: string, lng: string) => boolean;
  compact?: boolean;
}

export function GpsStatusBadge({
  coordinates,
  status,
  errorMessage,
  isLocating,
  onRefresh,
  onApplyManualCoords,
  compact = false
}: GpsStatusBadgeProps) {
  const [showManual, setShowManual] = useState(false);
  const [latInput, setLatInput] = useState(coordinates ? String(coordinates.latitude) : '');
  const [lngInput, setLngInput] = useState(coordinates ? String(coordinates.longitude) : '');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!latInput || !lngInput) {
      setInputError('Please enter valid latitude and longitude');
      return;
    }
    const success = onApplyManualCoords(latInput.trim(), lngInput.trim());
    if (success) {
      setShowManual(false);
      setInputError(null);
    } else {
      setInputError('Invalid coordinates (Lat -90 to 90, Lng -180 to 180)');
    }
  };

  return (
    <div className="w-full space-y-1.5 text-xs">
      {/* Main Status Bar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#f4efe6] border border-[#d8d0c4] text-[#1f241d]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {status === 'locked' && (
            <div className="flex items-center gap-1.5 text-[#2e4a36] font-mono text-[11px] min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <Navigation className="w-3.5 h-3.5 shrink-0 text-[#2e4a36]" />
              <span className="font-semibold truncate">
                {coordinates ? formatCoordinates(coordinates) : 'GPS Locked'}
              </span>
            </div>
          )}

          {status === 'manual' && (
            <div className="flex items-center gap-1.5 text-blue-800 font-mono text-[11px] min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span className="font-semibold truncate">
                📌 Pin: {coordinates ? formatCoordinates(coordinates) : 'Manual Pin'}
              </span>
            </div>
          )}

          {status === 'acquiring' && (
            <div className="flex items-center gap-1.5 text-amber-800 text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
              <span>Acquiring live GPS fix...</span>
            </div>
          )}

          {(status === 'denied' || status === 'unavailable' || status === 'timeout' || status === 'unsupported' || (status === 'idle' && !coordinates)) && (
            <div className="flex items-center gap-1.5 text-amber-800 text-[11px] min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="truncate">
                {status === 'denied'
                  ? 'Location blocked by browser'
                  : status === 'timeout'
                  ? 'GPS signal timed out'
                  : 'GPS offline / not acquired'}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLocating}
            className="p-1 px-2 rounded bg-white hover:bg-slate-100 border border-[#cfddce] text-[#2e4a36] font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
            title="Retry live GPS location"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Searching...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowManual(!showManual);
              if (coordinates) {
                setLatInput(String(coordinates.latitude));
                setLngInput(String(coordinates.longitude));
              }
            }}
            className="p-1 px-2 rounded bg-white hover:bg-slate-100 border border-[#d8d0c4] text-[#576054] text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
            title="Enter or adjust coordinates manually"
          >
            <Edit3 className="w-2.5 h-2.5" />
            <span>Pin</span>
          </button>
        </div>
      </div>

      {/* Helpful Permission Guidance If Denied */}
      {status === 'denied' && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
          <span className="shrink-0 text-amber-700 font-bold">ℹ️</span>
          <div>
            <span>
              Browser location permission is currently denied. Click the lock/tune icon in your browser address bar to allow location access, then click <strong>Refresh</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Collapsible Manual Coordinates Entry */}
      {showManual && (
        <form onSubmit={handleSaveManual} className="p-2.5 bg-white border border-[#cfddce] rounded-lg space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#2e4a36]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Set GPS Coordinates Manually</span>
            </span>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {inputError && (
            <div className="text-[10px] text-red-600 font-medium">
              ⚠️ {inputError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-[#576054] block mb-0.5">Latitude (e.g. 52.5057)</label>
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={e => setLatInput(e.target.value)}
                placeholder="52.5057"
                className="w-full px-2 py-1 text-xs border border-[#cfddce] rounded font-mono focus:outline-none focus:border-[#2e4a36]"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#576054] block mb-0.5">Longitude (e.g. 13.3400)</label>
              <input
                type="number"
                step="any"
                value={lngInput}
                onChange={e => setLngInput(e.target.value)}
                placeholder="13.3400"
                className="w-full px-2 py-1 text-xs border border-[#cfddce] rounded font-mono focus:outline-none focus:border-[#2e4a36]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="px-2 py-1 rounded text-[10px] text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-[#2e4a36] hover:bg-[#233a2a] text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Apply Pin</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
