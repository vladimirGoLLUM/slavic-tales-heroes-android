import type { Champion, Skill, Element } from '@/data/gameData';
import type { EffectApplication, EffectType } from '@/types/game';
import hydraBattle from '@/assets/hydra/hydra_battle.png';

export const WORLD_BOSS_MAX_ATTACKS = 3;

export interface WorldBossData {
  id: string;
  name: string;
  title: string;
  element: Element;
  imageUrl: string;
  bgUrl: string;
  baseStats: Champion['baseStats'];
  skills: Skill[];
  /** Boss is immune to these CC types */
  immuneEffects: string[];
}

/** Round-based ability schedule (1-indexed). Loops every 10 rounds with scaling. */
export interface BossAbilitySchedule {
  round: number;
  skillIndex: number; // index into worldBoss.skills
}

export const BOSS_ABILITY_SCHEDULE: BossAbilitySchedule[] = [
  { round: 1, skillIndex: 0 },  // AOE attack
  { round: 3, skillIndex: 1 },  // Stun random hero
  { round: 5, skillIndex: 2 },  // Poison all
  { round: 7, skillIndex: 3 },  // Fear 1 hero
  { round: 10, skillIndex: 4 }, // Chaos Breath
];

export const HYDRA_BOSS: WorldBossData = {
  id: 'hydra',
  name: 'Гидра',
  title: 'Первый Мировой Босс',
  element: 'Тень',
  imageUrl: hydraBattle,
  bgUrl: hydraBattle,
  baseStats: {
    hp: 999999999,
    atk: 1500,
    def: 200,
    spd: 90,
    critChance: 15,
    critDmg: 50,
    resistance: 200,
    accuracy: 150,
  },
  skills: [
    // 0: AOE attack (round 1, default)
    {
      name: 'Многоглавый Удар',
      description: 'Бьёт всех героев одновременно',
      type: 'aoe',
      power: 1.8,
      cooldown: 0,
    },
    // 1: Stun random (round 3)
    {
      name: 'Оглушающий Рёв',
      description: 'Оглушает случайного героя на 1 ход',
      type: 'control',
      power: 1.0,
      cooldown: 0,
      effects: [
        { type: 'stun', value: 0, duration: 1, chance: 1.0, target: 'enemy' } as EffectApplication,
      ],
    },
    // 2: Poison all (round 5)
    {
      name: 'Ядовитое Дыхание',
      description: 'Отравляет всех героев (5% HP, 4 хода)',
      type: 'debuff',
      power: 0.5,
      cooldown: 0,
      effects: [
        { type: 'poison', value: 5, duration: 4, chance: 1.0, target: 'all_enemies' } as EffectApplication,
      ],
    },
    // 3: Fear 1 hero (round 7)
    {
      name: 'Взгляд Ужаса',
      description: 'Наводит страх на одного героя',
      type: 'control',
      power: 1.2,
      cooldown: 0,
      effects: [
        { type: 'fear', value: 0, duration: 1, chance: 1.0, target: 'enemy' } as EffectApplication,
      ],
    },
    // 4: Chaos Breath (round 10) — mass damage + dispel all buffs
    {
      name: 'Дыхание Хаоса',
      description: 'Массовый урон + снятие всех баффов',
      type: 'aoe',
      power: 3.0,
      cooldown: 0,
      effects: [
        { type: 'dispel', value: 0, duration: 1, chance: 1.0, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
  immuneEffects: ['stun', 'freeze', 'sleep', 'fear', 'polymorph'],
};

/** Get boss skill for a given round (1-indexed). Loops every 10 rounds. */
export function getBossSkillForRound(round: number): number {
  const normalizedRound = ((round - 1) % 10) + 1;
  const scheduled = BOSS_ABILITY_SCHEDULE.find(a => a.round === normalizedRound);
  return scheduled ? scheduled.skillIndex : 0; // default AOE
}

/** Scale boss stats by cycle number (each 10-round cycle increases power) */
export function getScaledBossStats(baseStats: Champion['baseStats'], cycle: number): Champion['baseStats'] {
  const mult = 1 + cycle * 0.15; // +15% per cycle
  return {
    hp: baseStats.hp,
    atk: Math.floor(baseStats.atk * mult),
    def: Math.floor(baseStats.def * mult),
    spd: baseStats.spd,
    critChance: baseStats.critChance,
    critDmg: baseStats.critDmg,
    resistance: baseStats.resistance,
    accuracy: baseStats.accuracy,
  };
}

/** Reward tiers based on rank (place) or percentile */
export interface WorldBossRewardTier {
  label: string;
  rankMin?: number;
  rankMax?: number;
  percentile?: number;
  artifactCount: number;
  artifactRarity: string;
  runes: number;
  souls: number;
}

export const REWARD_TIERS: WorldBossRewardTier[] = [
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

export const BASE_ATTACK_REWARD = { runes: 50, souls: 100 };

// === World Boss Modifier System ===

export interface WorldBossModifier {
  id: string;
  icon: string;
  label: string;
  description: string;
  playerDebuffs?: { type: EffectType; value: number; duration: number }[];
  bossBuffs?: { type: EffectType; value: number; duration: number }[];
}

export interface WorldBossModifiers {
  bossAura: { icon: string; label: string; effects: { type: EffectType; value: number; duration: number }[] };
  modifiers: WorldBossModifier[];
}

/** Hydra modifiers — always active */
export const HYDRA_MODIFIERS: WorldBossModifiers = {
  bossAura: {
    icon: '🐍',
    label: 'Многоглавая Гидра: 4 головы одновременно',
    effects: [
      { type: 'atk_up', value: 20, duration: 99 },
      { type: 'heal_over_time', value: 3, duration: 99 },
    ],
  },
  modifiers: [
    {
      id: 'hydra_heads',
      icon: '🐉',
      label: '6 типов голов',
      description: 'Пул из 6 голов — 4 активны. При обезглавливании голова возрождается через 2 хода как новый тип',
    },
    {
      id: 'hydra_escalation',
      icon: '📈',
      label: 'Эскалация раундов',
      description: 'После смерти всех 4 голов — Возрождение: +25% АТК, +20% ЗДР, +10% СКР для всех голов',
    },
    {
      id: 'hydra_swallow',
      icon: '🐍',
      label: 'Проглатывание',
      description: 'Гидра метит героя и проглатывает через 10 ходов. Нанесите 3% от макс. ЗДР голов для спасения',
      playerDebuffs: [{ type: 'poison', value: 0, duration: 1 }],
    },
    {
      id: 'hydra_passives',
      icon: '⚡',
      label: 'Пассивки голов',
      description: 'Каждая живая голова даёт пассивный эффект: яд, отражение, контрудар, замедление и др.',
    },
  ],
};

/** Cerberus modifiers — always active */
export const CERBERUS_MODIFIERS: WorldBossModifiers = {
  bossAura: {
    icon: '🔥',
    label: 'Страж Врат Нави: 10 способностей по циклу',
    effects: [
      { type: 'atk_up', value: 25, duration: 99 },
      { type: 'spd_up', value: 15, duration: 99 },
    ],
  },
  modifiers: [
    {
      id: 'cerberus_cycle',
      icon: '🔥',
      label: 'Возрождение из пепла',
      description: 'При гибели Цербер возрождается с полным HP и усиленными характеристиками: +25% АТК, +20% ЗДР, +20% СКР за каждое возрождение',
    },
    {
      id: 'cerberus_immune',
      icon: '🛡️',
      label: 'Иммунитет к контролю',
      description: 'Устойчив к оглушению, заморозке, сну, страху и превращению',
    },
    {
      id: 'cerberus_light_weak',
      icon: '☀️',
      label: 'Уязвим к Свету',
      description: 'Герои стихии Свет наносят +30% урона',
    },
    {
      id: 'cerberus_debuffs',
      icon: '💀',
      label: 'Ожоги и проклятия',
      description: 'Накладывает ожог, замедление, страх, оглушение, снятие баффов, снижение ЗАЩ/СОПР',
    },
  ],
};

export function getWorldBossModifiers(bossId: string): WorldBossModifiers {
  return bossId === 'cerberus' ? CERBERUS_MODIFIERS : HYDRA_MODIFIERS;
}

export function getRewardTier(rank: number, totalPlayers: number): WorldBossRewardTier {
  for (const tier of REWARD_TIERS) {
    if (tier.rankMin !== undefined && tier.rankMax !== undefined) {
      if (rank >= tier.rankMin && rank <= tier.rankMax) return tier;
    }
  }
  const percentile = (rank / Math.max(totalPlayers, 1)) * 100;
  for (const tier of REWARD_TIERS) {
    if (tier.percentile !== undefined && percentile <= tier.percentile) return tier;
  }
  return REWARD_TIERS[REWARD_TIERS.length - 1];
}
