/** Реликвии Бездны — постоянные бонусы к статам героев */

export interface RelicBonus {
  stat: 'hp' | 'atk' | 'def' | 'spd' | 'critDmg' | 'critChance' | 'resistance' | 'accuracy';
  percent: number;
  /** If true, bonus only works in Abyss battles */
  abyssOnly?: boolean;
  /** "all" means applies to ALL stats */
  allStats?: boolean;
}

export interface Relic {
  id: string;
  name: string;
  icon: string;
  description: string;
  bonuses: RelicBonus[];
}

export const RELICS: Relic[] = [
  {
    id: 'shield_abyss',
    name: 'Щит Бездны',
    icon: '/relics/shield_abyss.png',
    description: 'Древний щит, выкованный в глубинах Бездны. +5% к Защите.',
    bonuses: [{ stat: 'def', percent: 5 }],
  },
  {
    id: 'flame_abyss',
    name: 'Пламя Бездны',
    icon: '/relics/flame_abyss.png',
    description: 'Негасимое пламя, пылающее в сердце Бездны. +5% к Атаке.',
    bonuses: [{ stat: 'atk', percent: 5 }],
  },
  {
    id: 'crystal_abyss',
    name: 'Кристалл Бездны',
    icon: '/relics/crystal_abyss.png',
    description: 'Кристалл, наполненный энергией глубин. +5% к ЗДР.',
    bonuses: [{ stat: 'hp', percent: 5 }],
  },
  {
    id: 'crown_abyss',
    name: 'Корона Бездны',
    icon: '/relics/crown_abyss.png',
    description: 'Корона тёмного владыки. +3% к Крит. урону.',
    bonuses: [{ stat: 'critDmg', percent: 3 }],
  },
  {
    id: 'star_abyss',
    name: 'Звезда Бездны',
    icon: '/relics/star_abyss.png',
    description: 'Звезда, упавшая в Бездну. +3% к Скорости.',
    bonuses: [{ stat: 'spd', percent: 3 }],
  },
  {
    id: 'seal_overlord',
    name: 'Печать Повелителя',
    icon: '/relics/seal_overlord.png',
    description: 'Печать абсолютного повелителя Бездны. +10% ко всем статам в Бездне.',
    bonuses: [
      { stat: 'hp', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'atk', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'def', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'spd', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'critDmg', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'critChance', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'resistance', percent: 10, abyssOnly: true, allStats: true },
      { stat: 'accuracy', percent: 10, abyssOnly: true, allStats: true },
    ],
  },
];

export const MAX_RELICS_PER_HERO = 3;

export function getRelicById(id: string): Relic | undefined {
  return RELICS.find(r => r.id === id);
}

/** Calculate total relic bonus multipliers for a hero */
export function calculateRelicBonuses(
  equippedRelicIds: string[],
  inAbyss: boolean = false,
): Record<string, number> {
  const bonuses: Record<string, number> = {};
  for (const relicId of equippedRelicIds) {
    const relic = getRelicById(relicId);
    if (!relic) continue;
    for (const b of relic.bonuses) {
      if (b.abyssOnly && !inAbyss) continue;
      bonuses[b.stat] = (bonuses[b.stat] ?? 0) + b.percent;
    }
  }
  return bonuses;
}

/** Map milestone bonusItem name to relic ID */
export const MILESTONE_ITEM_TO_RELIC: Record<string, string> = {
  'Щит Бездны': 'shield_abyss',
  'Пламя Бездны': 'flame_abyss',
  'Кристалл Бездны': 'crystal_abyss',
  'Корона Бездны': 'crown_abyss',
  'Звезда Бездны': 'star_abyss',
  'Печать Повелителя': 'seal_overlord',
};
