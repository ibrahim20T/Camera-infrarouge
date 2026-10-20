import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  SwitchCamera,
  Zap,
  ZapOff,
  Sliders,
  Crosshair,
  Camera as CameraIcon,
  Eye,
  EyeOff,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  applyFilterToImageData,
  FILTERS,
  type FilterType,
  type FilterSettings,
} from '../utils/filterEngine.ts';
import {
  requestCameraStream,
  stopStream,
  isTorchSupported,
  setTorchState,
  parseCameraError,
} from '../utils/cameraHelper.ts';
import { renderSimulationScene } from '../utils/testScene.ts';
import type { CameraFacingMode, CapturedPhoto, CameraErrorInfo } from '../types.ts';
import { CameraErrorCard } from './CameraErrorCard.tsx';
import { SnapshotModal } from './SnapshotModal.tsx';

interface CameraViewProps {
  initialSettings: FilterSettings;
  initialFacingMode: CameraFacingMode;
  isSimulation?: boolean;
  onBack: () => void;
  onSavePreferences: (settings: FilterSettings, facingMode: CameraFacingMode) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  initialSettings,
  initialFacingMode,
  isSimulation = false,
  onBack,
  onSavePreferences,
}) => {
  const [settings, setSettings] = useState<FilterSettings>(initialSettings);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>(initialFacingMode);
  const [simulationActive, setSimulationActive] = useState<boolean>(isSimulation);
  
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [streamLoading, setStreamLoading] = useState<boolean>(!isSimulation);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [showSlidersDrawer, setShowSlidersDrawer] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [fps, setFps] = useState<number>(30);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Sync settings back to parent & storage
  useEffect(() => {
    onSavePreferences(settings, facingMode);
  }, [settings, facingMode, onSavePreferences]);

  // Clean stop of streams
  const cleanupStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize camera
  const startCamera = useCallback(async (mode: CameraFacingMode) => {
    cleanupStream();
    setCameraError(null);
    setStreamLoading(true);

    try {
      const stream = await requestCameraStream(mode);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setTorchAvailable(isTorchSupported(videoTrack));
        setTorchActive(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamLoading(false);
    } catch (err) {
      console.error('Camera startup error', err);
      const parsed = parseCameraError(err);
      setCameraError(parsed);
      setStreamLoading(false);
    }
  }, [cleanupStream]);

  // Handle camera mount/unmount & facing mode change
  useEffect(() => {
    if (simulationActive) {
      cleanupStream();
      setStreamLoading(false);
    } else {
      startCamera(facingMode);
    }

    return () => {
      cleanupStream();
    };
  }, [facingMode, simulationActive, startCamera, cleanupStream]);

  // Real-time rendering loop with requestAnimationFrame
  useEffect(() => {
    let isRunning = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const renderFrame = (now: number) => {
      if (!isRunning) return;

      // FPS tracking
      frameCountRef.current++;
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      const video = videoRef.current;

      if (simulationActive) {
        // Render synthetic test flux
        const w = 640;
        const h = 480;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        renderSimulationScene(ctx, w, h, now);

        if (settings.active && settings.intensity > 0) {
          try {
            const imgData = ctx.getImageData(0, 0, w, h);
            applyFilterToImageData(imgData.data, w, h, settings);
            ctx.putImageData(imgData, 0, 0);
          } catch {
            // ignore frame error
          }
        }
      } else if (video && video.readyState >= 2 && !video.paused) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        // Downsample slightly on mobile if necessary to maintain high FPS (max dimension 720)
        const scale = Math.min(1, 720 / Math.max(vw, vh));
        const targetW = Math.round(vw * scale);
        const targetH = Math.round(vh * scale);

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, targetW, targetH);

        // Apply IR filter if active
        if (settings.active && settings.intensity > 0) {
          try {
            const imgData = ctx.getImageData(0, 0, targetW, targetH);
            applyFilterToImageData(imgData.data, targetW, targetH, settings);
            ctx.putImageData(imgData, 0, 0);
          } catch (e) {
            console.error('Frame filter error', e);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [settings, simulationActive]);

  // Flip camera between environment (back) and user (front)
  const handleToggleFacingMode = () => {
    if (simulationActive) {
      // Toggle back to real camera if requested
      setSimulationActive(false);
      return;
    }
    const nextMode: CameraFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const nextState = !torchActive;
    const success = await setTorchState(videoTrack, nextState);
    if (success) {
      setTorchActive(nextState);
    }
  };

  // Toggle active IR filter state
  const handleToggleIR = () => {
    setSettings((prev) => ({
      ...prev,
      active: !prev.active,
    }));
  };

  // Select filter preset
  const handleSelectFilter = (type: FilterType) => {
    setSettings((prev) => ({
      ...prev,
      type,
      active: true, // Auto-activate filter when preset is explicitly selected
    }));
  };

  // Capture photo snapshot
  const handleCapturePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Trigger visual shutter flash
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    // Generate snapshot data URL
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedPhoto({
      id: `photo-${Date.now()}`,
      dataUrl,
      timestamp: Date.now(),
      filterType: settings.type,
    });
  };

  // If camera error occurred and not in simulation mode
  if (cameraError && !simulationActive) {
    return (
      <CameraErrorCard
        error={cameraError}
        onRetry={() => startCamera(facingMode)}
        onStartSimulation={() => {
          setCameraError(null);
          setSimulationActive(true);
        }}
        onBack={onBack}
      />
    );
  }

  const activeFilterInfo = FILTERS.find((f) => f.id === settings.type) || FILTERS[0];

  return (
    <div className="relative w-full h-[100dvh] bg-black text-slate-100 overflow-hidden flex flex-col select-none">
      {/* Hidden raw video element used as canvas source */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
        aria-hidden="true"
      />

      {/* Main Viewfinder Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-black">
        <canvas
          ref={canvasRef}
          data-testid="ir-camera-canvas"
          className="w-full h-full object-cover"
        />

        {/* Phosphor CRT Scanlines overlay */}
        {settings.scanlines && (
          <div className="absolute inset-0 crt-scanlines z-10 pointer-events-none" />
        )}

        {/* Optical Vignette overlay */}
        <div className="absolute inset-0 hud-vignette z-10 pointer-events-none" />

        {/* Shutter flash animation */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
        )}

        {/* Loading overlay when camera is connecting */}
        {streamLoading && !simulationActive && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mb-4" />
            <p className="text-sm font-medium text-emerald-300">Initialisation de la caméra...</p>
            <p className="text-xs text-slate-500 mt-1">Autorisation en cours</p>
          </div>
        )}

        {/* Tactical HUD Reticle Overlay */}
        {settings.reticle && (
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 pt-18 sm:p-6 sm:pt-20 pb-44 text-emerald-400/80 font-mono-nums text-[11px]">
            {/* Top HUD Info */}
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold tracking-wider text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{settings.active ? `IR // ${activeFilterInfo.name}` : 'FLUX BRUT'}</span>
                </div>
                <div className="text-emerald-500/70 text-[10px]">
                  GAIN {settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}dB · INT {settings.intensity}%
                </div>
              </div>

              <div className="text-right space-y-0.5 text-emerald-500/70 text-[10px]">
                <div>{simulationActive ? 'MODE SIMULATION' : facingMode === 'environment' ? 'CAM ARRIÈRE' : 'CAM AVANT'}</div>
                <div>{fps} FPS · OPTICAL SIM</div>
              </div>
            </div>

            {/* Center Crosshair & Tactical Brackets */}
            <div className="relative self-center my-auto flex items-center justify-center w-48 h-48 sm:w-64 sm:h-64">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400/60" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400/60" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400/60" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400/60" />

              {/* Center reticle */}
              <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
              <div className="absolute w-12 h-0.5 bg-emerald-400/40" />
              <div className="absolute h-12 w-0.5 bg-emerald-400/40" />
              
              {/* Range rings */}
              <div className="absolute w-28 h-28 rounded-full border border-emerald-400/20" />
            </div>

            {/* Bottom HUD metadata */}
            <div className="flex justify-between items-end text-[10px] text-emerald-500/60">
              <div>SPECTRUM: 750–1100 NM (SIM)</div>
              <div>ISO AUTO · 1/60S</div>
            </div>
          </div>
        )}
      </div>

      {/* Top Floating App Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-safe flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Retourner à l'accueil"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white hover:text-emerald-400 transition-colors active:scale-95 shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Center Mode Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-xs font-medium">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: settings.active ? activeFilterInfo.accentColor : '#64748b' }}
          />
          <span className="text-white font-semibold">{activeFilterInfo.name}</span>
          <span className="text-slate-400 text-[10px]">
            {settings.active ? `${settings.intensity}%` : 'DÉSACTIVÉ'}
          </span>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Torch toggle (if supported) */}
          {torchAvailable && !simulationActive && (
            <button
              onClick={handleToggleTorch}
              aria-label={torchActive ? 'Éteindre la torche' : 'Allumer la torche'}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full backdrop-blur-md border transition-colors active:scale-95 ${
                torchActive
                  ? 'bg-amber-400 border-amber-300 text-black shadow-lg shadow-amber-400/30'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              {torchActive ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          {/* Switch Camera (Front / Rear) */}
          <button
            onClick={handleToggleFacingMode}
            aria-label="Changer de caméra"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white hover:text-emerald-400 transition-colors active:scale-95 shadow-md"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* Sliders drawer toggle */}
          <button
            onClick={() => setShowSlidersDrawer(!showSlidersDrawer)}
            aria-label="Ouvrir les réglages avancés"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full backdrop-blur-md border transition-colors active:scale-95 ${
              showSlidersDrawer
                ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900/80 border-slate-700/60 text-white hover:text-emerald-400'
            }`}
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Advanced Settings Drawer (Positioned under top bar with clean shadow) */}
      {showSlidersDrawer && (
        <div className="absolute top-18 right-3 left-3 sm:left-auto sm:right-4 sm:w-80 z-30 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-4 shadow-2xl text-xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-white tracking-wide uppercase text-[11px]">
              Réglages Optiques & Capteur
            </span>
            <button
              onClick={() => setShowSlidersDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              Fermer
            </button>
          </div>

          {/* Contrast Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Contraste S-Curve</span>
              <span className="font-mono text-emerald-400 font-semibold">{settings.contrast}</span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              value={settings.contrast}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, contrast: parseInt(e.target.value, 10) }))
              }
              className="w-full"
            />
          </div>

          {/* Brightness Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Exposition / Luminance</span>
              <span className="font-mono text-emerald-400 font-semibold">{settings.brightness}</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={settings.brightness}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, brightness: parseInt(e.target.value, 10) }))
              }
              className="w-full"
            />
          </div>

          {/* HUD Overlays Toggles */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={() => setSettings((prev) => ({ ...prev, reticle: !prev.reticle }))}
              className={`p-2 rounded-lg border text-center transition-colors ${
                settings.reticle
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Crosshair className="w-4 h-4 mx-auto mb-1" />
              <span>Réticule</span>
            </button>

            <button
              onClick={() => setSettings((prev) => ({ ...prev, scanlines: !prev.scanlines }))}
              className={`p-2 rounded-lg border text-center transition-colors ${
                settings.scanlines
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Sparkles className="w-4 h-4 mx-auto mb-1" />
              <span>Scanlines</span>
            </button>

            <button
              onClick={() => setSettings((prev) => ({ ...prev, grain: !prev.grain }))}
              className={`p-2 rounded-lg border text-center transition-colors ${
                settings.grain
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Info className="w-4 h-4 mx-auto mb-1" />
              <span>Grain IR</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Ergonomic Thumb Zone Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-safe pt-4 px-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* Intensity Quick Slider */}
        <div className="max-w-md mx-auto mb-3 px-2 flex items-center gap-3">
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
            Intensité
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.intensity}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, intensity: parseInt(e.target.value, 10) }))
            }
            className="flex-1"
            aria-label="Intensité du filtre"
          />
          <span className="text-[11px] font-mono font-semibold text-emerald-400 min-w-[32px] text-right">
            {settings.intensity}%
          </span>
        </div>

        {/* Filter Preset Switcher Tabs */}
        <div className="max-w-md mx-auto mb-4 grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl">
          {FILTERS.map((f) => {
            const isSelected = settings.type === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleSelectFilter(f.id)}
                className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all text-center flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{f.name}</span>
                <span className={`text-[9px] font-normal ${isSelected ? 'text-black/80' : 'text-slate-500'}`}>
                  {f.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shutter & Quick Toggle Bar */}
        <div className="max-w-md mx-auto pb-4 flex items-center justify-between px-6">
          {/* IR Bypass / Activate toggle */}
          <button
            onClick={handleToggleIR}
            aria-label={settings.active ? 'Désactiver le mode infrarouge' : 'Activer le mode infrarouge'}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              settings.active
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            {settings.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            <span className="text-[9px] font-bold mt-0.5">
              {settings.active ? 'IR ACTIF' : 'NORMAL'}
            </span>
          </button>

          {/* Primary Shutter Capture Button */}
          <button
            onClick={handleCapturePhoto}
            aria-label="Prendre une photo infrarouge"
            className="w-18 h-18 rounded-full border-4 border-emerald-400/80 p-1 bg-transparent flex items-center justify-center transition-transform active:scale-90 shadow-xl shadow-emerald-500/20 hover:border-emerald-300"
          >
            <div className="w-full h-full rounded-full bg-emerald-400 hover:bg-emerald-300 flex items-center justify-center">
              <CameraIcon className="w-6 h-6 text-black" />
            </div>
          </button>

          {/* Simulation Toggle / Switch status */}
          <button
            onClick={() => setSimulationActive(!simulationActive)}
            aria-label={simulationActive ? 'Passer en caméra réelle' : 'Passer en mode flux test'}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              simulationActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-0.5">
              {simulationActive ? 'SIMU' : 'CAMÉRA'}
            </span>
          </button>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      <SnapshotModal
        photo={capturedPhoto}
        onClose={() => setCapturedPhoto(null)}
      />
    </div>
  );
};
