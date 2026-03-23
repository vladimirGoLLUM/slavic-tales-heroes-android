import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useNavigate } from 'react-router-dom';
import { ELEMENT_ICONS, RARITY_ORDER, getStatLabel, type Element, type PlayerChampion } from '@/data/gameData';
import MythicOverlay from '@/components/game/MythicOverlay';
import {
  type ArtifactSlot, type Artifact,
  ALL_SLOTS, SLOT_LABELS, SET_ICONS,
  ARTIFACT_RARITY_COLORS, ARTIFACT_RARITY_GLOW, ARTIFACT_RARITY_BG, ARTIFACT_RARITY_BORDER_WIDTH,
  STAT_LABELS,
  calculateArtifactStats, getActiveSetBonuses,
  formatStatValue, canEquipSlot, ACCESSORY_STAR_REQUIREMENTS,
  getArtifactUpgradeCost, MAX_ARTIFACT_LEVEL,
} from '@/data/artifacts';
import StarDisplay from '@/components/game/StarDisplay';
import SetIcon from '@/components/game/SetIcon';
import SlotIcon from '@/components/game/SlotIcon';
import ArtifactIcon from '@/components/game/ArtifactIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUnlockedSubstats, getLockedSubstats } from '@/data/artifacts';

type SortMode = 'rarity' | 'level' | 'element' | 'name';

const SORT_LABELS: Record<SortMode, string> = {
  rarity: 'По рангу',
  level: 'По уровню',
  element: 'По стихии',
  name: 'По имени',
};

/* ── Mobile tab for bottom section ── */
type MobileTab = 'equipment' | 'stats';

