import React, { useMemo } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Shield,
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
  TeamSide,
} from '../types/draft';
import metaHeroes from '../data/mlbb-meta.json';
import { HeroAvatar } from './HeroAvatar';

export interface TacticalIntelStripProps {
  className?: string;
}

interface RecommendedChip {
  hero: Hero;
  score: number;
  badgeScore: number;
  tooltip: string;
  targetHeroName?: string;
  winRate?: number;
  isDirectLaneMatch?: boolean;
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

  // Tactical Intel is dynamic to the selected slot's team!
  // If active slot is Red team, Red is target and Blue is opponent.
  // If active slot is Blue team, Blue is target and Red is opponent.
  const targetTeam: TeamSide = activeSlot?.team ?? (userTeamSide === 'blue' ? 'BLUE' : 'RED');

  const targetTeamPicks = targetTeam === 'BLUE' ? bluePicks : redPicks;
  const opposingTeamPicks = targetTeam === 'BLUE' ? redPicks : bluePicks;

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
  const targetLocked = useMemo(
    () => targetTeamPicks.filter(Boolean) as Hero[],
    [targetTeamPicks]
  );
  const opposingLocked = useMemo(
    () => opposingTeamPicks.filter(Boolean) as Hero[],
    [opposingTeamPicks]
  );

  // Direct lane opponent (e.g. if target slot is EXP (index 0), opposingTeamPicks[0])
  const directLaneOpponent = useMemo(() => {
    if (activeSlot?.type === 'PICK' && activeSlot.index >= 0 && activeSlot.index < opposingTeamPicks.length) {
      return opposingTeamPicks[activeSlot.index] || null;
    }
    return null;
  }, [activeSlot, opposingTeamPicks]);

  // Determine active slot target on the board
  const activeSlotTarget = useMemo(() => {
    if (activeSlot?.type === 'PICK') {
      const laneConfig = DEDICATED_LANES[activeSlot.index] || DEDICATED_LANES[0];
      return {
        hasActiveSlot: true,
        slotIndex: activeSlot.index,
        team: activeSlot.team,
        laneConfig,
        targetLane: laneConfig.lane,
        label: `${activeSlot.team} ${laneConfig.shortLabel} PICK`,
      };
    }

    if (activeSlot?.type === 'BAN') {
      return {
        hasActiveSlot: true,
        slotIndex: activeSlot.index,
        team: activeSlot.team,
        laneConfig: null,
        targetLane: null,
        label: `${activeSlot.team} BAN #${activeSlot.index + 1}`,
      };
    }

    return {
      hasActiveSlot: false,
      slotIndex: -1,
      team: null,
      laneConfig: null,
      targetLane: null,
      label: 'NO SLOT TARGETED',
    };
  }, [activeSlot]);

  // Fast ID / slug lookup maps for heroes & meta telemetry
  const { metaById, heroById } = useMemo(() => {
    const mById = new Map<number, (typeof metaHeroes)[number]>();
    metaHeroes.forEach((m) => mById.set(m.id, m));

    const hById = new Map<number, Hero>();
    ALL_HEROES.forEach((h) => hById.set(Number(h.id), h));

    return { metaById: mById, heroById: hById };
  }, []);

