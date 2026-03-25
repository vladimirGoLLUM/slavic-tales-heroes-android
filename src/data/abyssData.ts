/** Бездонная Бездна — Doom Tower analog with slavic theming */
import { CHAMPIONS, type Champion, type Element, type Rarity } from '@/data/gameData';
import { getScaledAbyssBoss } from '@/data/abyssBosses';
import { type ArtifactSet, type ArtifactRarity, type Artifact, generateArtifact, ALL_SLOTS } from '@/data/artifacts';

/** Boss ID → exclusive artifact set drop */
export const ABYSS_BOSS_SET_DROP: Record<string, ArtifactSet> = {
  'widow': 'Чёрная Вдова',
  'scarab': 'Каменный Жук',
  'dragon': 'Огненный Змей',
  'frost': 'Ледяная',
  'griffin': 'Небесный',
  'ancient': 'Дренос',
  'golem': 'Боммал',
  'fairy': 'Тёмная',
};

/** Generate artifact drops from an abyss boss kill */
export function generateAbyssBossDrop(bossId: string, difficulty: AbyssDifficulty): Artifact[] {
  const set = ABYSS_BOSS_SET_DROP[bossId];
  if (!set) return [];

  const rarities: ArtifactRarity[] = difficulty === 'hard'
    ? ['Калиновый', 'Самоцветный']
    : ['Сказанный', 'Калиновый'];
  const rarity = rarities[Math.floor(Math.random() * rarities.length)];
  const stars = difficulty === 'hard'
    ? (Math.random() < 0.5 ? 4 : 5)
    : (Math.random() < 0.6 ? 3 : 4);
  const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];

  const arts: Artifact[] = [generateArtifact(rarity, 0, stars, set, slot)];
  // 40% chance for second piece
  if (Math.random() < 0.4) {
    const slot2 = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
    const rarity2 = rarities[Math.floor(Math.random() * rarities.length)];
    arts.push(generateArtifact(rarity2, 0, stars, set, slot2));
  }
  return arts;
}

export type AbyssDifficulty = 'normal' | 'hard';

export interface AbyssBoss {
  id: string;
  name: string;
  icon: string;
  element: string;
  /** material dropped by this boss */
  material: string;
  materialIcon: string;
  materialImageUrl: string;
}

export const ABYSS_BOSSES: AbyssBoss[] = [
  { id: 'widow',    name: 'Чёрная Вдова Мара',    icon: '🕷️', element: 'Тень',   material: 'Яйцо Мары',        materialIcon: '🥚', materialImageUrl: '/materials/mat_widow.png' },
  { id: 'scarab',   name: 'Каменный Жук Кощей',   icon: '🪲',  element: 'Камень', material: 'Клешня Кощея',      materialIcon: '🦀', materialImageUrl: '/materials/mat_scarab.png' },
  { id: 'dragon',   name: 'Огненный Змей Горыныч', icon: '🐉', element: 'Огонь',  material: 'Сердце Горыныча',   materialIcon: '❤️‍🔥', materialImageUrl: '/materials/mat_dragon.png' },
  { id: 'frost',    name: 'Ледяная',        icon: '❄️', element: 'Вода',   material: 'Хребет Морены',     materialIcon: '🧊', materialImageUrl: '/materials/mat_frost.png' },
  { id: 'griffin',   name: 'Небесный',       icon: '🦅', element: 'Свет',   material: 'Перо Симурга',      materialIcon: '🪶', materialImageUrl: '/materials/mat_griffin.png' },
  { id: 'ancient',  name: 'Древний Индрик',        icon: '🦌', element: 'Лес',    material: 'Рог Индрика',       materialIcon: '🦴', materialImageUrl: '/materials/mat_ancient.png' },
  { id: 'golem',    name: 'Боммал',         icon: '🗿', element: 'Камень', material: 'Пластины Чудища',   materialIcon: '🛡️', materialImageUrl: '/materials/mat_golem.png' },
  { id: 'fairy',    name: 'Тёмная',          icon: '🧚', element: 'Тень',   material: 'Сфера Навки',       materialIcon: '🔮', materialImageUrl: '/materials/mat_fairy.png' },
];

export const TOTAL_FLOORS = 160;
export const BOSS_INTERVAL = 10;
export const SECRET_ROOMS_TOTAL = 16;

