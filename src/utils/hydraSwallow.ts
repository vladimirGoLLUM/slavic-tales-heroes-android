/**
 * Hydra Swallow Mechanic
 * 
 * Flow:
 * 1. At battle start, a random player hero gets marked (Метка Гидры) with a countdown.
 * 2. Each boss turn, the countdown decreases by 1.
 * 3. When countdown reaches 0, the marked hero is swallowed.
 * 4. While swallowed, a digestion timer counts down (5 turns initially).
 * 5. Players can rescue the hero by dealing enough damage during digestion.
 * 6. If digestion completes, the hero is permanently removed (can't revive).
 * 7. After swallow or death of marked hero, mark passes to another hero.
 * 
 * Escalation:
 * - Each new mark reduces countdown by 1 (minimum 3).
 * - Each new swallow reduces digestion timer by 1 (minimum 2).
 */

import type { BattleUnit } from '@/ai/enemyAI';

export interface HydraSwallowState {
  /** ID of the currently marked hero (or null) */
  markedHeroId: string | null;
  /** Turns remaining before marked hero is swallowed */
  markCountdown: number;
  /** ID of the currently swallowed hero (or null) */
  swallowedHeroId: string | null;
  /** Turns remaining before swallowed hero is digested */
  digestionTimer: number;
  /** Damage needed to rescue the swallowed hero */
  rescueDamageRequired: number;
  /** Damage dealt to boss since swallow started */
  rescueDamageDealt: number;
  /** How many times a hero has been marked (for escalation) */
  totalMarks: number;
  /** How many times a hero has been swallowed (for escalation) */
  totalSwallows: number;
}

// Constants
const INITIAL_MARK_COUNTDOWN = 10;
const INITIAL_DIGESTION_TIMER = 5;
const MIN_MARK_COUNTDOWN = 3;
const MIN_DIGESTION_TIMER = 2;
/** Rescue damage = % of boss max HP */
const RESCUE_DAMAGE_PERCENT = 3;

export function createInitialSwallowState(): HydraSwallowState {
  return {
    markedHeroId: null,
    markCountdown: INITIAL_MARK_COUNTDOWN,
    swallowedHeroId: null,
    digestionTimer: INITIAL_DIGESTION_TIMER,
    rescueDamageRequired: 0,
    rescueDamageDealt: 0,
    totalMarks: 0,
    totalSwallows: 0,
  };
}

