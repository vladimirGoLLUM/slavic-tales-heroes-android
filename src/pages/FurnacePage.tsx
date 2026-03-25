import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ABYSS_BOSSES, ABYSS_BOSS_SET_DROP } from '@/data/abyssData';
import {
  type Artifact, type ArtifactSet,
  SLOT_LABELS, SET_ICONS, STAT_LABELS, formatStatValue,
  ARTIFACT_RARITY_COLORS, ARTIFACT_RARITY_BG,
  MAX_FURNACE_LEVEL, FURNACE_COSTS, FURNACE_MATCHING_BONUS, FURNACE_GENERIC_BONUS,
  getFurnaceCost, FURNACE_BOSS_COLORS, getFurnaceBoostedPrimaryValue, getArtifactFurnaceBonusPercent,
} from '@/data/artifacts';
import ArtifactIcon from '@/components/game/ArtifactIcon';
import SetIcon from '@/components/game/SetIcon';
import StarDisplay from '@/components/game/StarDisplay';
import FurnaceFlames from '@/components/game/FurnaceFlames';
import { toast } from 'sonner';

/** Reverse map: set name → boss id */
const SET_TO_BOSS: Record<string, string> = {};
for (const [bossId, setName] of Object.entries(ABYSS_BOSS_SET_DROP)) {
  SET_TO_BOSS[setName] = bossId;
}

/** All abyss sets */
const ABYSS_SETS = new Set(Object.values(ABYSS_BOSS_SET_DROP));