/* ─── Secret Rooms ─── */
export type SecretRoomRestriction =
  | { type: 'element'; elements: Element[] }
  | { type: 'rarity'; maxRarity: Rarity }
  | { type: 'element_only'; element: Element }
  | { type: 'no_element'; bannedElement: Element }
  | { type: 'max_heroes'; count: number };

export interface SecretRoom {
  id: number;
  name: string;
  icon: string;
  description: string;
  restriction: SecretRoomRestriction;
  unlockFloor: number;           // must clear this floor first
  enemyPowerMult: number;        // multiplier over base floor power
  rewards: { souls: number; runes: number; bonusItem?: string; bonusIcon?: string };
}

const RARITY_ORDER: Rarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];

export function isHeroAllowed(
  heroElement: Element, heroRarity: Rarity, restriction: SecretRoomRestriction,
): boolean {
  switch (restriction.type) {
    case 'element':       return restriction.elements.includes(heroElement);
    case 'element_only':  return heroElement === restriction.element;
    case 'no_element':    return heroElement !== restriction.bannedElement;
    case 'rarity':        return RARITY_ORDER.indexOf(heroRarity) <= RARITY_ORDER.indexOf(restriction.maxRarity);
    case 'max_heroes':    return true; // squad size check is done separately
  }
}

export function getRestrictionLabel(r: SecretRoomRestriction): string {
  switch (r.type) {
    case 'element':       return `Только ${r.elements.join(' / ')}`;
    case 'element_only':  return `Только ${r.element}`;
    case 'no_element':    return `Без ${r.bannedElement}`;
    case 'rarity':        return `Макс. редкость: ${r.maxRarity}`;
    case 'max_heroes':    return `Макс. ${r.count} героя`;
  }
}

export const SECRET_ROOMS: SecretRoom[] = [
  { id: 1, name: 'Огненное Горнило',     icon: '🔥', description: 'Только огненные герои допущены',
    restriction: { type: 'element_only', element: 'Огонь' }, unlockFloor: 10, enemyPowerMult: 1.2,
    rewards: { souls: 100, runes: 50 } },
  { id: 2, name: 'Ледяная Пещера',       icon: '❄️', description: 'Только водные герои допущены',
    restriction: { type: 'element_only', element: 'Вода' }, unlockFloor: 20, enemyPowerMult: 1.3,
    rewards: { souls: 120, runes: 60 } },
  { id: 3, name: 'Каменный Лабиринт',    icon: '🪨', description: 'Без героев стихии Света',
    restriction: { type: 'no_element', bannedElement: 'Свет' }, unlockFloor: 30, enemyPowerMult: 1.4,
    rewards: { souls: 150, runes: 70 } },
  { id: 4, name: 'Лесная Чаща',          icon: '🌿', description: 'Только Огонь и Лес',
    restriction: { type: 'element', elements: ['Огонь', 'Лес'] }, unlockFloor: 40, enemyPowerMult: 1.5,
    rewards: { souls: 180, runes: 80 } },
  { id: 5, name: 'Теневой Грот',         icon: '🌑', description: 'Только герои Тени',
    restriction: { type: 'element_only', element: 'Тень' }, unlockFloor: 50, enemyPowerMult: 1.6,
    rewards: { souls: 200, runes: 90 } },
  { id: 6, name: 'Испытание Простых',     icon: '⭐', description: 'Только Обиходные и Заветные',
    restriction: { type: 'rarity', maxRarity: 'Заветный' }, unlockFloor: 20, enemyPowerMult: 1.0,
    rewards: { souls: 80, runes: 40 } },
  { id: 7, name: 'Солнечный Чертог',     icon: '☀️', description: 'Только Свет и Камень',
    restriction: { type: 'element', elements: ['Свет', 'Камень'] }, unlockFloor: 60, enemyPowerMult: 1.7,
    rewards: { souls: 220, runes: 100 } },
  { id: 8, name: 'Последнее Трио',       icon: '👥', description: 'Максимум 3 героя в отряде',
    restriction: { type: 'max_heroes', count: 3 }, unlockFloor: 70, enemyPowerMult: 1.8,
    rewards: { souls: 250, runes: 110 } },
  { id: 9, name: 'Без Огня',             icon: '💧', description: 'Герои Огня запрещены',
    restriction: { type: 'no_element', bannedElement: 'Огонь' }, unlockFloor: 80, enemyPowerMult: 1.9,
    rewards: { souls: 280, runes: 120 } },
  { id: 10, name: 'Божественный Путь',   icon: '✨', description: 'Только Сказанные и ниже',
    restriction: { type: 'rarity', maxRarity: 'Сказанный' }, unlockFloor: 90, enemyPowerMult: 2.0,
    rewards: { souls: 300, runes: 130 } },
  { id: 11, name: 'Дуэль Стихий',        icon: '⚡', description: 'Вода и Огонь вместе',
    restriction: { type: 'element', elements: ['Вода', 'Огонь'] }, unlockFloor: 100, enemyPowerMult: 2.2,
    rewards: { souls: 350, runes: 150 } },
  { id: 12, name: 'Хранилище Бездны',    icon: '🏛️', description: 'Без Тени — только чистые',
    restriction: { type: 'no_element', bannedElement: 'Тень' }, unlockFloor: 110, enemyPowerMult: 2.5,
    rewards: { souls: 400, runes: 180 } },
  { id: 13, name: 'Вихрь Стихий',        icon: '🌀', description: 'Только Вода и Лес',
    restriction: { type: 'element', elements: ['Вода', 'Лес'] }, unlockFloor: 120, enemyPowerMult: 2.6,
    rewards: { souls: 420, runes: 190 } },
  { id: 14, name: 'Зал Одиночки',        icon: '🗡️', description: 'Максимум 2 героя в отряде',
    restriction: { type: 'max_heroes', count: 2 }, unlockFloor: 130, enemyPowerMult: 2.8,
    rewards: { souls: 450, runes: 200 } },
  { id: 15, name: 'Каменная Темница',     icon: '⛓️', description: 'Без героев Леса и Воды',
    restriction: { type: 'element', elements: ['Огонь', 'Камень', 'Свет', 'Тень'] }, unlockFloor: 140, enemyPowerMult: 3.0,
    rewards: { souls: 500, runes: 220 } },
  { id: 16, name: 'Последний Рубеж',      icon: '💀', description: 'Только Калиновые и ниже',
    restriction: { type: 'rarity', maxRarity: 'Калиновый' }, unlockFloor: 150, enemyPowerMult: 3.5,
    rewards: { souls: 600, runes: 250 } },
];

