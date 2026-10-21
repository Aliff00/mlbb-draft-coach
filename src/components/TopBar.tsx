import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Ban,
  Check,
  ChevronDown,
  RotateCcw,
  X,
} from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import {
  MAP_EFFECTS_CONFIG,
  MapTraitType,
  TeamSide,
} from '../types/draft';
import { CommandTray } from './CommandTray';
import { DraftHistoryDrawer } from './DraftHistoryDrawer';
import { DraftSummaryModal } from './DraftSummaryModal';
import { HeroAvatar } from './HeroAvatar';
import { getMapEffectColorTheme, MapEffectIcon } from './MapEffectIcon';
import { ResetConfirmModal } from './ResetConfirmModal';
import { SaveDraftModal } from './SaveDraftModal';
import { TacticalGuideModal } from './TacticalGuideModal';
import { setCustomHeroDragImage } from '../utils/dragGhost';

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
    moveOrSwapSlot,
    resetBoard,
    setMapTrait,
    placeHero,
    draggedHero,
    draggedSlot,
    setDraggedHero,
    setDraggedSlot,
  } = useDraftStore();

  const [dragOverBan, setDragOverBan] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isCommandTrayOpen, setIsCommandTrayOpen] = useState(false);
  const [isTacticalGuideOpen, setIsTacticalGuideOpen] = useState(false);

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

    const isBanDropTarget = dragOverBan === `${team}-${slotIdx}`;

    return (
      <div
        key={`${team}-ban-${slotIdx}`}
        draggable={Boolean(hero)}
        onDragStart={(e) => {
          setDraggedSlot({ type: 'BAN', team, index: slotIdx, hero });
          setDraggedHero(hero);
          const payload = JSON.stringify({ type: 'BAN', team, index: slotIdx, hero });
          e.dataTransfer.setData('application/json', payload);
          e.dataTransfer.setData('text/plain', payload);
          e.dataTransfer.effectAllowed = 'copyMove';
          setCustomHeroDragImage(e);
        }}
        onDragEnd={() => {
          setDragOverBan(null);
          setDraggedHero(null);
          setDraggedSlot(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOverBan(`${team}-${slotIdx}`);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (dragOverBan === `${team}-${slotIdx}`) setDragOverBan(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverBan(null);

          let heroToPlace: typeof hero = null;
          let sourceSlot: typeof draggedSlot = draggedSlot;

          try {
            const raw =
              e.dataTransfer.getData('application/json') ||
              e.dataTransfer.getData('text/plain');
            if (raw) {
              const data = JSON.parse(raw);
              if (data.type === 'HERO' && data.hero) {
                heroToPlace = data.hero;
              } else if (data.type === 'PICK' || data.type === 'BAN') {
                sourceSlot = data;
                heroToPlace = data.hero;
              }
            }
          } catch (err) {
            console.warn('Ban drop dataTransfer parsing fallback to store', err);
          }

          if (!heroToPlace && draggedHero) {
            heroToPlace = draggedHero;
          }

          // Case 1: Dragged from an existing slot on the board (swap or move between bans/picks/teams)
          if (sourceSlot && (sourceSlot.type === 'BAN' || sourceSlot.type === 'PICK')) {
            moveOrSwapSlot(sourceSlot, { type: 'BAN', team, index: slotIdx });
            return;
          }

          // Case 2: Dropping brand new hero from Hero Grid to ban
          if (heroToPlace) {
            placeHero(heroToPlace, { type: 'BAN', team, index: slotIdx });
            setDraggedHero(null);
            setDraggedSlot(null);
            return;
          }
        }}
        onClick={() => {
          if (isActive) {
            setActiveSlot(null);
          } else {
            setActiveSlot({ type: 'BAN', team, index: slotIdx });
          }
        }}
        className="group relative h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 flex items-center justify-center cursor-pointer select-none"
        title={
          hero
            ? `${team} Ban ${slotIdx + 1}: ${hero.name} (Drag to swap with another ban, or drag hero here to replace)`
            : `${team} Ban Slot ${slotIdx + 1} (Drag hero here to ban, or click to select)`
        }
      >
        {/* Circular Avatar Container */}
        <div
          className={`relative h-full w-full rounded-full border overflow-hidden transition-all duration-150 flex items-center justify-center ${
            isBanDropTarget
              ? 'ring-2 ring-amber-400 scale-110 z-30 shadow-gold-glow'
              : isActive
              ? isBlue
                ? 'border-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.45)] ring-1 ring-sky-400/40'
                : 'border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.45)] ring-1 ring-rose-400/40'
              : hero
              ? isBlue
                ? 'border-sky-500/60 bg-slate-950 shadow-[0_0_4px_rgba(56,189,248,0.2)]'
                : 'border-rose-500/60 bg-slate-950 shadow-[0_0_4px_rgba(244,63,94,0.2)]'
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

      <SaveDraftModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />

      <DraftHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
      />

      <TacticalGuideModal
        isOpen={isTacticalGuideOpen}
        onClose={() => setIsTacticalGuideOpen(false)}
        activeMapTrait={mapTrait}
      />

      <CommandTray
        isOpen={isCommandTrayOpen}
        onClose={() => setIsCommandTrayOpen(false)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
        onOpenTacticalGuide={() => setIsTacticalGuideOpen(true)}
        onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
      />

      <header className="relative z-20 bg-transparent px-3 sm:px-6 lg:px-8 pt-0 pb-2">
        {/* Background Team Color Flow (Left Blue & Right Red seamlessly flowing in from screen edges) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Blue flow from left edge */}
          <div className="absolute left-0 inset-y-0 w-80 sm:w-96 bg-gradient-to-r from-blue-600/35 via-blue-900/15 to-transparent blur-sm" />
          <div className="absolute -left-8 -top-6 w-64 h-28 bg-blue-500/25 blur-2xl rounded-full" />

          {/* Red flow from right edge */}
          <div className="absolute right-0 inset-y-0 w-80 sm:w-96 bg-gradient-to-l from-rose-600/35 via-rose-900/15 to-transparent blur-sm" />
          <div className="absolute -right-8 -top-6 w-64 h-28 bg-rose-500/25 blur-2xl rounded-full" />
        </div>

        <div className="grid grid-cols-12 items-center gap-2">
          {/* Left: Blue Team 5 Quick Ban Chips */}
          <div className="col-span-12 sm:col-span-3 flex items-center justify-start relative">
            <div className="relative z-10 flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((idx) => renderBanChip('BLUE', idx))}
            </div>
          </div>

          {/* Center: Top Center Cluster with Swap on Left, App Title & Map in Center, Reset on Right */}
          <div className="col-span-12 sm:col-span-6 flex items-center justify-center gap-2 sm:gap-4 -mt-0.5">
            {/* Swap Sides Button (Left of top center) */}
            <button
              type="button"
              onClick={swapSides}
              className="h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full flex items-center justify-center border border-slate-800/80 bg-slate-950/70 backdrop-blur-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
              title="Swap sides between Your Team and Opponent"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>

            {/* Center Column: App Name (Stuck to top) + Phone Notification Pull Down Indicator + Map Trait Below */}
            <div className="flex flex-col items-center justify-start">
              {/* 1. App Title Pill (Sticking close to topmost, icon.png, down arrow underneath) */}
              <button
                type="button"
                onClick={() => setIsCommandTrayOpen((prev) => !prev)}
                className="group flex flex-col items-center justify-center px-3.5 py-0.5 rounded-b-xl border-x border-b border-slate-800/90 bg-slate-950/85 hover:bg-slate-900 hover:border-amber-400/50 transition-all cursor-pointer shadow-md select-none active:scale-95"
                title="Pull down Overhead Command Tray"
              >
                <div className="flex items-center gap-1.5">
                  <img
                    src="/icon.png"
                    alt="MLBB"
                    className="h-3.5 w-3.5 rounded-full object-cover shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/icon.png';
                    }}
                  />
                  <span className="font-hud font-bold uppercase tracking-wider text-[11px] sm:text-xs text-amber-400 group-hover:text-amber-300">
                    MLBB DRAFT COACH
                  </span>
                </div>
                {/* Phone-style Notification Pull Down Arrow */}
                <div className="flex items-center justify-center -mt-0.5">
                  <ChevronDown
                    className={`h-3 w-3 text-slate-400 group-hover:text-amber-400 transition-transform duration-300 ${
                      isCommandTrayOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </div>
              </button>

              {/* 2. Map Trait Dropdown: Centered below the App Name */}
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setIsMapDropdownOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-hud font-bold uppercase tracking-wider transition cursor-pointer select-none ${mapTheme.tagBg} ${mapTheme.glow} shadow-sm hover:border-amber-400/60`}
                  title={`Map Trait: ${mapConfig.name} — Click to change battlefield conditions`}
                >
                  <MapEffectIcon effect={mapTrait} className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {mapConfig.shortName}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 opacity-80 transition-transform duration-200 ${
                      isMapDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
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
            </div>

            {/* Reset Board Button (Right of top center) */}
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full flex items-center justify-center border border-slate-800/80 bg-slate-950/70 backdrop-blur-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
              title="Reset all picks and bans"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: Red Team 5 Quick Ban Chips */}
          <div className="col-span-12 sm:col-span-3 flex items-center justify-end relative">
            <div className="relative z-10 flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((idx) => renderBanChip('RED', idx))}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
