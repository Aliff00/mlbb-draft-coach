import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  ShieldAlert,
  Swords,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { ALL_HEROES, useDraftStore } from '../store/useDraftStore';
import {
  DEDICATED_LANES,
  getHeroDamageType,
  Hero,
  HeroRankMetrics,
  HeroRelationItem,
  MAP_EFFECTS_CONFIG,
  RANK_TIER_OPTIONS,
  RankTier,
  TeamSide,
} from '../types/draft';
import metaHeroes from '../data/mlbb-meta.json';
import { HeroAvatar } from './HeroAvatar';

export interface TacticalIntelStripProps {
  className?: string;
}

interface TacticalMatchupItem {
  hero: Hero;
  score: number;
  badgeScore: number;
  winRate?: number;
  pickRate?: number;
  targetHero?: Hero | null;
  targetHeroName?: string;
  tooltip: string;
  isBanned: boolean;
  isPicked: boolean;
  isUnavailable: boolean;
  statusBadge: 'BANNED' | 'PICKED' | null;
}

interface GroupedTacticalMatchup {
  targetHero: Hero;
  candidates: TacticalMatchupItem[];
}

function getHeroMetricsForTier(meta: any, tier: RankTier): HeroRankMetrics {
  if (meta?.ranks && meta.ranks[tier]) {
    return meta.ranks[tier];
  }
  return {
    win_rate: meta?.win_rate ?? 50,
    pick_rate: meta?.pick_rate ?? 1,
    ban_rate: meta?.ban_rate ?? 0,
    best_counters: meta?.best_counters ?? [],
    countered_by: meta?.countered_by ?? [],
    most_compatible: meta?.most_compatible ?? meta?.synergies ?? [],
    least_compatible: meta?.least_compatible ?? [],
  };
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
    rankTier,
    placeHero,
    inspectedHero,
    setInspectedHero,
  } = useDraftStore();

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];
  const activeRankOption =
    RANK_TIER_OPTIONS.find((t) => t.key === rankTier) || RANK_TIER_OPTIONS[0];

  // Dynamic target team based on selected slot, falling back to user's side
  const targetTeam: TeamSide = activeSlot?.team ?? (userTeamSide === 'blue' ? 'BLUE' : 'RED');

  const targetTeamPicks = targetTeam === 'BLUE' ? bluePicks : redPicks;
  const opposingTeamPicks = targetTeam === 'BLUE' ? redPicks : bluePicks;

  // Check if a hero is currently banned anywhere on the board
  const isHeroBanned = (heroId: number | string, slug?: string) => {
    const idNum = Number(heroId);
    return [...blueBans, ...redBans].some(
      (b) => b && (Number(b.id) === idNum || (slug && b.slug === slug))
    );
  };

  // Check if a hero is currently picked anywhere on the board
  const isHeroPicked = (heroId: number | string, slug?: string) => {
    const idNum = Number(heroId);
    return [...bluePicks, ...redPicks].some(
      (p) => p && (Number(p.id) === idNum || (slug && p.slug === slug))
    );
  };

  // Locked heroes for both teams
  const targetLocked = useMemo(
    () => targetTeamPicks.filter(Boolean) as Hero[],
    [targetTeamPicks]
  );
  const opposingLocked = useMemo(
    () => opposingTeamPicks.filter(Boolean) as Hero[],
    [opposingTeamPicks]
  );

  const isBoardEmpty = targetLocked.length === 0 && opposingLocked.length === 0;

  // Active slot target on the board
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

  // Check if any teammate in another lane is already locked
  const hasOtherLockedAllies = useMemo(
    () =>
      targetTeamPicks.some(
        (p, idx) =>
          p &&
          (!activeSlotTarget.hasActiveSlot || idx !== activeSlotTarget.slotIndex) &&
          (!activeSlotTarget.targetLane ||
            DEDICATED_LANES[idx]?.lane.toUpperCase() !== activeSlotTarget.targetLane.toUpperCase())
      ),
    [targetTeamPicks, activeSlotTarget]
  );

  // Fast ID lookup maps for heroes & meta telemetry
  const { metaById, heroById } = useMemo(() => {
    const mById = new Map<number, (typeof metaHeroes)[number]>();
    metaHeroes.forEach((m) => mById.set(m.id, m));

    const hById = new Map<number, Hero>();
    ALL_HEROES.forEach((h) => hById.set(Number(h.id), h));

    return { metaById: mById, heroById: hById };
  }, []);

  // Helper to resolve HeroRelationItem or ID to full Hero
  const resolveRelationHero = (rel: HeroRelationItem | any): Hero | null => {
    if (!rel) return null;
    const tid = Number(rel.hero_id || rel.id);
    return (
      heroById.get(tid) ||
      ALL_HEROES.find((h) => Number(h.id) === tid || h.slug === rel.slug) ||
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

  // =========================================================================
  // REQUIREMENT 2: EMPTY DRAFT STATE (META PRIORITY)
  // When no heroes are locked yet and an empty lane slot is tapped:
  // Display Top 5 Meta Priority heroes for that lane sorted by win_rate and pick_rate
  // =========================================================================
  const topMetaPriority = useMemo(() => {
    if (!isBoardEmpty || !activeSlotTarget.hasActiveSlot || !activeSlotTarget.targetLane) {
      return [];
    }

    const targetLane = activeSlotTarget.targetLane;
    const candidates: TacticalMatchupItem[] = [];

    metaHeroes.forEach((candidateMeta) => {
      const fullHero = heroById.get(candidateMeta.id);
      if (!fullHero) return;

      const matchesLane =
        candidateMeta.lanes &&
        candidateMeta.lanes.some(
          (l) => l.toUpperCase() === targetLane.toUpperCase()
        );
      if (!matchesLane) return;

      const metrics = getHeroMetricsForTier(candidateMeta, rankTier);
      const banned = isHeroBanned(candidateMeta.id, candidateMeta.slug);
      const picked = isHeroPicked(candidateMeta.id, candidateMeta.slug);
      const isUnavailable = banned || picked;
      const statusBadge = banned ? 'BANNED' : picked ? 'PICKED' : null;

      // Meta priority composite score: weighted by win rate and pick rate
      const compositeScore = metrics.win_rate * 2 + metrics.pick_rate;

      candidates.push({
        hero: fullHero,
        score: compositeScore,
        badgeScore: Math.round(metrics.win_rate),
        winRate: metrics.win_rate,
        pickRate: metrics.pick_rate,
        tooltip: `${fullHero.name} — ${metrics.win_rate}% Win Rate | ${metrics.pick_rate}% Pick Rate in ${activeRankOption.label}`,
        isBanned: banned,
        isPicked: picked,
        isUnavailable,
        statusBadge,
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  }, [
    isBoardEmpty,
    activeSlotTarget.hasActiveSlot,
    activeSlotTarget.targetLane,
    rankTier,
    activeRankOption.label,
    heroById,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
  ]);

  // =========================================================================
  // REQUIREMENT 3 & 4: 2-COLUMN TACTICAL INTEL (WHEN HEROES ARE LOCKED)
  // Left: Advantage vs Enemy (Best Counters) + Best Teammates (Compatible)
  // Right: Weak Against Enemy (Countered By) + Poor Compatibility (Not Compatible)
  // Persistent Banned/Picked State: Never removed, dimmed with badge and score visible
  // =========================================================================
  const tacticalColumns = useMemo(() => {
    if (isBoardEmpty || !activeSlotTarget.hasActiveSlot) {
      return {
        bestCounters: [] as GroupedTacticalMatchup[],
        bestTeammates: [] as GroupedTacticalMatchup[],
        weakAgainst: [] as GroupedTacticalMatchup[],
        poorCompatibility: [] as GroupedTacticalMatchup[],
      };
    }

    const targetLane = activeSlotTarget.targetLane;

    // Filter all hero candidates playing the active lane
    const laneCandidates = metaHeroes.filter((m) => {
      if (!targetLane) return true;
      return (
        m.lanes &&
        m.lanes.some((l) => l.toUpperCase() === targetLane.toUpperCase())
      );
    });

    // 1. ADVANTAGE VS ENEMY (BEST COUNTERS) — Grouped by target enemy
    const groupedCounters: GroupedTacticalMatchup[] = [];
    if (opposingLocked.length > 0) {
      opposingLocked.forEach((enemy) => {
        const enemyId = Number(enemy.id);
        const enemyMeta = metaById.get(enemyId);
        const enemyMetrics = enemyMeta ? getHeroMetricsForTier(enemyMeta, rankTier) : null;
        const candidatesForEnemy: TacticalMatchupItem[] = [];

        laneCandidates.forEach((candidateMeta) => {
          const fullHero = heroById.get(candidateMeta.id);
          if (!fullHero) return;

          const candidateMetrics = getHeroMetricsForTier(candidateMeta, rankTier);
          const matchInCandidate = (candidateMetrics.best_counters || []).find(
            (b) => b.id === enemyId || (b as any).hero_id === enemyId || b.slug === enemy.slug
          );
          const matchInEnemy = (enemyMetrics?.countered_by || []).find(
            (b) =>
              b.id === candidateMeta.id ||
              (b as any).hero_id === candidateMeta.id ||
              b.slug === candidateMeta.slug
          );

          const matched = matchInCandidate || matchInEnemy;
          if (matched) {
            const score = matched.counter_score || 85;
            const wr = matched.win_rate ?? Math.round(candidateMetrics.win_rate || 50);
            const banned = isHeroBanned(candidateMeta.id, candidateMeta.slug);
            const picked = isHeroPicked(candidateMeta.id, candidateMeta.slug);

            candidatesForEnemy.push({
              hero: fullHero,
              score,
              badgeScore: score,
              winRate: wr,
              targetHero: enemy,
              targetHeroName: enemy.name,
              tooltip: `Counters ${enemy.name} (${wr}% WR) in ${activeRankOption.label}`,
              isBanned: banned,
              isPicked: picked,
              isUnavailable: banned || picked,
              statusBadge: banned ? 'BANNED' : picked ? 'PICKED' : null,
            });
          }
        });

        candidatesForEnemy.sort((a, b) => b.score - a.score);
        if (candidatesForEnemy.length > 0) {
          groupedCounters.push({
            targetHero: enemy,
            candidates: candidatesForEnemy.slice(0, 5),
          });
        }
      });
      groupedCounters.sort((a, b) => (b.candidates[0]?.score || 0) - (a.candidates[0]?.score || 0));
    }

    // Filter allies strictly from OTHER lanes (exclude active slot and any ally in the same lane)
    const validAllies = targetTeamPicks
      .map((hero, idx) => ({ hero, idx }))
      .filter((item): item is { hero: Hero; idx: number } => {
        if (!item.hero) return false;
        if (activeSlotTarget.hasActiveSlot && item.idx === activeSlotTarget.slotIndex) {
          return false;
        }
        const slotLane = DEDICATED_LANES[item.idx]?.lane;
        if (targetLane && slotLane && slotLane.toUpperCase() === targetLane.toUpperCase()) {
          return false;
        }
        return true;
      })
      .map((item) => item.hero);

    // 2. BEST TEAMMATES (COMPATIBLE) — Grouped by target ally
    const groupedTeammates: GroupedTacticalMatchup[] = [];
    if (validAllies.length > 0) {
      validAllies.forEach((ally) => {
        const allyId = Number(ally.id);
        const allyMeta = metaById.get(allyId);
        const allyMetrics = allyMeta ? getHeroMetricsForTier(allyMeta, rankTier) : null;
        const candidatesForAlly: TacticalMatchupItem[] = [];

        laneCandidates.forEach((candidateMeta) => {
          const fullHero = heroById.get(candidateMeta.id);
          if (!fullHero) return;

          const candidateMetrics = getHeroMetricsForTier(candidateMeta, rankTier);
          const matchInCandidate = (candidateMetrics.most_compatible || []).find(
            (s) => s.id === allyId || (s as any).hero_id === allyId || s.slug === ally.slug
          );
          const matchInAlly = (allyMetrics?.most_compatible || []).find(
            (s) =>
              s.id === candidateMeta.id ||
              (s as any).hero_id === candidateMeta.id ||
              s.slug === candidateMeta.slug
          );

          const matched = matchInCandidate || matchInAlly;
          if (matched) {
            const score =
              matched.compatibility_score || matched.counter_score || (matched as any).synergy_score || 82;
            const wr = matched.win_rate ?? Math.round(candidateMetrics.win_rate || 50);
            const banned = isHeroBanned(candidateMeta.id, candidateMeta.slug);
            const picked = isHeroPicked(candidateMeta.id, candidateMeta.slug);

            candidatesForAlly.push({
              hero: fullHero,
              score,
              badgeScore: score,
              winRate: wr,
              targetHero: ally,
              targetHeroName: ally.name,
              tooltip: `Compatible with ${ally.name} (${wr}% WR)`,
              isBanned: banned,
              isPicked: picked,
              isUnavailable: banned || picked,
              statusBadge: banned ? 'BANNED' : picked ? 'PICKED' : null,
            });
          }
        });

        candidatesForAlly.sort((a, b) => b.score - a.score);
        if (candidatesForAlly.length > 0) {
          groupedTeammates.push({
            targetHero: ally,
            candidates: candidatesForAlly.slice(0, 5),
          });
        }
      });
      groupedTeammates.sort((a, b) => (b.candidates[0]?.score || 0) - (a.candidates[0]?.score || 0));
    }

    // 3. WEAK AGAINST ENEMY (MOST COUNTERED BY) — Grouped by target enemy
    const groupedWeak: GroupedTacticalMatchup[] = [];
    if (opposingLocked.length > 0) {
      opposingLocked.forEach((enemy) => {
        const enemyId = Number(enemy.id);
        const enemyMeta = metaById.get(enemyId);
        const enemyMetrics = enemyMeta ? getHeroMetricsForTier(enemyMeta, rankTier) : null;
        const vulnerableCandidates: TacticalMatchupItem[] = [];

        laneCandidates.forEach((candidateMeta) => {
          const fullHero = heroById.get(candidateMeta.id);
          if (!fullHero) return;

          const candidateMetrics = getHeroMetricsForTier(candidateMeta, rankTier);
          const matchInCandidate = (candidateMetrics.countered_by || []).find(
            (c) => c.id === enemyId || (c as any).hero_id === enemyId || c.slug === enemy.slug
          );
          const matchInEnemy = (enemyMetrics?.best_counters || []).find(
            (c) =>
              c.id === candidateMeta.id ||
              (c as any).hero_id === candidateMeta.id ||
              c.slug === candidateMeta.slug
          );

          const matched = matchInCandidate || matchInEnemy;
          if (matched) {
            const score = matched.counter_score || 85;
            const wr = matched.win_rate ?? 46;
            const banned = isHeroBanned(candidateMeta.id, candidateMeta.slug);
            const picked = isHeroPicked(candidateMeta.id, candidateMeta.slug);

            vulnerableCandidates.push({
              hero: fullHero,
              score,
              badgeScore: score,
              winRate: wr,
              targetHero: enemy,
              targetHeroName: enemy.name,
              tooltip: `Vulnerable to ${enemy.name} (${wr}% WR)`,
              isBanned: banned,
              isPicked: picked,
              isUnavailable: banned || picked,
              statusBadge: banned ? 'BANNED' : picked ? 'PICKED' : null,
            });
          }
        });

        vulnerableCandidates.sort((a, b) => b.score - a.score);
        if (vulnerableCandidates.length > 0) {
          groupedWeak.push({
            targetHero: enemy,
            candidates: vulnerableCandidates.slice(0, 5),
          });
        }
      });
      groupedWeak.sort((a, b) => (b.candidates[0]?.score || 0) - (a.candidates[0]?.score || 0));
    }

    // 4. POOR COMPATIBILITY (NOT COMPATIBLE) — Grouped by target ally
    const groupedPoor: GroupedTacticalMatchup[] = [];
    if (validAllies.length > 0) {
      validAllies.forEach((ally) => {
        const allyId = Number(ally.id);
        const allyMeta = metaById.get(allyId);
        const allyMetrics = allyMeta ? getHeroMetricsForTier(allyMeta, rankTier) : null;
        const clashingCandidates: TacticalMatchupItem[] = [];

        laneCandidates.forEach((candidateMeta) => {
          const fullHero = heroById.get(candidateMeta.id);
          if (!fullHero) return;

          const candidateMetrics = getHeroMetricsForTier(candidateMeta, rankTier);
          const matchInCandidate = (candidateMetrics.least_compatible || []).find(
            (c) => c.id === allyId || (c as any).hero_id === allyId || c.slug === ally.slug
          );
          const matchInAlly = (allyMetrics?.least_compatible || []).find(
            (c) =>
              c.id === candidateMeta.id ||
              (c as any).hero_id === candidateMeta.id ||
              c.slug === candidateMeta.slug
          );

          const matched = matchInCandidate || matchInAlly;
          if (matched) {
            const score = matched.compatibility_score || matched.counter_score || 75;
            const wr = matched.win_rate ?? 46;
            const banned = isHeroBanned(candidateMeta.id, candidateMeta.slug);
            const picked = isHeroPicked(candidateMeta.id, candidateMeta.slug);

            clashingCandidates.push({
              hero: fullHero,
              score,
              badgeScore: score,
              winRate: wr,
              targetHero: ally,
              targetHeroName: ally.name,
              tooltip: `Low synergy clash with ${ally.name} (${wr}% WR)`,
              isBanned: banned,
              isPicked: picked,
              isUnavailable: banned || picked,
              statusBadge: banned ? 'BANNED' : picked ? 'PICKED' : null,
            });
          }
        });

        clashingCandidates.sort((a, b) => b.score - a.score);
        if (clashingCandidates.length > 0) {
          groupedPoor.push({
            targetHero: ally,
            candidates: clashingCandidates.slice(0, 5),
          });
        }
      });
      groupedPoor.sort((a, b) => (b.candidates[0]?.score || 0) - (a.candidates[0]?.score || 0));
    }

    return {
      bestCounters: groupedCounters.slice(0, 5),
      bestTeammates: groupedTeammates.slice(0, 5),
      weakAgainst: groupedWeak.slice(0, 5),
      poorCompatibility: groupedPoor.slice(0, 5),
    };
  }, [
    isBoardEmpty,
    activeSlotTarget.hasActiveSlot,
    activeSlotTarget.targetLane,
    opposingLocked,
    targetLocked,
    rankTier,
    activeRankOption.label,
    mapConfig,
    metaById,
    heroById,
    blueBans,
    redBans,
    bluePicks,
    redPicks,
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

  // Inspect Meta Data for inspected hero (dynamic to active rank tier)
  const inspectedMeta = useMemo(() => {
    if (!inspectedHero) return null;
    const baseMeta = metaById.get(Number(inspectedHero.id));
    if (!baseMeta) return null;
    return {
      ...baseMeta,
      ...getHeroMetricsForTier(baseMeta, rankTier),
    };
  }, [inspectedHero, metaById, rankTier]);

  return (
    <div
      className={`flex-1 min-h-0 w-full bg-slate-950/95 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex flex-col gap-2 text-xs select-none backdrop-blur-md z-10 shadow-lg overflow-y-auto ${className}`}
    >
      {/* ========================================================= */}
      {/* STATE 2: HERO QUICK-INSPECT (Dismissible)                 */}
      {/* ========================================================= */}
      {inspectedHero ? (
        <div className="flex flex-col gap-2 w-full animate-fadeIn">
          {/* Top Sub-Row: Inspected Hero Identity & Close Button */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 sm:h-9.5 sm:w-9.5 rounded-full overflow-hidden border border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)] flex-shrink-0">
                <HeroAvatar hero={inspectedHero} variant="icon" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-hud font-bold text-amber-300 text-xs sm:text-sm tracking-wide">
                  {inspectedHero.name}
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
                  {inspectedHero.lane || inspectedHero.role}
                </span>
                {inspectedMeta?.win_rate && (
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded px-2 py-0.5 flex items-center gap-1">
                    <span>{inspectedMeta.win_rate}% WR</span>
                    <span className="text-slate-500 font-normal">({activeRankOption.badgeLabel})</span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectedHero(null)}
              className="h-6.5 w-6.5 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer flex-shrink-0 active:scale-95"
              title="Close inspect (Return to draft recommendations)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bottom Sub-Row: 4 Official Metrics */}
          <div className="flex items-center justify-between w-full gap-4 pt-1 border-t border-slate-800/50 flex-wrap sm:flex-nowrap">
            {/* 1. BEST COUNTERS */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex-shrink-0 text-[10.5px] sm:text-xs font-hud font-bold tracking-wider text-emerald-400 uppercase">
                BEST COUNTERS:
              </span>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                {((inspectedMeta?.best_counters || inspectedHero.counters || []).slice(0, 3)).map((rel: any) => {
                  const targetHero = resolveRelationHero(rel);
                  const score = rel.counter_score || 85;
                  return (
                    <button
                      key={`best-counter-${rel.hero_id || rel.id}`}
                      type="button"
                      onClick={() => targetHero && handleHeroChipClick(targetHero)}
                      className="relative group h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                      title={`${rel.name} — Counter Score: ${score} (${rel.win_rate || 50}% WR)`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden border border-emerald-500/70 hover:border-emerald-400 bg-slate-900 shadow-sm ring-1 ring-emerald-500/25">
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-emerald-950/95 text-emerald-300 border border-emerald-500/80 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10">
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. MOST COUNTERED BY */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex-shrink-0 text-[10.5px] sm:text-xs font-hud font-bold tracking-wider text-rose-400 uppercase">
                COUNTERED BY:
              </span>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                {((inspectedMeta?.countered_by || inspectedHero.counteredBy || []).slice(0, 3)).map((rel: any) => {
                  const targetHero = resolveRelationHero(rel);
                  const score = rel.counter_score || 85;
                  return (
                    <button
                      key={`countered-by-${rel.hero_id || rel.id}`}
                      type="button"
                      onClick={() => targetHero && handleHeroChipClick(targetHero)}
                      className="relative group h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                      title={`${rel.name} — Counter Score: ${score} (${rel.win_rate || 50}% WR)`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden border border-rose-500/70 hover:border-rose-400 bg-slate-900 shadow-sm ring-1 ring-rose-500/25">
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-rose-950/95 text-rose-300 border border-rose-500/80 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10">
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. MOST COMPATIBLE */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex-shrink-0 text-[10.5px] sm:text-xs font-hud font-bold tracking-wider text-cyan-400 uppercase">
                COMPATIBLE:
              </span>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                {(((inspectedMeta as any)?.most_compatible || inspectedHero.synergies || []).slice(0, 3)).map((rel: any) => {
                  const targetHero = resolveRelationHero(rel);
                  const score = rel.compatibility_score || rel.counter_score || rel.synergy_score || 82;
                  return (
                    <button
                      key={`compat-${rel.hero_id || rel.id}`}
                      type="button"
                      onClick={() => targetHero && handleHeroChipClick(targetHero)}
                      className="relative group h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                      title={`${rel.name} — Compatibility Score: ${score} (${rel.win_rate || 50}% WR)`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden border border-cyan-500/70 hover:border-cyan-400 bg-slate-900 shadow-sm ring-1 ring-cyan-500/25">
                        <img
                          src={rel.avatar}
                          alt={rel.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-cyan-950/95 text-cyan-300 border border-cyan-500/80 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10">
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
                <span className="flex-shrink-0 text-[10.5px] sm:text-xs font-hud font-bold tracking-wider text-amber-400 uppercase">
                  LEAST COMPATIBLE:
                </span>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {((inspectedMeta as any).least_compatible.slice(0, 3)).map((rel: any) => {
                    const targetHero = resolveRelationHero(rel);
                    const score = rel.compatibility_score || rel.counter_score || 72;
                    return (
                      <button
                        key={`least-compat-${rel.hero_id || rel.id}`}
                        type="button"
                        onClick={() => targetHero && handleHeroChipClick(targetHero)}
                        className="relative group h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-visible flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                        title={`${rel.name} — Negative Compatibility Score: ${score} (${rel.win_rate || 50}% WR)`}
                      >
                        <div className="h-full w-full rounded-full overflow-hidden border border-amber-500/70 hover:border-amber-400 bg-slate-900 shadow-sm ring-1 ring-amber-500/25">
                          <img
                            src={rel.avatar}
                            alt={rel.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-950/95 text-amber-300 border border-amber-500/80 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10">
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
      ) : isBoardEmpty ? (
        /* ========================================================= */
        /* REQUIREMENT 2: EMPTY DRAFT STATE (TOP 5 META PRIORITY)    */
        /* ========================================================= */
        <div className="flex flex-col gap-1.5 w-full animate-fadeIn">
          {/* Top Sub-Row: Lane Indicator & Meta Priority Label */}
          <div className="flex items-center justify-between w-full">
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

              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-[10px] font-hud font-bold text-amber-300">
                <Trophy className="h-3 w-3 text-amber-400 flex-shrink-0" />
                <span>TOP 5 META PRIORITY ({activeRankOption.label})</span>
              </div>
            </div>

            <span className="text-[10.5px] text-slate-400 italic hidden sm:inline">
              Sorted by Win Rate & Pick Rate in {activeRankOption.label}
            </span>
          </div>

          {/* Meta Priority Hero Row */}
          <div className="flex items-center gap-2.5 pt-1.5 border-t border-slate-800/50 overflow-x-auto pb-1">
            {topMetaPriority.map((item, idx) => (
              <button
                key={`meta-prio-${item.hero.id}`}
                type="button"
                onClick={() => !item.isUnavailable && handleHeroChipClick(item.hero)}
                disabled={item.isUnavailable}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition flex-shrink-0 ${
                  item.isUnavailable
                    ? 'bg-slate-900/40 border-slate-800/50 opacity-40 pointer-events-none'
                    : 'bg-slate-900/90 border-slate-700/80 hover:border-amber-400 hover:bg-slate-800/90 cursor-pointer shadow-sm active:scale-95'
                }`}
                title={item.tooltip}
              >
                {/* Ranking Number */}
                <span className="font-hud font-bold text-sm text-amber-400/90 w-4">
                  #{idx + 1}
                </span>

                {/* Hero Avatar with WR Badge */}
                <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0">
                  <div className="h-full w-full rounded-full overflow-hidden border border-amber-400/70 bg-slate-900">
                    <img
                      src={item.hero.avatar}
                      alt={item.hero.name}
                      className={`h-full w-full object-cover ${item.isUnavailable ? 'grayscale' : ''}`}
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-emerald-950/95 text-emerald-300 border border-emerald-500/80 rounded-full text-[8.5px] font-hud font-bold leading-none shadow z-10">
                    {item.badgeScore}%
                  </span>
                  {item.statusBadge && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-950 text-red-200 border border-red-500 rounded text-[7.5px] font-hud font-bold leading-none shadow z-20">
                      {item.statusBadge === 'BANNED' ? '🚫 BANNED' : '🔒 PICKED'}
                    </span>
                  )}
                </div>

                {/* Hero Details */}
                <div className="flex flex-col text-left">
                  <span className="font-hud font-bold text-xs sm:text-[13px] text-slate-200 leading-tight">
                    {item.hero.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="text-emerald-400 font-semibold">{item.winRate}% WR</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-sky-400 font-semibold">{item.pickRate}% PR</span>
                  </div>
                </div>
              </button>
            ))}

            {topMetaPriority.length === 0 && (
              <span className="text-slate-500 text-xs italic py-1">
                No priority heroes registered for this lane.
              </span>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* REQUIREMENT 3 & 4: 2-COLUMN TACTICAL INTEL LAYOUT         */
        /* ========================================================= */
        <div className="flex flex-col gap-1.5 w-full animate-fadeIn">
          {/* Top Sub-Row: Slot Target Indicator (Left) & Comp Balance (Right) */}
          <div className="flex items-center justify-between w-full">
            {/* Left: Slot Target Indicator Badge */}
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

          {/* 2-Column Tactical Intel Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/50">
            {/* ===================================================== */}
            {/* LEFT COLUMN: 🟢 POSITIVE / PICK RECOMMENDATIONS       */}
            {/* ===================================================== */}
            <div className="flex flex-col gap-1.5 bg-slate-900/40 border border-emerald-500/20 rounded-lg p-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                <div className="flex items-center gap-1.5 font-hud font-bold text-[10.5px] uppercase tracking-wider text-emerald-400">
                  <ThumbsUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  <span>POSITIVE RECOMMENDATIONS</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">
                  {activeRankOption.badgeLabel}
                </span>
              </div>

              {/* 1. Advantage vs Enemy (Best Counters) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9.5px] font-hud font-bold text-slate-300 uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Swords className="h-2.5 w-2.5 text-emerald-400" />
                    <span>Advantage vs Enemy (Best Counters)</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {tacticalColumns.bestCounters.map((group) => (
                    <div
                      key={`grp-counter-${group.targetHero.id}`}
                      className="flex items-center gap-2 flex-wrap py-0.5"
                    >
                      {/* Target Locked Enemy (Avatar only) */}
                      <button
                        type="button"
                        onClick={() => setInspectedHero(group.targetHero)}
                        className="relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-hidden border border-rose-500/80 bg-slate-950 shrink-0 cursor-pointer hover:border-rose-300 hover:scale-105 active:scale-95 transition shadow-sm"
                        title={`Locked Enemy: ${group.targetHero.name} (Click to inspect)`}
                      >
                        <img
                          src={group.targetHero.avatar}
                          alt={group.targetHero.name}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <ArrowRight className="h-3 w-3 text-emerald-400 shrink-0 mx-0.5" />

                      {/* Candidates for this enemy (Avatar only) */}
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        {group.candidates.map((cand) => (
                          <button
                            key={`cand-counter-${cand.hero.id}`}
                            type="button"
                            onClick={() => !cand.isUnavailable && handleHeroChipClick(cand.hero)}
                            disabled={cand.isUnavailable}
                            className={`relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible shrink-0 transition-transform duration-150 ${
                              cand.isUnavailable
                                ? 'opacity-40 pointer-events-none'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            }`}
                            title={cand.tooltip}
                          >
                            <div className="h-full w-full rounded-full overflow-hidden border border-emerald-500/80 bg-slate-950 shadow-sm">
                              <img
                                src={cand.hero.avatar}
                                alt={cand.hero.name}
                                className={`h-full w-full object-cover ${cand.isUnavailable ? 'grayscale' : ''}`}
                              />
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-950/95 text-emerald-300 border border-emerald-500/80 rounded-full text-[7.5px] font-hud font-bold leading-none shadow z-10">
                              {cand.badgeScore}
                            </span>
                            {cand.statusBadge && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-950 text-red-200 border border-red-500 rounded text-[6.5px] font-hud font-bold leading-none shadow z-20">
                                {cand.statusBadge === 'BANNED' ? '🚫' : '🔒'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {tacticalColumns.bestCounters.length === 0 && (
                    <span className="text-slate-500 text-[10px] italic py-0.5">
                      {opposingLocked.length === 0 ? 'Awaiting opponent locks' : 'No direct lane counters recorded'}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Best Teammates (Compatible) */}
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/40">
                <div className="flex items-center justify-between text-[10px] font-hud font-bold text-slate-300 uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Users className="h-3 w-3 text-cyan-400" />
                    <span>Best Teammates (Compatible)</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {tacticalColumns.bestTeammates.map((group) => (
                    <div
                      key={`grp-compat-${group.targetHero.id}`}
                      className="flex items-center gap-2 flex-wrap py-0.5"
                    >
                      {/* Target Locked Ally (Avatar only) */}
                      <button
                        type="button"
                        onClick={() => setInspectedHero(group.targetHero)}
                        className="relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-hidden border border-cyan-500/80 bg-slate-950 shrink-0 cursor-pointer hover:border-cyan-300 hover:scale-105 active:scale-95 transition shadow-sm"
                        title={`Locked Teammate: ${group.targetHero.name} (Click to inspect)`}
                      >
                        <img
                          src={group.targetHero.avatar}
                          alt={group.targetHero.name}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0 mx-0.5" />

                      {/* Candidates for this ally (Avatar only) */}
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        {group.candidates.map((cand) => (
                          <button
                            key={`cand-compat-${cand.hero.id}`}
                            type="button"
                            onClick={() => !cand.isUnavailable && handleHeroChipClick(cand.hero)}
                            disabled={cand.isUnavailable}
                            className={`relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible shrink-0 transition-transform duration-150 ${
                              cand.isUnavailable
                                ? 'opacity-40 pointer-events-none'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            }`}
                            title={cand.tooltip}
                          >
                            <div className="h-full w-full rounded-full overflow-hidden border border-cyan-500/80 bg-slate-950 shadow-sm">
                              <img
                                src={cand.hero.avatar}
                                alt={cand.hero.name}
                                className={`h-full w-full object-cover ${cand.isUnavailable ? 'grayscale' : ''}`}
                              />
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-cyan-950/95 text-cyan-300 border border-cyan-500/80 rounded-full text-[7.5px] font-hud font-bold leading-none shadow z-10">
                              {cand.badgeScore}
                            </span>
                            {cand.statusBadge && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-950 text-red-200 border border-red-500 rounded text-[6.5px] font-hud font-bold leading-none shadow z-20">
                                {cand.statusBadge === 'BANNED' ? '🚫' : '🔒'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {tacticalColumns.bestTeammates.length === 0 && (
                    <span className="text-slate-500 text-[10px] italic py-0.5">
                      {!hasOtherLockedAllies ? 'Awaiting locks from other lanes' : 'No compatible lane synergies found'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* RIGHT COLUMN: 🔴 RISK WARNINGS / AVOID               */}
            {/* ===================================================== */}
            <div className="flex flex-col gap-2 bg-slate-900/40 border border-rose-500/20 rounded-xl p-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                <div className="flex items-center gap-1.5 font-hud font-bold text-xs uppercase tracking-wider text-rose-400">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                  <span>RISK WARNINGS & AVOID</span>
                </div>
                <span className="text-[9.5px] text-slate-500 font-medium">
                  {activeRankOption.badgeLabel}
                </span>
              </div>

              {/* 3. Weak Against Enemy (Most Countered By) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-hud font-bold text-slate-300 uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-rose-300">
                    <Swords className="h-3 w-3 text-rose-400" />
                    <span>Weak Against Enemy (Countered By)</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {tacticalColumns.weakAgainst.map((group) => (
                    <div
                      key={`grp-weak-${group.targetHero.id}`}
                      className="flex items-center gap-2 flex-wrap py-0.5"
                    >
                      {/* Target Locked Enemy (Avatar only) */}
                      <button
                        type="button"
                        onClick={() => setInspectedHero(group.targetHero)}
                        className="relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-hidden border border-rose-500/80 bg-slate-950 shrink-0 cursor-pointer hover:border-rose-300 hover:scale-105 active:scale-95 transition shadow-sm"
                        title={`Locked Enemy: ${group.targetHero.name} (Click to inspect)`}
                      >
                        <img
                          src={group.targetHero.avatar}
                          alt={group.targetHero.name}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <ArrowRight className="h-3 w-3 text-rose-400 shrink-0 mx-0.5" />

                      {/* Vulnerable Candidates for this enemy (Avatar only) */}
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        {group.candidates.map((cand) => (
                          <button
                            key={`cand-weak-${cand.hero.id}`}
                            type="button"
                            onClick={() => !cand.isUnavailable && handleHeroChipClick(cand.hero)}
                            disabled={cand.isUnavailable}
                            className={`relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible shrink-0 transition-transform duration-150 ${
                              cand.isUnavailable
                                ? 'opacity-40 pointer-events-none'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            }`}
                            title={cand.tooltip}
                          >
                            <div className="h-full w-full rounded-full overflow-hidden border border-rose-500/80 bg-slate-950 shadow-sm">
                              <img
                                src={cand.hero.avatar}
                                alt={cand.hero.name}
                                className={`h-full w-full object-cover ${cand.isUnavailable ? 'grayscale' : ''}`}
                              />
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-rose-950/95 text-rose-300 border border-rose-500/80 rounded-full text-[7.5px] font-hud font-bold leading-none shadow z-10">
                              {cand.badgeScore}
                            </span>
                            {cand.statusBadge && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-950 text-red-200 border border-red-500 rounded text-[6.5px] font-hud font-bold leading-none shadow z-20">
                                {cand.statusBadge === 'BANNED' ? '🚫' : '🔒'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {tacticalColumns.weakAgainst.length === 0 && (
                    <span className="text-slate-500 text-[10px] italic py-0.5">
                      {opposingLocked.length === 0 ? 'Awaiting opponent locks' : 'No major lane vulnerabilities detected'}
                    </span>
                  )}
                </div>
              </div>

              {/* 4. Poor Compatibility (Not Compatible) */}
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/40">
                <div className="flex items-center justify-between text-[10px] font-hud font-bold text-slate-300 uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-amber-300">
                    <ThumbsDown className="h-3 w-3 text-amber-400" />
                    <span>Poor Compatibility (Low Synergy)</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {tacticalColumns.poorCompatibility.map((group) => (
                    <div
                      key={`grp-poor-${group.targetHero.id}`}
                      className="flex items-center gap-2 flex-wrap py-0.5"
                    >
                      {/* Target Locked Ally (Avatar only) */}
                      <button
                        type="button"
                        onClick={() => setInspectedHero(group.targetHero)}
                        className="relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-hidden border border-cyan-500/80 bg-slate-950 shrink-0 cursor-pointer hover:border-cyan-300 hover:scale-105 active:scale-95 transition shadow-sm"
                        title={`Locked Teammate: ${group.targetHero.name} (Click to inspect)`}
                      >
                        <img
                          src={group.targetHero.avatar}
                          alt={group.targetHero.name}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <ArrowRight className="h-3 w-3 text-amber-400 shrink-0 mx-0.5" />

                      {/* Low Synergy Candidates for this ally (Avatar only) */}
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        {group.candidates.map((cand) => (
                          <button
                            key={`cand-poor-${cand.hero.id}`}
                            type="button"
                            onClick={() => !cand.isUnavailable && handleHeroChipClick(cand.hero)}
                            disabled={cand.isUnavailable}
                            className={`relative h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-full overflow-visible shrink-0 transition-transform duration-150 ${
                              cand.isUnavailable
                                ? 'opacity-40 pointer-events-none'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            }`}
                            title={cand.tooltip}
                          >
                            <div className="h-full w-full rounded-full overflow-hidden border border-amber-500/80 bg-slate-950 shadow-sm">
                              <img
                                src={cand.hero.avatar}
                                alt={cand.hero.name}
                                className={`h-full w-full object-cover ${cand.isUnavailable ? 'grayscale' : ''}`}
                              />
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-amber-950/95 text-amber-300 border border-amber-500/80 rounded-full text-[7.5px] font-hud font-bold leading-none shadow z-10">
                              {cand.badgeScore}
                            </span>
                            {cand.statusBadge && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-950 text-red-200 border border-red-500 rounded text-[6.5px] font-hud font-bold leading-none shadow z-20">
                                {cand.statusBadge === 'BANNED' ? '🚫' : '🔒'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {tacticalColumns.poorCompatibility.length === 0 && (
                    <span className="text-slate-500 text-[10px] italic py-0.5">
                      {!hasOtherLockedAllies ? 'Awaiting locks from other lanes' : 'No major lineup clashes identified'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalIntelStrip;
