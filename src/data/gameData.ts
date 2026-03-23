import { generateArtifact } from './artifacts';
import { createInitialTowerUpgrades } from './towerData';

import golovnyaImg from '@/assets/heroes/golovnya.png';
import ugolnikImg from '@/assets/heroes/ugolnik.png';
import rucheynikImg from '@/assets/heroes/rucheynik.png';
import kapelkaImg from '@/assets/heroes/kapelka.png';
import mokhovichImg from '@/assets/heroes/mokhovich.png';
import travnikImg from '@/assets/heroes/travnik.png';
import valunetsImg from '@/assets/heroes/valunets.png';
import shchebenImg from '@/assets/heroes/shcheben.png';
import polunochnikImg from '@/assets/heroes/polunochnik.png';
import zatmitelImg from '@/assets/heroes/zatmitel.png';
import rassvetnikImg from '@/assets/heroes/rassvetnik.png';
import zorinkaImg from '@/assets/heroes/zorinka.png';
import zharogorImg from '@/assets/heroes/zharogor.png';
import klyuchevitsaImg from '@/assets/heroes/klyuchevitsa.png';
import dubravaImg from '@/assets/heroes/dubrava.png';
import granitnikImg from '@/assets/heroes/granitnik.png';
import sumerechnikImg from '@/assets/heroes/sumerechnik.png';
import luchezarImg from '@/assets/heroes/luchezar.png';
import ogneDelImg from '@/assets/heroes/ognedel.png';
import omutnikImg from '@/assets/heroes/omutnik.png';
import chashchobnikImg from '@/assets/heroes/chashchobnik.png';
import utesnikImg from '@/assets/heroes/utesnik.png';
import tenepletImg from '@/assets/heroes/teneplet.png';
import zlatovidImg from '@/assets/heroes/zlatovid.png';
import polymyaImg from '@/assets/heroes/polymya.png';
import puchinaImg from '@/assets/heroes/puchina.png';
import dremuchiyImg from '@/assets/heroes/dremuchiy.png';
import kryazhImg from '@/assets/heroes/kryazh.png';
import navyakImg from '@/assets/heroes/navyak.png';
import yariloImg from '@/assets/heroes/yarilo.png';
import svarozhichImg from '@/assets/heroes/svarozhich.png';
import morskayaTsaritsaImg from '@/assets/heroes/morskaya-tsaritsa.png';
import berendeyImg from '@/assets/heroes/berendey.png';
import gorynyaImg from '@/assets/heroes/gorynya.png';
import chernobogImg from '@/assets/heroes/chernobog.png';
import belobogImg from '@/assets/heroes/belobog.png';

export type Element = 'Огонь' | 'Вода' | 'Лес' | 'Камень' | 'Тень' | 'Свет';
export type Rarity = 'Обиходный' | 'Заветный' | 'Сказанный' | 'Калиновый' | 'Самоцветный';

export interface Skill {
  name: string;
  description: string;
  type: 'damage' | 'buff' | 'debuff' | 'heal' | 'aoe' | 'control' | 'special' | 'passive';
  power: number;
  cooldown: number;
  effects?: import('@/types/game').EffectApplication[];
}

export interface Champion {
  id: string;
  name: string;
  element: Element;
  faction: string;
  rarity: Rarity;
  description: string;
  imageUrl: string;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
    critChance: number;
    critDmg: number;
    resistance: number;
    accuracy: number;
  };
  skills: Skill[];
  aura?: {
    stat: 'spd';
    value: number;
    scope: 'all' | 'arena';
  };
}

export interface PlayerChampion {
  id: string;
  champion: Champion;
  level: number;
  stars: number;
  redStars: number;
  xp: number;
  currentHp: number;
  equippedArtifacts: string[];
  locked?: boolean;
}

export type PityCounters = Record<string, number>;

export const PITY_THRESHOLDS: Partial<Record<Rarity, number>> = {
  'Заветный': 1000,
  'Сказанный': 5000,
  'Калиновый': 10000,
  'Самоцветный': 15000,
};

// Priority order for pity checks (rarest first)
export const PITY_PRIORITY: Rarity[] = ['Самоцветный', 'Калиновый', 'Сказанный', 'Заветный'];

export interface Squad {
  id: number;
  name: string;
  members: string[]; // ids of PlayerChampion
}

export const DEFAULT_SQUADS: Squad[] = [
  { id: 0, name: 'Отряд 1', members: [] },
  { id: 1, name: 'Отряд 2', members: [] },
  { id: 2, name: 'Отряд 3', members: [] },
  { id: 3, name: 'Отряд 4', members: [] },
  { id: 4, name: 'Отряд 5', members: [] },
];

export interface DivineRuneCount {
  'Огонь': number;
  'Вода': number;
  'Лес': number;
  'Камень': number;
  'Тень': number;
  'Свет': number;
  'Божественность': number;
}

export const DEFAULT_CHAMPION_SLOTS = 200;
export const SLOTS_EXPANSION_AMOUNT = 10;
export const SLOTS_EXPANSION_COST = 10000; // runes

export interface PlayerState {
  username: string;
  souls: number;
  runes: number;
  mithrilRunes: number;
  energy: number;
  maxEnergy: number;
  lastEnergyUpdate: number; // timestamp ms
  championSlots: number;
  champions: PlayerChampion[];
  squad: string[]; // ids of PlayerChampion - active squad
  squads: Squad[]; // 5 squads
  activeSquadId: number;
  artifacts: import('./artifacts').Artifact[];
  pityCounters: PityCounters;
  divineRunes: DivineRuneCount;
  arena?: import('./arenaData').ArenaState;
  // Tower upgrades
  towerUpgrades: import('./towerData').TowerUpgrades;
  // World Boss - Hydra
  worldBossDamageToday: number;
  worldBossAttacksLeft: number;
  lastWorldBossAttackDate: string;
  worldBossRewardsClaimed: boolean;
  // World Boss - Cerberus
  cerberusDamageToday: number;
  cerberusAttacksLeft: number;
  lastCerberusAttackDate: string;
  cerberusRewardsClaimed: boolean;
}

export interface ShopPackage {
  id: string;
  name: string;
  description: string;
  mithrilRunes: number;
  bonus: number;
  price: number; // in rubles
  icon?: string;
}

export const ENERGY_REGEN_INTERVAL = 150; // seconds per 1 energy
export const MAX_ENERGY = 100;

type GameDifficulty = 'Явь' | 'Навь' | 'Правь' | 'Ирий';

export function getEnergyCost(difficulty: GameDifficulty, isBoss: boolean): number {
  const costs: Record<GameDifficulty, { normal: number; boss: number }> = {
    'Явь': { normal: 1, boss: 2 },
    'Навь': { normal: 2, boss: 3 },
    'Правь': { normal: 3, boss: 4 },
    'Ирий': { normal: 6, boss: 8 },
  };
  return isBoss ? costs[difficulty].boss : costs[difficulty].normal;
}

