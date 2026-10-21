import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import heroesData from '../data/heroes.json';
import {
  deleteDraftById,
  fetchUserDrafts,
  insertDraft,
  SavedDraft,
} from '../lib/supabase';
import {
  ActiveBoardSlot,
  DEDICATED_LANES,
  DraftMode,
  DraftSnapshot,
  DraftStep,
  Hero,
  HeroRole,
  LaneRole,
  MapEffectType,
  MapTraitType,
  TacticalFilterType,
  TeamSide,
  TurnDurationOption,
} from '../types/draft';

const createEmptySlots = (count: number): (Hero | null)[] =>
  Array.from({ length: count }, () => null);

export const ALL_HEROES: Hero[] = (heroesData as Hero[])
  .slice()
  .sort((a, b) => Number(a.id) - Number(b.id));

export type DraftStatus = 'idle' | 'drafting';

interface DraftState {
  // Board status & Team identities
  status: DraftStatus;
  isDraftStarted: boolean;
  mode: DraftMode;
  mapTrait: MapTraitType;
  selectedMapEffect: MapEffectType;
  blueTeamName: string;
  redTeamName: string;
  userTeamSide: 'blue' | 'red';
  setUserTeamSide: (side: 'blue' | 'red') => void;

  // Board Slots (Fixed 5 Lanes & 5 Quick Bans)
  bluePicks: (Hero | null)[];
  redPicks: (Hero | null)[];
  blueBans: (Hero | null)[];
  redBans: (Hero | null)[];

  // Active / Selected Slot on the Board
  activeSlot: ActiveBoardSlot | null;
  selectedHero: Hero | null;
  inspectedHero: Hero | null;
  setInspectedHero: (hero: Hero | null) => void;
  swapSource: { team: TeamSide; index: number } | null;
  draggedHero: Hero | null;
  draggedSlot: { type: 'PICK' | 'BAN'; team: TeamSide; index: number; hero: Hero | null } | null;
  setDraggedHero: (hero: Hero | null) => void;
  setDraggedSlot: (slot: { type: 'PICK' | 'BAN'; team: TeamSide; index: number; hero: Hero | null } | null) => void;

  // Filter & UI state
  roleFilter: 'ALL' | HeroRole;
  laneFilter: 'ALL' | LaneRole;
  searchQuery: string;
  mapSynergyOnly: boolean;
  tacticalFilter: TacticalFilterType;
  isFullscreen: boolean;

  // Legacy compatibility fields
  freePracticeTarget: ActiveBoardSlot | null;
  sequence: DraftStep[];
  currentStepIndex: number;
  history: DraftSnapshot[];
  timeLeft: number;
  isPaused: boolean;
  isInfiniteTime: boolean;
  rankedSubMode: 'RANKED_EPIC' | 'RANKED_LEGEND' | 'RANKED_MYTHIC';
  activeMechanics: string[];
  firstPickSide: TeamSide;
  turnDuration: TurnDurationOption;

  // Board Actions
  setActiveSlot: (slot: ActiveBoardSlot | null) => void;
  placeHero: (hero: Hero, targetSlot?: ActiveBoardSlot) => void;
  clearSlot: (type: 'PICK' | 'BAN', team: TeamSide, index: number) => void;
  swapSlots: (team: TeamSide, indexA: number, indexB: number) => void;
  swapBanSlots: (team: TeamSide, indexA: number, indexB: number) => void;
  moveOrSwapSlot: (
    source: { type: 'PICK' | 'BAN'; team: TeamSide; index: number },
    target: { type: 'PICK' | 'BAN'; team: TeamSide; index: number }
  ) => void;
  swapSides: () => void;
  resetBoard: () => void;

  // UI & Filter Setters
  setMapTrait: (trait: MapTraitType) => void;
  setSelectedMapEffect: (effect: MapEffectType) => void;
  setBlueTeamName: (name: string) => void;
  setRedTeamName: (name: string) => void;
  setRoleFilter: (role: 'ALL' | HeroRole) => void;
  setLaneFilter: (lane: 'ALL' | LaneRole) => void;
  setSearchQuery: (query: string) => void;
  setMapSynergyOnly: (active: boolean) => void;
  setTacticalFilter: (filter: TacticalFilterType) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  toggleFullscreen: () => void;

