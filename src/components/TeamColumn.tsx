import React, { useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { DEDICATED_LANES, TeamSide } from '../types/draft';
import { getHeroBannerPosition, shouldHeroFlip } from '../data/heroBannerPositions';
import { HeroAvatar } from './HeroAvatar';
import { LaneIcon } from './LaneIcon';

interface TeamColumnProps {
  team: TeamSide;
}

export const TeamColumn: React.FC<TeamColumnProps> = ({ team }) => {
  const {
    bluePicks,
    redPicks,
    activeSlot,
    swapSource,
    setActiveSlot,
    clearSlot,
    swapSlots,
    handleSwapClick,
  } = useDraftStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const picks = team === 'BLUE' ? bluePicks : redPicks;
  const isBlue = team === 'BLUE';

  return (
    <aside
      className={`h-full w-full flex flex-col min-h-0 rounded-none overflow-hidden select-none transition-all shadow-2xl ${
        isBlue
          ? 'border-y border-l border-r-0 border-slate-800/80 bg-gradient-to-r from-slate-950/75 via-slate-950/40 to-transparent'
          : 'border-y border-r border-l-0 border-slate-800/80 bg-gradient-to-l from-slate-950/75 via-slate-950/40 to-transparent'
      }`}
      style={{
        maskImage: isBlue
          ? 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0.35) 88%, rgba(0,0,0,0) 100%)'
          : 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0.35) 88%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage: isBlue
          ? 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0.35) 88%, rgba(0,0,0,0) 100%)'
          : 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0.35) 88%, rgba(0,0,0,0) 100%)',
      }}
    >
      {picks.map((hero, idx) => {
        const laneCfg = DEDICATED_LANES[idx] || DEDICATED_LANES[0];
        const isActive =
          activeSlot?.type === 'PICK' &&
          activeSlot?.team === team &&
          activeSlot?.index === idx;

        const isSwapSelected =
          swapSource?.team === team && swapSource?.index === idx;

        return (
          <div
            key={`${team}-slot-${idx}`}
            draggable={Boolean(hero)}
            onDragStart={(e) => {
              setDraggedIndex(idx);
              e.dataTransfer.setData('text/plain', JSON.stringify({ team, index: idx }));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDraggedIndex(null);
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.team === team && data.index !== idx) {
                  swapSlots(team, data.index, idx);
                }
              } catch {
                // Ignore parse errors
              }
            }}
            onClick={() => {
              if (swapSource && swapSource.team === team && swapSource.index !== idx) {
                swapSlots(team, swapSource.index, idx);
              } else {
                setActiveSlot({ type: 'PICK', team, index: idx });
              }
            }}
            className={`group relative flex-1 min-h-0 w-full flex flex-col justify-end overflow-hidden cursor-pointer transition-all duration-200 ${
              hero
                ? isBlue
                  ? 'bg-gradient-to-r from-sky-950/35 via-slate-950/20 to-transparent hover:from-sky-950/50 hover:to-transparent'
                  : 'bg-gradient-to-l from-rose-950/35 via-slate-950/20 to-transparent hover:from-rose-950/50 hover:to-transparent'
                : isActive
                ? isBlue
                  ? 'bg-gradient-to-r from-blue-600/30 via-blue-600/10 to-transparent'
                  : 'bg-gradient-to-l from-red-600/30 via-red-600/10 to-transparent'
                : isBlue
                ? 'bg-gradient-to-r from-blue-950/30 via-slate-950/35 to-transparent hover:from-blue-900/40 hover:via-slate-900/30 hover:to-transparent'
                : 'bg-gradient-to-l from-rose-950/30 via-slate-950/35 to-transparent hover:from-rose-900/40 hover:via-slate-900/30 hover:to-transparent'
            } ${
              isActive
                ? isBlue
                  ? 'border-l-2 border-l-sky-400'
                  : 'border-r-2 border-r-rose-400'
                : ''
            } ${draggedIndex === idx ? 'opacity-50 scale-95' : ''}`}
          >
            {/* Horizontal Slot Divider Fading to Transparent toward the inner edge */}
            {idx < picks.length - 1 && (
              <div
                className={`absolute bottom-0 inset-x-0 h-px z-20 pointer-events-none ${
                  isBlue
                    ? 'bg-gradient-to-r from-slate-800/80 via-slate-800/40 to-transparent'
                    : 'bg-gradient-to-l from-slate-800/80 via-slate-800/40 to-transparent'
                }`}
              />
            )}
            {/* FILLED STATE: Eased Smooth 3/4 Card Hero Portrait with Center Fade */}
            {hero ? (
              <>
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{
                    maskImage: isBlue
                      ? 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 25%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.3) 78%, rgba(0,0,0,0.08) 90%, rgba(0,0,0,0) 100%)'
                      : 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 25%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.3) 78%, rgba(0,0,0,0.08) 90%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: isBlue
                      ? 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 25%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.3) 78%, rgba(0,0,0,0.08) 90%, rgba(0,0,0,0) 100%)'
                      : 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 25%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.3) 78%, rgba(0,0,0,0.08) 90%, rgba(0,0,0,0) 100%)',
                  }}
                >
                  <div className={`h-full w-full ${shouldHeroFlip(hero, isBlue) ? '-scale-x-100' : ''}`}>
                    <HeroAvatar
                      hero={hero}
                      variant="banner"
                      style={{ objectPosition: getHeroBannerPosition(hero) }}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-100"
                    />
                  </div>

                  {/* Dark Vignette Overlay for Crisp Text Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
                </div>

                {/* Quick Action Hover Bar (Clear & Swap) */}
                <div
                  className={`absolute top-1.5 ${
                    isBlue ? 'right-2' : 'left-2'
                  } z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  {/* Swap button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwapClick(team, idx);
                    }}
                    title="Click here then click another slot on this team to swap"
                    className={`flex h-5 w-5 items-center justify-center rounded-md border shadow transition cursor-pointer ${
                      isSwapSelected
                        ? 'border-amber-300 bg-amber-400 text-slate-950 scale-110'
                        : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:border-amber-400 hover:text-white'
                    }`}
                  >
                    <ArrowLeftRight className="h-2.5 w-2.5" />
                  </button>

                  {/* Instant Clear Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSlot('PICK', team, idx);
                    }}
                    title="Clear hero from slot"
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-700 bg-slate-900/90 text-slate-300 hover:border-rose-400 hover:bg-rose-500 hover:text-white shadow transition cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Label Area at the Bottom (Left-Aligned for both Red and Blue) */}
                <div className="relative z-10 w-full flex items-baseline justify-start gap-1.5 sm:gap-2 pb-2 px-2.5 pointer-events-none text-left min-w-0">
                  <LaneIcon
                    lane={laneCfg.lane}
                    className={`h-3.5 w-3.5 shrink-0 drop-shadow self-center ${
                      isBlue ? 'text-sky-400' : 'text-rose-400'
                    }`}
                  />
                  <span className="truncate font-body font-bold text-xs sm:text-sm tracking-wide text-white drop-shadow-md">
                    {hero.name}
                  </span>
                  <span className="capitalize text-[9px] sm:text-[9.5px] font-hud font-bold tracking-wider text-amber-300 drop-shadow-sm shrink-0 self-baseline">
                    {(hero.role || hero.roles?.[0] || 'Hero').toLowerCase()}
                  </span>
                </div>
              </>
            ) : (
              /* EMPTY STATE: Clean Background with fixed bottom-left lane icon */
              <div className="relative z-10 w-full flex items-center justify-start pb-2 px-2.5 pointer-events-none text-left">
                <LaneIcon
                  lane={laneCfg.lane}
                  className={`h-3.5 w-3.5 shrink-0 drop-shadow transition-colors ${
                    isActive
                      ? isBlue
                        ? 'text-sky-300'
                        : 'text-rose-300'
                      : isBlue
                      ? 'text-sky-400/75'
                      : 'text-rose-400/75'
                  }`}
                />
              </div>
            )}

            {/* Active Turn Directional Flare (Subtle, sleek when slot is empty) */}
            {isActive && !hero && (
              <div
                className={`pointer-events-none absolute inset-0 z-20 ${
                  isBlue
                    ? 'bg-gradient-to-r from-blue-500/15 via-blue-600/5 to-transparent'
                    : 'bg-gradient-to-l from-red-500/15 via-red-600/5 to-transparent'
                }`}
              />
            )}

            {/* Active Turn Glowing Directional Laser Edge Highlight (Slim, restrained) */}
            {isActive && (
              <div
                className={`absolute bottom-0 inset-x-0 h-[1.5px] z-30 ${
                  isBlue
                    ? 'bg-gradient-to-r from-sky-300 via-blue-400 to-transparent shadow-[0_1px_4px_rgba(56,189,248,0.35)]'
                    : 'bg-gradient-to-l from-rose-300 via-rose-400 to-transparent shadow-[0_1px_4px_rgba(244,63,94,0.35)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </aside>
  );
};
