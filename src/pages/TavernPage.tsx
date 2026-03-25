import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { CHAMPIONS, FEED_XP, type Rarity } from '@/data/gameData';
import { getStarUpgradeCost, getNextLevelXp, XP_PER_LEVEL, getMaxLevelForStars, MAX_LEVEL } from '@/data/upgradeData';
import StarDisplay from '@/components/game/StarDisplay';
import XpDisplay from '@/components/game/XpDisplay';
import AscensionSection from '@/components/tavern/AscensionSection';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const RARITY_STYLE_COLORS: Record<string, string> = {
  'Обиходный': 'hsl(40 10% 50%)',
  'Заветный': 'hsl(145 50% 45%)',
  'Сказанный': 'hsl(220 60% 60%)',
  'Калиновый': 'hsl(280 55% 60%)',
  'Самоцветный': 'hsl(40 85% 55%)',
};

const STAR_NAMES: Record<number, string> = {
  0: 'без звёзд',
  1: '1★',
  2: '2★',
  3: '3★',
  4: '4★',
  5: '5★',
};

export default function TavernPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { player, upgradeStar, feedHero } = useGame();

  const [feedMode, setFeedMode] = useState(false);
  const [selectedFodder, setSelectedFodder] = useState<string[]>([]);
  const [starUpgradeMode, setStarUpgradeMode] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);

  const pc = player.champions.find(c => c.id === id);
  const champion = pc?.champion;

  if (!pc || !champion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Герой не найден</p>
      </div>
    );
  }

  const level = pc.level;
  const stars = pc.stars;
  const maxLevel = getMaxLevelForStars(stars);
  const nextLevelXp = getNextLevelXp(level, stars);
  const currentLevelXp = XP_PER_LEVEL[level] ?? 0;
  const xpInLevel = (pc.xp ?? 0) - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpPercent = xpNeeded > 0 && xpNeeded !== Infinity ? Math.min(100, (xpInLevel / xpNeeded) * 100) : (level >= maxLevel ? 100 : 0);

  const costInfo = getStarUpgradeCost(stars);
  
  // Find eligible fodder heroes for star upgrade
  const getFodderCandidates = () => {
    if (!costInfo) return [];
    return player.champions.filter(c => 
      c.id !== pc.id && 
      !c.locked && 
      c.level >= MAX_LEVEL && 
      (c.stars ?? 0) === costInfo.fodderStars
    );
  };
  const fodderCandidates = getFodderCandidates();

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="relative h-40 sm:h-52 overflow-hidden">
          <img src={champion.imageUrl} alt={champion.name} className="w-full h-full object-cover hero-image-filter" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <div className="absolute top-3 left-3">
            <button onClick={() => navigate(-1)} className="bg-background/70 backdrop-blur-sm px-3 py-1.5 rounded-lg font-kelly text-foreground hover:bg-background/90 transition-colors text-sm min-h-[44px]">
              ← Назад
            </button>
          </div>

          <div className="absolute bottom-3 left-3">
            <h1 className="text-2xl sm:text-3xl font-kelly text-foreground flex items-center gap-2"><img src="/ui/icon_tavern.png" alt="" className="w-8 h-8 object-contain" /> Трактир</h1>
            <p className="text-sm text-muted-foreground">{champion.name} · Ур. {level}</p>
            <StarDisplay stars={stars} redStars={pc.redStars ?? 0} size="md" className="mt-1" />
          </div>
        </div>

        <div className="px-3 sm:px-4 pt-4 space-y-6">
          {/* ⬆️ Развитие */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface/60 rounded-xl p-4 card-lubok"
          >
            <h3 className="font-kelly text-foreground mb-3 flex items-center gap-2"><img src="/ui/icon_levelup.png" alt="" className="w-6 h-6 object-contain" /> Развитие</h3>

            <div className="mb-4">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-kelly text-foreground">Уровень {level} / {maxLevel}</span>
                <span className="font-mono text-muted-foreground text-xs">
                  {level >= maxLevel ? 'МАКС' : `${xpInLevel} / ${xpNeeded} XP`}
                </span>
              </div>
              <Progress value={xpPercent} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1">Уровень повышает ЗДР, АТК и ЗАЩ (+2% за уровень)</p>
            </div>

            <div className="bg-background/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-kelly text-foreground">Звёзды</div>
                  <StarDisplay stars={stars} redStars={pc.redStars ?? 0} size="md" />
                </div>
                <div className="text-right">
                  {costInfo && (
                    <>
                      <div className="text-xs text-muted-foreground font-mono">
                        Нужно: {costInfo.copiesRequired} героев ({STAR_NAMES[costInfo.fodderStars]}, 50 ур.)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Доступно: <span className={fodderCandidates.length >= costInfo.copiesRequired ? 'text-primary' : 'text-accent'}>{fodderCandidates.length}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {costInfo !== null ? (
                <>
                  {level < MAX_LEVEL && (
                    <div className="text-xs text-accent mb-2 font-kelly">⚠ Герой должен быть 50 уровня для повышения звезды</div>
                  )}
                  {!starUpgradeMode ? (
                    <button
                      onClick={() => { setStarUpgradeMode(true); setSelectedDuplicates([]); }}
                      disabled={fodderCandidates.length === 0 || level < MAX_LEVEL}
                      className="w-full py-2 rounded-lg font-kelly text-sm transition-all bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {level < MAX_LEVEL
                        ? `Прокачайте до 50 ур.`
                        : fodderCandidates.length >= costInfo.copiesRequired
                          ? `★ Повысить до ${stars + 1}★ — выбрать ${costInfo.copiesRequired} героев`
                          : `Нужно ещё ${costInfo.copiesRequired - fodderCandidates.length} героев (${STAR_NAMES[costInfo.fodderStars]}, 50 ур.)`
                      }
                    </button>
                  ) : (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Выберите {costInfo.copiesRequired} героев {STAR_NAMES[costInfo.fodderStars]} 50 ур. ({selectedDuplicates.length}/{costInfo.copiesRequired})
                      </div>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto mb-2">
                        {fodderCandidates.map(d => {
                          const sel = selectedDuplicates.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              onClick={() => setSelectedDuplicates(prev =>
                                sel ? prev.filter(x => x !== d.id) : prev.length < costInfo.copiesRequired ? [...prev, d.id] : prev
                              )}
                              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                                sel ? 'border-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]' : 'border-transparent hover:border-muted'
                              }`}
                            >
                              <img src={d.champion.imageUrl} alt={d.champion.name} className="w-full h-14 object-cover" />
                              <div className="p-0.5 bg-background/80 text-center">
                                <div className="text-[10px] font-kelly truncate">{d.champion.name}</div>
                                <div className="text-[9px] font-mono text-muted-foreground">Ур.{d.level} · {STAR_NAMES[d.stars ?? 0]}</div>
                              </div>
                              {sel && <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground">✓</div>}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStarUpgradeMode(false)}
                          className="flex-1 py-2 rounded-lg font-kelly text-sm bg-muted text-muted-foreground hover:bg-muted/80"
                        >Отмена</button>
                        <button
                          onClick={() => {
                            if (upgradeStar(pc.id, selectedDuplicates)) {
                              toast.success(`★ Повышено до ${stars + 1}★! Уровень сброшен.`);
                              setStarUpgradeMode(false);
                              setSelectedDuplicates([]);
                            }
                          }}
                          disabled={selectedDuplicates.length < costInfo.copiesRequired}
                          className="flex-1 py-2 rounded-lg font-kelly text-sm bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                        >★ Повысить</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-sm font-kelly text-primary">★ Максимальные звёзды ★ (макс. уровень: {maxLevel})</div>
              )}
            </div>
          </motion.div>

          {/* 🍖 Поглощение героев */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface/60 rounded-xl p-4 card-lubok"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-kelly text-foreground flex items-center gap-2"><img src="/ui/icon_absorb.png" alt="" className="w-6 h-6 object-contain" /> Поглощение героев</h3>
              <button
                onClick={() => { setFeedMode(!feedMode); setSelectedFodder([]); }}
                className={`text-sm font-kelly px-3 py-1 rounded-lg transition-all ${
                  feedMode ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary hover:bg-primary/30'
                }`}
              >
                {feedMode ? 'Отмена' : 'Выбрать жертв'}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Скорми других героев, чтобы получить опыт. Герои будут уничтожены!
            </p>

            <div className="grid grid-cols-5 gap-1 text-center text-xs mb-3">
              {(Object.entries(FEED_XP) as [Rarity, number][]).map(([rarity, xp]) => (
                <div key={rarity} className="bg-background/40 rounded-lg p-1.5">
                  <div className="truncate" style={{ color: RARITY_STYLE_COLORS[rarity] }}>{rarity}</div>
                  <div className="font-mono text-primary"><XpDisplay xp={xp} /></div>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {feedMode && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  {(() => {
                    const fodderHeroes = player.champions.filter(c => c.id !== pc.id && !player.squad.includes(c.id) && !c.locked);
                    if (fodderHeroes.length === 0) {
                      return <p className="text-sm text-muted-foreground py-2">Нет доступных героев для поглощения (герои из отряда и заблокированные защищены)</p>;
                    }
                    const totalXp = selectedFodder.reduce((sum, fId) => {
                      const f = player.champions.find(c => c.id === fId);
                      return sum + (f ? (FEED_XP[f.champion.rarity] ?? 50) : 0);
                    }, 0);
                    const RARITIES_ORDER: Rarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];
                    const toggleRarity = (rarity: Rarity) => {
                      const ids = fodderHeroes.filter(f => f.champion.rarity === rarity).map(f => f.id);
                      const allSelected = ids.every(id => selectedFodder.includes(id));
                      if (allSelected) {
                        setSelectedFodder(prev => prev.filter(id => !ids.includes(id)));
                      } else {
                        setSelectedFodder(prev => [...new Set([...prev, ...ids])]);
                      }
                    };
                    return (
                      <>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {RARITIES_ORDER.map(r => {
                            const ids = fodderHeroes.filter(f => f.champion.rarity === r).map(f => f.id);
                            if (ids.length === 0) return null;
                            const allSelected = ids.every(id => selectedFodder.includes(id));
                            return (
                              <button
                                key={r}
                                onClick={() => toggleRarity(r)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-kelly transition-all border ${
                                  allSelected
                                    ? 'bg-accent/20 border-accent/50 text-accent'
                                    : 'bg-surface/40 border-border/30 hover:border-border'
                                }`}
                                style={{ color: allSelected ? undefined : RARITY_STYLE_COLORS[r] }}
                              >
                                {allSelected ? '✓ ' : ''}{r} ({ids.length})
                              </button>
                            );
                          })}
                          {selectedFodder.length > 0 && (
                            <button
                              onClick={() => setSelectedFodder([])}
                              className="px-2 py-1 rounded-lg text-[10px] font-kelly text-muted-foreground bg-surface/40 border border-border/30 hover:border-border transition-all"
                            >
                              ✕ Сбросить
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto mb-3">
                          {fodderHeroes.map(f => {
                            const selected = selectedFodder.includes(f.id);
                            return (
                              <button
                                key={f.id}
                                onClick={() => setSelectedFodder(prev =>
                                  selected ? prev.filter(id => id !== f.id) : [...prev, f.id]
                                )}
                                className={`relative rounded-lg overflow-hidden transition-all border-2 ${
                                  selected ? 'border-accent shadow-[0_0_10px_hsl(var(--accent)/0.3)]' : 'border-transparent hover:border-muted'
                                }`}
                              >
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: RARITY_STYLE_COLORS[f.champion.rarity] }} />
                                <img src={f.champion.imageUrl} alt={f.champion.name} className="w-full h-16 object-cover" />
                                <div className="p-1 bg-background/80 text-center">
                                  <div className="text-[10px] font-kelly truncate" style={{ color: RARITY_STYLE_COLORS[f.champion.rarity] }}>{f.champion.name}</div>
                                  <div className="text-[9px] text-muted-foreground">{f.champion.rarity}</div>
                                  <div className="text-[10px] font-mono text-primary"><XpDisplay xp={FEED_XP[f.champion.rarity] ?? 50} prefix="+" suffix=" XP" /></div>
                                </div>
                                {selected && (
                                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[10px] text-accent-foreground">✓</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {selectedFodder.length > 0 && (
                          <button
                            onClick={() => {
                              const result = feedHero(pc.id, selectedFodder);
                              toast.success(`Поглощено ${result.heroesConsumed} героев: +${result.xpGained} XP!`);
                              setSelectedFodder([]);
                              setFeedMode(false);
                            }}
                            className="w-full py-2 rounded-lg font-kelly text-sm bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                          >
                            🍖 Поглотить {selectedFodder.length} героев (<XpDisplay xp={totalXp} prefix="+" suffix=" XP" />)
                          </button>
                        )}
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 🔥 Вознесение */}
          <AscensionSection pc={pc} />

          {/* 🔮 Зачарование — placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface/60 rounded-xl p-4 card-lubok border border-primary/20"
          >
            <h3 className="font-kelly text-foreground mb-2">🔮 Зачарование</h3>
            <p className="text-xs text-muted-foreground">
              Скоро здесь появится возможность усиливать навыки героя и открывать особые способности.
            </p>
            <div className="mt-3 text-center py-6 bg-background/30 rounded-lg border border-dashed border-border/40">
              <span className="text-3xl">🔒</span>
              <p className="text-sm text-muted-foreground mt-2 font-kelly">В разработке</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
