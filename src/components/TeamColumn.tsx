import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { DEDICATED_LANES, TeamSide } from '../types/draft';
import { getHeroBannerPosition, shouldHeroFlip } from '../data/heroBannerPositions';
import { HeroAvatar } from './HeroAvatar';
import { LaneIcon } from './LaneIcon';
import { setCustomHeroDragImage } from '../utils/dragGhost';

interface TeamColumnProps {
  team: TeamSide;
}

export const TeamColumn: React.FC<TeamColumnProps> = ({ team }) => {
  const {
    bluePicks,
    redPicks,
    activeSlot,
    setActiveSlot,
    clearSlot,
    swapSlots,
    placeHero,
  } = useDraftStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const picks = team === 'BLUE' ? bluePicks : redPicks;
  const isBlue = team === 'BLUE';

  return (
    <aside className="h-full w-full flex flex-col min-h-0 rounded-none overflow-hidden border border-slate-800/80 bg-slate-950/60 backdrop-blur-md shadow-2xl select-none transition-all">
      {picks.map((hero, idx) => {
        const laneCfg = DEDICATED_LANES[idx] || DEDICATED_LANES[0];
        const isActive =
          activeSlot?.type === 'PICK' &&
          activeSlot?.team === team &&
          activeSlot?.index === idx;

        const isDropTarget = dragOverIndex === idx;

        return (
          <div
            key={`${team}-slot-${idx}`}
            draggable={Boolean(hero)}
            onDragStart={(e) => {
              setDraggedIndex(idx);
              const payload = JSON.stringify({ type: 'PICK', team, index: idx, hero });
              e.dataTransfer.setData('application/json', payload);
              e.dataTransfer.setData('text/plain', payload);
              e.dataTransfer.effectAllowed = 'copyMove';
              if (hero) {
                setCustomHeroDragImage(e, hero);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverIndex(idx);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (dragOverIndex === idx) setDragOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDraggedIndex(null);
              setDragOverIndex(null);
              try {
                const raw =
                  e.dataTransfer.getData('application/json') ||
                  e.dataTransfer.getData('text/plain');
                if (!raw) return;
                const data = JSON.parse(raw);

                // Case 1: Dropped hero from Hero Grid
                if (data.type === 'HERO' && data.hero) {
                  placeHero(data.hero, { type: 'PICK', team, index: idx });
                  return;
                }

                // Case 2: Swapping within the same team pick slots
                if (data.type === 'PICK' && data.team === team && data.index !== idx) {
                  swapSlots(team, data.index, idx);
                  return;
                }

                // Case 3: Moved pick from another slot
                if (data.type === 'PICK' && data.hero) {
                  placeHero(data.hero, { type: 'PICK', team, index: idx });
                  return;
                }
              } catch (err) {
                console.error('Pick slot drop error:', err);
              }
            }}
            onClick={() => {
              setActiveSlot({ type: 'PICK', team, index: idx });
            }}
            className={`group relative flex-1 min-h-0 w-full flex flex-col justify-end overflow-hidden cursor-pointer transition-all duration-200 ${
              idx < picks.length - 1
                ? 'border-b border-slate-800/80'
                : ''
            } ${
              hero
                ? isBlue
                  ? 'bg-sky-950/30 hover:bg-sky-950/45'
                  : 'bg-rose-950/30 hover:bg-rose-950/45'
                : isActive
                ? isBlue
                  ? 'bg-gradient-to-r from-blue-600/40 via-blue-600/15 to-transparent'
                  : 'bg-gradient-to-l from-red-600/40 via-red-600/15 to-transparent'
                : isBlue
                ? 'bg-gradient-to-r from-blue-950/30 via-slate-950/50 to-slate-950/70 hover:from-blue-900/40 hover:to-slate-900/80'
                : 'bg-gradient-to-l from-rose-950/30 via-slate-950/50 to-slate-950/70 hover:from-rose-900/40 hover:to-slate-900/80'
            } ${
              isActive
                ? isBlue
                  ? 'ring-1 ring-inset ring-sky-400/40'
                  : 'ring-1 ring-inset ring-rose-400/40'
                : ''
            } ${isDropTarget ? 'ring-2 ring-amber-400 bg-amber-500/20 scale-[1.01] z-20' : ''} ${
              draggedIndex === idx ? 'opacity-40 scale-95' : ''
            }`}
            title={hero ? `${hero.name} (Drag to swap with another slot, or drag hero here to replace)` : `Empty slot (Drag hero here to pick)`}
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

                {/* Quick Action Hover Bar (Instant Clear) */}
                <div
                  className={`absolute top-1.5 ${
                    isBlue ? 'right-2' : 'left-2'
                  } z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                >
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
