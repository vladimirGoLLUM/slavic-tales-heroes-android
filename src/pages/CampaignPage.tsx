import { useState, useMemo, useEffect, useRef } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { getEnergyCost } from '@/data/gameData';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import iconSouls from '@/assets/icons/icon_souls.png';
import XpDisplay from '@/components/game/XpDisplay';
import SoulDisplay from '@/components/game/SoulDisplay';
import RuneDisplay from '@/components/game/RuneDisplay';
import { useGame } from '@/context/GameContext';
import SquadPickerModal from '@/components/game/SquadPickerModal';
import {
  DIFFICULTIES, DIFFICULTY_ICONS, DIFFICULTY_COLORS, DIFFICULTY_LABELS,
  type Difficulty, type Stage,
  getStagesForChapter, isStageUnlocked, isStageCleared, getStageStars, getChapterTotalStars,
  buildEnemyTeam, buildEnemyWaves, CHAPTERS, TOTAL_CHAPTERS, STAGES_PER_CHAPTER, WAVES_PER_STAGE,
  isChapterFullyCompleted, chapterBonusKey, calculateUnitPower,
} from '@/data/campaignStages';
import { generateCampaignArtifacts } from '@/data/campaignDrops';
import { getCampaignModifiers } from '@/data/campaignModifiers';
import { type Artifact, ARTIFACT_RARITY_COLORS } from '@/data/artifacts';
import { getChapterBonusReward } from '@/data/chapterBonuses';
import StageNode from '@/components/campaign/StageNode';
import StageModal from '@/components/campaign/StageModal';
import ArtifactIcon from '@/components/game/ArtifactIcon';
import StarDisplay from '@/components/game/StarDisplay';
import SetIcon from '@/components/game/SetIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import QuickBuyButton from '@/components/game/QuickBuyButton';
import TutorialGlow from '@/components/game/TutorialGlow';
import { ACCOUNT_XP_REWARDS } from '@/data/accountLevel';
import { getChapterLore } from '@/data/campaignLore';

interface MultiBattleResult {
  count: number;
  totalSouls: number;
  totalRunes: number;
  totalExp: number;
  artifacts: Artifact[];
}

interface ChapterBonusResult {
  souls: number;
  runes: number;
  mithrilRunes: number;
  artifacts: Artifact[];
  chapter: number;
}