export default function CollectionPage() {
  const { player, getHeroArtifacts, getUnequippedArtifacts, equipArtifact, unequipArtifact, upgradeArtifact, getEffectiveStats, getFullStats, addToSquad, removeFromSquad, expandChampionSlots } = useGame();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(
    player.champions.length > 0 ? player.champions[0].id : null
  );
  const [sortMode, setSortMode] = useState<SortMode>('rarity');
  const [slotPicker, setSlotPicker] = useState<ArtifactSlot | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);
  const [filterElement, setFilterElement] = useState<Element | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('equipment');
  const selectedRef = useRef<HTMLButtonElement>(null);

  const sortedChampions = useMemo(() => {
    let list = [...player.champions];
    if (filterElement) list = list.filter(c => c.champion.element === filterElement);
    switch (sortMode) {
      case 'rarity': return list.sort((a, b) => RARITY_ORDER[b.champion.rarity] - RARITY_ORDER[a.champion.rarity] || b.level - a.level);
      case 'level': return list.sort((a, b) => b.level - a.level);
      case 'element': return list.sort((a, b) => a.champion.element.localeCompare(b.champion.element));
      case 'name': return list.sort((a, b) => a.champion.name.localeCompare(b.champion.name));
      default: return list;
    }
  }, [player.champions, sortMode, filterElement]);

  const selected = player.champions.find(c => c.id === selectedId) ?? null;
  const champion = selected?.champion;
  const effectiveStats = selected ? getEffectiveStats(selected) : null;
  const equippedArtifacts = selected ? getHeroArtifacts(selected.id) : [];
  const artifactBonuses = effectiveStats ? calculateArtifactStats(equippedArtifacts, effectiveStats) : null;
  const activeBonuses = getActiveSetBonuses(equippedArtifacts);
  const inSquad = selected ? player.squad.includes(selected.id) : false;

  const getEquippedInSlot = (slot: ArtifactSlot): Artifact | undefined =>
    equippedArtifacts.find(a => a.slot === slot);
  

  const handleSlotClick = (slot: ArtifactSlot) => {
    if (!selected) return;
    if (!canEquipSlot(slot, selected.stars)) return;
    const equipped = getEquippedInSlot(slot);
    if (equipped) {
      setViewingArtifact(equipped);
    } else {
      setSlotPicker(slotPicker === slot ? null : slot);
    }
  };

  // All artifacts for the picked slot (equipped on this hero + unequipped)
  const allArtifactsForSlot = useMemo(() => {
    if (!slotPicker || !selected) return [];
    const equipped = getEquippedInSlot(slotPicker);
    const unequipped = getUnequippedArtifacts(slotPicker);
    return equipped ? [equipped, ...unequipped] : unequipped;
  }, [slotPicker, selected, player.artifacts, equippedArtifacts]);

  const getPower = (pc: PlayerChampion) => {
    const stats = getFullStats(pc);
    return stats.hp + stats.atk * 4 + stats.def * 3 + stats.spd * 5;
  };

  const elements: Element[] = ['Огонь', 'Вода', 'Лес', 'Камень', 'Тень', 'Свет'];

  // Scroll selected hero into view on mobile
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId]);

  const HERO_RARITY_COLORS: Record<string, string> = {
    'Обиходный': 'hsl(40 10% 50%)',
    'Заветный': 'hsl(145 50% 45%)',
    'Сказанный': 'hsl(220 60% 60%)',
    'Калиновый': 'hsl(280 55% 60%)',
    'Самоцветный': 'hsl(40 85% 55%)',
  };

  const rarityBorderColor = (rarityIdx: number) =>
    rarityIdx === 0 ? 'hsl(40,10%,35%)'
    : rarityIdx === 1 ? 'hsl(145,50%,40%)'
    : rarityIdx === 2 ? 'hsl(220,60%,55%)'
    : rarityIdx === 3 ? 'hsl(280,55%,50%)'
    : 'hsl(40,85%,55%)';

  /* ─── Hero Card (reused in both layouts) ─── */
  const HeroThumb = ({ pc, isGrid }: { pc: PlayerChampion; isGrid?: boolean }) => {
    const isSelected = pc.id === selectedId;
    const rarityIdx = RARITY_ORDER[pc.champion.rarity];
    return (
      <button
        ref={isSelected ? selectedRef : undefined}
        onClick={() => { setSelectedId(pc.id); setSlotPicker(null); }}
        className={`relative rounded-lg overflow-hidden transition-all flex-shrink-0 ${
          isSelected ? 'ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)] scale-105 z-10' : 'hover:brightness-110'
        }`}
        style={{
          border: `2px solid ${rarityBorderColor(rarityIdx)}`,
          width: isGrid ? undefined : 52,
          height: isGrid ? undefined : 52,
        }}
      >
        <div className={`relative ${isGrid ? 'aspect-square' : 'w-full h-full'}`}>
          <img src={pc.champion.imageUrl} alt={pc.champion.name} className="w-full h-full object-cover" loading="lazy" />
          <MythicOverlay element={pc.champion.element} rarity={pc.champion.rarity} compact />
          <div className="absolute top-0.5 left-0.5 text-[10px] bg-background/70 rounded px-0.5 leading-none z-20">
            {ELEMENT_ICONS[pc.champion.element]}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/90">{pc.level}</span>
              <StarDisplay stars={pc.stars} redStars={pc.redStars ?? 0} size="xs" />
            </div>
          </div>
          {player.squad.includes(pc.id) && (
            <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
              <span className="text-[7px] text-primary-foreground font-bold">⚔</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  /* ─── Equipment Grid (reused) ─── */
  const EquipmentGrid = ({ compact }: { compact?: boolean }) => (
    <>
      <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'} mb-3`}>
        {ALL_SLOTS.map(slot => {
          const equipped = getEquippedInSlot(slot);
          const isLocked = !canEquipSlot(slot, selected!.stars);
          const starReq = ACCESSORY_STAR_REQUIREMENTS[slot];
          const isActive = slotPicker === slot;
          const iconSize = compact ? 40 : 48;

          return (
            <Tooltip key={slot}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSlotClick(slot)}
                  disabled={isLocked}
                  className={`relative aspect-square rounded-lg overflow-hidden transition-all ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}`}
                  style={equipped ? {
                    background: ARTIFACT_RARITY_BG[equipped.rarity],
                    border: `${ARTIFACT_RARITY_BORDER_WIDTH[equipped.rarity]}px solid ${ARTIFACT_RARITY_COLORS[equipped.rarity]}`,
                    boxShadow: isActive
                      ? `${ARTIFACT_RARITY_GLOW[equipped.rarity]}, 0 0 0 2px hsl(var(--primary))`
                      : ARTIFACT_RARITY_GLOW[equipped.rarity],
                  } : {
                    border: `1px solid hsl(var(--border) / 0.2)`,
                    ...(isActive ? { boxShadow: '0 0 0 2px hsl(var(--primary))' } : {}),
                  }}
                >
                  {equipped ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface/60">
                      <ArtifactIcon slot={slot} set={equipped.set} size={iconSize} />
                      <div className="text-[8px] font-mono text-primary mt-0.5">
                        +{formatStatValue(equipped.primaryValue, equipped.primaryType)}
                      </div>
                      {equipped.level > 0 && (
                        <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[7px] font-mono px-0.5 rounded-bl">
                          +{equipped.level}
                        </div>
                      )}
                      <div className="absolute top-0 left-0 text-[6px] font-kelly px-0.5 rounded-br" style={{ color: ARTIFACT_RARITY_COLORS[equipped.rarity], background: 'hsl(var(--surface) / 0.8)' }}>
                        {equipped.rarity.slice(0, 3)}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-px">
                        {Array.from({ length: equipped.stars }).map((_, i) => (
                          <span key={i} className="text-[5px]" style={{ color: ARTIFACT_RARITY_COLORS[equipped.rarity] }}>★</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface/40">
                      <SlotIcon slot={slot} size={compact ? 32 : 40} className="opacity-40" />
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                          <span className="text-[10px]">🔒</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <div className="font-kelly">{SLOT_LABELS[slot]}</div>
                {isLocked && <div className="text-accent">Требуется {starReq}★</div>}
                {equipped && (
                  <>
                    <div className="text-primary">{equipped.name}</div>
                    <div className="flex items-center gap-1"><SetIcon set={equipped.set} size={12} /> {equipped.set}</div>
                    <div className="text-muted-foreground mt-1">Клик — снять</div>
                  </>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Artifact picker dialog */}
      <Dialog open={!!slotPicker} onOpenChange={(open) => { if (!open) setSlotPicker(null); }} modal>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-background border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-kelly">
              {slotPicker && <SlotIcon slot={slotPicker} size={20} />}
              {slotPicker && SLOT_LABELS[slotPicker]}
            </DialogTitle>
          </DialogHeader>

          {/* Currently equipped */}
          {slotPicker && getEquippedInSlot(slotPicker) && (() => {
            const eq = getEquippedInSlot(slotPicker)!;
            return (
              <div className="bg-primary/10 rounded-lg p-2 border border-primary/20 mb-1">
                <div className="text-[10px] text-muted-foreground mb-1">Надето сейчас</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-kelly" style={{ color: ARTIFACT_RARITY_COLORS[eq.rarity] }}>{eq.name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-0.5"><SetIcon set={eq.set} size={10} /> {eq.set}</div>
                  </div>
                  <button
                    onClick={() => { unequipArtifact(selected!.id, eq.id); }}
                    className="text-[10px] px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 font-kelly"
                  >Снять</button>
                </div>
              </div>
            );
          })()}

          {/* Available artifacts list */}
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {allArtifactsForSlot.filter(a => !(slotPicker && getEquippedInSlot(slotPicker)?.id === a.id)).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Нет доступных артефактов для этого слота</p>
            ) : (
              allArtifactsForSlot
                .filter(a => !(slotPicker && getEquippedInSlot(slotPicker)?.id === a.id))
                .map(art => {
                  const unlocked = getUnlockedSubstats(art);
                  const locked = getLockedSubstats(art);
                  return (
                    <button
                      key={art.id}
                      onClick={() => { equipArtifact(selected!.id, art.id); setSlotPicker(null); }}
                      className="w-full text-left bg-surface/60 rounded-lg p-2.5 hover:bg-surface/80 border border-border/20 hover:border-primary/40"
                      style={{ borderLeftWidth: 3, borderLeftColor: ARTIFACT_RARITY_COLORS[art.rarity] }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-kelly text-foreground">{art.name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <SetIcon set={art.set} size={10} /> {art.set} • {art.rarity}
                          </div>
                          <div className="flex items-center gap-px mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-[8px]" style={{ color: i < art.stars ? ARTIFACT_RARITY_COLORS[art.rarity] : 'hsl(var(--muted-foreground) / 0.3)' }}>★</span>
                            ))}
                            {art.level > 0 && <span className="text-[9px] text-muted-foreground ml-1">+{art.level}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono text-primary font-bold">
                            +{formatStatValue(art.primaryValue, art.primaryType)} {STAT_LABELS[art.primaryStat]}
                          </div>
                        </div>
                      </div>
                      {(unlocked.length > 0 || locked.length > 0) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 border-t border-border/10 pt-1">
                          {unlocked.map((s, i) => (
                            <span key={i} className="text-[9px] font-mono text-foreground/70">
                              +{formatStatValue(s.value, s.type)} {STAT_LABELS[s.stat]}
                            </span>
                          ))}
                          {locked.map((s, i) => (
                            <span key={`l${i}`} className="text-[9px] font-mono text-muted-foreground/40">
                              🔒 ур.{s.unlockLevel}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active sets */}
      {activeBonuses.length > 0 && (
        <div className="mb-3 bg-primary/10 rounded-lg p-2 border border-primary/20">
          <div className="text-[10px] font-kelly text-primary mb-1">Комплект</div>
          {activeBonuses.map(({ set, bonus }, i) => (
            <div key={i} className="text-[10px] text-foreground flex items-center gap-0.5"><SetIcon set={set} size={10} /> {set}: {bonus.label}</div>
          ))}
        </div>
      )}
    </>
  );
  const StatsPanel = () => {
    const fullStats = selected ? getFullStats(selected) : null;
    return (
      <div className="bg-surface/60 rounded-lg p-3 border border-border/20">
        <div className="text-xs font-kelly text-primary mb-2">ℹ️ Параметры героя</div>
        <div className="space-y-1.5">
          {Object.entries(effectiveStats!).map(([key, base]) => {
            const bonus = artifactBonuses?.[key as keyof typeof artifactBonuses] ?? 0;
            const total = fullStats ? fullStats[key as keyof typeof fullStats] : base + bonus;
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-kelly">{getStatLabel(key)}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-foreground font-bold">{total}</span>
                  {bonus > 0 && <span className="font-mono text-muted-foreground text-[10px]">({base}+{bonus})</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HEADER ═══ */}
      <div className="bg-surface/60 border-b border-border/30 px-2 py-1.5 flex items-center gap-2">
        <button onClick={() => navigate('/')} className="flex-shrink-0 text-sm text-muted-foreground hover:text-foreground font-kelly px-1.5 py-0.5 rounded bg-surface/60">← Назад</button>
        <img src="/ui/icon_collection.png" alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        <h1 className="text-sm font-kelly text-primary flex-shrink-0 lg:text-lg">Дружина</h1>
        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
          {player.champions.length}/{player.championSlots}
        </span>
        {player.champions.length >= player.championSlots - 10 && (
          <button
            onClick={() => expandChampionSlots()}
            className="flex-shrink-0 text-[10px] bg-accent/20 text-accent hover:bg-accent/30 font-kelly px-1.5 py-0.5 rounded transition-all"
            title={`+10 мест за 10 000 Рун`}
          >
            +10 мест
          </button>
        )}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 justify-end">
          {/* Element filter — compact on mobile */}
          <div className="flex gap-0.5 flex-shrink-0">
            <button
              onClick={() => setFilterElement(null)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-kelly transition-all ${
                !filterElement ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
              }`}
            >Все</button>
            {elements.map(el => (
              <button
                key={el}
                onClick={() => setFilterElement(filterElement === el ? null : el)}
                className={`px-1 py-0.5 rounded text-xs transition-all ${
                  filterElement === el ? 'bg-primary/20' : 'opacity-50 hover:opacity-100'
                }`}
              >{ELEMENT_ICONS[el]}</button>
            ))}
          </div>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="bg-surface text-foreground text-[10px] px-1.5 py-0.5 rounded border border-border/30 font-kelly flex-shrink-0"
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══ MOBILE LAYOUT (< lg) ═══ */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-40px)]">
        {/* Hero roster — horizontal scroll */}
        <div className="flex-shrink-0 border-b border-border/20 bg-surface/30 px-2 py-2 overflow-x-auto">
          <div className="flex gap-1.5">
            {sortedChampions.map(pc => (
              <HeroThumb key={pc.id} pc={pc} />
            ))}
          </div>
        </div>

        {/* Hero info + equipment/stats */}
        {selected && champion && effectiveStats ? (
          <div className="flex-1 overflow-y-auto">
            {/* Hero banner */}
            <div className="relative h-52 overflow-hidden">
              <img src={champion.imageUrl} alt={champion.name} className="w-full h-full object-cover object-top" style={{ filter: 'contrast(1.1) brightness(1.05) saturate(1.15)' }} />
              <MythicOverlay element={champion.element} rarity={champion.rarity} interactive compact />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{ELEMENT_ICONS[champion.element]}</span>
                  <h2 className="text-base font-kelly text-foreground">{champion.name}</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">ур. {selected.level}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StarDisplay stars={selected.stars} redStars={selected.redStars ?? 0} size="xs" />
                  <span className="text-[9px] text-muted-foreground">{champion.faction}</span>
                </div>
              </div>
              <div className="absolute top-1 right-2 text-right">
                <div className="text-[9px] text-muted-foreground">Сила</div>
                <div className="text-sm font-mono text-primary">{getPower(selected).toLocaleString()}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 px-2 py-1.5">
              <button
                onClick={() => navigate(`/hero/${selected.id}`)}
                className="flex-1 py-1 rounded-md bg-surface/80 border border-border/30 font-kelly text-[10px] text-foreground"
              >📜 Подробнее</button>
              <button
                onClick={() => inSquad ? removeFromSquad(selected.id) : addToSquad(selected.id)}
                disabled={!inSquad && player.squad.length >= 4}
                className={`flex-1 py-1 rounded-md font-kelly text-[10px] transition-all ${
                  inSquad ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-primary text-primary-foreground disabled:opacity-40'
                }`}
              >{inSquad ? '✕ Из отряда' : '⚔ В отряд'}</button>
            </div>

            {/* Tabs: equipment / stats */}
            <div className="flex border-b border-border/20 px-2">
              <button
                onClick={() => setMobileTab('equipment')}
                className={`flex-1 py-1.5 text-[10px] font-kelly border-b-2 transition-all ${
                  mobileTab === 'equipment' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >⚔ Снаряжение</button>
              <button
                onClick={() => setMobileTab('stats')}
                className={`flex-1 py-1.5 text-[10px] font-kelly border-b-2 transition-all ${
                  mobileTab === 'stats' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >📊 Параметры</button>
            </div>

            <div className="px-2 py-2">
              {mobileTab === 'equipment' ? <EquipmentGrid compact /> : <StatsPanel />}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground font-kelly text-sm">Выберите героя</div>
        )}
      </div>

      {/* ═══ DESKTOP LAYOUT (>= lg) ═══ */}
      <div className="hidden lg:flex h-[calc(100vh-40px)]">
        {/* LEFT — Grid */}
        <div className="w-[280px] flex-shrink-0 border-r border-border/20 overflow-y-auto p-2 bg-surface/30">
          <div className="grid grid-cols-3 gap-1.5">
            {sortedChampions.map(pc => (
              <HeroThumb key={pc.id} pc={pc} isGrid />
            ))}
          </div>
        </div>

        {/* CENTER — Portrait */}
        <div className="flex-1 flex flex-col items-center relative overflow-hidden">
          {selected && champion ? (
            <>
              <div className="absolute inset-0">
                <img src={champion.imageUrl} alt={champion.name} className="w-full h-full object-cover opacity-30 blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
              </div>
              <div className="relative z-10 flex flex-col items-center pt-4 w-full h-full">
                <div className="text-center mb-2">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-lg">{ELEMENT_ICONS[champion.element]}</span>
                    <h2 className="text-2xl font-kelly text-foreground">{champion.name}</h2>
                    <span className="text-sm text-muted-foreground">ур. {selected.level}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center mt-1">
                    <StarDisplay stars={selected.stars} redStars={selected.redStars ?? 0} size="md" />
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-kelly" style={{
                      color: HERO_RARITY_COLORS[champion.rarity] ?? 'hsl(var(--primary))'
                    }}>{champion.rarity}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{champion.faction}</div>
                </div>
                <div className="relative flex-1 flex items-center justify-center w-full max-w-md px-8">
                  <motion.img
                    key={selected.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={champion.imageUrl}
                    alt={champion.name}
                    className="max-h-[60vh] w-auto rounded-2xl shadow-2xl"
                    style={{
                      filter: 'contrast(1.1) brightness(1.05) saturate(1.15)',
                      maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    }}
                  />
                  <MythicOverlay element={champion.element} rarity={champion.rarity} interactive />
                </div>
                <div className="w-full px-6 pb-4 flex gap-3 justify-center">
                  <button onClick={() => navigate(`/hero/${selected.id}`)} className="px-4 py-2 rounded-xl bg-surface/80 border border-border/30 font-kelly text-sm text-foreground hover:bg-surface transition-all">📜 Подробнее</button>
                  <button
                    onClick={() => inSquad ? removeFromSquad(selected.id) : addToSquad(selected.id)}
                    disabled={!inSquad && player.squad.length >= 4}
                    className={`px-4 py-2 rounded-xl font-kelly text-sm transition-all ${inSquad ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30' : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40'}`}
                  >{inSquad ? '✕ Из отряда' : '⚔ В отряд'}</button>
                  <button onClick={() => navigate(`/compare?hero=${champion.id}`)} className="px-4 py-2 rounded-xl bg-surface/80 border border-border/30 font-kelly text-sm text-foreground hover:bg-surface transition-all">⚖️ Сравнить</button>
                </div>
                <div className="absolute top-4 right-4 text-right">
                  <div className="text-xs text-muted-foreground font-kelly">Сила</div>
                  <div className="text-xl font-mono text-primary">{getPower(selected).toLocaleString()}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground font-kelly">Выберите героя</div>
          )}
        </div>

        {/* RIGHT — Equipment & Stats */}
        <div className="w-[300px] flex-shrink-0 border-l border-border/20 overflow-y-auto bg-surface/30 p-3">
          {selected && champion && effectiveStats ? (
            <>
              <EquipmentGrid />
              <StatsPanel />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Выберите героя</div>
          )}
        </div>
      </div>

      {/* Artifact detail dialog — rendered at top level to avoid unmount issues */}
      <Dialog open={!!viewingArtifact} onOpenChange={(open) => { if (!open) setViewingArtifact(null); }}>
        <DialogContent className="max-w-sm bg-background border-border">
          {viewingArtifact && (() => {
            const art = viewingArtifact;
            const unlocked = getUnlockedSubstats(art);
            const locked = getLockedSubstats(art);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm font-kelly">
                    <ArtifactIcon slot={art.slot} set={art.set} size={24} />
                    <span style={{ color: ARTIFACT_RARITY_COLORS[art.rarity] }}>{art.name}</span>
                  </DialogTitle>
                </DialogHeader>

                <div
                  className="rounded-lg p-3"
                  style={{
                    background: ARTIFACT_RARITY_BG[art.rarity],
                    border: `${ARTIFACT_RARITY_BORDER_WIDTH[art.rarity]}px solid ${ARTIFACT_RARITY_COLORS[art.rarity]}`,
                    boxShadow: ARTIFACT_RARITY_GLOW[art.rarity],
                  }}
                >
                  <div className="text-[10px] text-muted-foreground mb-2">
                    <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-0.5"><SetIcon set={art.set} size={10} /> {art.set} · {SLOT_LABELS[art.slot]} · {art.rarity}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <StarDisplay stars={art.stars} size="sm" />
                    {art.level > 0 && <span className="text-xs font-mono text-primary">+{art.level}</span>}
                  </div>
                  <div className="bg-background/40 rounded-md px-2 py-1.5 mb-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Основная</div>
                    <div className="text-sm font-mono text-primary font-semibold">
                      +{formatStatValue(art.primaryValue, art.primaryType)} {STAT_LABELS[art.primaryStat]}
                    </div>
                  </div>
                  {(unlocked.length > 0 || locked.length > 0) && (
                    <div className="bg-background/40 rounded-md px-2 py-1.5">
                      <div className="text-[10px] text-muted-foreground mb-1">Доп. характеристики</div>
                      <div className="space-y-0.5">
                        {unlocked.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground/80">{STAT_LABELS[s.stat]}</span>
                            <span className="font-mono text-foreground">
                              +{formatStatValue(s.value, s.type)}
                              {s.boosts > 0 && <span className="text-primary ml-0.5">(+{s.boosts})</span>}
                            </span>
                          </div>
                        ))}
                        {locked.map((s, i) => (
                          <div key={`l${i}`} className="flex items-center justify-between text-xs text-muted-foreground/40">
                            <span>🔒 Ур. {s.unlockLevel}</span>
                            <span className="font-mono">???</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline upgrade */}
                {(() => {
                  const freshArt = player.artifacts.find(a => a.id === art.id) ?? art;
                  const canUpgrade = freshArt.level < MAX_ARTIFACT_LEVEL;
                  const upgradeCost = canUpgrade ? getArtifactUpgradeCost(freshArt) : 0;
                  const canAfford = player.runes >= upgradeCost;
                  if (!canUpgrade) return null;
                  return (
                    <div className="bg-background/40 rounded-lg p-2 mt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Улучшить до +{freshArt.level + 1}</span>
                          <div className="text-[10px] font-mono">
                            <span className={`flex items-center gap-1 ${canAfford ? 'text-primary' : 'text-destructive'}`}><img src="/ui/icon_runes.png" alt="Руны" className="w-3.5 h-3.5" /> {upgradeCost}</span>
                            <span className="text-muted-foreground ml-1">({player.runes})</span>
                          </div>
                        </div>
                        <button
                          onClick={() => upgradeArtifact(freshArt.id)}
                          disabled={!canAfford}
                          className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-kelly py-1.5 px-3 rounded-lg transition-all text-xs"
                        >⬆ Улучшить</button>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      setViewingArtifact(null);
                      setSlotPicker(art.slot);
                    }}
                    className="flex-1 py-2 rounded-lg bg-surface/80 border border-border/30 text-foreground font-kelly text-xs"
                  >🔄 Заменить</button>
                  <button
                    onClick={() => {
                      unequipArtifact(selected!.id, art.id);
                      setViewingArtifact(null);
                    }}
                    className="flex-1 py-2 rounded-lg bg-accent/20 text-accent border border-accent/30 font-kelly text-xs"
                  >✕ Снять</button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
