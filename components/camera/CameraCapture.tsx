"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from '@/contexts/LanguageContext';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
}

type CameraStatus = 'requesting' | 'streaming' | 'denied' | 'unsupported';

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<CameraStatus>('requesting');

  // Safely stop all hardware tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Strict Mode Guard: prevents writing to stale refs if component double-mounts
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setStatus('unsupported');
        return;
      }

      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // Works on webcam and phone
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            // Explicitly force play (fixes the black screen issue)
            await videoRef.current.play();
          } catch (playErr) {
            // Ignore AbortError caused by rapid unmounting in dev
            if ((playErr as DOMException).name !== 'AbortError') throw playErr;
          }
        }

        if (!cancelled) setStatus('streaming');
      } catch (err) {
        if (!cancelled) {
          console.error('Camera permission error:', err);
          setStatus('denied');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream]);

  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Match native video resolution
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);

    stopStream();
    onCapture(base64);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      stopStream();
      onCapture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- UI RENDER: FALLBACK MODE ---
  if (status === 'unsupported' || status === 'denied') {
    return (
        <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleManualUpload}
              accept="image/*"
              className="hidden"
          />

          {/* The MedPal Dashed Upload Box */}
          <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-4/5 max-h-140 rounded-3xl border-2 border-dashed border-[#2B4BFF] bg-[#2B4BFF]/5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#2B4BFF]/10 transition-all group select-none p-6 text-center shadow-inner"
          >
            <div className="w-16 h-16 rounded-full bg-[#2B4BFF] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <UploadSimpleIcon className="w-8 h-8" weight="fill" />
            </div>
            <span className="font-poppins font-bold text-sm text-[#2B4BFF]">
            {t.scanner.uploadGallery}
          </span>
            <span className="text-xs text-rose-500 max-w-[85%] mt-1 bg-rose-50 p-2 rounded-lg border border-rose-200">
            {t.scanner.permissionDenied}
          </span>
          </div>
        </div>
    );
  }

  // --- UI RENDER: VIEWFINDER MODE ---
  return (
      <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">

        <div className="relative w-full aspect-4/5 max-h-140 rounded-3xl overflow-hidden bg-black shadow-xl">
          <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
          />

          {/* Loading Overlay */}
          {status === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-sm text-white backdrop-blur-sm gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                <span className="font-poppins font-medium animate-pulse">Initializing camera...</span>
              </div>
          )}

          {/* Viewfinder Target Reticle */}
          {status === 'streaming' && (
              <div className="absolute top-8 left-8 right-8 bottom-28 border-2 border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                <div className="w-8 h-8 border-t-4 border-l-4 border-[#2B4BFF]" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-[#2B4BFF] self-end" />
              </div>
          )}

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
                onClick={handleSnap}
                disabled={status !== 'streaming'}
                className="w-16 h-16 rounded-full bg-white border-4 border-[#2B4BFF] flex items-center justify-center active:scale-90 transition-transform shadow-lg disabled:opacity-50 disabled:active:scale-100"
            >
              <div className="w-12 h-12 rounded-full bg-[#2B4BFF]" />
            </button>

            <div className="w-12" /> {/* Balance spacer */}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden manual input */}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleManualUpload}
            accept="image/*"
            className="hidden"
        />
      </div>
  );
}