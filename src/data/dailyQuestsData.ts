// ═══════════════════════════════════════════════════
// Daily Quests — Ежедневные задания
// ═══════════════════════════════════════════════════

export interface DailyQuestDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  rewards: {
    souls: number;
    runes: number;
  };
}

export const DAILY_QUESTS: DailyQuestDef[] = [
  {
    key: 'arena_battles',
    name: 'Гладиатор',
    description: 'Проведи бои на арене',
    icon: '/ui/icon_arena.png',
    target: 10,
    rewards: { souls: 500, runes: 200 },
  },
  {
    key: 'campaign_stages',
    name: 'Путешественник',
    description: 'Пройди этапы кампании',
    icon: '/ui/icon_campaign.png',
    target: 5,
    rewards: { souls: 400, runes: 150 },
  },
  {
    key: 'collect_artifacts',
    name: 'Собиратель',
    description: 'Получи артефакты',
    icon: '/ui/icon_artifacts.png',
    target: 3,
    rewards: { souls: 300, runes: 100 },
  },
  {
    key: 'upgrade_hero',
    name: 'Наставник',
    description: 'Улучши героев (уровень/звёзды)',
    icon: '/ui/icon_upgrade_hero.png',
    target: 5,
    rewards: { souls: 350, runes: 120 },
  },
  {
    key: 'summon_heroes',
    name: 'Призыватель',
    description: 'Призови героев',
    icon: '/ui/icon_summon.png',
    target: 3,
    rewards: { souls: 300, runes: 100 },
  },
  {
    key: 'boss_attack',
    name: 'Охотник на чудовищ',
    description: 'Атакуй мирового босса',
    icon: '/ui/icon_worldboss.png',
    target: 1,
    rewards: { souls: 600, runes: 250 },
  },
  {
    key: 'forge_craft',
    name: 'Кузнец',
    description: 'Улучши артефакты в кузнице',
    icon: '/ui/icon_forge.png',
    target: 3,
    rewards: { souls: 250, runes: 80 },
  },
  {
    key: 'temple_floors',
    name: 'Паломник',
    description: 'Пройди этажи храмов',
    icon: '/ui/icon_temples.png',
    target: 2,
    rewards: { souls: 400, runes: 150 },
  },
  {
    key: 'arena_wins',
    name: 'Чемпион',
    description: 'Одержи победы на арене',
    icon: '/ui/icon_champion.png',
    target: 5,
    rewards: { souls: 600, runes: 200 },
  },
];

/** Bonus reward for completing ALL daily quests */
export const DAILY_COMPLETE_BONUS = {
  souls: 2000,
  runes: 800,
  energy: 50,
};

export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}
