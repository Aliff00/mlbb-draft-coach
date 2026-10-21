import React, { useMemo } from 'react';
import {
  Crosshair,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { ALL_HEROES, useDraftStore } from '../store/useDraftStore';
import {
  DEDICATED_LANES,
  Hero,
  HeroRelationItem,
  MAP_EFFECTS_CONFIG,
} from '../types/draft';
import { HeroAvatar } from './HeroAvatar';

export interface TacticalIntelStripProps {
  className?: string;
}

export const TacticalIntelStrip: React.FC<TacticalIntelStripProps> = ({
  className = '',
}) => {
  const {
    activeSlot,
    bluePicks,
    redPicks,
    blueBans,
    redBans,
    mapTrait,
    placeHero,
    inspectedHero,
    setInspectedHero,
  } = useDraftStore();

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];

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

  // Compute Draft Recommendations for State 1
  const draftRecommendations = useMemo(() => {
    const isPickSlot = activeSlot?.type === 'PICK';
    const activeTeam = activeSlot?.team || 'BLUE';
    const activeIndex = activeSlot?.index ?? -1;

    const laneConfig =
      isPickSlot && activeIndex >= 0 && activeIndex < DEDICATED_LANES.length
        ? DEDICATED_LANES[activeIndex]
        : null;
    const targetLane = laneConfig?.lane;

    const enemyPicks = (activeTeam === 'BLUE' ? redPicks : bluePicks).filter(
      Boolean
    ) as Hero[];
    const allyPicks = (activeTeam === 'BLUE' ? bluePicks : redPicks).filter(
      Boolean
    ) as Hero[];

    // 1. Calculate Counters
    const counterScored: { hero: Hero; score: number; reason: string }[] = [];

    ALL_HEROES.forEach((h) => {
      if (unavailableHeroIds.has(h.id) || (h.slug && unavailableHeroIds.has(h.slug))) {
        return;
      }

      let score = 0;
      const counteredEnemyNames: string[] = [];

      // Check against enemy picked heroes
      enemyPicks.forEach((enemy) => {
        const isCounter =
          (enemy.counteredBy || []).some(
            (rel) => String(rel.id) === String(h.id) || rel.slug === h.slug
          ) ||
          (h.counters || []).some(
            (rel) => String(rel.id) === String(enemy.id) || rel.slug === enemy.slug
          );

        if (isCounter) {
          score += 15;
          counteredEnemyNames.push(enemy.name);
        }
      });

      // Bonus for lane match
      if (targetLane) {
        const matchesLane =
          (h.lanes && h.lanes.some((l) => String(l).toUpperCase() === targetLane)) ||
          h.lane.toUpperCase().includes(targetLane);
        if (matchesLane) score += 20;
      }

      // Bonus for Map Trait synergy
      if (mapConfig.synergyHeroIds.includes(String(h.id).toLowerCase()) || (h.slug && mapConfig.synergyHeroIds.includes(h.slug.toLowerCase()))) {
        score += 5;
      }

      // Add difficulty / tier baseline
      if (h.ratings?.offense) score += h.ratings.offense / 25;

      if (score > 0) {
        counterScored.push({
          hero: h,
          score,
          reason:
            counteredEnemyNames.length > 0
              ? `Strong vs ${counteredEnemyNames.slice(0, 2).join(', ')}`
              : targetLane
              ? `Meta ${targetLane}`
              : 'Counter Meta',
        });
      }
    });

    counterScored.sort((a, b) => b.score - a.score);
    const topCounters = counterScored.slice(0, 3);

    // 2. Calculate Synergies
    const synergyScored: { hero: Hero; score: number; reason: string }[] = [];
    const usedCounterIds = new Set(topCounters.map((c) => String(c.hero.id)));

    ALL_HEROES.forEach((h) => {
      if (
        unavailableHeroIds.has(h.id) ||
        (h.slug && unavailableHeroIds.has(h.slug)) ||
        usedCounterIds.has(String(h.id))
      ) {
        return;
      }

      let score = 0;
      const synergizedAllyNames: string[] = [];

      // Check against ally picked heroes
      allyPicks.forEach((ally) => {
        const isSynergy =
          (ally.synergies || []).some(
            (rel) => String(rel.id) === String(h.id) || rel.slug === h.slug
          ) ||
          (h.synergies || []).some(
            (rel) => String(rel.id) === String(ally.id) || rel.slug === ally.slug
          );

        if (isSynergy) {
          score += 15;
          synergizedAllyNames.push(ally.name);
        }
      });

      // Bonus for lane match
      if (targetLane) {
        const matchesLane =
          (h.lanes && h.lanes.some((l) => String(l).toUpperCase() === targetLane)) ||
          h.lane.toUpperCase().includes(targetLane);
        if (matchesLane) score += 20;
      }

      // Bonus for Map Trait synergy
      if (mapConfig.synergyHeroIds.includes(String(h.id).toLowerCase()) || (h.slug && mapConfig.synergyHeroIds.includes(h.slug.toLowerCase()))) {
        score += 5;
      }

      if (score > 0) {
        synergyScored.push({
          hero: h,
          score,
          reason:
            synergizedAllyNames.length > 0
              ? `Synergizes with ${synergizedAllyNames.slice(0, 2).join(', ')}`
              : targetLane
              ? `Strong ${targetLane}`
              : 'Team Synergy',
        });
      }
    });

    synergyScored.sort((a, b) => b.score - a.score);
    const topSynergies = synergyScored.slice(0, 3);

    return {
      laneConfig,
      activeTeam,
      isPickSlot,
      topCounters,
      topSynergies,
    };
  }, [activeSlot, bluePicks, redPicks, unavailableHeroIds, mapConfig]);

  // Helper to resolve HeroRelationItem to full Hero or fallback
  const resolveRelationHero = (rel: HeroRelationItem): Hero | null => {
    return (
      ALL_HEROES.find(
        (h) => String(h.id) === String(rel.id) || h.slug === rel.slug
      ) || null
    );
  };

  // Handle clicking an avatar chip
  const handleHeroChipClick = (hero: Hero) => {
    // If board has an active slot, place the hero
    if (activeSlot) {
      placeHero(hero);
    } else {
      // If no slot is active, inspect this hero
      setInspectedHero(hero);
    }
  };

  return (
    <div
      className={`h-14 sm:h-16 shrink-0 w-full bg-slate-950/70 border-t border-slate-800/80 px-3 sm:px-4 flex items-center justify-between text-xs select-none backdrop-blur-sm z-10 ${className}`}
    >
      {/* ========================================================= */}
      {/* STATE 2: HERO QUICK-INSPECT                                */}
      {/* ========================================================= */}
      {inspectedHero ? (
        <div className="flex items-center justify-between w-full min-w-0 gap-2 sm:gap-4 animate-fadeIn">
          {/* Left: Inspected Hero Avatar & Name */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)] shrink-0">
              <HeroAvatar hero={inspectedHero} variant="icon" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-hud font-bold text-amber-300 text-xs sm:text-[13px] tracking-wide truncate max-w-[85px] sm:max-w-[120px]">
                {inspectedHero.name}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                {inspectedHero.lane || inspectedHero.role}
              </span>
            </div>
          </div>

          {/* Middle Cluster 1: 🟢 Strong Against (Counters) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-emerald-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="hidden sm:inline">Strong Against:</span>
              <span className="sm:hidden">Strong:</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {(inspectedHero.counters || []).slice(0, 3).map((rel) => {
                const targetHero = resolveRelationHero(rel);
                return (
                  <button
                    key={`strong-${rel.id}`}
                    type="button"
                    onClick={() => targetHero && handleHeroChipClick(targetHero)}
                    className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-emerald-500/50 hover:border-emerald-400 bg-slate-900 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                    title={`Strong vs ${rel.name} ${activeSlot ? '— Click to draft' : '— Click to inspect'}`}
                  >
                    <img
                      src={rel.avatar}
                      alt={rel.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
              {(!inspectedHero.counters || inspectedHero.counters.length === 0) && (
                <span className="text-slate-500 text-[10px] italic">None listed</span>
              )}
            </div>
          </div>

          {/* Middle Cluster 2: 🔴 Weak Against (Countered By) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-rose-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              <span className="hidden sm:inline">Weak Against:</span>
              <span className="sm:hidden">Weak:</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {(inspectedHero.counteredBy || []).slice(0, 3).map((rel) => {
                const targetHero = resolveRelationHero(rel);
                return (
                  <button
                    key={`weak-${rel.id}`}
                    type="button"
                    onClick={() => targetHero && handleHeroChipClick(targetHero)}
                    className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-rose-500/50 hover:border-rose-400 bg-slate-900 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                    title={`Countered by ${rel.name} ${activeSlot ? '— Click to draft' : '— Click to inspect'}`}
                  >
                    <img
                      src={rel.avatar}
                      alt={rel.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
              {(!inspectedHero.counteredBy || inspectedHero.counteredBy.length === 0) && (
                <span className="text-slate-500 text-[10px] italic">None listed</span>
              )}
            </div>
          </div>

          {/* Right: Close / Dismiss Button returning to State 1 */}
          <button
            type="button"
            onClick={() => setInspectedHero(null)}
            className="h-7 w-7 rounded-full border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-1 active:scale-95"
            title="Dismiss quick inspect (Return to draft recommendations)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* ========================================================= */
        /* STATE 1: DRAFT RECOMMENDATIONS (DEFAULT)                  */
        /* ========================================================= */
        <div className="flex items-center justify-between w-full min-w-0 gap-2 sm:gap-4 animate-fadeIn">
          {/* Left Indicator: [ 🎯 {Team} {Lane} ] badge */}
          <div className="shrink-0 flex items-center">
            {draftRecommendations.isPickSlot && draftRecommendations.laneConfig ? (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-hud font-bold uppercase tracking-wider shadow-sm border ${
                  draftRecommendations.activeTeam === 'BLUE'
                    ? 'bg-blue-950/70 border-blue-500/60 text-blue-300'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-300'
                }`}
              >
                <Target className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {draftRecommendations.activeTeam} {draftRecommendations.laneConfig.shortLabel}
                </span>
              </div>
            ) : activeSlot?.type === 'BAN' ? (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-hud font-bold uppercase tracking-wider shadow-sm border ${
                  activeSlot.team === 'BLUE'
                    ? 'bg-blue-950/70 border-blue-500/60 text-blue-300'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-300'
                }`}
              >
                <Crosshair className="h-3 w-3 shrink-0" />
                <span>{activeSlot.team} BAN #{activeSlot.index + 1}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-hud font-bold uppercase tracking-wider bg-slate-900/90 border border-slate-700/80 text-amber-300 shadow-sm">
                <Target className="h-3 w-3 text-amber-400 shrink-0" />
                <span>TACTICAL INTEL</span>
              </div>
            )}
          </div>

          {/* Middle Cluster 1: ⚡ Counters */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-red-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
              <Zap className="h-3 w-3 fill-red-400/30 text-red-400 shrink-0" />
              <span>Counters:</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {draftRecommendations.topCounters.map(({ hero, reason }) => (
                <button
                  key={`rec-counter-${hero.id}`}
                  type="button"
                  onClick={() => handleHeroChipClick(hero)}
                  className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-red-500/50 hover:border-red-400 bg-slate-900 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-red-500/20"
                  title={`${hero.name} — ${reason} (Click to draft)`}
                >
                  <HeroAvatar hero={hero} variant="icon" />
                  <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {draftRecommendations.topCounters.length === 0 && (
                <span className="text-slate-500 text-[10px] italic">Awaiting lock</span>
              )}
            </div>
          </div>

          {/* Middle Cluster 2: 🤝 Synergies */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-cyan-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>Synergies:</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {draftRecommendations.topSynergies.map(({ hero, reason }) => (
                <button
                  key={`rec-synergy-${hero.id}`}
                  type="button"
                  onClick={() => handleHeroChipClick(hero)}
                  className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-cyan-500/50 hover:border-cyan-400 bg-slate-900 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-cyan-500/20"
                  title={`${hero.name} — ${reason} (Click to draft)`}
                >
                  <HeroAvatar hero={hero} variant="icon" />
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {draftRecommendations.topSynergies.length === 0 && (
                <span className="text-slate-500 text-[10px] italic">No active locks</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
