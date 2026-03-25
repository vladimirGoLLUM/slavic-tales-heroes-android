import type { Rarity, Element } from './gameData';

export type VesselRarity = Rarity;

export interface VesselType {
  id: VesselRarity;
  label: string;
  sublabel: string;
  cost: number; // souls
  icon: string;
  color: string; // tailwind text class
  bgColor: string;
  dropRates: { rarity: Rarity; chance: number }[];
  excludeElements?: Element[]; // elements that can't be summoned
  /** Pity rules for this vessel type: which counters to increment and check */
  pityRules: VesselPityRule[];
}

export interface VesselPityRule {
  /** Key in VesselPityCounters */
  counterKey: VesselPityKey;
  /** Target rarity that is guaranteed when threshold is reached */
  targetRarity: Rarity;
  /** Number of vessel uses before guarantee */
  threshold: number;
}

/** All pity counter keys */
export type VesselPityKey =
  | 'pityCommonRare'
  | 'pityCommonEpic'
  | 'pityRareEpic'
  | 'pityRareMythic'
  | 'pityEpicEpic'
  | 'pityEpicMythic'
  | 'pityMythicMythic';

export type VesselPityCounters = Record<VesselPityKey, number>;

export function createInitialVesselPity(): VesselPityCounters {
  return {
    pityCommonRare: 0,
    pityCommonEpic: 0,
    pityRareEpic: 0,
    pityRareMythic: 0,
    pityEpicEpic: 0,
    pityEpicMythic: 0,
    pityMythicMythic: 0,
  };
}

/** Priority order for pity checks (rarest first) */
const RARITY_PRIORITY: Rarity[] = ['Самоцветный', 'Калиновый', 'Сказанный', 'Заветный'];

/**
 * Given a vessel's pity rules and current counters, check if any pity threshold is reached.
 * Returns the highest-priority guaranteed rarity, or null if none triggered.
 */
export function checkVesselPity(
  rules: VesselPityRule[],
  counters: VesselPityCounters,
): { rarity: Rarity; counterKey: VesselPityKey } | null {
  // Check in priority order (rarest first)
  for (const targetRarity of RARITY_PRIORITY) {
    const rule = rules.find(r => r.targetRarity === targetRarity);
    if (rule && (counters[rule.counterKey] + 1) >= rule.threshold) {
      return { rarity: rule.targetRarity, counterKey: rule.counterKey };
    }
  }
  return null;
}

/**
 * After a summon, increment all pity counters for this vessel type,
 * and reset counters whose target rarity matches the obtained rarity.
 */
export function updateVesselPity(
  rules: VesselPityRule[],
  counters: VesselPityCounters,
  obtainedRarity: Rarity,
): VesselPityCounters {
  const updated = { ...counters };
  // Increment all counters for this vessel
  for (const rule of rules) {
    updated[rule.counterKey] = (updated[rule.counterKey] ?? 0) + 1;
  }
  // Reset counters whose target was obtained (or lower)
  const obtainedOrder = RARITY_PRIORITY.indexOf(obtainedRarity);
  for (const rule of rules) {
    const ruleOrder = RARITY_PRIORITY.indexOf(rule.targetRarity);
    if (ruleOrder >= obtainedOrder && obtainedOrder !== -1) {
      // Obtained rarity is equal or higher priority → reset
      updated[rule.counterKey] = 0;
    }
  }
  return updated;
}

/** Human-readable pity info for display */
export interface VesselPityDisplay {
  counterKey: VesselPityKey;
  targetRarity: Rarity;
  current: number;
  threshold: number;
  remaining: number;
}

export function getVesselPityDisplay(
  vessel: VesselType,
  counters: VesselPityCounters,
): VesselPityDisplay[] {
  return vessel.pityRules.map(rule => {
    const current = counters[rule.counterKey] ?? 0;
    return {
      counterKey: rule.counterKey,
      targetRarity: rule.targetRarity,
      current,
      threshold: rule.threshold,
      remaining: Math.max(rule.threshold - current, 0),
    };
  });
}

