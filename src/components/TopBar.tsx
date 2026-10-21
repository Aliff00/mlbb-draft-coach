import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Ban,
  Check,
  ChevronDown,
  FileText,
  RotateCcw,
  X,
} from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import {
  MAP_EFFECTS_CONFIG,
  MapTraitType,
  TeamSide,
} from '../types/draft';
import { DraftSummaryModal } from './DraftSummaryModal';
import { HeroAvatar } from './HeroAvatar';
import { getMapEffectColorTheme, MapEffectIcon } from './MapEffectIcon';
import { ResetConfirmModal } from './ResetConfirmModal';

const MAP_TRAITS: { id: MapTraitType; label: string }[] = [
  { id: 'standard', label: 'Standard (Sanctum Island)' },
  { id: 'broken_walls', label: 'Broken Walls' },
  { id: 'dangerous_grass', label: 'Dangerous Grass' },
  { id: 'flying_cloud', label: 'Flying Cloud' },
  { id: 'expanding_rivers', label: 'Expanding River' },
];

export const TopBar: React.FC = () => {
  const {
    mapTrait,
    blueBans,
    redBans,
    activeSlot,
    setActiveSlot,
    clearSlot,
    swapSides,
    swapBanSlots,
    resetBoard,
    setMapTrait,
  } = useDraftStore();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];
  const mapTheme = getMapEffectColorTheme(mapTrait);

  const renderBanChip = (team: TeamSide, slotIdx: number) => {
    const isBlue = team === 'BLUE';
    const bans = isBlue ? blueBans : redBans;
    const hero = bans[slotIdx];
    const isActive =
      activeSlot?.type === 'BAN' &&
      activeSlot?.team === team &&
      activeSlot?.index === slotIdx;

    return (
      <div
        key={`${team}-ban-${slotIdx}`}
        draggable={Boolean(hero)}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'BAN', team, index: slotIdx }));
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'BAN' && data.team === team && data.index !== slotIdx) {
              swapBanSlots(team, data.index, slotIdx);
            }
          } catch {
            // Ignore parse errors
          }
        }}
        onClick={() => setActiveSlot({ type: 'BAN', team, index: slotIdx })}
        className="group relative h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 flex items-center justify-center cursor-pointer select-none"
        title={
          hero
            ? `${team} Ban ${slotIdx + 1}: ${hero.name} (Click to select/replace, drag to swap)`
            : `${team} Ban Slot ${slotIdx + 1} (Click to set active ban)`
        }
      >
        {/* Circular Avatar Container */}
        <div
          className={`relative h-full w-full rounded-full border-2 overflow-hidden transition-all duration-150 flex items-center justify-center ${
            isActive
              ? isBlue
                ? 'border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] ring-2 ring-sky-300 scale-105'
                : 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] ring-2 ring-rose-300 scale-105'
              : hero
              ? isBlue
                ? 'border-sky-500/60 bg-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                : 'border-rose-500/60 bg-slate-950 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
              : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
          }`}
        >
          {hero ? (
            <HeroAvatar
              hero={hero}
              grayscale
              className="opacity-75 contrast-125 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            /* Empty Ban Slot: Enlarged Question Mark Icon */
            <div className="flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 sm:h-6 sm:w-6 opacity-65 group-hover:opacity-100 transition-all"
              >
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
          )}

          {isActive && (
            <span
              className={`absolute inset-0 rounded-full pointer-events-none animate-ping opacity-40 ${
                isBlue ? 'bg-sky-400' : 'bg-rose-400'
              }`}
            />
          )}
        </div>

        {/* Banned Hero Prohibition Icon ONLY (NO outer circle, placed directly on the circular line border) */}
        {hero && (
          <div
            className={`absolute pointer-events-none z-20 ${
              isBlue
                ? 'bottom-0 right-0 translate-x-[15%] translate-y-[15%]'
                : 'bottom-0 left-0 -translate-x-[15%] translate-y-[15%]'
            }`}
          >
            <Ban className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-rose-500 stroke-[3] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]" />
          </div>
        )}

        {/* Dedicated Small Remove (x) Button (Top corner, doesn't interfere with clicking the avatar) */}
        {hero && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSlot('BAN', team, slotIdx);
            }}
            className={`absolute ${
              isBlue ? '-top-1 -right-1' : '-top-1 -left-1'
            } h-4 w-4 rounded-full bg-slate-950/90 border border-slate-700 text-slate-400 hover:text-white hover:bg-rose-600 hover:border-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md z-30 cursor-pointer`}
            title="Remove ban"
          >
            <X className="h-2.5 w-2.5 stroke-[3]" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onConfirm={() => {
          resetBoard();
          setIsResetModalOpen(false);
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />

      <DraftSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />

      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-3 sm:px-4 py-2 shadow-xl">
        <div className="grid grid-cols-12 items-center gap-2">
          {/* Left: Blue Team 5 Quick Ban Chips */}
          <div className="col-span-12 sm:col-span-3 flex items-center justify-start relative">
            <div className="absolute -left-2 inset-y-0 w-28 bg-blue-600/15 blur-xl pointer-events-none rounded-full" />
            <div className="relative z-10 flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((idx) => renderBanChip('BLUE', idx))}
            </div>
          </div>

          {/* Center: Tactician Toolbar Actions */}
          <div className="col-span-12 sm:col-span-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {/* Reset Board Button */}
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-950/40 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition cursor-pointer shadow-sm"
              title="Reset all picks and bans"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
              <span>Reset Board</span>
            </button>

            {/* Swap Sides (Blue <-> Red) */}
            <button
              type="button"
              onClick={swapSides}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/90 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-slate-200 hover:text-amber-300 hover:border-amber-400/60 transition cursor-pointer shadow-sm"
              title="Swap Blue and Red sides completely"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
              <span>Swap Sides</span>
            </button>

            {/* Map Trait Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMapDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider transition cursor-pointer select-none ${mapTheme.tagBg} ${mapTheme.glow} shadow-sm`}
                title={`Map Trait: ${mapConfig.name} — Click to change battlefield conditions`}
              >
                <MapEffectIcon effect={mapTrait} className="h-3.5 w-3.5" />
                <span className="truncate max-w-[110px] sm:max-w-none">
                  {mapConfig.shortName}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {/* Map Trait Popover Menu */}
              {isMapDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMapDropdownOpen(false)}
                  />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md z-50 text-left">
                    <div className="text-[10px] font-hud font-bold uppercase tracking-wider text-slate-400 pb-1.5 mb-1 border-b border-slate-800">
                      Select Battlefield Map Trait
                    </div>
                    <div className="flex flex-col gap-1 font-hud">
                      {MAP_TRAITS.map((item) => {
                        const cfg = MAP_EFFECTS_CONFIG[item.id];
                        const isSelected = mapTrait === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setMapTrait(item.id);
                              setIsMapDropdownOpen(false);
                            }}
                            className={`flex flex-col gap-0.5 p-2 rounded-lg text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-400/60 text-amber-200'
                                : 'hover:bg-slate-900 border border-transparent text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-1.5">
                                <MapEffectIcon effect={item.id} className="h-3.5 w-3.5" />
                                {cfg.name}
                              </span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                            </div>
                            <span className="text-[9.5px] text-slate-400 leading-tight">
                              {cfg.tacticalTip}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Export Draft Summary Button */}
            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-amber-400/70 bg-amber-500/20 px-2 sm:px-2.5 py-1 text-[11px] font-hud font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/30 transition cursor-pointer shadow-gold-glow"
              title="Open draft export & Discord scrim summary notes"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>Export Summary</span>
            </button>
          </div>

          {/* Right: Red Team 5 Quick Ban Chips */}
          <div className="col-span-12 sm:col-span-3 flex items-center justify-end relative">
            <div className="absolute -right-2 inset-y-0 w-28 bg-rose-600/15 blur-xl pointer-events-none rounded-full" />
            <div className="relative z-10 flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((idx) => renderBanChip('RED', idx))}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
