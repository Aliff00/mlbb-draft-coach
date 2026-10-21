export type HeroRole =
  | 'FIGHTER'
  | 'MAGE'
  | 'MARKSMAN'
  | 'ASSASSIN'
  | 'TANK'
  | 'SUPPORT';

export type LaneRole = 'GOLD' | 'EXP' | 'MID' | 'JUNGLE' | 'ROAM';

export interface TacticalLaneConfig {
  index: number;
  lane: LaneRole;
  label: string;
  roleName: string;
  shortLabel: string;
}

export const DEDICATED_LANES: TacticalLaneConfig[] = [
  { index: 0, lane: 'EXP', label: 'EXP Lane', roleName: 'EXP Laner', shortLabel: 'EXP' },
  { index: 1, lane: 'JUNGLE', label: 'Jungler', roleName: 'Jungler', shortLabel: 'JUNGLE' },
  { index: 2, lane: 'MID', label: 'Mid Lane', roleName: 'Mid Laner', shortLabel: 'MID' },
  { index: 3, lane: 'ROAM', label: 'Roamer', roleName: 'Roamer', shortLabel: 'ROAM' },
  { index: 4, lane: 'GOLD', label: 'Gold Lane', roleName: 'Gold Laner', shortLabel: 'GOLD' },
];

export interface ActiveBoardSlot {
  type: 'PICK' | 'BAN';
  team: TeamSide;
  index: number;
}

export type TeamSide = 'BLUE' | 'RED';

export type DraftMode =
  | 'RANKED_EPIC'
  | 'RANKED_LEGEND'
  | 'RANKED_MYTHIC'
  | 'TOURNAMENT_MPL'
  | 'FREE_PRACTICE';

export type MapTraitType =
  | 'standard'
  | 'broken_walls'
  | 'dangerous_grass'
  | 'flying_cloud'
  | 'expanding_rivers';

// Backwards-compatibility alias
export type MapEffectType = MapTraitType;

export interface MapEffectConfig {
  id: MapTraitType;
  name: string;
  shortName: string;
  badgeLabel: string;
  description: string;
  tacticalTip: string;
  synergyHeroIds: string[];
}

export const MAP_EFFECTS_CONFIG: Record<MapTraitType, MapEffectConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard Map (Sanctum Island)',
    shortName: 'Standard',
    badgeLabel: 'STANDARD MAP',
    description: 'Classic Sanctum Island battlefield layout without terrain modifications.',
    tacticalTip: 'Balanced map for traditional lane play, objective timings, and draft meta.',
    synergyHeroIds: [],
  },
  broken_walls: {
    id: 'broken_walls',
    name: 'Broken Walls',
    shortName: 'Broken Walls',
    badgeLabel: 'BROKEN WALLS',
    description: 'Collapsed walls, thinned barriers, and new jungle bypasses.',
    tacticalTip: 'Wall-reliant heroes (Fanny, Grock, Badang, Moskov, Johnson) gain altered pathing and ambush routes.',
    synergyHeroIds: ['fanny', 'grock', 'badang', 'moskov', 'johnson', 'hilda', 'ling', 'khufra', 'phoveus'],
  },
  dangerous_grass: {
    id: 'dangerous_grass',
    name: 'Dangerous Grass',
    shortName: 'Dangerous Grass',
    badgeLabel: 'DANGEROUS GRASS',
    description: 'Dense river/lane bushes and ambush focus.',
    tacticalTip: 'High value on vision control and ambush roamers (Hilda, Natalia, Mathilda, Kadita, Eudora).',
    synergyHeroIds: ['hilda', 'natalia', 'mathilda', 'eudora', 'aamon', 'kadita', 'helcurt', 'guinevere', 'saber', 'lesley'],
  },
  flying_cloud: {
    id: 'flying_cloud',
    name: 'Flying Cloud',
    shortName: 'Flying Cloud',
    badgeLabel: 'FLYING CLOUD',
    description: 'Base speed launchpads and fast flanking corridors.',
    tacticalTip: 'Long-range artillery, aerial mobile assassins, and rapid base defenders have the upper hand.',
    synergyHeroIds: ['pharsa', 'novaria', 'ling', 'fanny', 'lesley', 'xavier', 'moskov', 'claude'],
  },
  expanding_rivers: {
    id: 'expanding_rivers',
    name: 'Expanding Rivers',
    shortName: 'Expanding Rivers',
    badgeLabel: 'EXPANDING RIVERS',
    description: 'Faster river currents and accelerated river rotations.',
    tacticalTip: 'High-speed roamers and river-clash specialists rotate swiftly between sidelanes.',
    synergyHeroIds: ['kadita', 'baxia', 'chou', 'martis', 'jawhead', 'chip', 'hylos', 'grock'],
  },
};

