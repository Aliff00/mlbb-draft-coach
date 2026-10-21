import React, { useState } from 'react';
import {
  Check,
  Filter,
  Info,
  Search,
  ShieldAlert,
  Swords,
  X,
} from 'lucide-react';
import {
  ALL_HEROES,
  useDraftStore,
} from '../store/useDraftStore';
import {
  doesHeroMatchList,
  LaneRole,
  MAP_EFFECTS_CONFIG,
} from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { LaneIcon } from './LaneIcon';
import { getMapEffectColorTheme, MapEffectIcon } from './MapEffectIcon';
import { TacticalCoachPanel } from './TacticalCoachPanel';

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
    mapTrait,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
    selectedHero,
    roleFilter,
    laneFilter,
    searchQuery,
    mapSynergyOnly,
    placeHero,
    setRoleFilter,
    setLaneFilter,
    setSearchQuery,
  } = useDraftStore();

  const [sortOrder, setSortOrder] = useState<HeroSortOrder>('RELEASE_ASC');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];
  const mapTheme = getMapEffectColorTheme(mapTrait);
  const hasMapSynergies = mapTrait !== 'standard' && mapConfig.synergyHeroIds.length > 0;

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

  const activeInfoHero = selectedHero;

  return (
    <section className="flex flex-col h-full min-h-0 rounded-none bg-transparent gap-1.5 p-0">
      {/* Top Filter Bar: Search + Extended Full-Width Lanes + Sort Popover */}
      <div className="flex flex-col gap-1.5 pb-1 border-b border-slate-800/50 shrink-0">
        <div className="flex items-center gap-1.5 w-full">
          {/* Search Icon Toggle */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search heroes strictly by name"
            className={`h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-none flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
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

          {/* Filter / Sort Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              title="Filter & sort heroes"
              className={`h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-none flex items-center justify-center border transition-all cursor-pointer ${
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

      {/* Dense Circular Hero Avatar Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {filteredHeroes.map((hero) => {
            const isBanned =
              blueBans.some((b) => b?.id === hero.id) ||
              redBans.some((b) => b?.id === hero.id);
            const isPicked =
              bluePicks.some((p) => p?.id === hero.id) ||
              redPicks.some((p) => p?.id === hero.id);

            const isSelected = selectedHero?.id === hero.id;
            const disabled = isBanned || isPicked;

            return (
              <button
                key={hero.id}
                type="button"
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => {
                  if (disabled) return;
                  const payload = JSON.stringify({ type: 'HERO', hero });
                  e.dataTransfer.setData('application/json', payload);
                  e.dataTransfer.setData('text/plain', payload);
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                onClick={() => placeHero(hero)}
                className={`group relative flex flex-col items-center p-0.5 text-center transition-all duration-150 focus:outline-none ${
                  disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                }`}
                title={disabled ? undefined : `${hero.name} (Click or drag to pick / ban)`}
              >
                {/* Circular Hero Avatar */}
                <div
                  className={`relative aspect-square w-full max-w-[60px] sm:max-w-[68px] overflow-hidden rounded-full border transition-all duration-150 ${
                    isSelected
                      ? 'border-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)] scale-105 z-10'
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

                  {/* Disabled Status Overlay (Identical subtle darkened mask for both picked and banned) */}
                  {disabled && (
                    <div className="absolute inset-0 rounded-full bg-black/65 backdrop-blur-[0.5px] pointer-events-none" />
                  )}
                </div>

                {/* Hero Name Just Beneath the Circle */}
                <div className="mt-0.5 w-full text-center px-0.5">
                  <div
                    className={`truncate text-[9px] sm:text-[9.5px] font-semibold tracking-normal transition-colors ${
                      isSelected
                        ? 'text-amber-300 font-bold'
                        : disabled
                        ? 'text-slate-500/70'
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

      {/* Hero Intel Detail Drawer (Shown when a hero is clicked/selected) */}
      {activeInfoHero && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-amber-400/80 shadow-gold-glow">
              <HeroAvatar hero={activeInfoHero} variant="icon" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black tracking-wider text-amber-300 truncate">
                  {activeInfoHero.name}
                </span>
                {activeInfoHero.roles.map((r) => (
                  <span
                    key={String(r)}
                    className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-amber-200"
                  >
                    {r}
                  </span>
                ))}
                {(activeInfoHero.lanes || [activeInfoHero.lane]).map((l) => (
                  <span
                    key={String(l)}
                    className="inline-flex items-center gap-1 rounded bg-sky-500/20 border border-sky-500/40 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-sky-200"
                  >
                    <LaneIcon lane={l} className="h-3 w-3" />
                    <span>{l}</span>
                  </span>
                ))}
                {hasMapSynergies && doesHeroMatchList(activeInfoHero, mapConfig.synergyHeroIds) && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider ${mapTheme.tagBg} border shadow-sm`}
                    title={`${activeInfoHero.name} has synergy on ${mapConfig.name}: ${mapConfig.tacticalTip}`}
                  >
                    <MapEffectIcon effect={mapTrait} className="h-2.5 w-2.5" />
                    <span>{mapConfig.shortName} Synergy</span>
                  </span>
                )}
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                <span className="font-semibold text-slate-300">Specialty:</span> {activeInfoHero.specialty}
              </div>
            </div>
          </div>

          {/* Quick Counter & Synergy Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[9px]">
            {activeInfoHero.counters && activeInfoHero.counters.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-0.5 font-black uppercase tracking-wider text-emerald-400">
                  <Swords className="h-2.5 w-2.5" />
                  Counters:
                </span>
                <div className="flex items-center gap-1">
                  {activeInfoHero.counters.slice(0, 3).map((rel) => {
                    const targetHero = ALL_HEROES.find((h) => h.id === rel.id || h.slug === rel.slug);
                    return (
                      <button
                        key={`counter-${rel.id}`}
                        type="button"
                        onClick={() => targetHero && placeHero(targetHero)}
                        title={`Strong vs ${rel.name} — Click to assign`}
                        className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 pr-1.5 pl-0.5 py-0.5 text-[8px] font-bold text-emerald-200 hover:border-emerald-400 transition cursor-pointer"
                      >
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-3.5 w-3.5 rounded-full object-cover"
                        />
                        <span className="max-w-[50px] truncate">{rel.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeInfoHero.counteredBy && activeInfoHero.counteredBy.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-0.5 font-black uppercase tracking-wider text-rose-400">
                  <ShieldAlert className="h-2.5 w-2.5" />
                  Weak vs:
                </span>
                <div className="flex items-center gap-1">
                  {activeInfoHero.counteredBy.slice(0, 3).map((rel) => {
                    const targetHero = ALL_HEROES.find((h) => h.id === rel.id || h.slug === rel.slug);
                    return (
                      <button
                        key={`weak-${rel.id}`}
                        type="button"
                        onClick={() => targetHero && placeHero(targetHero)}
                        title={`Countered by ${rel.name} — Click to assign`}
                        className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-950/60 pr-1.5 pl-0.5 py-0.5 text-[8px] font-bold text-rose-200 hover:border-rose-400 transition cursor-pointer"
                      >
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-3.5 w-3.5 rounded-full object-cover"
                        />
                        <span className="max-w-[50px] truncate">{rel.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matchup Intel Popover */}
            {(activeInfoHero.counterTips?.counters ||
              activeInfoHero.counterTips?.counteredBy ||
              (activeInfoHero.skills && activeInfoHero.skills.length > 0)) && (
              <div className="relative group/intel">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 hover:border-amber-400 hover:text-amber-300 transition cursor-pointer"
                >
                  <Info className="h-3 w-3 text-amber-400" />
                  <span>Intel</span>
                </button>
                <div className="absolute bottom-full right-0 mb-2 w-80 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover/intel:opacity-100 group-hover/intel:pointer-events-auto transition-all duration-150 z-50 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <span className="text-xs font-black text-amber-300">
                      {activeInfoHero.name} Matchup Intel
                    </span>
                    {activeInfoHero.ratings && (
                      <span className="text-[9px] font-bold text-slate-400">
                        Diff: {activeInfoHero.ratings.difficulty}/100
                      </span>
                    )}
                  </div>
                  {activeInfoHero.counterTips?.counters && (
                    <p className="text-[10px] leading-relaxed text-emerald-300/90 mb-1.5">
                      <strong className="uppercase text-emerald-400">Strong Vs: </strong>
                      {activeInfoHero.counterTips.counters}
                    </p>
                  )}
                  {activeInfoHero.counterTips?.counteredBy && (
                    <p className="text-[10px] leading-relaxed text-rose-300/90 mb-1.5">
                      <strong className="uppercase text-rose-400">Countered By: </strong>
                      {activeInfoHero.counterTips.counteredBy}
                    </p>
                  )}
                  {activeInfoHero.skills && activeInfoHero.skills.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80">
                      <span className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                        Skills:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {activeInfoHero.skills.slice(0, 4).map((sk) => (
                          <span
                            key={sk.name}
                            title={sk.description}
                            className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[9px] text-slate-200 font-semibold"
                          >
                            {sk.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Tactical Composition & Coach Panel */}
      <div className="shrink-0">
        <TacticalCoachPanel />
      </div>
    </section>
  );
};
