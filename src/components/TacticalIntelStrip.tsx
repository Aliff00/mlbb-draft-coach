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
  ActiveBoardSlot,
  DEDICATED_LANES,
  getHeroDamageType,
  Hero,
  HeroRelationItem,
  MAP_EFFECTS_CONFIG,
} from '../types/draft';
import metaHeroes from '../data/mlbb-meta.json';
import { HeroAvatar } from './HeroAvatar';

export interface TacticalIntelStripProps {
  className?: string;
}

interface RecommendedChip {
  hero: Hero;
  score: number;
  tooltip: string;
  targetHeroName?: string;
}

export const TacticalIntelStrip: React.FC<TacticalIntelStripProps> = ({
  className = '',
}) => {
  const {
    activeSlot,
    setActiveSlot,
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

  // Locked heroes for both teams
  const userLocked = useMemo(
    () => userPicks.filter(Boolean) as Hero[],
    [userPicks]
  );
  const opponentLocked = useMemo(
    () => opponentPicks.filter(Boolean) as Hero[],
    [opponentPicks]
  );

  // Determine active slot target on YOUR TEAM
  const activeSlotTarget = useMemo(() => {
    // 1. If user explicitly clicked a PICK slot on YOUR TEAM
    if (activeSlot?.type === 'PICK' && activeSlot?.team === userTeamEnum) {
      const laneConfig = DEDICATED_LANES[activeSlot.index] || DEDICATED_LANES[0];
      return {
        slotIndex: activeSlot.index,
        team: userTeamEnum,
        laneConfig,
        targetLane: laneConfig.lane,
        label: `YOUR ${laneConfig.shortLabel} PICK`,
      };
    }

    // 2. Default: Find the first empty slot on YOUR TEAM
    const firstEmptyIdx = userPicks.findIndex((p) => p === null);
    if (firstEmptyIdx !== -1) {
      const laneConfig = DEDICATED_LANES[firstEmptyIdx];
      return {
        slotIndex: firstEmptyIdx,
        team: userTeamEnum,
        laneConfig,
        targetLane: laneConfig.lane,
        label: `YOUR ${laneConfig.shortLabel} PICK`,
      };
    }

    // 3. Fallback: If YOUR TEAM is completely filled, target last slot
    const lastLaneConfig = DEDICATED_LANES[4];
    return {
      slotIndex: 4,
      team: userTeamEnum,
      laneConfig: lastLaneConfig,
      targetLane: lastLaneConfig.lane,
      label: 'YOUR TEAM (FULL)',
    };
  }, [activeSlot, userTeamEnum, userPicks]);

  // Fast ID / slug lookup maps for heroes & meta telemetry
  const { metaById, heroById } = useMemo(() => {
    const mById = new Map<number, (typeof metaHeroes)[number]>();
    metaHeroes.forEach((m) => mById.set(m.id, m));

    const hById = new Map<number, Hero>();
    ALL_HEROES.forEach((h) => hById.set(Number(h.id), h));

    return { metaById: mById, heroById: hById };
  }, []);

  // Compute Dynamic Recommendations from mlbb-meta.json
  const { topCounters, topSynergies } = useMemo(() => {
    const targetLane = activeSlotTarget.targetLane;

    // -------------------------------------------------------------
    // 1. Calculate Top Counter-Picks vs Opponent Locked Heroes
    // -------------------------------------------------------------
    const counterCandidates: RecommendedChip[] = [];

    metaHeroes.forEach((candidateMeta) => {
      if (
        unavailableHeroIds.has(candidateMeta.id) ||
        (candidateMeta.slug && unavailableHeroIds.has(candidateMeta.slug))
      ) {
        return;
      }

      const fullHero = heroById.get(candidateMeta.id);
      if (!fullHero) return;

      const matchesLane =
        !targetLane ||
        (candidateMeta.lanes &&
          candidateMeta.lanes.some(
            (l) => l.toUpperCase() === targetLane.toUpperCase()
          ));

      let counterScore = 0;
      let primaryTooltip = '';
      let bestEffectiveWr = 0;
      let matchedEnemyName = '';

      if (opponentLocked.length > 0) {
        opponentLocked.forEach((enemy) => {
          const enemyId = Number(enemy.id);
          const enemyMeta = metaById.get(enemyId);

          // Check if candidate's best_counters includes this enemy
          const matchInCandidate = (candidateMeta.best_counters || []).find(
            (b) => b.id === enemyId || b.slug === enemy.slug
          );
          // Check if enemy's countered_by includes candidate
          const matchInEnemy = (enemyMeta?.countered_by || []).find(
            (b) => b.id === candidateMeta.id || b.slug === candidateMeta.slug
          );

          const delta = matchInCandidate?.counter_score ?? matchInEnemy?.counter_score;
          if (delta) {
            counterScore += delta;
            const estWr = Math.round(candidateMeta.win_rate + delta);
            if (estWr > bestEffectiveWr) {
              bestEffectiveWr = estWr;
              matchedEnemyName = enemy.name;
              primaryTooltip = `Counters ${enemy.name} (${estWr}% WR)`;
            }
          }
        });
      }

      // Bonus for fitting the targeted lane
      if (matchesLane) {
        counterScore += 25;
      }

      // Bonus for Map Trait synergy
      if (
        mapConfig.synergyHeroIds.includes(String(candidateMeta.id)) ||
        (candidateMeta.slug && mapConfig.synergyHeroIds.includes(candidateMeta.slug))
      ) {
        counterScore += 5;
      }

      // Baseline rank win rate weight
      counterScore += (candidateMeta.win_rate || 50) / 10;

      // Include if it matches the lane or counters an enemy
      if (counterScore > 0 && (matchesLane || bestEffectiveWr > 0)) {
        counterCandidates.push({
          hero: fullHero,
          score: counterScore,
          targetHeroName: matchedEnemyName,
          tooltip:
            primaryTooltip ||
            (targetLane
              ? `Meta ${targetLane} (${candidateMeta.win_rate}% WR)`
              : `High-Tier Meta (${candidateMeta.win_rate}% WR)`),
        });
      }
    });

    // Prioritize lane matches first, then counter score
    counterCandidates.sort((a, b) => b.score - a.score);
    const counters = counterCandidates.slice(0, 4);

    // -------------------------------------------------------------
    // 2. Calculate Top Synergies with Friendly Locked Heroes
    // -------------------------------------------------------------
    const synergyCandidates: RecommendedChip[] = [];
    const usedCounterIds = new Set(counters.map((c) => String(c.hero.id)));

    metaHeroes.forEach((candidateMeta) => {
      if (
        unavailableHeroIds.has(candidateMeta.id) ||
        (candidateMeta.slug && unavailableHeroIds.has(candidateMeta.slug)) ||
        usedCounterIds.has(String(candidateMeta.id))
      ) {
        return;
      }

      const fullHero = heroById.get(candidateMeta.id);
      if (!fullHero) return;

      const matchesLane =
        !targetLane ||
        (candidateMeta.lanes &&
          candidateMeta.lanes.some(
            (l) => l.toUpperCase() === targetLane.toUpperCase()
          ));

      let synergyScore = 0;
      let primaryTooltip = '';
      let bestEffectiveWr = 0;
      let matchedAllyName = '';

      if (userLocked.length > 0) {
        userLocked.forEach((ally) => {
          const allyId = Number(ally.id);
          const allyMeta = metaById.get(allyId);

          const matchInCandidate = (candidateMeta.synergies || []).find(
            (s) => s.id === allyId || s.slug === ally.slug
          );
          const matchInAlly = (allyMeta?.synergies || []).find(
            (s) => s.id === candidateMeta.id || s.slug === candidateMeta.slug
          );

          const delta = matchInCandidate?.synergy_score ?? matchInAlly?.synergy_score;
          if (delta) {
            synergyScore += delta;
            const estWr = Math.round(candidateMeta.win_rate + delta);
            if (estWr > bestEffectiveWr) {
              bestEffectiveWr = estWr;
              matchedAllyName = ally.name;
              primaryTooltip = `Synergy with ${ally.name} (${estWr}% WR)`;
            }
          }
        });
      }

      if (matchesLane) {
        synergyScore += 25;
      }

      if (
        mapConfig.synergyHeroIds.includes(String(candidateMeta.id)) ||
        (candidateMeta.slug && mapConfig.synergyHeroIds.includes(candidateMeta.slug))
      ) {
        synergyScore += 5;
      }

      synergyScore += (candidateMeta.win_rate || 50) / 10;

      if (synergyScore > 0 && (matchesLane || bestEffectiveWr > 0)) {
        synergyCandidates.push({
          hero: fullHero,
          score: synergyScore,
          targetHeroName: matchedAllyName,
          tooltip:
            primaryTooltip ||
            (targetLane
              ? `Meta ${targetLane} (${candidateMeta.win_rate}% WR)`
              : `Team Fit (${candidateMeta.win_rate}% WR)`),
        });
      }
    });

    synergyCandidates.sort((a, b) => b.score - a.score);
    const synergies = synergyCandidates.slice(0, 3);

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
    metaById,
    heroById,
  ]);

  // Compute YOUR TEAM Composition Health & Damage Balance
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

      const isTank = hero.roles.includes('TANK');
      const isDurableFighter =
        hero.roles.includes('FIGHTER') && (hero.ratings?.durability ?? 0) >= 55;
      const isHighDurability = (hero.ratings?.durability ?? 0) >= 65;
      if (isTank || isDurableFighter || isHighDurability) {
        hasFrontline = true;
      }

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

  // Helper to resolve HeroRelationItem to full Hero
  const resolveRelationHero = (rel: HeroRelationItem): Hero | null => {
    return (
      ALL_HEROES.find(
        (h) => String(h.id) === String(rel.id) || h.slug === rel.slug
      ) || null
    );
  };

  // Click-to-Draft Flow: Immediately place suggested hero into active lane slot
  const handleHeroChipClick = (hero: Hero) => {
    const target: ActiveBoardSlot =
      activeSlot?.type === 'PICK' && activeSlot?.team === userTeamEnum
        ? activeSlot
        : {
            type: 'PICK',
            team: userTeamEnum,
            index: activeSlotTarget.slotIndex >= 0 ? activeSlotTarget.slotIndex : 0,
          };

    placeHero(hero, target);

    // Auto-advance activeSlot to the next unfilled slot on YOUR TEAM
    const nextUserPicks = [...userPicks];
    nextUserPicks[target.index] = hero;
    const nextEmptyIdx = nextUserPicks.findIndex((p) => p === null);
    if (nextEmptyIdx !== -1) {
      setActiveSlot({
        type: 'PICK',
        team: userTeamEnum,
        index: nextEmptyIdx,
      });
    } else {
      setActiveSlot(null);
    }
  };

  return (
    <div
      className={`h-14 sm:h-16 shrink-0 w-full bg-slate-950/85 border-t border-slate-800/80 px-3 sm:px-4 flex items-center justify-between text-xs select-none backdrop-blur-md z-10 ${className}`}
    >
      {/* ========================================================= */}
      {/* STATE 2: HERO QUICK-INSPECT (Dismissible)                 */}
      {/* ========================================================= */}
      {inspectedHero ? (
        <div className="flex items-center justify-between w-full min-w-0 gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 animate-fadeIn">
          {/* Left: Inspected Hero Avatar & Name */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)] flex-shrink-0">
              <HeroAvatar hero={inspectedHero} variant="icon" />
            </div>
            <div className="flex flex-col flex-shrink-0">
              <span className="font-hud font-bold text-amber-300 text-xs sm:text-[13px] tracking-wide whitespace-nowrap">
                {inspectedHero.name}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                {inspectedHero.lane || inspectedHero.role}
              </span>
            </div>
          </div>

          {/* Middle Cluster 1: 🟢 Strong Against (Counters) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-emerald-400 uppercase whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span>STRONG AGAINST:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {(inspectedHero.counters || []).slice(0, 3).map((rel) => {
                const targetHero = resolveRelationHero(rel);
                return (
                  <button
                    key={`strong-${rel.id}`}
                    type="button"
                    onClick={() => targetHero && handleHeroChipClick(targetHero)}
                    className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-emerald-500/60 hover:border-emerald-400 bg-slate-900 flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-emerald-500/20"
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
                <span className="text-slate-500 text-[10px] italic whitespace-nowrap">
                  None listed
                </span>
              )}
            </div>
          </div>

          {/* Middle Cluster 2: 🔴 Weak Against (Countered By) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-rose-400 uppercase whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              <span>WEAK AGAINST:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {(inspectedHero.counteredBy || []).slice(0, 3).map((rel) => {
                const targetHero = resolveRelationHero(rel);
                return (
                  <button
                    key={`weak-${rel.id}`}
                    type="button"
                    onClick={() => targetHero && handleHeroChipClick(targetHero)}
                    className="relative group h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-rose-500/60 hover:border-rose-400 bg-slate-900 flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-rose-500/20"
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
                <span className="text-slate-500 text-[10px] italic whitespace-nowrap">
                  None listed
                </span>
              )}
            </div>
          </div>

          {/* Right: Dismiss Quick-Inspect */}
          <div className="flex-shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => setInspectedHero(null)}
              className="h-7 w-7 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0 active:scale-95"
              title="Close inspect (Return to draft recommendations)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* STATE 1: UNIFIED DRAFT INTELLIGENCE & RECOMMENDATIONS     */
        /* ========================================================= */
        <div className="flex items-center justify-between w-full min-w-0 gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 animate-fadeIn">
          {/* 1. Left Slot Indicator Badge */}
          <div className="flex-shrink-0 flex items-center">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-hud font-bold uppercase tracking-wider shadow-sm border whitespace-nowrap flex-shrink-0 ${
                userTeamEnum === 'BLUE'
                  ? 'bg-blue-950/80 border-blue-500/60 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
              }`}
            >
              <Target className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{activeSlotTarget.label}</span>
            </div>
          </div>

          {/* 2. Middle Cluster 1: ⚡ Targeted Counter-Picks */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-red-400 uppercase whitespace-nowrap">
              <Zap className="h-3.5 w-3.5 fill-red-400/30 text-red-400 flex-shrink-0" />
              <span>COUNTERS:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {topCounters.map(({ hero, tooltip }) => (
                <button
                  key={`rec-counter-${hero.id}`}
                  type="button"
                  onClick={() => handleHeroChipClick(hero)}
                  className="relative group h-7 w-7 sm:h-8.5 sm:w-8.5 rounded-full overflow-hidden border border-red-500/60 hover:border-red-400 bg-slate-900 flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-red-500/25"
                  title={`${hero.name} — ${tooltip} (Click to draft into ${activeSlotTarget.label})`}
                >
                  <HeroAvatar hero={hero} variant="icon" />
                  <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {topCounters.length === 0 && (
                <span className="text-slate-500 text-[10px] italic whitespace-nowrap">
                  Awaiting enemy locks
                </span>
              )}
            </div>
          </div>

          {/* 3. Middle Cluster 2: 🤝 Targeted Team Synergies */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-cyan-400 uppercase whitespace-nowrap">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
              <span>SYNERGIES:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {topSynergies.map(({ hero, tooltip }) => (
                <button
                  key={`rec-synergy-${hero.id}`}
                  type="button"
                  onClick={() => handleHeroChipClick(hero)}
                  className="relative group h-7 w-7 sm:h-8.5 sm:w-8.5 rounded-full overflow-hidden border border-cyan-500/60 hover:border-cyan-400 bg-slate-900 flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ring-cyan-500/25"
                  title={`${hero.name} — ${tooltip} (Click to draft into ${activeSlotTarget.label})`}
                >
                  <HeroAvatar hero={hero} variant="icon" />
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {topSynergies.length === 0 && (
                <span className="text-slate-500 text-[10px] italic whitespace-nowrap">
                  Awaiting ally locks
                </span>
              )}
            </div>
          </div>

          {/* 4. Right: Team Composition Balance Metric */}
          <div className="flex-shrink-0 flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-xs font-hud shadow-sm flex-shrink-0 whitespace-nowrap">
              <span className="text-amber-400 font-bold flex items-center gap-1 flex-shrink-0">
                <BarChart2 className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                <span>COMP BALANCE:</span>
              </span>
              <span className="font-semibold text-slate-200">
                {teamBalanceMetric.physPct}% Phys / {teamBalanceMetric.magPct}% Mag
              </span>
              {teamBalanceMetric.warning && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex-shrink-0"
                  title={`Composition Warning: ${teamBalanceMetric.warning}`}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
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

export default TacticalIntelStrip;