export type ActionType = 'BAN' | 'PICK';

export interface HeroRelationItem {
  id: number;
  hero_id?: number;
  slug: string;
  name: string;
  avatar: string;
  counter_score?: number;
  compatibility_score?: number;
  synergy_score?: number;
  win_rate?: number;
  delta_score?: number;
}

export interface HeroCounterTips {
  counters?: string;
  counteredBy?: string;
  synergies?: string;
}

export interface HeroSkillSummary {
  name: string;
  tags: string[];
  description: string;
}

export interface HeroRatings {
  durability: number;
  offense: number;
  control: number;
  difficulty: number;
}

export interface Hero {
  id: number | string;
  hero_id?: number;
  slug?: string;
  name: string;
  role?: HeroRole | string;
  roles: (HeroRole | string)[];
  specialties?: string[];
  specialty: string;
  lane: string;
  lanes?: (LaneRole | string)[];
  damage_type?: string;
  damageType?: string;
  win_rate?: number;
  winRate?: number;
  pick_rate?: number;
  pickRate?: number;
  ban_rate?: number;
  banRate?: number;
  avatar?: string;
  banner?: string;
  bannerPosition?: string;
  image: string;
  counters?: HeroRelationItem[];
  counteredBy?: HeroRelationItem[];
  synergies?: HeroRelationItem[];
  best_counters?: HeroRelationItem[];
  countered_by?: HeroRelationItem[];
  most_compatible?: HeroRelationItem[];
  least_compatible?: HeroRelationItem[];
  counterTips?: HeroCounterTips;
  skills?: HeroSkillSummary[];
  ratings?: HeroRatings;
}

export function doesHeroMatchList(hero: Hero, list: string[]): boolean {
  const idStr = String(hero.id).toLowerCase();
  const slugStr = (hero.slug || '').toLowerCase();
  return list.some((item) => {
    const target = item.toLowerCase();
    return target === idStr || (slugStr && target === slugStr);
  });
}

const KNOWN_MAGIC_HERO_SLUGS = new Set([
  'uranus',
  'kaja',
  'baxia',
  'edith',
  'gloo',
  'johnson',
  'hylos',
  'gatotkaca',
  'belerick',
  'esmeralda',
  'alice',
  'silvanna',
  'guinevere',
  'natan',
  'kimmy',
  'julian',
  'harith',
]);

export function getHeroDamageType(
  hero: Hero | null | undefined
): 'MAGIC' | 'PHYSICAL' | 'MIXED' {
  if (!hero) return 'PHYSICAL';
  const spec = ((hero.specialties || []).concat(hero.specialty || ''))
    .join(' ')
    .toLowerCase();
  const roles = (hero.roles || []).map((r) => String(r).toLowerCase());
  const slug = (hero.slug || hero.name.toLowerCase()).trim();
  if (spec.includes('mixed damage')) return 'MIXED';
  if (
    spec.includes('magic') ||
    roles.includes('mage') ||
    KNOWN_MAGIC_HERO_SLUGS.has(slug)
  ) {
    return 'MAGIC';
  }
  return 'PHYSICAL';
}
