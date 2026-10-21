import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Check,
  Filter,
  Search,
  X,
} from 'lucide-react';
import {
  ALL_HEROES,
  useDraftStore,
} from '../store/useDraftStore';
import {
  DEDICATED_LANES,
  doesHeroMatchList,
  Hero,
  HeroRelationItem,
  LaneRole,
  MAP_EFFECTS_CONFIG,
} from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { LaneIcon } from './LaneIcon';
import { TacticalCoachPanel } from './TacticalCoachPanel';
import { TacticalIntelStrip } from './TacticalIntelStrip';
import { setCustomHeroDragImage } from '../utils/dragGhost';

export type HeroSortOrder =
  | 'RELEASE_ASC'
  | 'RELEASE_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC';

const LANE_TABS: Array<{
  id: 'ALL' | LaneRole;
  label: string;
  lane: LaneRole | 'ALL';
}> = [
  { id: 'ALL', label: 'All Lanes', lane: 'ALL' },
  { id: 'EXP', label: 'Exp Lane', lane: 'EXP' },
  { id: 'GOLD', label: 'Gold Lane', lane: 'GOLD' },
  { id: 'MID', label: 'Mid Lane', lane: 'MID' },
  { id: 'ROAM', label: 'Roaming', lane: 'ROAM' },
  { id: 'JUNGLE', label: 'Jungling', lane: 'JUNGLE' },
];