  // Compute Dynamic Recommendations from mlbb-meta.json
  const { topCounters, topCompatible } = useMemo(() => {
    // When no slot is selected, do not compute or show recommendations
    if (!activeSlotTarget.hasActiveSlot) {
      return { topCounters: [], topCompatible: [] };
    }

    const targetLane = activeSlotTarget.targetLane;

    // -------------------------------------------------------------
    // 1. Calculate Top BEST COUNTERS vs Opposing Team Locked Heroes
    // -------------------------------------------------------------
    const counterCandidates: RecommendedChip[] = [];

    if (opposingLocked.length > 0) {
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

        let bestScore = 0;
        let primaryTooltip = '';
        let matchedEnemyName = '';
        let matchCount = 0;
        let isDirectLaneMatch = false;
        let directLaneWr = 0;
        let directLaneScore = 0;

        opposingLocked.forEach((enemy) => {
          const enemyId = Number(enemy.id);
          const enemyMeta = metaById.get(enemyId);
          const isDirectLaneOpponent =
            directLaneOpponent &&
            (directLaneOpponent.id === enemy.id || directLaneOpponent.slug === enemy.slug);

          const matchInCandidate = (candidateMeta.best_counters || []).find(
            (b) => b.id === enemyId || (b as any).hero_id === enemyId || b.slug === enemy.slug
          );
          const matchInEnemy = (enemyMeta?.countered_by || []).find(
            (b) => b.id === candidateMeta.id || (b as any).hero_id === candidateMeta.id || b.slug === candidateMeta.slug
          );

          const matched = matchInCandidate || matchInEnemy;
          if (matched) {
            matchCount++;
            const score = matched.counter_score || 85;
            const wr = matched.win_rate ?? Math.round(candidateMeta.win_rate || 50);

            if (isDirectLaneOpponent) {
              isDirectLaneMatch = true;
              directLaneWr = wr;
              directLaneScore = score;
            }

            if (score > bestScore) {
              bestScore = score;
              matchedEnemyName = enemy.name;
              primaryTooltip = `Counters ${enemy.name} (${wr}% WR)`;
            }
          }
        });

        if (matchCount > 0) {
          let totalRank = bestScore * 2 + matchCount * 12;
          if (matchesLane) totalRank += 35;

          // Direct Lane Counter gets maximum priority boost and dedicated tooltip
          if (isDirectLaneMatch && directLaneOpponent) {
            totalRank += 65;
            bestScore = directLaneScore;
            primaryTooltip = `Direct Lane Counter vs ${directLaneOpponent.name} (${directLaneWr}% WR)`;
            matchedEnemyName = directLaneOpponent.name;
          }

          if (
            mapConfig.synergyHeroIds.includes(String(candidateMeta.id)) ||
            (candidateMeta.slug && mapConfig.synergyHeroIds.includes(candidateMeta.slug))
          ) {
            totalRank += 5;
          }
          totalRank += (candidateMeta.win_rate || 50) / 10;

          counterCandidates.push({
            hero: fullHero,
            score: totalRank,
            badgeScore: bestScore || 88,
            targetHeroName: matchedEnemyName,
            isDirectLaneMatch,
            tooltip: primaryTooltip || `Counters ${matchedEnemyName || 'Enemy'}`,
          });
        }
      });
    }

    counterCandidates.sort((a, b) => b.score - a.score);
    const counters = counterCandidates.slice(0, 4);

    // -------------------------------------------------------------
    // 2. Calculate Top COMPATIBLE with Target Team Locked Heroes
    // -------------------------------------------------------------
    const compatCandidates: RecommendedChip[] = [];
    const usedCounterIds = new Set(counters.map((c) => String(c.hero.id)));

