import React, { useState, useMemo, useEffect } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import TutorialGlow from '@/components/game/TutorialGlow';
import {
  type Artifact, type ArtifactSlot, type ArtifactSet, type ArtifactRarity,
  ALL_SLOTS, ALL_SETS, ALL_ARTIFACT_RARITIES,
  SLOT_LABELS, SET_ICONS,
  ARTIFACT_RARITY_COLORS, ARTIFACT_RARITY_GLOW, ARTIFACT_RARITY_BG, ARTIFACT_RARITY_BORDER_WIDTH,
  STAT_LABELS, formatStatValue,
  getUnlockedSubstats, getLockedSubstats, getArtifactUpgradeCost, MAX_ARTIFACT_LEVEL,
  levelUpArtifact as levelUpArtifactFn, getSubstatDisplayValue, MAX_ARTIFACT_STARS,
  getArtifactSellPrice, getFurnaceBoostedPrimaryValue, FURNACE_BOSS_COLORS,
} from '@/data/artifacts';
import SlotIcon from '@/components/game/SlotIcon';
import ArtifactIcon from '@/components/game/ArtifactIcon';
import SetIcon from '@/components/game/SetIcon';
import StarDisplay from '@/components/game/StarDisplay';
import FurnaceFlames from '@/components/game/FurnaceFlames';
import { toast } from 'sonner';

