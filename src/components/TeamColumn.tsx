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
    <aside className="h-full w-full flex flex-col min-h-0 rounded-none overflow-hidden border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm shadow-2xl select-none">
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
              idx < picks.length - 1 ? 'border-b border-white/10' : ''
            } ${
              hero
                ? isBlue
                  ? 'bg-sky-950/30 hover:bg-sky-950/45'
                  : 'bg-rose-950/30 hover:bg-rose-950/45'
                : isActive
                ? isBlue
                  ? 'bg-gradient-to-r from-blue-600/40 via-blue-600/15 to-transparent'
                  : 'bg-gradient-to-l from-red-600/40 via-red-600/15 to-transparent'
                : 'bg-[#0b1220]/50 hover:bg-[#0f172a]/70'
            } ${
              isActive
                ? isBlue
                  ? 'ring-1 ring-inset ring-sky-400/80 shadow-[inset_0_0_12px_rgba(56,189,248,0.2)]'
                  : 'ring-1 ring-inset ring-rose-400/80 shadow-[inset_0_0_12px_rgba(244,63,94,0.2)]'
                : ''
            } ${draggedIndex === idx ? 'opacity-50 scale-95' : ''}`}
          >
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
                  <LaneIcon lane={laneCfg.lane} className="h-3.5 w-3.5 shrink-0 text-sky-400 drop-shadow self-center" />
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
                    isActive ? 'text-sky-300' : 'text-slate-400/80'
                  }`}
                />
              </div>
            )}

            {/* Active Turn Directional Flare (Only when slot is empty) */}
            {isActive && !hero && (
              <div
                className={`pointer-events-none absolute inset-0 z-20 ${
                  isBlue
                    ? 'bg-gradient-to-r from-blue-500/40 via-blue-600/15 via-45% to-transparent animate-pulse'
                    : 'bg-gradient-to-l from-red-500/40 via-red-600/15 to-transparent animate-pulse'
                }`}
              />
            )}

            {/* Active Turn Glowing Directional Laser Edge Highlight */}
            {isActive && (
              <div
                className={`absolute bottom-0 inset-x-0 h-[2.5px] z-30 ${
                  isBlue
                    ? 'bg-gradient-to-r from-white via-blue-500 to-transparent shadow-[0_2px_12px_rgba(59,130,246,0.8),0_0_20px_#3b82f6]'
                    : 'bg-gradient-to-l from-white via-red-500 to-transparent shadow-[0_2px_12px_rgba(239,68,68,0.8),0_0_20px_#ef4444]'
                }`}
              />
            )}
          </div>
        );
      })}
    </aside>
  );
};
