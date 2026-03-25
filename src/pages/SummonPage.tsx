import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import HeroCard from '@/components/game/HeroCard';
import { type Champion, ELEMENT_ICONS } from '@/data/gameData';
import { VESSEL_TYPES, type VesselType, getVesselPityDisplay } from '@/data/vessels';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import bgSummon from '@/assets/bg-summon.jpg';
import iconPortal from '@/assets/icons/icon_portal.png';
import TutorialGlow from '@/components/game/TutorialGlow';

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

// Tutorial step → vessel id to highlight
const TUTORIAL_VESSEL_MAP: Record<number, string> = {
  1: 'Заветный',    // green
  2: 'Сказанный',   // blue
  3: 'Калиновый',   // purple
  4: 'Самоцветный', // orange
};

export default function SummonPage() {
  const navigate = useNavigate();
  const { player, useVessel, useVessels, advanceTutorial } = useGame();
  const [summoning, setSummoning] = useState(false);
  const [revealedHeroes, setRevealedHeroes] = useState<Champion[]>([]);
  const [phase, setPhase] = useState<'idle' | 'ritual' | 'reveal'>('idle');
  const [selectedVessel, setSelectedVessel] = useState<VesselType | null>(null);
  const [expandedPity, setExpandedPity] = useState<string | null>(null);

  const step = player.tutorialStep ?? 99;
  const slotsLeft = player.championSlots - player.champions.length;
  const isFull = slotsLeft <= 0;

  const doSummon = useCallback((vessel: VesselType, count: number) => {
    if (isFull || summoning) return;
    const available = player.vessels[vessel.id as keyof typeof player.vessels] ?? 0;
    if (available <= 0) {
      toast.error(`Нет ${vessel.label}! Купи в Торжище.`);
      return;
    }
    const actualCount = Math.min(count, available, slotsLeft);
    if (actualCount <= 0) return;

    setSelectedVessel(vessel);
    setSummoning(true);
    setPhase('ritual');
    const delay = count >= 10 ? 2500 : count >= 5 ? 2200 : 2000;
    setTimeout(() => {
      let heroes: Champion[];
      if (actualCount === 1) {
        const hero = useVessel(vessel.id);
        heroes = hero ? [hero] : [];
      } else {
        heroes = useVessels(vessel.id, actualCount);
      }
      if (heroes.length > 0) {
        setRevealedHeroes(heroes);
        setPhase('reveal');
      } else {
        setPhase('idle');
        toast.error('Не удалось призвать героя');
      }
      setSummoning(false);
    }, delay);
  }, [isFull, summoning, useVessel, useVessels, player.vessels, slotsLeft]);

  const handleClose = () => { setPhase('idle'); setRevealedHeroes([]); setSelectedVessel(null); };

  const handleBack = () => {
    if (step === 5) advanceTutorial(5);
    navigate('/');
  };

  const isBackHighlighted = step === 5;
  const highlightedVesselId = TUTORIAL_VESSEL_MAP[step] ?? null;

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
              onClick={handleBack}
              className={`relative text-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${
                isBackHighlighted
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isBackHighlighted && (
                <TutorialGlow label="Герои призваны! Вернись на главный экран." wide below />
              )}
              ←
            </button>
            <img src="/ui/icon_summon.png" alt="" className="w-8 h-8 object-contain" />
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow">
              Алтарь Призыва
            </motion.h1>
          </div>
          <p className="text-muted-foreground text-center text-sm mb-4">
            Разбей Сосуд Души — и призови героя
          </p>

          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full">
                  {isFull && (
                    <div className="w-full max-w-sm mb-4 bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
                      <p className="font-kelly text-sm text-destructive">🚫 Дружина переполнена!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {player.champions.length}/{player.championSlots} мест занято.
                      </p>
                    </div>
                  )}
                  {!isFull && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Мест: {player.champions.length}/{player.championSlots}
                    </p>
                  )}

                  <motion.div
                    className="relative mb-5 w-24 h-24 sm:w-32 sm:h-32"
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

                  <h3 className="font-kelly text-base text-foreground mb-3">Выбери Сосуд Души</h3>

                  <div className="flex flex-col gap-3 w-full max-w-md px-2">
                    {VESSEL_TYPES.map((vessel, i) => {
                      const count = player.vessels[vessel.id as keyof typeof player.vessels] ?? 0;
                      const pityInfo = getVesselPityDisplay(vessel, player.vesselPity);
                      const isExpanded = expandedPity === vessel.id;
                      const isVesselHighlighted = vessel.id === highlightedVesselId;
                      const isTutorial = step < 39;
                      const vesselLocked = isTutorial && !isVesselHighlighted;

                      return (
                        <motion.div
                          key={vessel.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`relative flex flex-col ${vesselLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                        >
                          {/* Tutorial pulse on the vessel row */}
                          {isVesselHighlighted && (
                            <TutorialGlow label={
                              step === 1 ? 'Нажми ×1 чтобы разбить сосуд. Чем выше ранг сосуда — тем сильнее герой!' :
                              step === 2 ? 'Синий сосуд даёт более редких героев. Открой его!' :
                              step === 3 ? 'Фиолетовый сосуд — шанс на легендарного героя! Жми ×1.' :
                              step === 4 ? 'Оранжевый сосуд — самый ценный! Гарантирует мощного героя.' : 'Открой сосуд'
                            } wide />
                          )}
                          {/* Vessel info row */}
                          <div className="flex items-center gap-3 bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2.5 card-lubok">
                            <img src={vessel.icon} alt="" className={`w-10 h-10 object-contain flex-shrink-0 ${isVesselHighlighted ? 'animate-bounce' : ''}`} />
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span className={`font-kelly text-sm ${vessel.color}`}>{vessel.label}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {vessel.dropRates.map(dr => (
                                  <span key={dr.rarity} className="text-[10px] text-muted-foreground">
                                    {dr.rarity} {(dr.chance * 100).toFixed(1)}%
                                  </span>
                                ))}
                              </div>
                              {vessel.excludeElements && (
                                <span className="text-[10px] text-destructive">Без: {vessel.excludeElements.join(', ')}</span>
                              )}
                              {/* Summon buttons row */}
                              <div className="flex gap-1.5 mt-2 w-full">
                                {[1, 5, 10].map(n => {
                                  const canUse = count >= n && !isFull;
                                  const isX1Highlighted = isVesselHighlighted && n === 1;
                                  const tutorialBlocked = isTutorial && n > 1;
                                  return (
                                    <button
                                      key={n}
                                      onClick={() => doSummon(vessel, n)}
                                      disabled={!canUse || tutorialBlocked}
                                      className={`flex-1 py-1.5 rounded-lg font-kelly text-xs transition-all min-h-[36px] ${
                                        isX1Highlighted
                                          ? 'bg-primary text-primary-foreground ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]'
                                          : n === 10
                                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground ring-1 ring-primary/50'
                                          : n === 5
                                          ? 'bg-accent text-accent-foreground ring-1 ring-primary/30'
                                          : 'bg-primary text-primary-foreground'
                                      } disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.97]`}
                                    >
                                      ×{n}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div className="bg-surface/80 border border-border/50 rounded-lg px-2.5 py-1">
                                <span className={`font-kelly text-sm ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>×{count}</span>
                              </div>
                            </div>
                          </div>

                          {/* Pity toggle */}
                          {pityInfo.length > 0 && !isTutorial && (
                            <button
                              onClick={() => setExpandedPity(isExpanded ? null : vessel.id)}
                              className="text-[10px] text-muted-foreground hover:text-foreground mt-1 ml-2 text-left transition-colors"
                            >
                              {isExpanded ? '▲ Скрыть гарантии' : '▼ Гарантия призыва'}
                            </button>
                          )}

                          {/* Pity progress bars */}
                          <AnimatePresence>
                            {isExpanded && pityInfo.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-surface/40 backdrop-blur-sm rounded-lg p-2 mt-1 ml-2 mr-2 space-y-1.5">
                                  {pityInfo.map(pi => {
                                    const pct = Math.min((pi.current / pi.threshold) * 100, 100);
                                    return (
                                      <Tooltip key={pi.counterKey}>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[10px] w-24 truncate font-kelly ${RARITY_COLORS[pi.targetRarity] ?? 'text-muted-foreground'}`}>
                                              {pi.targetRarity}
                                            </span>
                                            <div className="flex-1 relative h-2.5 bg-muted/50 rounded-full overflow-hidden">
                                              <div
                                                className={`absolute inset-y-0 left-0 rounded-full transition-all ${RARITY_BAR_COLORS[pi.targetRarity] ?? 'bg-primary'}`}
                                                style={{ width: `${pct}%` }}
                                              />
                                            </div>
                                            <span className="text-[9px] text-muted-foreground font-mono w-12 text-right">
                                              {pi.current}/{pi.threshold}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="text-xs">
                                            До гарантии <span className={RARITY_COLORS[pi.targetRarity]}>{pi.targetRarity}</span> осталось {pi.remaining} сосудов
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {step >= 39 && (
                    <button
                      onClick={() => navigate('/shop')}
                      className="mt-4 text-sm text-primary hover:text-primary/80 font-kelly underline underline-offset-4"
                    >
                      Купить Сосуды в Торжище →
                    </button>
                  )}
                </motion.div>
              )}

              {phase === 'ritual' && (
                <motion.div key="ritual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                  {selectedVessel && (
                    <motion.img
                      src={selectedVessel.icon}
                      alt=""
                      className="w-24 h-24"
                      animate={{ scale: [1, 1.2, 0.8, 1.3], rotate: [0, 10, -10, 0], opacity: [1, 1, 1, 0] }}
                      transition={{ duration: 1.8, ease: 'easeInOut' }}
                    />
                  )}
                  <motion.p className="text-primary font-kelly text-lg mt-4" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                    {revealedHeroes.length > 0 ? 'Сосуды разбиваются...' : 'Сосуд разбивается...'}
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
                    <>
                      <div className={`grid ${revealedHeroes.length > 5 ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-5'} gap-1.5 max-w-xl w-full max-h-[55vh] overflow-y-auto`}>
                        {revealedHeroes.map((hero, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.3, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.08, 1.5), duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                          >
                            <HeroCard champion={hero} compact />
                            <p className="text-[8px] text-center mt-0.5 text-muted-foreground truncate">{hero.name}</p>
                          </motion.div>
                        ))}
                      </div>
                      {(() => {
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
                    </>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: revealedHeroes.length > 1 ? 1.5 : 1.2 }}
                    className="flex flex-wrap gap-2 mt-4 justify-center"
                  >
                    {selectedVessel && [1, 5, 10].map(n => {
                      const avail = player.vessels[selectedVessel.id as keyof typeof player.vessels] ?? 0;
                      return (
                        <button
                          key={n}
                          onClick={() => doSummon(selectedVessel, n)}
                          disabled={avail < n || isFull}
                          className={`font-kelly px-4 py-2 rounded-lg transition-all min-h-[44px] disabled:opacity-30 ${
                            n === 10
                              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground ring-1 ring-primary'
                              : n === 5
                              ? 'bg-accent text-accent-foreground ring-1 ring-primary/50'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          ×{n}
                        </button>
                      );
                    })}
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
