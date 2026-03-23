import type { Champion, Element, Skill } from '@/data/gameData';
import type { EffectApplication } from '@/types/game';
import type { ArtifactRarity } from '@/data/artifacts';

export type TempleElement = Element | 'Божественность';

export type RuneRarity = ArtifactRarity;

export interface DivineRune {
  id: string;
  element: TempleElement;
  icon: string;
  name: string;
  rarity: RuneRarity;
}

export interface TempleFloor {
  floor: number;
  bossName: string;
  bossDescription: string;
  element: TempleElement;
  boss: Champion;
  runeRarity: RuneRarity;
  runeReward: { min: number; max: number };
}

export interface Temple {
  id: string;
  name: string;
  element: TempleElement;
  icon: string;
  runeIcon: string;
  runeName: string;
  floors: TempleFloor[];
  color: string;
}

const RUNE_ICONS: Record<TempleElement, string> = {
  'Огонь': '/ui/rune_fire.png',
  'Вода': '/ui/rune_water.png',
  'Лес': '/ui/rune_forest.png',
  'Камень': '/ui/rune_stone.png',
  'Тень': '/ui/rune_shadow.png',
  'Свет': '/ui/rune_light.png',
  'Божественность': '/ui/rune_divine.png',
};

const RUNE_NAMES: Record<TempleElement, string> = {
  'Огонь': 'Руна Пламени',
  'Вода': 'Руна Потока',
  'Лес': 'Руна Древа',
  'Камень': 'Руна Горы',
  'Тень': 'Руна Мрака',
  'Свет': 'Руна Сияния',
  'Божественность': 'Руна Божественности',
};

const FLOOR_RUNE_RARITY: RuneRarity[] = [
  'Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный',
];

