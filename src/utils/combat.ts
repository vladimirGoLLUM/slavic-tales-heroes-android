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
  isMiss: boolean;
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

  const isCrit = Math.random() * 100 < effectiveCritChance;
  if (isCrit) {
    damage *= 1 + effectiveCritDmg / 100;
  }

  const elementMultiplier = getElementMultiplier(attacker.element, defender.element);
  const elementAdvantage = elementMultiplier > 1.0;
  damage *= elementMultiplier;

  // Промах: меткость vs сопротивление
  const missChance = Math.max(0, effectiveRes - effectiveAcc) * 0.5;
  const isMiss = Math.random() * 100 < missChance;
  if (isMiss) {
    return { damage: 0, isCrit: false, isMiss: true, elementMultiplier, elementAdvantage, finalDamage: 0 };
  }

  // Защита с убывающей отдачей
  const defReduction = effectiveDef / (effectiveDef + 150);
  const afterDefense = damage * (1 - defReduction * 0.6);
  const finalDamage = Math.max(1, Math.floor(afterDefense));

  return { damage: Math.floor(damage), isCrit, isMiss: false, elementMultiplier, elementAdvantage, finalDamage };
}
