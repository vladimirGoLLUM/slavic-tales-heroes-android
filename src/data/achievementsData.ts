import { type ArtifactRarity } from './artifacts';

// ═══════════════════════════════════════════════════
// Achievements system — Свитки Славы
// ═══════════════════════════════════════════════════

export type AchievementCategory = 'arena' | 'campaign' | 'heroes' | 'collection' | 'bosses' | 'artifacts' | 'forge' | 'tower';

export interface AchievementTier {
  target: number;
  souls: number;
  runes: number;
  artifactRarity?: ArtifactRarity;
  artifactCount?: number;
}

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tiers: AchievementTier[];
}

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; label: string; icon: string }[] = [
  { id: 'arena', label: 'Арена', icon: '/ui/icon_arena.png' },
  { id: 'campaign', label: 'Кампания', icon: '/ui/icon_campaign.png' },
  { id: 'heroes', label: 'Герои', icon: '/ui/icon_heroes.png' },
  { id: 'collection', label: 'Коллекция', icon: '/ui/icon_collection.png' },
  { id: 'bosses', label: 'Боссы', icon: '/ui/icon_worldboss.png' },
  { id: 'artifacts', label: 'Артефакты', icon: '/ui/icon_artifacts.png' },
  { id: 'forge', label: 'Кузница', icon: '/ui/icon_forge.png' },
  { id: 'tower', label: 'Башня', icon: '/ui/icon_tower.png' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Arena ──
  {
    key: 'arena_wins',
    name: 'Гладиатор',
    description: 'Одержи побед на арене',
    icon: '/ui/icon_arena.png',
    category: 'arena',
    tiers: [
      { target: 5, souls: 100, runes: 500 },
      { target: 25, souls: 300, runes: 1500 },
      { target: 100, souls: 1000, runes: 5000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 500, souls: 3000, runes: 15000, artifactRarity: 'Сказанный', artifactCount: 2 },
    ],
  },
  {
    key: 'arena_streak',
    name: 'Неудержимый',
    description: 'Достигни серии побед на арене',
    icon: '/ui/icon_streak.png',
    category: 'arena',
    tiers: [
      { target: 3, souls: 50, runes: 300 },
      { target: 5, souls: 150, runes: 800 },
      { target: 10, souls: 500, runes: 3000, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'arena_rating',
    name: 'Восхождение',
    description: 'Достигни рейтинга на арене',
    icon: '/ui/icon_champion.png',
    category: 'arena',
    tiers: [
      { target: 500, souls: 200, runes: 1000 },
      { target: 1000, souls: 500, runes: 3000 },
      { target: 2000, souls: 1000, runes: 5000, artifactRarity: 'Сказанный', artifactCount: 1 },
      { target: 3000, souls: 2000, runes: 10000, artifactRarity: 'Калиновый', artifactCount: 1 },
      { target: 4000, souls: 5000, runes: 25000, artifactRarity: 'Самоцветный', artifactCount: 1 },
    ],
  },

  // ── Campaign ──
  {
    key: 'campaign_stages',
    name: 'Путешественник',
    description: 'Пройди этапов кампании',
    icon: '/ui/icon_campaign.png',
    category: 'campaign',
    tiers: [
      { target: 10, souls: 100, runes: 500 },
      { target: 30, souls: 300, runes: 1500 },
      { target: 60, souls: 800, runes: 4000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 100, souls: 2000, runes: 10000, artifactRarity: 'Сказанный', artifactCount: 2 },
    ],
  },
  {
    key: 'campaign_3star',
    name: 'Совершенство',
    description: 'Получи 3 звезды на этапах кампании',
    icon: '/ui/icon_3star.png',
    category: 'campaign',
    tiers: [
      { target: 5, souls: 150, runes: 800 },
      { target: 20, souls: 500, runes: 2500 },
      { target: 50, souls: 1500, runes: 7500, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'campaign_chapters',
    name: 'Летописец',
    description: 'Завершить глав кампании',
    icon: '/ui/icon_scroll.png',
    category: 'campaign',
    tiers: [
      { target: 3, souls: 200, runes: 1000 },
      { target: 6, souls: 500, runes: 3000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 10, souls: 1500, runes: 8000, artifactRarity: 'Калиновый', artifactCount: 1 },
    ],
  },

  // ── Heroes ──
  {
    key: 'heroes_collected',
    name: 'Собиратель',
    description: 'Собери уникальных героев',
    icon: '/ui/icon_collection.png',
    category: 'heroes',
    tiers: [
      { target: 5, souls: 100, runes: 500 },
      { target: 10, souls: 300, runes: 1500 },
      { target: 20, souls: 800, runes: 4000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 30, souls: 2000, runes: 10000, artifactRarity: 'Калиновый', artifactCount: 1 },
      { target: 36, souls: 5000, runes: 25000, artifactRarity: 'Самоцветный', artifactCount: 1 },
    ],
  },
  {
    key: 'heroes_max_level',
    name: 'Наставник',
    description: 'Доведи героев до 50 уровня',
    icon: '/ui/icon_upgrade_hero.png',
    category: 'heroes',
    tiers: [
      { target: 1, souls: 200, runes: 1000 },
      { target: 5, souls: 800, runes: 4000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 10, souls: 2000, runes: 10000, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'heroes_5star',
    name: 'Звездочёт',
    description: 'Развей героев до 5 звёзд',
    icon: '/ui/icon_gold_star.png',
    category: 'heroes',
    tiers: [
      { target: 1, souls: 300, runes: 1500 },
      { target: 5, souls: 1000, runes: 5000, artifactRarity: 'Сказанный', artifactCount: 1 },
      { target: 10, souls: 3000, runes: 15000, artifactRarity: 'Калиновый', artifactCount: 2 },
    ],
  },
  {
    key: 'heroes_red_star',
    name: 'Мастер Вознесения',
    description: 'Вознеси героев (красные звёзды)',
    icon: '/ui/icon_red_star.png',
    category: 'heroes',
    tiers: [
      { target: 1, souls: 500, runes: 2500 },
      { target: 3, souls: 1500, runes: 7500, artifactRarity: 'Калиновый', artifactCount: 1 },
      { target: 5, souls: 5000, runes: 25000, artifactRarity: 'Самоцветный', artifactCount: 1 },
    ],
  },

  // ── Collection ──
  {
    key: 'summon_total',
    name: 'Призыватель',
    description: 'Выполни призывов героев',
    icon: '/ui/icon_summon.png',
    category: 'collection',
    tiers: [
      { target: 10, souls: 100, runes: 500 },
      { target: 50, souls: 500, runes: 2500 },
      { target: 200, souls: 1500, runes: 7500, artifactRarity: 'Сказанный', artifactCount: 1 },
      { target: 500, souls: 5000, runes: 25000, artifactRarity: 'Калиновый', artifactCount: 2 },
    ],
  },
  {
    key: 'runes_earned',
    name: 'Рунолог',
    description: 'Заработай рун всего',
    icon: '/ui/icon_runes.png',
    category: 'collection',
    tiers: [
      { target: 10000, souls: 100, runes: 500 },
      { target: 50000, souls: 300, runes: 1500 },
      { target: 200000, souls: 1000, runes: 5000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 1000000, souls: 3000, runes: 15000, artifactRarity: 'Сказанный', artifactCount: 2 },
    ],
  },
  {
    key: 'souls_earned',
    name: 'Хранитель Душ',
    description: 'Заработай душ всего',
    icon: '/ui/icon_souls.png',
    category: 'collection',
    tiers: [
      { target: 500, souls: 50, runes: 250 },
      { target: 5000, souls: 200, runes: 1000 },
      { target: 20000, souls: 800, runes: 4000 },
      { target: 100000, souls: 3000, runes: 15000, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },

  // ── Bosses ──
  {
    key: 'boss_hydra_damage',
    name: 'Змееборец',
    description: 'Нанеси урона Гидре',
    icon: '/ui/icon_hydra.png',
    category: 'bosses',
    tiers: [
      { target: 10000, souls: 200, runes: 1000 },
      { target: 100000, souls: 800, runes: 4000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 500000, souls: 2000, runes: 10000, artifactRarity: 'Сказанный', artifactCount: 2 },
      { target: 2000000, souls: 5000, runes: 25000, artifactRarity: 'Калиновый', artifactCount: 2 },
    ],
  },
  {
    key: 'boss_cerberus_damage',
    name: 'Укротитель Цербера',
    description: 'Нанеси урона Церберу',
    icon: '/ui/icon_cerberus.png',
    category: 'bosses',
    tiers: [
      { target: 10000, souls: 200, runes: 1000 },
      { target: 100000, souls: 800, runes: 4000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 500000, souls: 2000, runes: 10000, artifactRarity: 'Сказанный', artifactCount: 2 },
    ],
  },
  {
    key: 'boss_attacks',
    name: 'Богоборец',
    description: 'Выполни атак на мировых боссов',
    icon: '/ui/icon_worldboss.png',
    category: 'bosses',
    tiers: [
      { target: 10, souls: 100, runes: 500 },
      { target: 50, souls: 500, runes: 2500 },
      { target: 200, souls: 1500, runes: 7500, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },

  // ── Artifacts ──
  {
    key: 'artifacts_total',
    name: 'Коллекционер',
    description: 'Накопи артефактов',
    icon: '/ui/icon_artifacts.png',
    category: 'artifacts',
    tiers: [
      { target: 10, souls: 100, runes: 500 },
      { target: 30, souls: 300, runes: 1500 },
      { target: 60, souls: 800, runes: 4000, artifactRarity: 'Заветный', artifactCount: 1 },
      { target: 100, souls: 2000, runes: 10000, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'artifacts_upgraded',
    name: 'Усилитель',
    description: 'Прокачай артефактов до 20 уровня',
    icon: '/ui/icon_upgrade_hero.png',
    category: 'artifacts',
    tiers: [
      { target: 1, souls: 200, runes: 1000 },
      { target: 5, souls: 500, runes: 2500 },
      { target: 15, souls: 1500, runes: 7500, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'artifacts_legendary',
    name: 'Мифический сборщик',
    description: 'Получи Калиновых или Самоцветных артефактов',
    icon: '/ui/icon_legendary_gem.png',
    category: 'artifacts',
    tiers: [
      { target: 1, souls: 300, runes: 1500 },
      { target: 5, souls: 1000, runes: 5000 },
      { target: 10, souls: 3000, runes: 15000, artifactRarity: 'Калиновый', artifactCount: 1 },
    ],
  },

  // ── Forge ──
  {
    key: 'forge_crafted',
    name: 'Кузнец',
    description: 'Создай предметов в кузнице',
    icon: '/ui/icon_forge.png',
    category: 'forge',
    tiers: [
      { target: 5, souls: 100, runes: 500 },
      { target: 20, souls: 500, runes: 2500 },
      { target: 50, souls: 1500, runes: 7500, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'artifacts_sold',
    name: 'Торговец',
    description: 'Продай артефактов',
    icon: '/ui/icon_inventory.png',
    category: 'forge',
    tiers: [
      { target: 10, souls: 50, runes: 250 },
      { target: 50, souls: 200, runes: 1000 },
      { target: 200, souls: 800, runes: 4000 },
    ],
  },

  // ── Tower ──
  {
    key: 'tower_upgrades',
    name: 'Зодчий',
    description: 'Улучши навыков в Башне Древних',
    icon: '/ui/icon_tower.png',
    category: 'tower',
    tiers: [
      { target: 5, souls: 100, runes: 500 },
      { target: 15, souls: 500, runes: 2500 },
      { target: 30, souls: 1500, runes: 7500, artifactRarity: 'Сказанный', artifactCount: 1 },
    ],
  },
  {
    key: 'tower_level_total',
    name: 'Страж Башни',
    description: 'Суммарный уровень улучшений Башни',
    icon: '/ui/icon_ancient_tower.png',
    category: 'tower',
    tiers: [
      { target: 10, souls: 200, runes: 1000 },
      { target: 30, souls: 800, runes: 4000 },
      { target: 50, souls: 2000, runes: 10000, artifactRarity: 'Калиновый', artifactCount: 1 },
    ],
  },
];

/** Get the current tier index (0-based) for a given progress value */
export function getCurrentTierIndex(achievement: AchievementDef, progress: number): number {
  for (let i = achievement.tiers.length - 1; i >= 0; i--) {
    if (progress >= achievement.tiers[i].target) return i;
  }
  return -1; // not yet reached first tier
}

/** Get the next unclaimed tier index */
export function getNextTierIndex(achievement: AchievementDef, progress: number, claimedTier: number): number {
  for (let i = 0; i < achievement.tiers.length; i++) {
    if (i > claimedTier && progress >= achievement.tiers[i].target) return i;
    if (progress < achievement.tiers[i].target) return i; // this is the next target
  }
  return achievement.tiers.length; // all done
}
