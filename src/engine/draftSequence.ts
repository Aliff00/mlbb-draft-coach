import { DraftMode, DraftStep } from '../types/draft';

export function getBanCountForMode(mode: DraftMode): number {
  switch (mode) {
    case 'RANKED_EPIC':
      return 3;
    case 'RANKED_LEGEND':
      return 4;
    case 'RANKED_MYTHIC':
    case 'TOURNAMENT_MPL':
    case 'FREE_PRACTICE':
      return 5;
  }
}

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

/**
 * Generates a Ranked Blind-Ban + Snake-Pick sequence for Epic (3), Legend (4), or Mythic (5) bans per team.
 */
function buildRankedBlindSequence(bansPerTeam: number): DraftStep[] {
  const steps: DraftStep[] = [];
  let stepIndex = 0;

  // Blue blind bans (1..N)
  for (let i = 0; i < bansPerTeam; i++) {
    steps.push({
      index: stepIndex++,
      team: 'BLUE',
      action: 'BAN',
      slotIndex: i,
      phaseLabel: 'BLIND BAN PHASE',
      subLabel: `Blue Ban ${i + 1} (Blind)`,
      allowCrossTeamDuplicate: true,
      turnGroup: 1,
    });
  }

  // Red blind bans (1..N)
  for (let i = 0; i < bansPerTeam; i++) {
    steps.push({
      index: stepIndex++,
      team: 'RED',
      action: 'BAN',
      slotIndex: i,
      phaseLabel: 'BLIND BAN PHASE',
      subLabel: `Red Ban ${i + 1} (Blind)`,
      allowCrossTeamDuplicate: true,
      turnGroup: 1,
    });
  }

  // Standard Snake Pick Phase: Blue 1 -> Red 1, 2 -> Blue 2, 3 -> Red 3, 4 -> Blue 4, 5 -> Red 5
  const pickOrder: Array<{
    team: 'BLUE' | 'RED';
    slotIndex: number;
    subLabel: string;
    turnGroup: number;
  }> = [
    { team: 'BLUE', slotIndex: 0, subLabel: 'Blue Pick 1 (B1)', turnGroup: 2 },
    { team: 'RED', slotIndex: 0, subLabel: 'Red Pick 1 (R1)', turnGroup: 3 },
    { team: 'RED', slotIndex: 1, subLabel: 'Red Pick 2 (R2)', turnGroup: 3 },
    { team: 'BLUE', slotIndex: 1, subLabel: 'Blue Pick 2 (B2)', turnGroup: 4 },
    { team: 'BLUE', slotIndex: 2, subLabel: 'Blue Pick 3 (B3)', turnGroup: 4 },
    { team: 'RED', slotIndex: 2, subLabel: 'Red Pick 3 (R3)', turnGroup: 5 },
    { team: 'RED', slotIndex: 3, subLabel: 'Red Pick 4 (R4)', turnGroup: 5 },
    { team: 'BLUE', slotIndex: 3, subLabel: 'Blue Pick 4 (B4)', turnGroup: 6 },
    { team: 'BLUE', slotIndex: 4, subLabel: 'Blue Pick 5 (B5)', turnGroup: 6 },
    { team: 'RED', slotIndex: 4, subLabel: 'Red Pick 5 (R5)', turnGroup: 7 },
  ];

  for (const pick of pickOrder) {
    steps.push({
      index: stepIndex++,
      team: pick.team,
      action: 'PICK',
      slotIndex: pick.slotIndex,
      phaseLabel: 'PICK PHASE',
      subLabel: pick.subLabel,
      turnGroup: pick.turnGroup,
    });
  }

  return steps;
}

/**
 * Tournament / MPL (5-Ban Phased)
 */
