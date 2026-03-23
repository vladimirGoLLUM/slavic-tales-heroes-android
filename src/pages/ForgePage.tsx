import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import ForgeAnimation from '@/components/game/ForgeAnimation';
import {
  type Artifact, type ArtifactSlot, type ArtifactRarity,
  SLOT_LABELS, SET_ICONS, STAT_LABELS, formatStatValue,
  ARTIFACT_RARITY_COLORS, ARTIFACT_RARITY_GLOW, ARTIFACT_RARITY_BG, ARTIFACT_RARITY_BORDER_WIDTH,
  MAX_ARTIFACT_STARS, getArtifactStarUpgradeCost, ARTIFACT_STAR_MULTIPLIERS,
  ALL_SLOTS, ALL_ARTIFACT_RARITIES, SLOT_EMOJI,
} from '@/data/artifacts';
import SlotIcon from '@/components/game/SlotIcon';
import ArtifactIcon from '@/components/game/ArtifactIcon';
import SetIcon from '@/components/game/SetIcon';
import StarDisplay from '@/components/game/StarDisplay';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

type ForgeStep = 'slot' | 'rarity' | 'craft';

const RARITY_ORDER: ArtifactRarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];

export default function ForgePage() {
  const { player, upgradeArtifactStar } = useGame();
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgeStep>('slot');
  const [selectedSlot, setSelectedSlot] = useState<ArtifactSlot | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<ArtifactRarity | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [selectedFodder, setSelectedFodder] = useState<Set<string>>(new Set());
  const [forging, setForging] = useState(false);
  const [forgingStars, setForgingStars] = useState(0);

  const equippedIds = useMemo(() =>
    new Set(player.champions.flatMap(c => c.equippedArtifacts)),
    [player.champions]
  );

  // Count artifacts per slot that can be upgraded
  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of ALL_SLOTS) {
      counts[s] = player.artifacts.filter(a => a.slot === s && a.stars < MAX_ARTIFACT_STARS).length;
    }
    return counts;
  }, [player.artifacts]);

  // Count artifacts per rarity for selected slot
  const rarityCounts = useMemo(() => {
    if (!selectedSlot) return {};
    const counts: Record<string, number> = {};
    for (const r of ALL_ARTIFACT_RARITIES) {
      counts[r] = player.artifacts.filter(a => a.slot === selectedSlot && a.rarity === r && a.stars < MAX_ARTIFACT_STARS).length;
    }
    return counts;
  }, [player.artifacts, selectedSlot]);

  // Filtered artifacts for craft step
  const filteredArtifacts = useMemo(() => {
    if (!selectedSlot || !selectedRarity) return [];
    return player.artifacts
      .filter(a => a.slot === selectedSlot && a.rarity === selectedRarity && a.stars < MAX_ARTIFACT_STARS)
      .sort((a, b) => a.stars - b.stars || a.level - b.level);
  }, [player.artifacts, selectedSlot, selectedRarity]);

  const currentArt = selectedArtifact
    ? player.artifacts.find(a => a.id === selectedArtifact.id) ?? selectedArtifact
    : null;

  // Fodder: same slot, same rarity, same stars, unequipped, not the selected artifact
  const availableFodder = useMemo(() => {
    if (!currentArt) return [];
    return player.artifacts.filter(a =>
      a.id !== currentArt.id &&
      a.slot === currentArt.slot &&
      a.rarity === currentArt.rarity &&
      a.stars === currentArt.stars &&
      !equippedIds.has(a.id)
    );
  }, [player.artifacts, currentArt, equippedIds]);

  const cost = currentArt ? getArtifactStarUpgradeCost(currentArt.stars) : null;
  const canUpgrade = cost !== null && selectedFodder.size >= cost;

  const handleSelectSlot = (slot: ArtifactSlot) => {
    setSelectedSlot(slot);
    setSelectedRarity(null);
    setSelectedArtifact(null);
    setSelectedFodder(new Set());
    setStep('rarity');
  };

  const handleSelectRarity = (rarity: ArtifactRarity) => {
    setSelectedRarity(rarity);
    setSelectedArtifact(null);
    setSelectedFodder(new Set());
    setStep('craft');
  };

  const handleBack = () => {
    if (step === 'rarity') {
      setStep('slot');
      setSelectedSlot(null);
    } else if (step === 'craft') {
      setStep('rarity');
      setSelectedRarity(null);
      setSelectedArtifact(null);
      setSelectedFodder(new Set());
    }
  };

  const toggleFodder = (id: string) => {
    setSelectedFodder(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (cost && next.size < cost) next.add(id);
      return next;
    });
  };

  const handleUpgrade = () => {
    if (!currentArt || !canUpgrade) return;
    const newStars = currentArt.stars + 1;
    const success = upgradeArtifactStar(currentArt.id, Array.from(selectedFodder));
    if (success) {
      setForgingStars(newStars);
      setForging(true);
      setSelectedFodder(new Set());
    } else {
      toast.error('Не удалось улучшить звезду');
    }
  };

  const handleForgeComplete = useCallback(() => {
    setForging(false);
    toast.success(`⭐ Улучшено до ${forgingStars}★!`);
  }, [forgingStars]);

  const stepTitle = step === 'slot'
    ? 'Выбери тип экипировки'
    : step === 'rarity'
    ? `${SLOT_EMOJI[selectedSlot!]} ${SLOT_LABELS[selectedSlot!]} — выбери редкость`
    : `${SLOT_EMOJI[selectedSlot!]} ${SLOT_LABELS[selectedSlot!]} · ${selectedRarity}`;

  return (
    <div className="min-h-screen pb-28 relative">
      <ForgeAnimation isPlaying={forging} onComplete={handleForgeComplete} newStars={forgingStars} />
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow"
          >
            🔨 Кузница
          </motion.h1>
        </div>
        <p className="text-center text-muted-foreground text-sm mb-6">
          Улучшай звёзды экипировки, принося в жертву предметы того же типа, редкости и ранга
        </p>

        {/* Breadcrumb / Back */}
        {step !== 'slot' && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </motion.button>
        )}

        <motion.h2
          key={step + (selectedSlot ?? '') + (selectedRarity ?? '')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-kelly text-foreground text-sm mb-3"
        >
          {stepTitle}
        </motion.h2>

        <AnimatePresence mode="wait">
          {step === 'slot' && (
            <motion.div
              key="slot-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-3 sm:grid-cols-3 gap-3"
            >
              {ALL_SLOTS.map(slot => (
                <motion.div
                  key={slot}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelectSlot(slot)}
                  className="card-lubok rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 border border-border/40 hover:border-primary/50 transition-all min-h-[100px]"
                >
                  <SlotIcon slot={slot} size={40} />
                  <span className="font-kelly text-foreground text-xs text-center">{SLOT_LABELS[slot]}</span>
                  <span className="text-[10px] text-muted-foreground">{slotCounts[slot]} шт.</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {step === 'rarity' && selectedSlot && (
            <motion.div
              key="rarity-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {RARITY_ORDER.map(rarity => {
                const count = rarityCounts[rarity] ?? 0;
                return (
                  <motion.div
                    key={rarity}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => count > 0 && handleSelectRarity(rarity)}
                    className={`rounded-xl p-4 flex flex-col items-center gap-2 transition-all min-h-[80px] ${
                      count > 0 ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-40 cursor-not-allowed'
                    }`}
                    style={{
                      background: ARTIFACT_RARITY_BG[rarity],
                      border: `${ARTIFACT_RARITY_BORDER_WIDTH[rarity]}px solid ${ARTIFACT_RARITY_COLORS[rarity]}`,
                      boxShadow: count > 0 ? ARTIFACT_RARITY_GLOW[rarity] : 'none',
                    }}
                  >
                    <span className="font-kelly text-foreground text-sm">{rarity}</span>
                    <span className="text-xs text-muted-foreground">{count} шт.</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {step === 'craft' && selectedSlot && selectedRarity && (
            <motion.div
              key="craft-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Left: artifact list */}
              <div>
                <h3 className="text-xs text-muted-foreground mb-2">Выбери предмет для улучшения</h3>
                {filteredArtifacts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Нет артефактов</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredArtifacts.map(art => (
                      <ForgeArtifactCard
                        key={art.id}
                        artifact={art}
                        isSelected={currentArt?.id === art.id}
                        isEquipped={equippedIds.has(art.id)}
                        onClick={() => { setSelectedArtifact(art); setSelectedFodder(new Set()); }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: upgrade panel */}
              <div>
                {currentArt ? (
                  <ForgeUpgradePanel
                    artifact={currentArt}
                    cost={cost}
                    fodder={availableFodder}
                    selectedFodder={selectedFodder}
                    onToggleFodder={toggleFodder}
                    canUpgrade={canUpgrade}
                    onUpgrade={handleUpgrade}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <span className="text-4xl mb-3">🔨</span>
                    <p className="font-kelly text-sm">Выбери артефакт слева</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Small artifact card ─── */

function ForgeArtifactCard({ artifact, isSelected, isEquipped, onClick }: {
  artifact: Artifact; isSelected: boolean; isEquipped: boolean; onClick: () => void;
}) {
  const unlocked = artifact.substats.filter(s => artifact.level >= s.unlockLevel);
  const locked = artifact.substats.filter(s => artifact.level < s.unlockLevel);

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative rounded-xl p-2 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary scale-[1.03]' : 'hover:scale-[1.02]'
      }`}
      style={{
        background: ARTIFACT_RARITY_BG[artifact.rarity],
        border: `${ARTIFACT_RARITY_BORDER_WIDTH[artifact.rarity]}px solid ${
          isSelected ? 'hsl(var(--primary))' : ARTIFACT_RARITY_COLORS[artifact.rarity]
        }`,
        boxShadow: isSelected ? '0 0 12px hsl(var(--primary) / 0.4)' : ARTIFACT_RARITY_GLOW[artifact.rarity],
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center shrink-0">
          <ArtifactIcon slot={artifact.slot} set={artifact.set} size={32} />
          <StarDisplay stars={artifact.stars} size="xs" className="mt-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-kelly text-[10px] text-foreground leading-tight truncate">{artifact.name}</h4>
          {artifact.level > 0 && (
            <span className="text-[8px] font-mono text-primary">+{artifact.level}</span>
          )}
          <div className="text-[8px] font-mono text-primary mt-0.5">
            +{formatStatValue(artifact.primaryValue, artifact.primaryType)} {STAT_LABELS[artifact.primaryStat]}
          </div>
          {unlocked.map((s, i) => (
            <div key={i} className="text-[7px] font-mono text-muted-foreground">
              +{formatStatValue(s.value, s.type)} {STAT_LABELS[s.stat]}
            </div>
          ))}
          {locked.map((s, i) => (
            <div key={i} className="text-[7px] font-mono text-muted-foreground/40">
              🔒 ур.{s.unlockLevel}
            </div>
          ))}
        </div>
      </div>
      {isEquipped && (
        <div className="absolute top-0.5 right-0.5 text-[8px] bg-primary/20 text-primary px-0.5 rounded">✓</div>
      )}
    </motion.div>
  );
}

/* ─── Upgrade Panel ─── */

function ForgeUpgradePanel({ artifact, cost, fodder, selectedFodder, onToggleFodder, canUpgrade, onUpgrade }: {
  artifact: Artifact;
  cost: number | null;
  fodder: Artifact[];
  selectedFodder: Set<string>;
  onToggleFodder: (id: string) => void;
  canUpgrade: boolean;
  onUpgrade: () => void;
}) {
  const nextStarMult = ARTIFACT_STAR_MULTIPLIERS[artifact.stars + 1];
  const currentMult = ARTIFACT_STAR_MULTIPLIERS[artifact.stars];

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-4 card-lubok"
        style={{
          background: ARTIFACT_RARITY_BG[artifact.rarity],
          border: `${ARTIFACT_RARITY_BORDER_WIDTH[artifact.rarity] + 1}px solid ${ARTIFACT_RARITY_COLORS[artifact.rarity]}`,
          boxShadow: ARTIFACT_RARITY_GLOW[artifact.rarity],
        }}
      >
        <div className="flex items-center gap-3">
          <ArtifactIcon slot={artifact.slot} set={artifact.set} size={48} />
          <div className="flex-1 min-w-0">
            <h3 className="font-kelly text-foreground text-sm truncate">{artifact.name}</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><SetIcon set={artifact.set} size={10} /> {artifact.set} · {SLOT_LABELS[artifact.slot]}</p>
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay stars={artifact.stars} size="sm" />
              {cost !== null && <span className="text-xs text-muted-foreground">→</span>}
              {cost !== null && <StarDisplay stars={artifact.stars + 1} size="sm" />}
            </div>
            <div className="text-xs font-mono mt-1">
              <span className="text-primary">+{formatStatValue(artifact.primaryValue, artifact.primaryType)} {STAT_LABELS[artifact.primaryStat]}</span>
              {nextStarMult && currentMult && (
                <span className="text-muted-foreground ml-2">(×{currentMult} → ×{nextStarMult})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {cost !== null ? (
        <div className="bg-surface/60 rounded-xl p-3 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-kelly text-muted-foreground">
              Нужно {artifact.rarity} {SLOT_LABELS[artifact.slot].toLowerCase()} {artifact.stars}★:
            </span>
            <span className={`text-sm font-mono ${selectedFodder.size >= cost ? 'text-primary' : 'text-accent'}`}>
              {selectedFodder.size}/{cost}
            </span>
          </div>

          {fodder.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              Нет свободных {artifact.rarity} {SLOT_LABELS[artifact.slot].toLowerCase()} {artifact.stars}★
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[30vh] overflow-y-auto">
              {fodder.map(f => {
                const isSelected = selectedFodder.has(f.id);
                return (
                  <motion.div
                    key={f.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onToggleFodder(f.id)}
                    className={`relative rounded-lg p-1.5 cursor-pointer transition-all min-h-[44px] ${
                      isSelected ? 'ring-2 ring-accent' : ''
                    }`}
                    style={{
                      background: ARTIFACT_RARITY_BG[f.rarity],
                      border: `1px solid ${isSelected ? 'hsl(var(--accent))' : ARTIFACT_RARITY_COLORS[f.rarity]}`,
                      opacity: isSelected ? 1 : 0.7,
                    }}
                  >
                    <div className="flex justify-center">
                      <ArtifactIcon slot={f.slot} set={f.set} size={22} />
                    </div>
                    <div className="text-[8px] text-center text-foreground truncate mt-0.5">{f.name}</div>
                    <div className="flex justify-center">
                      <StarDisplay stars={f.stars} size="xs" />
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 rounded-lg bg-accent/10 flex items-center justify-center">
                        <span className="text-accent text-lg">🔥</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-primary font-kelly text-sm">✨ Максимальные звёзды!</div>
      )}

      {cost !== null && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onUpgrade}
          disabled={!canUpgrade}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-kelly py-3 rounded-xl transition-all min-h-[48px] text-base"
        >
          {canUpgrade ? `🔨 Ковать ${artifact.stars + 1}★` : `Выбери ${cost - selectedFodder.size} ещё`}
        </motion.button>
      )}
    </div>
  );
}