export default function CampaignPage() {
  const navigate = useNavigate();
  const { getSquadChampions, campaignProgress, chapterBonusesClaimed, getFullStats, addSouls, addRunes, addXpToSquad, addArtifacts, updateCampaignProgress, checkAndClaimChapterBonus, spendEnergy, getEnergyInfo, setActiveSquad, player, advanceTutorial, gainAccountXp, getMultiBattlesRemaining, getMultiBattleLimit, recordMultiBattles, isVipActive } = useGame();
  const [showSquadPicker, setShowSquadPicker] = useState(false);
  const pendingBattleAction = useRef<(() => void) | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDifficulty = (DIFFICULTIES.includes(searchParams.get('difficulty') as Difficulty)
    ? searchParams.get('difficulty') as Difficulty
    : 'Явь');
  const initialChapter = Math.min(TOTAL_CHAPTERS, Math.max(1, Number(searchParams.get('chapter')) || 1));

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [selectedChapter, setSelectedChapter] = useState(initialChapter);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [multiBattleResult, setMultiBattleResult] = useState<MultiBattleResult | null>(null);
  const [chapterBonusResult, setChapterBonusResult] = useState<ChapterBonusResult | null>(null);

  const stages = useMemo(() => getStagesForChapter(selectedChapter), [selectedChapter]);

  const squad = getSquadChampions();
  const squadPower = useMemo(() => {
    if (squad.length === 0) return 0;
    return squad.reduce((sum, pc) => {
      const stats = getFullStats(pc);
      return sum + calculateUnitPower(stats);
    }, 0);
  }, [squad, getFullStats]);

  const executeBattle = () => {
    if (!selectedStage) return;
    const cost = getEnergyCost(difficulty, selectedStage.isBoss);
    if (!spendEnergy(cost)) {
      toast.error(`Недостаточно энергии! Нужно: ${cost}`);
      return;
    }
    const waves = buildEnemyWaves(selectedStage, difficulty);
    const enemyElements = waves.flat().map(e => e.element);
    const modifiers = getCampaignModifiers(selectedStage.chapter, selectedStage.stageNumber, difficulty, enemyElements);
    sessionStorage.setItem('campaignBattle', JSON.stringify({
      stage: selectedStage,
      difficulty,
      enemies: waves[0],
      waves,
      modifiers,
    }));
    sessionStorage.setItem('campaignBattleReturn', JSON.stringify({
      difficulty,
      chapter: selectedStage.chapter,
    }));
    setSelectedStage(null);
    navigate('/battle');
  };

  const handleBattle = () => {
    pendingBattleAction.current = executeBattle;
    setShowSquadPicker(true);
  };

  const handleSquadConfirm = (squadId: number) => {
    setActiveSquad(squadId);
    setShowSquadPicker(false);
    setTimeout(() => {
      pendingBattleAction.current?.();
      pendingBattleAction.current = null;
    }, 0);
  };

  const executeMultiBattle = (count: number) => {
    if (!selectedStage) return;
    const remaining = getMultiBattlesRemaining();
    const limit = getMultiBattleLimit();
    if (count > remaining) {
      toast.error(`Лимит мультибоёв! Осталось: ${remaining}/${limit}`);
      return;
    }
    const stage = selectedStage;
    const costPerBattle = getEnergyCost(difficulty, stage.isBoss);
    const totalCost = costPerBattle * count;
    if (!spendEnergy(totalCost)) {
      toast.error(`Недостаточно энергии! Нужно: ${totalCost}`);
      return;
    }

    let totalSouls = 0;
    let totalRunes = 0;
    let totalExp = 0;
    const allArtifacts: Artifact[] = [];

    // 3-star repeat rewards with 1.5x multiplier
    const starMultiplier = 1.5;
    const stageRewards = stage.rewards.repeat;

    for (let i = 0; i < count; i++) {
      const souls = Math.floor(stageRewards.souls * starMultiplier);
      const runes = Math.floor(stageRewards.runes * starMultiplier);
      const exp = Math.floor(stageRewards.exp * starMultiplier);

      totalSouls += souls;
      totalRunes += runes;
      totalExp += exp;

      const arts = generateCampaignArtifacts(stage.chapter, stage.stageNumber, difficulty);
      allArtifacts.push(...arts);
    }

    // Apply rewards
    addSouls(totalSouls);
    addRunes(totalRunes);
    addXpToSquad(totalExp);
    gainAccountXp(count * ACCOUNT_XP_REWARDS.campaign_stage);
    if (allArtifacts.length > 0) addArtifacts(allArtifacts);
    recordMultiBattles(count);

    setMultiBattleResult({ count, totalSouls, totalRunes, totalExp, artifacts: allArtifacts });
    setSelectedStage(null);
    // Check for chapter bonus after multi-battle
    setTimeout(() => {
      const result = checkAndClaimChapterBonus(difficulty, stage.chapter);
      if (result?.claimed) {
        setChapterBonusResult({ souls: result.souls!, runes: result.runes!, mithrilRunes: result.mithrilRunes ?? 0, artifacts: result.artifacts!, chapter: stage.chapter });
      }
    }, 500);
  };

  const handleMultiBattle = (count: number) => {
    pendingBattleAction.current = () => executeMultiBattle(count);
    setShowSquadPicker(true);
  };

  // Check for unclaimed chapter bonus on return from battle
  useEffect(() => {
    const battleReturn = sessionStorage.getItem('campaignBattleReturn');
    if (battleReturn) {
      sessionStorage.removeItem('campaignBattleReturn');
      try {
        const { difficulty: d, chapter: ch } = JSON.parse(battleReturn);
        setTimeout(() => {
          const result = checkAndClaimChapterBonus(d, ch);
          if (result?.claimed) {
            setChapterBonusResult({ souls: result.souls!, runes: result.runes!, mithrilRunes: result.mithrilRunes ?? 0, artifacts: result.artifacts!, chapter: ch });
          }
        }, 1000);
      } catch {}
    }
  }, []);

  // Determine which chapters are unlocked
  const isChapterUnlocked = (ch: number): boolean => {
    if (ch === 1) return true;
    const prevChapter = campaignProgress[difficulty]?.[ch - 1];
    return (prevChapter?.highestStage ?? 0) >= STAGES_PER_CHAPTER;
  };

  const isChapterCleared = (ch: number): boolean => {
    const chProgress = campaignProgress[difficulty]?.[ch];
    return (chProgress?.highestStage ?? 0) >= STAGES_PER_CHAPTER;
  };

  return (
    <div className="min-h-screen pb-4 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-4 sm:pt-8 max-w-4xl mx-auto">
        {(() => {
          const step = player.tutorialStep ?? 99;
          const isBackHighlighted = step === 15 || step === 29;
          return (
            <button
              onClick={() => {
                if (step === 15) advanceTutorial(15);
                if (step === 29) advanceTutorial(29);
                navigate('/trials');
              }}
              className={`relative text-sm font-kelly mb-2 flex items-center gap-1 min-w-[44px] min-h-[44px] ${
                isBackHighlighted ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isBackHighlighted && (
                <TutorialGlow rounded="rounded-xl" label={step === 15 ? 'Отлично! Первый бой пройден. Вернись назад.' : 'Второй бой пройден! Возвращайся.'} wide below />
              )}
              ←
            </button>
          );
        })()}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow text-center mb-1"
        >
          <img src="/ui/icon_campaign.png" alt="" className="w-8 h-8 object-contain inline-block mr-2 align-middle" />Кампания
        </motion.h1>
        <p className="text-center text-muted-foreground text-sm mb-2">
          Пройди путь героя через земли древних славян
        </p>

        {/* Energy bar */}
        {(() => {
          const { current, max } = getEnergyInfo();
          const pct = Math.min((current / max) * 100, 100);
          return (
            <div className="flex items-center gap-2 max-w-xs mx-auto mb-4">
              <img src="/ui/energy.png" alt="Энергия" className="w-5 h-5" />
              <div className="flex-1 h-5 rounded-full bg-muted/40 border border-border/30 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-kelly text-foreground drop-shadow">
                  {current} / {max}
                </span>
              </div>
              <QuickBuyButton type="energy" />
            </div>
          );
        })()}

        {/* Difficulty tabs */}
        {(() => {
          const tutStep = player.tutorialStep ?? 99;
          const tutorialActive = tutStep < 39;
          return (
        <div className={`flex gap-1 justify-center mb-4 ${tutorialActive ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          {DIFFICULTIES.map(d => {
            const isActive = difficulty === d;
            const glowColors: Record<Difficulty, string> = {
              'Явь': 'shadow-green-400/40',
              'Навь': 'shadow-blue-400/40',
              'Правь': 'shadow-purple-400/40',
              'Ирий': 'shadow-red-400/40',
            };
            return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              disabled={tutorialActive}
              className={`relative px-3 sm:px-4 py-2 rounded-xl font-kelly text-xs sm:text-sm transition-all min-h-[40px] ${
                isActive
                  ? `bg-primary/20 text-primary border border-primary/50 shadow-lg ${glowColors[d]}`
                  : 'bg-surface/60 text-muted-foreground border border-border/30 hover:border-border'
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-xl border border-primary/40 animate-pulse pointer-events-none" />
              )}
              <img src={DIFFICULTY_ICONS[d]} alt={d} className="w-4 h-4 inline-block" /> {d}
            </button>
            );
          })}
        </div>
          );
        })()}

        {/* Chapter selector — scrollable */}
        <div className={`mb-6 ${(player.tutorialStep ?? 99) < 39 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <DragScroll className="flex gap-2 pb-2 px-1 -mx-1">
            {Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).map(ch => {
              const cleared = isChapterCleared(ch);
              const unlocked = isChapterUnlocked(ch);
              const chapterDef = CHAPTERS[ch - 1];
              const totalStars = getChapterTotalStars(ch, campaignProgress, difficulty);
              const maxStars = STAGES_PER_CHAPTER * 3;
              return (
                <button
                  key={ch}
                  onClick={() => unlocked && setSelectedChapter(ch)}
                  disabled={!unlocked}
                  className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-h-[56px] min-w-[72px] ${
                    selectedChapter === ch
                      ? 'bg-primary/15 border-2 border-primary text-primary'
                      : unlocked
                      ? 'bg-surface/60 border border-border/30 text-foreground hover:border-primary/30'
                      : 'bg-muted/20 border border-muted/30 text-muted-foreground/40 cursor-not-allowed'
                  }`}
                >
                  {(() => {
                    const bonusKey = chapterBonusKey(difficulty, ch);
                    const bonusClaimed = chapterBonusesClaimed[bonusKey];
                    const full3Star = isChapterFullyCompleted(ch, campaignProgress, difficulty);
                    return (
                      <>
                        <span className="text-lg">
                          {full3Star ? '🏆' : cleared ? '✅' : <img src={chapterDef.icon} alt={chapterDef.name} className="w-5 h-5 inline-block" loading="lazy" />}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-kelly whitespace-nowrap">{ch}. {chapterDef.name.length > 8 ? chapterDef.name.slice(0, 8) + '…' : chapterDef.name}</span>
                        {unlocked && totalStars > 0 && (
                          <span className={`text-[8px] ${totalStars >= maxStars ? 'text-yellow-400' : 'text-primary'}`}>
                            ⭐{totalStars}/{maxStars}
                          </span>
                        )}
                        {bonusClaimed && (
                          <span className="text-[7px] text-yellow-400 font-kelly">Бонус ✓</span>
                        )}
                      </>
                    );
                  })()}
                </button>
              );
            })}
          </DragScroll>
        </div>

        {/* Stage map */}
        <motion.div
          key={`${difficulty}-${selectedChapter}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/40 rounded-2xl border border-border/30 p-4 sm:p-6 card-lubok"
        >
          <h2 className="font-kelly text-foreground text-sm sm:text-base mb-1 text-center flex items-center justify-center gap-1.5">
            <motion.img
              key={`ch-icon-${selectedChapter}`}
              src={CHAPTERS[selectedChapter - 1].icon}
              alt=""
              className="w-6 h-6 inline-block"
              loading="lazy"
              initial={{ scale: 0, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            /> Глава {selectedChapter}: {CHAPTERS[selectedChapter - 1].name}
            <span className={`ml-2 text-xs ${DIFFICULTY_COLORS[difficulty]}`}>
              ({DIFFICULTY_LABELS[difficulty]})
            </span>
          </h2>
          {/* Chapter lore intro */}
          {(() => {
            const lore = getChapterLore(selectedChapter);
            return lore ? (
              <p className="text-xs italic text-muted-foreground/70 text-center mb-2 max-w-sm mx-auto leading-relaxed">
                {lore.intro}
              </p>
            ) : null;
          })()}
          {/* Chapter star summary */}
          <div className="text-center text-xs text-muted-foreground mb-4">
            ⭐ {getChapterTotalStars(selectedChapter, campaignProgress, difficulty)} / {STAGES_PER_CHAPTER * 3}
          </div>

          {/* Map path */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            {stages.map((stage, i) => {
              const unlocked = isStageUnlocked(stage.chapter, stage.stageNumber, campaignProgress, difficulty);
              const cleared = isStageCleared(stage.chapter, stage.stageNumber, campaignProgress, difficulty);
              const isCurrent = unlocked && !cleared;
              const stars = getStageStars(stage.id, stage.chapter, campaignProgress, difficulty);

              return (
                <motion.div
                  key={stage.id}
                  className="flex items-center gap-2 sm:gap-4"
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.07, type: 'spring', stiffness: 260, damping: 18 }}
                >
                  {(() => {
                    const step = player.tutorialStep ?? 99;
                    const isStage1Highlight = step === 11 && stage.stageNumber === 1 && isCurrent;
                    const isStage2Highlight = step === 25 && stage.stageNumber === 2 && isCurrent;
                    const isHighlighted = isStage1Highlight || isStage2Highlight;
                    const tutorialActive = step < 39;
                    const blockedByTutorial = tutorialActive && !isHighlighted;
                    return (
                      <div className={`relative ${blockedByTutorial ? 'opacity-40 pointer-events-none' : ''}`}>
                        {isHighlighted && (
                          <TutorialGlow rounded="rounded-xl" label={step === 11 ? 'Нажми на этап чтобы увидеть врагов и награды. Получи до 3★!' : 'Второй этап! Нажми чтобы начать бой.'} wide />
                        )}
                        <StageNode
                          stageNumber={stage.stageNumber}
                          name={stage.name}
                          isBoss={stage.isBoss}
                          isUnlocked={unlocked}
                          isCleared={cleared}
                          isCurrent={isCurrent}
                          stars={stars}
                          onClick={() => {
                            if (isStage1Highlight) advanceTutorial(11);
                            if (isStage2Highlight) advanceTutorial(25);
                            setSelectedStage(stage);
                          }}
                        />
                      </div>
                    );
                  })()}
                  {i < stages.length - 1 && (
                    <motion.div
                      className={`w-4 sm:w-8 h-0.5 ${cleared ? 'bg-primary/50' : 'bg-muted/30'}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.07 + 0.05, duration: 0.25 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Progress info */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {(() => {
              const chProgress = campaignProgress[difficulty]?.[selectedChapter];
              const highest = chProgress?.highestStage ?? 0;
              return highest >= STAGES_PER_CHAPTER
                ? <span className="text-primary font-kelly">✅ Глава пройдена!</span>
                : <span>Прогресс: {highest}/{STAGES_PER_CHAPTER} этапов</span>;
            })()}
          </div>
        </motion.div>

        {/* Squad info */}
        {squad.length === 0 && (
          <p className="text-center text-muted-foreground text-xs mt-4">
            Сначала собери отряд в «Дружине»
          </p>
        )}
      </div>

      {/* Stage modal */}
      {selectedStage && (
        <StageModal
          stage={selectedStage}
          difficulty={difficulty}
          progress={campaignProgress}
          squadPower={squadPower}
          currentEnergy={getEnergyInfo().current}
          onClose={() => setSelectedStage(null)}
          onBattle={handleBattle}
          onMultiBattle={handleMultiBattle}
          multiBattlesRemaining={getMultiBattlesRemaining()}
        />
      )}

      {/* Multi-battle results modal */}
      <AnimatePresence>
        {multiBattleResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setMultiBattleResult(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface rounded-2xl border border-border card-lubok p-5 sm:p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto"
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">⚡</div>
                <h2 className="text-xl font-kelly text-primary text-gold-glow">Автобой ×{multiBattleResult.count}</h2>
                <p className="text-sm text-muted-foreground mt-1">Все бои выиграны с 3 звёздами!</p>
              </div>

              {/* Total rewards */}
              <div className="bg-background/50 rounded-xl p-4 mb-4 border border-border/30">
                <h3 className="text-xs font-kelly text-muted-foreground mb-2">📦 Суммарная добыча:</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-mono text-primary flex items-center justify-center gap-1"><img src={iconSouls} alt="Души" className="w-5 h-5" /> <SoulDisplay souls={multiBattleResult.totalSouls} /></div>
                    <div className="text-[10px] text-muted-foreground">Души</div>
                  </div>
                  <div>
                    <div className="text-lg font-mono text-foreground flex items-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-5 h-5" /> <RuneDisplay runes={multiBattleResult.totalRunes} /></div>
                    <div className="text-[10px] text-muted-foreground">Руны</div>
                  </div>
                  <div>
                    <div className="text-lg font-mono text-foreground flex items-center gap-1"><img src="/ui/icon_xp.png" alt="Опыт" className="w-5 h-5" /> <XpDisplay xp={multiBattleResult.totalExp} /></div>
                    <div className="text-[10px] text-muted-foreground">Опыт</div>
                  </div>
                </div>
                {isVipActive() && (
                  <p className="text-[10px] text-[hsl(40,85%,55%)] text-center mt-2">👑 VIP: ×1.5 к наградам</p>
                )}
              </div>

              {/* Dropped artifacts */}
              {multiBattleResult.artifacts.length > 0 && (
                <div className="bg-background/50 rounded-xl p-4 mb-4 border border-border/30">
                  <h3 className="text-xs font-kelly text-muted-foreground mb-2">
                    🏺 Артефакты ({multiBattleResult.artifacts.length}):
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {multiBattleResult.artifacts.map((art, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center rounded-lg p-1.5"
                        style={{
                          border: `1px solid ${ARTIFACT_RARITY_COLORS[art.rarity]}`,
                          background: `${ARTIFACT_RARITY_COLORS[art.rarity]}10`,
                        }}
                      >
                        <ArtifactIcon slot={art.slot} set={art.set} size={28} />
                        <div className="flex gap-px mt-0.5">
                          {Array.from({ length: art.stars }).map((_, s) => (
                            <span key={s} className="text-[6px]" style={{ color: ARTIFACT_RARITY_COLORS[art.rarity] }}>★</span>
                          ))}
                        </div>
                        <span className="text-[7px] font-kelly text-muted-foreground text-center truncate w-full">
                          <SetIcon set={art.set} size={8} className="inline" /> {art.set}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMultiBattleResult(null)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-kelly text-lg py-3 rounded-xl transition-all min-h-[48px] card-lubok"
              >
                ✓ Забрать
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter 3-star bonus modal */}
      <AnimatePresence>
        {chapterBonusResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setChapterBonusResult(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface rounded-2xl border border-yellow-500/50 card-lubok p-5 sm:p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto"
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🏆</div>
                <h2 className="text-xl font-kelly text-yellow-400">Глава {chapterBonusResult.chapter} пройдена на 3⭐!</h2>
                <p className="text-sm text-muted-foreground mt-1">Бонусная награда за идеальное прохождение!</p>
              </div>

              <div className="bg-background/50 rounded-xl p-4 mb-4 border border-yellow-500/20">
                <h3 className="text-xs font-kelly text-yellow-400 mb-2">🎁 Бонусная награда:</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-mono text-primary flex items-center justify-center gap-1"><img src={iconSouls} alt="Души" className="w-5 h-5" /> {chapterBonusResult.souls}</div>
                    <div className="text-[10px] text-muted-foreground">Души</div>
                  </div>
                  <div>
                    <div className="text-lg font-mono text-foreground flex items-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-5 h-5" /> {chapterBonusResult.runes}</div>
                    <div className="text-[10px] text-muted-foreground">Руны</div>
                  </div>
                  <div>
                    <div className="text-lg font-mono text-purple-400 flex items-center justify-center gap-1"><img src="/ui/icon_mithril.png" alt="МР" className="w-5 h-5" />{chapterBonusResult.mithrilRunes}</div>
                    <div className="text-[10px] text-muted-foreground">Мифрил. Руны</div>
                  </div>
                </div>
              </div>

              {chapterBonusResult.artifacts.length > 0 && (
                <div className="bg-background/50 rounded-xl p-4 mb-4 border border-yellow-500/20">
                  <h3 className="text-xs font-kelly text-yellow-400 mb-2">
                    🏺 Бонусные артефакты ({chapterBonusResult.artifacts.length}):
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {chapterBonusResult.artifacts.map((art, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center rounded-lg p-1.5"
                        style={{
                          border: `1px solid ${ARTIFACT_RARITY_COLORS[art.rarity]}`,
                          background: `${ARTIFACT_RARITY_COLORS[art.rarity]}10`,
                        }}
                      >
                        <ArtifactIcon slot={art.slot} set={art.set} size={32} />
                        <div className="flex gap-px mt-0.5">
                          {Array.from({ length: art.stars }).map((_, s) => (
                            <span key={s} className="text-[7px]" style={{ color: ARTIFACT_RARITY_COLORS[art.rarity] }}>★</span>
                          ))}
                        </div>
                        <span className="text-[8px] font-kelly text-center truncate w-full" style={{ color: ARTIFACT_RARITY_COLORS[art.rarity] }}>
                          {art.rarity}
                        </span>
                        <span className="text-[7px] font-kelly text-muted-foreground text-center truncate w-full">
                          <SetIcon set={art.set} size={8} className="inline" /> {art.set}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setChapterBonusResult(null)}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-kelly text-lg py-3 rounded-xl transition-all min-h-[48px] card-lubok"
              >
                🏆 Забрать награду!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SquadPickerModal
        open={showSquadPicker}
        onClose={() => { setShowSquadPicker(false); pendingBattleAction.current = null; }}
        onConfirm={handleSquadConfirm}
      />
    </div>
  );
}
