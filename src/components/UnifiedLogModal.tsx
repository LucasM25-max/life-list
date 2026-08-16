import React, { useState } from 'react';
import { Observation, EnclosureRecord, VenueType, TripRecord } from '../types';
import { QuickAddModal } from './QuickAddModal';
import { QuickLogModal } from './QuickLogModal';
import { Zap, FileText } from 'lucide-react';

export type UnifiedLogMode = 'quick' | 'walkthrough' | 'single' | 'detailed' | 'scan';

interface UnifiedLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: UnifiedLogMode | string;
  recentVenues: string[];
  defaultVenueName?: string;
  defaultVenueType?: VenueType;
  defaultEnclosurePrefix?: string;
  enclosureIndex?: number;
  existingObservations: Observation[];
  editingObservation?: Observation | null;
  activeTrip?: TripRecord | null;
  onSaveSingle: (obs: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>) => void;
  onSaveBatch: (observations: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[]) => void;
  onSaveEnclosureAndObservations: (enclosure: EnclosureRecord, newObservations: Observation[]) => void;
}

export const UnifiedLogModal: React.FC<UnifiedLogModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'quick',
  recentVenues,
  defaultVenueName,
  defaultVenueType = 'zoo',
  defaultEnclosurePrefix = 'Enclosure',
  enclosureIndex = 1,
  existingObservations,
  editingObservation,
  activeTrip,
  onSaveSingle,
  onSaveBatch,
  onSaveEnclosureAndObservations
}) => {
  // Normalize initialMode: 'single'/'detailed' -> 'single', otherwise 'quick'
  const normalizedInitial = (m?: string): 'quick' | 'single' => {
    if (m === 'single' || m === 'detailed') return 'single';
    return 'quick';
  };

  const [activeMode, setActiveMode] = useState<'quick' | 'single'>(() => {
    if (editingObservation) return 'single';
    return normalizedInitial(initialMode);
  });

  // Sync mode when modal opens or editing changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingObservation) {
        setActiveMode('single');
      } else {
        setActiveMode(normalizedInitial(initialMode));
      }
    }
  }, [isOpen, editingObservation, initialMode]);

  if (!isOpen) return null;

  // Custom unified Mode Switcher Tab Bar rendered inside modal headers
  const renderModeSwitcher = () => (
    <div className="flex items-center bg-[#1f3424] p-0.5 rounded-lg border border-[#3d5e44] text-xs">
      <button
        type="button"
        onClick={() => setActiveMode('quick')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
          activeMode === 'quick'
            ? 'bg-white text-[#1f3424] shadow-xs'
            : 'text-[#c2d1bf] hover:text-white'
        }`}
      >
        <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
        <span>Quick Log</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveMode('single')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
          activeMode === 'single'
            ? 'bg-white text-[#1f3424] shadow-xs'
            : 'text-[#c2d1bf] hover:text-white'
        }`}
      >
        <FileText className="w-3.5 h-3.5" />
        <span>Single Log</span>
      </button>
    </div>
  );

  return (
    <>
      {activeMode === 'quick' && (
        <QuickLogModal
          isOpen={isOpen}
          onClose={onClose}
          onSaveBatch={(batch) => {
            onSaveBatch(batch);
            onClose();
          }}
          onSaveEnclosureAndObservations={(enc, obsList) => {
            onSaveEnclosureAndObservations(enc, obsList);
            onClose();
          }}
          recentVenues={recentVenues}
          defaultVenueName={activeTrip?.venueName || defaultVenueName}
          defaultVenueType={activeTrip?.venueType || defaultVenueType}
          defaultEnclosurePrefix={defaultEnclosurePrefix}
          enclosureIndex={enclosureIndex}
          activeTrip={activeTrip}
          renderModeSwitcher={!editingObservation ? renderModeSwitcher : undefined}
        />
      )}

      {activeMode === 'single' && (
        <QuickAddModal
          isOpen={isOpen}
          onClose={onClose}
          onSave={(obs) => {
            onSaveSingle(obs);
            onClose();
          }}
          existingObservations={existingObservations}
          editingObservation={editingObservation}
          activeTrip={activeTrip}
          renderModeSwitcher={!editingObservation ? renderModeSwitcher : undefined}
        />
      )}
    </>
  );
};
