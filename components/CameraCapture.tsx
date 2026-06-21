'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
}

type CameraStatus = 'requesting' | 'streaming' | 'denied' | 'unsupported';

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<CameraStatus>('requesting');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    // Guards against React Strict Mode's mount → cleanup → re-mount in dev,
    // and against fast retakes in real usage: if this effect instance gets
    // torn down before the async getUserMedia/play() calls resolve, we must
    // not write to refs or call setState from the stale instance.
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }

      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
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
            await videoRef.current.play();
          } catch (playErr) {
            // Benign: play() gets interrupted when the element unmounts or
            // reloads mid-request. Anything else should still surface.
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    stopStream();
    onCapture(base64);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopStream();
        onCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (status === 'unsupported' || status === 'denied') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-600">
          {status === 'denied'
            ? 'Wala mi access sa camera. Pwede ka mag-upload og photo gikan sa gallery.'
            : 'Wala gisuportahan ang camera niini nga browser. Pag-upload na lang og photo.'}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-[#1A3AF5] px-4 py-2 text-sm font-medium text-white"
        >
          Pili og Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover" />
        {status === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">
            Gi-request ang access sa camera...
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600"
        >
          Gallery
        </button>
        <button
          type="button"
          onClick={handleSnap}
          disabled={status !== 'streaming'}
          aria-label="Capture photo"
          className="h-16 w-16 rounded-full border-4 border-[#1A3AF5] bg-white disabled:opacity-50"
        />
        {/* spacer to keep the capture button visually centered */}
        <div className="w-[68px]" aria-hidden="true" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}