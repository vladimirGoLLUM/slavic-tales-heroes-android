import type { StatusEffect, EffectApplication, EffectType } from '@/types/game';
import { isDotType, isCCType, isBuffType, isDebuffType } from '@/types/game';
import type { BattleUnit } from '@/ai/enemyAI';

/** Generate a unique effect ID */
let _effCounter = 0;
function uid(): string {
  return `eff-${Date.now()}-${++_effCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Maximum stacks: buffs = 3, debuffs = 5, others = unlimited */
function getStackLimit(type: EffectType): number {
  if (isBuffType(type)) return 3;
  if (isDebuffType(type)) return 5;
  return Infinity;
}

/** Apply a single effect to a unit (respecting chance). Returns updated unit and whether it was applied. */
export function applyEffect(
  unit: BattleUnit,
  app: EffectApplication,
  sourceId: string
): { unit: BattleUnit; applied: boolean } {
  // Roll chance
  if (Math.random() > app.chance) {
    return { unit, applied: false };
  }

  // For CC, check resistance (resistance reduces chance by up to 50%)
  if (isCCType(app.type)) {
    const resistReduction = Math.min(50, unit.champion.baseStats.resistance * 0.5);
    if (Math.random() * 100 < resistReduction) {
      return { unit, applied: false };
    }
  }

  const newEffect: StatusEffect = {
    id: uid(),
    type: app.type,
    value: app.value,
    duration: app.duration,
    sourceId,
  };

  let effects = [...unit.effects];

  // Same source, same type → refresh duration only (no new stack)
  const sameSourceIdx = effects.findIndex(e => e.type === app.type && e.sourceId === sourceId);
  if (sameSourceIdx >= 0) {
    effects[sameSourceIdx] = {
      ...effects[sameSourceIdx],
      duration: Math.max(effects[sameSourceIdx].duration, app.duration),
      value: app.value, // update value too in case it changed
    };
    return { unit: { ...unit, effects }, applied: true };
  }

  // Count existing effects of same type (from different sources)
  const sameType = effects.filter(e => e.type === app.type);
  const limit = getStackLimit(app.type);

  if (sameType.length < limit) {
    // Under limit — simply add
    effects.push(newEffect);
  } else {
    // At limit — replace the one with smallest remaining duration
    const oldest = sameType.reduce((min, e) => e.duration < min.duration ? e : min, sameType[0]);
    effects = effects.filter(e => e.id !== oldest.id);
    effects.push(newEffect);
  }

  return { unit: { ...unit, effects }, applied: true };
}

/** Process effects at start of turn: apply DoT damage, reduce durations, remove expired. Returns unit and total DoT damage taken. */
export function processEffects(unit: BattleUnit): { unit: BattleUnit; dotDamage: number } {
  let dotDamage = 0;
  let currentHp = unit.currentHp;

  // Apply DoT
  for (const eff of unit.effects) {
    if (isDotType(eff.type)) {
      const tick = Math.floor(unit.maxHp * eff.value / 100);
      dotDamage += tick;
      currentHp = Math.max(0, currentHp - tick);
    }
    // Heal over time
    if (eff.type === 'heal_over_time') {
      const heal = Math.floor(unit.maxHp * eff.value / 100);
      currentHp = Math.min(unit.maxHp, currentHp + heal);
    }
  }

  // Reduce durations and remove expired — but DON'T tick CC effects here (they tick when the turn is skipped)
  const effects = unit.effects
    .map(e => isCCType(e.type) ? e : { ...e, duration: e.duration - 1 })
    .filter(e => e.duration > 0);

  return {
    unit: { ...unit, currentHp, effects },
    dotDamage,
  };
}

/** Check if unit has a specific effect type */
export function hasEffect(unit: BattleUnit, type: EffectType): boolean {
  return unit.effects.some(e => e.type === type);
}

/** Check if unit is CC'd (stunned, frozen, sleeping, feared) */
export function isCC(unit: BattleUnit): boolean {
  return unit.effects.some(e => isCCType(e.type));
}

/** Tick CC durations after a CC'd turn is skipped. Returns updated unit. */
export function tickCCEffects(unit: BattleUnit): BattleUnit {
  const effects = unit.effects
    .map(e => isCCType(e.type) ? { ...e, duration: e.duration - 1 } : e)
    .filter(e => e.duration > 0);
  return { ...unit, effects };
}

/** Cleanse: remove debuffs (all or specific types) */
export function cleanse(unit: BattleUnit, types?: EffectType[]): BattleUnit {
  const effects = types
    ? unit.effects.filter(e => !types.includes(e.type))
    : unit.effects.filter(e => !e.type.endsWith('_down') && !isDotType(e.type) && !isCCType(e.type));
  return { ...unit, effects };
}

/** Apply damage to a unit, absorbing with shield first. Returns updated unit and actual HP damage taken. */
export function applyDamageWithShield(unit: BattleUnit, damage: number): { unit: BattleUnit; actualDamage: number; shieldAbsorbed: number } {
  if (damage <= 0) return { unit, actualDamage: 0, shieldAbsorbed: 0 };

  let remaining = damage;
  let shieldAbsorbed = 0;
  let effects = [...unit.effects];

  // Absorb damage with shield effects
  for (let i = 0; i < effects.length && remaining > 0; i++) {
    if (effects[i].type === 'shield') {
      const shieldHp = Math.floor(unit.maxHp * effects[i].value / 100);
      const absorbed = Math.min(shieldHp, remaining);
      shieldAbsorbed += absorbed;
      remaining -= absorbed;
      if (absorbed >= shieldHp) {
        effects[i] = { ...effects[i], duration: 0 }; // mark for removal
      } else {
        // Convert remaining shield back to percentage, rounded to avoid float errors
        const remainingShieldHp = shieldHp - absorbed;
        effects[i] = { ...effects[i], value: Math.round(remainingShieldHp / unit.maxHp * 10000) / 100 };
      }
    }
  }

  effects = effects.filter(e => e.duration > 0);
  const newHp = Math.max(0, unit.currentHp - remaining);

  return {
    unit: { ...unit, currentHp: newHp, effects },
    actualDamage: remaining,
    shieldAbsorbed,
  };
}

/** Get stat modifier from effects. Returns multiplier (e.g., 1.2 for +20%) */
export function getStatMultiplier(unit: BattleUnit, stat: 'atk' | 'def' | 'spd' | 'critChance' | 'critDmg' | 'accuracy' | 'resistance'): number {
  let mult = 1.0;
  const upType = `${stat === 'critChance' ? 'crit' : stat === 'critDmg' ? 'critdmg' : stat === 'accuracy' ? 'acc' : stat === 'resistance' ? 'res' : stat}_up` as EffectType;
  const downType = `${stat === 'critChance' ? 'crit' : stat === 'critDmg' ? 'critdmg' : stat === 'accuracy' ? 'acc' : stat === 'resistance' ? 'res' : stat}_down` as EffectType;

  for (const eff of unit.effects) {
    if (eff.type === upType) mult += eff.value / 100;
    if (eff.type === downType) mult -= eff.value / 100;
  }

  return Math.max(0.1, mult); // floor at 10%
}