export function buildSecretRoomWaves(room: SecretRoom, difficulty: AbyssDifficulty): ScaledAbyssChampion[][] {
  const scale = (difficulty === 'hard' ? 2.5 : 1.0) * room.enemyPowerMult;
  const skillScale = 1 + room.id * 0.05;
  const pool = CHAMPIONS.map(c => c.id);
  const waves: ScaledAbyssChampion[][] = [];

  for (let w = 0; w < 3; w++) {
    const seed = room.id * 100 + w * 17;
    const count = 3 + (w === 2 ? 1 : 0);
    const wave: ScaledAbyssChampion[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (seed + i * 11) % pool.length;
      const base = CHAMPIONS.find(c => c.id === pool[idx]) ?? CHAMPIONS[0];
      wave.push({
        ...base,
        skills: base.skills.map(s => ({ ...s, power: s.power * skillScale })),
        baseStats: {
          hp: Math.floor(base.baseStats.hp * scale),
          atk: Math.floor(base.baseStats.atk * scale),
          def: Math.floor(base.baseStats.def * scale),
          spd: Math.floor(base.baseStats.spd * (0.9 + scale * 0.1)),
          critChance: base.baseStats.critChance * Math.min(scale, 1.5),
          critDmg: base.baseStats.critDmg * Math.min(scale, 1.5),
          resistance: base.baseStats.resistance * scale,
          accuracy: base.baseStats.accuracy * scale,
        },
        skillPowerScale: skillScale,
      });
    }
    waves.push(wave);
  }
  return waves;
}

export const GOLD_KEYS_DAILY = 12;
export const SILVER_KEYS_DAILY = 10;

export function getBossForFloor(floor: number): AbyssBoss | null {
  if (floor % BOSS_INTERVAL !== 0) return null;
  const bossIndex = (floor / BOSS_INTERVAL - 1) % ABYSS_BOSSES.length;
  return ABYSS_BOSSES[bossIndex];
}

export function getFloorEnemyPower(floor: number, difficulty: AbyssDifficulty): number {
  const base = difficulty === 'hard' ? 50000 : 15000;
  return base + floor * (difficulty === 'hard' ? 800 : 400);
}

