import React, { useMemo } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { ALL_HEROES, useDraftStore } from '../store/useDraftStore';
import {
  DEDICATED_LANES,
  getHeroDamageType,
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
    userTeamSide,
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

  const userTeamEnum = userTeamSide === 'blue' ? 'BLUE' : 'RED';

  const userPicks = userTeamSide === 'blue' ? bluePicks : redPicks;
  const opponentPicks = userTeamSide === 'blue' ? redPicks : bluePicks;

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

  // Locked heroes for both perspectives
  const userLocked = useMemo(
    () => userPicks.filter(Boolean) as Hero[],
    [userPicks]
  );
  const opponentLocked = useMemo(
    () => opponentPicks.filter(Boolean) as Hero[],
    [opponentPicks]
  );

  // Determine which slot is currently targeted
  const activeSlotTarget = useMemo(() => {
    // 1. If activeSlot is explicitly selected on the board
    if (activeSlot?.type === 'PICK') {
      const laneConfig = DEDICATED_LANES[activeSlot.index] || DEDICATED_LANES[0];
      return {
        slotIndex: activeSlot.index,
        team: activeSlot.team,
        laneConfig,
        targetLane: laneConfig.lane,
        label: `${activeSlot.team} ${laneConfig.shortLabel}`,
      };
    }

    if (activeSlot?.type === 'BAN') {
      return {
        slotIndex: activeSlot.index,
        team: activeSlot.team,
        laneConfig: null,
        targetLane: null,
        label: `${activeSlot.team} BAN #${activeSlot.index + 1}`,
      };
    }

    // 2. Default: Find first empty slot on active team
    const targetTeam = userTeamEnum;
    const picks = targetTeam === 'BLUE' ? bluePicks : redPicks;
    const firstEmptyIdx = picks.findIndex((p) => p === null);
    if (firstEmptyIdx !== -1) {
      const laneConfig = DEDICATED_LANES[firstEmptyIdx];
      return {
        slotIndex: firstEmptyIdx,
        team: targetTeam,
        laneConfig,
        targetLane: laneConfig.lane,
        label: `${targetTeam} ${laneConfig.shortLabel}`,
      };
    }

    return {
      slotIndex: -1,
      team: targetTeam,
      laneConfig: null,
      targetLane: null,
      label: 'DRAFT INTEL',
    };
  }, [activeSlot, userTeamEnum, bluePicks, redPicks]);

  // Compute Targeted Enemy Counters (3-4 heroes) & Team Synergies (2-3 heroes) for YOUR TEAM
  const { topCounters, topSynergies } = useMemo(() => {
    const targetLane = activeSlotTarget.targetLane;

    // 1. Calculate Counters vs OPPONENT locked picks
    const counterScored: { hero: Hero; score: number; reason: string }[] = [];

    ALL_HEROES.forEach((h) => {
      if (unavailableHeroIds.has(h.id) || (h.slug && unavailableHeroIds.has(h.slug))) {
        return;
      }

      let score = 0;
      const counteredEnemyNames: string[] = [];

      opponentLocked.forEach((enemy) => {
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
        if (matchesLane) score += 25;
      }

      // Bonus for Map Trait synergy
      if (
        mapConfig.synergyHeroIds.includes(String(h.id).toLowerCase()) ||
        (h.slug && mapConfig.synergyHeroIds.includes(h.slug.toLowerCase()))
      ) {
        score += 5;
      }

      // Add baseline difficulty / rating
      if (h.ratings?.offense) score += h.ratings.offense / 30;

      if (score > 0) {
        counterScored.push({
          hero: h,
          score,
          reason:
            counteredEnemyNames.length > 0
              ? `Direct counter vs ${counteredEnemyNames.slice(0, 2).join(', ')}`
              : targetLane
              ? `Meta ${targetLane}`
              : 'Enemy Counter',
        });
      }
    });

    counterScored.sort((a, b) => b.score - a.score);
    // Display 3 to 4 clickable hero avatars
    const counters = counterScored.slice(0, 4);

    // 2. Calculate Synergies with YOUR TEAM locked picks
    const synergyScored: { hero: Hero; score: number; reason: string }[] = [];
    const usedCounterIds = new Set(counters.map((c) => String(c.hero.id)));

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

      userLocked.forEach((ally) => {
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
        if (matchesLane) score += 25;
      }

      // Bonus for Map Trait synergy
      if (
        mapConfig.synergyHeroIds.includes(String(h.id).toLowerCase()) ||
        (h.slug && mapConfig.synergyHeroIds.includes(h.slug.toLowerCase()))
      ) {
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
              ? `Balanced ${targetLane}`
              : 'Team Synergy',
        });
      }
    });

    synergyScored.sort((a, b) => b.score - a.score);
    // Display 2 to 3 clickable hero avatars
    const synergies = synergyScored.slice(0, 3);

    return {
      topCounters: counters,
      topSynergies: synergies,
    };
  }, [
    activeSlotTarget.targetLane,
    unavailableHeroIds,
    opponentLocked,
    userLocked,
    mapConfig,
  ]);

  // Compute YOUR TEAM Composition Health & Balance Metric
  const teamBalanceMetric = useMemo(() => {
    if (userLocked.length === 0) {
      return {
        physPct: 50,
        magPct: 50,
        warning: null,
      };
    }

    let physicalScore = 0;
    let magicScore = 0;
    let hasFrontline = false;
    let hasCC = false;

    userLocked.forEach((hero) => {
      const type = getHeroDamageType(hero);
      if (type === 'PHYSICAL') physicalScore += 1;
      else if (type === 'MAGIC') magicScore += 1;
      else {
        physicalScore += 0.5;
        magicScore += 0.5;
      }

      // Frontline check
      const isTank = hero.roles.includes('TANK');
      const isDurableFighter =
        hero.roles.includes('FIGHTER') && (hero.ratings?.durability ?? 0) >= 55;
      const isHighDurability = (hero.ratings?.durability ?? 0) >= 65;
      if (isTank || isDurableFighter || isHighDurability) {
        hasFrontline = true;
      }

      // CC check
      const hasHardCC = (hero.ratings?.control ?? 0) >= 60;
      const hasCCSpec =
        (hero.specialty || '').toLowerCase().includes('crowd control') ||
        (hero.specialty || '').toLowerCase().includes('control');
      if (hasHardCC || hasCCSpec || isTank) {
        hasCC = true;
      }
    });

    const total = physicalScore + magicScore || 1;
    const physPct = Math.round((physicalScore / total) * 100);
    const magPct = 100 - physPct;

    let warning: string | null = null;
    if (physPct >= 90 && userLocked.length >= 2) {
      warning = '90%+ Phys';
    } else if (magPct >= 90 && userLocked.length >= 2) {
      warning = '90%+ Mag';
    } else if (userLocked.length >= 3 && !hasFrontline) {
      warning = 'No Frontline';
    } else if (userLocked.length >= 3 && !hasCC) {
      warning = 'Low CC';
    }

    return {
      physPct,
      magPct,
      warning,
    };
  }, [userLocked]);

  // Helper to resolve HeroRelationItem to full Hero or fallback
  const resolveRelationHero = (rel: HeroRelationItem): Hero | null => {
    return (
      ALL_HEROES.find(
        (h) => String(h.id) === String(rel.id) || h.slug === rel.slug
      ) || null
    );
  };

  // Click-to-Draft Flow: Immediately place suggested hero into active slot or first empty slot on YOUR TEAM
  const handleHeroChipClick = (hero: Hero) => {
    // 1. If user has an active slot on YOUR TEAM
    if (activeSlot?.type === 'PICK' && activeSlot?.team === userTeamEnum) {
      placeHero(hero, activeSlot);
      return;
    }

    // 2. If targetSlot index is valid on the active team
    if (activeSlotTarget.slotIndex >= 0 && activeSlotTarget.team === userTeamEnum) {
      placeHero(hero, {
        type: 'PICK',
        team: userTeamEnum,
        index: activeSlotTarget.slotIndex,
      });
      return;
    }

    // 3. Fallback: Find the first empty slot on YOUR TEAM
    const firstEmptyIdx = userPicks.findIndex((p) => p === null);
    if (firstEmptyIdx !== -1) {
      placeHero(hero, {
        type: 'PICK',
        team: userTeamEnum,
        index: firstEmptyIdx,
      });
      return;
    }

    // 4. Default placeHero
    placeHero(hero);
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
                    title={`Strong vs ${rel.name} — Click to draft into ${activeSlotTarget.label}`}
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
                    title={`Countered by ${rel.name} — Click to draft into ${activeSlotTarget.label}`}
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
        /* STATE 1: SINGLE-PERSPECTIVE DRAFT RECOMMENDATIONS        */
        /* ========================================================= */
        <div className="flex items-center justify-between w-full min-w-0 gap-2 sm:gap-3 animate-fadeIn">
          {/* 1. Left Indicator: [ 🎯 {TEAM} {LANE} ] badge */}
          <div className="shrink-0 flex items-center">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-hud font-bold uppercase tracking-wider shadow-sm border ${
                activeSlotTarget.team === 'BLUE'
                  ? 'bg-blue-950/80 border-blue-500/60 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
              }`}
            >
              <Target className="h-3 w-3 shrink-0" />
              <span className="truncate">{activeSlotTarget.label}</span>
            </div>
          </div>

          {/* 2. Middle Cluster 1: ⚡ Targeted Enemy Counters (3-4 avatars) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-red-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
              <Zap className="h-3 w-3 fill-red-400/30 text-red-400 shrink-0" />
              <span className="hidden sm:inline">Counters:</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {topCounters.map(({ hero, reason }) => (
                <button
                  key={`rec-counter-${hero.id}`}
                  type="button"
                  onClick={() => handleHeroChipClick(hero)}
                  className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-red-500/50 hover:border-red-400 bg-slate-900 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-red-500/20"
                  title={`${hero.name} — ${reason} (Click to draft for ${activeSlotTarget.label})`}
                >
                  <HeroAvatar hero={hero} variant="icon" />
                  <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {topCounters.length === 0 && (
                <span className="text-slate-500 text-[10px] italic">Awaiting locks</span>
              )}
            </div>
          </div>

          {/* 3. Middle Cluster 2: 🤝 Targeted Team Synergies (2-3 avatars) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-cyan-400 font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Synergies:</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {topSynergies.map(({ hero, reason }) => (
                <button
                  key={`rec-synergy-${hero.id}`}
                  type="button"
                  onClick={() => handleHeroChipClick(hero)}
                  className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-cyan-500/50 hover:border-cyan-400 bg-slate-900 shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-cyan-500/20"
                  title={`${hero.name} — ${reason} (Click to draft for ${activeSlotTarget.label})`}
                >
                  <HeroAvatar hero={hero} variant="icon" />
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {topSynergies.length === 0 && (
                <span className="text-slate-500 text-[10px] italic">No locks</span>
              )}
            </div>
          </div>

          {/* 4. Right: Team Balance Metric [ 📊 COMP: {phys}% Phys / {mag}% Mag ] */}
          <div className="shrink-0 flex items-center">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-[11px] font-hud shadow-sm">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <BarChart2 className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="hidden xl:inline">COMP:</span>
              </span>
              <span className="font-semibold text-slate-200">
                {teamBalanceMetric.physPct}% Phys / {teamBalanceMetric.magPct}% Mag
              </span>
              {teamBalanceMetric.warning && (
                <span
                  className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold"
                  title={`Composition Warning: ${teamBalanceMetric.warning}`}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                  <span>{teamBalanceMetric.warning}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
