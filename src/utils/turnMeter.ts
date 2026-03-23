import type { BattleUnit } from '@/ai/enemyAI';
import { getStatMultiplier } from '@/utils/effects';

export const TM_THRESHOLD = 1000;

/** Get effective speed for TM filling (base * buff/debuff multiplier) */
export function getEffectiveSpeed(unit: BattleUnit): number {
  const spd = unit.champion.baseStats.spd;
  const mult = getStatMultiplier(unit, 'spd');
  return Math.max(1, Math.floor(spd * mult));
}

/**
 * Tick all alive units' TM until someone reaches threshold.
 * Returns index of the unit who acts next + updated TM values for all units.
 * Overflow is preserved (TM above threshold carries over).
 */
export function tickToNextTurn(
  units: BattleUnit[],
): { nextUnitIndex: number; updatedMeters: number[] } {
  const meters = units.map(u => u.turnMeter ?? 0);
  const speeds = units.map(u => u.currentHp > 0 ? getEffectiveSpeed(u) : 0);

  // Check if anyone already above threshold (e.g. from TM boost)
  let maxTM = -1;
  let maxIdx = -1;
  for (let i = 0; i < meters.length; i++) {
    if (units[i].currentHp <= 0) continue;
    if (meters[i] >= TM_THRESHOLD && meters[i] > maxTM) {
      maxTM = meters[i];
      maxIdx = i;
    }
  }
  if (maxIdx >= 0) {
    meters[maxIdx] -= TM_THRESHOLD;
    return { nextUnitIndex: maxIdx, updatedMeters: meters };
  }

  // Tick until someone reaches threshold
  for (let tick = 0; tick < 50000; tick++) {
    for (let i = 0; i < meters.length; i++) {
      if (units[i].currentHp <= 0) continue;
      meters[i] += speeds[i];
    }

    maxTM = -1;
    maxIdx = -1;
    for (let i = 0; i < meters.length; i++) {
      if (units[i].currentHp <= 0) continue;
      if (meters[i] >= TM_THRESHOLD && meters[i] > maxTM) {
        maxTM = meters[i];
        maxIdx = i;
      }
    }

    if (maxIdx >= 0) {
      meters[maxIdx] -= TM_THRESHOLD;
      return { nextUnitIndex: maxIdx, updatedMeters: meters };
    }
  }

  // Fallback: first alive unit
  const fallback = units.findIndex(u => u.currentHp > 0);
  return { nextUnitIndex: fallback >= 0 ? fallback : 0, updatedMeters: meters };
}

/** Boost TM by percentage of threshold */
export function boostTurnMeter(currentTM: number, percent: number): number {
  return currentTM + TM_THRESHOLD * percent / 100;
}

/** Reduce TM by percentage of threshold */
export function reduceTurnMeter(currentTM: number, percent: number): number {
  return Math.max(0, currentTM - TM_THRESHOLD * percent / 100);
}

/** Predict next N turns by simulating TM ticks (non-mutating) */
export function predictTurnOrder(units: BattleUnit[], count: number = 8): number[] {
  const meters = units.map(u => u.turnMeter ?? 0);
  const speeds = units.map(u => u.currentHp > 0 ? getEffectiveSpeed(u) : 0);
  const order: number[] = [];

  for (let step = 0; step < count; step++) {
    // Check existing overflow first
    let maxTM = -1;
    let maxIdx = -1;
    for (let i = 0; i < meters.length; i++) {
      if (units[i].currentHp <= 0) continue;
      if (meters[i] >= TM_THRESHOLD && meters[i] > maxTM) {
        maxTM = meters[i];
        maxIdx = i;
      }
    }
    if (maxIdx >= 0) {
      meters[maxIdx] -= TM_THRESHOLD;
      order.push(maxIdx);
      continue;
    }

    let found = false;
    for (let tick = 0; tick < 50000; tick++) {
      for (let i = 0; i < meters.length; i++) {
        if (units[i].currentHp <= 0) continue;
        meters[i] += speeds[i];
      }

      maxTM = -1;
      maxIdx = -1;
      for (let i = 0; i < meters.length; i++) {
        if (units[i].currentHp <= 0) continue;
        if (meters[i] >= TM_THRESHOLD && meters[i] > maxTM) {
          maxTM = meters[i];
          maxIdx = i;
        }
      }

      if (maxIdx >= 0) {
        meters[maxIdx] -= TM_THRESHOLD;
        order.push(maxIdx);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  return order;
}
