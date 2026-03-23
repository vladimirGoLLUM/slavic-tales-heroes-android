import { motion, AnimatePresence } from 'framer-motion';
import { type Stage, type Difficulty, DIFFICULTY_ICONS, isStageCleared, getStageStars, type CampaignProgress, buildEnemyWaves, type ScaledChampion, getRecommendedPower, WAVES_PER_STAGE } from '@/data/campaignStages';
import { ELEMENT_ICONS, type Champion, getEnergyCost } from '@/data/gameData';
import { CHAPTER_SET_MAP } from '@/data/campaignDrops';
import { SLOT_LABELS, type ArtifactSlot } from '@/data/artifacts';
import SetIcon from '@/components/game/SetIcon';
import SlotIcon from '@/components/game/SlotIcon';
import iconSouls from '@/assets/icons/icon_souls.png';

interface StageModalProps {
  stage: Stage;
  difficulty: Difficulty;
  progress: CampaignProgress;
  squadPower: number;
  currentEnergy: number;
  onClose: () => void;
  onBattle: () => void;
  onMultiBattle?: (count: number) => void;
}

export default function StageModal({ stage, difficulty, progress, squadPower, currentEnergy, onClose, onBattle, onMultiBattle }: StageModalProps) {
  const cleared = isStageCleared(stage.chapter, stage.stageNumber, progress, difficulty);
  const currentStars = getStageStars(stage.id, stage.chapter, progress, difficulty);
  const rewards = cleared ? stage.rewards.repeat : stage.rewards.firstClear;
  const totalEnemies = buildEnemyWaves(stage, difficulty).reduce((sum, w) => sum + w.length, 0);
  const recPower = getRecommendedPower(stage, difficulty);
  const powerDiff = squadPower - recPower;
  const powerColor = powerDiff >= 0 ? 'text-primary' : powerDiff >= -2000 ? 'text-yellow-400' : 'text-accent';
  const energyCost = getEnergyCost(difficulty, stage.isBoss);
  const hasEnergy = currentEnergy >= energyCost;
  const multiBattleEnergy5 = energyCost * 5;
  const multiBattleEnergy10 = energyCost * 10;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-surface rounded-2xl border border-border card-lubok p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-kelly text-lg text-foreground flex items-center gap-2">
              {stage.isBoss ? '👑' : DIFFICULTY_ICONS[difficulty]}
              {stage.name}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Глава {stage.chapter} · Этап {stage.stageNumber}{stage.isBoss ? ' · БОСС' : ''} · {WAVES_PER_STAGE} раунда
          </p>

          {/* Current stars */}
          {cleared && (
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3].map(s => (
                <span key={s} className={`text-lg ${s <= currentStars ? 'text-primary' : 'text-muted/30'}`}>⭐</span>
              ))}
            </div>
          )}

          {/* Star conditions */}
          <div className="bg-background/50 rounded-xl p-3 mb-3 border border-border/30">
            <h3 className="text-xs font-kelly text-muted-foreground mb-1.5">⭐ Условия звёзд:</h3>
            <div className="space-y-1">
              {stage.starConditions.map((cond, i) => {
                const earned = i < currentStars;
                return (
                  <div key={i} className={`text-xs flex items-center gap-1.5 ${earned ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span>{earned ? '✓' : '○'}</span>
                    <span>{cond.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended level */}
          <div className="bg-background/50 rounded-xl p-3 mb-3 border border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-kelly text-muted-foreground">Рек. сила отряда:</span>
              <span className={`text-sm font-mono font-bold ${powerColor}`}>
                {recPower}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Твой отряд:</span>
              <span className="text-sm font-mono text-foreground">{squadPower}</span>
            </div>
          </div>

          {/* Enemies preview by waves */}
          <div className="mb-3">
            {(() => {
              const waves = buildEnemyWaves(stage, difficulty);
              return waves.map((waveEnemies, waveIdx) => (
                <div key={waveIdx} className="mb-2">
                  <h3 className="text-xs font-kelly text-muted-foreground mb-1">
                    {stage.isBoss && waveIdx === waves.length - 1 ? '👑 Раунд ' : '⚔️ Раунд '}{waveIdx + 1} ({waveEnemies.length} врагов):
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {waveEnemies.map((enemy: ScaledChampion, i: number) => (
                      <div key={i} className="flex flex-col items-center bg-background/40 rounded-lg p-1.5">
                        <img src={enemy.imageUrl} alt={enemy.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover hero-image-filter" />
                        <span className="text-[9px] sm:text-[10px] font-kelly text-center truncate w-full mt-0.5">{enemy.name}</span>
                        <span className="text-[9px]">{ELEMENT_ICONS[enemy.element]}</span>
                        {enemy.eliteModifiers && enemy.eliteModifiers.length > 0 && (
                          <div className="flex flex-col items-center mt-0.5">
                            {enemy.eliteModifiers.map((mod, mi) => (
                              <span key={mi} className="text-[8px] text-accent font-kelly">{mod.label.split(': ')[1]}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Drop info */}
          <div className="bg-background/50 rounded-xl p-3 mb-3 border border-border/30">
            <h3 className="text-xs font-kelly text-muted-foreground mb-1">🏺 Добыча:</h3>
            {(() => {
              const set = CHAPTER_SET_MAP[stage.chapter];
              const STAGE_SLOTS: Record<number, ArtifactSlot | 'accessory'> = {
                1: 'weapon', 2: 'helmet', 3: 'shield', 4: 'gloves', 5: 'armor', 6: 'boots', 7: 'accessory',
              };
              const slotKey = STAGE_SLOTS[stage.stageNumber] ?? 'weapon';
              const isAccessory = slotKey === 'accessory';
              const rarityLabel = difficulty === 'Явь' ? 'Обиходный / Заветный' :
                difficulty === 'Навь' ? 'Сказанный / Калиновый' :
                difficulty === 'Правь' ? 'Самоцветный' : 'Самоцветный 4-5★';
              return (
                <div className="text-xs space-y-1">
                  <p className="text-foreground flex items-center gap-1"><SetIcon set={set} size={14} /> Сет: <span className="text-primary">{set}</span></p>
                  <p className="text-foreground flex items-center gap-1">
                    Слот: {!isAccessory && <SlotIcon slot={slotKey as ArtifactSlot} size={14} />}
                    <span className="text-primary">{isAccessory ? '💍 Бижутерия' : SLOT_LABELS[slotKey as ArtifactSlot]}</span>
                  </p>
                  <p className="text-foreground">Качество: <span className="text-accent">{rarityLabel}</span></p>
                </div>
              );
            })()}
          </div>

          {/* Rewards */}
          <div className="bg-background/50 rounded-xl p-3 mb-4 border border-border/30">
            <h3 className="text-xs font-kelly text-muted-foreground mb-1">
              {cleared ? 'Награда (повтор):' : '🌟 Награда (первое прохождение):'}
            </h3>
            <div className="flex gap-4 text-xs">
              <span className="text-primary flex items-center gap-0.5"><img src={iconSouls} alt="Души" className="w-3.5 h-3.5" /> {rewards.souls}</span>
              <span className="text-foreground flex items-center gap-0.5"><img src="/ui/icon_runes.png" alt="Руны" className="w-3.5 h-3.5" /> {rewards.runes}</span>
              <span className="text-foreground">📚 {rewards.exp}</span>
            </div>
            {!cleared && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Повтор: <img src={iconSouls} alt="Души" className="w-3 h-3 inline-block" />{stage.rewards.repeat.souls} <img src="/ui/icon_runes.png" alt="Руны" className="w-3 h-3 inline-block" />{stage.rewards.repeat.runes} 📚{stage.rewards.repeat.exp}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              ⭐3 звезды: ×1.5 награды
            </p>
          </div>

          {/* Energy cost info */}
          <div className="bg-background/50 rounded-xl p-3 mb-3 border border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-kelly text-muted-foreground flex items-center gap-1">
                <img src="/ui/energy.png" alt="Энергия" className="w-4 h-4" /> Стоимость:
              </span>
              <span className={`text-sm font-mono font-bold ${hasEnergy ? 'text-cyan-400' : 'text-accent'}`}>
                {energyCost} ⚡
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Твоя энергия:</span>
              <span className="text-sm font-mono text-foreground">{currentEnergy}/{100}</span>
            </div>
          </div>

          {/* Battle buttons */}
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBattle}
              disabled={!hasEnergy}
              className={`w-full font-kelly text-lg py-3 rounded-xl transition-all min-h-[48px] card-lubok ${
                hasEnergy
                  ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                  : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
              }`}
            >
              ⚔️ В Бой! ({energyCost}⚡)
            </motion.button>

            {/* Multi-battle for 3-star stages */}
            {currentStars >= 3 && onMultiBattle && (
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onMultiBattle(5)}
                  disabled={currentEnergy < multiBattleEnergy5}
                  className={`flex-1 font-kelly text-sm py-2.5 rounded-xl transition-all min-h-[44px] border ${
                    currentEnergy >= multiBattleEnergy5
                      ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'
                      : 'bg-muted/20 text-muted-foreground border-muted/30 cursor-not-allowed'
                  }`}
                >
                  ⚡ ×5 ({multiBattleEnergy5}⚡)
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onMultiBattle(10)}
                  disabled={currentEnergy < multiBattleEnergy10}
                  className={`flex-1 font-kelly text-sm py-2.5 rounded-xl transition-all min-h-[44px] border ${
                    currentEnergy >= multiBattleEnergy10
                      ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'
                      : 'bg-muted/20 text-muted-foreground border-muted/30 cursor-not-allowed'
                  }`}
                >
                  ⚡ ×10 ({multiBattleEnergy10}⚡)
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
