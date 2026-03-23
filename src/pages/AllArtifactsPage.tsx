import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ALL_SLOTS, ALL_SETS, ALL_ARTIFACT_RARITIES,
  SLOT_LABELS, SET_ICONS, SET_BONUSES,
  SLOT_PRIMARY_OPTIONS, ACCESSORY_STAR_REQUIREMENTS,
  type ArtifactSlot, type ArtifactSet, type ArtifactRarity,
  STAT_LABELS, ARTIFACT_STAR_MULTIPLIERS, MAX_ARTIFACT_STARS,
  BASE_PRIMARY_FLAT, BASE_PRIMARY_PERCENT,
  RARITY_MULT, getArtifactImageUrl,
} from '@/data/artifacts';
import SlotIcon from '@/components/game/SlotIcon';
import SetIcon from '@/components/game/SetIcon';
import StarDisplay from '@/components/game/StarDisplay';

export default function AllArtifactsPage() {
  const navigate = useNavigate();
  const [expandedSet, setExpandedSet] = useState<ArtifactSet | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<ArtifactSlot | null>(null);

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">←</button>
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow">
            Справочник артефактов
          </motion.h1>
        </div>
        <p className="text-center text-muted-foreground text-sm mb-4">
          {ALL_SLOTS.length} слотов · {ALL_SETS.length} сетов · 5 редкостей
        </p>

        {/* Slots reference */}
        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-kelly text-foreground mb-2">📋 Слоты и статы</h2>
          <div className="space-y-1.5">
            {ALL_SLOTS.map(slot => {
              const starReq = ACCESSORY_STAR_REQUIREMENTS[slot];
              return (
                <div key={slot} className="bg-surface/40 border border-border/30 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSlot(expandedSlot === slot ? null : slot)}
                    className="w-full flex items-center justify-between px-3 py-2.5 font-kelly text-foreground hover:bg-surface/60 transition-colors text-sm min-h-[44px]"
                  >
                    <span className="flex items-center gap-1">
                      <SlotIcon slot={slot} size={18} /> {SLOT_LABELS[slot]}
                      {starReq && <span className="text-primary ml-1 text-xs">({starReq}★)</span>}
                    </span>
                    <span className="text-muted-foreground text-xs">{expandedSlot === slot ? '▲' : '▼'}</span>
                  </button>
                  <AnimatePresence>
                    {expandedSlot === slot && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-2.5 space-y-0.5">
                          <div className="text-[10px] text-muted-foreground mb-1">Основные статы:</div>
                          {SLOT_PRIMARY_OPTIONS[slot].map((opt, i) => (
                            <div key={i} className="text-xs text-foreground">
                              <span className="text-primary font-kelly">{STAT_LABELS[opt.stat]}</span>
                              <span className="text-muted-foreground ml-1">({opt.type === 'percent' ? '%' : 'плоский'})</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Set bonuses */}
        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-kelly text-foreground mb-2">✨ Бонусы сетов</h2>
          <div className="space-y-1.5">
            {ALL_SETS.map(set => (
              <div key={set} className="bg-surface/40 border border-border/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSet(expandedSet === set ? null : set)}
                  className="w-full flex items-center justify-between px-3 py-2.5 font-kelly text-foreground hover:bg-surface/60 transition-colors text-sm min-h-[44px]"
                >
                  <span className="flex items-center gap-2">
                    <SetIcon set={set} size={28} className="rounded" />
                    <span>{set}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{expandedSet === set ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {expandedSet === set && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2">
                        {SET_BONUSES[set].map(b => (
                          <div key={b.pieces} className="flex items-center gap-1.5 text-xs">
                            <span className="text-primary font-kelly w-5">{b.pieces}×</span>
                            <span className="text-foreground">{b.label}</span>
                          </div>
                        ))}
                        <div className="pt-1.5 border-t border-border/20">
                          <div className="text-[10px] text-muted-foreground mb-1.5 font-kelly">Экипировка сета:</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {ALL_SLOTS.map(slot => (
                              <div key={slot} className="flex items-center gap-1.5 bg-background/40 rounded-lg p-1.5">
                                <img
                                  src={getArtifactImageUrl(slot, set)}
                                  alt={`${set} ${SLOT_LABELS[slot]}`}
                                  className="w-8 h-8 object-contain rounded"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="text-[10px] text-muted-foreground font-kelly truncate">{SLOT_LABELS[slot]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Star scaling */}
        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-kelly text-foreground mb-2">⭐ Звёзды артефактов</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Каждый артефакт имеет уровень звёзд (1-5★), который умножает основную характеристику.
          </p>
          <div className="overflow-x-auto -mx-3 px-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-1.5 px-2 text-muted-foreground font-kelly">Слот / Редкость</th>
                  {Array.from({ length: MAX_ARTIFACT_STARS }).map((_, s) => (
                    <th key={s} className="text-center py-1.5 px-1 text-primary font-kelly">
                      {s + 1}★
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_SLOTS.slice(0, 6).map(slot => {
                  const primaryOpt = SLOT_PRIMARY_OPTIONS[slot][0]; // main fixed stat
                  const baseStat = primaryOpt.type === 'percent' ? BASE_PRIMARY_PERCENT[primaryOpt.stat] : BASE_PRIMARY_FLAT[primaryOpt.stat];
                  return ALL_ARTIFACT_RARITIES.map(rarity => {
                    const rarMult = RARITY_MULT[rarity];
                    return (
                      <tr key={`${slot}-${rarity}`} className="border-b border-border/10">
                        <td className="py-1 px-2 text-foreground font-kelly whitespace-nowrap">
                          <SlotIcon slot={slot} size={14} className="inline mr-1" />
                          {SLOT_LABELS[slot]} <span className="text-muted-foreground">({rarity})</span>
                        </td>
                        {Array.from({ length: MAX_ARTIFACT_STARS }).map((_, s) => {
                          const starMult = ARTIFACT_STAR_MULTIPLIERS[s + 1];
                          const val = Math.floor(baseStat * rarMult * starMult);
                          return (
                            <td key={s} className="text-center py-1 px-1 font-mono text-foreground">
                              +{val} {STAT_LABELS[primaryOpt.stat]}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rarity info */}
        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-kelly text-foreground mb-2">💎 Редкости</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {ALL_ARTIFACT_RARITIES.map((r, idx) => (
              <div key={r} className="bg-surface/40 border border-border/30 rounded-xl p-3">
                <h3 className="font-kelly text-foreground text-sm">{r}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Субстатов: <span className="text-primary font-mono">{idx}</span>
                </p>
                {idx > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Разблок.: {[5, 10, 15, 20].slice(0, idx).join(', ')} ур.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