    if (targetLocked.length > 0) {
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

        let bestScore = 0;
        let primaryTooltip = '';
        let matchedAllyName = '';
        let matchCount = 0;

        targetLocked.forEach((ally) => {
          const allyId = Number(ally.id);
          const allyMeta = metaById.get(allyId);

          const candidateCompatList = (candidateMeta as any).most_compatible || candidateMeta.synergies || [];
          const matchInCandidate = candidateCompatList.find(
            (s: any) => s.id === allyId || s.hero_id === allyId || s.slug === ally.slug
          );

          const allyCompatList = (allyMeta as any)?.most_compatible || allyMeta?.synergies || [];
          const matchInAlly = allyCompatList.find(
            (s: any) => s.id === candidateMeta.id || s.hero_id === candidateMeta.id || s.slug === candidateMeta.slug
          );

          const matched = matchInCandidate || matchInAlly;
          if (matched) {
            matchCount++;
            const score = matched.compatibility_score || matched.counter_score || (matched as any).synergy_score || 82;
            if (score > bestScore) {
              bestScore = score;
              matchedAllyName = ally.name;
              const wr = matched.win_rate ?? Math.round(candidateMeta.win_rate || 50);
              primaryTooltip = `Compatible with ${ally.name} (${wr}% WR)`;
            }
          }
        });

        if (matchCount > 0) {
          let totalRank = bestScore * 2 + matchCount * 12;
          if (matchesLane) totalRank += 35;
          if (
            mapConfig.synergyHeroIds.includes(String(candidateMeta.id)) ||
            (candidateMeta.slug && mapConfig.synergyHeroIds.includes(candidateMeta.slug))
          ) {
            totalRank += 5;
          }
          totalRank += (candidateMeta.win_rate || 50) / 10;

          compatCandidates.push({
            hero: fullHero,
            score: totalRank,
            badgeScore: bestScore || 82,
            targetHeroName: matchedAllyName,
            tooltip: primaryTooltip || `Compatible with ${matchedAllyName || 'Ally'}`,
          });
        }
      });
    }

    compatCandidates.sort((a, b) => b.score - a.score);
    const compatible = compatCandidates.slice(0, 3);

    return {
      topCounters: counters,
      topCompatible: compatible,
    };
  }, [
    activeSlotTarget.hasActiveSlot,
    activeSlotTarget.targetLane,
    unavailableHeroIds,
    opposingLocked,
    targetLocked,
    directLaneOpponent,
    mapConfig,
    metaById,
    heroById,
  ]);

  // Compute Target Team Composition Health & Damage Balance
  const teamBalanceMetric = useMemo(() => {
    if (targetLocked.length === 0) {
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

    targetLocked.forEach((hero) => {
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
    if (physPct >= 90 && targetLocked.length >= 2) {
      warning = '90%+ Phys';
    } else if (magPct >= 90 && targetLocked.length >= 2) {
      warning = '90%+ Mag';
    } else if (targetLocked.length >= 3 && !hasFrontline) {
      warning = 'No Frontline';
    } else if (targetLocked.length >= 3 && !hasCC) {
      warning = 'Low CC';
    }

    return {
      physPct,
      magPct,
      warning,
    };
  }, [targetLocked]);

  // Helper to resolve HeroRelationItem to full Hero
  const resolveRelationHero = (rel: HeroRelationItem | any): Hero | null => {
    const tid = Number(rel.hero_id || rel.id);
    return (
      heroById.get(tid) ||
      ALL_HEROES.find(
        (h) => Number(h.id) === tid || h.slug === rel.slug
      ) ||
      null
    );
  };

  // Click-to-Draft Flow: Immediately place suggested hero into active lane slot
  const handleHeroChipClick = (hero: Hero) => {
    if (!activeSlot || activeSlot.type !== 'PICK') {
      setInspectedHero(hero);
      return;
    }

    placeHero(hero, activeSlot);
    setActiveSlot(null);
  };

  // Inspect Meta Data for inspected hero
  const inspectedMeta = useMemo(() => {
    if (!inspectedHero) return null;
    return metaById.get(Number(inspectedHero.id)) || null;
  }, [inspectedHero, metaById]);

  return (
    <div
      className={`shrink-0 w-full bg-slate-950/90 border-t border-slate-800/80 px-3 py-2 flex flex-col gap-1.5 text-xs select-none backdrop-blur-md z-10 ${className}`}
    >
      {/* ========================================================= */}
      {/* STATE 2: HERO QUICK-INSPECT (Dismissible)                 */}
      {/* ========================================================= */}
      {inspectedHero ? (
        <div className="flex flex-col gap-2 w-full animate-fadeIn">
          {/* Top Sub-Row: Inspected Hero Identity & Close Button */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)] flex-shrink-0">
                <HeroAvatar hero={inspectedHero} variant="icon" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-hud font-bold text-amber-300 text-xs sm:text-[13px] tracking-wide">
                  {inspectedHero.name}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
                  {inspectedHero.lane || inspectedHero.role}
                </span>
                {inspectedMeta?.win_rate && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded px-1.5 py-0.5">
                    {inspectedMeta.win_rate}% WR
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectedHero(null)}
              className="h-6 w-6 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0 active:scale-95"
              title="Close inspect (Return to draft recommendations)"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Bottom Sub-Row: 4 Official Metrics */}
          <div className="flex items-center justify-between w-full gap-4 pt-1 border-t border-slate-800/50 flex-wrap sm:flex-nowrap">
            {/* 1. BEST COUNTERS */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-emerald-400 uppercase">
                <Zap className="h-3 w-3 fill-emerald-400/30 text-emerald-400 flex-shrink-0" />
                <span>BEST COUNTERS:</span>
              </span>

              <div className="flex items-center gap-2 flex-shrink-0">
                {((inspectedMeta?.best_counters || inspectedHero.counters || []).slice(0, 3)).map((rel: any) => {
                  const targetHero = resolveRelationHero(rel);
                  const score = rel.counter_score || 85;
                  return (
                    <button
                      key={`best-counter-${rel.hero_id || rel.id}`}
                      type="button"
                      onClick={() => targetHero && handleHeroChipClick(targetHero)}
                      className="relative group h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                      title={`${rel.name} — Counter Score: ${score} (${rel.win_rate || 50}% WR)`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden border border-emerald-500/70 hover:border-emerald-400 bg-slate-900 shadow-sm ring-1 ring-emerald-500/25">
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-950/95 text-emerald-300 border border-emerald-500/80 rounded-full text-[8px] font-hud font-bold leading-none shadow z-10">
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. MOST COUNTERED BY */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-rose-400 uppercase">
                <Shield className="h-3 w-3 text-rose-400 flex-shrink-0" />
                <span>COUNTERED BY:</span>
              </span>

              <div className="flex items-center gap-2 flex-shrink-0">
                {((inspectedMeta?.countered_by || inspectedHero.counteredBy || []).slice(0, 3)).map((rel: any) => {
                  const targetHero = resolveRelationHero(rel);
                  const score = rel.counter_score || 85;
                  return (
                    <button
                      key={`countered-by-${rel.hero_id || rel.id}`}
                      type="button"
                      onClick={() => targetHero && handleHeroChipClick(targetHero)}
                      className="relative group h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                      title={`${rel.name} — Counter Score: ${score} (${rel.win_rate || 50}% WR)`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden border border-rose-500/70 hover:border-rose-400 bg-slate-900 shadow-sm ring-1 ring-rose-500/25">
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-rose-950/95 text-rose-300 border border-rose-500/80 rounded-full text-[8px] font-hud font-bold leading-none shadow z-10">
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. MOST COMPATIBLE */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-cyan-400 uppercase">
                <Sparkles className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                <span>COMPATIBLE:</span>
              </span>

              <div className="flex items-center gap-2 flex-shrink-0">
                {(((inspectedMeta as any)?.most_compatible || inspectedHero.synergies || []).slice(0, 3)).map((rel: any) => {
                  const targetHero = resolveRelationHero(rel);
                  const score = rel.compatibility_score || rel.counter_score || rel.synergy_score || 82;
                  return (
                    <button
                      key={`compat-${rel.hero_id || rel.id}`}
                      type="button"
                      onClick={() => targetHero && handleHeroChipClick(targetHero)}
                      className="relative group h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                      title={`${rel.name} — Compatibility Score: ${score} (${rel.win_rate || 50}% WR)`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden border border-cyan-500/70 hover:border-cyan-400 bg-slate-900 shadow-sm ring-1 ring-cyan-500/25">
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-cyan-950/95 text-cyan-300 border border-cyan-500/80 rounded-full text-[8px] font-hud font-bold leading-none shadow z-10">
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. LEAST COMPATIBLE */}
            {((inspectedMeta as any)?.least_compatible && (inspectedMeta as any).least_compatible.length > 0) && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-amber-400 uppercase">
                  <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  <span>LEAST COMPATIBLE:</span>
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {((inspectedMeta as any).least_compatible.slice(0, 3)).map((rel: any) => {
                    const targetHero = resolveRelationHero(rel);
                    const score = rel.compatibility_score || rel.counter_score || 72;
                    return (
                      <button
                        key={`least-compat-${rel.hero_id || rel.id}`}
                        type="button"
                        onClick={() => targetHero && handleHeroChipClick(targetHero)}
                        className="relative group h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                        title={`${rel.name} — Negative Compatibility Score: ${score} (${rel.win_rate || 50}% WR)`}
                      >
                        <div className="h-full w-full rounded-full overflow-hidden border border-amber-500/70 hover:border-amber-400 bg-slate-900 shadow-sm ring-1 ring-amber-500/25">
                          <img
                            src={rel.avatar}
                            alt={rel.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-amber-950/95 text-amber-300 border border-amber-500/80 rounded-full text-[8px] font-hud font-bold leading-none shadow z-10">
                          {score}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !activeSlotTarget.hasActiveSlot ? (
        /* ========================================================= */
        /* RESTING STATE: PROMPT USER TO CLICK / TARGET A SLOT       */
        /* ========================================================= */
        <div className="flex items-center justify-between w-full py-0.5 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-hud font-bold uppercase tracking-wider bg-slate-900/90 border border-slate-700/80 text-slate-400 shadow-sm">
              <Target className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span>TARGET A LANE SLOT</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium italic">
              Click any slot on Blue or Red team to analyze lane counters and compatible picks.
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-[11px] font-hud text-slate-400 shadow-sm">
            <BarChart2 className="h-3 w-3 text-slate-500 flex-shrink-0" />
            <span>COMP: STANDBY</span>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* STATE 1: ACTIVE LANE DRAFT INTELLIGENCE & MATCHUPS        */
        /* ========================================================= */
        <div className="flex flex-col gap-1.5 w-full animate-fadeIn">
          {/* Top Sub-Row: Slot Target Indicator (Left) & Comp Balance (Right) */}
          <div className="flex items-center justify-between w-full">
            {/* Left: Slot Target Indicator Badge with Direct Opponent Tag */}
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-hud font-bold uppercase tracking-wider shadow-sm border ${
                  targetTeam === 'BLUE'
                    ? 'bg-blue-950/80 border-blue-500/60 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                }`}
              >
                <Target className="h-3 w-3 flex-shrink-0" />
                <span>{activeSlotTarget.label}</span>
              </div>

              {directLaneOpponent && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-[10px] font-hud text-slate-300 shadow-sm">
                  <span className="text-slate-500">VS LANE OPPONENT:</span>
                  <span className="font-bold text-amber-300">{directLaneOpponent.name}</span>
                </span>
              )}
            </div>

            {/* Right: Comp Balance Metric */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] sm:text-[11px] font-hud shadow-sm">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <BarChart2 className="h-3 w-3 text-amber-400 flex-shrink-0" />
                <span>{targetTeam} COMP:</span>
              </span>
              <span className="font-semibold text-slate-200">
                {teamBalanceMetric.physPct}% Phys / {teamBalanceMetric.magPct}% Mag
              </span>
              {teamBalanceMetric.warning && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold"
                  title={`Composition Warning: ${teamBalanceMetric.warning}`}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                  <span>{teamBalanceMetric.warning}</span>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Sub-Row: Best Counters (Left) & Compatible (Right) */}
          <div className="flex items-center justify-between w-full gap-4 pt-1 border-t border-slate-800/50 flex-wrap sm:flex-nowrap">
            {/* Left Sub-Group: ⚡ Targeted Best Counters */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-emerald-400 uppercase">
                <Zap className="h-3 w-3 fill-emerald-400/30 text-emerald-400 flex-shrink-0" />
                <span>BEST COUNTERS:</span>
              </span>

              <div className="flex items-center gap-2 flex-shrink-0">
                {topCounters.map(({ hero, badgeScore, tooltip, isDirectLaneMatch }) => (
                  <button
                    key={`rec-counter-${hero.id}`}
                    type="button"
                    onClick={() => handleHeroChipClick(hero)}
                    className="relative group h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                    title={`${hero.name} — ${tooltip} (Click to draft into ${activeSlotTarget.label})`}
                  >
                    <div
                      className={`h-full w-full rounded-full overflow-hidden border bg-slate-900 shadow-sm ${
                        isDirectLaneMatch
                          ? 'border-amber-400 ring-2 ring-amber-400/70 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'border-emerald-500/70 hover:border-emerald-400 ring-1 ring-emerald-500/25'
                      }`}
                    >
                      <HeroAvatar hero={hero} variant="icon" />
                      <div className="absolute inset-0 rounded-full bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10 border ${
                        isDirectLaneMatch
                          ? 'bg-amber-950/95 text-amber-300 border-amber-400'
                          : 'bg-emerald-950/95 text-emerald-300 border-emerald-500/80'
                      }`}
                    >
                      {badgeScore}
                    </span>
                  </button>
                ))}
                {topCounters.length === 0 && (
                  <span className="text-slate-500 text-[10px] italic">
                    {opposingLocked.length === 0 ? 'Awaiting opponent picks' : 'No direct counters found'}
                  </span>
                )}
              </div>
            </div>

            {/* Right Sub-Group: 🤝 Targeted Team Compatibility */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-hud font-bold tracking-wider text-cyan-400 uppercase">
                <Sparkles className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                <span>COMPATIBLE:</span>
              </span>

              <div className="flex items-center gap-2 flex-shrink-0">
                {topCompatible.map(({ hero, badgeScore, tooltip }) => (
                  <button
                    key={`rec-compat-${hero.id}`}
                    type="button"
                    onClick={() => handleHeroChipClick(hero)}
                    className="relative group h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                    title={`${hero.name} — ${tooltip} (Click to draft into ${activeSlotTarget.label})`}
                  >
                    <div className="h-full w-full rounded-full overflow-hidden border border-cyan-500/70 hover:border-cyan-400 bg-slate-900 shadow-sm ring-1 ring-cyan-500/25">
                      <HeroAvatar hero={hero} variant="icon" />
                      <div className="absolute inset-0 rounded-full bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-cyan-950/95 text-cyan-300 border border-cyan-500/80 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10">
                      {badgeScore}
                    </span>
                  </button>
                ))}
                {topCompatible.length === 0 && (
                  <span className="text-slate-500 text-[10px] italic">
                    {targetLocked.length === 0 ? 'Awaiting team picks' : 'No synergies found'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalIntelStrip;
