import React from 'react';
import { AlertCircle, RefreshCw, PlayCircle, ArrowLeft, Lock, CameraOff } from 'lucide-react';
import type { CameraErrorInfo } from '../types.ts';

interface CameraErrorCardProps {
  error: CameraErrorInfo;
  onRetry: () => void;
  onStartSimulation: () => void;
  onBack: () => void;
}

export const CameraErrorCard: React.FC<CameraErrorCardProps> = ({
  error,
  onRetry,
  onStartSimulation,
  onBack,
}) => {
  const isSecurity = error.type === 'insecure_context';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            {isSecurity ? (
              <Lock className="w-6 h-6 text-red-400" />
            ) : (
              <CameraOff className="w-6 h-6 text-red-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{error.title}</h2>
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider">
              Code: {error.type}
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          {error.message}
        </p>

        {/* Action Hint */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 mb-6 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Comment résoudre ce problème :</span>
          </div>
          <p className="pl-5 leading-normal">{error.actionHint}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer l’accès caméra</span>
          </button>

          <button
            onClick={onStartSimulation}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-sm transition-colors border border-emerald-500/30 active:scale-98"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Lancer le mode Simulation (sans caméra)</span>
          </button>

          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l’accueil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