export const HeroGrid: React.FC = () => {
  const {
    activeSlot,
    userTeamSide,
    mapTrait,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    selectedHero,
    inspectedHero,
    setInspectedHero,
    roleFilter,
    laneFilter,
    searchQuery,
    mapSynergyOnly,
    placeHero,
    setRoleFilter,
    setLaneFilter,
    setSearchQuery,
    setDraggedHero,
    setDraggedSlot,
  } = useDraftStore();

  const [sortOrder, setSortOrder] = useState<HeroSortOrder>('RELEASE_ASC');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Smoothly reset scroll to top whenever filters change, preventing disoriented offsets
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [laneFilter, roleFilter, searchQuery]);

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];

  const filteredHeroes = ALL_HEROES.filter((hero) => {
    const matchesRole =
      roleFilter === 'ALL' ||
      hero.roles.some((r) => String(r).toUpperCase() === roleFilter);
    const matchesLane =
      laneFilter === 'ALL' ||
      (hero.lanes &&
        hero.lanes.some((l) => String(l).toUpperCase() === laneFilter)) ||
      hero.lane.toUpperCase().includes(laneFilter);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || hero.name.toLowerCase().includes(q);

    const matchesTactical =
      !mapSynergyOnly ||
      mapTrait === 'standard' ||
      doesHeroMatchList(hero, mapConfig.synergyHeroIds);

    return matchesRole && matchesLane && matchesSearch && matchesTactical;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'RELEASE_ASC':
        return Number(a.id) - Number(b.id);
      case 'RELEASE_DESC':
        return Number(b.id) - Number(a.id);
      case 'NAME_ASC':
        return a.name.localeCompare(b.name);
      case 'NAME_DESC':
        return b.name.localeCompare(a.name);
      default:
        return Number(a.id) - Number(b.id);
    }
  });

  // Set of all unavailable heroes (banned or picked on either team)
  const unavailableHeroIds = useMemo(() => {
    const set = new Set<string | number>();
    [...bluePicks, ...redPicks, ...blueBans, ...redBans].forEach((h) => {
      if (h) {
        set.add(h.id);
        set.add(String(h.id));
        if (h.slug) set.add(h.slug);
      }
    });
    return set;
  }, [bluePicks, redPicks, blueBans, redBans]);

  // Compute top recommended counter & synergy hero IDs for YOUR TEAM's active/empty lane
  const { topCounterHeroIds, topSynergyHeroIds } = useMemo(() => {
    const userTeamEnum = userTeamSide === 'blue' ? 'BLUE' : 'RED';
    const userPicks = userTeamSide === 'blue' ? bluePicks : redPicks;
    const opponentPicks = userTeamSide === 'blue' ? redPicks : bluePicks;

    const isUserPickSlot = activeSlot?.type === 'PICK' && activeSlot?.team === userTeamEnum;
    const targetLane = isUserPickSlot
      ? DEDICATED_LANES[activeSlot.index]?.lane
      : DEDICATED_LANES[userPicks.findIndex((p) => p === null)]?.lane;

    const enemyPicks = opponentPicks.filter(Boolean) as Hero[];
    const allyPicks = userPicks.filter(Boolean) as Hero[];

    const counterScored: { id: string | number; score: number }[] = [];
    const synergyScored: { id: string | number; score: number }[] = [];

    ALL_HEROES.forEach((h) => {
      if (unavailableHeroIds.has(h.id) || (h.slug && unavailableHeroIds.has(h.slug))) return;

      let cScore = 0;
      enemyPicks.forEach((enemy) => {
        const isCounter =
          (enemy.counteredBy || []).some(
            (rel: HeroRelationItem) => String(rel.id) === String(h.id) || rel.slug === h.slug
          ) ||
          (h.counters || []).some(
            (rel: HeroRelationItem) => String(rel.id) === String(enemy.id) || rel.slug === enemy.slug
          );
        if (isCounter) cScore += 15;
      });
      if (targetLane) {
        const matchesLane =
          (h.lanes && h.lanes.some((l) => String(l).toUpperCase() === targetLane)) ||
          h.lane.toUpperCase().includes(targetLane);
        if (matchesLane) cScore += 20;
      }
      if (cScore > 0) counterScored.push({ id: h.id, score: cScore });

      let sScore = 0;
      allyPicks.forEach((ally) => {
        const isSynergy =
          (ally.synergies || []).some(
            (rel: HeroRelationItem) => String(rel.id) === String(h.id) || rel.slug === h.slug
          ) ||
          (h.synergies || []).some(
            (rel: HeroRelationItem) => String(rel.id) === String(ally.id) || rel.slug === ally.slug
          );
        if (isSynergy) sScore += 15;
      });
      if (targetLane) {
        const matchesLane =
          (h.lanes && h.lanes.some((l) => String(l).toUpperCase() === targetLane)) ||
          h.lane.toUpperCase().includes(targetLane);
        if (matchesLane) sScore += 20;
      }
      if (sScore > 0) synergyScored.push({ id: h.id, score: sScore });
    });

    counterScored.sort((a, b) => b.score - a.score);
    synergyScored.sort((a, b) => b.score - a.score);

    return {
      topCounterHeroIds: new Set(counterScored.slice(0, 3).map((c) => String(c.id))),
      topSynergyHeroIds: new Set(synergyScored.slice(0, 3).map((s) => String(s.id))),
    };
  }, [activeSlot, bluePicks, redPicks, unavailableHeroIds]);

  return (
    <section className="flex flex-col h-full min-h-0 rounded-none bg-transparent gap-1.5 p-0">
      {/* Top Filter Bar: Search + Extended Full-Width Lanes + Sort Popover */}
      <div className="flex flex-col gap-1.5 pb-1 border-b border-slate-800/50 shrink-0">
        <div className="flex items-center gap-1.5 w-full">
          {/* Search Icon Toggle (Round Container) */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search heroes strictly by name"
            className={`h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
              isSearchOpen || searchQuery
                ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white border-slate-700 shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)]'
                : 'bg-slate-950/70 backdrop-blur-sm text-slate-400 border-slate-800/80 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          {/* Extended Full-Width Lanes (Seamless, Sharp, Subtle White Bottom-to-Top Gradient) */}
          <div className="flex-1 flex items-stretch gap-0 w-full min-w-0 border border-slate-800/80 bg-slate-950/70 divide-x divide-slate-800/80 rounded-none overflow-hidden">
            {LANE_TABS.map((tab) => {
              const active = laneFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLaneFilter(tab.id)}
                  className={`flex-1 min-w-0 h-7 sm:h-7.5 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-none px-1 font-hud font-bold text-[9px] sm:text-[9.5px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white font-black shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)]'
                      : 'bg-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <LaneIcon
                    lane={tab.lane}
                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
                  />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter / Sort Popover (Round Container) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              title="Filter & sort heroes"
              className={`h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isFilterOpen || sortOrder !== 'RELEASE_ASC' || roleFilter !== 'ALL'
                  ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white border-slate-700 shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)]'
                  : 'bg-slate-950/70 backdrop-blur-sm text-slate-400 border-slate-800/80 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
            </button>

            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-none border border-slate-700/80 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md z-50 text-left">
                  <div className="text-[10px] font-hud font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                    <span>Order / Sorting</span>
                    <span className="text-[9px] text-white font-hud">
                      {sortOrder === 'RELEASE_ASC' ? 'Default' : 'Active'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 py-2 font-hud">
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('RELEASE_ASC');
                        setIsFilterOpen(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-none text-xs font-bold transition text-left cursor-pointer ${
                        sortOrder === 'RELEASE_ASC'
                          ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white font-black shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)] border-b border-white/30'
                          : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span>Release Date (Ascending)</span>
                      {sortOrder === 'RELEASE_ASC' && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('RELEASE_DESC');
                        setIsFilterOpen(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-none text-xs font-bold transition text-left cursor-pointer ${
                        sortOrder === 'RELEASE_DESC'
                          ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white font-black shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)] border-b border-white/30'
                          : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span>Release Date (Descending)</span>
                      {sortOrder === 'RELEASE_DESC' && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('NAME_ASC');
                        setIsFilterOpen(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-none text-xs font-bold transition text-left cursor-pointer ${
                        sortOrder === 'NAME_ASC'
                          ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white font-black shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)] border-b border-white/30'
                          : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span>Hero Name (A → Z)</span>
                      {sortOrder === 'NAME_ASC' && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('NAME_DESC');
                        setIsFilterOpen(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-none text-xs font-bold transition text-left cursor-pointer ${
                        sortOrder === 'NAME_DESC'
                          ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white font-black shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)] border-b border-white/30'
                          : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span>Hero Name (Z → A)</span>
                      {sortOrder === 'NAME_DESC' && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>
                  </div>

                  {/* Class Filter */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-hud font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Filter by Class
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-hud">
                      {['ALL', 'TANK', 'FIGHTER', 'ASSASSIN', 'MAGE', 'MARKSMAN', 'SUPPORT'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRoleFilter(r as any)}
                          className={`px-1.5 py-1 rounded-none text-center font-bold uppercase transition cursor-pointer ${
                            roleFilter === r
                              ? 'bg-gradient-to-t from-white/20 via-white/5 to-transparent text-white font-black shadow-[inset_0_-2px_0_rgba(255,255,255,0.75)] border border-white/30'
                              : 'bg-slate-900 text-slate-400 hover:bg-white/[0.04] hover:text-white border border-slate-800'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expandable Search Input */}
        {(isSearchOpen || searchQuery) && (
          <div className="relative w-full pt-0.5 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hero strictly by name..."
                autoFocus
                className="w-full rounded-none border border-slate-700/80 bg-slate-950/90 pl-8 pr-7 py-1 text-xs text-white placeholder-slate-400 focus:border-white/60 focus:bg-white/[0.03] focus:outline-none font-body shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="text-[10px] font-hud font-bold uppercase tracking-wider text-slate-400 hover:text-white px-2 py-1 rounded-none bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-white/[0.04] cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Dense Circular Hero Avatar Grid with Stable Reserved Scrollbar Gutter */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto pr-1"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {filteredHeroes.map((hero) => {
            const isBanned =
              blueBans.some((b) => b?.id === hero.id) ||
              redBans.some((b) => b?.id === hero.id);
            const isPicked =
              bluePicks.some((p) => p?.id === hero.id) ||
              redPicks.some((p) => p?.id === hero.id);

            const isSelected = selectedHero?.id === hero.id;
            const isInspected = inspectedHero?.id === hero.id;
            const isCounterRec = topCounterHeroIds.has(String(hero.id));
            const isSynergyRec = topSynergyHeroIds.has(String(hero.id));
            const disabled = isBanned || isPicked;

            return (
              <button
                key={hero.id}
                type="button"
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => {
                  if (disabled) return;
                  setDraggedHero(hero);
                  setDraggedSlot(null);
                  const payload = JSON.stringify({ type: 'HERO', hero });
                  e.dataTransfer.setData('application/json', payload);
                  e.dataTransfer.setData('text/plain', payload);
                  e.dataTransfer.effectAllowed = 'copyMove';
                  setCustomHeroDragImage(e);
                }}
                onDragEnd={() => {
                  setDraggedHero(null);
                  setDraggedSlot(null);
                }}
                onClick={() => {
                  if (disabled) return;
                  if (!activeSlot) {
                    setInspectedHero(hero);
                  } else {
                    placeHero(hero);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInspectedHero(hero);
                }}
                className={`group relative flex flex-col items-center p-0.5 text-center transition-all duration-150 focus:outline-none ${
                  disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                {/* Circular Hero Avatar */}
                <div
                  className={`relative aspect-square w-full max-w-[60px] sm:max-w-[68px] overflow-hidden rounded-full border transition-all duration-150 ${
                    isInspected
                      ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-105 z-20'
                      : isSelected
                      ? 'border-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)] scale-105 z-10'
                      : isCounterRec && !disabled
                      ? 'border-red-500/80 ring-1 ring-red-500/50 shadow-[0_0_6px_rgba(239,68,68,0.3)] bg-slate-900/60 hover:scale-105'
                      : isSynergyRec && !disabled
                      ? 'border-cyan-400/80 ring-1 ring-cyan-400/50 shadow-[0_0_6px_rgba(34,211,238,0.3)] bg-slate-900/60 hover:scale-105'
                      : disabled
                      ? 'border-slate-900/60 opacity-30 brightness-75 cursor-not-allowed'
                      : 'border-slate-700/70 bg-slate-900/60 hover:border-amber-400/80 hover:scale-105 hover:shadow-[0_0_6px_rgba(234,179,8,0.25)]'
                  }`}
                >
                  <HeroAvatar
                    hero={hero}
                    variant="icon"
                    grayscale={disabled}
                    className={disabled ? '' : 'group-hover:scale-110 transition-transform duration-200'}
                  />

                  {/* Recommendation Dot Badges for Top Counter & Synergy */}
                  {isCounterRec && !disabled && (
                    <span
                      className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] ring-1 ring-white/80 pointer-events-none z-20"
                      title="Counter Recommendation for active lane"
                    />
                  )}
                  {isSynergyRec && !isCounterRec && !disabled && (
                    <span
                      className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)] ring-1 ring-white/80 pointer-events-none z-20"
                      title="Synergy Recommendation for active lane"
                    />
                  )}

                  {/* Disabled Status Overlay (Identical subtle darkened mask for both picked and banned) */}
                  {disabled && (
                    <div className="absolute inset-0 rounded-full bg-black/65 backdrop-blur-[0.5px] pointer-events-none" />
                  )}
                </div>

                {/* Hero Name Just Beneath the Circle */}
                <div className="mt-0.5 w-full text-center px-0.5">
                  <div
                    className={`truncate text-[9px] sm:text-[9.5px] font-semibold tracking-normal transition-colors ${
                      isInspected
                        ? 'text-amber-300 font-bold'
                        : isSelected
                        ? 'text-amber-300 font-bold'
                        : disabled
                        ? 'text-slate-500/70'
                        : isCounterRec
                        ? 'text-red-300 font-bold'
                        : isSynergyRec
                        ? 'text-cyan-300 font-bold'
                        : 'text-[#8ea5c8] group-hover:text-sky-200'
                    }`}
                  >
                    {hero.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tactical Intel Strip (Mounted directly beneath the hero roster grid) */}
      <TacticalIntelStrip />

      {/* Live Tactical Composition & Coach Panel */}
      <div className="shrink-0">
        <TacticalCoachPanel />
      </div>
    </section>
  );
};