// XP gained when feeding a hero of given rarity
export const FEED_XP: Record<Rarity, number> = {
  'Обиходный': 50,
  'Заветный': 150,
  'Сказанный': 300,
  'Калиновый': 1000,
  'Самоцветный': 5000,
};

// Element advantage map — 5-element cycle + Свет↔Тень mutual
export const ELEMENT_ADVANTAGE: Record<Element, Element[]> = {
  'Огонь': ['Лес'],
  'Лес': ['Вода'],
  'Вода': ['Камень'],
  'Камень': ['Огонь'],
  'Тень': ['Свет'],
  'Свет': ['Тень'],
};

export const ELEMENT_COLORS: Record<Element, string> = {
  'Огонь': 'element-fire',
  'Вода': 'element-water',
  'Лес': 'element-wood',
  'Камень': 'element-stone',
  'Тень': 'element-shadow',
  'Свет': 'element-light',
};

export const ELEMENT_ICONS: Record<Element, string> = {
  'Огонь': '🔥',
  'Вода': '💧',
  'Лес': '🌿',
  'Камень': '⛰️',
  'Тень': '🌑',
  'Свет': '☀️',
};

export const RARITY_ORDER: Record<Rarity, number> = {
  'Обиходный': 0,
  'Заветный': 1,
  'Сказанный': 2,
  'Калиновый': 3,
  'Самоцветный': 4,
};

export const RARITY_COLORS: Record<Rarity, string> = {
  'Обиходный': 'rarity-common',
  'Заветный': 'rarity-rare',
  'Сказанный': 'rarity-epic',
  'Калиновый': 'rarity-legendary',
  'Самоцветный': 'rarity-mythic',
};

export const SUMMON_RATES: Record<Rarity, number> = {
  'Обиходный': 0.7,
  'Заветный': 0.2,
  'Сказанный': 0.09,
  'Калиновый': 0.01,
  'Самоцветный': 0.001,
};

// ═══════════════════════════════════════════════════════
// РОСТЕР ГЕРОЕВ «БЫЛИНА» — 36 героев, 6 стихий × ~6 шт.
// ═══════════════════════════════════════════════════════