/** Rewards for first-time floor clear */
export function getFloorRewards(floor: number, difficulty: AbyssDifficulty) {
  const mult = difficulty === 'hard' ? 2 : 1;
  const boss = getBossForFloor(floor);
  return {
    souls: (10 + floor * 2) * mult,
    runes: (5 + floor) * mult,
    isBoss: !!boss,
    bossName: boss?.name,
    material: boss?.material,
    materialIcon: boss?.materialIcon,
  };
}

/* ─── Milestone Rewards ─── */
export interface AbyssMilestone {
  floor: number;
  icon: string;
  label: string;
  rewards: {
    souls?: number;
    runes?: number;
    goldKeys?: number;
    silverKeys?: number;
    bonusItem?: string;
    bonusIcon?: string;
  };
}

export const ABYSS_MILESTONES: AbyssMilestone[] = [
  { floor: 20,  icon: '🏅', label: 'Первые Шаги',       rewards: { souls: 200, runes: 100 } },
  { floor: 40,  icon: '⚔️', label: 'Воин Бездны',       rewards: { souls: 500, runes: 200, goldKeys: 5 } },
  { floor: 60,  icon: '🛡️', label: 'Страж Глубин',      rewards: { souls: 800, runes: 350, silverKeys: 5, bonusItem: 'Щит Бездны', bonusIcon: '🛡️' } },
  { floor: 80,  icon: '🔥', label: 'Первый Цикл',       rewards: { souls: 1200, runes: 500, goldKeys: 10, bonusItem: 'Пламя Бездны', bonusIcon: '🔥' } },
  { floor: 100, icon: '💎', label: 'Покоритель Тьмы',    rewards: { souls: 1800, runes: 700, silverKeys: 10, bonusItem: 'Кристалл Бездны', bonusIcon: '💎' } },
  { floor: 120, icon: '👑', label: 'Владыка Бездны',     rewards: { souls: 2500, runes: 1000, goldKeys: 15, bonusItem: 'Корона Бездны', bonusIcon: '👑' } },
  { floor: 140, icon: '⭐', label: 'Легенда Глубин',     rewards: { souls: 3500, runes: 1500, silverKeys: 15, bonusItem: 'Звезда Бездны', bonusIcon: '⭐' } },
  { floor: 160, icon: '🏆', label: 'Абсолютный Повелитель', rewards: { souls: 5000, runes: 2500, goldKeys: 20, silverKeys: 20, bonusItem: 'Печать Повелителя', bonusIcon: '🏆' } },
];

export interface AbyssProgress {
  currentFloor: Record<AbyssDifficulty, number>;
  goldKeys: number;
  silverKeys: number;
  lastKeyRefresh: string;
  secretRoomsCleared: Record<AbyssDifficulty, number[]>;
  lastSecretRoomDate: string;
  cycleStart: string;
  bossKills: Record<string, number>;
  milestonesClaimed: Record<AbyssDifficulty, number[]>;
  materials: Record<string, number>; // bossId -> material count
}

export function createInitialAbyssProgress(): AbyssProgress {
  return {
    currentFloor: { normal: 0, hard: 0 },
    goldKeys: GOLD_KEYS_DAILY,
    silverKeys: SILVER_KEYS_DAILY,
    lastKeyRefresh: new Date().toISOString().slice(0, 10),
    secretRoomsCleared: { normal: [], hard: [] },
    lastSecretRoomDate: new Date().toISOString().slice(0, 10),
    cycleStart: new Date().toISOString().slice(0, 10),
    bossKills: {},
    milestonesClaimed: { normal: [], hard: [] },
    materials: {},
  };
}

export function refreshKeysIfNeeded(progress: AbyssProgress): AbyssProgress {
  const today = new Date().toISOString().slice(0, 10);
  let updated = { ...progress };

  // Monthly abyss reset on the 1st
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const cycleMonth = (progress.cycleStart ?? '').slice(0, 7);
  if (currentMonth !== cycleMonth) {
    updated = {
      ...createInitialAbyssProgress(),
      materials: progress.materials, // keep materials
      lastKeyRefresh: today,
      lastSecretRoomDate: today,
      cycleStart: today,
    };
    return updated;
  }

  // Daily key refresh
  if (progress.lastKeyRefresh !== today) {
    updated = {
      ...updated,
      goldKeys: updated.goldKeys + GOLD_KEYS_DAILY,
      silverKeys: updated.silverKeys + SILVER_KEYS_DAILY,
      lastKeyRefresh: today,
    };
  }
  // Daily secret room reset
  if ((progress.lastSecretRoomDate ?? '') !== today) {
    updated = {
      ...updated,
      secretRoomsCleared: { normal: [], hard: [] },
      lastSecretRoomDate: today,
    };
  }
  return updated;
}

