import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload, Check, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="bg-[#142017] text-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl overflow-hidden flex flex-col border border-[#2e4a36]/60 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Floating Header */}
        <div className="px-4 py-3 bg-[#1a281e] border-b border-[#2d4232] flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#2e4a36] text-[#a9d9b6] flex items-center justify-center shrink-0 border border-[#3d5a44]">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm font-serif-species tracking-wide text-white truncate">
                {title}
              </h3>
              <span className="text-[10px] text-[#a9d9b6] font-mono-tag uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a9d9b6] animate-pulse"></span>
                {capturedImage ? 'Photo Review' : 'Field Viewfinder'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!capturedImage && !cameraError && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 rounded-lg text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                title="Flip Camera (Front/Back)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Large Camera Preview Area */}
        <div className="relative flex-1 min-h-[360px] sm:min-h-[460px] bg-black flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured species"
                className="w-full h-full object-contain max-h-[75vh]"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-[#a9d9b6] border border-white/15 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Photo Staged</span>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Naturalist Viewfinder Reticle Overlay */}
              <div className="absolute inset-5 sm:inset-8 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                {/* 4 Corner Focus Brackets */}
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-t-3 border-l-3 border-[#a9d9b6] absolute -top-1 -left-1 rounded-tl-xl shadow-xs" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-t-3 border-r-3 border-[#a9d9b6] absolute -top-1 -right-1 rounded-tr-xl shadow-xs" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-b-3 border-l-3 border-[#a9d9b6] absolute -bottom-1 -left-1 rounded-bl-xl shadow-xs" />
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-b-3 border-r-3 border-[#a9d9b6] absolute -bottom-1 -right-1 rounded-br-xl shadow-xs" />

                {/* Subtle Center Crosshair */}
                <div className="w-6 h-6 border-t border-b border-white/30 absolute pointer-events-none" />
                <div className="w-6 h-6 border-l border-r border-white/30 absolute pointer-events-none" />
              </div>

              {/* Floating Instructions Pill */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 pointer-events-none text-center">
                <span className="text-[11px] text-white/90 font-medium tracking-wide">
                  Position species within the viewfinder
                </span>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-[#142017]/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <p className="text-sm font-bold text-white font-serif-species">
                      Camera Preview Unavailable
                    </p>
                    <p className="text-xs text-white/70">
                      {cameraError}. You can still upload a photo from your gallery or trigger your device's native camera.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e4a36] hover:bg-[#3b5e45] text-white text-xs font-bold rounded-xl shadow-lg border border-[#487355] transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload or Take Photo</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Hidden File Input for Gallery / Device Camera Trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Viewfinder Controls Tray */}
        <div className="p-4 sm:p-5 bg-[#17241b] border-t border-[#2d4232] flex items-center justify-between gap-3 shrink-0">
          {capturedImage ? (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2e4a36] hover:bg-[#3a5d44] text-white text-xs font-bold rounded-xl shadow-lg border border-[#487355] transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Attach Photo</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              {/* Gallery / File Picker Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 text-xs font-semibold text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                title="Choose from photo gallery or snap with system camera"
              >
                <ImageIcon className="w-4 h-4 text-[#a9d9b6]" />
                <span className="hidden sm:inline">Gallery / File</span>
                <span className="sm:hidden">Upload</span>
              </button>

              {/* Shutter Button */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={Boolean(cameraError)}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white/40 bg-white/15 hover:bg-white/25 active:scale-90 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-xl cursor-pointer"
                  title="Snap Photo"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shadow-md">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#2e4a36] bg-[#2e4a36] flex items-center justify-center text-white">
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Flip Camera */}
              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={Boolean(cameraError)}
                className="px-3.5 py-2.5 text-xs font-semibold text-[#c2d6c6] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-30"
                title="Flip Camera (Front/Back)"
              >
                <RefreshCw className="w-4 h-4 text-[#a9d9b6]" />
                <span className="hidden sm:inline">Flip</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
