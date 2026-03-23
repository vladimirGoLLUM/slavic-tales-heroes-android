export interface UpgradeCost {
  starLevel: number;
  copiesRequired: number;
}

export const STAR_UPGRADE_COSTS: UpgradeCost[] = [
  { starLevel: 1, copiesRequired: 2 },
  { starLevel: 2, copiesRequired: 5 },
  { starLevel: 3, copiesRequired: 8 },
  { starLevel: 4, copiesRequired: 12 },
  { starLevel: 5, copiesRequired: 20 },
];

export const STAR_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.5,
  2: 2.0,
  3: 2.5,
  4: 3.0,
  5: 3.5,
};

// XP required to reach each level
export const XP_PER_LEVEL: Record<number, number> = {};
for (let i = 1; i <= 50; i++) {
  XP_PER_LEVEL[i] = i === 1 ? 0 : Math.floor(50 * Math.pow(i, 1.8));
}

export const MAX_LEVEL = 50;
export const MAX_STARS = 5;

export function getNextLevelXp(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return XP_PER_LEVEL[level + 1] ?? Infinity;
}

export function getLevelFromXp(totalXp: number): number {
  let lvl = 1;
  for (let i = 2; i <= MAX_LEVEL; i++) {
    if (totalXp >= XP_PER_LEVEL[i]) lvl = i;
    else break;
  }
  return lvl;
}

export function getStarUpgradeCost(currentStars: number): number | null {
  const cost = STAR_UPGRADE_COSTS.find(c => c.starLevel === currentStars + 1);
  return cost ? cost.copiesRequired : null;
}

// Stat bonus per level (flat % of base)
export const LEVEL_STAT_BONUS_PER_LEVEL = 0.02; // 2% per level

// === Red Star (Ascension) System ===
export const MAX_RED_STARS = 5;

export interface AscensionCost {
  redStar: number;
  elementRunes: number;
  divineRunes: number;
}

export const ASCENSION_COSTS: AscensionCost[] = [
  { redStar: 1, elementRunes: 25, divineRunes: 25 },
  { redStar: 2, elementRunes: 50, divineRunes: 50 },
  { redStar: 3, elementRunes: 75, divineRunes: 75 },
  { redStar: 4, elementRunes: 100, divineRunes: 100 },
  { redStar: 5, elementRunes: 150, divineRunes: 150 },
];

// Red star stat multipliers (additive on top of 5★ base)
export const RED_STAR_STAT_MULTIPLIERS: Record<number, number> = {
  0: 0,
  1: 0.3,  // +30% base stats
  2: 0.3,  // same (skill bonus at 2★)
  3: 0.3,  // same (cooldown bonus at 3★)
  4: 0.6,  // +60% base stats
  5: 0.6,  // same (skill bonus at 5★)
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
  1: 'Увеличивает базовые параметры героя',
  2: 'Увеличивает атаку первого навыка',
  3: 'Уменьшает откат 2-го навыка на 2 хода',
  4: 'Увеличивает базовые параметры героя',
  5: 'Увеличивает атаку первого навыка',
};