export default function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { player, sellArtifacts, toggleArtifactLock, advanceTutorial } = useGame();
  const tutStep = player.tutorialStep ?? 99;
  const [filterSlot, setFilterSlot] = useState<ArtifactSlot | null>(null);
  const [filterSet, setFilterSet] = useState<ArtifactSet | null>(null);
  const [filterRarity, setFilterRarity] = useState<ArtifactRarity | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [sellMode, setSellMode] = useState(false);
  const [sellSelected, setSellSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const upgradeId = searchParams.get('upgrade');
    if (upgradeId) {
      const art = player.artifacts.find(a => a.id === upgradeId);
      if (art) {
        setSelectedArtifact(art);
        searchParams.delete('upgrade');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, []);

  const equippedIds = useMemo(() =>
    new Set(player.champions.flatMap(c => c.equippedArtifacts)),
    [player.champions]
  );

  const filtered = useMemo(() => {
    return player.artifacts
      .filter(a => {
        if (filterSlot && a.slot !== filterSlot) return false;
        if (filterSet && a.set !== filterSet) return false;
        if (filterRarity && a.rarity !== filterRarity) return false;
        return true;
      })
      .sort((a, b) => a.stars - b.stars || a.level - b.level);
  }, [player.artifacts, filterSlot, filterSet, filterRarity]);

  const hasFilters = !!filterSlot || !!filterSet || !!filterRarity;

  const toggleSellSelect = (id: string) => {
    setSellSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sellTotal = useMemo(() => {
    return filtered
      .filter(a => sellSelected.has(a.id) && !equippedIds.has(a.id))
      .reduce((sum, a) => sum + getArtifactSellPrice(a), 0);
  }, [sellSelected, filtered, equippedIds]);

  const handleSell = () => {
    const ids = Array.from(sellSelected);
    const result = sellArtifacts(ids);
    if (result.count > 0) {
      toast.success(`Продано ${result.count} арт. за ${result.runesGained} Рун`);
      setSellSelected(new Set());
      setSellMode(false);
    }
  };

  const selectAllFiltered = () => {
    const selectable = filtered.filter(a => !equippedIds.has(a.id) && !a.locked);
    setSellSelected(new Set(selectable.map(a => a.id)));
  };

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/ancient-forge')} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">←</button>
          <img src="/ui/icon_treasury.png" alt="" className="w-8 h-8 object-contain" />
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow">
            Сокровищница
          </motion.h1>
        </div>
        <p className="text-center text-muted-foreground text-sm mb-2">
          {player.artifacts.length} артефактов · <img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4 inline-block" /> {player.runes} Рун
        </p>

        {/* Sell mode toggle */}
        {player.artifacts.length > 0 && (
          <div className="flex justify-center gap-2 mb-3">
            <div className="relative">
              {tutStep === 49 && !sellMode && <TutorialGlow wide label="Нажми «Продать» чтобы войти в режим продажи." rounded="rounded-lg" />}
              <button
                onClick={() => {
                  setSellMode(!sellMode);
                  setSellSelected(new Set());
                  if (tutStep === 49 && !sellMode) advanceTutorial(49);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-kelly transition-all border min-h-[36px] ${
                  sellMode
                    ? 'bg-destructive/20 border-destructive/50 text-destructive'
                    : 'bg-surface/40 border-border/30 text-muted-foreground'
                }`}
              >
                {sellMode ? '✕ Отмена' : '💰 Продать'}
              </button>
            </div>
            {sellMode && (
              <>
                <button
                  onClick={selectAllFiltered}
                  className="px-3 py-1.5 rounded-lg text-xs font-kelly transition-all border bg-surface/40 border-border/30 text-muted-foreground min-h-[36px]"
                >
                  ✓ Выбрать все
                </button>
                <button
                  onClick={() => setSellSelected(new Set())}
                  className="px-3 py-1.5 rounded-lg text-xs font-kelly transition-all border bg-surface/40 border-border/30 text-muted-foreground min-h-[36px]"
                >
                  Сбросить
                </button>
              </>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2 mb-4">
          <DragScroll className="-mx-3 px-3">
            <div className="flex gap-1.5">
              {ALL_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => setFilterSlot(filterSlot === slot ? null : slot)}
                  className={`px-2 py-1 rounded-lg text-xs font-kelly transition-all border flex items-center gap-1 flex-shrink-0 min-h-[36px] ${
                    filterSlot === slot
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-surface/40 border-border/30 text-muted-foreground'
                  }`}
                >
                  <SlotIcon slot={slot} size={14} /> {SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          </DragScroll>

          <DragScroll className="-mx-3 px-3">
            <div className="flex gap-1.5">
              {ALL_SETS.map(set => (
                <button
                  key={set}
                  onClick={() => setFilterSet(filterSet === set ? null : set)}
                  className={`px-2 py-1 rounded-lg text-xs font-kelly transition-all border flex-shrink-0 whitespace-nowrap min-h-[36px] ${
                    filterSet === set
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-surface/40 border-border/30 text-muted-foreground'
                  }`}
                >
                  <SetIcon set={set} size={14} /> {set}
                </button>
              ))}
            </div>
          </DragScroll>

          <DragScroll className="-mx-3 px-3">
            <div className="flex gap-1.5">
              {ALL_ARTIFACT_RARITIES.map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRarity(filterRarity === r ? null : r)}
                  className={`px-2 py-1 rounded-lg text-xs font-kelly transition-all border flex-shrink-0 min-h-[36px] ${
                    filterRarity === r
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-surface/40 border-border/30 text-muted-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </DragScroll>

          {hasFilters && (
            <button
              onClick={() => { setFilterSlot(null); setFilterSet(null); setFilterRarity(null); }}
              className="text-xs text-accent font-kelly hover:text-accent/80 transition-colors min-h-[36px]"
            >
              ✕ Сбросить
            </button>
          )}
        </div>

        {player.artifacts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏺</div>
            <p className="text-base font-kelly text-muted-foreground">Сокровищница пуста</p>
            <p className="text-xs text-muted-foreground mt-1">Побеждай врагов, чтобы получить артефакты!</p>
            <button
              onClick={() => navigate('/battle')}
              className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground font-kelly px-5 py-2 rounded-xl transition-all min-h-[44px] text-sm"
            >
              ⚔️ В Бой
            </button>
          </div>
        )}

        {player.artifacts.length > 0 && (
          <>
            {hasFilters && <p className="text-xs text-muted-foreground mb-2">Найдено: {filtered.length}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((art, i) => (
                  <InventoryArtifactCard
                    key={art.id}
                    artifact={art}
                    isEquipped={equippedIds.has(art.id)}
                    index={i}
                    sellMode={sellMode}
                    isSelected={sellSelected.has(art.id)}
                    onToggleSelect={() => toggleSellSelect(art.id)}
                    onToggleLock={() => toggleArtifactLock(art.id)}
                    onClick={() => { if (!sellMode) setSelectedArtifact(art); }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {filtered.length === 0 && player.artifacts.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-base font-kelly">Артефакты не найдены</p>
          </div>
        )}
      </div>

      {/* Sell bar */}
      {sellMode && sellSelected.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <div className="relative max-w-md mx-auto bg-card border border-destructive/30 rounded-2xl p-3 flex items-center justify-between shadow-lg">
            {tutStep === 50 && <TutorialGlow wide label="Выбери ненужный предмет и подтверди — получишь Души!" rounded="rounded-2xl" />}
            <div>
              <span className="text-xs text-muted-foreground font-kelly">Выбрано: {sellSelected.size}</span>
              <div className="text-sm font-mono text-primary flex items-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4" /> +{sellTotal} Рун</div>
            </div>
            <button
              onClick={handleSell}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-kelly py-2 px-5 rounded-xl transition-all min-h-[44px] text-sm"
            >
              💰 Продать
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedArtifact && (
          <ArtifactDetailModal
            artifact={selectedArtifact}
            isEquipped={equippedIds.has(selectedArtifact.id)}
            onClose={() => setSelectedArtifact(null)}
            onEquip={() => navigate(`/collection?equipArtifact=${selectedArtifact.id}`)}
            onToggleLock={() => toggleArtifactLock(selectedArtifact.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Artifact Card — horizontal with full stats ─── */

function InventoryArtifactCard({ artifact, isEquipped, index, sellMode, isSelected, onToggleSelect, onToggleLock, onClick }: {
  artifact: Artifact; isEquipped: boolean; index: number;
  sellMode: boolean; isSelected: boolean; onToggleSelect: () => void; onToggleLock: () => void; onClick: () => void;
}) {
  const unlocked = artifact.substats.filter(s => artifact.level >= s.unlockLevel);
  const locked = artifact.substats.filter(s => artifact.level < s.unlockLevel);
  const cantSell = sellMode && (isEquipped || !!artifact.locked);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      onClick={() => {
        if (sellMode && !isEquipped && !artifact.locked) onToggleSelect();
        else if (!sellMode) onClick();
      }}
      className={`relative rounded-xl p-2 cursor-pointer transition-all hover:scale-[1.01] min-h-[44px] ${
        cantSell ? 'opacity-40 cursor-not-allowed' : ''
      } ${sellMode && isSelected ? 'ring-2 ring-destructive' : ''}`}
      style={{
        background: ARTIFACT_RARITY_BG[artifact.rarity],
        border: `${ARTIFACT_RARITY_BORDER_WIDTH[artifact.rarity]}px solid ${
          sellMode && isSelected ? 'hsl(var(--destructive))' : ARTIFACT_RARITY_COLORS[artifact.rarity]
        }`,
        boxShadow: ARTIFACT_RARITY_GLOW[artifact.rarity],
      }}
    >
      <div className="flex items-start gap-2">
        {/* Sell checkbox */}
        {sellMode && !isEquipped && (
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 ${
            isSelected ? 'bg-destructive border-destructive text-destructive-foreground' : 'border-muted-foreground/40'
          }`}>
            {isSelected && <span className="text-[10px]">✓</span>}
          </div>
        )}

        <div className="flex flex-col items-center shrink-0">
          <ArtifactIcon slot={artifact.slot} set={artifact.set} size={32} />
          <StarDisplay stars={artifact.stars} size="xs" className="mt-0.5" />
          {(artifact.furnaceLevel ?? 0) > 0 && (
            <FurnaceFlames furnaceLevel={artifact.furnaceLevel ?? 0} furnaceBossId={artifact.furnaceBossId} size="xs" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h4 className="font-kelly text-[10px] text-foreground leading-tight truncate">{artifact.name}</h4>
            {artifact.level > 0 && (
              <span className="text-[8px] font-mono text-primary shrink-0">+{artifact.level}</span>
            )}
          </div>
          <p className="text-[8px] text-muted-foreground truncate flex items-center gap-0.5">
            <SetIcon set={artifact.set} size={10} /> {artifact.set}
          </p>

          {/* Primary stat */}
          <div className="text-[9px] font-mono text-primary mt-0.5">
            +{formatStatValue(getFurnaceBoostedPrimaryValue(artifact), artifact.primaryType)} {STAT_LABELS[artifact.primaryStat]}
          </div>

          {/* Substats */}
          {unlocked.map((s, i) => (
            <div key={i} className="text-[7px] font-mono text-muted-foreground">
              +{formatStatValue(getSubstatDisplayValue(s, artifact.level), s.type)} {STAT_LABELS[s.stat]}
            </div>
          ))}
          {locked.map((s, i) => (
            <div key={i} className="text-[7px] font-mono text-muted-foreground/40">
              🔒 ур.{s.unlockLevel}
            </div>
          ))}

          {/* Sell price in sell mode */}
          {sellMode && !isEquipped && (
            <div className="text-[8px] font-mono text-primary/70 mt-0.5 flex items-center gap-0.5">
              <img src="/ui/icon_runes.png" alt="Руны" className="w-3 h-3" /> {getArtifactSellPrice(artifact)} Рун
            </div>
          )}
        </div>
      </div>

      {/* Lock button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
        className={`absolute top-1 right-1 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
          artifact.locked
            ? 'bg-accent/30 border border-accent/60'
            : 'bg-background/40 border border-border/30 opacity-50 hover:opacity-100'
        }`}
        title={artifact.locked ? 'Разблокировать' : 'Заблокировать'}
      >
        {artifact.locked ? <Lock size={14} className="text-accent" /> : <Unlock size={14} className="text-muted-foreground" />}
      </button>

      {isEquipped && (
        <div className="absolute top-0.5 left-0.5 text-[8px] bg-primary/20 text-primary px-0.5 rounded font-kelly">✓</div>
      )}
    </motion.div>
  );
}

/* ─── Detail Modal ─── */

function ArtifactDetailModal({ artifact, isEquipped, onClose, onEquip, onToggleLock }: {
  artifact: Artifact; isEquipped: boolean; onClose: () => void; onEquip: () => void; onToggleLock: () => void;
}) {
  const { upgradeArtifact, player } = useGame();
  const [currentArt, setCurrentArt] = useState(artifact);
  const unlocked = getUnlockedSubstats(currentArt);
  const locked = getLockedSubstats(currentArt);
  const canUpgrade = currentArt.level < MAX_ARTIFACT_LEVEL;
  const upgradeCost = canUpgrade ? getArtifactUpgradeCost(currentArt) : 0;
  const canAfford = player.runes >= upgradeCost;

  const handleUpgrade = () => {
    upgradeArtifact(currentArt.id);
  };

  useEffect(() => {
    const fresh = player.artifacts.find(a => a.id === artifact.id);
    if (fresh) setCurrentArt(fresh);
  }, [player.artifacts, artifact.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-card rounded-2xl p-4 sm:p-6 max-w-sm w-full card-lubok"
        style={{
          border: `${ARTIFACT_RARITY_BORDER_WIDTH[currentArt.rarity] + 1}px solid ${ARTIFACT_RARITY_COLORS[currentArt.rarity]}`,
          boxShadow: `${ARTIFACT_RARITY_GLOW[currentArt.rarity]}, 0 20px 60px -20px rgba(0,0,0,0.8)`,
        }}
      >
        <div className="text-center mb-3">
          <ArtifactIcon slot={currentArt.slot} set={currentArt.set} size={60} className="mx-auto" />
          <h3 className="text-lg font-kelly text-foreground mt-2">{currentArt.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><SetIcon set={currentArt.set} size={14} /> {currentArt.set} · {SLOT_LABELS[currentArt.slot]}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs" style={{ color: ARTIFACT_RARITY_COLORS[currentArt.rarity] }}>{currentArt.rarity}</span>
            <span className="text-xs font-mono text-primary">+{currentArt.level}</span>
          </div>
          <div className="flex justify-center mt-1">
            <StarDisplay stars={currentArt.stars} size="sm" />
          </div>
        </div>

        <div className="bg-background/40 rounded-xl p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Основной:</span>
            <span className="font-mono text-primary font-bold text-sm">+{formatStatValue(getFurnaceBoostedPrimaryValue(currentArt), currentArt.primaryType)} {STAT_LABELS[currentArt.primaryStat]}</span>
          </div>

          {unlocked.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground mb-1 mt-2">Доп. статы:</div>
              {unlocked.map((sub, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{STAT_LABELS[sub.stat]} {sub.type === 'percent' ? '(%)' : '(+)'}</span>
                  <span className="font-mono text-foreground">+{formatStatValue(getSubstatDisplayValue(sub, currentArt.level), sub.type)}</span>
                </div>
              ))}
            </>
          )}

          {locked.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground/60 mb-1 mt-2">🔒 Заблокированы:</div>
              {locked.map((sub, i) => (
                <div key={i} className="flex justify-between text-xs opacity-50">
                  <span className="text-muted-foreground">???</span>
                  <span className="font-mono text-muted-foreground text-[10px]">разблок. на {sub.unlockLevel} ур.</span>
                </div>
              ))}
            </>
          )}
        </div>

        {canUpgrade && (
          <div className="bg-background/40 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Улучшить до +{currentArt.level + 1}</span>
                <div className="text-xs font-mono mt-0.5">
                  <span className={`flex items-center gap-1 ${canAfford ? 'text-primary' : 'text-destructive'}`}><img src="/ui/icon_runes.png" alt="Руны" className="w-3.5 h-3.5" /> {upgradeCost} Рун</span>
                  <span className="text-muted-foreground ml-1">(есть: {player.runes})</span>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={!canAfford}
                className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-kelly py-2 px-4 rounded-xl transition-all min-h-[44px] text-sm"
              >
                ⬆ Улучшить
              </button>
            </div>
          </div>
        )}

        {currentArt.level >= MAX_ARTIFACT_LEVEL && (
          <div className="text-center text-xs text-primary font-kelly mb-3">✨ Максимальный уровень!</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onToggleLock}
            className={`py-2 px-3 rounded-xl transition-all min-h-[44px] text-sm font-kelly border flex items-center gap-1 ${
              currentArt.locked
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'bg-surface/40 border-border/30 text-muted-foreground'
            }`}
          >
            {currentArt.locked ? <Lock size={16} /> : <Unlock size={16} />}
            {currentArt.locked ? 'Защищён' : 'Защитить'}
          </button>
          {!isEquipped && (
            <button onClick={onEquip} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-kelly py-2 rounded-xl transition-all min-h-[44px] text-sm">Надеть</button>
          )}
          <button onClick={onClose} className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-kelly py-2 rounded-xl transition-all min-h-[44px] text-sm">Закрыть</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
