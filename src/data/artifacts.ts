// ═══════════════════════════════════════════════════
// Artifact system v2 — 9 slots, 2-piece sets, substat unlocking
// ═══════════════════════════════════════════════════

export type ArtifactSlot = 'weapon' | 'helmet' | 'shield' | 'gloves' | 'armor' | 'boots' | 'ring' | 'amulet' | 'banner';

export type ArtifactSet =
  | 'Жизнь'
  | 'Атака'
  | 'Защита'
  | 'Крит. шанс'
  | 'Меткость'
  | 'Скорость'
  | 'Сопротивление'
  | 'Крит. урон'
  | 'Вампиризм'
  | 'Возмездие'
  | 'Ярость'
  | 'Стойкость'
  | 'Рассечение'
  | 'Неуязвимость'
  | 'Контратака'
  | 'Отравление'
  | 'Заморозка'
  | 'Регенерация'
  | 'Проклятие'
  | 'Берсерк'
  | 'Воля Волхва'
  | 'Крик Леля'
  | 'Зов Перуна'
  | 'Гнев Гидры'
  | 'Клыки Цербера'
  | 'Чёрная Вдова'
  | 'Каменный Жук'
  | 'Огненный Змей'
  | 'Ледяная'
  | 'Небесный'
  | 'Дренос'
  | 'Боммал'
  | 'Тёмная';

export type ArtifactRarity = 'Обиходный' | 'Заветный' | 'Сказанный' | 'Калиновый' | 'Самоцветный';

export interface ArtifactStats {
  hp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  critChance?: number;
  critDmg?: number;
  resistance?: number;
  accuracy?: number;
  lifesteal?: number;
}

/** Whether a stat value is percentage-based */
export type StatValueType = 'flat' | 'percent';

export interface StatOption {
  stat: keyof ArtifactStats;
  type: StatValueType;
}

export interface SubstatEntry {
  stat: keyof ArtifactStats;
  type: StatValueType;
  value: number;       // base value (set at generation)
  boosts: number;      // number of milestone boosts received
  unlockLevel: number; // 0 = unlocked at start, or 5/10/15/20
}

export interface Artifact {
  id: string;
  name: string;
  set: ArtifactSet;
  slot: ArtifactSlot;
  rarity: ArtifactRarity;
  stars: number; // 1-5
  level: number;
  primaryStat: keyof ArtifactStats;
  primaryType: StatValueType;
  primaryValue: number;
  substats: SubstatEntry[];
  imageUrl?: string;
  locked?: boolean;
  furnaceLevel?: number; // 0-10, enhancement from Горнило
  furnaceBossId?: string; // which boss material was used for furnace
}

/** Boss-specific furnace flame colors (HSL) */
export const FURNACE_BOSS_COLORS: Record<string, string> = {
  'widow':  'hsl(280, 70%, 60%)',  // purple — Мара
  'scarab': 'hsl(35, 80%, 55%)',   // amber — Кощей
  'dragon': 'hsl(10, 90%, 55%)',   // red-orange — Горыныч
  'frost':  'hsl(195, 85%, 60%)',  // ice blue — Морена
  'griffin': 'hsl(50, 90%, 65%)',  // golden — Симург
  'ancient': 'hsl(130, 60%, 50%)', // green — Индрик
  'golem':  'hsl(25, 65%, 45%)',   // brown — Чудище
  'fairy':  'hsl(270, 50%, 50%)',  // dark violet — Навка
};

/** Boss ID → set name mapping (duplicated here to avoid circular import from abyssData) */
const FURNACE_BOSS_SET_MAP: Record<string, string> = {
  'widow': 'Чёрная Вдова',
  'scarab': 'Каменный Жук',
  'dragon': 'Огненный Змей',
  'frost': 'Ледяная',
  'griffin': 'Небесный',
  'ancient': 'Дренос',
  'golem': 'Боммал',
  'fairy': 'Тёмная',
};

/* ─── Furnace (Горнило) upgrade constants ─── */
export const MAX_FURNACE_LEVEL = 10;

/** Material cost per furnace level (1-indexed: level 1 costs FURNACE_COSTS[0]) */
export const FURNACE_COSTS: number[] = [1, 1, 2, 2, 3, 3, 4, 5, 6, 8];

/** Matching set bonus per furnace level: +5% primary stat per level */
export const FURNACE_MATCHING_BONUS = 0.05;
/** Non-matching bonus per level: +3% primary stat per level */
export const FURNACE_GENERIC_BONUS = 0.03;

/** Get total furnace primary stat multiplier */
export function getFurnaceMultiplier(artifact: Artifact, isMatchingSet: boolean): number {
  const level = artifact.furnaceLevel ?? 0;
  if (level === 0) return 1;
  const bonusPerLevel = isMatchingSet ? FURNACE_MATCHING_BONUS : FURNACE_GENERIC_BONUS;
  return 1 + level * bonusPerLevel;
}

function isFurnaceMatchingSet(artifact: Artifact): boolean {
  if (!artifact.furnaceBossId) return false;
  const bossSet = FURNACE_BOSS_SET_MAP[artifact.furnaceBossId];
  return !!bossSet && bossSet === artifact.set;
}

/** Get final furnace multiplier for artifact.
 * Legacy artifacts (with level but without furnaceBossId) use generic bonus by default. */
export function getArtifactFurnaceMultiplier(artifact: Artifact): number {
  const level = artifact.furnaceLevel ?? 0;
  if (level <= 0) return 1;
  return getFurnaceMultiplier(artifact, isFurnaceMatchingSet(artifact));
}

/** Get current furnace bonus percent for UI */
export function getArtifactFurnaceBonusPercent(artifact: Artifact): number {
  const level = artifact.furnaceLevel ?? 0;
  if (level <= 0) return 0;
  const perLevel = isFurnaceMatchingSet(artifact) ? FURNACE_MATCHING_BONUS : FURNACE_GENERIC_BONUS;
  return Math.round(level * perLevel * 100);
}

