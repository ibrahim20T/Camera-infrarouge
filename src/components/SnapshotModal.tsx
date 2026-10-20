import React from 'react';
import { Download, X, Share2, Check } from 'lucide-react';
import type { CapturedPhoto } from '../types.ts';

interface SnapshotModalProps {
  photo: CapturedPhoto | null;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ photo, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!photo) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `ir-filter-capture-${photo.filterType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const blob = await (await fetch(photo.dataUrl)).blob();
        const file = new File([blob], 'ir-filter-capture.png', { type: 'image/png' });
        await navigator.share({
          title: 'Capture IR Filter',
          text: `Photo prise avec le filtre IR (${photo.filterType})`,
          files: [file],
        });
        return;
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    }
    // Fallback: Copy to clipboard if possible
    try {
      const blob = await (await fetch(photo.dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      handleDownload();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="snapshot-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 text-slate-100 shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 id="snapshot-title" className="text-base font-semibold text-white">
              Cliché Infrarouge Capturé
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Mode : {photo.filterType.toUpperCase()} · {new Date(photo.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer l'aperçu du cliché"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="my-4 relative rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-[60vh]">
          <img
            src={photo.dataUrl}
            alt="Capture avec filtre infrarouge"
            className="w-full h-auto object-contain max-h-[60vh]"
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Enregistrer</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors border border-slate-700 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
