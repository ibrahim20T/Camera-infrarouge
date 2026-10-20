import React from 'react';
import { X, ShieldCheck, Lock, Smartphone, AlertTriangle, Eye } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-slate-200 shadow-2xl shadow-emerald-950/50">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            <h2 id="modal-title" className="text-lg font-bold text-white tracking-tight">
              À propos de IR Filter
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la boîte de dialogue"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-5 text-sm leading-relaxed text-slate-300">
          {/* Important Optical Disclaimer */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Simulation optique & traitement visuel</p>
                <p className="text-xs text-emerald-300/90 mt-1">
                  Cette application applique des filtres colorimétriques et de luminance inspirés des dispositifs de vision nocturne et de photographie infrarouge. Elle ne modifie pas le capteur physique de votre téléphone et ne permet pas de voir dans l’obscurité totale.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Performance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Confidentialité totale & traitement local</span>
            </div>
            <p className="text-xs text-slate-400 pl-6">
              Tous les calculs Canvas et les filtres sont exécutés localement et en temps réel sur le processeur de votre appareil via WebRTC et HTML5. Aucune image ni flux vidéo n’est envoyé, enregistré ou téléversé sur un serveur externe.
            </p>
          </div>

          {/* HTTPS Requirements */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Sécurité du navigateur & protocole HTTPS</span>
            </div>
            <p className="text-xs text-slate-400 pl-6">
              Pour des raisons de protection de la vie privée, les navigateurs modernes (Chrome, Safari, Firefox, Edge) bloquent l’accès à la caméra (<code className="text-emerald-400 font-mono">getUserMedia</code>) si le site n’est pas servi en <strong className="text-white">HTTPS</strong> ou sur <code className="text-emerald-400 font-mono">localhost</code>.
            </p>
          </div>

          {/* iOS & Android Guide */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Guide d’utilisation sur mobile</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1.5 pl-6 list-disc">
              <li>
                <strong className="text-slate-200">Sur iPhone (Safari) :</strong> Appuyez sur « Autoriser » lorsque la pop-up de permission caméra apparaît. En cas de blocage, allez dans Réglages &gt; Safari &gt; Appareil photo &gt; Autoriser.
              </li>
              <li>
                <strong className="text-slate-200">Sur Android (Chrome) :</strong> Cliquez sur l’icône d’autorisations à gauche de l’URL pour vérifier que l’appareil photo est actif.
              </li>
              <li>
                <strong className="text-slate-200">Orientation & Ergonomie :</strong> L’application utilise par défaut la caméra arrière (environnement) avec orientation automatique et contrôles adaptés au pouce.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};
