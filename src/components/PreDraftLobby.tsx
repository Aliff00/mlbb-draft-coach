import React from 'react';
import { Crown, Play } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { DraftMode, TurnDurationOption } from '../types/draft';

const MODE_OPTIONS: Array<{
  mode: DraftMode;
  label: string;
}> = [
  { mode: 'FREE_PRACTICE', label: 'Free Practice' },
  { mode: 'RANKED_EPIC', label: 'Epic (3 Bans)' },
  { mode: 'RANKED_LEGEND', label: 'Legend (4 Bans)' },
  { mode: 'RANKED_MYTHIC', label: 'Mythic (5 Bans)' },
  { mode: 'TOURNAMENT_MPL', label: 'Tournament' },
];

const DURATION_OPTIONS: TurnDurationOption[] = [15, 30, 60];

export const PreDraftLobby: React.FC = () => {
  const {
    isDraftStarted,
    mode,
    turnDuration,
    isInfiniteTime,
    blueTeamName,
    redTeamName,
    setMode,
    setTurnDuration,
    toggleInfiniteTime,
    setBlueTeamName,
    setRedTeamName,
    startDraft,
  } = useDraftStore();

  if (isDraftStarted) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#0d1426] via-[#090e1c] to-[#060913] p-6 shadow-2xl">
        {/* Top Gold Accent Line */}
        <div className="absolute inset-x-16 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Minimal Title Header */}
        <div className="flex items-center justify-center gap-2.5 pb-5">
          <Crown className="h-5 w-5 text-amber-400" />
          <h1 className="text-base font-black uppercase tracking-[0.2em] text-amber-400">
            MLBB Draft Pick
          </h1>
        </div>

        {/* Sleek 4-Button Mode Selector Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-800/90 bg-slate-950/90 p-1.5">
          {MODE_OPTIONS.map((item) => {
            const isSelected = mode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => setMode(item.mode)}
                className={`rounded-lg py-2.5 px-3 text-xs font-extrabold uppercase tracking-wider transition-all ${
                  isSelected
                    ? 'border border-amber-400 bg-amber-500/20 text-amber-300 shadow-gold-glow'
                    : 'border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Sleek Timer & Team Name Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Timer Pill Group: [ 15s | 30s | 60s | ∞ Off ] */}
          <div className="inline-flex shrink-0 items-center rounded-xl border border-slate-800/90 bg-slate-950/90 p-1">
            {DURATION_OPTIONS.map((sec) => {
              const active = !isInfiniteTime && turnDuration === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTurnDuration(sec)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}s
                </button>
              );
            })}
            <button
              type="button"
              onClick={toggleInfiniteTime}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                isInfiniteTime
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ∞ Off
            </button>
          </div>

          {/* Team Name Inputs Side-by-Side */}
          <div className="grid flex-1 grid-cols-2 gap-2.5">
            <input
              type="text"
              maxLength={22}
              value={blueTeamName}
              onChange={(e) => setBlueTeamName(e.target.value)}
              placeholder="Blue Team"
              className="w-full rounded-xl border border-sky-500/40 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-sky-100 placeholder-sky-400/40 focus:border-sky-400 focus:shadow-blue-glow focus:outline-none transition"
            />
            <input
              type="text"
              maxLength={22}
              value={redTeamName}
              onChange={(e) => setRedTeamName(e.target.value)}
              placeholder="Red Team"
              className="w-full rounded-xl border border-rose-500/40 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-rose-100 placeholder-rose-400/40 focus:border-rose-400 focus:shadow-red-glow focus:outline-none transition text-right"
            />
          </div>
        </div>

        {/* Prominent START DRAFT Action Button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={startDraft}
            className="w-full sm:w-64 flex items-center justify-center gap-2.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-8 py-3 text-sm font-black uppercase tracking-[0.15em] text-slate-950 shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>START DRAFT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
