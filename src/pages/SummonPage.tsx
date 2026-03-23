import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import HeroCard from '@/components/game/HeroCard';
import { type Champion, ELEMENT_ICONS, PITY_THRESHOLDS, PITY_PRIORITY } from '@/data/gameData';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import bgSummon from '@/assets/bg-summon.jpg';
import iconSouls from '@/assets/icons/icon_souls.png';
import iconPortal from '@/assets/icons/icon_portal.png';

const SUMMON_COST_1 = 100;
const SUMMON_COST_10 = 900;
const SUMMON_COST_100 = 9000;

const RARITY_COLORS: Record<string, string> = {
  'Заветный': 'text-rarity-rare',
  'Сказанный': 'text-rarity-epic',
  'Калиновый': 'text-rarity-legendary',
  'Самоцветный': 'text-rarity-mythic',
};

const RARITY_BAR_COLORS: Record<string, string> = {
  'Заветный': 'bg-rarity-rare',
  'Сказанный': 'bg-rarity-epic',
  'Калиновый': 'bg-rarity-legendary',
  'Самоцветный': 'bg-rarity-mythic',
};

export default function SummonPage() {
  const navigate = useNavigate();
  const { player, summonHeroWithPity, spendSouls, pityCounters } = useGame();
  const [summoning, setSummoning] = useState(false);
  const [revealedHeroes, setRevealedHeroes] = useState<Champion[]>([]);
  const [phase, setPhase] = useState<'idle' | 'ritual' | 'reveal'>('idle');

  const slotsLeft = player.championSlots - player.champions.length;
  const isFull = slotsLeft <= 0;

  const doSummon = useCallback((count: number) => {
    if (isFull) return;
    const costs: Record<number, number> = { 1: SUMMON_COST_1, 10: SUMMON_COST_10, 100: SUMMON_COST_100 };
    const cost = costs[count] ?? count * SUMMON_COST_1;
    if (player.souls < cost || summoning) return;

    // Limit to free slots and adjust cost
    const actualCount = Math.min(count, slotsLeft);
    const costPerUnit = cost / count;
    const actualCost = Math.round(actualCount * costPerUnit);

    spendSouls(actualCost);
    setSummoning(true);
    setPhase('ritual');
    setTimeout(() => {
      const heroes = summonHeroWithPity(actualCount);
      if (actualCount < count) {
        toast.info(`Призвано ${actualCount} из ${count} — нет свободных мест. Возвращено ${cost - actualCost} Душ`);
      }
      setRevealedHeroes(heroes);
      setPhase('reveal');
      setSummoning(false);
    }, count >= 100 ? 3000 : 2000);
  }, [player.souls, summoning, spendSouls, summonHeroWithPity, isFull, slotsLeft]);

  const handleClose = () => { setPhase('idle'); setRevealedHeroes([]); };

  return (
    <TooltipProvider>
      <div className="min-h-screen pb-28 relative overflow-hidden">
        <div className="fixed inset-0 z-0">
          <img src={bgSummon} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>

        <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-2xl mx-auto flex flex-col items-center min-h-screen">
          <div className="w-full flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ←
            </button>
            <img src="/ui/icon_summon.png" alt="" className="w-8 h-8 object-contain" />
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow">
              Алтарь Призыва
            </motion.h1>
          </div>
          <p className="text-muted-foreground text-center text-sm mb-4">
            Принеси души в жертву огню
          </p>

          {/* Pity progress bars */}
          <div className="w-full max-w-sm mb-4 space-y-1.5 bg-surface/50 backdrop-blur-sm rounded-xl p-3 card-lubok">
            <h3 className="font-kelly text-xs text-muted-foreground mb-1.5 text-center">Гарантия призыва</h3>
            {PITY_PRIORITY.slice().reverse().map(rarity => {
              const threshold = PITY_THRESHOLDS[rarity] ?? 1;
              const current = pityCounters[rarity] ?? 0;
              const pct = Math.min((current / threshold) * 100, 100);
              const remaining = Math.max(threshold - current, 0);
              return (
                <Tooltip key={rarity}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] w-24 truncate font-kelly ${RARITY_COLORS[rarity]}`}>{rarity}</span>
                      <div className="flex-1 relative">
                        <Progress value={pct} className="h-2.5 bg-muted/50" />
                        <div 
                          className={`absolute inset-y-0 left-0 rounded-full transition-all ${RARITY_BAR_COLORS[rarity]}`} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono w-14 text-right">{current}/{threshold}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">До гарантии <span className={RARITY_COLORS[rarity]}>{rarity}</span> осталось {remaining} душ</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full">
                  {isFull && (
                    <div className="w-full max-w-sm mb-4 bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
                      <p className="font-kelly text-sm text-destructive">🚫 Дружина переполнена!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {player.champions.length}/{player.championSlots} мест занято. Освободи места или расширь Дружину.
                      </p>
                    </div>
                  )}
                  {!isFull && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Мест: {player.champions.length}/{player.championSlots}
                    </p>
                  )}
                  <motion.div
                    className="relative mb-6 w-28 h-28 sm:w-36 sm:h-36"
                    animate={{ scale: [1, 1.06, 1], rotate: [0, 360] }}
                    transition={{ scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 12, repeat: Infinity, ease: 'linear' } }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)' }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <img src={iconPortal} alt="Портал призыва" className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
                  </motion.div>

                  <div className="text-center mb-4">
                    <div className="text-sm text-muted-foreground">
                      У тебя: <span className="text-primary font-mono inline-flex items-center gap-1"><img src={iconSouls} alt="Души" className="w-4 h-4" /> {player.souls}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6 w-full max-w-md px-2 justify-center">
                    <button
                      onClick={() => doSummon(1)}
                      disabled={player.souls < SUMMON_COST_1 || isFull}
                      className="flex-1 min-w-[100px] bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-kelly text-base px-3 py-3 rounded-xl card-lubok transition-all min-h-[56px]"
                    >
                      <div>Призвать ×1</div>
                      <div className="text-xs opacity-80 flex items-center justify-center gap-1">{SUMMON_COST_1} <img src={iconSouls} alt="" className="w-3 h-3" /></div>
                    </button>
                    <button
                      onClick={() => doSummon(10)}
                      disabled={player.souls < SUMMON_COST_10 || isFull}
                      className="flex-1 min-w-[100px] bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-accent-foreground font-kelly text-base px-3 py-3 rounded-xl card-lubok transition-all ring-2 ring-primary/50 min-h-[56px]"
                    >
                      <div>Призвать ×10</div>
                      <div className="text-xs opacity-80 flex items-center justify-center gap-1">{SUMMON_COST_10} <img src={iconSouls} alt="" className="w-3 h-3" /></div>
                    </button>
                    <button
                      onClick={() => doSummon(100)}
                      disabled={player.souls < SUMMON_COST_100 || isFull}
                      className="flex-1 min-w-[100px] bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-kelly text-base px-3 py-3 rounded-xl card-lubok transition-all ring-2 ring-primary min-h-[56px]"
                    >
                      <div>Призвать ×100</div>
                      <div className="text-xs opacity-80 flex items-center justify-center gap-1">{SUMMON_COST_100} <img src={iconSouls} alt="" className="w-3 h-3" /></div>
                    </button>
                  </div>

                  <div className="bg-surface/50 backdrop-blur-sm rounded-xl p-3 card-lubok w-full max-w-sm">
                    <h3 className="font-kelly text-xs text-muted-foreground mb-2 text-center">Шансы призыва</h3>
                    <div className="space-y-0.5 text-sm">
                      {[
                        ['Обиходный', '70%', 'text-rarity-common'],
                        ['Заветный', '20%', 'text-rarity-rare'],
                        ['Сказанный', '9%', 'text-rarity-epic'],
                        ['Калиновый', '0.9%', 'text-rarity-legendary'],
                        ['Самоцветный', '0.1%', 'text-rarity-mythic'],
                      ].map(([name, rate, color]) => (
                        <div key={name} className="flex justify-between text-xs">
                          <span className={color as string}>{name}</span>
                          <span className="font-mono text-muted-foreground">{rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === 'ritual' && (
                <motion.div key="ritual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                  <motion.div className="text-8xl" animate={{ rotate: 360 }} transition={{ duration: 2, ease: 'linear', repeat: Infinity }}>✦</motion.div>
                  <motion.p className="text-primary font-kelly text-lg mt-4" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                    Духи откликаются...
                  </motion.p>
                </motion.div>
              )}

              {phase === 'reveal' && revealedHeroes.length > 0 && (
                <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full">
                  {revealedHeroes.length === 1 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.3, rotateY: 180, filter: 'blur(20px)' }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                      className="max-w-[200px] sm:max-w-xs"
                    >
                      <HeroCard champion={revealedHeroes[0]} compact />
                      <div className="text-center mt-2">
                        <p className="font-kelly text-base text-primary text-gold-glow">{ELEMENT_ICONS[revealedHeroes[0].element]} {revealedHeroes[0].name}</p>
                        <p className="text-xs text-muted-foreground">{revealedHeroes[0].rarity}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className={`grid ${revealedHeroes.length > 10 ? 'grid-cols-5 sm:grid-cols-10' : 'grid-cols-3 sm:grid-cols-5'} gap-1 sm:gap-1.5 max-w-3xl w-full max-h-[60vh] overflow-y-auto`}>
                      {revealedHeroes.map((hero, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.3, y: 30 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 2), duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                          <HeroCard champion={hero} compact />
                          <p className="text-[8px] text-center mt-0.5 text-muted-foreground truncate">{hero.name}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Summary of rare pulls */}
                  {revealedHeroes.length > 1 && (() => {
                    const rarityCounts: Record<string, number> = {};
                    revealedHeroes.forEach(h => { rarityCounts[h.rarity] = (rarityCounts[h.rarity] ?? 0) + 1; });
                    const notable = Object.entries(rarityCounts).filter(([r]) => r !== 'Обиходный');
                    if (notable.length === 0) return null;
                    return (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-2 flex gap-2 flex-wrap justify-center">
                        {notable.map(([r, c]) => (
                          <span key={r} className={`text-xs font-kelly ${RARITY_COLORS[r] ?? 'text-muted-foreground'}`}>{r}: {c}</span>
                        ))}
                      </motion.div>
                    );
                  })()}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: revealedHeroes.length > 10 ? 2.5 : revealedHeroes.length > 1 ? 1.8 : 1.2 }}
                    className="flex flex-wrap gap-2 mt-4 justify-center"
                  >
                    <button onClick={() => doSummon(1)} disabled={player.souls < SUMMON_COST_1} className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-kelly px-4 py-2 rounded-lg transition-all min-h-[44px]">×1</button>
                    <button onClick={() => doSummon(10)} disabled={player.souls < SUMMON_COST_10} className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-accent-foreground font-kelly px-4 py-2 rounded-lg transition-all ring-2 ring-primary/50 min-h-[44px]">×10</button>
                    <button onClick={() => doSummon(100)} disabled={player.souls < SUMMON_COST_100} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-40 text-primary-foreground font-kelly px-4 py-2 rounded-lg transition-all ring-2 ring-primary min-h-[44px]">×100</button>
                    <button onClick={handleClose} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-kelly px-4 py-2 rounded-lg transition-all min-h-[44px]">Закрыть</button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