export const VESSEL_TYPES: VesselType[] = [
  {
    id: 'Обиходный',
    label: 'Серый сосуд',
    sublabel: 'Глиняный кувшин с берестяной крышкой',
    cost: 200,
    icon: '/ui/vessel_common.png',
    color: 'text-rarity-common',
    bgColor: 'bg-gray-500/20',
    dropRates: [
      { rarity: 'Обиходный', chance: 0.74 },
      { rarity: 'Заветный', chance: 0.245 },
      { rarity: 'Сказанный', chance: 0.015 },
    ],
    pityRules: [
      { counterKey: 'pityCommonRare', targetRarity: 'Заветный', threshold: 8 },
      { counterKey: 'pityCommonEpic', targetRarity: 'Сказанный', threshold: 100 },
    ],
  },
  {
    id: 'Заветный',
    label: 'Зелёный сосуд',
    sublabel: 'Сосуд с рунами Велеса',
    cost: 2100,
    icon: '/ui/vessel_rare.png',
    color: 'text-rarity-rare',
    bgColor: 'bg-green-500/20',
    dropRates: [
      { rarity: 'Сказанный', chance: 0.915 },
      { rarity: 'Калиновый', chance: 0.08 },
      { rarity: 'Самоцветный', chance: 0.005 },
    ],
    excludeElements: ['Тень', 'Свет'],
    pityRules: [
      { counterKey: 'pityRareEpic', targetRarity: 'Калиновый', threshold: 20 },
      { counterKey: 'pityRareMythic', targetRarity: 'Самоцветный', threshold: 300 },
    ],
  },
  {
    id: 'Сказанный',
    label: 'Синий сосуд',
    sublabel: 'Кубок с серебряной окантовкой',
    cost: 2300,
    icon: '/ui/vessel_epic.png',
    color: 'text-rarity-epic',
    bgColor: 'bg-blue-500/20',
    dropRates: [
      { rarity: 'Сказанный', chance: 0.915 },
      { rarity: 'Калиновый', chance: 0.08 },
      { rarity: 'Самоцветный', chance: 0.005 },
    ],
    pityRules: [
      { counterKey: 'pityRareEpic', targetRarity: 'Калиновый', threshold: 20 },
      { counterKey: 'pityRareMythic', targetRarity: 'Самоцветный', threshold: 300 },
    ],
  },
  {
    id: 'Калиновый',
    label: 'Фиолетовый сосуд',
    sublabel: 'Чаша с золотым ободом и калиной',
    cost: 3500,
    icon: '/ui/vessel_legendary.png',
    color: 'text-rarity-legendary',
    bgColor: 'bg-purple-500/20',
    dropRates: [
      { rarity: 'Сказанный', chance: 0.83 },
      { rarity: 'Калиновый', chance: 0.16 },
      { rarity: 'Самоцветный', chance: 0.01 },
    ],
    pityRules: [
      { counterKey: 'pityEpicEpic', targetRarity: 'Калиновый', threshold: 10 },
      { counterKey: 'pityEpicMythic', targetRarity: 'Самоцветный', threshold: 150 },
    ],
  },
  {
    id: 'Самоцветный',
    label: 'Оранжевый сосуд',
    sublabel: 'Кристалл Жар-птицы',
    cost: 15000,
    icon: '/ui/vessel_mythic.png',
    color: 'text-rarity-mythic',
    bgColor: 'bg-orange-500/20',
    dropRates: [
      { rarity: 'Калиновый', chance: 0.95 },
      { rarity: 'Самоцветный', chance: 0.05 },
    ],
    pityRules: [
      { counterKey: 'pityMythicMythic', targetRarity: 'Самоцветный', threshold: 30 },
    ],
  },
];

export type VesselInventory = Record<VesselRarity, number>;

export function createInitialVesselInventory(): VesselInventory {
  return {
    'Обиходный': 0,
    'Заветный': 0,
    'Сказанный': 0,
    'Калиновый': 0,
    'Самоцветный': 0,
  };
}