/** Get the artifact set rewarded by a secret room (based on nearest boss) */
export function getSecretRoomSetReward(room: SecretRoom): string | null {
  const boss = getBossForFloor(room.unlockFloor);
  if (!boss) return null;
  return ABYSS_BOSS_SET_DROP[boss.id] ?? null;
}

/** Unique icons for each secret room */
export const SECRET_ROOM_ICONS: Record<number, string> = {
  1: '/ui/icon_gold_key.png',
  2: '/ui/icon_silver_key.png',
  3: '/ui/icon_abyss.png',
  4: '/ui/icon_gold_key.png',
  5: '/ui/icon_silver_key.png',
  6: '/ui/icon_abyss.png',
  7: '/ui/icon_gold_key.png',
  8: '/ui/icon_silver_key.png',
  9: '/ui/icon_abyss.png',
  10: '/ui/icon_gold_key.png',
  11: '/ui/icon_silver_key.png',
  12: '/ui/icon_abyss.png',
  13: '/ui/icon_gold_key.png',
  14: '/ui/icon_silver_key.png',
  15: '/ui/icon_abyss.png',
  16: '/ui/icon_gold_key.png',
};

export interface ScaledAbyssChampion extends Champion {
  skillPowerScale?: number;
  immuneEffects?: string[];
}

/** Build 3 waves of enemies for an abyss floor */
export function buildAbyssEnemyWaves(floor: number, difficulty: AbyssDifficulty): ScaledAbyssChampion[][] {
  const boss = getBossForFloor(floor);
  const isBossFloor = !!boss;
  const WAVES = 3;

  // Scale stats based on floor and difficulty
  const baseScale = difficulty === 'hard' ? 2.0 : 0.8;
  const floorScale = 1 + (floor - 1) * 0.08;
  const finalScale = baseScale * floorScale;
  const skillScale = 1 + (floor - 1) * 0.03;

  const pool = CHAMPIONS.map(c => c.id);
  const waves: ScaledAbyssChampion[][] = [];

  for (let w = 0; w < WAVES; w++) {
    const isBossWave = isBossFloor && w === WAVES - 1;

    // Boss wave: spawn actual boss as a single champion
    if (isBossWave) {
      const scaledBoss = getScaledAbyssBoss(floor, difficulty);
      if (scaledBoss) {
        const bossChampion: ScaledAbyssChampion = {
          id: `abyss-boss-${scaledBoss.id}`,
          name: scaledBoss.name,
          element: scaledBoss.element,
          faction: 'Босс',
          rarity: 'Самоцветный',
          description: scaledBoss.title,
          imageUrl: scaledBoss.imageUrl,
          baseStats: scaledBoss.baseStats,
          skills: scaledBoss.skills,
          immuneEffects: scaledBoss.immuneEffects,
        };
        waves.push([bossChampion]);
        continue;
      }
    }

    // Regular wave
    const seed = floor * 100 + w * 13;
    const enemyCount = 3 + (w % 2);
    const waveEnemies: ScaledAbyssChampion[] = [];
    for (let i = 0; i < enemyCount; i++) {
      const idx = (seed + i * 7) % pool.length;
      const base = CHAMPIONS.find(c => c.id === pool[idx]) ?? CHAMPIONS[0];

      const scaledSkills = base.skills.map(s => ({
        ...s,
        power: s.power * skillScale,
        cooldown: difficulty === 'hard' && floor > 60 ? Math.max(1, s.cooldown - 1) : s.cooldown,
      }));

      waveEnemies.push({
        ...base,
        skills: scaledSkills,
        baseStats: {
          hp: Math.floor(base.baseStats.hp * finalScale),
          atk: Math.floor(base.baseStats.atk * finalScale),
          def: Math.floor(base.baseStats.def * finalScale),
          spd: Math.floor(base.baseStats.spd * (0.9 + finalScale * 0.1)),
          critChance: base.baseStats.critChance * Math.min(finalScale, 1.5),
          critDmg: base.baseStats.critDmg * Math.min(finalScale, 1.5),
          resistance: base.baseStats.resistance * finalScale,
          accuracy: base.baseStats.accuracy * finalScale,
        },
        skillPowerScale: skillScale,
      });
    }
    waves.push(waveEnemies);
  }

  return waves;
}
