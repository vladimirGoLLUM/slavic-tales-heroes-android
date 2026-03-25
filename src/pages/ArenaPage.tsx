import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { calculateUnitPower } from '@/data/campaignStages';
import {
  getRankFromRating, getTierColor, getTierIcon,
  ARENA_TIERS, ARENA_COIN_TYPES, GODS_COIN_MAX,
  GODS_COIN_REGEN_MS, FREE_REFRESHES_PER_DAY,
  WEEKLY_ARENA_REWARDS, getWeeklyGodsCoins, getWeeklyChestCount, getTimeUntilWeeklyReset,
  DAILY_ARENA_REWARDS, getTimeUntilDailyReset,
  type ArenaOpponent, type ArenaMetalTier,
  computeGodsCoins,
  ARENA_WIN_STREAK_THRESHOLD, ARENA_WIN_STREAK_BONUS,
} from '@/data/arenaData';
import { ARTIFACT_RARITY_COLORS } from '@/data/artifacts';
import iconSouls from '@/assets/icons/icon_souls.png';
import { ELEMENT_ICONS, RARITY_COLORS, type Champion, type Skill } from '@/data/gameData';
import { supabase } from '@/integrations/supabase/client';
import QuickBuyButton from '@/components/game/QuickBuyButton';
import PlayerAvatar from '@/components/game/PlayerAvatar';
import SquadPickerModal from '@/components/game/SquadPickerModal';

import coinGodsImg from '@/assets/icons/coin-gods.png';
import coinYariloImg from '@/assets/icons/coin-yarilo.png';
import coinVelesSilverImg from '@/assets/icons/coin-veles-silver.png';
import coinDazhdbogImg from '@/assets/icons/coin-dazhdbog.png';
import coinSvarogImg from '@/assets/icons/coin-svarog.png';
import coinVelesMoonImg from '@/assets/icons/coin-veles-moon.png';

const COIN_ICONS: Record<ArenaMetalTier, string> = {
  'Ярь-Медь': coinYariloImg,
  'Кованое Серебро': coinVelesSilverImg,
  'Червонное Золото': coinDazhdbogImg,
  'Пламень-Сталь': coinSvarogImg,
  'Лунный Мефрил': coinVelesMoonImg,
};

interface LeaderboardEntry {
  id: string;
  username: string;
  arena_rating: number;
  arena_power: number;
  avatar_url?: string | null;
  isPlayer?: boolean;
}

function toRoman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][n - 1] || String(n);
}

function WeeklyCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilWeeklyReset());
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeUntilWeeklyReset()), 1000);
    return () => clearInterval(interval);
  }, []);
  const d = Math.floor(timeLeft / 86400000);
  const h = Math.floor((timeLeft % 86400000) / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return (
    <span className="text-[10px] font-mono text-muted-foreground">
      ⏳ {d > 0 ? `${d}д ` : ''}{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}
function DailyCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilDailyReset());
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeUntilDailyReset()), 1000);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return (
    <span className="text-[10px] font-mono text-muted-foreground">
      ⏳ {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

interface SquadHeroSnap {
  name: string;
  element: string;
  imageUrl: string;
}

interface BattleHistoryEntry {
  id: string;
  attacker_name: string;
  defender_name: string;
  attacker_rating: number;
  defender_rating: number;
  rating_change: number;
  result: string;
  created_at: string;
  isAttacker: boolean;
  attacker_squad?: SquadHeroSnap[];
  defender_squad?: SquadHeroSnap[];
}

export default function ArenaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    player, getFullStats, getSquadChampions,
    arenaState, refreshArenaOpponents, markArenaOpponentDefeated, spendGodsCoins,
    claimDailyArenaReward, claimWeeklyArenaReward, saveArenaSquad, setActiveSquad, isVipActive,
  } = useGame();

  const [tab, setTab] = useState<'arena' | 'leaderboard' | 'history'>('arena');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [inspectOpponent, setInspectOpponent] = useState<ArenaOpponent | null>(null);
  const [showSquadPicker, setShowSquadPicker] = useState(false);
  const pendingFightOpponent = useRef<ArenaOpponent | null>(null);

  const rank = getRankFromRating(arenaState.arenaRating);
  const tierInfo = ARENA_TIERS.find(t => t.tier === rank.tier) ?? ARENA_TIERS[0];

  // Squad power
  const squad = getSquadChampions();
  const squadPower = useMemo(() =>
    squad.reduce((sum, pc) => sum + calculateUnitPower(getFullStats(pc)), 0),
    [squad, getFullStats]
  );

  // Fetch real leaderboard from DB
  useEffect(() => {
    if (tab !== 'leaderboard') return;
    setLoadingLb(true);
    supabase
      .from('arena_leaderboard')
      .select('id, username, arena_rating, arena_power, avatar_url')
      .order('arena_rating', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const entries: LeaderboardEntry[] = (data ?? []).map(d => ({
          ...d,
          isPlayer: d.id === player.champions[0]?.id ? false : false, // will mark below
        }));
        // Check if player is in the list
        const playerInList = entries.some(e => e.username === player.username);
        if (!playerInList && arenaState.arenaRating > 0) {
          entries.push({
            id: 'self',
            username: player.username || 'Ты',
            arena_rating: arenaState.arenaRating,
            arena_power: squadPower,
            isPlayer: true,
          });
          entries.sort((a, b) => b.arena_rating - a.arena_rating);
        } else {
          entries.forEach(e => {
            if (e.username === player.username) e.isPlayer = true;
          });
        }
        setLeaderboard(entries);
        setLoadingLb(false);
      });
  }, [tab, arenaState.arenaRating]);

  // Fetch battle history
  useEffect(() => {
    if (tab !== 'history' || !user) return;
    setLoadingHistory(true);
    supabase
      .from('arena_battle_history')
      .select('*')
      .or(`attacker_id.eq.${user.id},defender_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const entries: BattleHistoryEntry[] = (data ?? []).map((d: any) => ({
          ...d,
          isAttacker: d.attacker_id === user.id,
        }));
        setBattleHistory(entries);
        setLoadingHistory(false);
      });
  }, [tab, user]);

  const playerPosition = leaderboard.findIndex(e => e.isPlayer) + 1;

  // Compute actual gods coins with regen
  const actualGodsCoins = useMemo(() => {
    const { coins } = computeGodsCoins(arenaState.godsCoins, arenaState.lastGodsCoinUpdate);
    return coins;
  }, [arenaState.godsCoins, arenaState.lastGodsCoinUpdate]);

  // Gods coins timer
  const [nextCoinIn, setNextCoinIn] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      const { coins } = computeGodsCoins(arenaState.godsCoins, arenaState.lastGodsCoinUpdate);
      if (coins >= GODS_COIN_MAX) {
        setNextCoinIn(0);
        return;
      }
      const elapsed = Date.now() - arenaState.lastGodsCoinUpdate;
      const regenUsed = Math.floor(elapsed / GODS_COIN_REGEN_MS);
      const sinceLastRegen = elapsed - regenUsed * GODS_COIN_REGEN_MS;
      const remaining = Math.max(0, GODS_COIN_REGEN_MS - sinceLastRegen);
      setNextCoinIn(Math.ceil(remaining / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [arenaState.godsCoins, arenaState.lastGodsCoinUpdate]);

  // Check if today's refreshes reset
  const todayStr = new Date().toDateString();
  const freeRefreshesUsed = arenaState.lastRefreshDate === todayStr ? arenaState.arenaFreeRefreshCount : 0;
  const freeRefreshesLeft = Math.max(0, FREE_REFRESHES_PER_DAY - freeRefreshesUsed);

  // Count defeated
  const defeatedCount = arenaState.arenaOpponents.filter(o => o.defeated).length;
  const allDefeated = defeatedCount === arenaState.arenaOpponents.length;

  const handleRefresh = useCallback(() => {
    refreshArenaOpponents();
  }, [refreshArenaOpponents]);

  const executeFight = useCallback((opponent: ArenaOpponent) => {
    if (!spendGodsCoins(1)) return;
    saveArenaSquad();
    sessionStorage.setItem('arenaBattle', JSON.stringify({
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentRating: opponent.rating,
      enemies: opponent.heroes,
    }));
    navigate('/battle?mode=arena');
  }, [navigate, spendGodsCoins, saveArenaSquad]);

  const handleFight = useCallback((opponent: ArenaOpponent) => {
    pendingFightOpponent.current = opponent;
    setShowSquadPicker(true);
  }, []);

  const handleSquadConfirmArena = useCallback((squadId: number) => {
    setActiveSquad(squadId);
    setShowSquadPicker(false);
    setTimeout(() => {
      if (pendingFightOpponent.current) {
        executeFight(pendingFightOpponent.current);
        pendingFightOpponent.current = null;
      }
    }, 0);
  }, [setActiveSquad, executeFight]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Rating progress within current subrank
  const progressInSubRank = rank.maxRating === Infinity
    ? 100
    : Math.min(100, ((arenaState.arenaRating - rank.minRating) / (rank.maxRating - rank.minRating + 1)) * 100);

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/trials')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_arena.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Колизей Богов</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['arena', 'leaderboard', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl font-kelly text-sm transition-all min-h-[40px] ${
                tab === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface/60 text-muted-foreground hover:bg-surface/80 border border-border/30'
              }`}
            >
              {t === 'arena' ? '⚔️ Арена' : t === 'leaderboard' ? '🏆 Рейтинг' : '📜 История'}
            </button>
          ))}
        </div>

        {tab === 'arena' && (<>
        {/* Rank display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/70 backdrop-blur-sm rounded-2xl p-4 card-lubok border border-border/50 mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tierInfo.icon}</span>
              <div>
                <div className={`font-kelly text-lg ${tierInfo.color}`}>{rank.label}</div>
                <div className="text-xs text-muted-foreground">{arenaState.arenaRating} очей</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Сила отряда</div>
              <div className="font-kelly text-primary">{squadPower.toLocaleString()}</div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))` }}
              animate={{ width: `${progressInSubRank}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{rank.minRating}</span>
            <span>{rank.maxRating === Infinity ? '∞' : rank.maxRating}</span>
          </div>
        </motion.div>

        {/* Resources row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2 mb-4"
        >
          {/* Gods coins */}
          <div className="bg-surface/60 rounded-xl p-3 card-lubok border border-border/30">
            <div className="text-[10px] text-muted-foreground mb-1">Монеты Богов</div>
            <div className="flex items-center gap-2">
              <img src={coinGodsImg} alt="Монеты Богов" className="w-7 h-7" />
              <span className="font-kelly text-foreground">{actualGodsCoins}/{GODS_COIN_MAX}</span>
              <QuickBuyButton type="coins" />
            </div>
            {actualGodsCoins < GODS_COIN_MAX && nextCoinIn > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Следующая: {formatTime(nextCoinIn)}
              </div>
            )}
          </div>

          {/* Refreshes */}
          <div className="bg-surface/60 rounded-xl p-3 card-lubok border border-border/30">
            <div className="text-[10px] text-muted-foreground mb-1">Обновления</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <span className="font-kelly text-foreground">{freeRefreshesLeft}/{FREE_REFRESHES_PER_DAY} бесплатно</span>
            </div>
          </div>
        </motion.div>

        {/* Arena coins */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-surface/60 rounded-xl p-3 card-lubok border border-border/30 mb-4"
        >
          <div className="text-[10px] text-muted-foreground mb-2">Рунные Монеты</div>
          <div className="flex flex-wrap gap-3">
            {ARENA_TIERS.map(t => {
              const coin = ARENA_COIN_TYPES[t.tier];
              const count = arenaState.arenaCoins[t.tier] ?? 0;
              if (count === 0) return null;
              return (
                <div key={t.tier} className="flex items-center gap-1">
                  <img src={COIN_ICONS[t.tier]} alt={coin.name} className="w-5 h-5" />
                  <span className={`text-xs font-kelly ${t.color}`}>{count}</span>
                </div>
              );
            })}
            {Object.values(arenaState.arenaCoins).every(v => !v) && (
              <span className="text-xs text-muted-foreground">Нет монет</span>
            )}
          </div>
        </motion.div>

        {/* Refresh button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <button
            onClick={handleRefresh}
            disabled={!allDefeated && freeRefreshesLeft <= 0 && player.mithrilRunes < 10}
            className="w-full bg-primary/20 hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed border border-primary/30 rounded-xl py-3 font-kelly text-sm text-primary transition-all min-h-[44px]"
          >
            🔄 Обновить список
            {allDefeated ? ' (все побеждены)' : freeRefreshesLeft > 0 ? ` (бесплатно: ${freeRefreshesLeft})` : ' (10 Мифриловых Рун)'}
          </button>
        </motion.div>

        {/* Win streak */}
        {(arenaState.arenaWinStreak ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 bg-surface/60 rounded-xl p-3 card-lubok border border-border/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="font-kelly text-sm text-foreground">
                Серия побед: {arenaState.arenaWinStreak ?? 0}/{ARENA_WIN_STREAK_THRESHOLD}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Бонус +{ARENA_WIN_STREAK_BONUS} очков при {ARENA_WIN_STREAK_THRESHOLD} победах
            </span>
          </motion.div>
        )}

        {/* Opponents list */}
        <div className="space-y-2">
          {arenaState.arenaOpponents.map((opp, i) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              className={`bg-surface/70 backdrop-blur-sm rounded-xl p-3 card-lubok border transition-all ${
                opp.defeated
                  ? 'border-primary/20 opacity-60'
                  : 'border-border/50 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Heroes preview with element badges — tap to inspect */}
                <button
                  onClick={() => setInspectOpponent(opp)}
                  className="flex -space-x-1 flex-shrink-0 cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                  title="Посмотреть отряд"
                >
                  {opp.heroes.slice(0, 4).map((hero, hi) => (
                    <div
                      key={hi}
                      className="relative w-11 h-11 rounded-lg overflow-visible"
                    >
                      <div className="w-11 h-11 rounded-lg overflow-hidden border-2 border-surface shadow-sm">
                        <img
                          src={hero.imageUrl}
                          alt={hero.name}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-[10px] leading-none bg-surface/90 rounded-full w-4 h-4 flex items-center justify-center border border-border/40">
                        {ELEMENT_ICONS[hero.element]}
                      </span>
                    </div>
                  ))}
                </button>

                {/* Avatar + Info */}
                <PlayerAvatar src={opp.avatarUrl} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-kelly text-sm text-foreground truncate">{opp.name}</span>
                    {opp.defeated && <span className="text-xs text-primary">✓</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>⚔️ {opp.power.toLocaleString()}</span>
                    <span>🏆 {opp.rating}</span>
                  </div>
                </div>

                {/* Fight button */}
                <button
                  onClick={() => handleFight(opp)}
                  disabled={opp.defeated || squad.length === 0 || actualGodsCoins <= 0}
                  className={`px-4 py-2 rounded-lg font-kelly text-sm transition-all min-h-[36px] ${
                    opp.defeated
                      ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                      : 'bg-accent hover:bg-accent/90 text-accent-foreground hover:scale-105 active:scale-95'
                  }`}
                >
                  {opp.defeated ? 'Побеждён' : '⚔️ Бой'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {squad.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-4 font-kelly">
            Сначала собери отряд в «Отрядах»
          </div>
        )}
        </>)}

        {/* Leaderboard tab */}
        {tab === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Daily reward banner */}
            {(() => {
              const dailyReward = DAILY_ARENA_REWARDS[rank.tier];
              const canClaim = !arenaState.lastDailyReward || arenaState.lastDailyReward !== new Date().toUTCString().slice(0, 16);
              return (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-kelly text-primary">🎁 Ежедневная награда ({rank.tier})</div>
                    <DailyCountdown />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-primary inline-flex items-center gap-0.5"><img src={iconSouls} alt="Души" className="w-4 h-4 shrink-0" /> {dailyReward.souls}</span>
                    <span className="text-foreground inline-flex items-center gap-0.5">
                      <img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4 shrink-0" /> {dailyReward.runes}
                    </span>
                    {canClaim ? (
                      <button
                        onClick={() => {
                          const result = claimDailyArenaReward();
                          if (result) {
                            import('sonner').then(({ toast }) => {
                              toast.success(`Получено: ${result.souls} Душ и ${result.runes} Рун!`);
                            });
                          }
                        }}
                        className="ml-auto px-3 py-1 bg-primary text-primary-foreground rounded-lg text-[11px] font-kelly hover:opacity-90 active:scale-95 transition-all"
                      >
                        Забрать
                      </button>
                    ) : (
                      <span className="ml-auto text-[10px] text-muted-foreground font-kelly">✅ Получено</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Pending weekly reward claim banner */}
            {arenaState.pendingWeeklyReward && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-yellow-500/15 border-2 border-yellow-500/50 rounded-xl p-4 mb-4"
              >
                <div className="text-sm font-kelly text-yellow-400 mb-2">🏆 Недельная награда готова! ({arenaState.pendingWeeklyReward.tierLabel})</div>
                <div className="flex gap-3 text-xs font-mono flex-wrap mb-3">
                  {arenaState.pendingWeeklyReward.souls > 0 && <span className="text-primary inline-flex items-center gap-0.5"><img src={iconSouls} alt="Души" className="w-4 h-4 shrink-0" /> {arenaState.pendingWeeklyReward.souls}</span>}
                  {arenaState.pendingWeeklyReward.runes > 0 && <span className="text-foreground inline-flex items-center gap-0.5"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4 shrink-0" /> {arenaState.pendingWeeklyReward.runes}</span>}
                  {arenaState.pendingWeeklyReward.mithrilRunes > 0 && <span className="text-foreground inline-flex items-center gap-0.5"><img src="/ui/icon_mithril.png" alt="МР" className="w-4 h-4 shrink-0" /> {arenaState.pendingWeeklyReward.mithrilRunes}</span>}
                  <span className="text-foreground inline-flex items-center gap-0.5"><img src={coinGodsImg} alt="Монеты Богов" className="w-4 h-4 shrink-0" /> {arenaState.pendingWeeklyReward.godsCoins}</span>
                  {arenaState.pendingWeeklyReward.artifacts.length > 0 && <span className="text-foreground">🎁 {arenaState.pendingWeeklyReward.artifacts.length} арт.</span>}
                </div>
                <button
                  onClick={() => claimWeeklyArenaReward()}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-background font-kelly rounded-lg transition-all hover:scale-[1.02] active:scale-95"
                >
                  Забрать награду
                </button>
              </motion.div>
            )}

            {/* Weekly prize banner */}
            {(() => {
              const reward = WEEKLY_ARENA_REWARDS[rank.tier];
              const godsCoinsDisplay = typeof reward.godsCoins === 'number'
                ? `${reward.godsCoins}`
                : `700–2000 (по месту)`;
              const chestCount = getWeeklyChestCount(reward, rank.subRank);
              const chestRarity = reward.chest.rarity;
              const chestColor = ARTIFACT_RARITY_COLORS[chestRarity];
              return (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-kelly text-accent">🏆 Недельный приз ({rank.label})</div>
                    <WeeklyCountdown />
                  </div>
                  <div className="flex gap-3 text-xs font-mono flex-wrap">
                    {reward.souls > 0 && <span className="text-primary inline-flex items-center gap-0.5"><img src={iconSouls} alt="Души" className="w-4 h-4 shrink-0" /> {reward.souls}</span>}
                    {reward.runes > 0 && (
                      <span className="text-foreground inline-flex items-center gap-0.5">
                        <img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4 shrink-0" /> {reward.runes}
                      </span>
                    )}
                    {reward.mithrilRunes > 0 && (
                      <span className="text-foreground inline-flex items-center gap-0.5">
                        <img src="/ui/icon_mithril.png" alt="МР" className="w-4 h-4 shrink-0" /> {reward.mithrilRunes}
                      </span>
                    )}
                    <span className="text-foreground inline-flex items-center gap-0.5">
                      <img src={coinGodsImg} alt="Монеты Богов" className="w-4 h-4 shrink-0" /> {godsCoinsDisplay}
                    </span>
                  </div>
                  {/* Chest info */}
                  <div className="mt-2 bg-background/30 rounded-lg p-2">
                    <div className="text-[11px] font-kelly text-foreground flex items-center gap-1">
                      🎁 Сундук: <span style={{ color: chestColor }}>{chestCount}× {chestRarity}</span> артефакт
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      Сеты: {reward.chest.sets.join(', ')}
                    </div>
                    {'countByRank' in reward.chest && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        По рангам: {reward.chest.countByRank.map((c, i) => `${toRoman(i + 1)}=${c}`).join(' · ')}
                      </div>
                    )}
                  </div>
                  {typeof reward.godsCoins !== 'number' && (
                    <div className="text-[10px] text-muted-foreground mt-1.5 space-y-0.5">
                      <div>🥇 1 место: {reward.godsCoins.top1} · 🥈 2 место: {reward.godsCoins.top2} · 🥉 3 место: {reward.godsCoins.top3}</div>
                      <div>Остальные: {reward.godsCoins.rest}</div>
                      {'countByPlace' in reward.chest && (
                        <div>Сундук: 🥇{reward.chest.countByPlace.top1} · 🥈{reward.chest.countByPlace.top2} · 🥉{reward.chest.countByPlace.top3} · ост.{reward.chest.countByPlace.rest} арт.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {loadingLb ? (
              <div className="text-center text-muted-foreground py-8 font-kelly">Загрузка рейтинга...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 font-kelly">Пока нет участников. Выиграй бой на арене!</div>
            ) : (<>
            {/* Player position highlight */}
            {playerPosition > 0 && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-kelly text-primary text-lg">#{playerPosition}</span>
                <PlayerAvatar size={28} isVip={isVipActive()} />
                <span className="font-kelly text-foreground text-sm">{player.username || 'Ты'}</span>
              </div>
              <div className="text-right">
                <div className={`font-kelly text-sm ${tierInfo.color}`}>{rank.label}</div>
                <div className="text-xs text-muted-foreground">{arenaState.arenaRating} очей</div>
              </div>
            </div>
            )}

            {/* Leaderboard list */}
            <div className="space-y-1.5">
              {leaderboard.map((entry, i) => {
                const pos = i + 1;
                const entryRank = getRankFromRating(entry.arena_rating);
                const entryTierInfo = ARENA_TIERS.find(t => t.tier === entryRank.tier) ?? ARENA_TIERS[0];
                return (
                  <div
                    key={`${entry.username}-${i}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                      entry.isPlayer
                        ? 'bg-primary/15 border border-primary/40'
                        : 'bg-surface/50 border border-border/20'
                    } ${pos <= 3 ? 'border-accent/30' : ''}`}
                  >
                    {/* Position */}
                    <div className={`w-8 text-center font-kelly text-sm ${
                      pos === 1 ? 'text-yellow-400' : pos === 2 ? 'text-slate-300' : pos === 3 ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>
                      {pos <= 3 ? ['🥇', '🥈', '🥉'][pos - 1] : `#${pos}`}
                    </div>

                    {/* Avatar + Name */}
                    <PlayerAvatar src={entry.avatar_url} size={28} isVip={entry.isPlayer ? isVipActive() : false} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-kelly text-sm truncate block ${entry.isPlayer ? 'text-primary' : 'text-foreground'}`}>
                        {entry.username}
                      </span>
                      <span className={`text-[10px] ${entryTierInfo.color}`}>{entryRank.tier}</span>
                    </div>

                    {/* Power */}
                    <div className="text-[10px] text-muted-foreground">
                      ⚔️ {entry.arena_power.toLocaleString()}
                    </div>

                    {/* Rating */}
                    <div className="text-right min-w-[50px]">
                      <div className="font-kelly text-sm text-foreground">{entry.arena_rating}</div>
                      <div className="text-[10px] text-muted-foreground">очей</div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>)}
          </motion.div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-kelly text-lg text-foreground mb-3">📜 История боёв</h2>

            {loadingHistory ? (
              <div className="text-center text-muted-foreground py-8 font-kelly">Загрузка истории...</div>
            ) : battleHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 font-kelly">
                Пока нет записей. Проведи бой на арене!
              </div>
            ) : (
              <div className="space-y-2">
                {battleHistory.slice(0, 20).map((entry, i) => {
                  const isWin = entry.result === 'win';
                  const wasAttacked = !entry.isAttacker;
                  const timeAgo = getTimeAgo(entry.created_at);
                  // Show opponent's squad (if attacker, show defender squad; if defender, show attacker squad)
                  const opponentSquad = wasAttacked ? (entry.attacker_squad ?? []) : (entry.defender_squad ?? []);

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-surface/70 backdrop-blur-sm rounded-xl p-3 border transition-all ${
                        wasAttacked
                          ? 'border-accent/30'
                          : isWin
                            ? 'border-primary/30'
                            : 'border-border/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Result icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                          wasAttacked
                            ? 'bg-accent/20'
                            : isWin
                              ? 'bg-primary/20'
                              : 'bg-muted/30'
                        }`}>
                          {wasAttacked ? '🛡️' : isWin ? '⚔️' : '💀'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {wasAttacked ? (
                              <span className="font-kelly text-sm text-foreground truncate">
                                <span className="text-accent">{entry.attacker_name || 'Игрок'}</span> напал на вас
                              </span>
                            ) : (
                              <span className="font-kelly text-sm text-foreground truncate">
                                Вы vs <span className={isWin ? 'text-primary' : 'text-accent'}>{entry.defender_name || 'Противник'}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{timeAgo}</span>
                            <span>•</span>
                            <span>🏆 {wasAttacked ? entry.attacker_rating : entry.defender_rating}</span>
                          </div>

                          {/* Opponent squad heroes */}
                          {opponentSquad.length > 0 && (
                            <div className="flex -space-x-1 mt-1.5">
                              {opponentSquad.slice(0, 4).map((hero, hi) => (
                                <div
                                  key={hi}
                                  className="relative w-8 h-8 rounded-md overflow-visible"
                                  title={`${hero.name} (${hero.element})`}
                                >
                                  <div className="w-8 h-8 rounded-md overflow-hidden border border-border/40">
                                    <img
                                      src={hero.imageUrl}
                                      alt={hero.name}
                                      className="w-full h-full object-cover object-top"
                                      loading="lazy"
                                    />
                                  </div>
                                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none bg-surface/90 rounded-full w-3.5 h-3.5 flex items-center justify-center border border-border/30">
                                    {ELEMENT_ICONS[hero.element as keyof typeof ELEMENT_ICONS] ?? '?'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Result */}
                        <div className="text-right flex-shrink-0">
                          <div className={`font-kelly text-sm ${
                            wasAttacked
                              ? 'text-accent'
                              : isWin
                                ? 'text-primary'
                                : 'text-accent'
                          }`}>
                            {wasAttacked ? 'Нападение' : isWin ? 'Победа' : 'Поражение'}
                          </div>
                          <div className={`text-xs font-mono ${
                            entry.rating_change > 0 ? 'text-primary' : entry.rating_change < 0 ? 'text-accent' : 'text-muted-foreground'
                          }`}>
                            {entry.rating_change > 0 ? '+' : ''}{entry.rating_change} очей
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Opponent Inspect Modal */}
      <AnimatePresence>
        {inspectOpponent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setInspectOpponent(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-surface border border-border/50 rounded-t-2xl sm:rounded-2xl p-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚔️</span>
                  <div>
                    <h2 className="font-kelly text-lg text-foreground">{inspectOpponent.name}</h2>
                    <div className="text-xs text-muted-foreground">
                      🏆 {inspectOpponent.rating} очей · ⚔️ {inspectOpponent.power.toLocaleString()} сила
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setInspectOpponent(null)}
                  className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Heroes */}
              <div className="space-y-3">
                {inspectOpponent.heroes.map((hero, hi) => {
                  const s = hero.baseStats;
                  return (
                    <div
                      key={hi}
                      className="bg-background/50 rounded-xl p-3 border border-border/30"
                    >
                      <div className="flex items-start gap-3">
                        {/* Portrait */}
                        <div className="relative w-16 h-16 rounded-xl overflow-visible flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-border/40">
                            <img
                              src={hero.imageUrl}
                              alt={hero.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <span className="absolute -bottom-1 -right-1 text-xs bg-surface/90 rounded-full w-5 h-5 flex items-center justify-center border border-border/40">
                            {ELEMENT_ICONS[hero.element]}
                          </span>
                        </div>

                        {/* Name & rarity */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-kelly text-sm ${RARITY_COLORS[hero.rarity] ? `text-${RARITY_COLORS[hero.rarity]}` : 'text-foreground'}`}>
                              {hero.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{hero.rarity}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mb-1">
                            {hero.element} · {hero.faction}
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[10px]">
                            <span className="text-muted-foreground">❤️ {s.hp.toLocaleString()}</span>
                            <span className="text-muted-foreground">⚔️ {s.atk.toLocaleString()}</span>
                            <span className="text-muted-foreground">🛡️ {s.def.toLocaleString()}</span>
                            <span className="text-muted-foreground">💨 {s.spd}</span>
                            <span className="text-muted-foreground">🎯 {s.critChance}%</span>
                            <span className="text-muted-foreground">💥 {s.critDmg}%</span>
                            <span className="text-muted-foreground">🔰 {s.resistance}</span>
                            <span className="text-muted-foreground">📍 {s.accuracy}</span>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {hero.skills && hero.skills.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {hero.skills.map((skill, si) => {
                            const typeIcons: Record<string, string> = {
                              damage: '⚔️', aoe: '💥', buff: '✨', debuff: '🔻',
                              heal: '💚', control: '🔗', special: '⭐', passive: '🔮',
                            };
                            return (
                              <div key={si} className="bg-muted/20 rounded-lg px-2 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px]">{typeIcons[skill.type] ?? '⚔️'}</span>
                                  <span className="font-kelly text-[11px] text-foreground">{skill.name}</span>
                                  {skill.cooldown > 0 && (
                                    <span className="text-[9px] text-muted-foreground ml-auto">⏱️ {skill.cooldown} хода</span>
                                  )}
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{skill.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fight button */}
              {!inspectOpponent.defeated && squad.length > 0 && actualGodsCoins > 0 && (
                <button
                  onClick={() => {
                    handleFight(inspectOpponent);
                    setInspectOpponent(null);
                  }}
                  className="w-full mt-4 py-3 bg-accent hover:bg-accent/90 text-accent-foreground font-kelly rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-95"
                >
                  ⚔️ В бой!
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SquadPickerModal
        open={showSquadPicker}
        onClose={() => { setShowSquadPicker(false); pendingFightOpponent.current = null; }}
        onConfirm={handleSquadConfirmArena}
      />
    </div>
  );
}
