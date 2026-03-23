import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ELEMENT_ICONS, getStatLabel, CHAMPIONS, type Skill } from '@/data/gameData';
import { EFFECT_NAMES } from '@/types/game';
import EffectIcon from '@/components/game/EffectIcon';
import MythicOverlay from '@/components/game/MythicOverlay';

const RARITY_STYLE_COLORS: Record<string, string> = {
  'Обиходный': 'hsl(40 10% 50%)',
  'Заветный': 'hsl(145 50% 45%)',
  'Сказанный': 'hsl(220 60% 60%)',
  'Калиновый': 'hsl(280 55% 60%)',
  'Самоцветный': 'hsl(40 85% 55%)',
};
import { toast } from 'sonner';
import {
  type ArtifactSlot, type Artifact,
  ALL_SLOTS, SLOT_ICONS, SLOT_LABELS, SET_ICONS, SLOT_EMOJI,
  ARTIFACT_RARITY_COLORS, ARTIFACT_RARITY_GLOW, ARTIFACT_RARITY_BG, ARTIFACT_RARITY_BORDER_WIDTH, STAT_LABELS,
  calculateArtifactStats, getActiveSetBonuses,
  formatStatValue, canEquipSlot, ACCESSORY_STAR_REQUIREMENTS,
  getUnlockedSubstats, getLockedSubstats, getArtifactUpgradeCost, MAX_ARTIFACT_LEVEL,
} from '@/data/artifacts';
import StarDisplay from '@/components/game/StarDisplay';
import SlotIcon from '@/components/game/SlotIcon';
import ArtifactIcon from '@/components/game/ArtifactIcon';
import SetIcon from '@/components/game/SetIcon';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function HeroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { player, addToSquad, removeFromSquad, getHeroArtifacts, getUnequippedArtifacts, equipArtifact, unequipArtifact, upgradeArtifact, getEffectiveStats, toggleHeroLock } = useGame();

  const [slotPicker, setSlotPicker] = useState<ArtifactSlot | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);

  const isReadOnly = id?.startsWith('champion-');
  const championId = isReadOnly ? id.replace('champion-', '') : null;

  const pc = !isReadOnly ? player.champions.find(c => c.id === id) : null;
  const champion = isReadOnly
    ? CHAMPIONS.find(c => c.id === championId)
    : pc?.champion;

  if (!champion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Герой не найден</p>
      </div>
    );
  }

  const inSquad = pc ? player.squad.includes(pc.id) : false;
  const level = pc?.level ?? 1;
  const stars = pc?.stars ?? 0;

  const effectiveBaseStats = pc ? getEffectiveStats(pc) : champion.baseStats;
  const equippedArtifacts = pc ? getHeroArtifacts(pc.id) : [];
  const artifactBonusStats = calculateArtifactStats(equippedArtifacts, effectiveBaseStats);
  const activeBonuses = getActiveSetBonuses(equippedArtifacts);

  const totalStats = Object.entries(effectiveBaseStats).map(([key, base]) => {
    const bonus = artifactBonusStats[key as keyof typeof artifactBonusStats] ?? 0;
    const rawBase = champion.baseStats[key as keyof typeof champion.baseStats];
    return { key, base, rawBase, bonus, total: base + bonus };
  });

  const getEquippedInSlot = (slot: ArtifactSlot): Artifact | undefined =>
    equippedArtifacts.find(a => a.slot === slot);

  const availableForSlot = slotPicker ? getUnequippedArtifacts(slotPicker) : [];

  const handleSlotClick = (slot: ArtifactSlot) => {
    const equipped = getEquippedInSlot(slot);
    if (!canEquipSlot(slot, stars)) {
      const req = ACCESSORY_STAR_REQUIREMENTS[slot];
      toast.error(`Требуется ${req}★ для экипировки ${SLOT_LABELS[slot]}`);
      return;
    }
    if (equipped) {
      setViewingArtifact(equipped);
    } else {
      setSlotPicker(slotPicker === slot ? null : slot);
    }
  };

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Hero image header */}
        <div className="relative h-56 sm:h-80 overflow-hidden">
          <img src={champion.imageUrl} alt={champion.name} className="w-full h-full object-cover hero-image-filter" />
          <MythicOverlay element={champion.element} rarity={champion.rarity} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />
          
          <div className="absolute top-3 left-3 right-3 flex justify-between z-20">
            <button onClick={() => navigate(-1)} className="bg-background/70 backdrop-blur-sm px-3 py-1.5 rounded-lg font-kelly text-foreground hover:bg-background/90 transition-colors text-sm min-h-[44px]">
              ← Назад
            </button>
            <button onClick={() => navigate(`/compare?hero=${champion.id}`)} className="bg-background/70 backdrop-blur-sm px-3 py-1.5 rounded-lg font-kelly text-primary hover:bg-background/90 transition-colors text-sm min-h-[44px]">
              <img src="/ui/icon_compare.png" alt="" className="w-4 h-4 inline-block" /> Сравнить
            </button>
          </div>

          <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
            <h1 className="text-2xl sm:text-3xl font-kelly text-foreground">{champion.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs sm:text-sm">{ELEMENT_ICONS[champion.element]} {champion.element}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{champion.faction}</span>
              <span className="text-xs sm:text-sm text-primary">{champion.rarity}</span>
            </div>
            <StarDisplay stars={stars} size="md" className="mt-1" />
          </div>

          <div className="absolute bottom-3 right-3 bg-background/70 backdrop-blur-sm px-2 py-1 rounded-lg z-20 pointer-events-none">
            <span className="font-mono text-primary text-sm">Ур. {level}</span>
          </div>
        </div>

        <div className="px-3 sm:px-4 pt-3">
          {/* Description */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground font-spectral italic mb-6">
            «{champion.description}»
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface/60 rounded-xl p-3 sm:p-4 card-lubok mb-4 sm:mb-6">
            <h3 className="font-kelly text-foreground mb-2 text-sm sm:text-base">Характеристики</h3>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {totalStats.map(({ key, base, rawBase, bonus, total }) => (
                <div key={key} className="text-center bg-background/40 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground uppercase">{getStatLabel(key)}</div>
                  <div className="font-mono text-lg text-foreground">{total}</div>
                  {base !== rawBase && (
                    <div className="font-mono text-[10px] text-primary">★+{base - rawBase}</div>
                  )}
                  {bonus > 0 && (
                    <div className="font-mono text-xs text-accent">+{bonus}</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Artifact slots — 9 slots with star-gated accessories */}
          {pc && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
              <h3 className="font-kelly text-foreground mb-3">Снаряжение</h3>
              <div className="grid grid-cols-3 gap-3">
                {ALL_SLOTS.map(slot => {
                  const equipped = getEquippedInSlot(slot);
                  const isLocked = !canEquipSlot(slot, stars);
                  const starReq = ACCESSORY_STAR_REQUIREMENTS[slot];

                  return (
                    <div
                      key={slot}
                      onClick={() => handleSlotClick(slot)}
                      className={`relative rounded-xl p-3 card-lubok cursor-pointer transition-all hover:brightness-110 ${
                        slotPicker === slot ? 'ring-2 ring-primary' : ''
                      } ${isLocked ? 'opacity-50' : ''}`}
                      style={equipped ? {
                        background: ARTIFACT_RARITY_BG[equipped.rarity],
                        border: `${ARTIFACT_RARITY_BORDER_WIDTH[equipped.rarity]}px solid ${ARTIFACT_RARITY_COLORS[equipped.rarity]}`,
                        boxShadow: ARTIFACT_RARITY_GLOW[equipped.rarity],
                      } : { background: 'hsl(var(--surface) / 0.4)', border: '1px solid hsl(var(--border) / 0.2)' }}
                    >
                      {/* Locked overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-background/60 rounded-xl flex items-center justify-center z-10">
                          <div className="text-center">
                            <div className="text-xl">🔒</div>
                            <div className="text-xs font-kelly text-muted-foreground">
                              Требуется {starReq}★
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-center flex flex-col items-center">
                        {equipped ? <ArtifactIcon slot={slot} set={equipped.set} size={44} /> : <SlotIcon slot={slot} size={44} />}
                        <div className="text-[10px] text-muted-foreground font-kelly mt-1">{SLOT_LABELS[slot]}</div>
                      </div>

                      {equipped ? (
                        <div className="mt-1.5 text-center">
                          <div className="text-xs font-kelly text-foreground truncate">{equipped.name}</div>
                          <div className="flex items-center justify-center gap-px mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-[7px]" style={{ color: i < equipped.stars ? ARTIFACT_RARITY_COLORS[equipped.rarity] : 'hsl(var(--muted-foreground) / 0.25)' }}>★</span>
                            ))}
                            {equipped.level > 0 && <span className="text-[9px] text-muted-foreground ml-0.5">+{equipped.level}</span>}
                          </div>
                          <div className="text-[9px] font-kelly mt-0.5" style={{ color: ARTIFACT_RARITY_COLORS[equipped.rarity] }}>
                            {equipped.rarity}
                          </div>
                          <div className="text-xs font-mono text-primary font-bold">
                            +{formatStatValue(equipped.primaryValue, equipped.primaryType)} {STAT_LABELS[equipped.primaryStat]}
                          </div>
                          {(() => {
                            const unlocked = getUnlockedSubstats(equipped);
                            return unlocked.length > 0 ? (
                              <div className="mt-0.5 space-y-0">
                                {unlocked.map((s, i) => (
                                  <div key={i} className="text-[8px] font-mono text-foreground/60">+{formatStatValue(s.value, s.type)} {STAT_LABELS[s.stat]}</div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                          <button
                            onClick={(e) => { e.stopPropagation(); unequipArtifact(pc.id, equipped.id); }}
                            className="mt-1 text-[10px] text-accent hover:text-accent/80 font-kelly"
                          >Снять</button>
                        </div>
                      ) : (
                        <div className="mt-2 text-center"><div className="text-xs text-muted-foreground">Пусто</div></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Slot picker */}
              <AnimatePresence>
                {slotPicker && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 bg-surface/60 rounded-xl p-4 card-lubok">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-kelly text-foreground text-sm flex items-center gap-1"><SlotIcon slot={slotPicker} size={20} /> Выбери {SLOT_LABELS[slotPicker].toLowerCase()}</h4>
                        <button onClick={() => setSlotPicker(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                      {availableForSlot.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет доступных артефактов для этого слота</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {availableForSlot.map(art => {
                            const unlocked = getUnlockedSubstats(art);
                            const locked = getLockedSubstats(art);
                            return (
                              <button
                                key={art.id}
                                onClick={() => { equipArtifact(pc.id, art.id); setSlotPicker(null); }}
                                className="rounded-lg p-2 text-left hover:brightness-110"
                                style={{
                                  background: ARTIFACT_RARITY_BG[art.rarity],
                                  border: `${ARTIFACT_RARITY_BORDER_WIDTH[art.rarity]}px solid ${ARTIFACT_RARITY_COLORS[art.rarity]}`,
                                  boxShadow: ARTIFACT_RARITY_GLOW[art.rarity],
                                }}
                              >
                                <div className="text-xs font-kelly text-foreground truncate">{art.name}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5"><SetIcon set={art.set} size={12} /> {art.set}</div>
                                <div className="flex items-center gap-px mt-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className="text-[7px]" style={{ color: i < art.stars ? ARTIFACT_RARITY_COLORS[art.rarity] : 'hsl(var(--muted-foreground) / 0.25)' }}>★</span>
                                  ))}
                                  {art.level > 0 && <span className="text-[9px] text-muted-foreground ml-0.5">+{art.level}</span>}
                                </div>
                                <div className="text-xs font-mono text-primary font-bold mt-0.5">
                                  +{formatStatValue(art.primaryValue, art.primaryType)} {STAT_LABELS[art.primaryStat]}
                                </div>
                                {unlocked.length > 0 && (
                                  <div className="mt-0.5">
                                    {unlocked.map((s, i) => (
                                      <div key={i} className="text-[8px] font-mono text-foreground/60">+{formatStatValue(s.value, s.type)} {STAT_LABELS[s.stat]}</div>
                                    ))}
                                  </div>
                                )}
                                {locked.length > 0 && (
                                  <div className="mt-0.5">
                                    {locked.map((s, i) => (
                                      <div key={i} className="text-[8px] font-mono text-muted-foreground/40">🔒 ур.{s.unlockLevel}</div>
                                    ))}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active set bonuses */}
              {activeBonuses.length > 0 && (
                <div className="mt-4 bg-primary/10 rounded-xl p-3 border border-primary/20">
                  <h4 className="font-kelly text-primary text-sm mb-2">✨ Бонусы сетов</h4>
                  {activeBonuses.map(({ set, bonus }, i) => (
                    <div key={i} className="text-xs text-foreground">
                      <SetIcon set={set} size={12} /> {set} ({bonus.pieces}шт): {bonus.label}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Skills */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
            <h3 className="font-kelly text-foreground mb-3">Навыки</h3>
            <div className="space-y-3">
              {champion.skills.map((skill, i) => {
                const SKILL_TYPE_LABELS: Record<Skill['type'], string> = {
                  damage: '⚔️ Урон', buff: '✨ Бафф', debuff: '💀 Дебафф', heal: '💚 Лечение',
                  aoe: '🌊 АОЕ', control: '🔒 Контроль', special: '⭐ Особый', passive: '🔄 Пассив',
                };
                const SKILL_TYPE_COLORS: Record<Skill['type'], string> = {
                  damage: 'text-red-400', buff: 'text-emerald-400', debuff: 'text-purple-400', heal: 'text-green-400',
                  aoe: 'text-orange-400', control: 'text-cyan-400', special: 'text-yellow-400', passive: 'text-blue-400',
                };
                return (
                  <div key={i} className="bg-surface/60 rounded-xl p-4 card-lubok border border-border/20">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-kelly text-sm text-foreground">{skill.name}</span>
                        <span className={`text-xs font-kelly ${SKILL_TYPE_COLORS[skill.type]}`}>{SKILL_TYPE_LABELS[skill.type]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {skill.power > 0 && <span>⚔️ {(skill.power * 100).toFixed(0)}%</span>}
                        <span>{skill.cooldown === 0 ? '♾️ Авто' : `⏱ ${skill.cooldown} ход.`}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-spectral mb-2">{skill.description}</p>
                    {skill.effects && skill.effects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {skill.effects.map((eff, eIdx) => (
                          <span key={eIdx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/40 border border-border/20 text-[10px]">
                            <EffectIcon type={eff.type} size={12} />
                            <span className="text-muted-foreground">{EFFECT_NAMES[eff.type] || eff.type}</span>
                            {eff.value != null && <span className="text-foreground">{eff.value}%</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Tavern button */}
          {!isReadOnly && pc && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-4">
              <button
                onClick={() => navigate(`/tavern/${pc.id}`)}
                className="w-full py-3 rounded-xl font-kelly text-lg transition-all bg-amber-900/40 hover:bg-amber-900/60 text-amber-200 border border-amber-700/40 hover:border-amber-600/60"
              >
                🍺 Трактир
              </button>
            </motion.div>
          )}

          {/* Squad toggle */}
          {!isReadOnly && pc && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex gap-2">
              <button
                onClick={() => toggleHeroLock(pc.id)}
                className={`py-3 px-4 rounded-xl font-kelly text-lg transition-all border flex items-center gap-1 ${
                  pc.locked
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-surface/40 border-border/30 text-muted-foreground'
                }`}
              >
                {pc.locked ? <Lock size={20} /> : <Unlock size={20} />}
              </button>
              <button
                onClick={() => inSquad ? removeFromSquad(pc.id) : addToSquad(pc.id)}
                disabled={!inSquad && player.squad.length >= 4}
                className={`flex-1 py-3 rounded-xl font-kelly text-lg transition-all ${
                  inSquad
                    ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40'
                }`}
              >
                {inSquad ? 'Убрать из отряда' : 'Добавить в отряд'}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Artifact detail dialog */}
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
                  {pc && (
                    <button
                      onClick={() => {
                        unequipArtifact(pc.id, art.id);
                        setViewingArtifact(null);
                      }}
                      className="flex-1 py-2 rounded-lg bg-accent/20 text-accent border border-accent/30 font-kelly text-xs"
                    >✕ Снять</button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