/** Get furnace-boosted primary value for display */
export function getFurnaceBoostedPrimaryValue(artifact: Artifact): number {
  const level = artifact.furnaceLevel ?? 0;
  if (level <= 0) return artifact.primaryValue;
  const mult = getArtifactFurnaceMultiplier(artifact);
  if (artifact.primaryType === 'percent') {
    return Math.round(artifact.primaryValue * mult * 100) / 100;
  }
  return Math.floor(artifact.primaryValue * mult);
}
/** Total materials needed for next furnace level */
export function getFurnaceCost(currentFurnaceLevel: number): number {
  if (currentFurnaceLevel >= MAX_FURNACE_LEVEL) return Infinity;
  return FURNACE_COSTS[currentFurnaceLevel];
}

/* ─── Slot display info ─── */

export const SLOT_LABELS: Record<ArtifactSlot, string> = {
  weapon: 'Оружие',
  helmet: 'Шлем',
  shield: 'Щит',
  gloves: 'Перчатки',
  armor: 'Доспех',
  boots: 'Сапоги',
  ring: 'Перстень',
  amulet: 'Амулет',
  banner: 'Знамя',
};

export const SLOT_ICONS: Record<ArtifactSlot, string> = {
  weapon: '/artifacts/slot_weapon.png',
  helmet: '/artifacts/slot_helmet.png',
  shield: '/artifacts/slot_shield.png',
  gloves: '/artifacts/slot_gloves.png',
  armor: '/artifacts/slot_armor.png',
  boots: '/artifacts/slot_boots.png',
  ring: '/artifacts/slot_ring.png',
  amulet: '/artifacts/slot_amulet.png',
  banner: '/artifacts/slot_banner.png',
};

export const SLOT_EMOJI: Record<ArtifactSlot, string> = {
  weapon: '⚔️',
  helmet: '⛑️',
  shield: '🛡️',
  gloves: '🧤',
  armor: '🪖',
  boots: '👢',
  ring: '💍',
  amulet: '📿',
  banner: '🚩',
};

export const ALL_SLOTS: ArtifactSlot[] = ['weapon', 'helmet', 'shield', 'gloves', 'armor', 'boots', 'ring', 'amulet', 'banner'];
export const MAIN_SLOTS: ArtifactSlot[] = ['weapon', 'helmet', 'shield', 'gloves', 'armor', 'boots'];
export const ACCESSORY_SLOTS: ArtifactSlot[] = ['ring', 'amulet', 'banner'];

/** Star requirements for accessory slots */
export const ACCESSORY_STAR_REQUIREMENTS: Partial<Record<ArtifactSlot, number>> = {
  ring: 2,
  amulet: 3,
  banner: 4,
};

export const ALL_SETS: ArtifactSet[] = [
  'Жизнь', 'Атака', 'Защита', 'Крит. шанс',
  'Меткость', 'Скорость', 'Сопротивление', 'Крит. урон',
  'Вампиризм', 'Возмездие', 'Ярость', 'Стойкость',
  'Рассечение', 'Неуязвимость', 'Контратака', 'Отравление',
  'Заморозка', 'Регенерация', 'Проклятие', 'Берсерк',
  'Воля Волхва', 'Крик Леля', 'Зов Перуна', 'Гнев Гидры', 'Клыки Цербера',
  'Чёрная Вдова',
  'Каменный Жук',
  'Огненный Змей',
  'Ледяная',
  'Небесный',
  'Дренос',
  'Боммал',
  'Тёмная',
];

export const ALL_ARTIFACT_RARITIES: ArtifactRarity[] = [
  'Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный',
];

export const SET_ICONS: Record<ArtifactSet, string> = {
  'Жизнь': '/sets/set_life.png',
  'Атака': '/sets/set_attack.png',
  'Защита': '/sets/set_defense.png',
  'Крит. шанс': '/sets/set_crit_chance.png',
  'Меткость': '/sets/set_accuracy.png',
  'Скорость': '/sets/set_speed.png',
  'Сопротивление': '/sets/set_resistance.png',
  'Крит. урон': '/sets/set_crit_dmg.png',
  'Вампиризм': '/sets/set_vampirism.png',
  'Возмездие': '/sets/set_retribution.png',
  'Ярость': '/sets/set_fury.png',
  'Стойкость': '/sets/set_resilience.png',
  'Рассечение': '/sets/set_cleave.png',
  'Неуязвимость': '/sets/set_invulnerability.png',
  'Контратака': '/sets/set_counterattack.png',
  'Отравление': '/sets/set_poison.png',
  'Заморозка': '/sets/set_freeze.png',
  'Регенерация': '/sets/set_regeneration.png',
  'Проклятие': '/sets/set_curse.png',
  'Берсерк': '/sets/set_berserker.png',
  'Воля Волхва': '/sets/set_volkhv.png',
  'Крик Леля': '/sets/set_lelya.png',
  'Зов Перуна': '/sets/set_perun.png',
  'Гнев Гидры': '/sets/set_hydra.png',
  'Клыки Цербера': '/sets/set_cerberus_art.png',
  'Чёрная Вдова': '/sets/set_beheader.png',
  'Каменный Жук': '/sets/set_stone_beetle.png',
  'Огненный Змей': '/sets/set_fire_serpent.png',
  'Ледяная': '/sets/set_frost_morena.png',
  'Небесный': '/sets/set_celestial_simurg.png',
  'Дренос': '/sets/set_drenos_indrik.png',
  'Боммал': '/sets/set_bommal_golem.png',
  'Тёмная': '/sets/set_dark_navka.png',
};

/* ─── Allowed primary stats per slot ─── */