export const TOURNAMENT_MPL_SEQUENCE: DraftStep[] = [
  // Phase 1 Bans (3 each)
  { index: 0, team: 'BLUE', action: 'BAN', slotIndex: 0, phaseLabel: 'BAN PHASE 1', subLabel: 'Blue Ban 1', turnGroup: 1 },
  { index: 1, team: 'RED', action: 'BAN', slotIndex: 0, phaseLabel: 'BAN PHASE 1', subLabel: 'Red Ban 1', turnGroup: 2 },
  { index: 2, team: 'BLUE', action: 'BAN', slotIndex: 1, phaseLabel: 'BAN PHASE 1', subLabel: 'Blue Ban 2', turnGroup: 3 },
  { index: 3, team: 'RED', action: 'BAN', slotIndex: 1, phaseLabel: 'BAN PHASE 1', subLabel: 'Red Ban 2', turnGroup: 4 },
  { index: 4, team: 'BLUE', action: 'BAN', slotIndex: 2, phaseLabel: 'BAN PHASE 1', subLabel: 'Blue Ban 3', turnGroup: 5 },
  { index: 5, team: 'RED', action: 'BAN', slotIndex: 2, phaseLabel: 'BAN PHASE 1', subLabel: 'Red Ban 3', turnGroup: 6 },

  // Phase 1 Picks (3 each): Blue 1 -> Red 1, 2 -> Blue 2, 3 -> Red 3
  { index: 6, team: 'BLUE', action: 'PICK', slotIndex: 0, phaseLabel: 'PICK PHASE 1', subLabel: 'Blue Pick 1 (B1)', turnGroup: 7 },
  { index: 7, team: 'RED', action: 'PICK', slotIndex: 0, phaseLabel: 'PICK PHASE 1', subLabel: 'Red Pick 1 (R1)', turnGroup: 8 },
  { index: 8, team: 'RED', action: 'PICK', slotIndex: 1, phaseLabel: 'PICK PHASE 1', subLabel: 'Red Pick 2 (R2)', turnGroup: 8 },
  { index: 9, team: 'BLUE', action: 'PICK', slotIndex: 1, phaseLabel: 'PICK PHASE 1', subLabel: 'Blue Pick 2 (B2)', turnGroup: 9 },
  { index: 10, team: 'BLUE', action: 'PICK', slotIndex: 2, phaseLabel: 'PICK PHASE 1', subLabel: 'Blue Pick 3 (B3)', turnGroup: 9 },
  { index: 11, team: 'RED', action: 'PICK', slotIndex: 2, phaseLabel: 'PICK PHASE 1', subLabel: 'Red Pick 3 (R3)', turnGroup: 10 },

  // Phase 2 Bans (2 each): Red -> Blue -> Red -> Blue
  { index: 12, team: 'RED', action: 'BAN', slotIndex: 3, phaseLabel: 'BAN PHASE 2', subLabel: 'Red Ban 4', turnGroup: 11 },
  { index: 13, team: 'BLUE', action: 'BAN', slotIndex: 3, phaseLabel: 'BAN PHASE 2', subLabel: 'Blue Ban 4', turnGroup: 12 },
  { index: 14, team: 'RED', action: 'BAN', slotIndex: 4, phaseLabel: 'BAN PHASE 2', subLabel: 'Red Ban 5', turnGroup: 13 },
  { index: 15, team: 'BLUE', action: 'BAN', slotIndex: 4, phaseLabel: 'BAN PHASE 2', subLabel: 'Blue Ban 5', turnGroup: 14 },

  // Phase 2 Picks (2 each): Red 4 -> Blue 4, 5 -> Red 5
  { index: 16, team: 'RED', action: 'PICK', slotIndex: 3, phaseLabel: 'PICK PHASE 2', subLabel: 'Red Pick 4 (R4)', turnGroup: 15 },
  { index: 17, team: 'BLUE', action: 'PICK', slotIndex: 3, phaseLabel: 'PICK PHASE 2', subLabel: 'Blue Pick 4 (B4)', turnGroup: 16 },
  { index: 18, team: 'BLUE', action: 'PICK', slotIndex: 4, phaseLabel: 'PICK PHASE 2', subLabel: 'Blue Pick 5 (B5)', turnGroup: 16 },
  { index: 19, team: 'RED', action: 'PICK', slotIndex: 4, phaseLabel: 'PICK PHASE 2', subLabel: 'Red Pick 5 (R5)', turnGroup: 17 },
];

export function getSequenceForMode(mode: DraftMode): DraftStep[] {
  switch (mode) {
    case 'RANKED_EPIC':
      return buildRankedBlindSequence(3);
    case 'RANKED_LEGEND':
      return buildRankedBlindSequence(4);
    case 'RANKED_MYTHIC':
      return buildRankedBlindSequence(5);
    case 'TOURNAMENT_MPL':
      return TOURNAMENT_MPL_SEQUENCE;
    case 'FREE_PRACTICE':
      return []; // Free practice has no fixed sequential order
  }
}
