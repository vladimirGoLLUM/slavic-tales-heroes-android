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

/**
 * RAID-style ACC vs RES landing chance (non-linear curve).
 * At ACC = RES → 92% chance to land.
 * At ACC - RES >= 42 → 96.5% cap.
 * Minimum 3.5% chance to land (even with 0 ACC).
 * Minimum 3.5% chance to resist (even with huge ACC).
 */
export function getDebuffLandingChance(attackerAcc: number, defenderRes: number): number {
  const diff = attackerAcc - defenderRes;
  // Base 92% when equal, scales ~0.107 per point toward caps
  const raw = 92 + diff * 0.107;
  return Math.min(96.5, Math.max(3.5, raw));
}

/**
 * Apply a single effect to a unit (respecting skill chance + ACC vs RES for debuffs).
 * @param attackerAcc — effective accuracy of the caster (after buffs/artifacts).
 *   Pass undefined to skip ACC vs RES check (e.g. self-buffs, passives).
 * Returns { unit, applied, resisted } — resisted=true when blocked by ACC vs RES.
 */
export function applyEffect(
  unit: BattleUnit,
  app: EffectApplication,
  sourceId: string,
  attackerAcc?: number,
): { unit: BattleUnit; applied: boolean; resisted?: boolean; blocked?: boolean } {
  // 0pre. Boss immunity: hard block certain effect types
  if (unit.immuneEffects && unit.immuneEffects.includes(app.type)) {
    return { unit, applied: false, blocked: true };
  }

  // 0. Block Debuffs: if unit has block_debuffs buff, reject all debuffs
  if (isDebuffType(app.type) && hasEffect(unit, 'block_debuffs')) {
    return { unit, applied: false, blocked: true };
  }
  // 0b. Block Buffs: if unit has block_buffs debuff, reject all buffs
  if (isBuffType(app.type) && hasEffect(unit, 'block_buffs')) {
    return { unit, applied: false, blocked: true };
  }

  // 1. Roll skill chance first (innate ability chance)
  if (Math.random() > app.chance) {
    return { unit, applied: false };
  }

  // 2. ACC vs RES check for ALL debuffs & CC — skip for buffs / self-casts
  const needsAccCheck = isDebuffType(app.type) || isCCType(app.type);
  if (needsAccCheck && attackerAcc !== undefined) {
    const defenderRes = unit.champion.baseStats.resistance;
    const landChance = getDebuffLandingChance(attackerAcc, defenderRes);
    if (Math.random() * 100 >= landChance) {
      return { unit, applied: false, resisted: true };
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

/** Process effects at start of turn: apply DoT damage, detonate bombs, reduce durations, remove expired.
 *  Returns unit, total DoT damage taken, and bomb damage (ignores defense). */
export function processEffects(unit: BattleUnit): { unit: BattleUnit; dotDamage: number; bombDamage: number } {
  let dotDamage = 0;
  let bombDamage = 0;
  let currentHp = unit.currentHp;
  const isUnkillable = unit.effects.some(e => e.type === 'unkillable');
  const hpFloor = isUnkillable ? 1 : 0;

  // Apply DoT
  for (const eff of unit.effects) {
    if (isDotType(eff.type)) {
      const tick = Math.floor(unit.maxHp * eff.value / 100);
      dotDamage += tick;
      currentHp = Math.max(hpFloor, currentHp - tick);
    }
    if (eff.type === 'heal_over_time') {
      const healMult = getHealMultiplier(unit);
      const heal = Math.floor(unit.maxHp * eff.value / 100 * healMult);
      currentHp = Math.min(unit.maxHp, currentHp + heal);
    }
  }

  // Reduce durations (skip CC — they tick on skipped turn)
  let effects = unit.effects
    .map(e => isCCType(e.type) ? e : { ...e, duration: e.duration - 1 });

  // Detonate bombs at duration 0 (ignores defense!)
  for (const eff of effects) {
    if (eff.type === 'bomb' && eff.duration <= 0) {
      const dmg = Math.floor(unit.maxHp * eff.value / 100);
      bombDamage += dmg;
      currentHp = Math.max(hpFloor, currentHp - dmg);
    }
  }

  effects = effects.filter(e => e.duration > 0);

  return {
    unit: { ...unit, currentHp, effects },
    dotDamage,
    bombDamage,
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

/** Remove sleep effect when unit takes damage (RAID mechanic). Returns updated unit and whether sleep was removed. */
export function removeSleepOnDamage(unit: BattleUnit): { unit: BattleUnit; wokenUp: boolean } {
  const hasSleep = unit.effects.some(e => e.type === 'sleep');
  if (!hasSleep) return { unit, wokenUp: false };
  const effects = unit.effects.filter(e => e.type !== 'sleep');
  return { unit: { ...unit, effects }, wokenUp: true };
}

/** Get freeze damage reduction multiplier (0.75 if frozen, 1.0 otherwise) */
export function getFreezeDamageReduction(unit: BattleUnit): number {
  return unit.effects.some(e => e.type === 'freeze') ? 0.75 : 1.0;
}

/** Apply damage to a unit, absorbing with shield first. Applies freeze reduction, weaken, reflect, and removes sleep on hit. */
export function applyDamageWithShield(unit: BattleUnit, damage: number): { unit: BattleUnit; actualDamage: number; shieldAbsorbed: number; wokenUp: boolean; reflectDamage: number } {
  if (damage <= 0) return { unit, actualDamage: 0, shieldAbsorbed: 0, wokenUp: false, reflectDamage: 0 };

  // Block Damage: complete invulnerability
  if (hasEffect(unit, 'block_damage')) {
    return { unit, actualDamage: 0, shieldAbsorbed: 0, wokenUp: false, reflectDamage: 0 };
  }

  // Freeze: reduce incoming damage by 25%
  const freezeMult = getFreezeDamageReduction(unit);
  // Weaken: increase incoming damage by value% (stacks)
  let weakenMult = 1.0;
  for (const eff of unit.effects) {
    if (eff.type === 'weaken') weakenMult += (eff.value ?? 25) / 100;
  }
  let remaining = Math.floor(damage * freezeMult * weakenMult);

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
        const remainingShieldHp = shieldHp - absorbed;
        effects[i] = { ...effects[i], value: Math.round(remainingShieldHp / unit.maxHp * 10000) / 100 };
      }
    }
  }

  effects = effects.filter(e => e.duration > 0);
  // Unkillable: HP cannot drop below 1
  const hpFloor = effects.some(e => e.type === 'unkillable') ? 1 : 0;
  const newHp = Math.max(hpFloor, unit.currentHp - remaining);

  // Reflect Damage: calculate reflected amount
  let reflectDamage = 0;
  for (const eff of effects) {
    if (eff.type === 'reflect_damage' && remaining > 0) {
      reflectDamage += Math.floor(remaining * (eff.value ?? 15) / 100);
    }
  }

  // Sleep: remove on taking damage (RAID mechanic)
  let wokenUp = false;
  const hasSleep = effects.some(e => e.type === 'sleep');
  if (hasSleep && remaining > 0) {
    effects = effects.filter(e => e.type !== 'sleep');
    wokenUp = true;
  }

  return {
    unit: { ...unit, currentHp: newHp, effects },
    actualDamage: remaining,
    shieldAbsorbed,
    wokenUp,
    reflectDamage,
  };
}

/** Find an ally with ally_protection buff that can absorb damage for the target unit.
 *  Returns the index of the protector in the units array, or -1 if none found. */
export function findAllyProtector(units: BattleUnit[], targetIdx: number): number {
  const target = units[targetIdx];
  for (let i = 0; i < units.length; i++) {
    if (i === targetIdx) continue;
    const u = units[i];
    if (u.currentHp <= 0) continue;
    if (u.isEnemy !== target.isEnemy) continue;
    if (u.effects.some(e => e.type === 'ally_protection')) return i;
  }
  return -1;
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

/** Get heal reduction multiplier from heal_reduction debuffs. Returns e.g. 0.5 for -50% healing. */
export function getHealMultiplier(unit: BattleUnit): number {
  let reduction = 0;
  for (const eff of unit.effects) {
    if (eff.type === 'heal_reduction') reduction += (eff.value ?? 50);
  }
  return Math.max(0, 1 - reduction / 100);
}
