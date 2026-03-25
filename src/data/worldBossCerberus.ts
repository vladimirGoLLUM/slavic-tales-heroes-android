import type { Champion, Skill, Element } from '@/data/gameData';
import type { EffectApplication } from '@/types/game';
import type { WorldBossData, BossAbilitySchedule } from '@/data/worldBoss';

export const CERBERUS_BOSS: WorldBossData = {
  id: 'cerberus',
  name: 'Цербер',
  title: 'Страж Врат Нави',
  element: 'Огонь',
  imageUrl: '/ui/icon_cerberus.png',
  bgUrl: '/ui/cerberus_bg.png',
  baseStats: {
    hp: 200000,
    atk: 1800,
    def: 250,
    spd: 100,
    critChance: 20,
    critDmg: 60,
    resistance: 250,
    accuracy: 180,
  },
  skills: [
    // 0: Single target bite (round 1)
    {
      name: 'Укус Цербера',
      description: 'Мощная атака по одному герою',
      type: 'damage',
      power: 1.5,
      cooldown: 0,
    },
    // 1: AOE fire + burn (round 2)
    {
      name: 'Пламя Ада',
      description: 'Огненная атака по всем + ожог',
      type: 'aoe',
      power: 1.0,
      cooldown: 0,
      effects: [
        { type: 'burn', value: 5, duration: 2, chance: 1.0, target: 'all_enemies' } as EffectApplication,
      ],
    },
    // 2: Speed down all (round 3)
    {
      name: 'Ледяной Вой',
      description: 'Замедляет всех героев на 2 хода',
      type: 'debuff',
      power: 0.3,
      cooldown: 0,
      effects: [
        { type: 'spd_down', value: 20, duration: 2, chance: 1.0, target: 'all_enemies' } as EffectApplication,
      ],
    },
    // 3: Fear 1 hero (round 4)
    {
      name: 'Теневой Шёпот',
      description: 'Наводит страх на одного героя',
      type: 'control',
      power: 0.8,
      cooldown: 0,
      effects: [
        { type: 'fear', value: 0, duration: 1, chance: 1.0, target: 'enemy' } as EffectApplication,
      ],
    },
    // 4: Triple random hit (round 5)
    {
      name: 'Гнев Цербера',
      description: '3 головы атакуют случайные цели',
      type: 'aoe',
      power: 1.2,
      cooldown: 0,
    },
    // 5: Stun random (round 6)
    {
      name: 'Цепи Подземья',
      description: 'Оглушает случайного героя на 1 ход',
      type: 'control',
      power: 0.5,
      cooldown: 0,
      effects: [
        { type: 'stun', value: 0, duration: 1, chance: 1.0, target: 'enemy' } as EffectApplication,
      ],
    },
    // 6: Mass damage + dispel (round 7)
    {
      name: 'Дыхание Хаоса',
      description: 'Массовый урон + снятие всех баффов',
      type: 'aoe',
      power: 1.5,
      cooldown: 0,
      effects: [
        { type: 'dispel', value: 0, duration: 1, chance: 1.0, target: 'all_enemies' } as EffectApplication,
      ],
    },
    // 7: Summon shadow (round 8) — represented as AOE damage
    {
      name: 'Зов Тьмы',
      description: 'Призывает теневого духа — урон по всем',
      type: 'aoe',
      power: 1.0,
      cooldown: 0,
      effects: [
        { type: 'burn', value: 3, duration: 2, chance: 0.8, target: 'all_enemies' } as EffectApplication,
      ],
    },
    // 8: Self buff (round 9)
    {
      name: 'Кровавая Луна',
      description: '+30% атаки на 3 хода, +10% вампиризма',
      type: 'buff',
      power: 0,
      cooldown: 0,
      effects: [
        { type: 'atk_up', value: 30, duration: 3, chance: 1.0, target: 'self' } as EffectApplication,
        { type: 'lifesteal', value: 10, duration: 3, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    // 9: Curse all — def+res down (round 10)
    {
      name: 'Врата Нави',
      description: 'Проклятие: -30% защиты и сопротивления на 2 хода',
      type: 'debuff',
      power: 0.8,
      cooldown: 0,
      effects: [
        { type: 'def_down', value: 30, duration: 2, chance: 1.0, target: 'all_enemies' } as EffectApplication,
        { type: 'res_down', value: 30, duration: 2, chance: 1.0, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
  immuneEffects: ['stun', 'freeze', 'sleep', 'fear', 'polymorph'],
};

export const CERBERUS_ABILITY_SCHEDULE: BossAbilitySchedule[] = [
  { round: 1, skillIndex: 0 },
  { round: 2, skillIndex: 1 },
  { round: 3, skillIndex: 2 },
  { round: 4, skillIndex: 3 },
  { round: 5, skillIndex: 4 },
  { round: 6, skillIndex: 5 },
  { round: 7, skillIndex: 6 },
  { round: 8, skillIndex: 7 },
  { round: 9, skillIndex: 8 },
  { round: 10, skillIndex: 9 },
];

/** Get Cerberus skill for a given round (1-indexed). Loops every 10 rounds. */
export function getCerberusSkillForRound(round: number): number {
  const normalizedRound = ((round - 1) % 10) + 1;
  const scheduled = CERBERUS_ABILITY_SCHEDULE.find(a => a.round === normalizedRound);
  return scheduled ? scheduled.skillIndex : 0;
}

/** Cerberus rebirth escalation constants */
export const CERBERUS_REBIRTH_ATK = 0.25;
export const CERBERUS_REBIRTH_HP = 0.20;
export const CERBERUS_REBIRTH_SPD = 0.20;

/** Scale Cerberus stats after rebirth — +25% ATK, +20% HP, +20% SPD per rebirth */
export function getScaledCerberusStats(baseStats: Champion['baseStats'], rebirth: number): Champion['baseStats'] {
  return {
    hp: Math.floor(baseStats.hp * (1 + rebirth * CERBERUS_REBIRTH_HP)),
    atk: Math.floor(baseStats.atk * (1 + rebirth * CERBERUS_REBIRTH_ATK)),
    def: baseStats.def,
    spd: Math.floor(baseStats.spd * (1 + rebirth * CERBERUS_REBIRTH_SPD)),
    critChance: baseStats.critChance,
    critDmg: baseStats.critDmg,
    resistance: baseStats.resistance,
    accuracy: baseStats.accuracy,
  };
}

import type { WorldBossRewardTier } from '@/data/worldBoss';

/** Cerberus reward tiers */
export const CERBERUS_REWARD_TIERS: WorldBossRewardTier[] = [
  { label: 'Топ 1 место', rankMin: 1, rankMax: 1, artifactCount: 3, artifactRarity: 'Самоцветный', runes: 5000, souls: 3000 },
  { label: 'Топ 2 место', rankMin: 2, rankMax: 2, artifactCount: 2, artifactRarity: 'Самоцветный', runes: 3000, souls: 2000 },
  { label: 'Топ 3 место', rankMin: 3, rankMax: 3, artifactCount: 1, artifactRarity: 'Самоцветный', runes: 1500, souls: 1000 },
  { label: 'Топ 4-10', rankMin: 4, rankMax: 10, artifactCount: 1, artifactRarity: 'Калиновый', runes: 1000, souls: 800 },
  { label: 'Топ 1%', percentile: 1, artifactCount: 5, artifactRarity: 'Сказанный', runes: 1000, souls: 500 },
  { label: 'Топ 5%', percentile: 5, artifactCount: 3, artifactRarity: 'Сказанный', runes: 800, souls: 300 },
  { label: 'Топ 10%', percentile: 10, artifactCount: 2, artifactRarity: 'Заветный', runes: 500, souls: 300 },
  { label: 'Топ 25%', percentile: 25, artifactCount: 1, artifactRarity: 'Заветный', runes: 300, souls: 200 },
  { label: 'Участие', percentile: 100, artifactCount: 1, artifactRarity: 'Обиходный', runes: 100, souls: 100 },
];

export function getCerberusRewardTier(rank: number, totalPlayers: number): WorldBossRewardTier {
  for (const tier of CERBERUS_REWARD_TIERS) {
    if (tier.rankMin !== undefined && tier.rankMax !== undefined) {
      if (rank >= tier.rankMin && rank <= tier.rankMax) return tier;
    }
  }
  const percentile = (rank / Math.max(totalPlayers, 1)) * 100;
  for (const tier of CERBERUS_REWARD_TIERS) {
    if (tier.percentile !== undefined && percentile <= tier.percentile) return tier;
  }
  return CERBERUS_REWARD_TIERS[CERBERUS_REWARD_TIERS.length - 1];
}