export const CHAMPIONS: Champion[] = [

  // ══════════════════════════════════════
  // 🟤 ОБИХОДНЫЙ — 12 героев (2 на стихию)
  // HP: 800-1100, ATK: 90-120, DEF: 40-80
  // ══════════════════════════════════════

  // --- Огонь ---
  {
    id: 'golovnya',
    name: 'Головня',
    element: 'Огонь',
    faction: 'Деревенская Застава',
    rarity: 'Обиходный',
    description: 'Хранитель очага, чей факел никогда не гаснет.',
    imageUrl: golovnyaImg,
    baseStats: { hp: 900, atk: 115, def: 50, spd: 100, critChance: 12, critDmg: 45, resistance: 15, accuracy: 55 },
    skills: [
      { name: 'Горящий Удар', description: 'Бьёт пылающим факелом.', type: 'damage', power: 1.3, cooldown: 0,
        effects: [{ type: 'burn', value: 3, duration: 2, chance: 0.3, target: 'enemy' }] },
      { name: 'Огненный Всплеск', description: 'Обжигает всех врагов искрами.', type: 'aoe', power: 0.8, cooldown: 3,
        effects: [{ type: 'burn', value: 2, duration: 2, chance: 0.2, target: 'all_enemies' }] },
      { name: 'Жар Углей', description: 'Внутренний огонь усиливает атаку.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'ugolnik',
    name: 'Угольник',
    element: 'Огонь',
    faction: 'Деревенская Застава',
    rarity: 'Обиходный',
    description: 'Старый кузнец, закалённый жаром горна.',
    imageUrl: ugolnikImg,
    baseStats: { hp: 1050, atk: 95, def: 70, spd: 92, critChance: 8, critDmg: 35, resistance: 25, accuracy: 50 },
    skills: [
      { name: 'Удар Молотом', description: 'Тяжёлый удар кузнечным молотом.', type: 'damage', power: 1.2, cooldown: 0,
        effects: [] },
      { name: 'Тёплый Очаг', description: 'Жар горна восстанавливает силы.', type: 'heal', power: 0, cooldown: 3,
        effects: [{ type: 'heal', value: 15, target: 'ally' }] },
      { name: 'Жаростойкость', description: 'Закалка огнём укрепляет тело.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // --- Вода ---
  {
    id: 'rucheynik',
    name: 'Ручейник',
    element: 'Вода',
    faction: 'Речной Народ',
    rarity: 'Обиходный',
    description: 'Дух малого ручья, неутомимый и стойкий.',
    imageUrl: rucheynikImg,
    baseStats: { hp: 1100, atk: 90, def: 75, spd: 95, critChance: 7, critDmg: 32, resistance: 28, accuracy: 45 },
    skills: [
      { name: 'Водяной Удар', description: 'Бьёт струёй воды.', type: 'damage', power: 1.2, cooldown: 0,
        effects: [] },
      { name: 'Водяная Завеса', description: 'Окутывает союзников защитным потоком.', type: 'buff', power: 0, cooldown: 3,
        effects: [{ type: 'def_up', value: 15, duration: 2, target: 'all_allies' }] },
      { name: 'Стойкость Потока', description: 'Вода точит камень — стойкость растёт.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'res_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'kapelka',
    name: 'Капелька',
    element: 'Вода',
    faction: 'Речной Народ',
    rarity: 'Обиходный',
    description: 'Юный водный дух, несущий исцеление.',
    imageUrl: kapelkaImg,
    baseStats: { hp: 950, atk: 92, def: 45, spd: 105, critChance: 6, critDmg: 30, resistance: 20, accuracy: 60 },
    skills: [
      { name: 'Брызги', description: 'Стреляет каплями воды.', type: 'damage', power: 1.1, cooldown: 0,
        effects: [] },
      { name: 'Живая Вода', description: 'Целебная влага восстанавливает здоровье.', type: 'heal', power: 0, cooldown: 3,
        effects: [{ type: 'heal', value: 20, target: 'ally' }] },
      { name: 'Роса', description: 'Утренняя роса медленно исцеляет.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'heal_over_time', value: 2, duration: 99, target: 'self' }] },
    ],
  },

  // --- Лес ---
  {
    id: 'mokhovich',
    name: 'Мохович',
    element: 'Лес',
    faction: 'Лесное Братство',
    rarity: 'Обиходный',
    description: 'Мшистый лесной страж, древний как сам лес.',
    imageUrl: mokhovichImg,
    baseStats: { hp: 1100, atk: 92, def: 80, spd: 90, critChance: 5, critDmg: 30, resistance: 30, accuracy: 42 },
    skills: [
      { name: 'Удар Корнями', description: 'Корни бьют из-под земли.', type: 'damage', power: 1.3, cooldown: 0,
        effects: [] },
      { name: 'Моховой Покров', description: 'Мох укрывает, защищая от ударов.', type: 'buff', power: 0, cooldown: 3,
        effects: [{ type: 'def_up', value: 20, duration: 2, target: 'self' }] },
      { name: 'Регенерация', description: 'Лес медленно залечивает раны.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'heal_over_time', value: 3, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'travnik',
    name: 'Травник',
    element: 'Лес',
    faction: 'Лесное Братство',
    rarity: 'Обиходный',
    description: 'Знахарь, ведающий тайны ядовитых трав.',
    imageUrl: travnikImg,
    baseStats: { hp: 850, atk: 110, def: 45, spd: 102, critChance: 10, critDmg: 40, resistance: 18, accuracy: 65 },
    skills: [
      { name: 'Ядовитый Шип', description: 'Колет отравленным шипом.', type: 'damage', power: 1.2, cooldown: 0,
        effects: [{ type: 'poison', value: 3, duration: 2, chance: 0.3, target: 'enemy' }] },
      { name: 'Отравляющие Споры', description: 'Споры отравляют всех врагов.', type: 'aoe', power: 0.8, cooldown: 3,
        effects: [{ type: 'poison', value: 2, duration: 2, chance: 0.25, target: 'all_enemies' }] },
      { name: 'Живучесть', description: 'Травы укрепляют стойкость.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'res_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // --- Камень ---
  {
    id: 'valunets',
    name: 'Валунец',
    element: 'Камень',
    faction: 'Горное Братство',
    rarity: 'Обиходный',
    description: 'Каменный увалень, неповоротливый, но крепкий.',
    imageUrl: valunetsImg,
    baseStats: { hp: 1100, atk: 95, def: 80, spd: 90, critChance: 5, critDmg: 30, resistance: 25, accuracy: 40 },
    skills: [
      { name: 'Каменный Кулак', description: 'Удар твёрдым как камень кулаком.', type: 'damage', power: 1.3, cooldown: 0,
        effects: [] },
      { name: 'Окаменение', description: 'Бьёт так, что враг каменеет.', type: 'damage', power: 1.0, cooldown: 3,
        effects: [{ type: 'stun', duration: 1, chance: 0.35, target: 'enemy' }] },
      { name: 'Толстая Шкура', description: 'Каменная кожа крепче брони.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 15, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'shcheben',
    name: 'Щебень',
    element: 'Камень',
    faction: 'Горное Братство',
    rarity: 'Обиходный',
    description: 'Юркий каменный дух, метающий осколки.',
    imageUrl: shchebenImg,
    baseStats: { hp: 880, atk: 118, def: 50, spd: 105, critChance: 14, critDmg: 48, resistance: 12, accuracy: 62 },
    skills: [
      { name: 'Каменная Россыпь', description: 'Осыпает врага каменными осколками.', type: 'damage', power: 1.4, cooldown: 0,
        effects: [] },
      { name: 'Обвал', description: 'Камни падают на всех врагов.', type: 'aoe', power: 0.9, cooldown: 3,
        effects: [{ type: 'def_down', value: 10, duration: 2, chance: 0.3, target: 'all_enemies' }] },
      { name: 'Твёрдость', description: 'Камень бьёт сильнее.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'critdmg_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // --- Тень ---
  {
    id: 'polunochnik',
    name: 'Полуночник',
    element: 'Тень',
    faction: 'Ночной Дозор',
    rarity: 'Обиходный',
    description: 'Бродит во тьме, ослабляя врагов.',
    imageUrl: polunochnikImg,
    baseStats: { hp: 850, atk: 112, def: 42, spd: 108, critChance: 13, critDmg: 42, resistance: 10, accuracy: 68 },
    skills: [
      { name: 'Тёмный Удар', description: 'Удар из тени.', type: 'damage', power: 1.3, cooldown: 0,
        effects: [] },
      { name: 'Ночной Кошмар', description: 'Кошмар ослабляет врага.', type: 'debuff', power: 0, cooldown: 3,
        effects: [{ type: 'atk_down', value: 15, duration: 2, chance: 0.6, target: 'enemy' }] },
      { name: 'Скрытность', description: 'Тень ускоряет шаги.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'spd_up', value: 8, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'zatmitel',
    name: 'Затмитель',
    element: 'Тень',
    faction: 'Ночной Дозор',
    rarity: 'Обиходный',
    description: 'Дух затмений, лишающий зрения.',
    imageUrl: zatmitelImg,
    baseStats: { hp: 900, atk: 105, def: 55, spd: 100, critChance: 10, critDmg: 38, resistance: 22, accuracy: 60 },
    skills: [
      { name: 'Теневой Удар', description: 'Бьёт из мрака.', type: 'damage', power: 1.2, cooldown: 0,
        effects: [] },
      { name: 'Ослепление', description: 'Тьма застилает глаза врагу.', type: 'debuff', power: 0, cooldown: 3,
        effects: [{ type: 'acc_down', value: 20, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Теневая Завеса', description: 'Тьма оберегает.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // --- Свет ---
  {
    id: 'rassvetnik',
    name: 'Рассветник',
    element: 'Свет',
    faction: 'Светлая Обитель',
    rarity: 'Обиходный',
    description: 'Несёт свет утренней зари, исцеляя раны.',
    imageUrl: rassvetnikImg,
    baseStats: { hp: 1000, atk: 90, def: 55, spd: 98, critChance: 6, critDmg: 32, resistance: 28, accuracy: 50 },
    skills: [
      { name: 'Луч Света', description: 'Направляет луч в глаза врагу.', type: 'damage', power: 1.1, cooldown: 0,
        effects: [] },
      { name: 'Исцеляющий Свет', description: 'Свет зари затягивает раны.', type: 'heal', power: 0, cooldown: 3,
        effects: [{ type: 'heal', value: 20, target: 'ally' }] },
      { name: 'Аура Света', description: 'Свет отгоняет тьму.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'res_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'zorinka',
    name: 'Зоринка',
    element: 'Свет',
    faction: 'Светлая Обитель',
    rarity: 'Обиходный',
    description: 'Дух утренней звезды, вдохновляющий союзников.',
    imageUrl: zorinkaImg,
    baseStats: { hp: 880, atk: 108, def: 48, spd: 106, critChance: 11, critDmg: 40, resistance: 15, accuracy: 58 },
    skills: [
      { name: 'Утренний Луч', description: 'Яркий луч обжигает врага.', type: 'damage', power: 1.2, cooldown: 0,
        effects: [] },
      { name: 'Благословение Утра', description: 'Утро приносит силу.', type: 'buff', power: 0, cooldown: 3,
        effects: [{ type: 'atk_up', value: 10, duration: 2, target: 'all_allies' }] },
      { name: 'Заря', description: 'Свет повышает меткость.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'acc_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // ══════════════════════════════════════
  // 🟢 ЗАВЕТНЫЙ — 6 героев (1 на стихию)
  // HP: 1000-1300, ATK: 110-150, DEF: 60-100
  // ══════════════════════════════════════

  {
    id: 'zharogor',
    name: 'Жарогор',
    element: 'Огонь',
    faction: 'Пламенный Орден',
    rarity: 'Заветный',
    description: 'Огненный воин, рождённый у жерла вулкана.',
    imageUrl: zharogorImg,
    baseStats: { hp: 1050, atk: 145, def: 65, spd: 108, critChance: 18, critDmg: 55, resistance: 22, accuracy: 72 },
    skills: [
      { name: 'Пылающий Клинок', description: 'Удар раскалённым мечом.', type: 'damage', power: 1.4, cooldown: 0,
        effects: [{ type: 'burn', value: 4, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Огненный Вихрь', description: 'Вихрь пламени обжигает врагов.', type: 'aoe', power: 1.0, cooldown: 4,
        effects: [{ type: 'burn', value: 3, duration: 2, chance: 0.3, target: 'all_enemies' }] },
      { name: 'Душа Пламени', description: 'Внутренний огонь усиливает критические удары.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'critdmg_up', value: 15, duration: 99, target: 'self' }, { type: 'atk_up', value: 8, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'klyuchevitsa',
    name: 'Ключевица',
    element: 'Вода',
    faction: 'Речной Народ',
    rarity: 'Заветный',
    description: 'Дева родника, чья вода исцеляет и очищает.',
    imageUrl: klyuchevitsaImg,
    baseStats: { hp: 1200, atk: 115, def: 80, spd: 100, critChance: 10, critDmg: 42, resistance: 38, accuracy: 55 },
    skills: [
      { name: 'Ледяная Струя', description: 'Бьёт ледяным потоком.', type: 'damage', power: 1.3, cooldown: 0,
        effects: [{ type: 'spd_down', value: 10, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Родниковое Исцеление', description: 'Вода родника залечивает раны союзника.', type: 'heal', power: 0, cooldown: 4,
        effects: [{ type: 'heal', value: 25, target: 'ally' }, { type: 'heal_over_time', value: 3, duration: 2, target: 'ally' }] },
      { name: 'Чистота Истока', description: 'Родниковая вода повышает стойкость.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'res_up', value: 12, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'dubrava',
    name: 'Дубрава',
    element: 'Лес',
    faction: 'Лесное Братство',
    rarity: 'Заветный',
    description: 'Дух дубовой рощи, крепкий и мудрый.',
    imageUrl: dubravaImg,
    baseStats: { hp: 1250, atk: 120, def: 95, spd: 96, critChance: 9, critDmg: 40, resistance: 35, accuracy: 52 },
    skills: [
      { name: 'Дубовая Длань', description: 'Сокрушительный удар ветвью дуба.', type: 'damage', power: 1.4, cooldown: 0,
        effects: [] },
      { name: 'Кора Защитника', description: 'Древесная кора укрепляет всех союзников.', type: 'buff', power: 0, cooldown: 4,
        effects: [{ type: 'def_up', value: 20, duration: 2, target: 'all_allies' }, { type: 'res_up', value: 10, duration: 2, target: 'all_allies' }] },
      { name: 'Корни Силы', description: 'Корни питают жизнью.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'heal_over_time', value: 3, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'granitnik',
    name: 'Гранитник',
    element: 'Камень',
    faction: 'Горное Братство',
    rarity: 'Заветный',
    description: 'Мастер-камнетёс, чей молот крошит скалы.',
    imageUrl: granitnikImg,
    baseStats: { hp: 1300, atk: 130, def: 100, spd: 95, critChance: 12, critDmg: 45, resistance: 32, accuracy: 60 },
    skills: [
      { name: 'Гранитный Молот', description: 'Удар тяжёлым молотом.', type: 'damage', power: 1.4, cooldown: 0,
        effects: [{ type: 'def_down', value: 10, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Каменный Щит', description: 'Воздвигает каменный щит.', type: 'buff', power: 0, cooldown: 3,
        effects: [{ type: 'shield', value: 20, duration: 2, target: 'self' }, { type: 'def_up', value: 15, duration: 2, target: 'self' }] },
      { name: 'Несокрушимость', description: 'Гранит не трескается.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 12, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'sumerechnik',
    name: 'Сумеречник',
    element: 'Тень',
    faction: 'Ночной Дозор',
    rarity: 'Заветный',
    description: 'Охотник сумерек, невидимый и смертоносный.',
    imageUrl: sumerechnikImg,
    baseStats: { hp: 1000, atk: 148, def: 60, spd: 112, critChance: 20, critDmg: 58, resistance: 20, accuracy: 78 },
    skills: [
      { name: 'Удар из Тени', description: 'Внезапная атака из сумрака.', type: 'damage', power: 1.4, cooldown: 0,
        effects: [{ type: 'poison', value: 3, duration: 2, chance: 0.35, target: 'enemy' }] },
      { name: 'Пелена Тьмы', description: 'Окутывает врага тьмой, ослабляя защиту и меткость.', type: 'debuff', power: 0, cooldown: 4,
        effects: [{ type: 'def_down', value: 15, duration: 2, chance: 0.6, target: 'enemy' }, { type: 'acc_down', value: 15, duration: 2, chance: 0.6, target: 'enemy' }] },
      { name: 'Теневой Шаг', description: 'Сумерки ускоряют.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'spd_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'luchezar',
    name: 'Лучезар',
    element: 'Свет',
    faction: 'Светлая Обитель',
    rarity: 'Заветный',
    description: 'Светоносный воин, чей взгляд ослепляет зло.',
    imageUrl: luchezarImg,
    baseStats: { hp: 1150, atk: 135, def: 75, spd: 105, critChance: 15, critDmg: 50, resistance: 30, accuracy: 68 },
    skills: [
      { name: 'Сияющий Клинок', description: 'Удар светящимся клинком.', type: 'damage', power: 1.3, cooldown: 0,
        effects: [] },
      { name: 'Святое Сияние', description: 'Свет исцеляет, усиливает и заливает шкалу хода союзнику.', type: 'heal', power: 0, cooldown: 4,
        effects: [{ type: 'heal', value: 20, target: 'ally' }, { type: 'atk_up', value: 15, duration: 2, target: 'ally' }, { type: 'tm_boost', value: 20, target: 'ally' }] },
      { name: 'Лучезарность', description: 'Свет повышает меткость и критический урон.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'acc_up', value: 10, duration: 99, target: 'self' }, { type: 'critdmg_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // ══════════════════════════════════════
  // 🔵 СКАЗАННЫЙ — 6 героев (1 на стихию)
  // HP: 1200-1600, ATK: 130-180, DEF: 70-120
  // ══════════════════════════════════════

  {
    id: 'ognedel',
    name: 'Огнедел',
    element: 'Огонь',
    faction: 'Пламенный Орден',
    rarity: 'Сказанный',
    description: 'Мастер огненных ремёсел, плавящий сталь взглядом.',
    imageUrl: ogneDelImg,
    baseStats: { hp: 1350, atk: 175, def: 80, spd: 110, critChance: 22, critDmg: 65, resistance: 35, accuracy: 80 },
    skills: [
      { name: 'Расплавленный Удар', description: 'Раскалённый удар прожигает защиту.', type: 'damage', power: 1.5, cooldown: 0,
        effects: [{ type: 'burn', value: 5, duration: 2, chance: 0.5, target: 'enemy' }, { type: 'def_down', value: 10, duration: 2, chance: 0.3, target: 'enemy' }] },
      { name: 'Огненный Шторм', description: 'Буря пламени накрывает врагов.', type: 'aoe', power: 1.2, cooldown: 4,
        effects: [{ type: 'burn', value: 4, duration: 2, chance: 0.4, target: 'all_enemies' }] },
      { name: 'Закалка Стали', description: 'Огонь закаляет тело и дух.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 12, duration: 99, target: 'self' }, { type: 'def_up', value: 8, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'omutnik',
    name: 'Омутник',
    element: 'Вода',
    faction: 'Подводное Царство',
    rarity: 'Сказанный',
    description: 'Дух глубокого омута, затягивающий врагов в пучину.',
    imageUrl: omutnikImg,
    baseStats: { hp: 1500, atk: 140, def: 110, spd: 102, critChance: 12, critDmg: 52, resistance: 48, accuracy: 70 },
    skills: [
      { name: 'Пучина', description: 'Затягивает врага в водоворот.', type: 'control', power: 0, cooldown: 0,
        effects: [{ type: 'stun', duration: 1, chance: 0.35, target: 'enemy' }] },
      { name: 'Глубинная Волна', description: 'Волна омывает всех врагов, снижая скорость.', type: 'aoe', power: 1.1, cooldown: 4,
        effects: [{ type: 'spd_down', value: 15, duration: 2, chance: 0.5, target: 'all_enemies' }, { type: 'def_down', value: 10, duration: 2, chance: 0.3, target: 'all_enemies' }] },
      { name: 'Глубины Хранят', description: 'Водная стихия защищает.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'res_up', value: 15, duration: 99, target: 'self' }, { type: 'def_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'chashchobnik',
    name: 'Чащобник',
    element: 'Лес',
    faction: 'Лесное Братство',
    rarity: 'Сказанный',
    description: 'Страж чащобы, непроходимый как вековой бурелом.',
    imageUrl: chashchobnikImg,
    baseStats: { hp: 1600, atk: 135, def: 120, spd: 100, critChance: 10, critDmg: 50, resistance: 45, accuracy: 62 },
    skills: [
      { name: 'Удар Бурелома', description: 'Мощный удар стволом дерева.', type: 'damage', power: 1.5, cooldown: 0,
        effects: [{ type: 'stun', duration: 1, chance: 0.25, target: 'enemy' }] },
      { name: 'Лесная Крепость', description: 'Лес встаёт стеной, защищая союзников.', type: 'buff', power: 0, cooldown: 4,
        effects: [{ type: 'def_up', value: 25, duration: 2, target: 'all_allies' }, { type: 'shield', value: 15, duration: 2, target: 'all_allies' }] },
      { name: 'Воля Леса', description: 'Лес не сдаётся.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'heal_over_time', value: 4, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'utesnik',
    name: 'Утёсник',
    element: 'Камень',
    faction: 'Горное Братство',
    rarity: 'Сказанный',
    description: 'Каменный великан, стерегущий горные перевалы.',
    imageUrl: utesnikImg,
    baseStats: { hp: 1550, atk: 155, def: 115, spd: 100, critChance: 14, critDmg: 55, resistance: 42, accuracy: 68 },
    skills: [
      { name: 'Удар Утёса', description: 'Сокрушительный удар каменной глыбой.', type: 'damage', power: 1.5, cooldown: 0,
        effects: [{ type: 'def_down', value: 15, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Горный Обвал', description: 'Камни обрушиваются на всех врагов.', type: 'aoe', power: 1.1, cooldown: 4,
        effects: [{ type: 'stun', duration: 1, chance: 0.2, target: 'all_enemies' }] },
      { name: 'Несокрушимый Утёс', description: 'Камень непоколебим.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 15, duration: 99, target: 'self' }, { type: 'res_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'teneplet',
    name: 'Тенеплёт',
    element: 'Тень',
    faction: 'Ночной Дозор',
    rarity: 'Сказанный',
    description: 'Ткач теней, плетущий судьбы врагов из мрака.',
    imageUrl: tenepletImg,
    baseStats: { hp: 1250, atk: 178, def: 72, spd: 118, critChance: 25, critDmg: 68, resistance: 30, accuracy: 88 },
    skills: [
      { name: 'Теневая Игла', description: 'Незримый удар, пронзающий защиту.', type: 'damage', power: 1.5, cooldown: 0,
        effects: [{ type: 'poison', value: 4, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Сеть Мрака', description: 'Тень опутывает врага, обездвиживая.', type: 'control', power: 0, cooldown: 4,
        effects: [{ type: 'stun', duration: 1, chance: 0.7, target: 'enemy' }, { type: 'spd_down', value: 20, duration: 2, chance: 0.8, target: 'enemy' }] },
      { name: 'Растворение', description: 'Тенеплёт сливается с тьмой.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'spd_up', value: 12, duration: 99, target: 'self' }, { type: 'crit_up', value: 8, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'zlatovid',
    name: 'Златовид',
    element: 'Свет',
    faction: 'Светлая Обитель',
    rarity: 'Сказанный',
    description: 'Провидец, чей золотой взор видит сквозь ложь.',
    imageUrl: zlatovidImg,
    baseStats: { hp: 1400, atk: 150, def: 90, spd: 108, critChance: 18, critDmg: 60, resistance: 45, accuracy: 85 },
    skills: [
      { name: 'Золотой Луч', description: 'Луч правды обжигает зло.', type: 'damage', power: 1.4, cooldown: 0,
        effects: [{ type: 'acc_down', value: 15, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Вещий Свет', description: 'Озаряет союзников, повышая меткость и атаку.', type: 'buff', power: 0, cooldown: 4,
        effects: [{ type: 'atk_up', value: 20, duration: 2, target: 'all_allies' }, { type: 'acc_up', value: 15, duration: 2, target: 'all_allies' }] },
      { name: 'Ясновидение', description: 'Видит больше других.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'acc_up', value: 15, duration: 99, target: 'self' }, { type: 'res_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },

  // ══════════════════════════════════════
  // 🟠 КАЛИНОВЫЙ — 6 героев (1 на стихию)
  // HP: 1500-2000, ATK: 160-220, DEF: 80-140
  // ══════════════════════════════════════

  {
    id: 'polymya',
    name: 'Полымя',
    element: 'Огонь',
    faction: 'Пламенный Орден',
    rarity: 'Калиновый',
    description: 'Живое пламя, обретшее разум и волю.',
    imageUrl: polymyaImg,
    baseStats: { hp: 1700, atk: 215, def: 90, spd: 115, critChance: 28, critDmg: 75, resistance: 45, accuracy: 90 },
    skills: [
      { name: 'Пламя Души', description: 'Испепеляющий удар чистым огнём.', type: 'damage', power: 2.0, cooldown: 0,
        effects: [{ type: 'burn', value: 6, duration: 2, chance: 0.6, target: 'enemy' }, { type: 'def_down', value: 15, duration: 2, chance: 0.3, target: 'enemy' }] },
      { name: 'Пожар Небесный', description: 'Огненный шторм обрушивается на всех врагов.', type: 'aoe', power: 1.4, cooldown: 5,
        effects: [{ type: 'burn', value: 5, duration: 2, chance: 0.5, target: 'all_enemies' }, { type: 'atk_down', value: 15, duration: 2, chance: 0.3, target: 'all_enemies' }] },
      { name: 'Неугасимый', description: 'Огонь никогда не гаснет.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 15, duration: 99, target: 'self' }, { type: 'critdmg_up', value: 12, duration: 99, target: 'self' }, { type: 'spd_up', value: 8, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'puchina',
    name: 'Пучина',
    element: 'Вода',
    faction: 'Подводное Царство',
    rarity: 'Калиновый',
    description: 'Владычица морских глубин, повелительница штормов.',
    imageUrl: puchinaImg,
    baseStats: { hp: 1900, atk: 170, def: 130, spd: 108, critChance: 18, critDmg: 62, resistance: 65, accuracy: 82 },
    skills: [
      { name: 'Удар Шторма', description: 'Штормовая волна сокрушает врага.', type: 'damage', power: 1.8, cooldown: 0,
        effects: [{ type: 'spd_down', value: 20, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Великий Потоп', description: 'Стена воды обрушивается на всех врагов и срезает шкалу хода.', type: 'aoe', power: 1.3, cooldown: 5,
        effects: [{ type: 'stun', duration: 1, chance: 0.3, target: 'all_enemies' }, { type: 'spd_down', value: 15, duration: 2, chance: 0.5, target: 'all_enemies' }, { type: 'tm_reduce', value: 30, target: 'all_enemies' }] },
      { name: 'Глубинная Мощь', description: 'Мощь бездны защищает и исцеляет.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 12, duration: 99, target: 'self' }, { type: 'res_up', value: 15, duration: 99, target: 'self' }, { type: 'heal_over_time', value: 3, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'dremuchiy',
    name: 'Дремучий',
    element: 'Лес',
    faction: 'Лесное Братство',
    rarity: 'Калиновый',
    description: 'Дух дремучего леса, непроходимого и опасного.',
    imageUrl: dremuchiyImg,
    baseStats: { hp: 2000, atk: 165, def: 140, spd: 105, critChance: 16, critDmg: 60, resistance: 60, accuracy: 72 },
    skills: [
      { name: 'Хватка Чащи', description: 'Ветви хватают и душат врага.', type: 'damage', power: 1.8, cooldown: 0,
        effects: [{ type: 'poison', value: 5, duration: 2, chance: 0.5, target: 'enemy' }, { type: 'spd_down', value: 15, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Лесная Твердыня', description: 'Лес встаёт несокрушимой стеной.', type: 'buff', power: 0, cooldown: 5,
        effects: [{ type: 'def_up', value: 30, duration: 3, target: 'all_allies' }, { type: 'shield', value: 20, duration: 2, target: 'all_allies' }] },
      { name: 'Древний Лес', description: 'Вековая мудрость леса.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 15, duration: 99, target: 'self' }, { type: 'heal_over_time', value: 4, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'kryazh',
    name: 'Кряж',
    element: 'Камень',
    faction: 'Горное Братство',
    rarity: 'Калиновый',
    description: 'Горный хребет, обретший волю и ярость.',
    imageUrl: kryazhImg,
    baseStats: { hp: 2000, atk: 175, def: 135, spd: 106, critChance: 20, critDmg: 65, resistance: 55, accuracy: 78 },
    skills: [
      { name: 'Сокрушение Горы', description: 'Удар, раскалывающий камень.', type: 'damage', power: 2.0, cooldown: 0,
        effects: [{ type: 'def_down', value: 20, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Землетрясение', description: 'Земля содрогается под ногами врагов.', type: 'aoe', power: 1.3, cooldown: 5,
        effects: [{ type: 'stun', duration: 1, chance: 0.25, target: 'all_enemies' }, { type: 'def_down', value: 15, duration: 2, chance: 0.4, target: 'all_enemies' }] },
      { name: 'Нерушимый Кряж', description: 'Горы не рушатся.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 18, duration: 99, target: 'self' }, { type: 'res_up', value: 12, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'navyak',
    name: 'Навьяк',
    element: 'Тень',
    faction: 'Подземное Царство',
    rarity: 'Калиновый',
    description: 'Дух Нави, посланник мира мёртвых.',
    imageUrl: navyakImg,
    baseStats: { hp: 1600, atk: 220, def: 85, spd: 122, critChance: 30, critDmg: 78, resistance: 42, accuracy: 98 },
    skills: [
      { name: 'Касание Нави', description: 'Прикосновение смерти высасывает жизнь.', type: 'damage', power: 2.0, cooldown: 0,
        effects: [{ type: 'lifesteal', value: 20, target: 'self' }, { type: 'poison', value: 5, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Вой Мертвецов', description: 'Крик из Нави ужасает всех врагов.', type: 'aoe', power: 1.3, cooldown: 5,
        effects: [{ type: 'atk_down', value: 20, duration: 2, chance: 0.6, target: 'all_enemies' }, { type: 'spd_down', value: 15, duration: 2, chance: 0.5, target: 'all_enemies' }] },
      { name: 'Проклятие Нави', description: 'Нежить не знает усталости.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 15, duration: 99, target: 'self' }, { type: 'spd_up', value: 10, duration: 99, target: 'self' }, { type: 'crit_up', value: 8, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'yarilo',
    name: 'Ярило',
    element: 'Свет',
    faction: 'Небесное Воинство',
    rarity: 'Калиновый',
    description: 'Бог весеннего солнца, несущий жизнь и свет.',
    imageUrl: yariloImg,
    baseStats: { hp: 1800, atk: 195, def: 110, spd: 112, critChance: 22, critDmg: 70, resistance: 58, accuracy: 88 },
    skills: [
      { name: 'Солнечный Удар', description: 'Мощь полуденного солнца обрушивается на врага.', type: 'damage', power: 1.9, cooldown: 0,
        effects: [{ type: 'burn', value: 5, duration: 2, chance: 0.4, target: 'enemy' }] },
      { name: 'Весеннее Возрождение', description: 'Солнце исцеляет, укрепляет и заливает шкалу хода.', type: 'buff', power: 0, cooldown: 5,
        effects: [{ type: 'heal', value: 25, target: 'all_allies' }, { type: 'atk_up', value: 25, duration: 2, target: 'all_allies' }, { type: 'def_up', value: 15, duration: 2, target: 'all_allies' }, { type: 'tm_boost', value: 30, target: 'all_allies' }] },
      { name: 'Сила Солнца', description: 'Солнечная сила не угасает.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 12, duration: 99, target: 'self' }, { type: 'res_up', value: 12, duration: 99, target: 'self' }] },
    ],
    aura: { stat: 'spd', value: 30, scope: 'arena' },
  },

  // ══════════════════════════════════════
  // 🔴 САМОЦВЕТНЫЙ — 6 героев (1 на стихию)
  // HP: 1800-2500, ATK: 190-250, DEF: 90-160
  // ══════════════════════════════════════

  {
    id: 'svarozhich',
    name: 'Сварожич',
    element: 'Огонь',
    faction: 'Божественный Пантеон',
    rarity: 'Самоцветный',
    description: 'Сын бога-кузнеца Сварога, воплощение священного огня.',
    imageUrl: svarozhichImg,
    baseStats: { hp: 2100, atk: 245, def: 100, spd: 125, critChance: 32, critDmg: 95, resistance: 55, accuracy: 105 },
    skills: [
      { name: 'Божественное Пламя', description: 'Священный огонь испепеляет всё.', type: 'damage', power: 2.5, cooldown: 0,
        effects: [{ type: 'burn', value: 8, duration: 2, chance: 0.7, target: 'enemy' }, { type: 'def_down', value: 20, duration: 2, chance: 0.4, target: 'enemy' }, { type: 'atk_down', value: 10, duration: 2, chance: 0.3, target: 'enemy' }] },
      { name: 'Небесный Пожар', description: 'Огонь с небес обрушивается на врагов и срезает шкалу хода.', type: 'aoe', power: 1.8, cooldown: 6,
        effects: [{ type: 'burn', value: 6, duration: 2, chance: 0.6, target: 'all_enemies' }, { type: 'def_down', value: 15, duration: 2, chance: 0.4, target: 'all_enemies' }, { type: 'dispel', target: 'all_enemies' }, { type: 'tm_reduce', value: 25, target: 'all_enemies' }] },
      { name: 'Кровь Сварога', description: 'Божественная кровь даёт силу.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 18, duration: 99, target: 'self' }, { type: 'critdmg_up', value: 15, duration: 99, target: 'self' }, { type: 'spd_up', value: 10, duration: 99, target: 'self' }] },
    ],
    aura: { stat: 'spd', value: 24, scope: 'all' },
  },
  {
    id: 'morskaya-tsaritsa',
    name: 'Морская Царица',
    element: 'Вода',
    faction: 'Подводное Царство',
    rarity: 'Самоцветный',
    description: 'Владычица всех вод, чья воля — закон морей.',
    imageUrl: morskayaTsaritsaImg,
    baseStats: { hp: 2400, atk: 195, def: 150, spd: 112, critChance: 22, critDmg: 72, resistance: 88, accuracy: 90 },
    skills: [
      { name: 'Гнев Океана', description: 'Вся мощь океана обрушивается на врага.', type: 'damage', power: 2.2, cooldown: 0,
        effects: [{ type: 'stun', duration: 1, chance: 0.4, target: 'enemy' }, { type: 'spd_down', value: 25, duration: 2, chance: 0.6, target: 'enemy' }] },
      { name: 'Целебный Прилив', description: 'Морские воды исцеляют и очищают всех союзников.', type: 'heal', power: 0, cooldown: 6,
        effects: [{ type: 'heal', value: 30, target: 'all_allies' }, { type: 'cleanse', target: 'all_allies' }, { type: 'res_up', value: 20, duration: 2, target: 'all_allies' }] },
      { name: 'Власть Глубин', description: 'Глубины моря подчинены её воле.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 15, duration: 99, target: 'self' }, { type: 'res_up', value: 18, duration: 99, target: 'self' }, { type: 'heal_over_time', value: 4, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'berendey',
    name: 'Берендей',
    element: 'Лес',
    faction: 'Лесное Братство',
    rarity: 'Самоцветный',
    description: 'Царь леса, чьё слово — закон для каждого дерева и зверя.',
    imageUrl: berendeyImg,
    baseStats: { hp: 2500, atk: 195, def: 160, spd: 110, critChance: 20, critDmg: 70, resistance: 80, accuracy: 82 },
    skills: [
      { name: 'Гнев Леса', description: 'Весь лес восстаёт против врага.', type: 'damage', power: 2.3, cooldown: 0,
        effects: [{ type: 'poison', value: 6, duration: 2, chance: 0.6, target: 'enemy' }, { type: 'spd_down', value: 20, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Возрождение Леса', description: 'Природа возрождает павших и исцеляет живых.', type: 'heal', power: 0, cooldown: 6,
        effects: [{ type: 'heal', value: 35, target: 'all_allies' }, { type: 'def_up', value: 25, duration: 3, target: 'all_allies' }, { type: 'heal_over_time', value: 5, duration: 3, target: 'all_allies' }] },
      { name: 'Дух Леса', description: 'Лес — его плоть и кровь.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 18, duration: 99, target: 'self' }, { type: 'res_up', value: 15, duration: 99, target: 'self' }, { type: 'heal_over_time', value: 5, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'gorynya',
    name: 'Горыня',
    element: 'Камень',
    faction: 'Горное Братство',
    rarity: 'Самоцветный',
    description: 'Великан-гора, чья поступь сотрясает землю.',
    imageUrl: gorynyaImg,
    baseStats: { hp: 2500, atk: 210, def: 155, spd: 110, critChance: 22, critDmg: 75, resistance: 70, accuracy: 85 },
    skills: [
      { name: 'Кулак Горы', description: 'Удар, от которого трескаются скалы.', type: 'damage', power: 2.5, cooldown: 0,
        effects: [{ type: 'def_down', value: 25, duration: 2, chance: 0.6, target: 'enemy' }, { type: 'stun', duration: 1, chance: 0.3, target: 'enemy' }] },
      { name: 'Каменный Шторм', description: 'Лавина камней погребает всех врагов.', type: 'aoe', power: 1.7, cooldown: 6,
        effects: [{ type: 'stun', duration: 1, chance: 0.3, target: 'all_enemies' }, { type: 'def_down', value: 20, duration: 2, chance: 0.5, target: 'all_enemies' }, { type: 'spd_down', value: 15, duration: 2, chance: 0.4, target: 'all_enemies' }] },
      { name: 'Вечный Камень', description: 'Горы стоят вечно.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'def_up', value: 20, duration: 99, target: 'self' }, { type: 'res_up', value: 15, duration: 99, target: 'self' }, { type: 'shield', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'chernobog',
    name: 'Чернобог',
    element: 'Тень',
    faction: 'Подземное Царство',
    rarity: 'Самоцветный',
    description: 'Тёмный бог, повелитель мрака и хаоса.',
    imageUrl: chernobogImg,
    baseStats: { hp: 1900, atk: 250, def: 95, spd: 128, critChance: 35, critDmg: 98, resistance: 52, accuracy: 108 },
    skills: [
      { name: 'Поглощение', description: 'Поглощает жизненную силу врага.', type: 'damage', power: 2.5, cooldown: 0,
        effects: [{ type: 'lifesteal', value: 25, target: 'self' }, { type: 'poison', value: 7, duration: 2, chance: 0.7, target: 'enemy' }, { type: 'atk_down', value: 15, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Тьма Вечная', description: 'Абсолютная тьма накрывает поле боя.', type: 'aoe', power: 1.8, cooldown: 6,
        effects: [{ type: 'atk_down', value: 25, duration: 2, chance: 0.7, target: 'all_enemies' }, { type: 'acc_down', value: 20, duration: 2, chance: 0.6, target: 'all_enemies' }, { type: 'spd_down', value: 15, duration: 2, chance: 0.5, target: 'all_enemies' }] },
      { name: 'Абсолютный Мрак', description: 'Тьма — его стихия и сила.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 20, duration: 99, target: 'self' }, { type: 'spd_up', value: 12, duration: 99, target: 'self' }, { type: 'crit_up', value: 10, duration: 99, target: 'self' }] },
    ],
  },
  {
    id: 'belobog',
    name: 'Белобог',
    element: 'Свет',
    faction: 'Небесное Воинство',
    rarity: 'Самоцветный',
    description: 'Бог света и добра, противовес тьме.',
    imageUrl: belobogImg,
    baseStats: { hp: 2300, atk: 220, def: 130, spd: 118, critChance: 25, critDmg: 85, resistance: 82, accuracy: 95 },
    skills: [
      { name: 'Суд Света', description: 'Божественный свет карает зло.', type: 'damage', power: 2.3, cooldown: 0,
        effects: [{ type: 'burn', value: 6, duration: 2, chance: 0.5, target: 'enemy' }, { type: 'acc_down', value: 20, duration: 2, chance: 0.5, target: 'enemy' }] },
      { name: 'Божественное Благо', description: 'Свет Белобога исцеляет, укрепляет и заливает шкалу хода.', type: 'heal', power: 0, cooldown: 6,
        effects: [{ type: 'heal', value: 35, target: 'all_allies' }, { type: 'atk_up', value: 25, duration: 3, target: 'all_allies' }, { type: 'cleanse', target: 'all_allies' }, { type: 'tm_boost', value: 25, target: 'all_allies' }] },
      { name: 'Вечный Свет', description: 'Свет не меркнет никогда.', type: 'passive', power: 0, cooldown: 0,
        effects: [{ type: 'atk_up', value: 15, duration: 99, target: 'self' }, { type: 'res_up', value: 18, duration: 99, target: 'self' }, { type: 'heal_over_time', value: 4, duration: 99, target: 'self' }] },
    ],
    aura: { stat: 'spd', value: 20, scope: 'all' },
  },
];

export function createInitialPlayerState(): PlayerState {
  return {
    username: 'Витязь',
    souls: 15000,
    runes: 15000,
    mithrilRunes: 0,
    energy: MAX_ENERGY,
    maxEnergy: MAX_ENERGY,
    lastEnergyUpdate: Date.now(),
    championSlots: DEFAULT_CHAMPION_SLOTS,
    champions: [],
    squad: [],
    squads: DEFAULT_SQUADS.map(s => ({ ...s })),
    activeSquadId: 0,
    artifacts: [],
    pityCounters: {
      'Заветный': 0,
      'Сказанный': 0,
      'Калиновый': 0,
      'Самоцветный': 0,
    },
    divineRunes: {
      'Огонь': 0,
      'Вода': 0,
      'Лес': 0,
      'Камень': 0,
      'Тень': 0,
      'Свет': 0,
      'Божественность': 0,
    },
    towerUpgrades: createInitialTowerUpgrades(),
    worldBossDamageToday: 0,
    worldBossAttacksLeft: 3,
    lastWorldBossAttackDate: '',
    worldBossRewardsClaimed: false,
    cerberusDamageToday: 0,
    cerberusAttacksLeft: 3,
    lastCerberusAttackDate: '',
    cerberusRewardsClaimed: false,
  };
}

export const SHOP_PACKAGES: ShopPackage[] = [
  { id: 'small', name: 'Малое подношение', description: 'Скромный дар богам', mithrilRunes: 50, bonus: 0, price: 99 },
  { id: 'medium', name: 'Среднее подношение', description: 'Достойная жертва', mithrilRunes: 150, bonus: 20, price: 299 },
  { id: 'large', name: 'Великое подношение', description: 'Щедрый дар', mithrilRunes: 500, bonus: 100, price: 999 },
  { id: 'hero', name: 'Богатырский дар', description: 'Подношение настоящего героя', mithrilRunes: 1500, bonus: 500, price: 2499 },
  { id: 'royal', name: 'Княжеская казна', description: 'Сокровища княжества', mithrilRunes: 5000, bonus: 2500, price: 7999 },
];

export function getElementColor(element: Element): string {
  return ELEMENT_COLORS[element];
}

export function getRarityColor(rarity: Rarity): string {
  return RARITY_COLORS[rarity];
}

export function getStatLabel(stat: string): string {
  const labels: Record<string, string> = {
    hp: 'ЗДР',
    atk: 'АТК',
    def: 'ЗАЩ',
    spd: 'СКР',
    critChance: 'КРИТ%',
    critDmg: 'КРИТ.У',
    resistance: 'СОПР',
    accuracy: 'МЕТК',
  };
  return labels[stat] || stat;
}
