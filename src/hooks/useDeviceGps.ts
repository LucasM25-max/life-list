import { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates } from '../types';
import { getAccurateDeviceLocation, getCachedGps, setCachedGps, GpsStatus } from '../utils/geoUtils';

export function useDeviceGps(active: boolean = true) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(() => getCachedGps());
  const [status, setStatus] = useState<GpsStatus>(getCachedGps() ? 'locked' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [manualCoordsInput, setManualCoordsInput] = useState({ lat: '', lng: '' });
  const [showManualInput, setShowManualInput] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  const acquireGps = useCallback(async () => {
    if (!active) return;
    setIsLocating(true);
    setStatus(prev => prev === 'locked' ? 'locked' : 'acquiring');
    setErrorMessage(null);

    try {
      const coords = await getAccurateDeviceLocation();
      setCoordinates(coords);
      setStatus('locked');
      setIsLocating(false);
    } catch (err: any) {
      setIsLocating(false);
      const code = err.message as GpsStatus;
      setStatus(code || 'unavailable');

      if (code === 'denied') {
        setErrorMessage('Location permission was denied. Please allow location access in your browser address bar.');
      } else if (code === 'unavailable') {
        setErrorMessage('Device location unavailable. Ensure device GPS/Location services are enabled.');
      } else if (code === 'timeout') {
        setErrorMessage('GPS request timed out. Retrying in background...');
      } else if (code === 'unsupported') {
        setErrorMessage('Geolocation API is not supported in this browser.');
      } else {
        setErrorMessage('Could not acquire GPS position.');
      }
    }
  }, [active]);

  // Start acquisition and background watch
  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    acquireGps();

    if (navigator.geolocation) {
      try {
        const wid = navigator.geolocation.watchPosition(
          pos => {
            const coords: Coordinates = {
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
              accuracy: Math.round(pos.coords.accuracy),
              capturedAt: Date.now()
            };
            setCoordinates(coords);
            setStatus('locked');
            setCachedGps(coords);
          },
          err => {
            if (err.code === 1) setStatus('denied');
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
        watchIdRef.current = wid;
      } catch {}
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, acquireGps]);

  const applyManualCoords = (latStr: string, lngStr: string) => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const coords: Coordinates = {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        accuracy: 5,
        capturedAt: Date.now()
      };
      setCoordinates(coords);
      setStatus('manual');
      setCachedGps(coords);
      setShowManualInput(false);
      setErrorMessage(null);
      return true;
    }
    return false;
  };

  return {
    coordinates,
    status,
    errorMessage,
    isLocating,
    refreshGps: acquireGps,
    showManualInput,
    setShowManualInput,
    manualCoordsInput,
    setManualCoordsInput,
    applyManualCoords
  };
}