export default function FurnacePage() {
  const navigate = useNavigate();
  const { player, furnaceEnhanceArtifact } = useGame();
  const [selectedBossId, setSelectedBossId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [enhancing, setEnhancing] = useState(false);

  const materials = player.abyssProgress.materials ?? {};

  const eligibleArtifacts = useMemo(() => {
    if (!selectedBossId) return [];
    const setName = ABYSS_BOSS_SET_DROP[selectedBossId];
    if (!setName) return [];
    return player.artifacts.filter(
      a => a.set === setName && (a.furnaceLevel ?? 0) < MAX_FURNACE_LEVEL
    );
  }, [selectedBossId, player.artifacts]);

  const allEnhanceable = useMemo(() => {
    if (!selectedBossId) return [];
    return player.artifacts.filter(a => (a.furnaceLevel ?? 0) < MAX_FURNACE_LEVEL);
  }, [selectedBossId, player.artifacts]);

  const selectedBoss = ABYSS_BOSSES.find(b => b.id === selectedBossId);
  const currentMaterials = selectedBossId ? (materials[selectedBossId] ?? 0) : 0;

  // Keep selectedArtifact in sync with player state
  const currentArtifact = selectedArtifact
    ? player.artifacts.find(a => a.id === selectedArtifact.id) ?? selectedArtifact
    : null;

  const handleEnhance = () => {
    if (!currentArtifact || !selectedBossId) return;
    const furnaceLevel = currentArtifact.furnaceLevel ?? 0;
    if (furnaceLevel >= MAX_FURNACE_LEVEL) return;

    const cost = getFurnaceCost(furnaceLevel);
    if (currentMaterials < cost) {
      toast.error(`Недостаточно материалов! Нужно: ${cost}, есть: ${currentMaterials}`);
      return;
    }

    const isMatching = ABYSS_BOSS_SET_DROP[selectedBossId] === currentArtifact.set;
    const bonusPercent = isMatching
      ? Math.round(FURNACE_MATCHING_BONUS * 100)
      : Math.round(FURNACE_GENERIC_BONUS * 100);

    setEnhancing(true);
    setTimeout(() => {
      const success = furnaceEnhanceArtifact(currentArtifact.id, selectedBossId);
      if (success) {
        const newLevel = furnaceLevel + 1;
        toast.success(
          `Горнило: уровень ${newLevel}/${MAX_FURNACE_LEVEL} (+${bonusPercent}% к основному стату за уровень)`
        );
      }
      setEnhancing(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-3">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/ancient-forge')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_furnace.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Горнило</h1>
        </div>

        <p className="text-muted-foreground text-xs mb-4">
          Используйте материалы боссов Бездны для усиления артефактов. Артефакты из соответствующего сета получают усиленный бонус (+{Math.round(FURNACE_MATCHING_BONUS * 100)}% за уровень), остальные — стандартный (+{Math.round(FURNACE_GENERIC_BONUS * 100)}% за уровень).
        </p>

        {/* Boss material selector */}
        <div className="mb-4">
          <h3 className="font-kelly text-sm text-foreground mb-2">Выберите материал</h3>
          <div className="grid grid-cols-4 gap-2">
            {ABYSS_BOSSES.map(boss => {
              const count = materials[boss.id] ?? 0;
              const isSelected = selectedBossId === boss.id;
              return (
                <button
                  key={boss.id}
                  onClick={() => {
                    setSelectedBossId(isSelected ? null : boss.id);
                    setSelectedArtifact(null);
                  }}
                  className={`relative flex flex-col items-center rounded-xl border p-2 transition-all ${
                    isSelected
                      ? 'bg-primary/20 border-primary/50 ring-1 ring-primary/30'
                      : count > 0
                      ? 'bg-surface/40 border-border/40 hover:border-primary/30'
                      : 'bg-surface/20 border-border/20 opacity-40'
                  }`}
                >
                  <img src={boss.materialImageUrl} alt={boss.material} className="w-10 h-10 object-contain" />
                  <span className="text-[9px] text-muted-foreground mt-0.5 truncate w-full text-center">{boss.material.split(' ').pop()}</span>
                  <span className={`text-xs font-bold mt-0.5 ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedBossId && selectedBoss && (
            <motion.div
              key={selectedBossId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Current material info */}
              <div className="flex items-center gap-2 bg-surface/40 border border-border/30 rounded-xl px-3 py-2 mb-4">
                <img src={selectedBoss.materialImageUrl} alt="" className="w-8 h-8 object-contain" />
                <div className="flex-1">
                  <div className="text-sm font-kelly text-foreground">{selectedBoss.material}</div>
                  <div className="text-[10px] text-muted-foreground">от {selectedBoss.name}</div>
                </div>
                <div className="text-lg font-bold text-primary">{currentMaterials}</div>
              </div>

              {/* Matching set artifacts */}
              {eligibleArtifacts.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={SET_ICONS[ABYSS_BOSS_SET_DROP[selectedBossId]]} alt="" className="w-5 h-5 object-contain" />
                    <h3 className="font-kelly text-sm text-foreground">
                      {ABYSS_BOSS_SET_DROP[selectedBossId]} <span className="text-primary text-xs">(+{Math.round(FURNACE_MATCHING_BONUS * 100)}%/ур.)</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {eligibleArtifacts.map(art => (
                      <ArtifactRow
                        key={art.id}
                        artifact={art}
                        isSelected={selectedArtifact?.id === art.id}
                        isMatching
                        onSelect={() => setSelectedArtifact(selectedArtifact?.id === art.id ? null : art)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other artifacts */}
              {allEnhanceable.filter(a => !ABYSS_SETS.has(a.set) || SET_TO_BOSS[a.set] !== selectedBossId).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-kelly text-sm text-foreground mb-2">
                    Другие артефакты <span className="text-muted-foreground text-xs">(+{Math.round(FURNACE_GENERIC_BONUS * 100)}%/ур.)</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto">
                    {allEnhanceable
                      .filter(a => !ABYSS_SETS.has(a.set) || SET_TO_BOSS[a.set] !== selectedBossId)
                      .slice(0, 20)
                      .map(art => (
                        <ArtifactRow
                          key={art.id}
                          artifact={art}
                          isSelected={selectedArtifact?.id === art.id}
                          isMatching={false}
                          onSelect={() => setSelectedArtifact(selectedArtifact?.id === art.id ? null : art)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {eligibleArtifacts.length === 0 && allEnhanceable.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Нет артефактов для улучшения
                </div>
              )}

              {/* Enhancement panel */}
              <AnimatePresence>
                {currentArtifact && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-surface/60 border border-primary/30 rounded-xl p-4 mb-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <ArtifactIcon slot={currentArtifact.slot} set={currentArtifact.set} size={48} />
                      <div className="flex-1">
                        <div className="text-sm font-kelly text-foreground">{currentArtifact.name}</div>
                        <div className="flex items-center gap-1.5">
                          <SetIcon set={currentArtifact.set} size={14} />
                          <span className="text-[10px] text-muted-foreground">{currentArtifact.set}</span>
                          <StarDisplay stars={currentArtifact.stars} size="xs" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {STAT_LABELS[currentArtifact.primaryStat]}: {formatStatValue(currentArtifact.primaryValue, currentArtifact.primaryType)}
                          {(currentArtifact.furnaceLevel ?? 0) > 0 && (
                            <span style={{ color: FURNACE_BOSS_COLORS[currentArtifact.furnaceBossId ?? ''] ?? 'hsl(30, 90%, 55%)' }}>
                              {' → '}{formatStatValue(getFurnaceBoostedPrimaryValue(currentArtifact), currentArtifact.primaryType)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Furnace level progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Уровень Горнила</span>
                        <span className="font-bold text-primary">
                          {currentArtifact.furnaceLevel ?? 0}/{MAX_FURNACE_LEVEL}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-background/60 rounded-full overflow-hidden border border-border/20">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                          style={{ width: `${((currentArtifact.furnaceLevel ?? 0) / MAX_FURNACE_LEVEL) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                        {Array.from({ length: MAX_FURNACE_LEVEL + 1 }, (_, i) => (
                          <span
                            key={i}
                            className={i <= (currentArtifact.furnaceLevel ?? 0) ? 'text-amber-400' : ''}
                          >
                            {i > 0 && i % 5 === 0 ? i : '·'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Current bonus */}
                    {(currentArtifact.furnaceLevel ?? 0) > 0 && (
                      <div className="text-xs text-amber-400 mb-2">
                        <img src="/ui/icon_furnace_flame.png" alt="" className="w-4 h-4 inline mr-1" />Текущий бонус: +{getArtifactFurnaceBonusPercent(currentArtifact)}% к {STAT_LABELS[currentArtifact.primaryStat]}
                      </div>
                    )}

                    {/* Cost & enhance button */}
                    {(currentArtifact.furnaceLevel ?? 0) < MAX_FURNACE_LEVEL ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-background/40 rounded-lg px-3 py-1.5 border border-border/30">
                          <img src={selectedBoss.materialImageUrl} alt="" className="w-5 h-5 object-contain" />
                          <span className={`text-sm font-bold ${
                            currentMaterials >= getFurnaceCost(currentArtifact.furnaceLevel ?? 0)
                              ? 'text-primary'
                              : 'text-destructive'
                          }`}>
                            {getFurnaceCost(currentArtifact.furnaceLevel ?? 0)}
                          </span>
                          <span className="text-[9px] text-muted-foreground">нужно</span>
                        </div>
                        <button
                          onClick={handleEnhance}
                          disabled={enhancing || currentMaterials < getFurnaceCost(currentArtifact.furnaceLevel ?? 0)}
                          className="flex-1 py-2.5 rounded-xl font-kelly text-sm border-2 transition-all bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/50 text-amber-300 hover:from-amber-900/50 hover:to-orange-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {enhancing ? (
                            <span className="animate-pulse flex items-center gap-1"><img src="/ui/icon_furnace_flame.png" alt="" className="w-4 h-4 inline" /> Закалка...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-1"><img src="/ui/icon_furnace_flame.png" alt="" className="w-4 h-4 inline" /> Закалить → ур. {(currentArtifact.furnaceLevel ?? 0) + 1}</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-amber-400 font-kelly text-sm py-2">
                        <img src="/ui/icon_furnace_flame.png" alt="" className="w-5 h-5 inline mr-1" />Максимальный уровень Горнила!
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedBossId && (
          <div className="bg-surface/40 border border-border/30 rounded-xl p-4 text-xs text-muted-foreground space-y-2">
            <h3 className="font-kelly text-sm text-foreground mb-2">О Горниле</h3>
            <p>• Выберите материал босса для начала закалки</p>
            <p>• Артефакты сета босса получают <strong>+{Math.round(FURNACE_MATCHING_BONUS * 100)}%</strong> к основному стату за уровень</p>
            <p>• Остальные артефакты получают <strong>+{Math.round(FURNACE_GENERIC_BONUS * 100)}%</strong> за уровень</p>
            <p>• Максимальный уровень Горнила: <strong>{MAX_FURNACE_LEVEL}</strong></p>
            <p>• Материалы добываются при победе над боссами Бездны</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Artifact Row Component ─── */

function ArtifactRow({
  artifact,
  isSelected,
  isMatching,
  onSelect,
}: {
  artifact: Artifact;
  isSelected: boolean;
  isMatching: boolean;
  onSelect: () => void;
}) {
  const furnaceLevel = artifact.furnaceLevel ?? 0;
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all text-left ${
        isSelected
          ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/20'
          : 'bg-surface/30 border-border/30 hover:border-border/50'
      }`}
    >
      <ArtifactIcon slot={artifact.slot} set={artifact.set} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-kelly text-foreground truncate">{artifact.name}</div>
        <div className="flex items-center gap-1.5">
          <SetIcon set={artifact.set} size={12} />
          <span className="text-[9px] text-muted-foreground">{SLOT_LABELS[artifact.slot]}</span>
          <StarDisplay stars={artifact.stars} size="xs" />
          <span className="text-[9px] font-bold" style={{ color: ARTIFACT_RARITY_COLORS[artifact.rarity] }}>
            {artifact.rarity}
          </span>
        </div>
      </div>
      {furnaceLevel > 0 && (
        <div className="flex items-center gap-0.5 rounded px-1.5 py-0.5 border" style={{
          backgroundColor: `${FURNACE_BOSS_COLORS[artifact.furnaceBossId ?? ''] ?? 'hsl(30, 90%, 55%)'}20`,
          borderColor: `${FURNACE_BOSS_COLORS[artifact.furnaceBossId ?? ''] ?? 'hsl(30, 90%, 55%)'}50`,
        }}>
          <img src="/ui/icon_furnace_flame.png" alt="" className="w-3 h-3 object-contain" />
          <span className="text-[10px] font-bold" style={{ color: FURNACE_BOSS_COLORS[artifact.furnaceBossId ?? ''] ?? 'hsl(30, 90%, 55%)' }}>{furnaceLevel}</span>
        </div>
      )}
      {isMatching && (
        <span className="text-[8px] bg-primary/15 text-primary px-1 py-0.5 rounded border border-primary/20">✦</span>
      )}
    </button>
  );
}