  // Supabase Auth & Cloud Draft Storage
  user: User | null;
  isAuthLoading: boolean;
  savedDrafts: SavedDraft[];
  isDraftsLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  loadDraft: (draft: SavedDraft) => void;
  fetchDrafts: () => Promise<void>;
  saveCurrentDraft: (title: string, notes?: string) => Promise<SavedDraft>;
  deleteDraft: (id: string) => Promise<void>;

  // Legacy compatibility handlers
  handleSlotClick: (type: 'BAN' | 'PICK', team: TeamSide, index: number) => void;
  handleSwapClick: (team: TeamSide, index: number) => void;
  selectHero: (hero: Hero) => void;
  confirmAction: () => void;
  skipBan: () => void;
  undoLastAction: () => void;
  resetDraft: () => void;
  startDraft: () => void;
  returnToLobby: () => void;
  tickTimer: () => void;
  togglePause: () => void;
  resetTurnTimer: () => void;
  toggleInfiniteTime: () => void;
  setMode: (mode: DraftMode) => void;
  setRankedSubMode: (subMode: 'RANKED_EPIC' | 'RANKED_LEGEND' | 'RANKED_MYTHIC') => void;
  toggleMechanic: (id: string) => void;
  setFirstPickSide: (side: TeamSide) => void;
  setTurnDuration: (duration: TurnDurationOption) => void;
  setStatus: (status: DraftStatus) => void;
  setFreePracticeTarget: (target: ActiveBoardSlot | null) => void;
}

export function checkHeroAvailability(
  hero: Hero,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any,
  arg6?: any
): { disabled: boolean; reason?: 'BANNED' | 'PICKED' } {
  let blueBans: (Hero | null)[] = [];
  let redBans: (Hero | null)[] = [];
  let bluePicks: (Hero | null)[] = [];
  let redPicks: (Hero | null)[] = [];

  if (Array.isArray(arg2)) {
    blueBans = arg2;
    redBans = arg3 || [];
    bluePicks = arg4 || [];
    redPicks = arg5 || [];
  } else {
    // legacy: (hero, currentStep, blueBans, redBans, bluePicks, redPicks)
    blueBans = arg3 || [];
    redBans = arg4 || [];
    bluePicks = arg5 || [];
    redPicks = arg6 || [];
  }

  const isBanned =
    blueBans.some((b) => b?.id === hero.id) ||
    redBans.some((b) => b?.id === hero.id);
  if (isBanned) {
    return { disabled: true, reason: 'BANNED' };
  }

  const isPicked =
    bluePicks.some((p) => p?.id === hero.id) ||
    redPicks.some((p) => p?.id === hero.id);
  if (isPicked) {
    return { disabled: true, reason: 'PICKED' };
  }

  return { disabled: false };
}

