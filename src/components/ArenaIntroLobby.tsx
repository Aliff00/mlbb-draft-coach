import React, { useState } from 'react';
import {
  ChevronDown,
  Compass,
  Crown,
  Dices,
  Play,
  Shield,
  ShieldAlert,
  Swords,
  Trophy,
} from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { MapTraitType, TurnDurationOption } from '../types/draft';
import { MapEffectIcon } from './MapEffectIcon';

type MainTab = 'RANKED' | 'TOURNAMENT' | 'FREE_PRACTICE';

const RANKED_RANKS: Array<{
  mode: 'RANKED_EPIC' | 'RANKED_LEGEND' | 'RANKED_MYTHIC';
  label: string;
  badge: string;
}> = [
  { mode: 'RANKED_MYTHIC', label: 'Mythic', badge: '5 Bans' },
  { mode: 'RANKED_LEGEND', label: 'Legend', badge: '4 Bans' },
  { mode: 'RANKED_EPIC', label: 'Epic', badge: '3 Bans' },
];

const MAP_OPTIONS: MapTraitType[] = [
  'standard',
  'dangerous_grass',
  'broken_walls',
  'flying_cloud',
  'expanding_rivers',
];

export const ArenaIntroLobby: React.FC = () => {
  const {
    mode,
    rankedSubMode,
    mapTrait,
    firstPickSide,
    turnDuration,
    isInfiniteTime,
    setMode,
    setRankedSubMode,
    setMapTrait,
    setFirstPickSide,
    setTurnDuration,
    toggleInfiniteTime,
    startDraft,
  } = useDraftStore();

  const [isRankMenuOpen, setIsRankMenuOpen] = useState(false);

  const handleRandomizeMap = () => {
    const randomIndex = Math.floor(Math.random() * MAP_OPTIONS.length);
    setMapTrait(MAP_OPTIONS[randomIndex]);
  };

  // Active top-level category tab
  const activeTab: MainTab =
    mode === 'TOURNAMENT_MPL'
      ? 'TOURNAMENT'
      : mode === 'FREE_PRACTICE'
      ? 'FREE_PRACTICE'
      : 'RANKED';

  const handleSelectMainTab = (tab: MainTab) => {
    setIsRankMenuOpen(false);
    if (tab === 'RANKED') {
      setMode(rankedSubMode);
    } else if (tab === 'TOURNAMENT') {
      setMode('TOURNAMENT_MPL');
    } else {
      setMode('FREE_PRACTICE');
    }
  };

  const handleRankedClick = () => {
    if (activeTab !== 'RANKED') {
      handleSelectMainTab('RANKED');
      setIsRankMenuOpen(true);
    } else {
      setIsRankMenuOpen((prev) => !prev);
    }
  };

  const handleSelectRank = (rMode: 'RANKED_EPIC' | 'RANKED_LEGEND' | 'RANKED_MYTHIC') => {
    setRankedSubMode(rMode);
    setIsRankMenuOpen(false);
  };

  const activeRankLabel =
    rankedSubMode === 'RANKED_MYTHIC'
      ? 'Mythic'
      : rankedSubMode === 'RANKED_LEGEND'
      ? 'Legend'
      : 'Epic';

  return (
    <div className="relative flex flex-col justify-between h-full min-h-0 rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#0e1628]/95 via-[#080d1a]/95 to-[#050811]/95 p-5 lg:p-6 shadow-2xl overflow-hidden select-none">
      {/* Background Subtle Radial Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
        <div className="h-80 w-80 rounded-full border-8 border-amber-400" />
      </div>

      {/* Top Header Typography */}
      <div className="flex flex-col items-center justify-center text-center pt-0.5">
        <span className="text-[11px] font-black tracking-[0.35em] text-slate-400 uppercase font-hud">
          MOBILE LEGENDS
        </span>
        <h1 className="mt-0.5 text-3xl sm:text-4xl font-display font-bold tracking-wider uppercase text-yellow-500 drop-shadow-[0_2px_10px_rgba(234,179,8,0.4)]">
          DRAFT PICK SIMULATOR
        </h1>
      </div>

      {/* Main Form Rows: Compact, Sleek, Centered Without Scrolling */}
      <div className="flex flex-col items-center gap-3 my-auto w-full max-w-xl mx-auto">
        {/* Row 1: Mode Pills with Ranked Dropdown */}
        <div className="relative w-full">
          {isRankMenuOpen && (
            <div
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setIsRankMenuOpen(false)}
            />
          )}

          <div className="grid grid-cols-3 w-full gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-1.5 relative z-20">
            {/* Tab 1: Free Practice (Most Left & Default) */}
            <button
              type="button"
              onClick={() => handleSelectMainTab('FREE_PRACTICE')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'FREE_PRACTICE'
                  ? 'border border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/50'
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Dices className="h-4 w-4 text-emerald-400" />
              <span>Free Practice</span>
            </button>

            {/* Tab 2: Ranked with Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={handleRankedClick}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'RANKED'
                    ? 'border border-amber-400 bg-amber-500/25 text-amber-300 shadow-gold-glow ring-1 ring-amber-400/50'
                    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {activeTab === 'RANKED' ? `Ranked: ${activeRankLabel}` : 'Ranked'}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-amber-400 shrink-0 transition-transform duration-200 ${
                    isRankMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu to choose rank position: EPIC / LEGEND / MYTHIC */}
              {isRankMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[170px] rounded-xl border border-amber-500/50 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-md z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800/80">
                    Rank Position
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {RANKED_RANKS.map((r) => {
                      const isSelected = rankedSubMode === r.mode && activeTab === 'RANKED';
                      return (
                        <button
                          key={r.mode}
                          type="button"
                          onClick={() => handleSelectRank(r.mode)}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? 'border border-amber-400 bg-amber-500/25 text-amber-300 shadow-gold-glow'
                              : 'border border-transparent text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-amber-400" />
                            <span>{r.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold lowercase">
                            {r.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Tab 3: Tournament */}
            <button
              type="button"
              onClick={() => handleSelectMainTab('TOURNAMENT')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'TOURNAMENT'
                  ? 'border border-amber-400 bg-amber-500/25 text-amber-300 shadow-gold-glow ring-1 ring-amber-400/50'
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Tournament</span>
            </button>
          </div>
        </div>

        {/* Row 2: Starting Side [ Blue First | Red Second ] */}
        <div className="grid grid-cols-2 w-full gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-1.5">
          <button
            type="button"
            onClick={() => setFirstPickSide('BLUE')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              firstPickSide === 'BLUE'
                ? 'border border-sky-400 bg-sky-500/25 text-sky-300 shadow-blue-glow ring-1 ring-sky-400/50'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-sky-400" />
            <span>BLUE (FIRST PICK)</span>
          </button>
          <button
            type="button"
            onClick={() => setFirstPickSide('RED')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              firstPickSide === 'RED'
                ? 'border border-rose-400 bg-rose-500/25 text-rose-300 shadow-red-glow ring-1 ring-rose-400/50'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Swords className="h-3.5 w-3.5 text-rose-400" />
            <span>RED (SECOND PICK)</span>
          </button>
        </div>

        {/* Row 3: Map Trait Dropdown + Turn Timer Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 w-full gap-2.5 rounded-xl border border-slate-800 bg-slate-950/90 p-2.5">
          {/* Map Trait Dropdown with Randomize Button */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Compass className="h-3 w-3 text-amber-400" />
                Map Trait:
              </label>
              <button
                type="button"
                onClick={handleRandomizeMap}
                className="flex items-center gap-1 rounded bg-slate-900 border border-slate-700/80 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300 hover:border-amber-400 transition cursor-pointer"
                title="Randomize Map Trait"
              >
                <Dices className="h-3 w-3 text-amber-400" />
                <span>Randomize</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3 flex items-center">
                <MapEffectIcon effect={mapTrait} className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <select
                value={mapTrait}
                onChange={(e) => setMapTrait(e.target.value as MapTraitType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-7 py-2 text-xs font-bold text-slate-100 focus:border-amber-400 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="standard">Standard</option>
                <option value="dangerous_grass">Dangerous Grass</option>
                <option value="broken_walls">Broken Walls</option>
                <option value="flying_cloud">Flying Cloud</option>
                <option value="expanding_rivers">Expanding River</option>
              </select>
              <div className="pointer-events-none absolute right-3 text-slate-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* Turn Timer Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Turn Timer:
            </label>
            <div className="relative flex items-center">
              <select
                value={isInfiniteTime || activeTab === 'FREE_PRACTICE' ? 'inf' : String(turnDuration)}
                disabled={activeTab === 'FREE_PRACTICE'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'inf') {
                    if (!isInfiniteTime) toggleInfiniteTime();
                  } else {
                    if (isInfiniteTime) toggleInfiniteTime();
                    setTurnDuration(Number(val) as TurnDurationOption);
                  }
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-100 focus:border-amber-400 focus:outline-none cursor-pointer disabled:opacity-50 appearance-none"
              >
                <option value="15">15 Seconds</option>
                <option value="30">30 Seconds (Default)</option>
                <option value="60">60 Seconds</option>
                <option value="inf">Infinite (No Timer)</option>
              </select>
              <div className="pointer-events-none absolute right-3 text-slate-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Prominent [ ▶ START DRAFT ] Button */}
      <div className="flex items-center justify-center pt-2">
        <button
          type="button"
          onClick={startDraft}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl border border-emerald-400 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 px-12 py-2.5 font-display text-2xl font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer leading-none"
        >
          <Play className="h-5 w-5 fill-slate-950" />
          <span>START DRAFT</span>
        </button>
      </div>
    </div>
  );
};
