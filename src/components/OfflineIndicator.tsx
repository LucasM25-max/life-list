import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (showRestored) {
    return (
      <div className="bg-[#2e4a36] text-white px-3 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-1.5 shadow-xs animate-in fade-in duration-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
        <span>Connection restored. Online features re-enabled.</span>
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div className="bg-[#1f241d] text-[#e6dfd3] px-3 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2 border-b border-[#323d30] shadow-xs animate-in fade-in duration-200">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>
        <strong>Offline Mode Active:</strong> Full Catalogue of Life taxonomy search, field trips, enclosure logging & life list tracking work 100% offline. (AI features require network)
      </span>
    </div>
  );
};