export const useDraftStore = create<DraftState>((set, get) => ({
  status: 'drafting',
  isDraftStarted: true,
  mode: 'FREE_PRACTICE',
  mapTrait: 'standard',
  selectedMapEffect: 'standard',
  blueTeamName: 'Blue Team',
  redTeamName: 'Red Team',
  userTeamSide: 'blue',
  setUserTeamSide: (userTeamSide) => set({ userTeamSide }),

  bluePicks: createEmptySlots(5),
  redPicks: createEmptySlots(5),
  blueBans: createEmptySlots(5),
  redBans: createEmptySlots(5),

  activeSlot: null,
  selectedHero: null,
  inspectedHero: null,
  setInspectedHero: (inspectedHero) => set({ inspectedHero }),
  swapSource: null,
  draggedHero: null,
  draggedSlot: null,
  setDraggedHero: (draggedHero) => set({ draggedHero }),
  setDraggedSlot: (draggedSlot) => set({ draggedSlot }),

  roleFilter: 'ALL',
  laneFilter: 'ALL',
  searchQuery: '',
  mapSynergyOnly: false,
  tacticalFilter: 'ALL',
  isFullscreen: false,

  // Legacy fields
  freePracticeTarget: null,
  sequence: [],
  currentStepIndex: 0,
  history: [],
  timeLeft: 0,
  isPaused: false,
  isInfiniteTime: true,
  rankedSubMode: 'RANKED_MYTHIC',
  activeMechanics: [],
  firstPickSide: 'BLUE',
  turnDuration: 30,

  setActiveSlot: (activeSlot) => {
    if (!activeSlot) {
      set({ activeSlot: null, freePracticeTarget: null, selectedHero: null });
      return;
    }

    const current = get().activeSlot;
    if (
      current &&
      current.type === activeSlot.type &&
      current.team === activeSlot.team &&
      current.index === activeSlot.index
    ) {
      // Toggle unselect when clicking the currently active target slot again
      set({ activeSlot: null, freePracticeTarget: null, selectedHero: null });
      return;
    }

    const state = get();
    const picks = activeSlot.team === 'BLUE' ? state.bluePicks : state.redPicks;
    const bans = activeSlot.team === 'BLUE' ? state.blueBans : state.redBans;
    const slotHero = activeSlot.type === 'PICK' ? picks[activeSlot.index] : bans[activeSlot.index];

    const nextLane =
      activeSlot.type === 'PICK' && activeSlot.index >= 0 && activeSlot.index < DEDICATED_LANES.length
        ? DEDICATED_LANES[activeSlot.index].lane
        : state.laneFilter;

    set({
      activeSlot,
      freePracticeTarget: activeSlot,
      laneFilter: nextLane,
      inspectedHero: null,
      selectedHero: slotHero || null,
    });
  },

  placeHero: (hero, targetSlot) => {
    const state = get();
    const target = targetSlot || state.activeSlot;

    // If no slot is selected or targeted on the board:
    // Simply select this hero for matchup and tactical intel without overwriting Player 1 or any slot!
    if (!target) {
      set({ selectedHero: hero });
      return;
    }

    const nextBluePicks = [...state.bluePicks];
    const nextRedPicks = [...state.redPicks];
    const nextBlueBans = [...state.blueBans];
    const nextRedBans = [...state.redBans];

    if (target.type === 'PICK') {
      if (target.team === 'BLUE') {
        nextBluePicks[target.index] = hero;
      } else {
        nextRedPicks[target.index] = hero;
      }
    } else {
      // Placing a Ban
      if (target.team === 'BLUE') {
        nextBlueBans[target.index] = hero;
      } else {
        nextRedBans[target.index] = hero;
      }
    }

    // Check if the entire board (all 10 picks and all 10 bans) is completely filled
    const isDraftComplete =
      nextBluePicks.every(Boolean) &&
      nextRedPicks.every(Boolean) &&
      nextBlueBans.every(Boolean) &&
      nextRedBans.every(Boolean);

    // If placed via drag-and-drop (targetSlot passed), do not change activeSlot.
    // If the entire draft is full, clear activeSlot so no accidental clicks overwrite players.
    const nextActiveSlot = targetSlot
      ? state.activeSlot
      : isDraftComplete
      ? null
      : target;

    set({
      bluePicks: nextBluePicks,
      redPicks: nextRedPicks,
      blueBans: nextBlueBans,
      redBans: nextRedBans,
      selectedHero: null,
      activeSlot: nextActiveSlot,
      freePracticeTarget: nextActiveSlot,
    });
  },

  clearSlot: (type, team, index) => {
    const state = get();
    // Do not auto-target the cleared slot.
    // If the cleared slot was the one selected, unselect it (null); otherwise preserve previous selection.
    const isClearingActive =
      state.activeSlot?.type === type &&
      state.activeSlot?.team === team &&
      state.activeSlot?.index === index;

    const nextActive = isClearingActive ? null : state.activeSlot;

    if (type === 'PICK') {
      if (team === 'BLUE') {
        const nextBluePicks = [...state.bluePicks];
        nextBluePicks[index] = null;
        set({
          bluePicks: nextBluePicks,
          activeSlot: nextActive,
          freePracticeTarget: nextActive,
          selectedHero: null,
        });
      } else {
        const nextRedPicks = [...state.redPicks];
        nextRedPicks[index] = null;
        set({
          redPicks: nextRedPicks,
          activeSlot: nextActive,
          freePracticeTarget: nextActive,
          selectedHero: null,
        });
      }
    } else {
      if (team === 'BLUE') {
        const nextBlueBans = [...state.blueBans];
        nextBlueBans[index] = null;
        set({
          blueBans: nextBlueBans,
          activeSlot: nextActive,
          freePracticeTarget: nextActive,
          selectedHero: null,
        });
      } else {
        const nextRedBans = [...state.redBans];
        nextRedBans[index] = null;
        set({
          redBans: nextRedBans,
          activeSlot: nextActive,
          freePracticeTarget: nextActive,
          selectedHero: null,
        });
      }
    }
  },

  swapSlots: (team, indexA, indexB) => {
    const state = get();
    if (team === 'BLUE') {
      const nextBluePicks = [...state.bluePicks];
      const temp = nextBluePicks[indexA];
      nextBluePicks[indexA] = nextBluePicks[indexB];
      nextBluePicks[indexB] = temp;
      set({ bluePicks: nextBluePicks, swapSource: null });
    } else {
      const nextRedPicks = [...state.redPicks];
      const temp = nextRedPicks[indexA];
      nextRedPicks[indexA] = nextRedPicks[indexB];
      nextRedPicks[indexB] = temp;
      set({ redPicks: nextRedPicks, swapSource: null });
    }
  },

  swapBanSlots: (team, indexA, indexB) => {
    const state = get();
    if (team === 'BLUE') {
      const nextBlueBans = [...state.blueBans];
      const temp = nextBlueBans[indexA];
      nextBlueBans[indexA] = nextBlueBans[indexB];
      nextBlueBans[indexB] = temp;
      set({ blueBans: nextBlueBans });
    } else {
      const nextRedBans = [...state.redBans];
      const temp = nextRedBans[indexA];
      nextRedBans[indexA] = nextRedBans[indexB];
      nextRedBans[indexB] = temp;
      set({ redBans: nextRedBans });
    }
  },

  moveOrSwapSlot: (source, target) => {
    if (
      source.type === target.type &&
      source.team === target.team &&
      source.index === target.index
    ) {
      return;
    }

    const state = get();
    const nextBluePicks = [...state.bluePicks];
    const nextRedPicks = [...state.redPicks];
    const nextBlueBans = [...state.blueBans];
    const nextRedBans = [...state.redBans];

    const getList = (type: 'PICK' | 'BAN', team: TeamSide) => {
      if (type === 'PICK') {
        return team === 'BLUE' ? nextBluePicks : nextRedPicks;
      }
      return team === 'BLUE' ? nextBlueBans : nextRedBans;
    };

    const sourceList = getList(source.type, source.team);
    const targetList = getList(target.type, target.team);

    const sourceHero = sourceList[source.index];
    const targetHero = targetList[target.index];

    // Move source hero to target slot, and if target had a hero, swap it into source slot (otherwise source becomes empty)
    targetList[target.index] = sourceHero;
    sourceList[source.index] = targetHero;

    // Check if the board is completely filled
    const isDraftComplete =
      nextBluePicks.every(Boolean) &&
      nextRedPicks.every(Boolean) &&
      nextBlueBans.every(Boolean) &&
      nextRedBans.every(Boolean);

    set({
      bluePicks: nextBluePicks,
      redPicks: nextRedPicks,
      blueBans: nextBlueBans,
      redBans: nextRedBans,
      selectedHero: sourceHero || targetHero || state.selectedHero,
      activeSlot: isDraftComplete ? null : state.activeSlot,
      freePracticeTarget: isDraftComplete ? null : state.freePracticeTarget,
      swapSource: null,
      draggedHero: null,
      draggedSlot: null,
    });
  },

  swapSides: () => {
    const state = get();
    const nextSide = state.userTeamSide === 'blue' ? 'red' : 'blue';
    set({
      userTeamSide: nextSide,
      activeSlot: state.activeSlot
        ? {
            ...state.activeSlot,
            team: state.activeSlot.team === 'BLUE' ? 'RED' : 'BLUE',
          }
        : null,
    });
  },

  resetBoard: () => {
    set({
      userTeamSide: 'blue',
      bluePicks: createEmptySlots(5),
      redPicks: createEmptySlots(5),
      blueBans: createEmptySlots(5),
      redBans: createEmptySlots(5),
      activeSlot: null,
      freePracticeTarget: null,
      selectedHero: null,
      inspectedHero: null,
      swapSource: null,
      laneFilter: 'ALL',
      searchQuery: '',
      tacticalFilter: 'ALL',
    });
  },

  setMapTrait: (mapTrait) => set({ mapTrait, selectedMapEffect: mapTrait }),
  setSelectedMapEffect: (selectedMapEffect) => set({ selectedMapEffect, mapTrait: selectedMapEffect }),
  setBlueTeamName: (blueTeamName) => set({ blueTeamName }),
  setRedTeamName: (redTeamName) => set({ redTeamName }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),
  setLaneFilter: (laneFilter) => set({ laneFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setMapSynergyOnly: (mapSynergyOnly) => set({ mapSynergyOnly }),
  setTacticalFilter: (tacticalFilter) => set({ tacticalFilter }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  toggleFullscreen: () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      set({ isFullscreen: true });
    } else {
      document.exitFullscreen().catch(() => {});
      set({ isFullscreen: false });
    }
  },

  // Legacy handlers for compatibility
  handleSlotClick: (type, team, index) => {
    get().setActiveSlot({ type, team, index });
  },

  handleSwapClick: (team, index) => {
    const state = get();
    if (!state.swapSource) {
      set({ swapSource: { team, index } });
      return;
    }
    if (state.swapSource.team !== team) {
      set({ swapSource: { team, index } });
      return;
    }
    if (state.swapSource.index === index) {
      set({ swapSource: null });
      return;
    }
    state.swapSlots(team, state.swapSource.index, index);
  },

  selectHero: (hero) => {
    get().placeHero(hero);
  },

  confirmAction: () => {},
  skipBan: () => {},
  undoLastAction: () => {},
  resetDraft: () => get().resetBoard(),
  startDraft: () => get().resetBoard(),
  returnToLobby: () => get().resetBoard(),
  tickTimer: () => {},
  togglePause: () => {},
  resetTurnTimer: () => {},
  toggleInfiniteTime: () => {},
  setMode: (mode) => set({ mode }),
  setRankedSubMode: (rankedSubMode) => set({ rankedSubMode }),
  toggleMechanic: () => {},
  setFirstPickSide: (firstPickSide) => set({ firstPickSide }),
  setTurnDuration: (turnDuration) => set({ turnDuration }),
  setStatus: (status) => set({ status }),
  setFreePracticeTarget: (freePracticeTarget) => get().setActiveSlot(freePracticeTarget),

  // Supabase Auth & Cloud Draft Storage
  user: null,
  isAuthLoading: true,
  savedDrafts: [],
  isDraftsLoading: false,

  setUser: (user) => set({ user }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  loadDraft: (draft) => {
    set({
      bluePicks: draft.blue_picks,
      blueBans: draft.blue_bans,
      redPicks: draft.red_picks,
      redBans: draft.red_bans,
      mapTrait: (draft.map_trait as MapTraitType) || 'standard',
      selectedMapEffect: (draft.map_trait as MapEffectType) || 'standard',
      activeSlot: null,
      selectedHero: null,
    });
  },

  fetchDrafts: async () => {
    const user = get().user;
    if (!user) {
      set({ savedDrafts: [] });
      return;
    }
    set({ isDraftsLoading: true });
    try {
      const drafts = await fetchUserDrafts(user.id);
      set({ savedDrafts: drafts });
    } catch (err) {
      console.error('fetchDrafts error:', err);
    } finally {
      set({ isDraftsLoading: false });
    }
  },

  saveCurrentDraft: async (title, notes) => {
    const state = get();
    if (!state.user) {
      throw new Error('Please sign in to save drafts permanently to the cloud.');
    }
    const payload = {
      user_id: state.user.id,
      title: title.trim() || 'MLBB Scrim Draft',
      map_trait: state.mapTrait || 'standard',
      blue_picks: state.bluePicks,
      blue_bans: state.blueBans,
      red_picks: state.redPicks,
      red_bans: state.redBans,
      notes: notes || '',
    };
    const saved = await insertDraft(payload);
    set({ savedDrafts: [saved, ...state.savedDrafts] });
    return saved;
  },

  deleteDraft: async (id) => {
    await deleteDraftById(id);
    set({ savedDrafts: get().savedDrafts.filter((d) => d.id !== id) });
  },
}));