/** Element-themed skill factories */
function makeElementalSkills(element: TempleElement, floor: number): Skill[] {
  const power = 1.2 + floor * 0.2;
  const buffVal = 25 + floor * 8;
  const debuffVal = 20 + floor * 6;
  const debuffChance = 0.6 + floor * 0.06;

  const elementThemes: Record<TempleElement, {
    basicName: string; aoeName: string; buffName: string; debuffName: string;
    buffEffects: EffectApplication[]; debuffEffects: EffectApplication[];
  }> = {
    'Огонь': {
      basicName: 'Огненный Удар', aoeName: 'Пламенная Буря',
      buffName: 'Пламенное Усиление', debuffName: 'Жар Преисподней',
      buffEffects: [
        { type: 'atk_up', value: buffVal, duration: 2, chance: 1, target: 'self' },
        { type: 'crit_up', value: Math.floor(buffVal * 0.5), duration: 2, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'def_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'atk_down', value: Math.floor(debuffVal * 0.7), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
    'Вода': {
      basicName: 'Ледяной Поток', aoeName: 'Цунами',
      buffName: 'Водяной Щит', debuffName: 'Леденящий Шторм',
      buffEffects: [
        { type: 'def_up', value: buffVal, duration: 2, chance: 1, target: 'self' },
        { type: 'res_up', value: Math.floor(buffVal * 0.6), duration: 2, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'spd_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'acc_down', value: Math.floor(debuffVal * 0.6), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
    'Лес': {
      basicName: 'Удар Корней', aoeName: 'Терновый Шквал',
      buffName: 'Благословение Леса', debuffName: 'Отравленные Шипы',
      buffEffects: [
        { type: 'heal_over_time', value: Math.floor(buffVal * 0.4), duration: 3, chance: 1, target: 'self' },
        { type: 'def_up', value: Math.floor(buffVal * 0.7), duration: 2, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'poison', value: Math.floor(debuffVal * 0.5), duration: 3, chance: debuffChance, target: 'all_enemies' },
        { type: 'atk_down', value: Math.floor(debuffVal * 0.6), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
    'Камень': {
      basicName: 'Каменный Кулак', aoeName: 'Обвал',
      buffName: 'Каменная Кожа', debuffName: 'Сокрушение Земли',
      buffEffects: [
        { type: 'def_up', value: buffVal, duration: 3, chance: 1, target: 'self' },
        { type: 'atk_up', value: Math.floor(buffVal * 0.5), duration: 2, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'def_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'spd_down', value: Math.floor(debuffVal * 0.5), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
    'Тень': {
      basicName: 'Теневой Клинок', aoeName: 'Мрачная Волна',
      buffName: 'Покров Тьмы', debuffName: 'Проклятие Тени',
      buffEffects: [
        { type: 'crit_up', value: Math.floor(buffVal * 0.7), duration: 2, chance: 1, target: 'self' },
        { type: 'critdmg_up', value: Math.floor(buffVal * 0.8), duration: 2, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'acc_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'res_down', value: Math.floor(debuffVal * 0.7), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
    'Свет': {
      basicName: 'Луч Света', aoeName: 'Солнечный Шторм',
      buffName: 'Сияющее Благословение', debuffName: 'Ослепляющий Свет',
      buffEffects: [
        { type: 'atk_up', value: Math.floor(buffVal * 0.8), duration: 2, chance: 1, target: 'self' },
        { type: 'heal', value: Math.floor(buffVal * 0.5), duration: 1, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'acc_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'crit_down', value: Math.floor(debuffVal * 0.6), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
    'Божественность': {
      basicName: 'Божественный Удар', aoeName: 'Небесная Кара',
      buffName: 'Вселенская Мощь', debuffName: 'Суд Богов',
      buffEffects: [
        { type: 'atk_up', value: buffVal, duration: 2, chance: 1, target: 'self' },
        { type: 'def_up', value: buffVal, duration: 2, chance: 1, target: 'self' },
        { type: 'crit_up', value: Math.floor(buffVal * 0.5), duration: 2, chance: 1, target: 'self' },
      ],
      debuffEffects: [
        { type: 'atk_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'def_down', value: debuffVal, duration: 2, chance: debuffChance, target: 'all_enemies' },
        { type: 'spd_down', value: Math.floor(debuffVal * 0.5), duration: 2, chance: debuffChance, target: 'all_enemies' },
      ],
    },
  };

  const theme = elementThemes[element];

  const skills: Skill[] = [
    {
      name: theme.basicName,
      description: `Мощный элементальный удар`,
      type: 'damage',
      power,
      cooldown: 0,
    },
    {
      name: theme.aoeName,
      description: `Разрушительная атака по всем врагам`,
      type: 'aoe',
      power: power * 0.65,
      cooldown: 4,
      effects: theme.debuffEffects.slice(0, 1),
    },
    {
      name: theme.buffName,
      description: `Элементаль усиливает себя`,
      type: 'buff',
      power: 0,
      cooldown: 3,
      effects: theme.buffEffects,
    },
  ];

  // Floor 2+: add debuff skill
  if (floor >= 2) {
    skills.push({
      name: theme.debuffName,
      description: `Элементаль ослабляет врагов`,
      type: 'debuff',
      power: power * 0.4,
      cooldown: 4,
      effects: theme.debuffEffects,
    });
  }

  // Floor 3+: add CC
  if (floor >= 3) {
    skills.push({
      name: 'Гнев Стихии',
      description: `Оглушающий элементальный удар`,
      type: 'control',
      power: power * 0.5,
      cooldown: 5,
      effects: [
        { type: 'stun', value: 0, duration: 1, chance: 0.65 + floor * 0.05, target: 'enemy' },
      ],
    });
  }

  return skills;
}

/**
 * Floor 1 boss power target: ≥ 20000
 * Power = HP + ATK*4 + DEF*3 + SPD*5
 * Base: HP=10000, ATK=1800, DEF=1000, SPD=140
 * = 10000 + 7200 + 3000 + 700 = 20900
 */
function makeBoss(element: TempleElement, floor: number, name: string, desc: string): Champion {
  const mult = 1 + (floor - 1) * 0.4;
  const baseHp = Math.floor(10000 * mult);
  const baseAtk = Math.floor(1800 * mult);
  const baseDef = Math.floor(1000 * mult);
  const baseSpd = Math.floor(140 + floor * 8);

  const combatElement: Element = element === 'Божественность' ? 'Свет' : element;

  // Use temple icon as boss image
  const bossIcons: Record<TempleElement, string> = {
    'Огонь': '/bosses/boss_fire.png',
    'Вода': '/bosses/boss_water.png',
    'Лес': '/bosses/boss_forest.png',
    'Камень': '/bosses/boss_stone.png',
    'Тень': '/bosses/boss_shadow.png',
    'Свет': '/bosses/boss_light.png',
    'Божественность': '/bosses/boss_divine.png',
  };

  return {
    id: `temple_boss_${element}_${floor}`,
    name,
    element: combatElement,
    faction: 'Храм',
    rarity: FLOOR_RUNE_RARITY[floor - 1] as any,
    description: desc,
    imageUrl: bossIcons[element],
    baseStats: {
      hp: baseHp,
      atk: baseAtk,
      def: baseDef,
      spd: baseSpd,
      critChance: 15 + floor * 5,
      critDmg: 50 + floor * 15,
      resistance: 25 + floor * 10,
      accuracy: 25 + floor * 10,
    },
    skills: makeElementalSkills(element, floor),
  };
}

const BOSS_NAMES: Record<TempleElement, string[]> = {
  'Огонь': ['Огненный Элементаль', 'Пепельный Элементаль', 'Лавовый Элементаль', 'Инфернальный Элементаль', 'Элементаль Сварога'],
  'Вода': ['Ледяной Элементаль', 'Штормовой Элементаль', 'Приливный Элементаль', 'Бездонный Элементаль', 'Элементаль Глубин'],
  'Лес': ['Древесный Элементаль', 'Моховой Элементаль', 'Терновый Элементаль', 'Корневой Элементаль', 'Элементаль Чащоб'],
  'Камень': ['Каменный Элементаль', 'Гранитный Элементаль', 'Кристальный Элементаль', 'Рудный Элементаль', 'Элементаль Недр'],
  'Тень': ['Теневой Элементаль', 'Призрачный Элементаль', 'Ночной Элементаль', 'Бездновый Элементаль', 'Элементаль Мрака'],
  'Свет': ['Светлый Элементаль', 'Солнечный Элементаль', 'Лучистый Элементаль', 'Сияющий Элементаль', 'Элементаль Зари'],
  'Божественность': ['Божественный Элементаль', 'Небесный Элементаль', 'Вселенский Элементаль', 'Космический Элементаль', 'Элементаль Всесущего'],
};

function createTemple(
  id: string, name: string, element: TempleElement, icon: string, color: string
): Temple {
  const floors: TempleFloor[] = [];
  const bossNames = BOSS_NAMES[element];

  for (let f = 1; f <= 5; f++) {
    floors.push({
      floor: f,
      bossName: bossNames[f - 1],
      bossDescription: `Элементаль ${f}-го этажа ${name}`,
      element,
      boss: makeBoss(element, f, bossNames[f - 1], `Элементаль ${f}-го этажа ${name}`),
      runeRarity: FLOOR_RUNE_RARITY[f - 1],
      runeReward: { min: 1, max: 2 },
    });
  }

  return {
    id,
    name,
    element,
    icon,
    runeIcon: RUNE_ICONS[element],
    runeName: RUNE_NAMES[element],
    floors,
    color,
  };
}

export const TEMPLES: Temple[] = [
  createTemple('fire', 'Храм Огня', 'Огонь', '/ui/temple_fire.png', 'from-red-900/40 to-orange-900/20'),
  createTemple('water', 'Храм Воды', 'Вода', '/ui/temple_water.png', 'from-blue-900/40 to-cyan-900/20'),
  createTemple('forest', 'Храм Леса', 'Лес', '/ui/temple_forest.png', 'from-green-900/40 to-emerald-900/20'),
  createTemple('stone', 'Храм Камня', 'Камень', '/ui/temple_stone.png', 'from-amber-900/40 to-stone-900/20'),
  createTemple('shadow', 'Храм Тени', 'Тень', '/ui/temple_shadow.png', 'from-purple-900/40 to-violet-900/20'),
  createTemple('light', 'Храм Света', 'Свет', '/ui/temple_light.png', 'from-yellow-900/40 to-amber-900/20'),
  createTemple('divine', 'Храм Божественности', 'Божественность', '/ui/temple_divine.png', 'from-pink-900/40 to-indigo-900/20'),
];

export function isDivineElement(element: TempleElement): boolean {
  return element === 'Божественность';
}

export function generateRuneId(): string {
  return `rune-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function rollRuneReward(temple: Temple, floor: number): DivineRune[] {
  const floorData = temple.floors[floor - 1];
  const count = Math.random() < 0.5 ? floorData.runeReward.max : floorData.runeReward.min;
  const runes: DivineRune[] = [];
  for (let i = 0; i < count; i++) {
    runes.push({
      id: generateRuneId(),
      element: temple.element,
      icon: temple.runeIcon,
      name: temple.runeName,
      rarity: floorData.runeRarity,
    });
  }
  return runes;
}
