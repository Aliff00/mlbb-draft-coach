import React from 'react';
import { Smartphone } from 'lucide-react';

export const OrientationOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 hidden portrait:flex md:portrait:hidden flex-col items-center justify-center bg-[#060913]/95 backdrop-blur-md p-6 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/40 bg-slate-900/90 shadow-gold-glow">
        <Smartphone className="h-10 w-10 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <h2 className="text-xl font-bold tracking-wider uppercase text-amber-400 mb-2">
        Rotate Device to Landscape
      </h2>
      <p className="max-w-xs text-sm text-slate-300 leading-relaxed">
        MLBB Draft Pick is designed for a 16:9 widescreen esports layout. Please rotate your phone horizontally for the full drafting experience.
      </p>
    </div>
  );
};