/** Pick a random alive, non-swallowed player hero to mark */
export function pickMarkTarget(units: BattleUnit[], excludeId?: string | null): string | null {
  const candidates = units.filter(u =>
    !u.isEnemy && u.currentHp > 0 && u.id !== excludeId
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

/** Initialize the mark on a hero at battle start */
export function initializeMark(
  state: HydraSwallowState,
  units: BattleUnit[],
): HydraSwallowState {
  const targetId = pickMarkTarget(units);
  if (!targetId) return state;
  const countdown = Math.max(MIN_MARK_COUNTDOWN, INITIAL_MARK_COUNTDOWN - state.totalMarks);
  return {
    ...state,
    markedHeroId: targetId,
    markCountdown: countdown,
    totalMarks: state.totalMarks + 1,
  };
}

export interface SwallowTickResult {
  state: HydraSwallowState;
  /** The hero that was just swallowed (for logging) */
  justSwallowed: string | null;
  /** The hero that was just digested/lost (for logging) */
  justDigested: string | null;
  /** New mark target (for logging) */
  newMarkTarget: string | null;
}

/**
 * Called each boss turn. Ticks down mark countdown and digestion timer.
 * Returns updated state and events for logging.
 */
export function tickSwallowMechanic(
  state: HydraSwallowState,
  units: BattleUnit[],
  bossMaxHp: number,
): SwallowTickResult {
  let newState = { ...state };
  let justSwallowed: string | null = null;
  let justDigested: string | null = null;
  let newMarkTarget: string | null = null;

  // 1. Tick digestion if someone is swallowed
  if (newState.swallowedHeroId) {
    newState.digestionTimer -= 1;
    if (newState.digestionTimer <= 0) {
      // Hero is digested — permanently dead
      justDigested = newState.swallowedHeroId;
      newState.swallowedHeroId = null;
      newState.rescueDamageDealt = 0;
      newState.rescueDamageRequired = 0;
    }
  }

  // 2. Tick mark countdown
  if (newState.markedHeroId) {
    // Check if marked hero is still alive
    const markedUnit = units.find(u => u.id === newState.markedHeroId);
    if (!markedUnit || markedUnit.currentHp <= 0) {
      // Marked hero died — pass mark to another hero
      const newTarget = pickMarkTarget(units, newState.swallowedHeroId);
      if (newTarget) {
        const countdown = Math.max(MIN_MARK_COUNTDOWN, INITIAL_MARK_COUNTDOWN - newState.totalMarks);
        newState.markedHeroId = newTarget;
        newState.markCountdown = countdown;
        newState.totalMarks += 1;
        newMarkTarget = newTarget;
      } else {
        newState.markedHeroId = null;
      }
    } else if (!newState.swallowedHeroId) {
      // Only tick if no one is currently being digested (boss can only swallow one at a time)
      newState.markCountdown -= 1;
      if (newState.markCountdown <= 0) {
        // Swallow the marked hero!
        justSwallowed = newState.markedHeroId;
        const digestionTimer = Math.max(MIN_DIGESTION_TIMER, INITIAL_DIGESTION_TIMER - newState.totalSwallows);
        newState.swallowedHeroId = newState.markedHeroId;
        newState.digestionTimer = digestionTimer;
        newState.rescueDamageRequired = Math.floor(bossMaxHp * RESCUE_DAMAGE_PERCENT / 100);
        newState.rescueDamageDealt = 0;
        newState.totalSwallows += 1;
        newState.markedHeroId = null;

        // Mark a new hero
        const newTarget = pickMarkTarget(units, justSwallowed);
        if (newTarget) {
          const countdown = Math.max(MIN_MARK_COUNTDOWN, INITIAL_MARK_COUNTDOWN - newState.totalMarks);
          newState.markedHeroId = newTarget;
          newState.markCountdown = countdown;
          newState.totalMarks += 1;
          newMarkTarget = newTarget;
        }
      }
    }
  } else if (!newState.swallowedHeroId) {
    // No one marked and no one swallowed — mark someone new
    const newTarget = pickMarkTarget(units, null);
    if (newTarget) {
      const countdown = Math.max(MIN_MARK_COUNTDOWN, INITIAL_MARK_COUNTDOWN - newState.totalMarks);
      newState.markedHeroId = newTarget;
      newState.markCountdown = countdown;
      newState.totalMarks += 1;
      newMarkTarget = newTarget;
    }
  }

  return { state: newState, justSwallowed, justDigested, newMarkTarget };
}

/**
 * Called when damage is dealt to the boss while a hero is swallowed.
 * Returns updated state and whether the hero was rescued.
 */
export function addRescueDamage(
  state: HydraSwallowState,
  damage: number,
): { state: HydraSwallowState; rescued: boolean } {
  if (!state.swallowedHeroId) return { state, rescued: false };
  
  const newDealt = state.rescueDamageDealt + damage;
  if (newDealt >= state.rescueDamageRequired) {
    return {
      state: {
        ...state,
        swallowedHeroId: null,
        rescueDamageDealt: 0,
        rescueDamageRequired: 0,
      },
      rescued: true,
    };
  }
  return {
    state: { ...state, rescueDamageDealt: newDealt },
    rescued: false,
  };
}

/** Apply swallow effect to units: set swallowed hero HP to 0 (removed from battle) */
export function applySwallowToUnits(units: BattleUnit[], heroId: string): BattleUnit[] {
  return units.map(u =>
    u.id === heroId ? { ...u, currentHp: 0, effects: [] } : u
  );
}

/** Restore a rescued hero with 30% HP */
export function restoreRescuedHero(units: BattleUnit[], heroId: string): BattleUnit[] {
  return units.map(u => {
    if (u.id !== heroId) return u;
    const restoredHp = Math.floor(u.maxHp * 0.3);
    return { ...u, currentHp: restoredHp, effects: [] };
  });
}
