import { useState, useEffect, useCallback, useMemo } from 'react';
import { isBossAvailableToday, getTimeUntilNextAvailable, formatCountdown, getBossAvailableDaysText, getNextAvailableDayName } from '@/utils/bossSchedule';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { HYDRA_BOSS, WORLD_BOSS_MAX_ATTACKS, REWARD_TIERS, BASE_ATTACK_REWARD, getRewardTier } from '@/data/worldBoss';
import { generateArtifact, type ArtifactRarity } from '@/data/artifacts';
import iconSouls from '@/assets/icons/icon_souls.png';

interface LeaderboardEntry {
  id: string;
  username: string;
  damage_today: number;
  damage_total: number;
}

function formatDamage(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function WorldBossPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { player, recordWorldBossDamage, addRunes, addSouls, claimWorldBossRewards } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'total'>('today');

  const todayStr = new Date().toISOString().slice(0, 10);
  const isNewDay = player.lastWorldBossAttackDate !== todayStr;
  const attacksLeft = isNewDay ? WORLD_BOSS_MAX_ATTACKS : player.worldBossAttacksLeft;
  const damageToday = isNewDay ? 0 : player.worldBossDamageToday;
  const hasPendingRewards = isNewDay && player.worldBossDamageToday > 0 && !player.worldBossRewardsClaimed;
  const rewardsClaimed = !hasPendingRewards && (isNewDay || player.worldBossRewardsClaimed);
  const pendingDamage = player.worldBossDamageToday;

  // Boss availability
  const bossAvailable = isBossAvailableToday('hydra');
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (bossAvailable) return;
    const update = () => {
      const ms = getTimeUntilNextAvailable('hydra');
      setCountdown(formatCountdown(ms));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [bossAvailable]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('world_boss_damage')
      .select('user_id, damage_today, damage_total')
      .eq('boss_id', 'hydra')
      .order(tab === 'today' ? 'damage_today' : 'damage_total', { ascending: false })
      .limit(100);

    if (data) {
      // Fetch usernames from profiles
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) ?? []);
      setLeaderboard(data.map(d => ({
        id: d.user_id,
        username: profileMap.get(d.user_id) ?? 'Витязь',
        damage_today: d.damage_today,
        damage_total: d.damage_total,
      })));
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('worldboss')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_boss_damage' }, () => {
        fetchLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard]);

  // Start attack
  const handleAttack = () => {
    if (attacksLeft <= 0 || !bossAvailable) return;
    sessionStorage.setItem('worldBossBattle', JSON.stringify({
      bossId: HYDRA_BOSS.id,
      todayDamage: damageToday,
    }));
    navigate('/battle?mode=worldboss');
  };

  // Claim rewards — fetch yesterday's leaderboard for accurate ranking
  const handleClaimRewards = async () => {
    if (!hasPendingRewards) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const { data: yesterdayData } = await supabase
      .from('world_boss_damage')
      .select('user_id, damage_today')
      .eq('boss_id', 'hydra')
      .eq('last_attack_date', yesterdayStr)
      .order('damage_today', { ascending: false });

    const entries = yesterdayData ?? [];
    const myIdx = entries.findIndex(e => e.user_id === user?.id);
    const rank = myIdx >= 0 ? myIdx + 1 : entries.length + 1;
    const total = Math.max(entries.length, 1);
    const tier = getRewardTier(rank, total);

    const artifacts = [];
    for (let i = 0; i < tier.artifactCount; i++) {
      artifacts.push(generateArtifact(tier.artifactRarity as ArtifactRarity, 0, undefined, 'Гнев Гидры'));
    }

    claimWorldBossRewards(tier.runes, tier.souls, artifacts);
  };

  const myRank = leaderboard.findIndex(e => e.id === user?.id);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-32">
      {/* Boss background */}
      <div className="absolute inset-0 z-0">
        <img src={HYDRA_BOSS.bgUrl} alt="" className="w-full h-64 object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </div>

      <div className="relative z-10 px-4 pt-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/trials/worldboss')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src={HYDRA_BOSS.imageUrl} alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Гидра</h1>
        </div>

        {/* Boss card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/70 backdrop-blur-sm rounded-2xl border border-border card-lubok overflow-hidden mb-4"
        >
          <div className="relative">
            <img
              src={HYDRA_BOSS.bgUrl}
              alt={HYDRA_BOSS.name}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-3">
              <img src={HYDRA_BOSS.imageUrl} alt="" className="w-14 h-14 rounded-xl border-2 border-primary/50 object-cover" />
              <div>
                <h2 className="font-kelly text-xl text-foreground drop-shadow-lg">{HYDRA_BOSS.name}</h2>
                <p className="text-xs text-muted-foreground">{HYDRA_BOSS.title}</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Stats row */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-center">
                <div className="text-2xl font-kelly text-primary">{formatDamage(damageToday)}</div>
                <div className="text-[10px] text-muted-foreground">Урон сегодня</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-kelly text-foreground">{attacksLeft}/{WORLD_BOSS_MAX_ATTACKS}</div>
                <div className="text-[10px] text-muted-foreground">Атаки</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-kelly text-muted-foreground">#{myRank >= 0 ? myRank + 1 : '—'}</div>
                <div className="text-[10px] text-muted-foreground">Рейтинг</div>
              </div>
            </div>

            {/* Action buttons */}
            {/* Schedule info */}
            <div className="text-[10px] text-muted-foreground mb-2 text-center">
              Доступна: {getBossAvailableDaysText('hydra')}
              {!bossAvailable && <span className="text-primary ml-1">• Откроется в {getNextAvailableDayName('hydra')}</span>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAttack}
                disabled={attacksLeft <= 0 || !bossAvailable}
                className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-accent-foreground font-kelly py-3 rounded-xl transition-all active:scale-95 min-h-[48px]"
              >
                {!bossAvailable ? `🔒 ${countdown}` : `⚔️ Атаковать ${attacksLeft > 0 ? `(${attacksLeft})` : ''}`}
              </button>
              {hasPendingRewards && (
                <button
                  onClick={handleClaimRewards}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-kelly py-3 rounded-xl transition-all active:scale-95 min-h-[48px]"
                >
                  🎁 Забрать ({formatDamage(pendingDamage)})
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Reward tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface/60 rounded-2xl border border-border/50 p-4 card-lubok mb-4"
        >
          <h3 className="font-kelly text-sm text-foreground mb-3">Награды за рейтинг</h3>
          <div className="space-y-2">
            {REWARD_TIERS.map((tier, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-kelly text-primary">{tier.label}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {tier.artifactCount > 0 && <span>🏺×{tier.artifactCount} ({tier.artifactRarity})</span>}
                  <span className="flex items-center gap-0.5"><img src="/ui/icon_runes.png" alt="" className="w-3 h-3" />{tier.runes}</span>
                  <span className="flex items-center gap-0.5"><img src={iconSouls} alt="" className="w-3 h-3" />{tier.souls}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
            Артефакты из наград: сет «Гнев Гидры» (3 части: +15% АТК, +10% Крит.У, +20% Кража жизни)
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface/60 rounded-2xl border border-border/50 p-4 card-lubok"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-kelly text-sm text-foreground">Рейтинг</h3>
            <div className="flex gap-1">
              {(['today', 'total'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-kelly transition-all ${
                    tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'today' ? 'Сегодня' : 'За всё время'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground text-xs py-4">Загрузка...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-4">Никто ещё не атаковал босса!</div>
          ) : (
            <div className="space-y-1">
              {leaderboard.slice(0, 20).map((entry, i) => {
                const isMe = entry.id === user?.id;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                      isMe ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface/40'
                    }`}
                  >
                    <span className={`font-kelly w-6 text-center ${
                      i === 0 ? 'text-primary' : i === 1 ? 'text-foreground' : i === 2 ? 'text-accent' : 'text-muted-foreground'
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`flex-1 truncate ${isMe ? 'font-kelly text-primary' : 'text-foreground'}`}>
                      {entry.username}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {formatDamage(tab === 'today' ? entry.damage_today : entry.damage_total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Boss abilities info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface/60 rounded-2xl border border-border/50 p-4 card-lubok mt-4"
        >
          <h3 className="font-kelly text-sm text-foreground mb-2">Способности босса</h3>
          <div className="space-y-1.5 text-[11px] text-muted-foreground">
            <div><span className="text-foreground font-kelly">Раунд 1:</span> Многоглавый Удар — АОЕ урон всем</div>
            <div><span className="text-foreground font-kelly">Раунд 3:</span> Оглушающий Рёв — оглушение случайного героя</div>
            <div><span className="text-foreground font-kelly">Раунд 5:</span> Ядовитое Дыхание — яд на всех (5% HP, 4 хода)</div>
            <div><span className="text-foreground font-kelly">Раунд 7:</span> Взгляд Ужаса — страх одного героя</div>
            <div><span className="text-foreground font-kelly">Раунд 10:</span> Дыхание Хаоса — массовый урон + снятие баффов</div>
            <div className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/20">
              Способности зацикливаются. Босс устойчив к контролю.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
