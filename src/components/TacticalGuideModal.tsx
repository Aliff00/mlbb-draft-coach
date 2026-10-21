import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Lightbulb,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { MAP_EFFECTS_CONFIG, MapTraitType } from '../types/draft';
import { getMapEffectColorTheme, MapEffectIcon } from './MapEffectIcon';

interface TacticalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMapTrait?: MapTraitType;
}

const MAP_TRAIT_KEYS: MapTraitType[] = [
  'standard',
  'broken_walls',
  'dangerous_grass',
  'flying_cloud',
  'expanding_rivers',
];

export const TacticalGuideModal: React.FC<TacticalGuideModalProps> = ({
  isOpen,
  onClose,
  activeMapTrait = 'standard',
}) => {
  const [selectedTrait, setSelectedTrait] = useState<MapTraitType>(activeMapTrait);

  if (!isOpen) return null;

  const currentCfg = MAP_EFFECTS_CONFIG[selectedTrait];
  const theme = getMapEffectColorTheme(selectedTrait);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl text-slate-100 overflow-hidden font-body"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white font-hud">
                Tactical Guide & Map Traits
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Official MLBB Season battlefield modifications & draft strategy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Map Trait Selector Tabs */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 font-hud flex items-center gap-1.5">
              <Compass className="h-3 w-3 text-amber-400" />
              Battlefield Terrain Conditions
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {MAP_TRAIT_KEYS.map((key) => {
                const cfg = MAP_EFFECTS_CONFIG[key];
                const active = selectedTrait === key;
                const tabTheme = getMapEffectColorTheme(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTrait(key)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? `${tabTheme.tagBg} shadow-md scale-[1.02] border-amber-400/80`
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <MapEffectIcon effect={key} className="h-4 w-4 mb-1" />
                    <span className="text-[10px] font-hud font-bold tracking-wider truncate w-full">
                      {cfg.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Map Trait Detail Card */}
          <div className={`rounded-xl border p-4 ${theme.bg} ${theme.border} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapEffectIcon effect={selectedTrait} className="h-5 w-5" />
                <h3 className={`text-sm sm:text-base font-black font-hud uppercase tracking-wider ${theme.text}`}>
                  {currentCfg.name}
                </h3>
              </div>
              <span className={`text-[9px] font-hud font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.tagBg}`}>
                {currentCfg.badgeLabel}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentCfg.description}
            </p>

            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold font-hud uppercase tracking-wide">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Coach Strategy:</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-body">
                {currentCfg.tacticalTip}
              </p>
            </div>

            {currentCfg.synergyHeroIds && currentCfg.synergyHeroIds.length > 0 && (
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-hud flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Key Meta Synergy Picks:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentCfg.synergyHeroIds.map((hId) => (
                    <span
                      key={hId}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 border border-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-slate-200 capitalize font-hud"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                      {hId.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Core Draft Rules & Tips */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 font-hud flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Core Draft Principles for Tournament & Scrims
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5">
                <span className="font-bold text-white block mb-0.5 font-hud uppercase tracking-wide">
                  1. Frontline Durability
                </span>
                Ensure at least 1 primary initiator/tank and 1 secondary dive/bruiser to check bushes and absorb high burst.
              </div>
              <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5">
                <span className="font-bold text-white block mb-0.5 font-hud uppercase tracking-wide">
                  2. Damage Split
                </span>
                Avoid all-physical or all-magic drafts. Hybrid damage profiles force opponents to split armor and magic defense items.
              </div>
              <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5">
                <span className="font-bold text-white block mb-0.5 font-hud uppercase tracking-wide">
                  3. Priority Flex Picks
                </span>
                Secure heroes in early pick rounds that can flex across multiple lanes (e.g. Chou, Paquito, Harith, Edith) to obscure your strategy.
              </div>
              <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5">
                <span className="font-bold text-white block mb-0.5 font-hud uppercase tracking-wide">
                  4. Power Spikes & Scaling
                </span>
                Pair an early-game playmaking roamer or mid with late-game insurance marksman to remain competitive across all game lengths.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 py-3 bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
