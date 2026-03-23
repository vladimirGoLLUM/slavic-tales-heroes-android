import type { Element } from './gameData';
import type { ArenaMetalTier } from './arenaData';

export type TowerStat = 'hp' | 'atk' | 'def' | 'critChance' | 'resistance' | 'accuracy';

export const TOWER_STATS: { key: TowerStat; label: string }[] = [
  { key: 'hp', label: 'ЗДР' },
  { key: 'atk', label: 'АТК' },
  { key: 'def', label: 'ЗАЩ' },
  { key: 'critChance', label: 'КРИТ%' },
  { key: 'resistance', label: 'СОПР' },
  { key: 'accuracy', label: 'МЕТК' },
];

export const TOWER_ELEMENTS: Element[] = ['Огонь', 'Вода', 'Лес', 'Камень', 'Тень', 'Свет'];

export const MAX_TOWER_LEVEL = 20;

// Arena coin types used for tower upgrades (keys match ArenaMetalTier)
export type TowerCoinTier = ArenaMetalTier;

export const TOWER_COIN_TIERS: TowerCoinTier[] = [
  'Ярь-Медь',
  'Кованое Серебро',
  'Червонное Золото',
  'Пламень-Сталь',
  'Лунный Мефрил',
];

export const TOWER_COIN_NAMES: Record<TowerCoinTier, string> = {
  'Ярь-Медь': 'Монета Ярилы',
  'Кованое Серебро': 'Сребреник Велеса',
  'Червонное Золото': 'Златник Даждьбога',
  'Пламень-Сталь': 'Пламень Сварога',
  'Лунный Мефрил': 'Луна Велеса',
};

export const TOWER_COIN_ICONS: Record<TowerCoinTier, string> = {
  'Ярь-Медь': '🪙',
  'Кованое Серебро': '🥈',
  'Червонное Золото': '🥇',
  'Пламень-Сталь': '🔥',
  'Лунный Мефрил': '🌙',
};

export interface TowerUpgradeLevel {
  level: number;
  cost: number;
  coinTier: TowerCoinTier;
  bonusPercent: number;
}

export const TOWER_UPGRADE_TABLE: TowerUpgradeLevel[] = [
  { level: 1,  cost: 10,  coinTier: 'Ярь-Медь',          bonusPercent: 1 },
  { level: 2,  cost: 25,  coinTier: 'Ярь-Медь',          bonusPercent: 2 },
  { level: 3,  cost: 50,  coinTier: 'Ярь-Медь',          bonusPercent: 3 },
  { level: 4,  cost: 75,  coinTier: 'Ярь-Медь',          bonusPercent: 4 },
  { level: 5,  cost: 100, coinTier: 'Кованое Серебро',   bonusPercent: 5 },
  { level: 6,  cost: 125, coinTier: 'Кованое Серебро',   bonusPercent: 6 },
  { level: 7,  cost: 150, coinTier: 'Кованое Серебро',   bonusPercent: 7 },
  { level: 8,  cost: 175, coinTier: 'Кованое Серебро',   bonusPercent: 8 },
  { level: 9,  cost: 200, coinTier: 'Червонное Золото',  bonusPercent: 9 },
  { level: 10, cost: 225, coinTier: 'Червонное Золото',  bonusPercent: 10 },
  { level: 11, cost: 250, coinTier: 'Червонное Золото',  bonusPercent: 11 },
  { level: 12, cost: 275, coinTier: 'Червонное Золото',  bonusPercent: 12 },
  { level: 13, cost: 300, coinTier: 'Пламень-Сталь',     bonusPercent: 13 },
  { level: 14, cost: 325, coinTier: 'Пламень-Сталь',     bonusPercent: 14 },
  { level: 15, cost: 350, coinTier: 'Пламень-Сталь',     bonusPercent: 15 },
  { level: 16, cost: 375, coinTier: 'Пламень-Сталь',     bonusPercent: 16 },
  { level: 17, cost: 400, coinTier: 'Лунный Мефрил',     bonusPercent: 17 },
  { level: 18, cost: 425, coinTier: 'Лунный Мефрил',     bonusPercent: 18 },
  { level: 19, cost: 450, coinTier: 'Лунный Мефрил',     bonusPercent: 19 },
  { level: 20, cost: 500, coinTier: 'Лунный Мефрил',     bonusPercent: 20 },
];

// Conversion rates: 1 higher tier = 2 lower tier coins
export function getConversionRate(fromTier: TowerCoinTier, toTier: TowerCoinTier): number {
  const fromIdx = TOWER_COIN_TIERS.indexOf(fromTier);
  const toIdx = TOWER_COIN_TIERS.indexOf(toTier);
  if (fromIdx <= toIdx) return 0;
  return Math.pow(2, fromIdx - toIdx);
}

export type TowerUpgrades = Record<string, Record<TowerStat, number>>;

export function createInitialTowerUpgrades(): TowerUpgrades {
  const upgrades: TowerUpgrades = {};
  for (const el of TOWER_ELEMENTS) {
    upgrades[el] = { hp: 0, atk: 0, def: 0, critChance: 0, resistance: 0, accuracy: 0 };
  }
  return upgrades;
}

export function getTowerBonus(upgrades: TowerUpgrades, element: string, stat: TowerStat): number {
  const level = upgrades[element]?.[stat] ?? 0;
  if (level <= 0) return 0;
  const entry = TOWER_UPGRADE_TABLE[level - 1];
  return entry?.bonusPercent ?? 0;
}

/**
 * Check if player can afford the upgrade cost, using auto-conversion from higher tiers.
 * Returns spend map (keyed by tier) or null if can't afford.
 */
export function getAvailableCoins(
  arenaCoins: Record<string, number>,
  targetTier: TowerCoinTier,
  needed: number,
): { canAfford: boolean; spend: Record<string, number> } {
  const targetIdx = TOWER_COIN_TIERS.indexOf(targetTier);
  let remaining = needed;
  const spend: Record<string, number> = {};

  // Use direct coins first
  const direct = Math.min(arenaCoins[targetTier] ?? 0, remaining);
  if (direct > 0) {
    spend[targetTier] = direct;
    remaining -= direct;
  }

  if (remaining <= 0) return { canAfford: true, spend };

  // Try converting from higher tiers
  for (let i = targetIdx + 1; i < TOWER_COIN_TIERS.length; i++) {
    const higherTier = TOWER_COIN_TIERS[i];
    const rate = getConversionRate(higherTier, targetTier);
    const available = arenaCoins[higherTier] ?? 0;
    if (available <= 0) continue;

    const neededHigher = Math.ceil(remaining / rate);
    const useHigher = Math.min(neededHigher, available);
    const converted = useHigher * rate;

    spend[higherTier] = (spend[higherTier] ?? 0) + useHigher;
    remaining -= converted;

    if (remaining <= 0) break;
  }

  return { canAfford: remaining <= 0, spend };
}
