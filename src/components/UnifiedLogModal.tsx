import React, { useState } from 'react';
import { Observation, EnclosureRecord, VenueType } from '../types';
import { QuickAddModal } from './QuickAddModal';
import { QuickLogModal } from './QuickLogModal';
import { ZooSignScannerModal } from './ZooSignScannerModal';
import { Camera, Zap, FileText, X } from 'lucide-react';

export type UnifiedLogMode = 'scan' | 'walkthrough' | 'detailed';

interface UnifiedLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: UnifiedLogMode;
  recentVenues: string[];
  defaultVenueName?: string;
  defaultVenueType?: VenueType;
  defaultEnclosurePrefix?: string;
  enclosureIndex?: number;
  existingObservations: Observation[];
  editingObservation?: Observation | null;
  onSaveSingle: (obs: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>) => void;
  onSaveBatch: (observations: Omit<Observation, 'id' | 'createdAt' | 'updatedAt' | 'isLifer'>[]) => void;
  onSaveEnclosureAndObservations: (enclosure: EnclosureRecord, newObservations: Observation[]) => void;
}

export const UnifiedLogModal: React.FC<UnifiedLogModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'scan',
  recentVenues,
  defaultVenueName,
  defaultVenueType = 'zoo',
  defaultEnclosurePrefix = 'Enclosure',
  enclosureIndex = 1,
  existingObservations,
  editingObservation,
  onSaveSingle,
  onSaveBatch,
  onSaveEnclosureAndObservations
}) => {
  // If editing an existing observation, always open in detailed mode
  const [activeMode, setActiveMode] = useState<UnifiedLogMode>(() => {
    if (editingObservation) return 'detailed';
    return initialMode;
  });

  // Sync mode when modal opens or editing changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingObservation) {
        setActiveMode('detailed');
      } else {
        setActiveMode(initialMode);
      }
    }
  }, [isOpen, editingObservation, initialMode]);

  if (!isOpen) return null;

  // Custom unified Mode Switcher Tab Bar rendered inside modal headers
  const renderModeSwitcher = () => (
    <div className="flex items-center bg-[#1f3424] p-0.5 rounded-lg border border-[#3d5e44] text-xs">
      <button
        type="button"
        onClick={() => setActiveMode('scan')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
          activeMode === 'scan'
            ? 'bg-amber-400 text-slate-950 shadow-xs'
            : 'text-[#c2d1bf] hover:text-white'
        }`}
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Scan Sign</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveMode('walkthrough')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
          activeMode === 'walkthrough'
            ? 'bg-white text-[#1f3424] shadow-xs'
            : 'text-[#c2d1bf] hover:text-white'
        }`}
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>Walkthrough</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveMode('detailed')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
          activeMode === 'detailed'
            ? 'bg-white text-[#1f3424] shadow-xs'
            : 'text-[#c2d1bf] hover:text-white'
        }`}
      >
        <FileText className="w-3.5 h-3.5" />
        <span>Single Entry</span>
      </button>
    </div>
  );

  return (
    <>
      {activeMode === 'scan' && (
        <ZooSignScannerModal
          isOpen={isOpen}
          onClose={onClose}
          defaultVenueName={defaultVenueName || recentVenues[0] || ''}
          defaultVenueType={defaultVenueType}
          defaultEnclosurePrefix={defaultEnclosurePrefix}
          enclosureIndex={enclosureIndex}
          onSaveEnclosureAndObservations={(enc, obsList) => {
            onSaveEnclosureAndObservations(enc, obsList);
            onClose();
          }}
          renderModeSwitcher={!editingObservation ? renderModeSwitcher : undefined}
        />
      )}

      {activeMode === 'walkthrough' && (
        <QuickLogModal
          isOpen={isOpen}
          onClose={onClose}
          onSaveBatch={(batch) => {
            onSaveBatch(batch);
            onClose();
          }}
          recentVenues={recentVenues}
          renderModeSwitcher={!editingObservation ? renderModeSwitcher : undefined}
        />
      )}

      {activeMode === 'detailed' && (
        <QuickAddModal
          isOpen={isOpen}
          onClose={onClose}
          onSave={(obs) => {
            onSaveSingle(obs);
            onClose();
          }}
          existingObservations={existingObservations}
          editingObservation={editingObservation}
          renderModeSwitcher={!editingObservation ? renderModeSwitcher : undefined}
        />
      )}
    </>
  );
};
