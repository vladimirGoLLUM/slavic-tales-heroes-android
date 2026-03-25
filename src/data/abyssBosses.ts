/**
 * Abyss Boss definitions — each boss has unique skills, stats, and art.
 * Bosses appear every 10 floors cycling through ABYSS_BOSSES order.
 */
import type { Skill, Element } from '@/data/gameData';
import type { EffectApplication } from '@/types/game';

import bossMaraImg from '@/assets/abyss/boss_mara.png';
import bossKoscheiImg from '@/assets/abyss/boss_koschei.png';
import bossGorynychImg from '@/assets/abyss/boss_gorynych.png';
import bossMorenaImg from '@/assets/abyss/boss_morena.png';
import bossSimurghImg from '@/assets/abyss/boss_simurgh.png';
import bossIndrikImg from '@/assets/abyss/boss_indrik.png';
import bossChudischeImg from '@/assets/abyss/boss_chudische.png';
import bossNavkaImg from '@/assets/abyss/boss_navka.png';

export interface AbyssBossData {
  id: string;
  name: string;
  title: string;
  element: Element;
  imageUrl: string;
  baseStats: {
    hp: number; atk: number; def: number; spd: number;
    critChance: number; critDmg: number; resistance: number; accuracy: number;
  };
  skills: Skill[];
  immuneEffects: string[];
}

