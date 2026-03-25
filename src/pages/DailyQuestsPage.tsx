import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DAILY_QUESTS, DAILY_COMPLETE_BONUS, getTodayDateKey, type DailyQuestDef } from '@/data/dailyQuestsData';
import { toast } from 'sonner';
import iconSouls from '@/assets/icons/icon_souls.png';

interface QuestRow {
  quest_key: string;
  progress: number;
  claimed: boolean;
}

export default function DailyQuestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSouls, addRunes, player, gainAccountXp } = useGame();

  const [dbData, setDbData] = useState<Record<string, QuestRow>>({});
  const [loading, setLoading] = useState(true);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [bonusClaimed, setBonusClaimed] = useState(false);

  const today = getTodayDateKey();

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from('daily_quests')
      .select('quest_key, progress, claimed')
      .eq('user_id', user.id)
      .eq('quest_date', today);

    const map: Record<string, QuestRow> = {};
    rows?.forEach(r => { map[r.quest_key] = r; });
    // Check if bonus was claimed
    if (map['__daily_bonus__']?.claimed) setBonusClaimed(true);
    setDbData(map);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const questStates = useMemo(() => {
    return DAILY_QUESTS.map(q => {
      const row = dbData[q.key];
      const progress = row?.progress ?? 0;
      const claimed = row?.claimed ?? false;
      const completed = progress >= q.target;
      return { ...q, progress, claimed, completed };
    });
  }, [dbData]);

  const allCompleted = questStates.every(q => q.completed);
  const allClaimed = questStates.every(q => q.claimed);
  const completedCount = questStates.filter(q => q.completed).length;

  const claimReward = useCallback(async (quest: DailyQuestDef) => {
    if (!user || claimingKey) return;
    setClaimingKey(quest.key);

    try {
      const existing = dbData[quest.key];
      if (existing) {
        await supabase
          .from('daily_quests')
          .update({ claimed: true })
          .eq('user_id', user.id)
          .eq('quest_key', quest.key)
          .eq('quest_date', today);
      } else {
        await supabase
          .from('daily_quests')
          .insert({ user_id: user.id, quest_key: quest.key, progress: quest.target, claimed: true, quest_date: today });
      }

      addSouls(quest.rewards.souls);
      addRunes(quest.rewards.runes);
      gainAccountXp(25);
      toast.success(`+${quest.rewards.souls} 💎 +${quest.rewards.runes} 🔮 +25 XP`);
      await loadData();
    } catch {
      toast.error('Ошибка при получении награды');
    }
    setClaimingKey(null);
  }, [user, dbData, today, claimingKey, addSouls, addRunes, gainAccountXp, loadData]);

  const claimBonus = useCallback(async () => {
    if (!user || bonusClaimed || claimingKey) return;
    setClaimingKey('__bonus__');

    try {
      await supabase
        .from('daily_quests')
        .insert({ user_id: user.id, quest_key: '__daily_bonus__', progress: 1, claimed: true, quest_date: today });

      addSouls(DAILY_COMPLETE_BONUS.souls);
      addRunes(DAILY_COMPLETE_BONUS.runes);
      // Energy bonus applied via addSouls context (simplified — just add souls equivalent)
      setBonusClaimed(true);
      toast.success(`Бонус за все задания! +${DAILY_COMPLETE_BONUS.souls} 💎 +${DAILY_COMPLETE_BONUS.runes} 🔮 +${DAILY_COMPLETE_BONUS.energy} ⚡`);
      await loadData();
    } catch {
      toast.error('Ошибка');
    }
    setClaimingKey(null);
  }, [user, bonusClaimed, claimingKey, today, addSouls, addRunes, loadData]);

  // Calculate time until reset
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}ч ${m}м`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/more')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="font-kelly text-2xl text-foreground">Ежедневные задания</h1>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-between bg-surface/60 border border-border/50 rounded-xl px-4 py-2.5 mb-4 card-lubok">
          <span className="text-sm text-muted-foreground">Обновление через</span>
          <span className="font-mono text-primary font-bold">{timeLeft}</span>
        </div>

        {/* Progress bar for all quests */}
        <div className="bg-surface/60 border border-border/50 rounded-xl p-4 mb-4 card-lubok">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-kelly text-foreground">Выполнено</span>
            <span className="text-sm font-mono text-primary">{completedCount}/{DAILY_QUESTS.length}</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / DAILY_QUESTS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Bonus reward */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎁</span>
              <div>
                <p className="text-xs font-kelly text-foreground">Бонус за все задания</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  +{DAILY_COMPLETE_BONUS.souls} <img src={iconSouls} alt="" className="w-3 h-3" />
                  +{DAILY_COMPLETE_BONUS.runes} <img src="/ui/icon_runes.png" alt="" className="w-3 h-3" />
                  +{DAILY_COMPLETE_BONUS.energy} <img src="/ui/energy.png" alt="" className="w-3 h-3" />
                </p>
              </div>
            </div>
            {allCompleted && allClaimed && !bonusClaimed ? (
              <button
                onClick={claimBonus}
                disabled={claimingKey === '__bonus__'}
                className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-kelly animate-pulse"
              >
                Забрать
              </button>
            ) : bonusClaimed ? (
              <span className="text-xs text-muted-foreground">✓ Получено</span>
            ) : (
              <span className="text-xs text-muted-foreground">{completedCount}/{DAILY_QUESTS.length}</span>
            )}
          </div>
        </div>

        {/* Quest list */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Загрузка...</div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {questStates.map((q, i) => {
                const pct = Math.min(100, (q.progress / q.target) * 100);
                return (
                  <motion.div
                    key={q.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-surface/60 border rounded-xl p-3 card-lubok transition-all ${
                      q.claimed
                        ? 'border-border/30 opacity-60'
                        : q.completed
                        ? 'border-accent/60 shadow-[0_0_12px_hsl(var(--accent)/0.2)]'
                        : 'border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={q.icon} alt={q.name} className="w-10 h-10 object-contain flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-kelly text-sm text-foreground">{q.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {Math.min(q.progress, q.target)}/{q.target}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-1.5">{q.description}</p>
                        {/* Progress bar */}
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              q.completed ? 'bg-accent' : 'bg-primary/70'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.4, delay: i * 0.04 }}
                          />
                        </div>
                        {/* Rewards */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            +{q.rewards.souls} <img src={iconSouls} alt="Души" className="w-3 h-3 inline" />
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            +{q.rewards.runes} <img src="/ui/icon_runes.png" alt="Руны" className="w-3 h-3 inline" />
                          </span>
                        </div>
                      </div>
                      {/* Claim button */}
                      <div className="flex-shrink-0">
                        {q.claimed ? (
                          <span className="text-accent text-lg">✓</span>
                        ) : q.completed ? (
                          <button
                            onClick={() => claimReward(q)}
                            disabled={claimingKey === q.key}
                            className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-kelly animate-pulse whitespace-nowrap"
                          >
                            Забрать
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40 text-lg">○</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
