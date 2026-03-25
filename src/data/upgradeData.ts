export interface UpgradeCost {
  starLevel: number;
  copiesRequired: number;
  /** Star level the fodder heroes must have */
  fodderStars: number;
}

// New star upgrade system:
// 0→1★: 1 hero with 0★ lvl50 (any hero)
// 1→2★: 2 heroes with 1★ lvl50
// 2→3★: 3 heroes with 2★ lvl50
// 3→4★: 4 heroes with 3★ lvl50
// 4→5★: 5 heroes with 4★ lvl50
export const STAR_UPGRADE_COSTS: UpgradeCost[] = [
  { starLevel: 1, copiesRequired: 1, fodderStars: 0 },
  { starLevel: 2, copiesRequired: 2, fodderStars: 1 },
  { starLevel: 3, copiesRequired: 3, fodderStars: 2 },
  { starLevel: 4, copiesRequired: 4, fodderStars: 3 },
  { starLevel: 5, copiesRequired: 5, fodderStars: 4 },
];

export const STAR_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.5,
  2: 2.0,
  3: 2.5,
  4: 3.0,
  5: 3.5,
};

// XP required to reach each level (up to 100 for 5★ heroes)
export const XP_PER_LEVEL: Record<number, number> = {};
for (let i = 1; i <= 100; i++) {
  XP_PER_LEVEL[i] = i === 1 ? 0 : Math.floor(50 * Math.pow(i, 1.8));
}

export const MAX_LEVEL = 50;
export const MAX_LEVEL_5STAR = 100;
export const MAX_STARS = 5;

/** Returns max level a hero can reach based on their star count */
export function getMaxLevelForStars(stars: number): number {
  return stars >= MAX_STARS ? MAX_LEVEL_5STAR : MAX_LEVEL;
}

export function getNextLevelXp(level: number, stars: number = 0): number {
  const maxLvl = getMaxLevelForStars(stars);
  if (level >= maxLvl) return Infinity;
  return XP_PER_LEVEL[level + 1] ?? Infinity;
}

export function getLevelFromXp(totalXp: number, stars: number = 0): number {
  const maxLvl = getMaxLevelForStars(stars);
  let lvl = 1;
  for (let i = 2; i <= maxLvl; i++) {
    if (totalXp >= XP_PER_LEVEL[i]) lvl = i;
    else break;
  }
  return lvl;
}

export function getStarUpgradeCost(currentStars: number): UpgradeCost | null {
  return STAR_UPGRADE_COSTS.find(c => c.starLevel === currentStars + 1) ?? null;
}

// Stat bonus per level (flat % of base)
export const LEVEL_STAT_BONUS_PER_LEVEL = 0.02; // 2% per level

// === Red Star (Ascension) System ===
export const MAX_RED_STARS = 5;

// Rune rarity required per red star level
export const ASCENSION_RUNE_RARITY: Record<number, string> = {
  1: 'Обиходный',
  2: 'Заветный',
  3: 'Сказанный',
  4: 'Калиновый',
  5: 'Самоцветный',
};

export interface AscensionCost {
  redStar: number;
  elementRunes: number;
  divineRunes: number;
  runeRarity: string;
}

export const ASCENSION_COSTS: AscensionCost[] = [
  { redStar: 1, elementRunes: 25, divineRunes: 25, runeRarity: 'Обиходный' },
  { redStar: 2, elementRunes: 50, divineRunes: 50, runeRarity: 'Заветный' },
  { redStar: 3, elementRunes: 75, divineRunes: 75, runeRarity: 'Сказанный' },
  { redStar: 4, elementRunes: 100, divineRunes: 100, runeRarity: 'Калиновый' },
  { redStar: 5, elementRunes: 150, divineRunes: 150, runeRarity: 'Самоцветный' },
];

// Red star stat multipliers (additive on top of 5★ base)
export const RED_STAR_STAT_MULTIPLIERS: Record<number, number> = {
  0: 0,
  1: 0.15,  // +15% base stats
  2: 0.15,  // same (skill bonus at 2★)
  3: 0.15,  // same (cooldown bonus at 3★)
  4: 0.15,  // same (cooldown bonus at 4★)
  5: 0.15,  // same (skill bonus at 5★)
};

export function getAscensionCost(currentRedStars: number): AscensionCost | null {
  return ASCENSION_COSTS.find(c => c.redStar === currentRedStars + 1) ?? null;
}

// Element → rune key mapping
export const ELEMENT_RUNE_KEY: Record<string, string> = {
  'Огонь': 'Огонь',
  'Вода': 'Вода',
  'Лес': 'Лес',
  'Камень': 'Камень',
  'Тень': 'Тень',
  'Свет': 'Свет',
};

export const ELEMENT_RUNE_NAMES: Record<string, string> = {
  'Огонь': 'Руна Пламени',
  'Вода': 'Руна Потока',
  'Лес': 'Руна Древа',
  'Камень': 'Руна Горы',
  'Тень': 'Руна Мрака',
  'Свет': 'Руна Сияния',
};

export const RED_STAR_BONUSES: Record<number, string> = {
  1: '+15% к базовым HP, АТК, ЗАЩ',
  2: '+20% к урону первого навыка',
  3: 'Откат 2-го навыка уменьшен на 1 ход',
  4: 'Откат 2-го навыка уменьшен на 1 ход',
  5: '+25% к урону первого навыка',
};
