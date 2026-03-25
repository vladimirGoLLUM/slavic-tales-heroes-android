import { type Champion, type Skill, type Element, ELEMENT_ADVANTAGE } from '@/data/gameData';
import { type Artifact, calculateArtifactStats } from '@/data/artifacts';
import type { BattleUnit } from '@/ai/enemyAI';
import { getStatMultiplier } from '@/utils/effects';

/**
 * Расчёт элементального множителя
 */
export function getElementMultiplier(attackerElement: Element, defenderElement: Element): number {
  const isAdvantage = ELEMENT_ADVANTAGE[attackerElement]?.includes(defenderElement);
  const isDisadvantage = ELEMENT_ADVANTAGE[defenderElement]?.includes(attackerElement);
  const isLightShadow = (attackerElement === 'Свет' && defenderElement === 'Тень') ||
                         (attackerElement === 'Тень' && defenderElement === 'Свет');

  if (isAdvantage) return isLightShadow ? 1.25 : 1.5;
  if (isDisadvantage) return isLightShadow ? 0.8 : 0.75;
  return 1.0;
}

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isGlancing: boolean;
  elementMultiplier: number;
  elementAdvantage: boolean;
  finalDamage: number;
}

/** Merge base stats with artifact bonuses */
function getEffectiveStats(champion: Champion, artifacts?: Artifact[]) {
  const base = { ...champion.baseStats };
  if (!artifacts || artifacts.length === 0) return base;
  const bonuses = calculateArtifactStats(artifacts, base);
  return {
    hp: base.hp + (bonuses.hp ?? 0),
    atk: base.atk + (bonuses.atk ?? 0),
    def: base.def + (bonuses.def ?? 0),
    spd: base.spd + (bonuses.spd ?? 0),
    critChance: base.critChance + (bonuses.critChance ?? 0),
    critDmg: base.critDmg + (bonuses.critDmg ?? 0),
    resistance: base.resistance + (bonuses.resistance ?? 0),
    accuracy: base.accuracy + (bonuses.accuracy ?? 0),
  };
}

/**
 * Полная формула урона (Raid-style) with artifact + buff/debuff support
 */
export function calculateDamage(
  attacker: Champion,
  defender: Champion,
  skill: Skill,
  attackerArtifacts?: Artifact[],
  defenderArtifacts?: Artifact[],
  attackerUnit?: BattleUnit,
  defenderUnit?: BattleUnit,
): CombatResult {
  const atkStats = getEffectiveStats(attacker, attackerArtifacts);
  const defStats = getEffectiveStats(defender, defenderArtifacts);

  // Apply buff/debuff multipliers
  const atkMult = attackerUnit ? getStatMultiplier(attackerUnit, 'atk') : 1;
  const defMult = defenderUnit ? getStatMultiplier(defenderUnit, 'def') : 1;
  const critMult = attackerUnit ? getStatMultiplier(attackerUnit, 'critChance') : 1;
  const critDmgMult = attackerUnit ? getStatMultiplier(attackerUnit, 'critDmg') : 1;
  const accMult = attackerUnit ? getStatMultiplier(attackerUnit, 'accuracy') : 1;
  const resMult = defenderUnit ? getStatMultiplier(defenderUnit, 'resistance') : 1;

  const effectiveAtk = atkStats.atk * atkMult;
  const effectiveDef = defStats.def * defMult;
  const effectiveCritChance = atkStats.critChance * critMult;
  const effectiveCritDmg = atkStats.critDmg * critDmgMult;
  const effectiveAcc = atkStats.accuracy * accMult;
  const effectiveRes = defStats.resistance * resMult;

  let damage = effectiveAtk * skill.power;

  // Чёрная Вдова set: count pieces
  const beheaderCount = attackerArtifacts?.filter(a => a.set === 'Чёрная Вдова').length ?? 0;
  const hasBeheader3 = beheaderCount >= 3;
  const hasBeheader9 = beheaderCount >= 9;

  let isCrit: boolean;
  if (hasBeheader9) {
    // Full set: 100% crit
    isCrit = true;
  } else {
    isCrit = Math.random() * 100 < effectiveCritChance;
    // 3-piece: 20% chance to turn non-crit into crit
    if (!isCrit && hasBeheader3 && Math.random() < 0.20) {
      isCrit = true;
    }
  }
  if (isCrit) {
    damage *= 1 + effectiveCritDmg / 100;
  }

  const elementMultiplier = getElementMultiplier(attacker.element, defender.element);
  const elementAdvantage = elementMultiplier > 1.0;
  const elementDisadvantage = elementMultiplier < 1.0;
  damage *= elementMultiplier;

  // Glancing Hit: 30% chance when at elemental disadvantage → -30% damage, blocks debuffs
  const isGlancing = elementDisadvantage && Math.random() < 0.3;
  if (isGlancing) {
    damage *= 0.7;
  }

  // Тёмная: ignore % of defense
  const defIgnore = getDarkNavkaBonus(attackerArtifacts);
  const reducedDef = effectiveDef * (1 - defIgnore);

  // Защита с убывающей отдачей
  const defReduction = reducedDef / (reducedDef + 150);
  const afterDefense = damage * (1 - defReduction * 0.6);
  const finalDamage = Math.max(1, Math.floor(afterDefense));

  return { damage: Math.floor(damage), isCrit, isGlancing, elementMultiplier, elementAdvantage, finalDamage };
}

/**
 * Frost Morena set helper — returns freeze chance on attack and freeze block chance
 * based on the number of set pieces equipped.
 */
export function getFrostMorenaBonus(artifacts?: Artifact[]): { freezeOnAttackChance: number; freezeBlockChance: number } {
  if (!artifacts) return { freezeOnAttackChance: 0, freezeBlockChance: 0 };
  const count = artifacts.filter(a => a.set === 'Ледяная').length;
  if (count >= 9) return { freezeOnAttackChance: 0.80, freezeBlockChance: 0.80 };
  if (count >= 3) return { freezeOnAttackChance: 0.20, freezeBlockChance: 0.20 };
  return { freezeOnAttackChance: 0, freezeBlockChance: 0 };
}

/**
 * Дренос set helper — returns damage absorption % and regen % per turn.
 */
export function getDrenosIndrikBonus(artifacts?: Artifact[]): { absorbPct: number; regenPct: number } {
  if (!artifacts) return { absorbPct: 0, regenPct: 0 };
  const count = artifacts.filter(a => a.set === 'Дренос').length;
  if (count >= 9) return { absorbPct: 0.40, regenPct: 0.40 };
  if (count >= 3) return { absorbPct: 0.10, regenPct: 0.10 };
  return { absorbPct: 0, regenPct: 0 };
}

/**
 * Тёмная set helper — returns defense ignore percentage.
 */
export function getDarkNavkaBonus(artifacts?: Artifact[]): number {
  if (!artifacts) return 0;
  const count = artifacts.filter(a => a.set === 'Тёмная').length;
  if (count >= 9) return 0.80;
  if (count >= 3) return 0.25;
  return 0;
}
