import React, { useRef, useEffect } from 'react';
import {
  Camera,
  Eye,
  Sliders,
  ShieldCheck,
  HelpCircle,
  PlayCircle,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  FILTERS,
  type FilterType,
  type FilterSettings,
  applyFilterToImageData,
} from '../utils/filterEngine.ts';
import { renderSimulationScene } from '../utils/testScene.ts';

interface HomeScreenProps {
  settings: FilterSettings;
  onUpdateSettings: (newSettings: Partial<FilterSettings>) => void;
  onOpenCamera: () => void;
  onStartSimulation: () => void;
  onOpenInfo: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  onUpdateSettings,
  onOpenCamera,
  onStartSimulation,
  onOpenInfo,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animated live mini-preview on the home screen showing the selected filter!
  useEffect(() => {
    let animId: number;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = 320;
    const h = 200;
    canvas.width = w;
    canvas.height = h;

    const render = (time: number) => {
      renderSimulationScene(ctx, w, h, time);

      if (settings.active && settings.intensity > 0) {
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          applyFilterToImageData(imgData.data, w, h, settings);
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // ignore
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [settings]);

  const activeFilter = FILTERS.find((f) => f.id === settings.type) || FILTERS[0];

  return (
    <div className="min-h-screen bg-[#080b09] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Header Bar */}
      <header className="w-full max-w-xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>IR Filter</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                PRO
              </span>
            </h1>
          </div>
        </div>

        <button
          onClick={onOpenInfo}
          aria-label="Guide et informations de sécurité"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto px-4 sm:px-5 py-2 sm:py-4 flex-1 flex flex-col justify-center space-y-3.5 sm:space-y-5">
        {/* Hero Title & Subtitle */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            Filtre Infrarouge Mobile
          </p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
            Explorez un nouveau regard sur le monde
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Vision nocturne phosphorique, simulation Wood & spectre thermique.
          </p>
        </div>

        {/* Live Mini Preview Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-black shadow-xl shadow-emerald-950/40 aspect-video max-h-40 sm:max-h-52">
          <canvas
            ref={previewCanvasRef}
            className="w-full h-full object-cover"
            aria-label="Aperçu en direct du filtre sélectionné"
          />

          {/* Vignette & scanline overlay */}
          <div className="absolute inset-0 hud-vignette pointer-events-none" />
          {settings.scanlines && (
            <div className="absolute inset-0 crt-scanlines pointer-events-none" />
          )}

          {/* Floating badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>APERÇU DIRECT // {activeFilter.name}</span>
          </div>

          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-slate-700/60 text-[10px] font-mono text-slate-400">
            {settings.active ? `INTENSITÉ ${settings.intensity}%` : 'FILTRE DÉSACTIVÉ'}
          </div>
        </div>

        {/* IR Mode Toggle Switch (Primary requirement) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                settings.active
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mode infrarouge</p>
              <p className="text-xs text-slate-400">
                Statut :{' '}
                <span
                  className={`font-semibold font-mono ${
                    settings.active ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {settings.active ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                </span>
              </p>
            </div>
          </div>

          {/* Interactive Switch */}
          <button
            onClick={() => onUpdateSettings({ active: !settings.active })}
            aria-label={settings.active ? 'Désactiver le mode infrarouge' : 'Activer le mode infrarouge'}
            role="switch"
            aria-checked={settings.active}
            className={`w-14 h-8 rounded-full transition-colors relative p-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
              settings.active ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-black shadow-md transition-transform duration-200 ease-in-out ${
                settings.active ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3 Selectable Filter Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Effets Infrarouges
            </span>
            <span className="text-xs text-slate-500 font-mono">3 profils</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FILTERS.map((f) => {
              const isSelected = settings.type === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onUpdateSettings({ type: f.id, active: true })}
                  className={`min-h-[58px] p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: f.accentColor }}
                    />
                    {isSelected && (
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">ACTIF</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight mt-1">{f.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{f.badge}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Preset Description Card */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 leading-normal flex items-start gap-2">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>{activeFilter.description}</p>
          </div>
        </div>

        {/* Intensity Slider Control */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Intensité du filtre</span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold">
              {settings.intensity}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.intensity}
            onChange={(e) => onUpdateSettings({ intensity: parseInt(e.target.value, 10) })}
            className="w-full"
            aria-label="Curseur intensité du filtre infrarouge"
          />
        </div>

        {/* Primary Action Button: Ouvrir la caméra */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onOpenCamera}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all active:scale-98"
          >
            <Camera className="w-5 h-5 text-black" />
            <span>Ouvrir la caméra</span>
          </button>

          {/* Secondary Action: Mode Simulation */}
          <button
            onClick={onStartSimulation}
            className="w-full min-h-[46px] rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 border border-slate-800 transition-colors active:scale-98"
          >
            <PlayCircle className="w-4 h-4 text-emerald-400" />
            <span>Tester avec la simulation (sans caméra)</span>
          </button>
        </div>
      </main>

      {/* Footer with Privacy Notice */}
      <footer className="w-full max-w-xl mx-auto px-5 py-4 border-t border-slate-900 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Traitement vidéo 100% local dans le navigateur · Zéro téléversement</span>
        </div>
      </footer>
    </div>
  );
};
