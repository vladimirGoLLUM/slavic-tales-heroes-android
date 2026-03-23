import type { Champion } from '@/data/gameData';
import type { StatusEffect } from '@/types/game';
import { isCC, hasEffect } from '@/utils/effects';

export interface BattleUnit {
  id: string;
  champion: Champion;
  currentHp: number;
  maxHp: number;
  isEnemy: boolean;
  skillCooldowns: number[];
  effects: StatusEffect[];
  turnMeter: number;
}

/** Difficulty-aware target selection */
export function chooseTarget(attacker: BattleUnit, allUnits: BattleUnit[], difficultyTier: number = 0): BattleUnit | null {
  const enemies = allUnits.filter(e => !e.isEnemy && e.currentHp > 0);
  if (enemies.length === 0) return null;

  // Провокация: если есть юнит с taunt — обязаны атаковать его
  const taunter = enemies.find(e => hasEffect(e, 'taunt'));
  if (taunter) return taunter;

  // Приоритет 1: Добить слабого — threshold scales with difficulty
  const finishThreshold = 0.3 + difficultyTier * 0.05; // 30%-45%
  const lowHp = enemies
    .filter(e => e.currentHp < e.maxHp * finishThreshold)
    .sort((a, b) => a.currentHp - b.currentHp); // focus lowest first
  if (lowHp.length > 0) return lowHp[0];

  // Higher difficulties: focus fire on the highest DPS player unit
  if (difficultyTier >= 2) {
    const byAtk = [...enemies].sort((a, b) => b.champion.baseStats.atk - a.champion.baseStats.atk);
    if (byAtk.length > 0 && Math.random() < 0.6) return byAtk[0];
  }

  // Приоритет 2: Саппорт (healers/buffers)
  const supports = enemies.filter(e =>
    e.champion.skills.some(s => s.type === 'heal' || s.type === 'buff')
  );
  if (supports.length > 0) return supports[0];

  // Приоритет 3: Самый хлипкий
  return enemies.reduce((min, e) =>
    e.champion.baseStats.def < min.champion.baseStats.def ? e : min
  );
}

/** Difficulty-aware skill selection */
export function chooseSkill(attacker: BattleUnit, target: BattleUnit, difficultyTier: number = 0): number {
  const skills = attacker.champion.skills;

  // Finishing blow threshold scales with difficulty
  const finishThreshold = 0.3 + difficultyTier * 0.05;
  if (target.currentHp < target.maxHp * finishThreshold) {
    const strong = skills
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => s.type === 'damage' && s.power >= 1.5 && attacker.skillCooldowns[i] === 0);
    if (strong.length > 0) return strong[0].i;
  }

  // On harder difficulties, prioritize CC (control) skills
  if (difficultyTier >= 2) {
    const cc = skills
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => s.type === 'control' && attacker.skillCooldowns[i] === 0);
    if (cc.length > 0 && Math.random() < 0.7) return cc[0].i;
  }

  // Higher difficulties: smarter buff usage (always use if available)
  const buffChance = difficultyTier >= 2 ? 0.8 : 0.5;
  const buffs = skills
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.type === 'buff' && attacker.skillCooldowns[i] === 0);
  if (buffs.length > 0 && Math.random() < buffChance) return buffs[0].i;

  // Debuffs — higher priority on harder difficulties
  const debuffs = skills
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.type === 'debuff' && attacker.skillCooldowns[i] === 0);
  if (debuffs.length > 0 && (difficultyTier >= 1 || Math.random() < 0.5)) return debuffs[0].i;

  // Use strongest available damage skill on harder difficulties
  const available = skills
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.type !== 'passive' && attacker.skillCooldowns[i] === 0);

  if (available.length > 0) {
    if (difficultyTier >= 1) {
      // Sort by power descending, pick strongest
      available.sort((a, b) => b.s.power - a.s.power);
    }
    return available[0].i;
  }

  return 0;
}

/** Обновление кулдаунов (конец хода) */
export function updateCooldowns(unit: BattleUnit): BattleUnit {
  return { ...unit, skillCooldowns: unit.skillCooldowns.map(cd => Math.max(0, cd - 1)) };
}

/** Применение кулдауна к использованному навыку */
export function applyCooldown(unit: BattleUnit, skillIndex: number): BattleUnit {
  const newCd = [...unit.skillCooldowns];
  newCd[skillIndex] = unit.champion.skills[skillIndex].cooldown;
  return { ...unit, skillCooldowns: newCd };
}