export const SLOT_PRIMARY_OPTIONS: Record<ArtifactSlot, StatOption[]> = {
  weapon: [{ stat: 'atk', type: 'flat' }],
  helmet: [{ stat: 'hp', type: 'flat' }],
  shield: [{ stat: 'def', type: 'flat' }],
  gloves: [
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
  ],
  armor: [
    { stat: 'accuracy', type: 'flat' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
  ],
  boots: [
    { stat: 'spd', type: 'flat' },
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
  ],
  ring: [
    { stat: 'hp', type: 'flat' },
    { stat: 'atk', type: 'flat' },
    { stat: 'def', type: 'flat' },
  ],
  amulet: [
    { stat: 'critDmg', type: 'percent' },
    { stat: 'hp', type: 'flat' },
    { stat: 'atk', type: 'flat' },
    { stat: 'def', type: 'flat' },
  ],
  banner: [
    { stat: 'accuracy', type: 'flat' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'hp', type: 'flat' },
    { stat: 'atk', type: 'flat' },
    { stat: 'def', type: 'flat' },
  ],
};

/* ─── Allowed substats per slot ─── */

export const SLOT_SUBSTAT_OPTIONS: Record<ArtifactSlot, StatOption[]> = {
  weapon: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'percent' },
    { stat: 'spd', type: 'flat' },
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
  ],
  helmet: [
    { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
    { stat: 'spd', type: 'flat' },
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
  ],
  shield: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'def', type: 'percent' },
    { stat: 'spd', type: 'flat' },
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
  ],
  gloves: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
    { stat: 'spd', type: 'flat' },
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
  ],
  armor: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
    { stat: 'spd', type: 'flat' },
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
  ],
  boots: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
    { stat: 'spd', type: 'flat' },
    { stat: 'critChance', type: 'percent' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
  ],
  ring: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
  ],
  amulet: [
    { stat: 'hp', type: 'flat' },
    { stat: 'atk', type: 'flat' },
    { stat: 'def', type: 'flat' },
    { stat: 'accuracy', type: 'flat' },
    { stat: 'critDmg', type: 'percent' },
    { stat: 'resistance', type: 'flat' },
  ],
  banner: [
    { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
    { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
    { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
  ],
};

/* ─── Set bonuses (all 2-piece) ─── */

export interface SetBonus {
  pieces: number;
  label: string;
  stats: ArtifactStats;
}

export const SET_BONUSES: Record<ArtifactSet, SetBonus[]> = {
  'Жизнь': [
    { pieces: 2, label: '+15% ЗДР', stats: { hp: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +10% ЗДР (итого 70%)', stats: { hp: 0.10 } },
  ],
  'Атака': [
    { pieces: 2, label: '+15% АТК', stats: { atk: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +10% АТК (итого 70%)', stats: { atk: 0.10 } },
  ],
  'Защита': [
    { pieces: 2, label: '+15% ЗАЩ', stats: { def: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +10% ЗАЩ (итого 70%)', stats: { def: 0.10 } },
  ],
  'Крит. шанс': [
    { pieces: 2, label: '+12% Крит. шанс', stats: { critChance: 0.12 } },
    { pieces: 9, label: '🏆 Полный сет: +8% Крит. шанс (итого 56%)', stats: { critChance: 0.08 } },
  ],
  'Меткость': [
    { pieces: 2, label: '+40 Меткость', stats: { accuracy: 40 } },
    { pieces: 9, label: '🏆 Полный сет: +25 Меткость (итого 185)', stats: { accuracy: 25 } },
  ],
  'Скорость': [
    { pieces: 2, label: '+12 Скорость', stats: { spd: 12 } },
    { pieces: 9, label: '🏆 Полный сет: +8 Скорость (итого 56)', stats: { spd: 8 } },
  ],
  'Сопротивление': [
    { pieces: 2, label: '+40 Сопротивление', stats: { resistance: 40 } },
    { pieces: 9, label: '🏆 Полный сет: +25 Сопротивление (итого 185)', stats: { resistance: 25 } },
  ],
  'Крит. урон': [
    { pieces: 2, label: '+20% Крит. урон', stats: { critDmg: 0.20 } },
    { pieces: 9, label: '🏆 Полный сет: +15% Крит. урон (итого 95%)', stats: { critDmg: 0.15 } },
  ],
  'Вампиризм': [
    { pieces: 2, label: '+15% Кража жизни', stats: { lifesteal: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +10% Кража жизни (итого 70%)', stats: { lifesteal: 0.10 } },
  ],
  'Возмездие': [
    { pieces: 2, label: '+12% АТК, +8% Крит.', stats: { atk: 0.12, critChance: 0.08 } },
    { pieces: 9, label: '🏆 Полный сет: +8% АТК, +5% Крит.', stats: { atk: 0.08, critChance: 0.05 } },
  ],
  'Ярость': [
    { pieces: 2, label: '+20% АТК при ЗДР<50%', stats: { atk: 0.20 } },
    { pieces: 9, label: '🏆 Полный сет: +15% АТК (итого 95%)', stats: { atk: 0.15 } },
  ],
  'Стойкость': [
    { pieces: 2, label: '+20% ЗАЩ, +10% ЗДР', stats: { def: 0.20, hp: 0.10 } },
    { pieces: 9, label: '🏆 Полный сет: +15% ЗАЩ, +8% ЗДР', stats: { def: 0.15, hp: 0.08 } },
  ],
  'Рассечение': [
    { pieces: 2, label: '+15% Крит. урон, +8% Крит.', stats: { critDmg: 0.15, critChance: 0.08 } },
    { pieces: 9, label: '🏆 Полный сет: +10% Крит. урон, +5% Крит.', stats: { critDmg: 0.10, critChance: 0.05 } },
  ],
  'Неуязвимость': [
    { pieces: 2, label: '+25% ЗАЩ', stats: { def: 0.25 } },
    { pieces: 9, label: '🏆 Полный сет: +15% ЗАЩ (итого 115%)', stats: { def: 0.15 } },
  ],
  'Контратака': [
    { pieces: 2, label: '+10% АТК, +15 СКР', stats: { atk: 0.10, spd: 15 } },
    { pieces: 9, label: '🏆 Полный сет: +8% АТК, +10 СКР', stats: { atk: 0.08, spd: 10 } },
  ],
  'Отравление': [
    { pieces: 2, label: '+30 Меткость, +10% АТК', stats: { accuracy: 30, atk: 0.10 } },
    { pieces: 9, label: '🏆 Полный сет: +20 Метк., +8% АТК', stats: { accuracy: 20, atk: 0.08 } },
  ],
  'Заморозка': [
    { pieces: 2, label: '+20 СКР, +30 Сопр.', stats: { spd: 20, resistance: 30 } },
    { pieces: 9, label: '🏆 Полный сет: +12 СКР, +20 Сопр.', stats: { spd: 12, resistance: 20 } },
  ],
  'Регенерация': [
    { pieces: 2, label: '+20% ЗДР', stats: { hp: 0.20 } },
    { pieces: 9, label: '🏆 Полный сет: +15% ЗДР (итого 95%)', stats: { hp: 0.15 } },
  ],
  'Проклятие': [
    { pieces: 2, label: '+40 Меткость, +10% Крит.', stats: { accuracy: 40, critChance: 0.10 } },
    { pieces: 9, label: '🏆 Полный сет: +25 Метк., +8% Крит.', stats: { accuracy: 25, critChance: 0.08 } },
  ],
  'Берсерк': [
    { pieces: 2, label: '+25% АТК, -10% ЗАЩ', stats: { atk: 0.25, def: -0.10 } },
    { pieces: 9, label: '🏆 Полный сет: +15% АТК, -8% ЗАЩ', stats: { atk: 0.15, def: -0.08 } },
  ],
  'Воля Волхва': [
    { pieces: 2, label: '+20 Сопр., +20 Метк., +15% ЗДР', stats: { resistance: 20, accuracy: 20, hp: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +12 Сопр., +12 Метк., +10% ЗДР', stats: { resistance: 12, accuracy: 12, hp: 0.10 } },
  ],
  'Крик Леля': [
    { pieces: 2, label: '+15% Крит., +10% Крит.У, +10 Сопр.', stats: { critChance: 0.15, critDmg: 0.10, resistance: 10 } },
    { pieces: 9, label: '🏆 Полный сет: +10% Крит., +8% Крит.У, +8 Сопр.', stats: { critChance: 0.10, critDmg: 0.08, resistance: 8 } },
  ],
  'Зов Перуна': [
    { pieces: 2, label: '+20% АТК, +10 СКР, +15% Кража жизни', stats: { atk: 0.20, spd: 10, lifesteal: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +15% АТК, +8 СКР, +10% Кража жизни', stats: { atk: 0.15, spd: 8, lifesteal: 0.10 } },
  ],
  'Гнев Гидры': [
    { pieces: 3, label: '+15% АТК, +10% Крит.У, +20% Кража жизни', stats: { atk: 0.15, critDmg: 0.10, lifesteal: 0.20 } },
    { pieces: 9, label: '🏆 Полный сет: +10% АТК, +10% Крит.У, +10% Кража жизни', stats: { atk: 0.10, critDmg: 0.10, lifesteal: 0.10 } },
  ],
  'Клыки Цербера': [
    { pieces: 3, label: '+15% АТК, +15 СКР, +20 Метк.', stats: { atk: 0.15, spd: 15, accuracy: 20 } },
    { pieces: 9, label: '🏆 Полный сет: +10% АТК, +10 СКР, +10 Метк.', stats: { atk: 0.10, spd: 10, accuracy: 10 } },
  ],
  'Чёрная Вдова': [
    { pieces: 3, label: '+30% Крит. урон, 20% шанс слабого удара стать критическим', stats: { critDmg: 0.30 } },
    { pieces: 9, label: '🏆 Полный сет: 100% Крит. шанс', stats: { critChance: 1.0 } },
  ],
  'Каменный Жук': [
    { pieces: 3, label: '+40 Сопр., иммунитет на 2 хода в начале раунда', stats: { resistance: 40 } },
    { pieces: 9, label: '🏆 Полный сет: +130 Сопр., иммунитет на 3 хода', stats: { resistance: 130 } },
  ],
  'Огненный Змей': [
    { pieces: 3, label: '+20% АТК, +20% Крит. урон', stats: { atk: 0.20, critDmg: 0.20 } },
    { pieces: 9, label: '🏆 Полный сет: +80% АТК, +80% Крит. урон', stats: { atk: 0.80, critDmg: 0.80 } },
  ],
  'Ледяная': [
    { pieces: 3, label: '20% блок Заморозки, 20% шанс Заморозки при атаке', stats: {} },
    { pieces: 9, label: '🏆 Полный сет: 80% блок и наложение Заморозки', stats: {} },
  ],
  'Небесный': [
    { pieces: 3, label: '+12% Крит. урон, 30% кража жизни от урона', stats: { critDmg: 0.12, lifesteal: 30 } },
    { pieces: 9, label: '🏆 Полный сет: +50% Крит. урон, 100% кража жизни', stats: { critDmg: 0.50, lifesteal: 100 } },
  ],
  'Дренос': [
    { pieces: 3, label: 'Поглощает 10% урона союзников, +10% регенерация ЗДР/ход', stats: {} },
    { pieces: 9, label: '🏆 Полный сет: 40% поглощение урона, 40% регенерация ЗДР/ход', stats: {} },
  ],
  'Боммал': [
    { pieces: 3, label: '+50 Сопротивление, +15% Защита', stats: { resistance: 50, def: 0.15 } },
    { pieces: 9, label: '🏆 Полный сет: +160 Сопротивление, +50% Защита', stats: { resistance: 160, def: 0.50 } },
  ],
  'Тёмная': [
    { pieces: 3, label: '+10% Крит. урон, игнор. 25% защиты', stats: { critDmg: 0.10 } },
    { pieces: 9, label: '🏆 Полный сет: +40% Крит. урон, игнор. 80% защиты', stats: { critDmg: 0.40 } },
  ],
};

/* ─── Rarity → initial substat count (unlocked at level 0) ─── */

export function getInitialSubstatCount(rarity: ArtifactRarity): number {
  return ALL_ARTIFACT_RARITIES.indexOf(rarity); // 0,1,2,3,4
}

/** Total substats every artifact has (4) — some start locked */
export const TOTAL_SUBSTAT_SLOTS = 4;

/** Milestone levels where substats are unlocked or boosted */
export const SUBSTAT_MILESTONE_LEVELS = [5, 10, 15, 20];

/**
 * At each milestone, existing (unlocked) substats get boosted.
 * If there are still locked substats, one gets unlocked instead of a boost.
 * Legendary: all 4 unlocked → all milestones are boosts.
 * Common: 0 unlocked → all milestones are unlocks.
 */

/* ─── Base stat values for generation ─── */

export const BASE_PRIMARY_FLAT: Record<keyof ArtifactStats, number> = {
  hp: 100, atk: 20, def: 15, spd: 8,
  critChance: 5, critDmg: 8, resistance: 10, accuracy: 10, lifesteal: 0,
};

export const BASE_PRIMARY_PERCENT: Record<keyof ArtifactStats, number> = {
  hp: 5, atk: 5, def: 5, spd: 3,
  critChance: 4, critDmg: 6, resistance: 5, accuracy: 5, lifesteal: 0,
};

export const RARITY_MULT: Record<ArtifactRarity, number> = {
  'Обиходный': 1.0,
  'Заветный': 1.3,
  'Сказанный': 1.6,
  'Калиновый': 2.0,
  'Самоцветный': 2.5,
};

/** Star multipliers for artifact primary stat (exponential): 1★=1.0, 2★=1.4, 3★=2.0, 4★=2.8, 5★=4.0 */
export const ARTIFACT_STAR_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.4,
  3: 2.0,
  4: 2.8,
  5: 4.0,
};

export const MAX_ARTIFACT_STARS = 5;

/** Cost to upgrade artifact star: fodder must be same rarity + same star level.
 *  Count needed = current stars: 1★→2★ = 1, 2★→3★ = 2, 3★→4★ = 3, 4★→5★ = 4 */
export const ARTIFACT_STAR_UPGRADE_COSTS: Record<number, number> = {
  1: 1,   // 1★→2★
  2: 2,   // 2★→3★
  3: 3,   // 3★→4★
  4: 4,  // 4★→5★
};

/** Get the number of same-slot, same-rarity, same-star artifacts needed to upgrade star */
export function getArtifactStarUpgradeCost(currentStars: number): number | null {
  return ARTIFACT_STAR_UPGRADE_COSTS[currentStars] ?? null;
}

/** Upgrade artifact star: recalculate primary stat with new star multiplier */
export function starUpgradeArtifact(artifact: Artifact): Artifact | null {
  if (artifact.stars >= MAX_ARTIFACT_STARS) return null;
  const newStars = artifact.stars + 1;
  const mult = RARITY_MULT[artifact.rarity];
  const starMult = ARTIFACT_STAR_MULTIPLIERS[newStars] ?? 1;
  const baseVal = artifact.primaryType === 'percent'
    ? BASE_PRIMARY_PERCENT[artifact.primaryStat]
    : BASE_PRIMARY_FLAT[artifact.primaryStat];
  const newPrimaryValue = Math.floor(baseVal * mult * starMult * (1 + PRIMARY_GROWTH_PER_LEVEL * artifact.level));
  return { ...artifact, stars: newStars, primaryValue: newPrimaryValue };
}

const BASE_SUBSTAT_FLAT: Record<keyof ArtifactStats, number> = {
  hp: 30, atk: 8, def: 6, spd: 3,
  critChance: 2, critDmg: 3, resistance: 5, accuracy: 5, lifesteal: 0,
};

/* ─── All possible substat options ─── */

const ALL_SUBSTAT_OPTIONS: StatOption[] = [
  { stat: 'hp', type: 'flat' }, { stat: 'hp', type: 'percent' },
  { stat: 'atk', type: 'flat' }, { stat: 'atk', type: 'percent' },
  { stat: 'def', type: 'flat' }, { stat: 'def', type: 'percent' },
  { stat: 'spd', type: 'flat' },
  { stat: 'critChance', type: 'percent' },
  { stat: 'critDmg', type: 'percent' },
  { stat: 'resistance', type: 'flat' },
  { stat: 'accuracy', type: 'flat' },
];

/* ─── Slot names for generated artifacts ─── */

const SLOT_NAMES: Record<ArtifactSlot, string[]> = {
  weapon: ['Меч', 'Топор', 'Булава', 'Копьё', 'Клинок'],
  helmet: ['Шлем', 'Шишак', 'Ерихонка', 'Венец'],
  shield: ['Щит', 'Павеза', 'Тарч', 'Заслон'],
  gloves: ['Рукавицы', 'Перчатки', 'Наручи', 'Краги'],
  armor: ['Кольчуга', 'Доспех', 'Панцирь', 'Броня'],
  boots: ['Сапоги', 'Поножи', 'Чоботы', 'Ступни'],
  ring: ['Перстень', 'Кольцо', 'Колечко'],
  amulet: ['Амулет', 'Оберег', 'Ладанка', 'Подвеска'],
  banner: ['Знамя', 'Стяг', 'Хоругвь', 'Вымпел'],
};

const SET_ADJECTIVES: Record<ArtifactSet, string[]> = {
  'Жизнь': ['Живительный', 'Целительный', 'Жизненный'],
  'Атака': ['Яростный', 'Разящий', 'Боевой'],
  'Защита': ['Крепкий', 'Несокрушимый', 'Стойкий'],
  'Крит. шанс': ['Точный', 'Меткий', 'Разящий'],
  'Меткость': ['Зоркий', 'Верный', 'Прицельный'],
  'Скорость': ['Быстрый', 'Стремительный', 'Вихревой'],
  'Сопротивление': ['Стойкий', 'Непокорный', 'Закалённый'],
  'Крит. урон': ['Сокрушающий', 'Губительный', 'Разрушительный'],
  'Вампиризм': ['Кровожадный', 'Алчущий', 'Жаждущий'],
  'Возмездие': ['Карающий', 'Мстительный', 'Гневный'],
  'Ярость': ['Неистовый', 'Бешеный', 'Свирепый'],
  'Стойкость': ['Незыблемый', 'Твёрдый', 'Каменный'],
  'Рассечение': ['Острейший', 'Рассекающий', 'Клинковый'],
  'Неуязвимость': ['Заговорённый', 'Зачарованный', 'Священный'],
  'Контратака': ['Отражающий', 'Ответный', 'Молниеносный'],
  'Отравление': ['Ядовитый', 'Змеиный', 'Отравный'],
  'Заморозка': ['Морозный', 'Ледяной', 'Студёный'],
  'Регенерация': ['Древесный', 'Корневой', 'Природный'],
  'Проклятие': ['Проклятый', 'Тёмный', 'Навий'],
  'Берсерк': ['Безумный', 'Одержимый', 'Берсерковый'],
  'Воля Волхва': ['Волховой', 'Мудрый', 'Вещий'],
  'Крик Леля': ['Лелеев', 'Весенний', 'Пробуждающий'],
  'Зов Перуна': ['Перунов', 'Громовой', 'Молниеносный'],
  'Гнев Гидры': ['Гидрин', 'Змеиный', 'Многоглавый'],
  'Клыки Цербера': ['Церберов', 'Адский', 'Трёхглавый'],
  'Чёрная Вдова': ['Призрачный', 'Обезглавливающий', 'Мёртвый'],
  'Каменный Жук': ['Каменный', 'Жуковый', 'Кощеев'],
  'Огненный Змей': ['Горынычев', 'Пламенный', 'Змеиный'],
  'Ледяная': ['Моренин', 'Ледяной', 'Морозный'],
  'Небесный': ['Симургов', 'Небесный', 'Пернатый'],
  'Дренос': ['Индриков', 'Древесный', 'Дреносов'],
  'Боммал': ['Боммалов', 'Каменистый', 'Чудовищный'],
  'Тёмная': ['Навкин', 'Тёмный', 'Призрачный'],
};

/* ─── Artifact generation ─── */
/** Roll random star level for artifact drop (weighted toward lower stars) */
export function rollArtifactStars(): number {
  const roll = Math.random();
  if (roll < 0.40) return 1;      // 40%
  if (roll < 0.70) return 2;      // 30%
  if (roll < 0.88) return 3;      // 18%
  if (roll < 0.97) return 4;      // 9%
  return 5;                        // 3%
}

export function generateArtifact(rarity: ArtifactRarity, level: number = 0, stars?: number, forceSet?: ArtifactSet, forceSlot?: ArtifactSlot): Artifact {
  const set = forceSet ?? ALL_SETS[Math.floor(Math.random() * ALL_SETS.length)];
  const slot = forceSlot ?? ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
  const mult = RARITY_MULT[rarity];

  // Random star level (weighted toward lower) if not specified
  const artStars = stars ?? rollArtifactStars();

  // Pick primary stat from allowed options for this slot
  const options = SLOT_PRIMARY_OPTIONS[slot];
  const primary = options[Math.floor(Math.random() * options.length)];
  const baseVal = primary.type === 'percent'
    ? BASE_PRIMARY_PERCENT[primary.stat]
    : BASE_PRIMARY_FLAT[primary.stat];
  const starMult = ARTIFACT_STAR_MULTIPLIERS[artStars] ?? 1;
  const primaryValue = Math.floor(baseVal * mult * starMult * (1 + PRIMARY_GROWTH_PER_LEVEL * level));

  // Generate ALL 4 substats, but set unlockLevel based on rarity
  const initialCount = getInitialSubstatCount(rarity);
  const substats: SubstatEntry[] = [];

  const availableSubstats = (SLOT_SUBSTAT_OPTIONS[slot] || []).filter(
    o => !(o.stat === primary.stat && o.type === primary.type)
  );

  // Determine unlock levels: first `initialCount` are unlocked at 0,
  // remaining unlock at successive milestones
  const lockedMilestones = SUBSTAT_MILESTONE_LEVELS.slice(0, TOTAL_SUBSTAT_SLOTS - initialCount);

  for (let i = 0; i < TOTAL_SUBSTAT_SLOTS && availableSubstats.length > 0; i++) {
    const idx = Math.floor(Math.random() * availableSubstats.length);
    const sub = availableSubstats.splice(idx, 1)[0];
    const subBase = sub.type === 'percent' ? 3 : BASE_SUBSTAT_FLAT[sub.stat];
    const value = Math.floor(subBase * mult * (0.8 + Math.random() * 0.4));

    const unlockLevel = i < initialCount ? 0 : lockedMilestones[i - initialCount];

    substats.push({
      stat: sub.stat,
      type: sub.type,
      value: Math.max(1, value),
      boosts: 0,
      unlockLevel,
    });
  }

  // Generate name
  const names = SLOT_NAMES[slot];
  const adjs = SET_ADJECTIVES[set];
  const name = `${adjs[Math.floor(Math.random() * adjs.length)]} ${names[Math.floor(Math.random() * names.length)]}`;

  return {
    id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    set,
    slot,
    rarity,
    stars: artStars,
    level,
    primaryStat: primary.stat,
    primaryType: primary.type,
    primaryValue,
    substats,
  };
}

/** Max artifact level */
export const MAX_ARTIFACT_LEVEL = 20;

/** Primary stat growth per level (percentage of base value added per level) */
const PRIMARY_GROWTH_PER_LEVEL = 0.08; // +8% per level

/** Each milestone boost adds this fraction of base value */
const SUBSTAT_BOOST_FRACTION = 0.25; // +25% of base per boost

/** Rune cost to upgrade artifact by 1 level (depends on rarity + stars) */
export function getArtifactUpgradeCost(artifact: Artifact): number {
  const rarityMult: Record<ArtifactRarity, number> = {
    'Обиходный': 1, 'Заветный': 1.5, 'Сказанный': 2, 'Калиновый': 3, 'Самоцветный': 5,
  };
  const starMult: Record<number, number> = {
    1: 1, 2: 1.2, 3: 1.5, 4: 1.8, 5: 2.2,
  };
  const sm = starMult[artifact.stars] ?? 1;
  return Math.floor((50 + artifact.level * 40) * rarityMult[artifact.rarity] * sm);
}

/** Get primary stat value at a given level (accounts for artifact stars) */
export function getPrimaryValueAtLevel(artifact: Artifact, level: number): number {
  const mult = RARITY_MULT[artifact.rarity];
  const starMult = ARTIFACT_STAR_MULTIPLIERS[artifact.stars] ?? 1;
  const baseVal = artifact.primaryType === 'percent'
    ? BASE_PRIMARY_PERCENT[artifact.primaryStat]
    : BASE_PRIMARY_FLAT[artifact.primaryStat];
  const base = Math.floor(baseVal * mult * starMult);
  return Math.floor(base * (1 + PRIMARY_GROWTH_PER_LEVEL * level));
}

/** Get current substat value including boosts */
export function getSubstatDisplayValue(sub: SubstatEntry, artifactLevel: number): number {
  if (artifactLevel < sub.unlockLevel) return 0;
  return Math.floor(sub.value * (1 + SUBSTAT_BOOST_FRACTION * sub.boosts));
}

/**
 * Level up an artifact. At milestone levels (5,10,15,20):
 * - If a locked substat exists at this milestone → it unlocks (no value change needed, just becomes visible)
 * - If all substats are already unlocked → boost a random existing substat
 * Non-milestone levels: only primary stat grows, substats unchanged.
 */
export function levelUpArtifact(artifact: Artifact): Artifact | null {
  if (artifact.level >= MAX_ARTIFACT_LEVEL) return null;
  const newLevel = artifact.level + 1;

  let newSubstats = artifact.substats.map(s => ({ ...s }));

  // Check if this is a milestone level
  if (SUBSTAT_MILESTONE_LEVELS.includes(newLevel)) {
    // Is there a substat that unlocks at exactly this level?
    const unlocking = newSubstats.find(s => s.unlockLevel === newLevel);
    if (!unlocking) {
      // All substats already unlocked → boost a random one
      const unlocked = newSubstats.filter(s => s.unlockLevel <= newLevel);
      if (unlocked.length > 0) {
        const target = unlocked[Math.floor(Math.random() * unlocked.length)];
        target.boosts += 1;
      }
    }
    // If unlocking exists, it simply becomes visible (unlockLevel <= newLevel) — no extra action needed
  }

  return {
    ...artifact,
    level: newLevel,
    primaryValue: getPrimaryValueAtLevel(artifact, newLevel),
    substats: newSubstats,
  };
}

/** Get unlocked substats for an artifact at its current level */
export function getUnlockedSubstats(artifact: Artifact): SubstatEntry[] {
  return artifact.substats.filter(s => artifact.level >= s.unlockLevel);
}

/** Get locked substats (not yet unlocked) */
export function getLockedSubstats(artifact: Artifact): SubstatEntry[] {
  return artifact.substats.filter(s => artifact.level < s.unlockLevel);
}

/** Calculate total stats from a list of artifacts, including set bonuses */
export function calculateArtifactStats(
  artifacts: Artifact[],
  baseStats: { hp: number; atk: number; def: number; spd: number; critChance: number; critDmg: number; resistance: number; accuracy: number }
): ArtifactStats {
  const total: ArtifactStats = {};

  for (const art of artifacts) {
    // Primary stat with furnace multiplier
    const furnaceMult = getArtifactFurnaceMultiplier(art);

    if (art.primaryType === 'percent') {
      const baseVal = baseStats[art.primaryStat] ?? 0;
      total[art.primaryStat] = (total[art.primaryStat] ?? 0) + Math.floor(baseVal * art.primaryValue / 100 * furnaceMult);
    } else {
      total[art.primaryStat] = (total[art.primaryStat] ?? 0) + Math.floor(art.primaryValue * furnaceMult);
    }

    // Unlocked substats only
    for (const sub of getUnlockedSubstats(art)) {
      const displayVal = getSubstatDisplayValue(sub, art.level);
      if (sub.type === 'percent') {
        const baseVal = baseStats[sub.stat] ?? 0;
        total[sub.stat] = (total[sub.stat] ?? 0) + Math.floor(baseVal * displayVal / 100);
      } else {
        total[sub.stat] = (total[sub.stat] ?? 0) + displayVal;
      }
    }
  }

  // Set bonuses
  const setCounts: Partial<Record<ArtifactSet, number>> = {};
  for (const art of artifacts) {
    setCounts[art.set] = (setCounts[art.set] ?? 0) + 1;
  }

  for (const [set, count] of Object.entries(setCounts) as [ArtifactSet, number][]) {
    const bonuses = SET_BONUSES[set];
    for (const bonus of bonuses) {
      const activations = Math.floor(count / bonus.pieces);
      for (let a = 0; a < activations; a++) {
        for (const [key, val] of Object.entries(bonus.stats) as [keyof ArtifactStats, number][]) {
          if (key === 'spd' || key === 'accuracy' || key === 'resistance') {
            total[key] = (total[key] ?? 0) + val;
          } else if (key === 'lifesteal') {
            total[key] = (total[key] ?? 0) + val;
          } else {
            const baseVal = baseStats[key] ?? 0;
            total[key] = (total[key] ?? 0) + Math.floor(baseVal * val);
          }
        }
      }
    }
  }

  return total;
}

/** Get active set bonuses for display */
export function getActiveSetBonuses(artifacts: Artifact[]): { set: ArtifactSet; bonus: SetBonus; count: number }[] {
  const setCounts: Partial<Record<ArtifactSet, number>> = {};
  for (const art of artifacts) {
    setCounts[art.set] = (setCounts[art.set] ?? 0) + 1;
  }

  const active: { set: ArtifactSet; bonus: SetBonus; count: number }[] = [];
  for (const [set, count] of Object.entries(setCounts) as [ArtifactSet, number][]) {
    const bonuses = SET_BONUSES[set];
    for (const bonus of bonuses) {
      const activations = Math.floor(count / bonus.pieces);
      for (let a = 0; a < activations; a++) {
        active.push({ set, bonus, count });
      }
    }
  }
  return active;
}

export const ARTIFACT_RARITY_COLORS: Record<ArtifactRarity, string> = {
  'Обиходный': 'hsl(40 10% 50%)',
  'Заветный': 'hsl(120 40% 45%)',
  'Сказанный': 'hsl(200 60% 55%)',
  'Калиновый': 'hsl(280 60% 55%)',
  'Самоцветный': 'hsl(40 90% 55%)',
};

export const ARTIFACT_RARITY_GLOW: Record<ArtifactRarity, string> = {
  'Обиходный': '0 0 4px hsl(40 10% 50% / 0.3)',
  'Заветный': '0 0 8px hsl(120 40% 45% / 0.4), inset 0 0 6px hsl(120 40% 45% / 0.1)',
  'Сказанный': '0 0 10px hsl(200 60% 55% / 0.45), inset 0 0 8px hsl(200 60% 55% / 0.1)',
  'Калиновый': '0 0 14px hsl(280 60% 55% / 0.5), 0 0 4px hsl(280 60% 55% / 0.3), inset 0 0 10px hsl(280 60% 55% / 0.15)',
  'Самоцветный': '0 0 18px hsl(40 90% 55% / 0.55), 0 0 6px hsl(40 90% 55% / 0.4), inset 0 0 12px hsl(40 90% 55% / 0.15)',
};

export const ARTIFACT_RARITY_BG: Record<ArtifactRarity, string> = {
  'Обиходный': 'linear-gradient(135deg, hsl(40 10% 50% / 0.08), transparent)',
  'Заветный': 'linear-gradient(135deg, hsl(120 40% 45% / 0.12), hsl(120 40% 45% / 0.03))',
  'Сказанный': 'linear-gradient(135deg, hsl(200 60% 55% / 0.14), hsl(200 60% 55% / 0.04))',
  'Калиновый': 'linear-gradient(135deg, hsl(280 60% 55% / 0.16), hsl(300 40% 40% / 0.05))',
  'Самоцветный': 'linear-gradient(135deg, hsl(40 90% 55% / 0.18), hsl(50 80% 40% / 0.06))',
};

export const ARTIFACT_RARITY_BORDER_WIDTH: Record<ArtifactRarity, number> = {
  'Обиходный': 1,
  'Заветный': 1,
  'Сказанный': 1.5,
  'Калиновый': 2,
  'Самоцветный': 2,
};

export const STAT_LABELS: Record<keyof ArtifactStats, string> = {
  hp: 'ЗДР',
  atk: 'АТК',
  def: 'ЗАЩ',
  spd: 'СКР',
  critChance: 'КРИТ%',
  critDmg: 'КРИТ.У',
  resistance: 'СОПР',
  accuracy: 'МЕТК',
  lifesteal: 'Кража жизни',
};

/** Format a stat value with % or flat */
export function formatStatValue(value: number, type: StatValueType): string {
  return type === 'percent' ? `${value}%` : `${value}`;
}

/** Check if a hero has enough stars to equip an accessory slot */
export function canEquipSlot(slot: ArtifactSlot, heroStars: number): boolean {
  const req = ACCESSORY_STAR_REQUIREMENTS[slot];
  if (req === undefined) return true;
  return heroStars >= req;
}

/** Map set name to file prefix */
const SET_FILE_PREFIX: Record<ArtifactSet, string> = {
  'Жизнь': 'life',
  'Атака': 'attack',
  'Защита': 'defense',
  'Крит. шанс': 'crit_chance',
  'Меткость': 'accuracy',
  'Скорость': 'speed',
  'Сопротивление': 'resistance',
  'Крит. урон': 'crit_dmg',
  'Вампиризм': 'vampirism',
  'Возмездие': 'retribution',
  'Ярость': 'fury',
  'Стойкость': 'resilience',
  'Рассечение': 'cleave',
  'Неуязвимость': 'invulnerability',
  'Контратака': 'counterattack',
  'Отравление': 'poison',
  'Заморозка': 'freeze',
  'Регенерация': 'regeneration',
  'Проклятие': 'curse',
  'Берсерк': 'berserker',
  'Воля Волхва': 'volkhv',
  'Крик Леля': 'lelya',
  'Зов Перуна': 'perun',
  'Гнев Гидры': 'hydra',
  'Клыки Цербера': 'cerberus',
  'Чёрная Вдова': 'beheader',
  'Каменный Жук': 'stone_beetle',
  'Огненный Змей': 'fire_serpent',
  'Ледяная': 'frost_morena',
  'Небесный': 'celestial_simurg',
  'Дренос': 'drenos_indrik',
  'Боммал': 'bommal_golem',
  'Тёмная': 'dark_navka',
};

/** Get artifact image URL based on set + slot */
export function getArtifactImageUrl(slot: ArtifactSlot, set: ArtifactSet): string {
  const prefix = SET_FILE_PREFIX[set];
  return `/artifacts/${prefix}_${slot}.png`;
}

/* ─── Sell price ─── */

const RARITY_SELL_BASE: Record<ArtifactRarity, number> = {
  'Обиходный': 10,
  'Заветный': 25,
  'Сказанный': 60,
  'Калиновый': 150,
  'Самоцветный': 400,
};

/** Calculate sell price: base * stars + level bonus */
export function getArtifactSellPrice(artifact: Artifact): number {
  const base = RARITY_SELL_BASE[artifact.rarity] ?? 10;
  return Math.floor(base * artifact.stars + artifact.level * 5);
}
