import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';
import { getModeMetadata } from '../engine/draftSequence';
import { useDraftStore } from '../store/useDraftStore';
import { DEDICATED_LANES, doesHeroMatchList, MAP_EFFECTS_CONFIG } from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { getMapEffectColorTheme, MapEffectIcon } from './MapEffectIcon';

interface DraftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DraftSummaryModal: React.FC<DraftSummaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    mode,
    mapTrait,
    blueTeamName,
    redTeamName,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
  } = useDraftStore();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];
  const mapTheme = getMapEffectColorTheme(mapTrait);
  const modeMeta = getModeMetadata(mode);

  const bluePickNames = bluePicks.filter(Boolean).map((h) => h!.name);
  const redPickNames = redPicks.filter(Boolean).map((h) => h!.name);
  const blueBanNames = blueBans.filter(Boolean).map((h) => h!.name);
  const redBanNames = redBans.filter(Boolean).map((h) => h!.name);

  const blueSynergies = bluePicks
    .filter(Boolean)
    .filter((h) => doesHeroMatchList(h!, mapConfig.synergyHeroIds))
    .map((h) => h!.name);

  const redSynergies = redPicks
    .filter(Boolean)
    .filter((h) => doesHeroMatchList(h!, mapConfig.synergyHeroIds))
    .map((h) => h!.name);

  // Generate scrim notes text
  const generateScrimNotes = (): string => {
    return [
      `=========================================`,
      `MLBB SCRIM DRAFT REPORT & TACTICAL SUMMARY`,
      `=========================================`,
      `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      `Battlefield Map Trait: ${mapConfig.name.toUpperCase()}`,
      `  Condition: ${mapConfig.description}`,
      `  Tactical Note: ${mapConfig.tacticalTip}`,
      ``,
      `[BLUE TEAM: ${blueTeamName || 'Blue Team'}]`,
      `  EXP Lane: ${bluePicks[0]?.name || 'Unassigned'}`,
      `  Jungler:  ${bluePicks[1]?.name || 'Unassigned'}`,
      `  Mid Lane: ${bluePicks[2]?.name || 'Unassigned'}`,
      `  Roamer:   ${bluePicks[3]?.name || 'Unassigned'}`,
      `  Gold Lane:${bluePicks[4]?.name || 'Unassigned'}`,
      `  Bans:     ${blueBanNames.join(', ') || 'None'}`,
      mapTrait !== 'standard'
        ? `  Map Synergies: ${blueSynergies.join(', ') || 'None'}`
        : null,
      ``,
      `[RED TEAM: ${redTeamName || 'Red Team'}]`,
      `  EXP Lane: ${redPicks[0]?.name || 'Unassigned'}`,
      `  Jungler:  ${redPicks[1]?.name || 'Unassigned'}`,
      `  Mid Lane: ${redPicks[2]?.name || 'Unassigned'}`,
      `  Roamer:   ${redPicks[3]?.name || 'Unassigned'}`,
      `  Gold Lane:${redPicks[4]?.name || 'Unassigned'}`,
      `  Bans:     ${redBanNames.join(', ') || 'None'}`,
      mapTrait !== 'standard'
        ? `  Map Synergies: ${redSynergies.join(', ') || 'None'}`
        : null,
      `=========================================`,
    ]
      .filter((line) => line !== null)
      .join('\n');
  };

  const handleCopyNotes = async () => {
    const text = generateScrimNotes();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#0e1628] via-[#090e1c] to-[#060913] p-5 shadow-2xl overflow-hidden">
        {/* Top Gold Accent Line */}
        <div className="absolute inset-x-12 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
                Scrim Draft Summary
              </h2>
              <span className="text-[10px] font-bold text-slate-400">
                {modeMeta.title} • {modeMeta.banCount} Bans / Team
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 scrollbar-thin">
          {/* Map Trait & Season 42 Mechanics Card */}
          <div className={`rounded-xl border p-3 ${mapTheme.border} ${mapTheme.bg} ${mapTheme.glow}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-slate-950/80 ${mapTheme.text} border border-slate-800`}>
                  <MapEffectIcon effect={mapTrait} className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Battlefield Map Trait:
                    </span>
                    <span className={`text-xs font-black uppercase tracking-wider ${mapTheme.text}`}>
                      {mapConfig.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 mt-0.5">
                    {mapConfig.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <span className="text-slate-400">
                <strong className="text-slate-300">Tactical Note:</strong> {mapConfig.tacticalTip}
              </span>
              {mapTrait !== 'standard' && (
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-sky-300">
                    Blue Synergies: <strong>{blueSynergies.length}</strong>
                  </span>
                  <span className="text-rose-300">
                    Red Synergies: <strong>{redSynergies.length}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Teams Drafted Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Blue Team Card */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-sky-500/20">
                <span className="text-xs font-black uppercase tracking-wider text-sky-400">
                  {blueTeamName || 'Blue Team'} (First Pick)
                </span>
                <span className="text-[10px] text-slate-400">
                  {bluePickNames.length}/5 Picks
                </span>
              </div>

              {/* Picks */}
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Picks:
                </span>
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {bluePicks.map((hero, idx) => {
                    const isSynergy = hero && doesHeroMatchList(hero, mapConfig.synergyHeroIds);
                    return (
                      <div
                        key={`blue-summary-pick-${idx}`}
                        className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-900/80 p-1"
                      >
                        <div className="relative aspect-square w-full rounded overflow-hidden">
                          {hero ? (
                            <>
                              <HeroAvatar hero={hero} />
                              {isSynergy && (
                                <div className="absolute right-0.5 top-0.5 rounded bg-amber-500/90 p-0.5" title="Map Synergy">
                                  <Sparkles className="h-2 w-2 text-slate-950" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="h-full w-full bg-slate-950 flex items-center justify-center text-[9px] text-slate-600">
                              -
                            </div>
                          )}
                        </div>
                        <span className="mt-1 truncate w-full text-center text-[9px] font-bold text-slate-200">
                          {hero?.name || DEDICATED_LANES[idx]?.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bans */}
              <div className="mt-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Bans:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {blueBans.filter(Boolean).map((hero, idx) => (
                    <span
                      key={`blue-ban-${idx}`}
                      className="rounded bg-slate-900/90 border border-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300"
                    >
                      {hero?.name}
                    </span>
                  ))}
                  {blueBans.every((b) => b === null) && (
                    <span className="text-[9px] text-slate-500">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Red Team Card */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-500/20">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                  {redTeamName || 'Red Team'} (Second Pick)
                </span>
                <span className="text-[10px] text-slate-400">
                  {redPickNames.length}/5 Picks
                </span>
              </div>

              {/* Picks */}
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Picks:
                </span>
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {redPicks.map((hero, idx) => {
                    const isSynergy = hero && doesHeroMatchList(hero, mapConfig.synergyHeroIds);
                    return (
                      <div
                        key={`red-summary-pick-${idx}`}
                        className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-900/80 p-1"
                      >
                        <div className="relative aspect-square w-full rounded overflow-hidden">
                          {hero ? (
                            <>
                              <HeroAvatar hero={hero} />
                              {isSynergy && (
                                <div className="absolute right-0.5 top-0.5 rounded bg-amber-500/90 p-0.5" title="Map Synergy">
                                  <Sparkles className="h-2 w-2 text-slate-950" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="h-full w-full bg-slate-950 flex items-center justify-center text-[9px] text-slate-600">
                              -
                            </div>
                          )}
                        </div>
                        <span className="mt-1 truncate w-full text-center text-[9px] font-bold text-slate-200">
                          {hero?.name || DEDICATED_LANES[idx]?.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bans */}
              <div className="mt-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Bans:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {redBans.filter(Boolean).map((hero, idx) => (
                    <span
                      key={`red-ban-${idx}`}
                      className="rounded bg-slate-900/90 border border-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300"
                    >
                      {hero?.name}
                    </span>
                  ))}
                  {redBans.every((b) => b === null) && (
                    <span className="text-[9px] text-slate-500">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Formatted Text Box for Quick Scrim Sharing */}
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Scrim Notes Export (Text / Discord)
              </span>
              <span className="text-[9px] text-slate-500">
                Ready to paste into scrim tracking sheets
              </span>
            </div>
            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300 leading-relaxed overflow-x-auto select-all">
              {generateScrimNotes()}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleCopyNotes}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-gold-glow hover:brightness-110'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Scrim Notes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
