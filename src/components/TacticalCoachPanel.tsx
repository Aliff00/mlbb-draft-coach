import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Swords,
} from 'lucide-react';
import { ALL_HEROES, useDraftStore } from '../store/useDraftStore';
import {
  DEDICATED_LANES,
  getHeroDamageType,
  Hero,
  MAP_EFFECTS_CONFIG,
} from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { LaneIcon } from './LaneIcon';

export const TacticalCoachPanel: React.FC = () => {
  const {
    bluePicks,
    redPicks,
    blueBans,
    redBans,
    mapTrait,
    activeSlot,
    placeHero,
  } = useDraftStore();

  const mapConfig = MAP_EFFECTS_CONFIG[mapTrait];

  // 1. Lane Gap Tracker
  const blueMissingLanes = DEDICATED_LANES.filter(
    (cfg) => !bluePicks[cfg.index]
  );
  const redMissingLanes = DEDICATED_LANES.filter((cfg) => !redPicks[cfg.index]);

  // 2. Damage Ratio Calculations
  const calculateDamageProfile = (picks: (Hero | null)[]) => {
    const filled = picks.filter(Boolean) as Hero[];
    if (filled.length === 0) {
      return { physicalPct: 50, magicPct: 50, isPurePhysical: false, isPureMagic: false, count: 0 };
    }

    let physicalScore = 0;
    let magicScore = 0;

    for (const hero of filled) {
      const type = getHeroDamageType(hero);
      if (type === 'PHYSICAL') physicalScore += 1;
      else if (type === 'MAGIC') magicScore += 1;
      else {
        physicalScore += 0.5;
        magicScore += 0.5;
      }
    }

    const total = physicalScore + magicScore;
    const physicalPct = Math.round((physicalScore / total) * 100);
    const magicPct = 100 - physicalPct;

    const isPurePhysical = filled.length >= 2 && magicScore === 0;
    const isPureMagic = filled.length >= 2 && physicalScore === 0;

    return {
      physicalPct,
      magicPct,
      isPurePhysical,
      isPureMagic,
      count: filled.length,
    };
  };

  const blueDamage = calculateDamageProfile(bluePicks);
  const redDamage = calculateDamageProfile(redPicks);

  // Set of already chosen heroes (banned or picked)
  const unavailableHeroIds = new Set<string | number>();
  [...bluePicks, ...redPicks, ...blueBans, ...redBans].forEach((h) => {
    if (h) unavailableHeroIds.add(h.id);
  });

  // 3. Counter Recommendations
  // Active team is based on activeSlot, defaulting to BLUE
  const activeTeam = activeSlot?.team || 'BLUE';
  const enemyPicks = (activeTeam === 'BLUE' ? redPicks : bluePicks).filter(Boolean) as Hero[];
  const allyPicks = (activeTeam === 'BLUE' ? bluePicks : redPicks).filter(Boolean) as Hero[];

  // Tally counter recommendations from enemy picks
  const counterScores = new Map<number | string, { hero: Hero; score: number; counteredEnemyNames: string[] }>();

  enemyPicks.forEach((enemy) => {
    (enemy.counteredBy || []).forEach((rel) => {
      if (unavailableHeroIds.has(rel.id)) return;
      const fullHero = ALL_HEROES.find((h) => h.id === rel.id || h.slug === rel.slug);
      if (!fullHero) return;

      if (!counterScores.has(fullHero.id)) {
        counterScores.set(fullHero.id, { hero: fullHero, score: 0, counteredEnemyNames: [] });
      }
      const item = counterScores.get(fullHero.id)!;
      item.score += 1;
      item.counteredEnemyNames.push(enemy.name);
    });
  });

  const recommendedCounters = Array.from(counterScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Tally ally synergies
  const synergyScores = new Map<number | string, { hero: Hero; score: number; allyNames: string[] }>();
  allyPicks.forEach((ally) => {
    (ally.synergies || []).forEach((rel) => {
      if (unavailableHeroIds.has(rel.id)) return;
      const fullHero = ALL_HEROES.find((h) => h.id === rel.id || h.slug === rel.slug);
      if (!fullHero) return;

      if (!synergyScores.has(fullHero.id)) {
        synergyScores.set(fullHero.id, { hero: fullHero, score: 0, allyNames: [] });
      }
      const item = synergyScores.get(fullHero.id)!;
      item.score += 1;
      item.allyNames.push(ally.name);
    });
  });

  const recommendedSynergies = Array.from(synergyScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <aside className="w-full rounded-xl border border-slate-800/80 bg-slate-950/85 backdrop-blur-md p-2.5 shadow-2xl flex flex-col gap-2 select-none">
      {/* Top Row: Composition Health (Lane Gaps & Damage Ratio Gauges) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2 border-b border-slate-800/60">
        {/* Blue Team Composition */}
        <div className="flex flex-col gap-1 rounded-lg bg-blue-950/30 border border-blue-900/40 p-2">
          <div className="flex items-center justify-between text-[11px] font-hud">
            <span className="font-bold text-blue-400 flex items-center gap-1.5 uppercase">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Blue Team Intel
            </span>
            {blueDamage.isPurePhysical && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.2">
                <AlertTriangle className="h-2.5 w-2.5" />
                100% Phys (Armor Alert)
              </span>
            )}
            {blueDamage.isPureMagic && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-purple-300 bg-purple-500/20 border border-purple-500/40 rounded px-1.5 py-0.2">
                <AlertTriangle className="h-2.5 w-2.5" />
                100% Magic (Athena Alert)
              </span>
            )}
          </div>

          {/* Lane Gap Tracker */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-hud">
            <span className="text-slate-400 font-semibold">Lanes:</span>
            {blueMissingLanes.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[9px]">
                <CheckCircle2 className="h-3 w-3" />
                Comp Complete
              </span>
            ) : (
              blueMissingLanes.map((cfg) => (
                <span
                  key={cfg.lane}
                  className="inline-flex items-center gap-1 rounded bg-blue-950/80 border border-blue-500/30 px-1.5 py-0.2 text-[8px] font-black uppercase text-blue-300"
                >
                  <LaneIcon lane={cfg.lane} className="h-2.5 w-2.5" />
                  <span>{cfg.shortLabel}</span>
                </span>
              ))
            )}
          </div>

          {/* Damage Output Gauge */}
          {blueDamage.count > 0 && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              <div className="flex justify-between text-[9px] font-hud font-bold">
                <span className="text-orange-400">PHYS {blueDamage.physicalPct}%</span>
                <span className="text-purple-400">MAGIC {blueDamage.magicPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${blueDamage.physicalPct}%` }}
                />
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${blueDamage.magicPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Red Team Composition */}
        <div className="flex flex-col gap-1 rounded-lg bg-red-950/30 border border-red-900/40 p-2">
          <div className="flex items-center justify-between text-[11px] font-hud">
            <span className="font-bold text-red-400 flex items-center gap-1.5 uppercase">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Red Team Intel
            </span>
            {redDamage.isPurePhysical && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.2">
                <AlertTriangle className="h-2.5 w-2.5" />
                100% Phys (Armor Alert)
              </span>
            )}
            {redDamage.isPureMagic && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-purple-300 bg-purple-500/20 border border-purple-500/40 rounded px-1.5 py-0.2">
                <AlertTriangle className="h-2.5 w-2.5" />
                100% Magic (Athena Alert)
              </span>
            )}
          </div>

          {/* Lane Gap Tracker */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-hud">
            <span className="text-slate-400 font-semibold">Lanes:</span>
            {redMissingLanes.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[9px]">
                <CheckCircle2 className="h-3 w-3" />
                Comp Complete
              </span>
            ) : (
              redMissingLanes.map((cfg) => (
                <span
                  key={cfg.lane}
                  className="inline-flex items-center gap-1 rounded bg-red-950/80 border border-red-500/30 px-1.5 py-0.2 text-[8px] font-black uppercase text-red-300"
                >
                  <LaneIcon lane={cfg.lane} className="h-2.5 w-2.5" />
                  <span>{cfg.shortLabel}</span>
                </span>
              ))
            )}
          </div>

          {/* Damage Output Gauge */}
          {redDamage.count > 0 && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              <div className="flex justify-between text-[9px] font-hud font-bold">
                <span className="text-orange-400">PHYS {redDamage.physicalPct}%</span>
                <span className="text-purple-400">MAGIC {redDamage.magicPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${redDamage.physicalPct}%` }}
                />
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${redDamage.magicPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Live Tactical Recommendations */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 text-[10px] font-hud">
        {/* Recommended Counters */}
        <div className="flex-1 flex flex-col gap-1 bg-slate-900/60 rounded-lg p-2 border border-slate-800">
          <div className="flex items-center justify-between text-slate-300 font-bold uppercase tracking-wider text-[10px]">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Swords className="h-3.5 w-3.5" />
              <span>Recommended Counter-Picks</span>
            </span>
            <span className="text-[9px] text-slate-400">
              vs {enemyPicks.length} Enemy {enemyPicks.length === 1 ? 'Hero' : 'Heroes'}
            </span>
          </div>

          {recommendedCounters.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {recommendedCounters.map(({ hero, score, counteredEnemyNames }) => (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => placeHero(hero)}
                  title={`Counters ${counteredEnemyNames.join(', ')} — Click to assign`}
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-400 px-2 py-1 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 border border-amber-400/50">
                    <HeroAvatar hero={hero} variant="icon" />
                  </div>
                  <span className="font-bold text-slate-200 group-hover:text-amber-300">
                    {hero.name}
                  </span>
                  <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[8px] font-black text-amber-300">
                    +{score}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 py-1 italic">
              {enemyPicks.length === 0
                ? 'Assign heroes on the opposing team to unlock targeted counter-pick intel.'
                : 'No remaining hard counters in unselected hero pool.'}
            </div>
          )}
        </div>

        {/* Synergies & Map Mechanics */}
        <div className="flex-1 flex flex-col gap-1 bg-slate-900/60 rounded-lg p-2 border border-slate-800">
          <div className="flex items-center justify-between text-slate-300 font-bold uppercase tracking-wider text-[10px]">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Team Synergies & Map Favored</span>
            </span>
            <span className="text-[9px] text-slate-400">Map: {mapConfig.shortName}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {recommendedSynergies.length > 0 ? (
              recommendedSynergies.map(({ hero, allyNames }) => (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => placeHero(hero)}
                  title={`Synergy with ${allyNames.join(', ')} — Click to assign`}
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-400 px-2 py-1 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <div className="h-5 w-5 rounded-full overflow-hidden shrink-0 border border-sky-400/50">
                    <HeroAvatar hero={hero} variant="icon" />
                  </div>
                  <span className="font-bold text-slate-200 group-hover:text-sky-300">
                    {hero.name}
                  </span>
                </button>
              ))
            ) : (
              <div className="text-[10px] text-slate-400 py-1 italic">
                {allyPicks.length === 0
                  ? 'Assign heroes to view best synergy partners and battlefield combos.'
                  : `Draft favors ${mapConfig.shortName} specialists: ${mapConfig.tacticalTip}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
