import React, { useState } from 'react';
import { Observation, EnclosureRecord } from '../types';
import { exportToCSV, recalculateLifers } from '../utils/storage';
import { X, Download, Upload, FileText, Check, AlertCircle, Trash2 } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  observations: Observation[];
  enclosures: EnclosureRecord[];
  onImportObservations: (observations: Observation[]) => void;
  onImportEnclosures: (enclosures: EnclosureRecord[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  observations,
  enclosures,
  onImportObservations,
  onImportEnclosures
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    const csvData = exportToCSV(observations);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `life_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    const jsonData = JSON.stringify({ observations, enclosures }, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `life_list_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Direct array of observations
          const validated = recalculateLifers(parsed);
          onImportObservations(validated);
          setIsError(false);
          setImportStatus(`Successfully imported ${validated.length} life list observations!`);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.observations)) {
            const validated = recalculateLifers(parsed.observations);
            onImportObservations(validated);
          }
          if (Array.isArray(parsed.enclosures)) {
            onImportEnclosures(parsed.enclosures);
          }
          setIsError(false);
          setImportStatus(`Successfully restored backup!`);
        } else {
          setIsError(true);
          setImportStatus('Invalid JSON format: Expected array of observations or backup object.');
        }
      } catch (err) {
        setIsError(true);
        setImportStatus('Error reading file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleClearAll = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      return;
    }
    onImportObservations([]);
    onImportEnclosures([]);
    setIsConfirmingClear(false);
    setIsError(false);
    setImportStatus('All data cleared successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#e6dfd3] rounded-lg shadow-xl w-full max-w-md overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="bg-[#f9f8f5] border-b border-[#e6dfd3] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#2e4a36]" />
            <h2 className="text-sm font-bold text-[#1f241d] font-serif-species">
              Backup & Export Data
            </h2>
          </div>
          <button onClick={onClose} className="text-[#828d7e] hover:text-[#1f241d] p-1 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {importStatus && (
            <div className={`p-2.5 rounded border flex items-center gap-2 ${
              isError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
            }`}>
              {isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
              <span>{importStatus}</span>
            </div>
          )}

          {/* Export Section */}
          <div className="bg-[#faf9f6] p-3 rounded border border-[#e6dfd3] space-y-2">
            <div className="font-semibold text-[#1f241d]">Export Records</div>
            <p className="text-[#6b7568] text-[11px]">
              Download your complete field records and taxonomic data.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadCSV}
                disabled={observations.length === 0}
                className="flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-[#f2ede4] disabled:opacity-50 disabled:cursor-not-allowed border border-[#d8d0c4] rounded font-medium text-[#1f241d] transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#2e4a36]" />
                <span>Export CSV (Excel)</span>
              </button>

              <button
                onClick={handleDownloadJSON}
                disabled={observations.length === 0}
                className="flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-[#f2ede4] disabled:opacity-50 disabled:cursor-not-allowed border border-[#d8d0c4] rounded font-medium text-[#1f241d] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#99582a]" />
                <span>Backup JSON</span>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-[#faf9f6] p-3 rounded border border-[#e6dfd3] space-y-2">
            <div className="font-semibold text-[#1f241d]">Restore / Import JSON</div>
            <p className="text-[#6b7568] text-[11px]">
              Restore records from a previously exported Life JSON backup.
            </p>
            <label className="flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-[#f2ede4] border border-[#d8d0c4] rounded font-medium text-[#1f241d] cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#2e4a36]" />
              <span>Select JSON Backup File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Clear Data Section */}
          <div className="pt-2 border-t border-[#f0eae0] flex items-center justify-between">
            {observations.length > 0 ? (
              <button
                onClick={handleClearAll}
                className={`text-[11px] inline-flex items-center gap-1 font-medium px-2 py-1 rounded transition-colors cursor-pointer ${
                  isConfirmingClear 
                    ? 'bg-red-600 text-white hover:bg-red-700 font-bold' 
                    : 'text-red-700 hover:text-red-900 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span>{isConfirmingClear ? 'Confirm Clear All Data?' : 'Clear All Observations'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-[#828d7e]">0 observations stored</span>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#2e4a36] text-white rounded font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
