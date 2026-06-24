"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from '@/contexts/LanguageContext';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stop video hardware tracks when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera rejected or unavailable:", err);
      setError(t.scanner.permissionDenied);
      setIsCameraActive(false);
    }
  }, [t.scanner.permissionDenied]);

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Match native video resolution
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Convert to JPEG base64 (0.8 compression saves Supabase bandwidth!)
    const base64 = canvas.toDataURL('image/jpeg', 0.8);

    // Shut down camera light instantly
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }

    onCapture(base64);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onCapture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
      <div className="w-full flex flex-col items-center gap-4">
        {/* Hidden native OS file/camera trigger */}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleManualUpload}
            accept="image/*"
            className="hidden"
        />

        {!isCameraActive ? (
            // The Figma Dashed Placeholder Box
            <div
                onClick={startCamera}
                className="w-full aspect-[3/4] max-h-[460px] rounded-3xl border-2 border-dashed border-[#2B4BFF] bg-[#2B4BFF]/5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#2B4BFF]/10 transition-all group select-none p-6 text-center shadow-inner"
            >
              <div className="w-16 h-16 rounded-full bg-[#2B4BFF] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <CameraIcon className="w-8 h-8" weight="fill" />
              </div>
              <span className="font-poppins font-bold text-sm text-[#2B4BFF]">
            {t.scanner.tapToScan}
          </span>
              {error && (
                  <span className="text-xs text-rose-500 max-w-[85%] mt-1 bg-rose-50 p-2 rounded-lg border border-rose-200">
              {error}
            </span>
              )}
            </div>
        ) : (
            // Active Viewfinder Stream
            <div className="relative w-full aspect-[3/4] max-h-[460px] rounded-3xl overflow-hidden bg-black shadow-xl">
              <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-8 border-2 border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                <div className="w-8 h-8 border-t-4 border-l-4 border-[#2B4BFF]" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-[#2B4BFF] self-end" />
              </div>

              {/* Shutter Button Bar */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 px-6 z-10">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors"
                    title={t.scanner.uploadGallery}
                >
                  <UploadSimpleIcon className="w-5 h-5" />
                </button>

                {/* Giant White Shutter Button */}
                <button
                    onClick={captureFrame}
                    className="w-16 h-16 rounded-full bg-white border-4 border-[#2B4BFF] flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2B4BFF]" />
                </button>

                <div className="w-12" /> {/* Balance spacer */}
              </div>
            </div>
        )}

        {/* Fallback Gallery Link */}
        {!isCameraActive && (
            <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
            >
              <UploadSimpleIcon className="w-4 h-4" />
              {t.scanner.uploadGallery}
            </button>
        )}
      </div>
  );
}