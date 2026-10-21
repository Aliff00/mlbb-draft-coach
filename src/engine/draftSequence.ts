import { DraftMode } from '../types/draft';

export function getModeMetadata(mode: DraftMode): {
  title: string;
  shortTitle: string;
  banCount: number;
  description: string;
  category: 'RANKED' | 'TOURNAMENT' | 'FREEPLAY';
} {
  switch (mode) {
    case 'RANKED_EPIC':
      return {
        title: 'Ranked - Epic',
        shortTitle: 'Epic (3-Ban)',
        banCount: 3,
        description: '3 Blind Bans per team (duplicates allowed) • Snake Pick',
        category: 'RANKED',
      };
    case 'RANKED_LEGEND':
      return {
        title: 'Ranked - Legend',
        shortTitle: 'Legend (4-Ban)',
        banCount: 4,
        description: '4 Blind Bans per team (duplicates allowed) • Snake Pick',
        category: 'RANKED',
      };
    case 'RANKED_MYTHIC':
      return {
        title: 'Ranked - Mythic',
        shortTitle: 'Mythic (5-Ban)',
        banCount: 5,
        description: '5 Blind Bans per team (duplicates allowed) • Snake Pick',
        category: 'RANKED',
      };
    case 'TOURNAMENT_MPL':
      return {
        title: 'Tournament Mode',
        shortTitle: 'Tournament',
        banCount: 5,
        description: 'Phased 3+2 Alternating Bans & 3+2 Snake Picks (Official Esports)',
        category: 'TOURNAMENT',
      };
    case 'FREE_PRACTICE':
      return {
        title: 'Free Practice / Sandbox',
        shortTitle: 'Sandbox Practice',
        banCount: 5,
        description: 'No strict turn order, no timers — directly click any slot & hero to draft instantly',
        category: 'FREEPLAY',
      };
  }
}
