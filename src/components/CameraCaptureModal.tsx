import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload, Sparkles, Check, AlertCircle } from 'lucide-react';
import { processImageFile } from '../utils/imageUtils';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Species Photo'
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start / restart camera stream
  const startCamera = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);

    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsLoadingCamera(false);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err?.message || 'Could not access device camera.');
      setIsLoadingCamera(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Stop video stream once snapshot taken
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await processImageFile(file);
      setCapturedImage(dataUrl);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    } catch (err) {
      alert('Could not process the selected image.');
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#1f241d] text-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-white/10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#a9d9b6]" />
            <h3 className="font-bold text-sm font-serif-species tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative bg-black aspect-4/3 sm:aspect-16/10 flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured species"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Reticle Overlay */}
              <div className="absolute inset-6 border-2 border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-l-2 border-[#a9d9b6] absolute top-2 left-2" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-[#a9d9b6] absolute top-2 right-2" />
                <div className="w-8 h-8 border-b-2 border-l-2 border-[#a9d9b6] absolute bottom-2 left-2" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-[#a9d9b6] absolute bottom-2 right-2" />
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-[#1f241d]/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">Live Camera Preview Unavailable</p>
                    <p className="text-[11px] text-white/70 max-w-xs">
                      {cameraError}. You can still snap a photo with your device camera or upload an existing image.
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#2e4a36] text-white text-xs font-bold rounded-lg shadow-md hover:bg-[#3d5a44]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Device Camera / File</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Hidden File Input for Mobile Device Camera Trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-[#18201a] border-t border-white/10 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-3.5 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#2e4a36] hover:bg-[#3d5a44] text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
                title="Choose from photo library or snap photo"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / File</span>
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={Boolean(cameraError)}
                className="w-14 h-14 rounded-full border-4 border-white/40 bg-white hover:bg-white/90 active:scale-95 transition-all shadow-lg flex items-center justify-center disabled:opacity-40"
                title="Take Photo"
              >
                <div className="w-11 h-11 rounded-full bg-[#2e4a36] flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Flip Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