/* ────────── МАРА — Чёрная Вдова ────────── */
const BOSS_MARA: AbyssBossData = {
  id: 'widow',
  name: 'Чёрная Вдова Мара',
  title: 'Повелительница Паутин',
  element: 'Тень',
  imageUrl: bossMaraImg,
  baseStats: { hp: 80000, atk: 1200, def: 350, spd: 105, critChance: 25, critDmg: 70, resistance: 180, accuracy: 160 },
  immuneEffects: ['stun', 'freeze'],
  skills: [
    {
      name: 'Ядовитый Укус',
      description: 'Атакует цель и накладывает яд (5% HP, 3 хода)',
      type: 'damage', power: 1.4, cooldown: 0,
      effects: [
        { type: 'poison', value: 5, duration: 3, chance: 0.8, target: 'enemy' } as EffectApplication,
      ],
    },
    {
      name: 'Паутина Мрака',
      description: 'АОЕ: замедляет всех и снижает скорость на 2 хода',
      type: 'aoe', power: 1.0, cooldown: 3,
      effects: [
        { type: 'spd_down', value: 30, duration: 2, chance: 0.9, target: 'all_enemies' } as EffectApplication,
        { type: 'tm_reduce', value: 20, duration: 0, chance: 0.7, target: 'all_enemies' } as EffectApplication,
      ],
    },
    {
      name: 'Объятия Смерти',
      description: 'Мощная атака + отравляет всех героев (5% HP, 2 хода) и накладывает штраф лечения',
      type: 'aoe', power: 1.6, cooldown: 4,
      effects: [
        { type: 'poison', value: 5, duration: 2, chance: 1.0, target: 'all_enemies' } as EffectApplication,
        { type: 'heal_reduction', value: 100, duration: 2, chance: 0.8, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── КОЩЕЙ — Каменный Жук ────────── */
const BOSS_KOSCHEI: AbyssBossData = {
  id: 'scarab',
  name: 'Каменный Жук Кощей',
  title: 'Бессмертный Повелитель',
  element: 'Камень',
  imageUrl: bossKoscheiImg,
  baseStats: { hp: 120000, atk: 900, def: 500, spd: 85, critChance: 15, critDmg: 50, resistance: 220, accuracy: 140 },
  immuneEffects: ['poison', 'stun'],
  skills: [
    {
      name: 'Каменный Удар',
      description: 'Мощная атака, снижающая защиту цели на 2 хода',
      type: 'damage', power: 1.3, cooldown: 0,
      effects: [
        { type: 'def_down', value: 30, duration: 2, chance: 0.8, target: 'enemy' } as EffectApplication,
      ],
    },
    {
      name: 'Панцирь Кощея',
      description: 'Увеличивает свою защиту на 60% и получает щит на 3 хода',
      type: 'buff', power: 0, cooldown: 4,
      effects: [
        { type: 'def_up', value: 60, duration: 3, chance: 1.0, target: 'self' } as EffectApplication,
        { type: 'shield', value: 30, duration: 3, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Гнев Бессмертного',
      description: 'АОЕ каменная атака: наносит урон и провоцирует всех',
      type: 'aoe', power: 1.5, cooldown: 5,
      effects: [
        { type: 'atk_down', value: 25, duration: 2, chance: 0.75, target: 'all_enemies' } as EffectApplication,
        { type: 'block_buffs', value: 0, duration: 2, chance: 0.6, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── ГОРЫНЫЧ — Огненный Змей ────────── */
const BOSS_GORYNYCH: AbyssBossData = {
  id: 'dragon',
  name: 'Огненный Змей Горыныч',
  title: 'Трёхглавый Ужас',
  element: 'Огонь',
  imageUrl: bossGorynychImg,
  baseStats: { hp: 90000, atk: 1500, def: 300, spd: 100, critChance: 30, critDmg: 80, resistance: 150, accuracy: 170 },
  immuneEffects: ['burn', 'freeze'],
  skills: [
    {
      name: 'Огненное Дыхание',
      description: 'АОЕ огненная атака + ожог (5% HP, 3 хода)',
      type: 'aoe', power: 1.2, cooldown: 0,
      effects: [
        { type: 'burn', value: 5, duration: 3, chance: 0.85, target: 'all_enemies' } as EffectApplication,
      ],
    },
    {
      name: 'Тройной Укус',
      description: 'Три удара по случайным целям с высоким шансом крита',
      type: 'damage', power: 2.2, cooldown: 3,
      effects: [
        { type: 'weaken', value: 25, duration: 2, chance: 0.7, target: 'enemy' } as EffectApplication,
      ],
    },
    {
      name: 'Пекло',
      description: 'АОЕ: сжигает все баффы и накладывает бомбу (15% HP через 2 хода)',
      type: 'aoe', power: 1.0, cooldown: 5,
      effects: [
        { type: 'dispel', value: 0, duration: 0, chance: 1.0, target: 'all_enemies' } as EffectApplication,
        { type: 'bomb', value: 15, duration: 2, chance: 0.8, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── МОРЕНА — Ледяная ────────── */
const BOSS_MORENA: AbyssBossData = {
  id: 'frost',
  name: 'Ледяная',
  title: 'Владычица Зимы',
  element: 'Вода',
  imageUrl: bossMorenaImg,
  baseStats: { hp: 95000, atk: 1100, def: 380, spd: 110, critChance: 20, critDmg: 65, resistance: 200, accuracy: 180 },
  immuneEffects: ['burn', 'stun'],
  skills: [
    {
      name: 'Ледяное Касание',
      description: 'Атакует и замораживает цель на 1 ход',
      type: 'damage', power: 1.3, cooldown: 0,
      effects: [
        { type: 'freeze', value: 0, duration: 1, chance: 0.6, target: 'enemy' } as EffectApplication,
      ],
    },
    {
      name: 'Вьюга',
      description: 'АОЕ: снижает скорость всех героев и крадёт шкалу хода',
      type: 'aoe', power: 0.9, cooldown: 3,
      effects: [
        { type: 'spd_down', value: 25, duration: 2, chance: 0.9, target: 'all_enemies' } as EffectApplication,
        { type: 'tm_reduce', value: 25, duration: 0, chance: 0.8, target: 'all_enemies' } as EffectApplication,
        { type: 'tm_boost', value: 30, duration: 0, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Вечная Мерзлота',
      description: 'АОЕ: замораживает всех на 1 ход и снижает атаку',
      type: 'aoe', power: 1.4, cooldown: 5,
      effects: [
        { type: 'freeze', value: 0, duration: 1, chance: 0.75, target: 'all_enemies' } as EffectApplication,
        { type: 'atk_down', value: 30, duration: 2, chance: 0.9, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── СИМУРГ — Небесный ────────── */
const BOSS_SIMURGH: AbyssBossData = {
  id: 'griffin',
  name: 'Небесный',
  title: 'Страж Небесного Света',
  element: 'Свет',
  imageUrl: bossSimurghImg,
  baseStats: { hp: 85000, atk: 1300, def: 320, spd: 115, critChance: 35, critDmg: 75, resistance: 170, accuracy: 190 },
  immuneEffects: ['sleep', 'fear'],
  skills: [
    {
      name: 'Сияющий Удар',
      description: 'Мощный удар по цели + блок штрафов на себя',
      type: 'damage', power: 1.5, cooldown: 0,
      effects: [
        { type: 'block_debuffs', value: 0, duration: 1, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Небесное Перо',
      description: 'Усиливает свою атаку на 50% и критический урон на 30% на 2 хода',
      type: 'buff', power: 0, cooldown: 3,
      effects: [
        { type: 'atk_up', value: 50, duration: 2, chance: 1.0, target: 'self' } as EffectApplication,
        { type: 'critdmg_up', value: 30, duration: 2, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Божественная Буря',
      description: 'АОЕ: наносит огромный урон и рассеивает все баффы',
      type: 'aoe', power: 2.0, cooldown: 5,
      effects: [
        { type: 'dispel', value: 0, duration: 0, chance: 1.0, target: 'all_enemies' } as EffectApplication,
        { type: 'crit_down', value: 30, duration: 2, chance: 0.8, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── ИНДРИК — Древний ────────── */
const BOSS_INDRIK: AbyssBossData = {
  id: 'ancient',
  name: 'Древний Индрик',
  title: 'Хранитель Первозданного Леса',
  element: 'Лес',
  imageUrl: bossIndrikImg,
  baseStats: { hp: 110000, atk: 1000, def: 420, spd: 95, critChance: 20, critDmg: 55, resistance: 200, accuracy: 150 },
  immuneEffects: ['poison', 'freeze'],
  skills: [
    {
      name: 'Удар Рогом',
      description: 'Атакует и восстанавливает себе HP (15% от нанесённого урона)',
      type: 'damage', power: 1.4, cooldown: 0,
      effects: [
        { type: 'lifesteal', value: 15, duration: 0, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Лесная Регенерация',
      description: 'Восстановление здоровья (20% от макс. HP) + блок штрафов',
      type: 'heal', power: 0, cooldown: 4,
      effects: [
        { type: 'heal', value: 20, duration: 0, chance: 1.0, target: 'self' } as EffectApplication,
        { type: 'heal_over_time', value: 5, duration: 3, chance: 1.0, target: 'self' } as EffectApplication,
        { type: 'block_debuffs', value: 0, duration: 2, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Зов Чащи',
      description: 'АОЕ: наносит урон и усыпляет героев на 1 ход',
      type: 'aoe', power: 1.3, cooldown: 5,
      effects: [
        { type: 'sleep', value: 0, duration: 1, chance: 0.7, target: 'all_enemies' } as EffectApplication,
        { type: 'acc_down', value: 25, duration: 2, chance: 0.8, target: 'all_enemies' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── ЧУДИЩЕ — Боммал ────────── */
const BOSS_CHUDISCHE: AbyssBossData = {
  id: 'golem',
  name: 'Боммал',
  title: 'Каменное Проклятие',
  element: 'Камень',
  imageUrl: bossChudischeImg,
  baseStats: { hp: 130000, atk: 800, def: 550, spd: 80, critChance: 10, critDmg: 40, resistance: 250, accuracy: 130 },
  immuneEffects: ['stun', 'sleep', 'fear'],
  skills: [
    {
      name: 'Каменное Крушение',
      description: 'Атакует и с шансом оглушает цель',
      type: 'damage', power: 1.2, cooldown: 0,
      effects: [
        { type: 'stun', value: 0, duration: 1, chance: 0.4, target: 'enemy' } as EffectApplication,
      ],
    },
    {
      name: 'Бомбы Боммала',
      description: 'Накладывает бомбу на всех героев (10% HP через 3 хода)',
      type: 'debuff', power: 0.5, cooldown: 3,
      effects: [
        { type: 'bomb', value: 10, duration: 3, chance: 0.85, target: 'all_enemies' } as EffectApplication,
      ],
    },
    {
      name: 'Раскол Земли',
      description: 'АОЕ: огромный урон + снижение защиты и контрудар на себя',
      type: 'aoe', power: 1.8, cooldown: 5,
      effects: [
        { type: 'def_down', value: 40, duration: 2, chance: 0.9, target: 'all_enemies' } as EffectApplication,
        { type: 'counterattack', value: 75, duration: 2, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
  ],
};

/* ────────── НАВКА — Тёмная ────────── */
const BOSS_NAVKA: AbyssBossData = {
  id: 'fairy',
  name: 'Тёмная',
  title: 'Призрачная Чаровница',
  element: 'Тень',
  imageUrl: bossNavkaImg,
  baseStats: { hp: 75000, atk: 1400, def: 280, spd: 120, critChance: 35, critDmg: 85, resistance: 160, accuracy: 200 },
  immuneEffects: ['freeze', 'sleep'],
  skills: [
    {
      name: 'Теневой Коготь',
      description: 'Быстрая атака + получает невидимость на 1 ход',
      type: 'damage', power: 1.5, cooldown: 0,
      effects: [
        { type: 'veil', value: 0, duration: 1, chance: 0.7, target: 'self' } as EffectApplication,
      ],
    },
    {
      name: 'Навий Морок',
      description: 'Наводит страх на 2 случайных героев и снижает точность',
      type: 'control', power: 0.8, cooldown: 3,
      effects: [
        { type: 'fear', value: 0, duration: 1, chance: 0.8, target: 'all_enemies' } as EffectApplication,
        { type: 'acc_down', value: 30, duration: 2, chance: 0.9, target: 'all_enemies' } as EffectApplication,
      ],
    },
    {
      name: 'Танец Смерти',
      description: 'АОЕ: критическая атака + кража баффов + дополнительный ход',
      type: 'aoe', power: 1.8, cooldown: 5,
      effects: [
        { type: 'dispel', value: 0, duration: 0, chance: 1.0, target: 'all_enemies' } as EffectApplication,
        { type: 'extra_turn', value: 0, duration: 0, chance: 0.5, target: 'self' } as EffectApplication,
        { type: 'atk_up', value: 40, duration: 2, chance: 1.0, target: 'self' } as EffectApplication,
      ],
    },
  ],
};

/** All abyss bosses in floor order (floor 10, 20, 30, ...) */
export const ABYSS_BOSS_DATA: AbyssBossData[] = [
  BOSS_MARA,      // Floor 10
  BOSS_KOSCHEI,   // Floor 20
  BOSS_GORYNYCH,  // Floor 30
  BOSS_MORENA,    // Floor 40
  BOSS_SIMURGH,   // Floor 50
  BOSS_INDRIK,    // Floor 60
  BOSS_CHUDISCHE, // Floor 70
  BOSS_NAVKA,     // Floor 80
  // Floors 90-120 cycle back with harder stats
];

/** Get boss data for a floor (null if not a boss floor) */
export function getAbyssBossData(floor: number): AbyssBossData | null {
  if (floor % 10 !== 0) return null;
  const idx = (floor / 10 - 1) % ABYSS_BOSS_DATA.length;
  return ABYSS_BOSS_DATA[idx];
}

/** Scale boss stats by floor number and difficulty */
export function getScaledAbyssBoss(floor: number, difficulty: 'normal' | 'hard'): AbyssBossData | null {
  const boss = getAbyssBossData(floor);
  if (!boss) return null;

  const baseScale = difficulty === 'hard' ? 2.5 : 1.0;
  const floorScale = 1 + (floor - 10) * 0.06;
  const scale = baseScale * floorScale;

  return {
    ...boss,
    baseStats: {
      hp: Math.floor(boss.baseStats.hp * scale),
      atk: Math.floor(boss.baseStats.atk * scale),
      def: Math.floor(boss.baseStats.def * scale),
      spd: Math.floor(boss.baseStats.spd * (0.95 + scale * 0.05)),
      critChance: Math.min(50, boss.baseStats.critChance * Math.min(scale, 1.3)),
      critDmg: boss.baseStats.critDmg * Math.min(scale, 1.5),
      resistance: boss.baseStats.resistance * scale,
      accuracy: boss.baseStats.accuracy * scale,
    },
    skills: boss.skills.map(s => ({
      ...s,
      power: s.power * (1 + (floor - 10) * 0.02),
    })),
  };
}
