import { useState, useEffect, useCallback, useRef } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateDamage, getFrostMorenaBonus, getDrenosIndrikBonus, type CombatResult } from '@/utils/combat';
import { chooseTarget, chooseSkill, updateCooldowns, applyCooldown, type BattleUnit } from '@/ai/enemyAI';
import { tickToNextTurn, predictTurnOrder, boostTurnMeter, reduceTurnMeter, TM_THRESHOLD } from '@/utils/turnMeter';
import { calculateRewards, type BattleRewards } from '@/utils/rewards';
import { ELEMENT_ICONS, CHAMPIONS } from '@/data/gameData';
import { ARENA_WIN_RATING, ARENA_LOSS_RATING, getRankFromRating as getArenaRank } from '@/data/arenaData';
import { calculateArtifactStats, SLOT_LABELS, STAT_LABELS } from '@/data/artifacts';
import iconSouls from '@/assets/icons/icon_souls.png';
import { applyEffect, processEffects, isCC, cleanse, applyDamageWithShield, tickCCEffects, hasEffect, getStatMultiplier, getHealMultiplier, findAllyProtector } from '@/utils/effects';
import { EFFECT_ICONS, EFFECT_NAMES, isBuffType, isDebuffType } from '@/types/game';
import EffectIcon from '@/components/game/EffectIcon';
import BattleParticles from '@/components/game/BattleParticles';
import AttackEffect from '@/components/game/AttackEffect';
import MythicOverlay from '@/components/game/MythicOverlay';
import HydraHeadsPanel from '@/components/game/HydraHeadsPanel';
import XpDisplay from '@/components/game/XpDisplay';
import SoulDisplay from '@/components/game/SoulDisplay';
import RuneDisplay from '@/components/game/RuneDisplay';
import type { EffectApplication, StatusEffect } from '@/types/game';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { calculateBattleStars, type StarCondition, WAVES_PER_STAGE } from '@/data/campaignStages';
import { type AbyssDifficulty, getBossForFloor, getFloorRewards, refreshKeysIfNeeded, SECRET_ROOMS, generateAbyssBossDrop, getSecretRoomSetReward } from '@/data/abyssData';
import { generateArtifact, ALL_SLOTS } from '@/data/artifacts';
import { generateCampaignArtifacts } from '@/data/campaignDrops';
import type { CampaignModifiers } from '@/data/campaignModifiers';
import { HYDRA_BOSS, getBossSkillForRound, getScaledBossStats, BASE_ATTACK_REWARD, getWorldBossModifiers } from '@/data/worldBoss';
import { CERBERUS_BOSS, getCerberusSkillForRound, getScaledCerberusStats, CERBERUS_REBIRTH_ATK, CERBERUS_REBIRTH_HP, CERBERUS_REBIRTH_SPD } from '@/data/worldBossCerberus';
import { TEMPLES, rollRuneReward, getTempleFloorModifiers } from '@/data/templeData';
import bgBattle from '@/assets/bg-battle.jpg';
import {
  type HydraSwallowState,
  createInitialSwallowState,
  initializeMark,
  tickSwallowMechanic,
  addRescueDamage,
  applySwallowToUnits,
  restoreRescuedHero,
} from '@/utils/hydraSwallow';
import {
  type HydraHeadsState,
  createHydraHeadsState,
  getActiveHeads,
  isHeadBuffActive,
  distributeHeadDamage,
  applyLifeBarrier,
  getPoisonCloudDamage,
  tickHeadRegrowth,
  tickHeadAbilities,
  ALL_HYDRA_HEADS,
  HYDRA_HEADS,
  HYDRA_ROUND_ATK_SCALE,
} from '@/data/hydraHeads';
import TutorialGlow from '@/components/game/TutorialGlow';
import {
  createHydraHeadChampions,
  pickStartingHeads,
  HYDRA_ROUND_ATK_ESCALATION,
  HYDRA_ROUND_HP_ESCALATION,
  HYDRA_ROUND_SPD_ESCALATION,
  ACTIVE_HEADS_COUNT,
} from '@/data/hydraHeads';

/* ─── sub-components ─── */

interface BattleLogEntry {
  id: number;
  message: string;
  type: 'normal' | 'crit' | 'miss' | 'advantage' | 'heal' | 'buff' | 'debuff' | 'dot';
}

/** Per-unit combat statistics tracked during battle */
interface CombatStats {
  damageDealt: number;
  healingDone: number;
  damageTaken: number;
  damageBlocked: number; // shields, block, unkillable prevention
}

const LOG_COLORS: Record<BattleLogEntry['type'], string> = {
  normal: 'text-muted-foreground',
  crit: 'text-primary',
  miss: 'text-muted-foreground/60',
  advantage: 'text-accent',
  heal: 'text-green-400',
  buff: 'text-primary',
  debuff: 'text-accent',
  dot: 'text-orange-400',
};

function EffectBadges({ effects }: { effects: StatusEffect[] }) {
  if (effects.length === 0) return null;
  // Group by type
  const grouped = effects.reduce<Record<string, StatusEffect[]>>((acc, eff) => {
    (acc[eff.type] ??= []).push(eff);
    return acc;
  }, {});
  return (
    <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
      {Object.entries(grouped).map(([type, effs]) => {
        const representative = effs[0];
        const count = effs.length;
        const maxDuration = Math.max(...effs.map(e => e.duration));
        const totalValue = effs.reduce((s, e) => s + e.value, 0);
        return (
          <Popover key={type}>
            <PopoverTrigger asChild>
              <button
                className={`text-xs px-1 rounded inline-flex items-center gap-0.5 ${
                  isBuffType(representative.type)
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-accent/20 border border-accent/30'
                }`}
              >
                <EffectIcon type={representative.type} size={14} />
                {count > 1 && <span className="text-[10px] font-bold">x{count}</span>}
                <span className="text-[10px] ml-0.5">{maxDuration}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto min-w-[120px] p-2 text-xs">
              <div className="font-kelly">{EFFECT_NAMES[representative.type]}</div>
              {count > 1 && <div className="text-primary font-bold">x{count} стаков</div>}
              {totalValue > 0 && <div>Итого: {Math.round(totalValue)}%</div>}
              <div>{maxDuration} ход(а)</div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

function TurnBar({ turnOrder, units, currentTurnIndex }: {
  turnOrder: number[]; units: BattleUnit[]; currentTurnIndex: number;
}) {
  return (
    <DragScroll
      className="flex gap-1 sm:gap-2 pb-1 mb-2 sm:mb-4 -mx-1 px-1"
    >
      {turnOrder.map((idx, ti) => {
        const u = units[idx];
        if (!u || u.currentHp <= 0) return null;
        const isCurrent = ti === currentTurnIndex;
        const stunned = isCC(u);
        return (
          <div
            key={u.id}
            className={`flex-shrink-0 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[10px] sm:text-xs font-kelly transition-all ${
              isCurrent ? 'bg-primary text-primary-foreground scale-105' : 'bg-surface text-surface-foreground'
            } ${u.isEnemy ? 'border border-accent/30' : 'border border-primary/30'}
            ${stunned ? 'opacity-50' : ''}`}
          >
            {ELEMENT_ICONS[u.champion.element]} {u.champion.name.split(' ')[0]}
            {stunned && <span className="ml-1">⭐</span>}
          </div>
        );
      })}
    </DragScroll>
  );
}

interface FloatingNumber {
  id: string;
  value: number;
  type: 'damage' | 'crit' | 'heal' | 'miss' | 'resist' | 'glancing';
}

function UnitCard({ u, isTargetable, isActive, visualEffects, floatingNumbers, isWorldBoss, hydraMarkCountdown, isSwallowed, onClick }: {
  u: BattleUnit;
  isTargetable?: boolean;
  isActive?: boolean;
  visualEffects: Record<string, boolean>;
  floatingNumbers?: FloatingNumber[];
  isWorldBoss?: boolean;
  hydraMarkCountdown?: number | null;
  isSwallowed?: boolean;
  onClick?: () => void;
}) {
  const isHit = visualEffects[`hit-${u.id}`];
  const isCritHit = visualEffects[`crit-${u.id}`];
  const stunned = isCC(u);
  const hasUnkillable = hasEffect(u, 'unkillable');
  const hasBlockDamage = hasEffect(u, 'block_damage');
  const hasVeil = hasEffect(u, 'veil');
  const hasWeaken = hasEffect(u, 'weaken');
  const hasBlockDebuffs = hasEffect(u, 'block_debuffs');
  const hasFear = hasEffect(u, 'fear');
  const hasBomb = hasEffect(u, 'bomb');
  const hasFreeze = hasEffect(u, 'freeze');
  const hasSleep = hasEffect(u, 'sleep');
  const hasCounterattack = hasEffect(u, 'counterattack');
  const hasReflectDamage = hasEffect(u, 'reflect_damage');
  const hasAllyProtection = hasEffect(u, 'ally_protection');
  const hasHealReduction = hasEffect(u, 'heal_reduction');
  const hpPercent = (u.currentHp / u.maxHp) * 100;
  const effectType = isCritHit ? 'crit' : isHit ? 'hit' : null;

  return (
    <motion.div
      animate={{
        opacity: u.currentHp > 0 ? (hasVeil ? 0.5 : 1) : 0.3,
        scale: isActive ? 1.06 : 1,
      }}
      onClick={onClick}
      className={`relative bg-surface/70 backdrop-blur-sm rounded-lg sm:rounded-xl p-1 sm:p-1.5 card-lubok transition-all ${
        isTargetable ? 'ring-2 ring-accent hover:ring-accent/80 cursor-crosshair' : ''
      } ${stunned ? 'grayscale-[40%]' : ''}`}
    >
      {/* Attack visual effect overlay */}
      {effectType && (
        <AttackEffect
          unitId={u.id}
          active={true}
          type={effectType}
          element={u.champion.element}
        />
      )}

      {/* Unkillable golden glow */}
      {hasUnkillable && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(45 100% 55%)',
            boxShadow: '0 0 12px 3px hsl(45 100% 50% / 0.5), inset 0 0 8px hsl(45 100% 60% / 0.2)',
          }}
        />
      )}

      {/* Block Damage blue glow */}
      {hasBlockDamage && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(210 100% 60%)',
            boxShadow: '0 0 14px 4px hsl(210 100% 55% / 0.5), inset 0 0 10px hsl(210 100% 65% / 0.2)',
          }}
        />
      )}

      {/* Weaken red glow */}
      {hasWeaken && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(0 85% 50%)',
            boxShadow: '0 0 12px 3px hsl(0 85% 45% / 0.5), inset 0 0 8px hsl(0 85% 55% / 0.2)',
          }}
        />
      )}

      {/* Block Debuffs green glow */}
      {hasBlockDebuffs && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(140 70% 45%)',
            boxShadow: '0 0 12px 3px hsl(140 70% 40% / 0.5), inset 0 0 8px hsl(140 70% 50% / 0.2)',
          }}
        />
      )}

      {/* Fear purple glow */}
      {hasFear && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(270 80% 55%)',
            boxShadow: '0 0 14px 4px hsl(270 80% 50% / 0.5), inset 0 0 8px hsl(270 80% 60% / 0.2)',
          }}
        />
      )}

      {/* Bomb orange glow */}
      {hasBomb && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(25 95% 55%)',
            boxShadow: '0 0 14px 4px hsl(25 95% 50% / 0.5), inset 0 0 8px hsl(25 95% 60% / 0.2)',
          }}
        />
      )}

      {/* Freeze icy glow */}
      {hasFreeze && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(195 100% 70%)',
            boxShadow: '0 0 16px 5px hsl(195 100% 65% / 0.5), inset 0 0 10px hsl(195 100% 75% / 0.25)',
          }}
        />
      )}

      {/* Sleep pink glow */}
      {hasSleep && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(320 70% 65%)',
            boxShadow: '0 0 12px 3px hsl(320 70% 60% / 0.45), inset 0 0 8px hsl(320 70% 70% / 0.2)',
          }}
        />
      )}

      {/* Counterattack yellow glow */}
      {hasCounterattack && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(50 95% 55%)',
            boxShadow: '0 0 12px 3px hsl(50 95% 50% / 0.5), inset 0 0 8px hsl(50 95% 60% / 0.2)',
          }}
        />
      )}

      {/* Reflect Damage mirror shimmer */}
      {hasReflectDamage && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(190 40% 75%)',
            boxShadow: '0 0 14px 4px hsl(190 40% 70% / 0.4), inset 0 0 10px hsl(190 40% 80% / 0.25)',
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, hsl(190 50% 85% / 0.3) 45%, hsl(190 50% 85% / 0.15) 55%, transparent 60%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Ally Protection white glow */}
      {hasAllyProtection && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(0 0% 85%)',
            boxShadow: '0 0 14px 4px hsl(0 0% 80% / 0.45), inset 0 0 10px hsl(0 0% 90% / 0.2)',
          }}
        />
      )}

      {/* Heal Reduction dark red pulsing border */}
      {hasHealReduction && u.currentHp > 0 && (
        <motion.div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl z-[4]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: '2px solid hsl(350 75% 40%)',
            boxShadow: '0 0 10px 2px hsl(350 75% 35% / 0.4), inset 0 0 6px hsl(350 75% 45% / 0.2)',
          }}
        />
      )}

      {isActive && u.currentHp > 0 && (
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-lg sm:rounded-xl border-2 border-primary animate-pulse-glow z-[5]"
          style={{ boxShadow: '0 0 0 1px hsl(var(--primary) / 0.9), 0 0 24px hsl(var(--primary) / 0.5)' }}
        />
      )}

      <div className={`relative ${isWorldBoss ? 'aspect-[16/7]' : 'aspect-[3/4]'} overflow-hidden rounded-md sm:rounded-lg`}>
        <img
          src={u.champion.imageUrl}
          alt={u.champion.name}
          className={`w-full h-full ${isWorldBoss ? 'object-contain bg-black/50' : 'object-cover object-top'} hero-image-filter`}
          loading="lazy"
        />
        {/* Rarity overlay — all heroes, scaled by tier */}
        <MythicOverlay element={u.champion.element} rarity={u.champion.rarity} compact />
        <span className="absolute top-0.5 right-0.5 text-sm sm:text-base bg-background/60 rounded px-0.5 leading-none">
          {ELEMENT_ICONS[u.champion.element]}
        </span>
      </div>
      <div className="mt-0.5 text-[10px] sm:text-xs font-kelly text-center truncate">{u.champion.name}</div>
      <div className="w-full h-1.5 sm:h-2 bg-muted rounded-full mt-0.5 overflow-hidden">
        <motion.div
          className="h-full blood-gauge rounded-full"
          animate={{ width: `${hpPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="text-center font-mono text-[9px] sm:text-[11px] text-muted-foreground">
        {u.currentHp}/{u.maxHp}
      </div>

      {/* Turn Meter bar */}
      {u.currentHp > 0 && (
        <div className="w-full h-[3px] bg-muted/30 rounded-full mt-0.5 overflow-hidden" title={`Шкала хода: ${Math.round(((u.turnMeter ?? 0) / TM_THRESHOLD) * 100)}%`}>
          <motion.div
            className="h-full bg-sky-400/80 rounded-full"
            animate={{ width: `${Math.min(100, ((u.turnMeter ?? 0) / TM_THRESHOLD) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <EffectBadges effects={u.effects} />

      {/* Hydra Mark indicator */}
      {hydraMarkCountdown != null && u.currentHp > 0 && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-[6] flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <span className="bg-accent/90 text-accent-foreground text-[9px] font-kelly px-1.5 py-0.5 rounded-b-lg flex items-center gap-0.5">
            🐍 {hydraMarkCountdown}
          </span>
        </motion.div>
      )}

      {/* Swallowed overlay */}
      {isSwallowed && (
        <motion.div
          className="absolute inset-0 z-[7] rounded-lg sm:rounded-xl flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ background: 'hsl(var(--destructive) / 0.6)' }}
        >
          <span className="text-2xl">🐍</span>
        </motion.div>
      )}

      {/* Floating damage / heal numbers */}
      <AnimatePresence>
        {floatingNumbers?.map(fn => (
          <motion.span
            key={fn.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -50, scale: fn.type === 'crit' ? 1.6 : 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className={`absolute top-1/4 left-1/2 -translate-x-1/2 font-kelly text-base sm:text-xl pointer-events-none z-20 whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
              fn.type === 'heal' ? 'text-green-400' :
              fn.type === 'crit' ? 'text-primary font-bold' :
              fn.type === 'miss' ? 'text-muted-foreground italic' :
              fn.type === 'resist' ? 'text-blue-400 font-bold' :
              fn.type === 'glancing' ? 'text-yellow-400 italic' :
              'text-accent'
            }`}
          >
            {fn.type === 'miss' ? 'ПРОМАХ' :
             fn.type === 'resist' ? '🛡️ СОПРОТИВЛЕНИЕ' :
             fn.type === 'glancing' ? '⚡ СЛАБЫЙ УДАР' :
             fn.type === 'heal' ? `+${fn.value}` : `-${fn.value}`}
          </motion.span>
        ))}
        {stunned && u.currentHp > 0 && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl z-20">⭐</motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SkillPanel({ currentUnit, selectedSkill, onSelect, onSkip }: {
  currentUnit: BattleUnit;
  selectedSkill: number | null;
  onSelect: (i: number) => void;
  onSkip: () => void;
}) {
  const stunned = isCC(currentUnit);
  const selectedSkillDef = selectedSkill !== null ? currentUnit.champion.skills[selectedSkill] : null;
  const needsAllyTarget = selectedSkillDef?.effects?.some(e => e.target === 'ally') ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface/80 backdrop-blur-sm rounded-xl p-2 sm:p-3 card-lubok"
    >
      <div className="text-[10px] sm:text-xs font-kelly text-muted-foreground mb-1">
        {ELEMENT_ICONS[currentUnit.champion.element]} Ход: {currentUnit.champion.name}
        {stunned && <span className="text-accent ml-2">⭐ Оглушён!</span>}
        {selectedSkill !== null && !stunned && <span className="text-accent ml-2">→ {needsAllyTarget ? 'Союзника' : 'Цель'}</span>}
      </div>
      {stunned ? (
        <div className="text-center text-muted-foreground py-2 font-kelly text-xs">Герой не может действовать!</div>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none sm:grid sm:grid-cols-3 sm:gap-1.5 sm:overflow-visible sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            {currentUnit.champion.skills.map((skill, i) => {
              const onCooldown = currentUnit.skillCooldowns[i] > 0;
              const isPassive = skill.type === 'passive';
              const hasEffects = skill.effects && skill.effects.length > 0;
              // Red star cooldown reduction for 2nd skill
              const redStars = currentUnit.redStars ?? 0;
              const baseCd = skill.cooldown;
              let reducedCd = baseCd;
              if (i === 1 && redStars >= 3) reducedCd = Math.max(1, reducedCd - 1);
              if (i === 1 && redStars >= 4) reducedCd = Math.max(1, reducedCd - 1);
              const hasCdReduction = reducedCd < baseCd;
              return (
                <button
                  key={i}
                  onClick={() => !isPassive && onSelect(i)}
                  disabled={onCooldown || isPassive}
                  className={`text-left p-1.5 rounded-lg transition-all text-xs flex-shrink-0 w-[120px] sm:w-auto min-h-[36px] ${
                    isPassive
                      ? 'bg-primary/10 border border-primary/30 cursor-default opacity-90'
                      : selectedSkill === i
                        ? 'bg-primary/20 ring-1 ring-primary'
                        : onCooldown
                          ? 'bg-secondary/30 opacity-50 cursor-not-allowed'
                          : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <div className="font-kelly text-foreground flex items-center gap-1 text-[11px]">
                    {isPassive && <span className="text-primary text-[10px]">🔄</span>}
                    {skill.name}
                  </div>
                  <div className="text-[9px] text-muted-foreground line-clamp-1">{skill.description.slice(0, 30)}…</div>
                  {isPassive && <div className="text-[9px] text-primary font-kelly">✦ Активен</div>}
                  {!isPassive && hasEffects && (
                    <div className="flex flex-wrap gap-0.5">
                      {skill.effects!.map((eff, ei) => (
                        <span key={ei} className={`text-[9px] px-0.5 rounded ${isBuffType(eff.type) ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'}`}>
                          <EffectIcon type={eff.type} size={10} />
                        </span>
                      ))}
                    </div>
                  )}
                  {!isPassive && baseCd > 0 && !onCooldown && (
                    hasCdReduction ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-[9px] text-muted-foreground flex items-center gap-0.5 cursor-help">
                              ⏱ <span className="line-through opacity-50">{baseCd}</span> <span style={{ color: '#ef4444' }}>{reducedCd} 🔥</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px] max-w-[180px]">
                            <p className="font-kelly">🔥 Вознесение</p>
                            {redStars >= 3 && <p>★3: откат -1</p>}
                            {redStars >= 4 && <p>★4: откат -1</p>}
                            <p className="text-muted-foreground">{baseCd} → {reducedCd}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div className="text-[9px] text-muted-foreground">⏱ {baseCd}</div>
                    )
                  )}
                  {onCooldown && !isPassive && <div className="text-[9px] text-accent">⏱ {currentUnit.skillCooldowns[i]}</div>}
                </button>
              );
            })}
          </div>
          <button
            onClick={onSkip}
            className="mt-1 w-full py-1.5 rounded-lg bg-muted/50 hover:bg-muted/80 text-[11px] sm:text-xs font-kelly text-muted-foreground transition-all min-h-[32px]"
          >
            ⏭️ Пропустить
          </button>
        </>
      )}
    </motion.div>
  );
}

function formatDmgShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function BattleLog({ entries, combatStats, units, defaultCollapsed = false }: { entries: BattleLogEntry[]; combatStats?: Record<string, CombatStats>; units?: BattleUnit[]; defaultCollapsed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!collapsed) ref.current?.scrollTo(0, ref.current.scrollHeight); }, [entries.length, collapsed]);

  const playerUnits = units?.filter(u => !u.isEnemy) ?? [];

  const copyLog = () => {
    let text = entries.map(e => e.message).join('\n');
    if (combatStats && playerUnits.length > 0) {
      text += '\n\n📊 Итого урона:\n';
      playerUnits.forEach(u => {
        const s = combatStats[u.id];
        if (s) text += `${u.champion.name}: ⚔️${formatDmgShort(s.damageDealt)} 💚${formatDmgShort(s.healingDone)} 💔${formatDmgShort(s.damageTaken)}\n`;
      });
    }
    navigator.clipboard.writeText(text).then(() => {
      alert('Лог скопирован!');
    });
  };

  const shown = expanded ? entries : entries.slice(-12);

  return (
    <div className="mt-2 sm:mt-4">
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => { if (collapsed) { setCollapsed(false); } else { setExpanded(!expanded); } }} className="text-[10px] text-muted-foreground hover:text-foreground">
          {collapsed ? `▶ Лог боя (${entries.length})` : expanded ? '▼ Свернуть' : `▶ Весь лог (${entries.length})`}
        </button>
        <div className="flex gap-1">
          {!collapsed && (
            <button onClick={() => { setCollapsed(true); setExpanded(false); }} className="text-[10px] px-2 py-0.5 rounded bg-muted/30 text-muted-foreground hover:text-foreground">
              ✕
            </button>
          )}
          <button onClick={copyLog} className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20">
            📋 Копировать
          </button>
        </div>
      </div>
      {!collapsed && (
        <div ref={ref} className={`bg-surface/40 rounded-xl p-2 sm:p-3 overflow-y-auto ${expanded ? 'max-h-[50vh]' : 'max-h-24 sm:max-h-32'}`}>
          {shown.map(e => (
            <div key={e.id} className={`text-[10px] sm:text-xs font-spectral ${LOG_COLORS[e.type]}`}>{e.message}</div>
          ))}
        </div>
      )}
      {/* Damage summary */}
      {!collapsed && combatStats && playerUnits.length > 0 && (
        <div className="mt-1.5 bg-surface/60 rounded-xl p-2 border border-border/30">
          <div className="text-[10px] font-kelly text-muted-foreground mb-1">📊 Итого за бой:</div>
          <div className="space-y-0.5">
            {playerUnits.map(u => {
              const s = combatStats[u.id] || { damageDealt: 0, healingDone: 0, damageTaken: 0, damageBlocked: 0 };
              return (
                <div key={u.id} className="flex items-center gap-2 text-[10px]">
                  <span className="font-kelly text-foreground truncate w-20">{u.champion.name}</span>
                  <span className="text-primary">⚔️{formatDmgShort(s.damageDealt)}</span>
                  {s.healingDone > 0 && <span className="text-green-400">💚{formatDmgShort(s.healingDone)}</span>}
                  <span className="text-accent">💔{formatDmgShort(s.damageTaken)}</span>
                  {s.damageBlocked > 0 && <span className="text-muted-foreground">🛡️{formatDmgShort(s.damageBlocked)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultScreen({ battleState, rewards, earnedStars, starConditions, arenaInfo, combatStats, units, onContinue, onHub }: {
  battleState: 'victory' | 'defeat';
  rewards: BattleRewards | null;
  earnedStars?: number;
  starConditions?: StarCondition[];
  arenaInfo?: { ratingChange: number; coinTier?: string } | null;
  combatStats: Record<string, CombatStats>;
  units: BattleUnit[];
  onContinue: () => void;
  onHub: () => void;
}) {
  const { player, advanceTutorial, isXpBoosterActive, isVipActive } = useGame();
  const step = player.tutorialStep ?? 99;
  const isContinueHighlighted = step === 14 || step === 28;
  const isWin = battleState === 'victory';
  const [showStats, setShowStats] = useState(false);
  const playerUnits = units.filter(u => !u.isEnemy);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh] px-3"
    >
      <div className={`text-5xl sm:text-6xl mb-3 ${isWin ? 'animate-float' : ''}`}>{isWin ? '🏆' : '💀'}</div>
      <h2 className={`text-2xl sm:text-3xl font-kelly ${isWin ? 'text-primary text-gold-glow' : 'text-accent text-crimson-glow'}`}>
        {isWin ? 'Слава Героям!' : 'Поражение...'}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-center">
        {isWin ? 'Враги повержены. Предки гордятся тобой!' : 'Твои герои пали. Попробуй снова.'}
      </p>

      {/* Star rating */}
      {isWin && earnedStars !== undefined && starConditions && (
        <div className="mt-3 bg-surface/60 rounded-xl p-3 card-lubok w-full max-w-xs">
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3].map(s => (
              <motion.span
                key={s}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + s * 0.2, type: 'spring', stiffness: 300 }}
                className={`text-2xl ${s <= earnedStars ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]' : 'text-muted/40'}`}
              >
                ⭐
              </motion.span>
            ))}
          </div>
          <div className="space-y-1">
            {starConditions.map((cond, i) => {
              const earned = i < earnedStars;
              return (
                <div key={i} className={`text-xs flex items-center gap-1.5 ${earned ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span>{earned ? '✓' : '✗'}</span>
                  <span>{cond.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arena results */}
      {arenaInfo && (
        <div className="mt-3 bg-surface/60 rounded-xl p-3 card-lubok text-center w-full max-w-xs">
          <h3 className="font-kelly text-primary text-sm mb-1">🏛️ Арена:</h3>
          <p className={`text-sm font-kelly ${arenaInfo.ratingChange > 0 ? 'text-primary' : 'text-accent'}`}>
            {arenaInfo.ratingChange > 0 ? '+' : ''}{arenaInfo.ratingChange} очей
          </p>
          {isWin && arenaInfo.coinTier && (
            <p className="text-xs text-foreground mt-1">+1 Рунная Монета ({arenaInfo.coinTier})</p>
          )}
        </div>
      )}

      {rewards && isWin && !arenaInfo && (
        <div className="mt-3 bg-surface/60 rounded-xl p-3 card-lubok text-center w-full max-w-xs">
          <h3 className="font-kelly text-primary text-sm mb-1">🎁 Награды:</h3>
          <p className="text-xs text-foreground flex items-center justify-center gap-1"><img src={iconSouls} alt="Души" className="w-4 h-4" /> <SoulDisplay souls={rewards.souls} prefix="+" suffix=" душ" /></p>
          <p className="text-xs text-foreground flex items-center justify-center gap-1">
            <img src="/ui/icon_xp.png" alt="Опыт" className="w-4 h-4" /> <XpDisplay xp={rewards.exp} prefix="+" suffix=" опыта" />
          </p>
          {rewards.runes != null && rewards.runes > 0 && (
            <p className="text-xs text-foreground flex items-center justify-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4" /> <RuneDisplay runes={rewards.runes} prefix="+" suffix=" рун" /></p>
          )}
          {rewards.templeRunes && (
            <div className="mt-2 border-t border-border/30 pt-2">
              <div className="flex items-center justify-center gap-2">
                <img src={rewards.templeRunes.runeIcon} alt={rewards.templeRunes.runeName} className="w-6 h-6 object-contain" />
                <p className="text-xs font-kelly text-primary">
                  +{rewards.templeRunes.count} {rewards.templeRunes.runeName}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">Редкость: {rewards.templeRunes.runeRarity}</p>
            </div>
          )}
          {rewards.bossMaterial && (
            <div className="mt-2 border-t border-border/30 pt-2">
              <p className="text-xs font-kelly text-accent mb-1.5">🔥 Материал босса:</p>
              <div className="flex items-center justify-center gap-2 bg-surface/60 rounded-lg p-2 border border-primary/30">
                <img src={rewards.bossMaterial.imageUrl} alt={rewards.bossMaterial.name} className="w-8 h-8 object-contain drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                <div className="text-left">
                  <span className="text-xs font-bold text-primary">{rewards.bossMaterial.name}</span>
                  <span className="text-xs text-foreground ml-1">×{rewards.bossMaterial.count}</span>
                </div>
              </div>
            </div>
          )}
          {isVipActive() && (
            <p className="text-[10px] text-[hsl(40,85%,55%)] mt-1">👑 VIP: ×1.5 к наградам</p>
          )}
          {rewards.droppedArtifacts.length > 0 && (
            <div className="mt-2 border-t border-border/30 pt-2">
              <p className="text-xs font-kelly text-accent mb-1.5">🏺 Артефакты:</p>
              <div className="space-y-2">
                {rewards.droppedArtifacts.map(art => {
                  const rarityColor: Record<string, string> = {
                    'Обиходный': 'text-muted-foreground',
                    'Заветный': 'text-green-400',
                    'Сказанный': 'text-blue-400',
                    'Калиновый': 'text-purple-400',
                    'Самоцветный': 'text-amber-400',
                  };
                  return (
                    <div key={art.id} className="bg-surface/60 rounded-lg p-2 border border-border/30">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${rarityColor[art.rarity] ?? 'text-foreground'}`}>
                          {art.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {'⭐'.repeat(art.stars)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{SLOT_LABELS[art.slot]}</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-primary">{art.set}</span>
                      </div>
                      <div className="mt-1 text-[10px]">
                        <span className="text-foreground font-medium">
                          {STAT_LABELS[art.primaryStat]} +{art.primaryType === 'percent' ? `${art.primaryValue}%` : art.primaryValue}
                        </span>
                      </div>
                      {art.substats.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0">
                          {art.substats.filter(s => s.unlockLevel === 0).map((s, i) => (
                            <span key={i} className="text-[9px] text-muted-foreground">
                              {STAT_LABELS[s.stat]} +{s.type === 'percent' ? `${s.value}%` : s.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Combat Stats Toggle */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="mt-3 text-xs font-kelly text-muted-foreground hover:text-foreground transition-colors"
      >
        {showStats ? '▲ Скрыть статистику' : '▼ Показать статистику боя'}
      </button>

      {/* Combat Stats Log */}
      <AnimatePresence>
        {showStats && playerUnits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 w-full max-w-sm overflow-hidden"
          >
            <div className="bg-surface/70 backdrop-blur-sm rounded-xl p-3 card-lubok border border-border/50 space-y-2">
              <h3 className="font-kelly text-sm text-foreground text-center mb-2">📊 Статистика боя</h3>
              {playerUnits.map(unit => {
                const stats = combatStats[unit.id] || { damageDealt: 0, healingDone: 0, damageTaken: 0, damageBlocked: 0 };
                const isDead = unit.currentHp <= 0;
                return (
                  <div key={unit.id} className={`flex items-center gap-2 bg-background/40 rounded-lg p-2 ${isDead ? 'opacity-60' : ''}`}>
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-border/50 flex-shrink-0">
                      <img src={unit.champion.imageUrl} alt={unit.champion.name} className="w-full h-full object-cover object-top" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-kelly text-xs text-foreground truncate">{unit.champion.name}</span>
                        {isDead && <span className="text-[10px] text-accent">💀</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-0.5">
                        <div className="text-[10px] text-accent flex items-center gap-0.5">
                          ⚔️ <span className="font-mono">{stats.damageDealt.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-green-400 flex items-center gap-0.5">
                          💚 <span className="font-mono">{stats.healingDone.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-red-400 flex items-center gap-0.5">
                          💔 <span className="font-mono">{stats.damageTaken.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-blue-400 flex items-center gap-0.5">
                          🛡 <span className="font-mono">{stats.damageBlocked.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => {
            if (step === 14) advanceTutorial(14);
            if (step === 28) advanceTutorial(28);
            onContinue();
          }}
          className={`relative bg-primary hover:bg-primary/90 text-primary-foreground font-kelly px-6 py-2.5 rounded-xl transition-all min-h-[44px] text-sm`}
        >
          {isContinueHighlighted && (
            <TutorialGlow rounded="rounded-xl" label={step === 14 ? 'Победа! Ты получил руны и опыт. Продолжай путь!' : 'Ещё одна победа! Руны и опыт получены.'} wide />
          )}
          Продолжить
        </button>
        <button onClick={onHub} className="bg-secondary hover:bg-secondary/80 text-foreground font-kelly px-6 py-2.5 rounded-xl transition-all min-h-[44px] text-sm">В Стан</button>
      </div>
    </motion.div>
  );
}

export default function BattlePage() {
  const { player, getSquadChampions, getEffectiveStats, getHeroArtifacts, addArtifacts, addXpToSquad, addSouls, addRunes, addDivineRunes, campaignProgress, updateCampaignProgress, templeProgress, updateTempleProgress, arenaState, markArenaOpponentDefeated, updateArenaRating, addArenaCoins, processArenaVictory, recordWorldBossDamage, recordCerberusDamage, updateAbyssProgress, advanceTutorial, isVipActive } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Temple battle data from URL params
  const templeData = (() => {
    const mode = searchParams.get('mode');
    if (mode !== 'temple') return null;
    const templeId = searchParams.get('templeId');
    const floor = parseInt(searchParams.get('floor') || '0');
    const temple = TEMPLES.find(t => t.id === templeId);
    if (!temple || floor < 1 || floor > temple.floors.length) return null;
    return { temple, floor, floorData: temple.floors[floor - 1] };
  })();

  // Arena battle data from sessionStorage
  const [arenaData] = useState(() => {
    try {
      const mode = searchParams.get('mode');
      if (mode !== 'arena') return null;
      const raw = sessionStorage.getItem('arenaBattle');
      if (raw) {
        sessionStorage.removeItem('arenaBattle');
        return JSON.parse(raw) as { opponentId: string; opponentName: string; opponentRating: number; enemies: any[] };
      }
    } catch {}
    return null;
  });

  // Campaign battle data from sessionStorage
  const [campaignData] = useState(() => {
    try {
      const raw = sessionStorage.getItem('campaignBattle');
      if (raw) {
        sessionStorage.removeItem('campaignBattle');
        return JSON.parse(raw) as { stage: import('@/data/campaignStages').Stage; difficulty: string; enemies: any[]; waves?: any[][]; modifiers?: CampaignModifiers };
      }
    } catch {}
    return null;
  });

  // Abyss battle data from sessionStorage
  const [abyssData] = useState(() => {
    try {
      const raw = sessionStorage.getItem('abyssBattle');
      if (raw) {
        sessionStorage.removeItem('abyssBattle');
        return JSON.parse(raw) as { floor: number; difficulty: AbyssDifficulty; waves: any[][]; enemies: any[]; secretRoomId?: number; isBossRefight?: boolean; secretRoomSquad?: string[] };
      }
    } catch {}
    return null;
  });

  // Wave system for campaign/abyss battles
  const [currentWave, setCurrentWave] = useState(0);
  const [totalWaves, setTotalWaves] = useState(1);
  const campaignWavesRef = useRef<any[][] | null>(null);
  
  // Initialize waves from campaign or abyss data
  useEffect(() => {
    if (campaignData?.waves) {
      campaignWavesRef.current = campaignData.waves;
      setTotalWaves(campaignData.waves.length);
      setCurrentWave(0);
    } else if (abyssData?.waves) {
      campaignWavesRef.current = abyssData.waves;
      setTotalWaves(abyssData.waves.length);
      setCurrentWave(0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // World Boss battle data from sessionStorage
  const [worldBossData] = useState(() => {
    try {
      const mode = searchParams.get('mode');
      if (mode !== 'worldboss') return null;
      const raw = sessionStorage.getItem('worldBossBattle');
      if (raw) {
        sessionStorage.removeItem('worldBossBattle');
        return JSON.parse(raw) as { bossId: string; todayDamage: number };
      }
      return null; // No battle context on refresh — will redirect to home
    } catch {}
    return null;
  });

  const [worldBossTotalDamage, setWorldBossTotalDamage] = useState(0);
  const worldBossTotalDamageRef = useRef(0);
  const [worldBossRound, setWorldBossRound] = useState(1);
  const worldBossRoundRef = useRef(1);
  const [hydraRound, setHydraRound] = useState(1);
  const hydraRoundRef = useRef(1);
  const [cerberusRebirth, setCerberusRebirth] = useState(1);
  const cerberusRebirthRef = useRef(1);

  // If page is refreshed and no battle context exists, redirect to home
  const hasBattleContext = !!(templeData || arenaData || campaignData || worldBossData || abyssData);
  useEffect(() => {
    if (!hasBattleContext) {
      navigate('/', { replace: true });
    }
  }, [hasBattleContext, navigate]);

  const [battleState, setBattleStateRaw] = useState<'prep' | 'fighting' | 'victory' | 'defeat'>('prep');
  const setBattleState = useCallback((state: 'prep' | 'fighting' | 'victory' | 'defeat') => {
    if (state === 'victory' || state === 'defeat') {
      setCombatStatsSnapshot({ ...combatStatsRef.current });
    }
    if (state === 'prep') {
      combatStatsRef.current = {};
    }
    setBattleStateRaw(state);
  }, []);
  // Hydra swallow mechanic state
  const [hydraSwallow, setHydraSwallow] = useState<HydraSwallowState>(createInitialSwallowState);
  const hydraSwallowRef = useRef(hydraSwallow);
  hydraSwallowRef.current = hydraSwallow;
  const isHydraBattle = !!worldBossData && worldBossData.bossId === 'hydra';
  // Hydra heads mechanic state
  const [hydraHeads, setHydraHeads] = useState<HydraHeadsState>({ heads: [], totalDecapitations: 0, reservePool: [] });
  const hydraHeadsRef = useRef(hydraHeads);
  hydraHeadsRef.current = hydraHeads;

  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [turnOrder, setTurnOrder] = useState<number[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [visualEffects, setVisualEffects] = useState<Record<string, boolean>>({});
  const [turnTimer, setTurnTimer] = useState(60);
  const [rewards, setRewards] = useState<BattleRewards | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<Record<string, FloatingNumber[]>>({});
  const tutorialStep = player.tutorialStep ?? 99;
  const isTutorialBattle = tutorialStep === 13 || tutorialStep === 27;
  const [autoBattle, setAutoBattle] = useState(() => isTutorialBattle || localStorage.getItem('bylina_autoBattle') === 'true');
  const [speedX2, setSpeedX2] = useState(() => localStorage.getItem('bylina_speedX2') === 'true');
  useEffect(() => { if (!isTutorialBattle) localStorage.setItem('bylina_autoBattle', String(autoBattle)); }, [autoBattle]);
  useEffect(() => { localStorage.setItem('bylina_speedX2', String(speedX2)); }, [speedX2]);
  // Force auto-battle during tutorial
  useEffect(() => {
    if (isTutorialBattle && !autoBattle) setAutoBattle(true);
  }, [isTutorialBattle]);
  // Advance tutorial when battle ends in victory
  useEffect(() => {
    if (battleState === 'victory' && tutorialStep === 13) advanceTutorial(13);
    if (battleState === 'victory' && tutorialStep === 27) advanceTutorial(27);
  }, [battleState]);
  const [turnCount, setTurnCount] = useState(0);
  const [allyDeaths, setAllyDeaths] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const turnCountRef = useRef(0);
  const allyDeathsRef = useRef(0);
  const squadSizeRef = useRef(0);
  const unitsRef = useRef(units);
  unitsRef.current = units;
  const turnOrderRef = useRef(turnOrder);
  turnOrderRef.current = turnOrder;

  // Combat stats tracking
  const combatStatsRef = useRef<Record<string, CombatStats>>({});
  const trackStat = useCallback((unitId: string, field: keyof CombatStats, amount: number) => {
    if (amount <= 0) return;
    const prev = combatStatsRef.current[unitId] || { damageDealt: 0, healingDone: 0, damageTaken: 0, damageBlocked: 0 };
    combatStatsRef.current = { ...combatStatsRef.current, [unitId]: { ...prev, [field]: prev[field] + amount } };
  }, []);
  const [combatStatsSnapshot, setCombatStatsSnapshot] = useState<Record<string, CombatStats>>({});

  const addLog = useCallback((message: string, type: BattleLogEntry['type'] = 'normal') => {
    setLog(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  /** Spawn a floating number on a unit */
  const spawnFloat = useCallback((unitId: string, value: number, type: FloatingNumber['type']) => {
    const fn: FloatingNumber = { id: `${unitId}-${Date.now()}-${Math.random()}`, value, type };
    setFloatingNumbers(prev => ({ ...prev, [unitId]: [...(prev[unitId] || []), fn] }));
    setTimeout(() => {
      setFloatingNumbers(prev => {
        const list = (prev[unitId] || []).filter(f => f.id !== fn.id);
        return { ...prev, [unitId]: list };
      });
    }, 2000);
  }, []);

  const currentWaveRef = useRef(currentWave);
  currentWaveRef.current = currentWave;

  /** Spawn next wave of enemies, keeping player units alive */
  const spawnNextWave = useCallback((currentUnits: BattleUnit[], nextWaveIdx: number): BattleUnit[] | null => {
    const waves = campaignWavesRef.current;
    if (!waves || nextWaveIdx >= waves.length) return null;

    const waveEnemies = waves[nextWaveIdx];
    const newEnemyUnits: BattleUnit[] = waveEnemies.map((c: any, i: number) => ({
      id: `enemy-w${nextWaveIdx}-${c.id}-${i}`,
      champion: c,
      currentHp: c.baseStats.hp,
      maxHp: c.baseStats.hp,
      isEnemy: true,
      skillCooldowns: c.skills.map(() => 0),
      effects: [],
      turnMeter: 0,
      immuneEffects: c.immuneEffects,
    }));

    // Keep alive player units, replace all enemies
    const playerUnits = currentUnits.filter(u => !u.isEnemy && u.currentHp > 0);
    return [...playerUnits, ...newEnemyUnits];
  }, []);

  const recordArenaBattle = useCallback((params: {
    opponentId: string;
    opponentName: string;
    attackerRating: number;
    defenderRating: number;
    ratingChange: number;
    result: 'win' | 'loss';
    attackerSquad?: { name: string; element: string; imageUrl: string }[];
    defenderSquad?: { name: string; element: string; imageUrl: string }[];
  }) => {
    if (!user) return;

    const defenderId = params.opponentId.startsWith('arena-db-')
      ? params.opponentId.split('-').slice(2, 7).join('-')
      : null;

    void supabase
      .from('arena_battle_history')
      .insert({
        attacker_id: user.id,
        defender_id: defenderId,
        attacker_name: player.username || '',
        defender_name: params.opponentName || '',
        attacker_rating: params.attackerRating,
        defender_rating: params.defenderRating,
        rating_change: params.ratingChange,
        result: params.result,
        attacker_squad: params.attackerSquad ?? [],
        defender_squad: params.defenderSquad ?? [],
      } as any)
      .then(({ error }) => {
        if (error) console.error('Arena history insert error:', error);
      });
  }, [user, player.username]);

  /** Extract minimal squad snapshots from current units for battle history */
  const getArenaSquads = useCallback(() => {
    const toSnap = (u: BattleUnit) => ({ name: u.champion.name, element: u.champion.element, imageUrl: u.champion.imageUrl || '' });
    const playerUnits = units.filter(u => !u.isEnemy);
    const enemyUnits = units.filter(u => u.isEnemy);
    return { attackerSquad: playerUnits.map(toSnap), defenderSquad: enemyUnits.map(toSnap) };
  }, [units]);

  /* generate enemies */
  const generateEnemyTeam = useCallback((): BattleUnit[] => {
    // If campaign battle, use pre-built enemies
    if (campaignData?.enemies) {
      return campaignData.enemies.map((c: any, i: number) => ({
        id: `enemy-${c.id}-${i}`,
        champion: c,
        currentHp: c.baseStats.hp,
        maxHp: c.baseStats.hp,
        isEnemy: true,
        skillCooldowns: c.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
      }));
    }

    // If abyss battle, use pre-built enemies (wave 1)
    if (abyssData?.enemies) {
      return abyssData.enemies.map((c: any, i: number) => ({
        id: `enemy-${c.id}-${i}`,
        champion: c,
        currentHp: c.baseStats.hp,
        maxHp: c.baseStats.hp,
        isEnemy: true,
        skillCooldowns: c.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
        immuneEffects: c.immuneEffects,
      }));
    }

    // If world boss battle
    if (worldBossData) {
      if (worldBossData.bossId === 'hydra') {
        // Hydra: 4 heads as separate units
        const { active, reserve } = pickStartingHeads();
        const headChampions = createHydraHeadChampions(active, hydraRoundRef.current);
        // Initialize HydraHeadsState for regrowth tracking
        const initialHeadsState: HydraHeadsState = {
          heads: active.map((headId, i) => ({
            headId,
            currentHp: headChampions[i].maxHp,
            maxHp: headChampions[i].maxHp,
            isAlive: true,
            regrowthTimer: -1,
            abilityCooldown: 0,
          })),
          totalDecapitations: 0,
          reservePool: reserve,
        };
        setHydraHeads(initialHeadsState);
        hydraHeadsRef.current = initialHeadsState;
        return headChampions.map((hc, i) => ({
          id: `enemy-hydra-${hc.id}-${i}`,
          champion: hc.champion as any,
          currentHp: hc.maxHp,
          maxHp: hc.maxHp,
          isEnemy: true,
          skillCooldowns: hc.champion.skills.map(() => 0),
          effects: [],
          turnMeter: 0,
          immuneEffects: HYDRA_BOSS.immuneEffects,
        } as BattleUnit));
      } else {
        const boss = CERBERUS_BOSS;
        const bossChampion = {
          id: boss.id,
          name: boss.name,
          element: boss.element,
          faction: 'Босс',
          rarity: 'Самоцветный' as const,
          description: boss.title,
          imageUrl: boss.bgUrl,
          baseStats: boss.baseStats,
          skills: boss.skills,
        };
        return [{
          id: `enemy-${boss.id}-0`,
          champion: bossChampion,
          currentHp: boss.baseStats.hp,
          maxHp: boss.baseStats.hp,
          isEnemy: true,
          skillCooldowns: boss.skills.map(() => 0),
          effects: [],
          turnMeter: 0,
          immuneEffects: boss.immuneEffects,
        }];
      }
    }

    // If arena battle, use opponent's heroes
    if (arenaData?.enemies) {
      return arenaData.enemies.map((c: any, i: number) => ({
        id: `enemy-${c.id}-${i}`,
        champion: c,
        currentHp: c.baseStats.hp,
        maxHp: c.baseStats.hp,
        isEnemy: true,
        skillCooldowns: c.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
      }));
    }

    // If temple battle, use single boss
    if (templeData) {
      const boss = templeData.floorData.boss;
      return [{
        id: `enemy-${boss.id}-0`,
        champion: boss,
        currentHp: boss.baseStats.hp,
        maxHp: boss.baseStats.hp,
        isEnemy: true,
        skillCooldowns: boss.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
      }];
    }

    const shuffled = [...CHAMPIONS].sort(() => Math.random() - 0.5);
    const ENEMY_SCALE = 0.6;
    return shuffled.slice(0, 4).map((c, i) => {
      const weakened: typeof c = {
        ...c,
        baseStats: {
          hp: Math.floor(c.baseStats.hp * ENEMY_SCALE),
          atk: Math.floor(c.baseStats.atk * ENEMY_SCALE),
          def: Math.floor(c.baseStats.def * ENEMY_SCALE),
          spd: c.baseStats.spd,
          critChance: c.baseStats.critChance * ENEMY_SCALE,
          critDmg: c.baseStats.critDmg * ENEMY_SCALE,
          resistance: c.baseStats.resistance * ENEMY_SCALE,
          accuracy: c.baseStats.accuracy * ENEMY_SCALE,
        },
      };
      return {
        id: `enemy-${c.id}-${i}`,
        champion: weakened,
        currentHp: weakened.baseStats.hp,
        maxHp: weakened.baseStats.hp,
        isEnemy: true,
        skillCooldowns: c.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
      };
    });
  }, [campaignData, templeData, arenaData, abyssData]);

  /* Helper: apply skill effects to relevant targets */
  const applySkillEffects = useCallback((
    skill: typeof CHAMPIONS[0]['skills'][0],
    attackerIdx: number,
    defenderIdx: number,
    currentUnits: BattleUnit[],
    logFn: (msg: string, type: BattleLogEntry['type']) => void,
    isGlancing: boolean = false,
  ): BattleUnit[] => {
    if (!skill.effects || skill.effects.length === 0) return currentUnits;

    let updatedUnits = [...currentUnits];
    const attacker = updatedUnits[attackerIdx];

    for (const eff of skill.effects) {
      // Cleanse is special
      if (eff.type === 'cleanse') {
        const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
        for (const tIdx of targets) {
          updatedUnits[tIdx] = cleanse(updatedUnits[tIdx]);
          logFn(`✨ ${updatedUnits[tIdx].champion.name}: дебаффы сняты!`, 'buff');
        }
        continue;
      }

      // Revive: use explicitly selected target (defenderIdx) if dead, otherwise find first dead ally
      if (eff.type === 'revive') {
        let revTarget: { u: typeof updatedUnits[0]; i: number } | null = null;
        if (updatedUnits[defenderIdx] && updatedUnits[defenderIdx].currentHp <= 0 && updatedUnits[defenderIdx].isEnemy === attacker.isEnemy) {
          revTarget = { u: updatedUnits[defenderIdx], i: defenderIdx };
        } else {
          const deadAllies = updatedUnits
            .map((u, i) => ({ u, i }))
            .filter(({ u }) => u.isEnemy === attacker.isEnemy && u.currentHp <= 0);
          if (deadAllies.length > 0) revTarget = deadAllies[0];
        }
        if (revTarget) {
          const reviveHp = Math.floor(revTarget.u.maxHp * (eff.value ?? 30) / 100);
          updatedUnits[revTarget.i] = { ...revTarget.u, currentHp: reviveHp, effects: [] };
          logFn(`🔄 ${revTarget.u.champion.name} воскрешён с ${reviveHp} HP!`, 'heal');
        } else {
          logFn(`🔄 Нет павших союзников для воскрешения`, 'normal');
        }
        continue;
      }

      // Heal: directly restore HP
      if (eff.type === 'heal') {
        const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
        for (const tIdx of targets) {
          const target = updatedUnits[tIdx];
          const healMult = getHealMultiplier(target);
          const rawHeal = Math.floor(target.maxHp * (eff.value ?? 0) / 100);
          const healAmt = Math.floor(rawHeal * healMult);
          const actualHeal = Math.min(healAmt, target.maxHp - target.currentHp);
          updatedUnits[tIdx] = { ...target, currentHp: Math.min(target.maxHp, target.currentHp + healAmt) };
          if (actualHeal > 0) {
            const reductionNote = healMult < 1 ? ` (снижено ${Math.round((1 - healMult) * 100)}%)` : '';
            logFn(`💖 ${target.champion.name} исцелён на ${actualHeal} HP${reductionNote} [${updatedUnits[tIdx].currentHp}/${target.maxHp}]`, 'heal');
            spawnFloat(updatedUnits[tIdx].id, actualHeal, 'heal');
            // Track healing: credit to the caster (attacker)
            const caster = updatedUnits[attackerIdx];
            if (caster && !caster.isEnemy) trackStat(caster.id, 'healingDone', actualHeal);
          }
        }
        continue;
      }

      // TM Boost: instantly increase turn meter
      if (eff.type === 'tm_boost') {
        const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
        for (const tIdx of targets) {
          const newTM = boostTurnMeter(updatedUnits[tIdx].turnMeter ?? 0, eff.value ?? 0);
          updatedUnits[tIdx] = { ...updatedUnits[tIdx], turnMeter: newTM };
          logFn(`⚡ ${updatedUnits[tIdx].champion.name}: шкала хода +${eff.value}%`, 'buff');
        }
        continue;
      }

      // TM Reduce: instantly decrease turn meter
      if (eff.type === 'tm_reduce') {
        const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
        for (const tIdx of targets) {
          const newTM = reduceTurnMeter(updatedUnits[tIdx].turnMeter ?? 0, eff.value ?? 0);
          updatedUnits[tIdx] = { ...updatedUnits[tIdx], turnMeter: newTM };
          logFn(`⏬ ${updatedUnits[tIdx].champion.name}: шкала хода -${eff.value}%`, 'debuff');
        }
        continue;
      }

      const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
      const isDebuff = isDebuffType(eff.type);

      // Glancing Hit blocks ALL debuffs
      if (isGlancing && isDebuff) {
        for (const tIdx of targets) {
          logFn(`⚡ ${updatedUnits[tIdx].champion.name}: слабый удар — ${EFFECT_NAMES[eff.type]} заблокирован!`, 'normal');
          spawnFloat(updatedUnits[tIdx].id, 0, 'glancing');
        }
        continue;
      }

      // Calculate attacker's effective accuracy for ACC vs RES checks
      const attackerAccMult = getStatMultiplier(attacker, 'accuracy');
      const effectiveAcc = attacker.champion.baseStats.accuracy * attackerAccMult;
      for (const tIdx of targets) {
        // Frost Morena set: chance to block incoming Freeze
        if (eff.type === 'freeze' && !updatedUnits[tIdx].isEnemy) {
          const defArts = getHeroArtifacts(updatedUnits[tIdx].id);
          const { freezeBlockChance } = getFrostMorenaBonus(defArts);
          if (freezeBlockChance > 0 && Math.random() < freezeBlockChance) {
            logFn(`❄️🛡️ ${updatedUnits[tIdx].champion.name}: Ледяная блокирует Заморозку!`, 'buff');
            continue;
          }
        }

        const result = applyEffect(updatedUnits[tIdx], eff, attacker.id, effectiveAcc);
        updatedUnits[tIdx] = result.unit;
        if (result.applied) {
          const icon = EFFECT_NAMES[eff.type];
          const name = EFFECT_NAMES[eff.type];
          const isBuff = isBuffType(eff.type);
          logFn(
            `${icon} ${updatedUnits[tIdx].champion.name}: ${name}${eff.value > 0 ? ` (${eff.value}%)` : ''}${eff.duration ? ` на ${eff.duration} ход(а)` : ' постоянно'}`,
            isBuff ? 'buff' : 'debuff'
          );
        } else if (result.blocked) {
          logFn(
            `🚫 ${updatedUnits[tIdx].champion.name}: ${EFFECT_NAMES[eff.type]} заблокирован!`,
            'normal'
          );
        } else if (result.resisted) {
          logFn(
            `🛡️ ${updatedUnits[tIdx].champion.name} сопротивляется: ${EFFECT_NAMES[eff.type]}!`,
            'normal'
          );
          spawnFloat(updatedUnits[tIdx].id, 0, 'resist');
        }
      }
    }
    return updatedUnits;
  }, [spawnFloat, trackStat, worldBossData]);

  /* Resolve targets for an effect */
  function resolveTargets(
    eff: EffectApplication,
    attackerIdx: number,
    defenderIdx: number,
    units: BattleUnit[]
  ): number[] {
    const attacker = units[attackerIdx];
    switch (eff.target) {
      case 'self': return [attackerIdx];
      case 'enemy': return [defenderIdx];
      case 'ally': {
        const preferred = units[defenderIdx];
        if (preferred && preferred.isEnemy === attacker.isEnemy && preferred.currentHp > 0) {
          return [defenderIdx];
        }
        const fallbackAllyIdx = units.findIndex((u, i) => i !== attackerIdx && u.isEnemy === attacker.isEnemy && u.currentHp > 0);
        return fallbackAllyIdx >= 0 ? [fallbackAllyIdx] : [attackerIdx];
      }
      case 'all_allies':
        return units.map((u, i) => ({ u, i }))
          .filter(({ u }) => u.isEnemy === attacker.isEnemy && u.currentHp > 0)
          .map(({ i }) => i);
      case 'all_enemies':
        return units.map((u, i) => ({ u, i }))
          .filter(({ u }) => u.isEnemy !== attacker.isEnemy && u.currentHp > 0)
          .map(({ i }) => i);
      default: return [];
    }
  }

  /* start */
  const startBattle = useCallback(() => {
    // For secret rooms, use the separately picked squad instead of main squad
    let squad: ReturnType<typeof getSquadChampions>;
    if (abyssData?.secretRoomSquad && abyssData.secretRoomSquad.length > 0) {
      squad = abyssData.secretRoomSquad
        .map((id: string) => player.champions.find(c => c.id === id))
        .filter(Boolean) as ReturnType<typeof getSquadChampions>;
    } else {
      squad = getSquadChampions();
    }
    if (squad.length === 0) return;

    const playerUnits: BattleUnit[] = squad.map(pc => {
      const effectiveStats = getEffectiveStats(pc);
      const heroArtifacts = getHeroArtifacts(pc.id);
      const artifactBonuses = calculateArtifactStats(heroArtifacts, effectiveStats);

      const finalStats = {
        hp: effectiveStats.hp + (artifactBonuses.hp ?? 0),
        atk: effectiveStats.atk + (artifactBonuses.atk ?? 0),
        def: effectiveStats.def + (artifactBonuses.def ?? 0),
        spd: effectiveStats.spd + (artifactBonuses.spd ?? 0),
        critChance: effectiveStats.critChance + (artifactBonuses.critChance ?? 0),
        critDmg: effectiveStats.critDmg + (artifactBonuses.critDmg ?? 0),
        resistance: effectiveStats.resistance + (artifactBonuses.resistance ?? 0),
        accuracy: effectiveStats.accuracy + (artifactBonuses.accuracy ?? 0),
      };

      // Apply red star skill bonuses
      const redStars = pc.redStars ?? 0;
      let enhancedSkills = [...pc.champion.skills];
      if (redStars >= 2 || redStars >= 5) {
        const skill1Bonus = (redStars >= 2 ? 0.20 : 0) + (redStars >= 5 ? 0.25 : 0);
        enhancedSkills = enhancedSkills.map((s, idx) =>
          idx === 0 ? { ...s, power: s.power + skill1Bonus } : s
        );
      }
      const enhancedChampion = { ...pc.champion, baseStats: finalStats, skills: enhancedSkills };
      return {
        id: pc.id,
        champion: enhancedChampion,
        currentHp: finalStats.hp,
        maxHp: finalStats.hp,
        isEnemy: false,
        skillCooldowns: pc.champion.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
        redStars: pc.redStars ?? 0,
      };
    });

    const enemies = generateEnemyTeam();
    // Auto-apply passive skill effects at battle start
    const applyPassives = (unitList: BattleUnit[]): BattleUnit[] => {
      return unitList.map(unit => {
        let updated = unit;
        unit.champion.skills.forEach(skill => {
          if (skill.type !== 'passive' || !skill.effects || skill.effects.length === 0) return;
          skill.effects.forEach(eff => {
            if (eff.target === 'self') {
              const { unit: u } = applyEffect(updated, { ...eff, chance: 1 }, updated.id);
              updated = u;
            }
          });
        });
        return updated;
      });
    };

    let allUnits = applyPassives([...playerUnits, ...enemies]);

    // Apply campaign modifiers at battle start
    if (campaignData?.modifiers) {
      const mods = campaignData.modifiers;
      allUnits = allUnits.map(unit => {
        let updated = unit;
        
        if (unit.isEnemy) {
          // Chapter buffs on enemies
          if (mods.chapterBuff) {
            for (const eff of mods.chapterBuff.effects) {
              const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'campaign-chapter');
              updated = u;
            }
          }
          // Enemy buffs from stage modifiers
          for (const mod of mods.stageModifiers) {
            if (mod.enemyBuffs) {
              for (const eff of mod.enemyBuffs) {
                const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'campaign-modifier');
                updated = u;
              }
            }
          }
        } else {
          // Player debuffs from stage modifiers
          for (const mod of mods.stageModifiers) {
            if (mod.playerDebuffs) {
              for (const eff of mod.playerDebuffs) {
                const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'campaign-modifier');
                updated = u;
              }
            }
          }
        }
        return updated;
      });
    }

    // Apply temple modifiers at battle start
    if (templeData) {
      const templeMods = getTempleFloorModifiers(templeData.temple.element, templeData.floor);
      allUnits = allUnits.map(unit => {
        let updated = unit;

        if (unit.isEnemy) {
          // Floor buff on boss
          if (templeMods.floorBuff) {
            for (const eff of templeMods.floorBuff.effects) {
              const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'temple-floor');
              updated = u;
            }
          }
          // Enemy buffs from temple modifiers
          for (const mod of templeMods.modifiers) {
            if (mod.enemyBuffs) {
              for (const eff of mod.enemyBuffs) {
                const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'temple-modifier');
                updated = u;
              }
            }
          }
        } else {
          // Player debuffs from temple modifiers
          for (const mod of templeMods.modifiers) {
            if (mod.playerDebuffs) {
              for (const eff of mod.playerDebuffs) {
                const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'temple-modifier');
                updated = u;
              }
            }
          }
          // Elemental hazard on player
          if (templeMods.elementalHazard) {
            for (const eff of templeMods.elementalHazard.effects) {
              const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'temple-hazard');
              updated = u;
            }
          }
        }
        return updated;
      });
    }

    // Apply world boss modifiers at battle start
    if (worldBossData) {
      const bossMods = getWorldBossModifiers(worldBossData.bossId);
      allUnits = allUnits.map(unit => {
        let updated = unit;

        if (unit.isEnemy) {
          // Boss aura
          for (const eff of bossMods.bossAura.effects) {
            const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'boss-aura');
            updated = u;
          }
          // Boss buffs from modifiers
          for (const mod of bossMods.modifiers) {
            if (mod.bossBuffs) {
              for (const eff of mod.bossBuffs) {
                const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'boss-modifier');
                updated = u;
              }
            }
          }
        } else {
          // Player debuffs from modifiers
          for (const mod of bossMods.modifiers) {
            if (mod.playerDebuffs) {
              for (const eff of mod.playerDebuffs) {
                const { unit: u } = applyEffect(updated, { type: eff.type, value: eff.value, duration: eff.duration, chance: 1, target: 'self' }, 'boss-modifier');
                updated = u;
              }
            }
          }
        }
        return updated;
      });
    }

    // Apply Stone Beetle (Каменный Жук) set immunity at battle start
    allUnits = allUnits.map(unit => {
      if (unit.isEnemy) return unit;
      const heroArts = getHeroArtifacts(unit.id);
      const beetleCount = heroArts.filter(a => a.set === 'Каменный Жук').length;
      if (beetleCount >= 3) {
        const dur = beetleCount >= 9 ? 3 : 2;
        const { unit: u } = applyEffect(unit, { type: 'block_debuffs', value: 0, duration: dur, chance: 1, target: 'self' }, 'stone-beetle-set');
        return u;
      }
      return unit;
    });

    // Use Turn Meter ticking for initial turn order
    const { nextUnitIndex: firstUnit, updatedMeters: initMeters } = tickToNextTurn(allUnits);
    allUnits.forEach((u, i) => { u.turnMeter = initMeters[i]; });
    const initPredicted = predictTurnOrder(allUnits, 8);
    const order = [firstUnit, ...initPredicted];

    setUnits(allUnits);
    setTurnOrder(order);
    setCurrentTurnIndex(0);
    setBattleState('fighting');
    const waveCount = campaignData?.waves?.length ?? 1;
    setLog([{ id: 0, message: waveCount > 1 ? `⚔️ Раунд 1/${waveCount} — Бой начинается!` : '⚔️ Бой начинается! Предки с нами!', type: 'normal' }]);
    setSelectedSkill(null);
    setTurnTimer(60);
    setRewards(null);
    setTurnCount(0);
    turnCountRef.current = 0;
    setAllyDeaths(0);
    allyDeathsRef.current = 0;
    squadSizeRef.current = playerUnits.length;
    setCurrentWave(0);
    currentWaveRef.current = 0;
    setEarnedStars(0);
    victoryProcessedRef.current = false;
    combatStatsRef.current = {};

    // Initialize Hydra swallow mechanic
    if (worldBossData?.bossId === 'hydra') {
      const initialSwallow = initializeMark(createInitialSwallowState(), allUnits);
      setHydraSwallow(initialSwallow);
      hydraSwallowRef.current = initialSwallow;
      if (initialSwallow.markedHeroId) {
        const markedUnit = allUnits.find(u => u.id === initialSwallow.markedHeroId);
        if (markedUnit) {
          setLog(prev => [...prev, { id: Date.now(), message: `🐍 Метка Гидры: ${markedUnit.champion.name} (${initialSwallow.markCountdown} ходов)`, type: 'debuff' as const }]);
        }
      }
      // Log active heads
      const headUnits = allUnits.filter(u => u.isEnemy);
      const headNames = headUnits.map(u => u.champion.name).join(', ');
      setLog(prev => [...prev, { id: Date.now() + 1, message: `🐉 Головы Гидры: ${headNames}`, type: 'buff' as const }]);
      setHydraRound(hydraRoundRef.current);
    } else {
      setHydraSwallow(createInitialSwallowState());
    }
  }, [getSquadChampions, getEffectiveStats, getHeroArtifacts, generateEnemyTeam, abyssData, player.champions]);

  // Auto-start battle (skip prep screen)
  useEffect(() => {
    const hasSquad = (abyssData?.secretRoomSquad && abyssData.secretRoomSquad.length > 0) || getSquadChampions().length > 0;
    if (battleState === 'prep' && hasSquad) {
      startBattle();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUnit = battleState === 'fighting' ? units[turnOrder[currentTurnIndex]] : null;

  /* Process effects at start of turn (DoT, HoT, duration tick) */
  const processUnitEffects = useCallback((unitIdx: number, currentUnits: BattleUnit[]): BattleUnit[] => {
    const unit = currentUnits[unitIdx];
    if (!unit || unit.currentHp <= 0) return currentUnits;

    // Дренос: regen at start of turn
    let updated = [...currentUnits];
    if (!unit.isEnemy) {
      const heroArts = getHeroArtifacts(unit.id);
      const { regenPct } = getDrenosIndrikBonus(heroArts);
      if (regenPct > 0 && unit.currentHp < unit.maxHp) {
        const regenAmt = Math.floor(unit.maxHp * regenPct);
        const actualHeal = Math.min(regenAmt, unit.maxHp - unit.currentHp);
        updated[unitIdx] = { ...updated[unitIdx], currentHp: Math.min(unit.maxHp, unit.currentHp + regenAmt) };
        if (actualHeal > 0) {
          addLog(`🌿 ${unit.champion.name}: Дренос восстанавливает ${actualHeal} HP`, 'heal');
          spawnFloat(unit.id, actualHeal, 'heal');
          trackStat(unit.id, 'healingDone', actualHeal);
        }
      }
    }

    if (updated[unitIdx].effects.length === 0) return updated;

    const { unit: processed, dotDamage, bombDamage } = processEffects(updated[unitIdx]);
    updated[unitIdx] = processed;

    if (dotDamage > 0) {
      const dots = unit.effects.filter(e => ['poison', 'bleed', 'burn'].includes(e.type));
      const dotNames = dots.map(e => EFFECT_NAMES[e.type]).join(', ');
      addLog(`${dotNames} ${unit.champion.name} получает ${dotDamage} урона от эффектов`, 'dot');
      spawnFloat(unit.id, dotDamage, 'damage');
      if (!unit.isEnemy) trackStat(unit.id, 'damageTaken', dotDamage);
      // Track DoT damage dealt to world boss
      if (unit.isEnemy && worldBossData) {
        setWorldBossTotalDamage(prev => prev + dotDamage);
        worldBossTotalDamageRef.current += dotDamage;
      }
    }

    if (bombDamage > 0) {
      addLog(`💣 ${unit.champion.name}: бомба взрывается! ${bombDamage} урона (игнорирует защиту)`, 'dot');
      spawnFloat(unit.id, bombDamage, 'crit');
      if (!unit.isEnemy) trackStat(unit.id, 'damageTaken', bombDamage);
    }

    // Check if HoT healed
    if (processed.currentHp > unit.currentHp && dotDamage === 0 && bombDamage === 0) {
      const healed = processed.currentHp - unit.currentHp;
      addLog(`💚 ${unit.champion.name} восстанавливает ${healed} HP`, 'heal');
      spawnFloat(unit.id, healed, 'heal');
      if (!unit.isEnemy) trackStat(unit.id, 'healingDone', healed);
    }

    return updated;
  }, [addLog, spawnFloat, trackStat, worldBossData]);

  /* advance turn — accepts optional fresh units to avoid stale ref */
  const advanceTurn = useCallback((freshUnits?: BattleUnit[]) => {
    const u = freshUnits ?? unitsRef.current;
    
    // Use Turn Meter ticking to determine next acting unit
    const { nextUnitIndex: nextUnitIdx, updatedMeters } = tickToNextTurn(u);
    
    // Update TM on all units
    let finalUnits = u.map((unit, i) => ({ ...unit, turnMeter: updatedMeters[i] }));
    
    if (finalUnits[nextUnitIdx] && finalUnits[nextUnitIdx].currentHp > 0) {
      // First process effects (DoT, reduce durations)
      const afterEffects = processUnitEffects(nextUnitIdx, finalUnits);
      
      // Then tick cooldowns
      finalUnits = afterEffects.map((unit, i) =>
        i === nextUnitIdx ? updateCooldowns(unit) : unit
      );

      // Check if unit died from DoT
      if (finalUnits[nextUnitIdx].currentHp <= 0) {
        addLog(`💀 ${finalUnits[nextUnitIdx].champion.name} погибает от эффектов!`, 'dot');
        // Check win/lose after DoT death
        const aliveEnemies = finalUnits.filter(u => u.isEnemy && u.currentHp > 0);
        const alivePlayers = finalUnits.filter(u => !u.isEnemy && u.currentHp > 0);
        if (aliveEnemies.length === 0) {
          // World boss: never trigger victory on enemy death
          if (worldBossData) {
            // Hydra rebirth on DoT kill
            if (isHydraBattle) {
              const newRound = hydraRoundRef.current + 1;
              hydraRoundRef.current = newRound;
              setHydraRound(newRound);
              addLog(`🔥🐉 Все головы отсечены! Возрождение ${newRound} — Гидра возрождается сильнее!`, 'crit');

              const { active: newActive, reserve: newReserve } = pickStartingHeads();
              const headChampions = createHydraHeadChampions(newActive, newRound);
              const newHeadUnits: BattleUnit[] = headChampions.map((hc, i) => ({
                id: `enemy-hydra-${hc.id}-${newRound}-${i}`,
                champion: hc.champion as any,
                currentHp: hc.maxHp,
                maxHp: hc.maxHp,
                isEnemy: true,
                skillCooldowns: hc.champion.skills.map(() => 0),
                effects: [],
                turnMeter: 0,
              }));

              const newHeadsState: HydraHeadsState = {
                heads: newActive.map((headId, i) => ({
                  headId,
                  currentHp: headChampions[i].maxHp,
                  maxHp: headChampions[i].maxHp,
                  isAlive: true,
                  regrowthTimer: -1,
                  abilityCooldown: 0,
                })),
                totalDecapitations: 0,
                reservePool: newReserve,
              };
              setHydraHeads(newHeadsState);
              hydraHeadsRef.current = newHeadsState;

              const playerUnitsAlive = finalUnits.filter(u => !u.isEnemy);
              const allNewUnits = [...playerUnitsAlive, ...newHeadUnits];
              const { nextUnitIndex: nextIdx2, updatedMeters: meters2 } = tickToNextTurn(allNewUnits);
              allNewUnits.forEach((u, i) => { u.turnMeter = meters2[i]; });
              const predicted2 = predictTurnOrder(allNewUnits, 8);
              setUnits(allNewUnits);
              unitsRef.current = allNewUnits;
              setTurnOrder([nextIdx2, ...predicted2]);
              turnOrderRef.current = [nextIdx2, ...predicted2];
              setCurrentTurnIndex(0);
              setSelectedSkill(null);
            } else {
              // Cerberus rebirth on DoT kill
              const newRebirth = cerberusRebirthRef.current + 1;
              cerberusRebirthRef.current = newRebirth;
              setCerberusRebirth(newRebirth);
              const scaledStats = getScaledCerberusStats(CERBERUS_BOSS.baseStats, newRebirth - 1);
              addLog(`🔥 Цербер погибает и возрождается из пепла! Возрождение ${newRebirth}`, 'crit');

              const deadBoss = finalUnits.find(u => u.isEnemy)!;
              const rebirthUnit: BattleUnit = {
                id: `enemy-cerberus-rebirth-${newRebirth}`,
                champion: { ...deadBoss.champion, baseStats: scaledStats },
                currentHp: scaledStats.hp,
                maxHp: scaledStats.hp,
                isEnemy: true,
                skillCooldowns: CERBERUS_BOSS.skills.map(() => 0),
                effects: [],
                turnMeter: 0,
                immuneEffects: CERBERUS_BOSS.immuneEffects,
              };

              const playerUnitsAlive = finalUnits.filter(u => !u.isEnemy);
              const allNewUnits = [...playerUnitsAlive, rebirthUnit];
              const { nextUnitIndex: nextIdx3, updatedMeters: meters3 } = tickToNextTurn(allNewUnits);
              allNewUnits.forEach((u, i) => { u.turnMeter = meters3[i]; });
              const predicted3 = predictTurnOrder(allNewUnits, 8);
              setUnits(allNewUnits);
              unitsRef.current = allNewUnits;
              setTurnOrder([nextIdx3, ...predicted3]);
              turnOrderRef.current = [nextIdx3, ...predicted3];
              setCurrentTurnIndex(0);
              setSelectedSkill(null);
              worldBossRoundRef.current = 1;
              setWorldBossRound(1);
            }
            return;
          }
          if ((campaignData?.waves || abyssData?.waves) && campaignWavesRef.current && currentWaveRef.current < (campaignWavesRef.current.length - 1)) {
            const nextWaveIdx = currentWaveRef.current + 1;
            const waveUnits = spawnNextWave(finalUnits, nextWaveIdx);
            if (waveUnits) {
              setCurrentWave(nextWaveIdx);
              currentWaveRef.current = nextWaveIdx;
              addLog(`🔔 Раунд ${nextWaveIdx + 1}/${campaignWavesRef.current.length}!`, 'buff');
              const { nextUnitIndex: waveFirst, updatedMeters: waveMeters } = tickToNextTurn(waveUnits);
              waveUnits.forEach((wu, wi) => { wu.turnMeter = waveMeters[wi]; });
              const wavePredicted = predictTurnOrder(waveUnits, 8);
              const order = [waveFirst, ...wavePredicted];
              // Re-apply Stone Beetle immunity on wave start
              waveUnits.forEach((wu, wi) => {
                if (wu.isEnemy) return;
                const heroArts = getHeroArtifacts(wu.id);
                const beetleCount = heroArts.filter(a => a.set === 'Каменный Жук').length;
                if (beetleCount >= 3) {
                  const dur = beetleCount >= 9 ? 3 : 2;
                  const { unit: u } = applyEffect(wu, { type: 'block_debuffs', value: 0, duration: dur, chance: 1, target: 'self' }, 'stone-beetle-set');
                  waveUnits[wi] = u;
                }
              });
              setUnits(waveUnits);
              unitsRef.current = waveUnits;
              setTurnOrder(order);
              turnOrderRef.current = order;
              setCurrentTurnIndex(0);
              setSelectedSkill(null);
              setTurnTimer(60);
              return;
            }
          }
          // Campaign rewards on DoT kill
          if (campaignData?.stage) {
            const stage = campaignData.stage;
            const diff = campaignData.difficulty as import('@/data/campaignStages').Difficulty;
            const isFirst = !((campaignProgress[diff]?.[stage.chapter]?.highestStage ?? 0) >= stage.stageNumber);
            const stageRewards = isFirst ? stage.rewards.firstClear : stage.rewards.repeat;
            const deadAllies = finalUnits.filter(u => !u.isEnemy && u.currentHp <= 0).length;
            const totalDeaths = allyDeathsRef.current + deadAllies;
            allyDeathsRef.current = totalDeaths;
            setAllyDeaths(totalDeaths);
            const conditions = stage.starConditions as StarCondition[] | undefined;
            const stars = conditions ? calculateBattleStars(conditions, true, totalDeaths, turnCountRef.current, squadSizeRef.current) : 1;
            setEarnedStars(stars);
            const starMultiplier = 1 + (stars - 1) * 0.25;
            const vipMult = isVipActive() ? 1.5 : 1;
            const r = calculateRewards(1);
            r.souls = Math.floor(stageRewards.souls * starMultiplier * vipMult);
            r.exp = Math.floor(stageRewards.exp * starMultiplier);
            const campaignArtifacts = generateCampaignArtifacts(stage.chapter, stage.stageNumber, diff);
            r.droppedArtifacts = campaignArtifacts;
            r.artifactDrop = campaignArtifacts.length > 0;
            r.artifactRarity = campaignArtifacts[0]?.rarity;
            r.runes = Math.floor(stageRewards.runes * starMultiplier * vipMult);
            setRewards(r);
            if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
            addSouls(r.souls);
            addRunes(r.runes);
            addXpToSquad(r.exp);
            updateCampaignProgress(diff, stage.chapter, stage.stageNumber, stage.id, stars);
          } else if (abyssData) {
            const progress = refreshKeysIfNeeded(player.abyssProgress);
            if (abyssData.secretRoomId) {
              const room = SECRET_ROOMS.find(r => r.id === abyssData.secretRoomId);
              if (room) {
                const newCleared = [...(progress.secretRoomsCleared[abyssData.difficulty] ?? []), room.id];
                updateAbyssProgress({ ...progress, secretRoomsCleared: { ...progress.secretRoomsCleared, [abyssData.difficulty]: newCleared } });
                addSouls(room.rewards.souls);
                addRunes(room.rewards.runes);
                // Generate artifact drop from boss set
                const setName = getSecretRoomSetReward(room);
                const droppedArtifacts: any[] = [];
                if (setName) {
                  const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
                  const rarity = abyssData.difficulty === 'hard' ? 'Калиновый' : 'Сказанный';
                  const stars = abyssData.difficulty === 'hard' ? (Math.random() < 0.5 ? 4 : 5) : (Math.random() < 0.6 ? 3 : 4);
                  droppedArtifacts.push(generateArtifact(rarity as any, 0, stars, setName as any, slot));
                  if (droppedArtifacts.length > 0) addArtifacts(droppedArtifacts);
                }
                setRewards({ souls: room.rewards.souls, exp: 0, artifactDrop: droppedArtifacts.length > 0, droppedArtifacts, runes: room.rewards.runes });
                addLog(`🚪 Потайная комната «${room.name}» пройдена! +${room.rewards.souls} душ, +${room.rewards.runes} рун${setName ? ` + 🛡️ ${setName}` : ''}`, 'buff');
              }
            } else if (abyssData.isBossRefight) {
              // Boss re-fight: costs silver key, drops materials only
              const boss = getBossForFloor(abyssData.floor);
              const materialDrop = boss ? (abyssData.difficulty === 'hard' ? 4 : 2) : 0;
              const newProgress = {
                ...progress,
                silverKeys: progress.silverKeys - 1,
                bossKills: boss
                  ? { ...progress.bossKills, [boss.id]: (progress.bossKills[boss.id] ?? 0) + 1 }
                  : progress.bossKills,
                materials: boss
                  ? { ...(progress.materials ?? {}), [boss.id]: ((progress.materials ?? {})[boss.id] ?? 0) + materialDrop }
                  : (progress.materials ?? {}),
              };
              updateAbyssProgress(newProgress);
              const floorRewards = getFloorRewards(abyssData.floor, abyssData.difficulty);
              addSouls(Math.floor(floorRewards.souls * 0.5));
              const bossArts = boss ? generateAbyssBossDrop(boss.id, abyssData.difficulty) : [];
              if (bossArts.length > 0) addArtifacts(bossArts);
              const materialText = boss && materialDrop > 0 ? ` + ${materialDrop}x ${boss.material}` : '';
              setRewards({ souls: Math.floor(floorRewards.souls * 0.5), exp: 0, artifactDrop: bossArts.length > 0, droppedArtifacts: bossArts, runes: 0, bossMaterial: boss && materialDrop > 0 ? { name: boss.material, imageUrl: boss.materialImageUrl, count: materialDrop } : undefined });
              addLog(`🔁 Босс повержен повторно! +${Math.floor(floorRewards.souls * 0.5)} душ${bossArts.length > 0 ? ` + 🎁 ${bossArts.length} арт.` : ''}${materialText}`, 'buff');
            } else {
              const floorRewards = getFloorRewards(abyssData.floor, abyssData.difficulty);
              const boss = getBossForFloor(abyssData.floor);
              const materialDrop = boss ? (abyssData.difficulty === 'hard' ? 4 : 2) : 0;
              const newProgress = {
                ...progress,
                currentFloor: { ...progress.currentFloor, [abyssData.difficulty]: abyssData.floor },
                goldKeys: progress.goldKeys - 1,
                bossKills: boss
                  ? { ...progress.bossKills, [boss.id]: (progress.bossKills[boss.id] ?? 0) + 1 }
                  : progress.bossKills,
                materials: boss
                  ? { ...(progress.materials ?? {}), [boss.id]: ((progress.materials ?? {})[boss.id] ?? 0) + materialDrop }
                  : (progress.materials ?? {}),
              };
              updateAbyssProgress(newProgress);
              addSouls(floorRewards.souls);
              addRunes(floorRewards.runes);
              const bossArts = boss ? generateAbyssBossDrop(boss.id, abyssData.difficulty) : [];
              if (bossArts.length > 0) addArtifacts(bossArts);
              const materialText = boss && materialDrop > 0 ? ` + ${materialDrop}x ${boss.material}` : '';
              setRewards({ souls: floorRewards.souls, exp: 0, artifactDrop: bossArts.length > 0, droppedArtifacts: bossArts, runes: floorRewards.runes, bossMaterial: boss && materialDrop > 0 ? { name: boss.material, imageUrl: boss.materialImageUrl, count: materialDrop } : undefined });
              addLog(`🏆 Этаж ${abyssData.floor} пройден! +${floorRewards.souls} душ, +${floorRewards.runes} рун${bossArts.length > 0 ? ` + 🎁 ${bossArts.length} арт.` : ''}${materialText}`, 'buff');
            }
          } else if (arenaData) {
            const currentRating = arenaState.arenaRating;
            const rank = getArenaRank(currentRating);
            processArenaVictory(arenaData.opponentId, ARENA_WIN_RATING, rank.tier);
            recordArenaBattle({
              opponentId: arenaData.opponentId,
              opponentName: arenaData.opponentName || '',
              attackerRating: currentRating,
              defenderRating: arenaData.opponentRating || 0,
              ratingChange: ARENA_WIN_RATING,
              result: 'win', ...getArenaSquads(),
            });
          } else if (templeData) {
            const deadAllies = finalUnits.filter(u => !u.isEnemy && u.currentHp <= 0).length;
            const totalDeaths = allyDeathsRef.current + deadAllies;
            allyDeathsRef.current = totalDeaths;
            let templeStars = 1;
            if (totalDeaths === 0) templeStars = 2;
            if (totalDeaths === 0 && squadSizeRef.current <= 2) templeStars = 3;
            setEarnedStars(templeStars);
            updateTempleProgress(templeData.temple.id, templeData.floor, templeStars);

            const starMultiplier = 1 + (templeStars - 1) * 0.25;
            const droppedRunes = rollRuneReward(templeData.temple, templeData.floor);
            addDivineRunes(templeData.temple.element, droppedRunes.length, templeData.floorData.runeRarity);
            const vipMultT = isVipActive() ? 1.5 : 1;
            const souls = Math.floor((30 + 1 * 2) * (1 + templeData.floor * 0.3) * starMultiplier * vipMultT);
            const exp = Math.floor((50 + 1 * 3) * (1 + templeData.floor * 0.3) * starMultiplier);
            const r: BattleRewards = {
              souls, exp, artifactDrop: false, droppedArtifacts: [],
              templeRunes: { count: droppedRunes.length, runeName: templeData.temple.runeName, runeRarity: templeData.floorData.runeRarity, runeIcon: templeData.temple.runeIcon, element: templeData.temple.element as string },
            };
            setRewards(r);
            addSouls(r.souls);
            addXpToSquad(r.exp);
          }
          setBattleState('victory');
          setUnits(finalUnits);
          return;
        }
        if (alivePlayers.length === 0) {
          if (arenaData) {
            const currentRating = arenaState.arenaRating;
            updateArenaRating(-ARENA_LOSS_RATING);
            recordArenaBattle({
              opponentId: arenaData.opponentId,
              opponentName: arenaData.opponentName || '',
              attackerRating: currentRating,
              defenderRating: arenaData.opponentRating || 0,
              ratingChange: -ARENA_LOSS_RATING,
              result: 'loss', ...getArenaSquads(),
            });
          }
          setBattleState('defeat');
          setUnits(finalUnits);
          return;
        }
      }
    }

    // Rebuild predicted turn order for display
    const predicted = predictTurnOrder(finalUnits, 8);
    setUnits(finalUnits);
    setTurnOrder([nextUnitIdx, ...predicted]);
    turnOrderRef.current = [nextUnitIdx, ...predicted];
    setCurrentTurnIndex(0);
    setSelectedSkill(null);
    setTurnTimer(60);
    // Count player turns only
    if (!finalUnits[nextUnitIdx]?.isEnemy) {
      setTurnCount(prev => prev + 1);
      turnCountRef.current += 1;
    }
  }, [processUnitEffects, addLog, arenaData, arenaState.arenaRating, processArenaVictory, updateArenaRating, recordArenaBattle, getArenaSquads, campaignData, campaignProgress, templeData, addArtifacts, addSouls, addRunes, addXpToSquad, addDivineRunes, updateCampaignProgress]);

  /* Execute a self-only buff (no target needed) */
  const executeSelfBuff = useCallback((attackerIdx: number, skillIdx: number) => {
    const attacker = unitsRef.current[attackerIdx];
    if (!attacker) return;
    const skill = attacker.champion.skills[skillIdx];

    let newUnits = unitsRef.current.map((u, i) =>
      i === attackerIdx ? applyCooldown(u, skillIdx) : u
    );

    const icon = ELEMENT_ICONS[attacker.champion.element];
    addLog(`${icon} ${attacker.champion.name} использует ${skill.name}`, 'buff');

    newUnits = applySkillEffects(skill, attackerIdx, attackerIdx, newUnits, addLog);
    advanceTurn(newUnits);
  }, [advanceTurn, addLog, applySkillEffects]);

  /* execute attack */
  const executeAttack = useCallback((
    attackerIdx: number,
    defenderIdx: number,
    skillIdx: number
  ) => {
    const attacker = unitsRef.current[attackerIdx];
    const defender = unitsRef.current[defenderIdx];
    if (!attacker || !defender) return;

    const skill = attacker.champion.skills[skillIdx];

    // If it's a buff or heal skill targeting self/all_allies, redirect to selfBuff
    if ((skill.type === 'buff' || skill.type === 'heal') && skill.effects?.every(e => e.target === 'self' || e.target === 'all_allies')) {
      executeSelfBuff(attackerIdx, skillIdx);
      return;
    }

    const result = calculateDamage(
      attacker.champion, defender.champion, skill,
      undefined, undefined,
      attacker, defender
    );

    // visual effects
    setVisualEffects(prev => ({
      ...prev,
      [`hit-${defender.id}`]: true,
      [`crit-${defender.id}`]: result.isCrit,
      [`advantage-${defender.id}`]: result.elementAdvantage,
    }));
    setTimeout(() => {
      setVisualEffects(prev => {
        const c = { ...prev };
        delete c[`hit-${defender.id}`];
        delete c[`crit-${defender.id}`];
        delete c[`advantage-${defender.id}`];
        return c;
      });
    }, 1000);

    const icon = ELEMENT_ICONS[attacker.champion.element];
    // AOE: damage all enemies
    let newUnits: BattleUnit[];
    if (skill.type === 'aoe') {
      const enemies = unitsRef.current
        .map((u, i) => ({ u, i }))
        .filter(({ u }) => u.isEnemy !== attacker.isEnemy && u.currentHp > 0);

      newUnits = [...unitsRef.current];
      for (const { u: enemy, i: eIdx } of enemies) {
        const res = eIdx === defenderIdx ? result : calculateDamage(
          attacker.champion, enemy.champion, skill, undefined, undefined, attacker, enemy
        );
        const shieldResult = applyDamageWithShield(newUnits[eIdx], res.finalDamage);
        newUnits[eIdx] = shieldResult.unit;
        spawnFloat(enemy.id, res.finalDamage, res.isCrit ? 'crit' : 'damage');
        // Track stats: attacker deals damage, enemy takes damage
        if (!attacker.isEnemy) trackStat(attacker.id, 'damageDealt', res.finalDamage);
        if (!enemy.isEnemy) {
          trackStat(enemy.id, 'damageTaken', res.finalDamage);
          if (shieldResult.shieldAbsorbed > 0) trackStat(enemy.id, 'damageBlocked', shieldResult.shieldAbsorbed);
        }
        if (shieldResult.wokenUp) addLog(`💤→⚡ ${enemy.champion.name} просыпается от удара!`, 'normal');
        if (shieldResult.shieldAbsorbed > 0) addLog(`🛡✨ ${enemy.champion.name}: щит поглотил ${shieldResult.shieldAbsorbed} урона`, 'buff');
        // Reflect Damage on AoE
        if (shieldResult.reflectDamage > 0) {
          const reflResult = applyDamageWithShield(newUnits[attackerIdx], shieldResult.reflectDamage);
          newUnits[attackerIdx] = reflResult.unit;
          addLog(`🔄 ${enemy.champion.name} отражает ${shieldResult.reflectDamage} урона на ${attacker.champion.name}`, 'debuff');
          spawnFloat(attacker.id, shieldResult.reflectDamage, 'damage');
          if (!attacker.isEnemy) trackStat(attacker.id, 'damageTaken', shieldResult.reflectDamage);
        }
        if (eIdx !== defenderIdx) {
          const extraTag = res.isCrit ? ' 💥КРИТ!' : res.elementAdvantage ? ' ✨элем.' : '';
          addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ${enemy.champion.name} (-${res.finalDamage})${extraTag}`,
            res.isCrit ? 'crit' : res.elementAdvantage ? 'advantage' : 'normal');
          if (newUnits[eIdx].currentHp <= 0 && enemy.currentHp > 0) {
            addLog(`💀 ${enemy.champion.name} повержен!`, 'debuff');
          }
        }
      }
      newUnits[attackerIdx] = applyCooldown(newUnits[attackerIdx], skillIdx);
    } else {
      // Single target: damage + cooldown
      newUnits = [...unitsRef.current];
      if (defenderIdx >= 0 && defenderIdx < newUnits.length) {
        // Ally Protection: redirect portion of damage to protector
        const protectorIdx = findAllyProtector(newUnits, defenderIdx);
        let dmgToDefender = result.finalDamage;
        if (protectorIdx >= 0) {
          const protEff = newUnits[protectorIdx].effects.find(e => e.type === 'ally_protection');
          const transferPct = (protEff?.value ?? 50) / 100;
          const transferred = Math.floor(result.finalDamage * transferPct);
          dmgToDefender = result.finalDamage - transferred;
          const protResult = applyDamageWithShield(newUnits[protectorIdx], transferred);
          newUnits[protectorIdx] = protResult.unit;
          addLog(`🛡️ ${newUnits[protectorIdx].champion.name} принимает ${transferred} урона за ${defender.champion.name}`, 'buff');
          spawnFloat(newUnits[protectorIdx].id, transferred, 'damage');
          if (!newUnits[protectorIdx].isEnemy) trackStat(newUnits[protectorIdx].id, 'damageTaken', transferred);
        }

        // Дренос: absorb portion of ally damage
        if (!defender.isEnemy) {
          for (let di = 0; di < newUnits.length; di++) {
            if (di === defenderIdx || newUnits[di].isEnemy || newUnits[di].currentHp <= 0) continue;
            const dArts = getHeroArtifacts(newUnits[di].id);
            const { absorbPct } = getDrenosIndrikBonus(dArts);
            if (absorbPct > 0) {
              const absorbed = Math.floor(dmgToDefender * absorbPct);
              if (absorbed > 0) {
                dmgToDefender -= absorbed;
                const absResult = applyDamageWithShield(newUnits[di], absorbed);
                newUnits[di] = absResult.unit;
                addLog(`🌿 ${newUnits[di].champion.name} поглощает ${absorbed} урона за ${defender.champion.name} (Дренос)`, 'buff');
                spawnFloat(newUnits[di].id, absorbed, 'damage');
                trackStat(newUnits[di].id, 'damageTaken', absorbed);
              }
              break; // only one Дренос holder absorbs
            }
          }
        }

        const shieldResult = applyDamageWithShield(newUnits[defenderIdx], dmgToDefender);
        newUnits[defenderIdx] = shieldResult.unit;
        if (shieldResult.wokenUp) addLog(`💤→⚡ ${defender.champion.name} просыпается от удара!`, 'normal');
        // Track: attacker deals, defender takes
        if (!attacker.isEnemy) trackStat(attacker.id, 'damageDealt', result.finalDamage);
        if (!defender.isEnemy) {
          trackStat(defender.id, 'damageTaken', dmgToDefender);
          if (shieldResult.shieldAbsorbed > 0) trackStat(defender.id, 'damageBlocked', shieldResult.shieldAbsorbed);
        }

        // Reflect Damage: deal reflected damage back to attacker
        if (shieldResult.reflectDamage > 0) {
          const reflResult = applyDamageWithShield(newUnits[attackerIdx], shieldResult.reflectDamage);
          newUnits[attackerIdx] = reflResult.unit;
          addLog(`🔄 ${defender.champion.name} отражает ${shieldResult.reflectDamage} урона на ${attacker.champion.name}`, 'debuff');
          spawnFloat(attacker.id, shieldResult.reflectDamage, 'damage');
          if (!attacker.isEnemy) trackStat(attacker.id, 'damageTaken', shieldResult.reflectDamage);
        }
      }
      newUnits[attackerIdx] = applyCooldown(newUnits[attackerIdx], skillIdx);
    }

    // Floating numbers for single-target
    if (skill.type !== 'aoe') {
      if (result.isGlancing) {
        spawnFloat(defender.id, result.finalDamage, 'damage');
      } else {
        spawnFloat(defender.id, result.finalDamage, result.isCrit ? 'crit' : 'damage');
      }
    }

    // log damage
    const extra = result.isGlancing ? ' ⚡СЛАБЫЙ' : result.isCrit ? ' 💥КРИТ!' : result.elementAdvantage ? ' ✨элем.' : '';
    addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ${defender.champion.name} (-${result.finalDamage})${extra}`,
      result.isCrit ? 'crit' : result.elementAdvantage ? 'advantage' : 'normal');

    // Apply skill effects (glancing blocks debuffs)
    newUnits = applySkillEffects(skill, attackerIdx, defenderIdx, newUnits, addLog, result.isGlancing);

    // Frost Morena set: chance to apply Freeze on attack
    if (!attacker.isEnemy && result.finalDamage > 0) {
      const atkArts = getHeroArtifacts(attacker.id);
      const { freezeOnAttackChance } = getFrostMorenaBonus(atkArts);
      if (freezeOnAttackChance > 0) {
        const freezeTargets = skill.type === 'aoe'
          ? newUnits.map((u, i) => ({ u, i })).filter(({ u }) => u.isEnemy && u.currentHp > 0)
          : [{ u: newUnits[defenderIdx], i: defenderIdx }];
        for (const { u: target, i: tIdx } of freezeTargets) {
          if (target.currentHp <= 0) continue;
          if (Math.random() < freezeOnAttackChance) {
            const freezeEff: EffectApplication = { type: 'freeze', value: 0, duration: 1, chance: 1, target: 'enemy' };
            const accMult = getStatMultiplier(newUnits[attackerIdx], 'accuracy');
            const effAcc = newUnits[attackerIdx].champion.baseStats.accuracy * accMult;
            const res = applyEffect(newUnits[tIdx], freezeEff, `frost-morena-${attacker.id}`, effAcc);
            newUnits[tIdx] = res.unit;
            if (res.applied) {
              addLog(`❄️ ${target.champion.name}: Ледяная накладывает Заморозку!`, 'debuff');
            } else if (res.resisted) {
              addLog(`🛡️ ${target.champion.name} сопротивляется Заморозке Ледяной Морены!`, 'normal');
            }
          }
        }
      }
    }

    // Lifesteal: check if attacker has lifesteal buff (from any source), heal for % of damage dealt
    if (result.finalDamage > 0) {
      const lsBuff = newUnits[attackerIdx].effects.find(e => e.type === 'lifesteal');
      if (lsBuff) {
        const healAmt = Math.floor(result.finalDamage * (lsBuff.value ?? 50) / 100);
        const atk = newUnits[attackerIdx];
        const actualHeal = Math.min(healAmt, atk.maxHp - atk.currentHp);
        newUnits[attackerIdx] = { ...atk, currentHp: Math.min(atk.maxHp, atk.currentHp + healAmt) };
        if (actualHeal > 0) {
          addLog(`🧛 ${atk.champion.name} крадёт ${actualHeal} HP`, 'heal');
          spawnFloat(atk.id, actualHeal, 'heal');
          if (!atk.isEnemy) trackStat(atk.id, 'healingDone', actualHeal);
        }
      }
    }

    // Counterattack check: if defender has counterattack effect and is alive
    if (newUnits[defenderIdx].currentHp > 0) {
      const hasCounter = newUnits[defenderIdx].effects.some(e => e.type === 'counterattack');
      if (hasCounter) {
        const counterSkill = newUnits[defenderIdx].champion.skills[0]; // basic attack
        const counterResult = calculateDamage(
          newUnits[defenderIdx].champion, newUnits[attackerIdx].champion, counterSkill,
          undefined, undefined,
          newUnits[defenderIdx], newUnits[attackerIdx]
        );
        // Counterattack deals 75% of normal damage (RAID mechanic)
        const counterDmg = Math.floor(counterResult.finalDamage * 0.75);
        const counterShield = applyDamageWithShield(newUnits[attackerIdx], counterDmg);
        newUnits = newUnits.map((u, i) =>
          i === attackerIdx ? counterShield.unit : u
        );
        if (counterShield.wokenUp) addLog(`💤→⚡ ${attacker.champion.name} просыпается от контратаки!`, 'normal');
        const cIcon = ELEMENT_ICONS[newUnits[defenderIdx].champion.element];
        addLog(`↩️ ${newUnits[defenderIdx].champion.name} контратакует ${attacker.champion.name} (-${counterDmg}, 75%)${counterResult.isCrit ? ' 💥КРИТ!' : ''}`, 'normal');
        spawnFloat(attacker.id, counterDmg, counterResult.isCrit ? 'crit' : 'damage');
        if (!newUnits[defenderIdx].isEnemy) trackStat(newUnits[defenderIdx].id, 'damageDealt', counterDmg);
        if (!attacker.isEnemy) trackStat(attacker.id, 'damageTaken', counterDmg);
        // Track counterattack damage to world boss
        if (attacker.isEnemy && worldBossData && counterDmg > 0) {
          setWorldBossTotalDamage(prev => prev + counterDmg);
          worldBossTotalDamageRef.current += counterDmg;
        }
      }
    }

    // World boss: boss never dies, track damage dealt
    if (worldBossData) {
      // For Hydra: heads are regular units, damage is tracked normally
      // For Cerberus: boss has infinite HP
      if (isHydraBattle) {
        // Track actual damage dealt to hydra heads
        const actualDmg = result.finalDamage;
        if (actualDmg > 0) {
          setWorldBossTotalDamage(prev => prev + actualDmg);
          worldBossTotalDamageRef.current += actualDmg;
        }

        // Sync dead heads to HydraHeadsState for regrowth tracking
        const deadEnemyHeads = newUnits.filter(u => u.isEnemy && u.currentHp <= 0);
        if (deadEnemyHeads.length > 0) {
          const updatedHeadsState = { ...hydraHeadsRef.current };
          const updatedHeads = updatedHeadsState.heads.map(h => {
            if (!h.isAlive) return h; // already dead
            // Find matching BattleUnit for this head
            const matchingUnit = newUnits.find(u => u.isEnemy && u.currentHp <= 0 && u.champion.id === `hydra-head-${h.headId}`);
            if (matchingUnit) {
              return { ...h, isAlive: false, currentHp: 0, regrowthTimer: 2 };
            }
            // Sync HP for alive heads
            const aliveUnit = newUnits.find(u => u.isEnemy && u.currentHp > 0 && u.champion.id === `hydra-head-${h.headId}`);
            if (aliveUnit) {
              return { ...h, currentHp: aliveUnit.currentHp };
            }
            return h;
          });
          updatedHeadsState.heads = updatedHeads;
          updatedHeadsState.totalDecapitations = updatedHeads.filter(h => !h.isAlive).length;
          setHydraHeads(updatedHeadsState);
          hydraHeadsRef.current = updatedHeadsState;
        }
      } else {
        // Cerberus: track damage, don't reset HP — boss can die and rebirth
        const actualDmg = result.finalDamage;
        if (actualDmg > 0) {
          setWorldBossTotalDamage(prev => prev + actualDmg);
          worldBossTotalDamageRef.current += actualDmg;
        }
      }
    }

    // check win/lose
    const aliveEnemies = newUnits.filter(u => u.isEnemy && u.currentHp > 0);
    const alivePlayers = newUnits.filter(u => !u.isEnemy && u.currentHp > 0);

    // Hydra: all heads dead → Rebirth with escalation
    if (aliveEnemies.length === 0 && isHydraBattle) {
      const newRound = hydraRoundRef.current + 1;
      hydraRoundRef.current = newRound;
      setHydraRound(newRound);
      addLog(`🔥🐉 Все головы отсечены! Возрождение ${newRound} — Гидра возрождается сильнее! (+${Math.round((newRound - 1) * HYDRA_ROUND_ATK_ESCALATION * 100)}% АТК, +${Math.round((newRound - 1) * HYDRA_ROUND_HP_ESCALATION * 100)}% ЗДР, +${Math.round((newRound - 1) * HYDRA_ROUND_SPD_ESCALATION * 100)}% СКР)`, 'crit');

      // Spawn new random heads with escalated stats
      const { active: newActive, reserve: newReserve } = pickStartingHeads();
      const headChampions = createHydraHeadChampions(newActive, newRound);
      const newHeadUnits: BattleUnit[] = headChampions.map((hc, i) => ({
        id: `enemy-hydra-${hc.id}-${newRound}-${i}`,
        champion: hc.champion as any,
        currentHp: hc.maxHp,
        maxHp: hc.maxHp,
        isEnemy: true,
        skillCooldowns: hc.champion.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
      }));

      // Reset HydraHeadsState for new round
      const newHeadsState: HydraHeadsState = {
        heads: newActive.map((headId, i) => ({
          headId,
          currentHp: headChampions[i].maxHp,
          maxHp: headChampions[i].maxHp,
          isAlive: true,
          regrowthTimer: -1,
          abilityCooldown: 0,
        })),
        totalDecapitations: 0,
        reservePool: newReserve,
      };
      setHydraHeads(newHeadsState);
      hydraHeadsRef.current = newHeadsState;

      // Replace dead enemies with new heads, keep players
      const playerUnitsAlive = newUnits.filter(u => !u.isEnemy);
      const allNewUnits = [...playerUnitsAlive, ...newHeadUnits];

      // Rebuild turn order
      const { nextUnitIndex: nextIdx, updatedMeters } = tickToNextTurn(allNewUnits);
      allNewUnits.forEach((u, i) => { u.turnMeter = updatedMeters[i]; });
      const predicted = predictTurnOrder(allNewUnits, 8);
      const newOrder = [nextIdx, ...predicted];

      setUnits(allNewUnits);
      unitsRef.current = allNewUnits;
      setTurnOrder(newOrder);
      turnOrderRef.current = newOrder;
      setCurrentTurnIndex(0);
      setSelectedSkill(null);

      const headNames = newHeadUnits.map(u => u.champion.name).join(', ');
      addLog(`🐉 Новые головы: ${headNames}`, 'buff');
      return;
    }

    // Cerberus: boss dies → Rebirth from ashes with escalated stats
    if (aliveEnemies.length === 0 && worldBossData && !isHydraBattle) {
      const newRebirth = cerberusRebirthRef.current + 1;
      cerberusRebirthRef.current = newRebirth;
      setCerberusRebirth(newRebirth);
      const scaledStats = getScaledCerberusStats(CERBERUS_BOSS.baseStats, newRebirth - 1);
      addLog(`🔥 Цербер погибает и возрождается из пепла! Возрождение ${newRebirth} (+${Math.round((newRebirth - 1) * CERBERUS_REBIRTH_ATK * 100)}% АТК, +${Math.round((newRebirth - 1) * CERBERUS_REBIRTH_HP * 100)}% ЗДР, +${Math.round((newRebirth - 1) * CERBERUS_REBIRTH_SPD * 100)}% СКР)`, 'crit');

      const rebirthUnit: BattleUnit = {
        id: `enemy-cerberus-rebirth-${newRebirth}`,
        champion: {
          ...newUnits.find(u => u.isEnemy)!.champion,
          baseStats: scaledStats,
        },
        currentHp: scaledStats.hp,
        maxHp: scaledStats.hp,
        isEnemy: true,
        skillCooldowns: CERBERUS_BOSS.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
        immuneEffects: CERBERUS_BOSS.immuneEffects,
      };

      const playerUnitsAlive = newUnits.filter(u => !u.isEnemy);
      const allNewUnits = [...playerUnitsAlive, rebirthUnit];
      const { nextUnitIndex: nextIdx, updatedMeters } = tickToNextTurn(allNewUnits);
      allNewUnits.forEach((u, i) => { u.turnMeter = updatedMeters[i]; });
      const predicted = predictTurnOrder(allNewUnits, 8);

      setUnits(allNewUnits);
      unitsRef.current = allNewUnits;
      setTurnOrder([nextIdx, ...predicted]);
      turnOrderRef.current = [nextIdx, ...predicted];
      setCurrentTurnIndex(0);
      setSelectedSkill(null);
      // Reset world boss round for new cycle
      worldBossRoundRef.current = 1;
      setWorldBossRound(1);
      return;
    }

    if (aliveEnemies.length === 0 && !worldBossData) {
      // Campaign/Abyss wave check: if more waves remain, spawn next wave
      if ((campaignData?.waves || abyssData?.waves) && campaignWavesRef.current && currentWaveRef.current < (campaignWavesRef.current.length - 1)) {
        const nextWaveIdx = currentWaveRef.current + 1;
        const waveUnits = spawnNextWave(newUnits, nextWaveIdx);
        if (waveUnits) {
          setCurrentWave(nextWaveIdx);
          currentWaveRef.current = nextWaveIdx;
          const isBossWave = campaignData?.stage?.isBoss && nextWaveIdx === campaignWavesRef.current.length - 1;
          const isAbyssBossWave = abyssData && getBossForFloor(abyssData.floor) && nextWaveIdx === campaignWavesRef.current.length - 1;
          addLog(`🔔 Раунд ${nextWaveIdx + 1}/${campaignWavesRef.current.length}!${(isBossWave || isAbyssBossWave) ? ' ⚠️ БОСС!' : ''}`, 'buff');
          // Rebuild turn order with new units
          const { nextUnitIndex: waveFirst2, updatedMeters: waveMeters2 } = tickToNextTurn(waveUnits);
          waveUnits.forEach((wu, wi) => { wu.turnMeter = waveMeters2[wi]; });
          const wavePred2 = predictTurnOrder(waveUnits, 8);
          const order = [waveFirst2, ...wavePred2];
          // Re-apply Stone Beetle immunity on wave start
          waveUnits.forEach((wu, wi) => {
            if (wu.isEnemy) return;
            const heroArts = getHeroArtifacts(wu.id);
            const beetleCount = heroArts.filter(a => a.set === 'Каменный Жук').length;
            if (beetleCount >= 3) {
              const dur = beetleCount >= 9 ? 3 : 2;
              const { unit: u } = applyEffect(wu, { type: 'block_debuffs', value: 0, duration: dur, chance: 1, target: 'self' }, 'stone-beetle-set');
              waveUnits[wi] = u;
            }
          });
          setUnits(waveUnits);
          unitsRef.current = waveUnits;
          setTurnOrder(order);
          turnOrderRef.current = order;
          setCurrentTurnIndex(0);
          setSelectedSkill(null);
          setTurnTimer(60);
          return;
        }
      }

      // Count ally deaths
      const deadAllies = newUnits.filter(u => !u.isEnemy && u.currentHp <= 0).length;
      const totalDeaths = allyDeathsRef.current + deadAllies;
      allyDeathsRef.current = totalDeaths;
      setAllyDeaths(totalDeaths);

      if (campaignData?.stage) {
        const stage = campaignData.stage;
        const diff = campaignData.difficulty as import('@/data/campaignStages').Difficulty;
        const isFirst = !((campaignProgress[diff]?.[stage.chapter]?.highestStage ?? 0) >= stage.stageNumber);
        const stageRewards = isFirst ? stage.rewards.firstClear : stage.rewards.repeat;
        
        // Calculate stars using refs for accurate values
        const conditions = campaignData.stage.starConditions as StarCondition[] | undefined;
        const stars = conditions ? calculateBattleStars(conditions, true, totalDeaths, turnCountRef.current, squadSizeRef.current) : 1;
        setEarnedStars(stars);
        
        // Bonus rewards for stars
        const starMultiplier = 1 + (stars - 1) * 0.25; // 1.0x, 1.25x, 1.5x
        const r = calculateRewards(1);
        const vipMult2 = isVipActive() ? 1.5 : 1;
        r.souls = Math.floor(stageRewards.souls * starMultiplier * vipMult2);
        r.exp = Math.floor(stageRewards.exp * starMultiplier);
        
        // Campaign-specific artifact drops (chapter determines set, stage determines slot, difficulty determines rarity)
        const campaignArtifacts = generateCampaignArtifacts(stage.chapter, stage.stageNumber, diff);
        r.droppedArtifacts = campaignArtifacts;
        r.artifactDrop = campaignArtifacts.length > 0;
        r.artifactRarity = campaignArtifacts[0]?.rarity;
        r.runes = Math.floor(stageRewards.runes * starMultiplier * vipMult2);
        setRewards(r);
        if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
        addSouls(r.souls);
        addRunes(r.runes);
        addXpToSquad(r.exp);
        updateCampaignProgress(diff, stage.chapter, stage.stageNumber, stage.id, stars);
        addLog(`🏆 Победа! ⭐${stars}/3 +${r.souls} душ, +${Math.floor(stageRewards.runes * starMultiplier)} рун, +${r.exp} опыта${isFirst ? ' (первое прохождение!)' : ''}`, 'buff');
      } else if (abyssData) {
        const progress = refreshKeysIfNeeded(player.abyssProgress);
        if (abyssData.secretRoomId) {
          const room = SECRET_ROOMS.find(r => r.id === abyssData.secretRoomId);
          if (room) {
            const newCleared = [...(progress.secretRoomsCleared[abyssData.difficulty] ?? []), room.id];
            updateAbyssProgress({ ...progress, secretRoomsCleared: { ...progress.secretRoomsCleared, [abyssData.difficulty]: newCleared } });
            addSouls(room.rewards.souls);
            addRunes(room.rewards.runes);
            const setName = getSecretRoomSetReward(room);
            const droppedArtifacts: any[] = [];
            if (setName) {
              const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
              const rarity = abyssData.difficulty === 'hard' ? 'Калиновый' : 'Сказанный';
              const stars = abyssData.difficulty === 'hard' ? (Math.random() < 0.5 ? 4 : 5) : (Math.random() < 0.6 ? 3 : 4);
              droppedArtifacts.push(generateArtifact(rarity as any, 0, stars, setName as any, slot));
              if (droppedArtifacts.length > 0) addArtifacts(droppedArtifacts);
            }
            const r: BattleRewards = { souls: room.rewards.souls, exp: 0, artifactDrop: droppedArtifacts.length > 0, droppedArtifacts, runes: room.rewards.runes };
            setRewards(r);
            addLog(`🚪 Потайная комната «${room.name}» пройдена! +${room.rewards.souls} душ, +${room.rewards.runes} рун${setName ? ` + 🛡️ ${setName}` : ''}`, 'buff');
          }
        } else if (abyssData.isBossRefight) {
          const boss = getBossForFloor(abyssData.floor);
          const materialDrop2 = boss ? (abyssData.difficulty === 'hard' ? 4 : 2) : 0;
          const newProgress = {
            ...progress,
            silverKeys: progress.silverKeys - 1,
            bossKills: boss
              ? { ...progress.bossKills, [boss.id]: (progress.bossKills[boss.id] ?? 0) + 1 }
              : progress.bossKills,
            materials: boss
              ? { ...(progress.materials ?? {}), [boss.id]: ((progress.materials ?? {})[boss.id] ?? 0) + materialDrop2 }
              : (progress.materials ?? {}),
          };
          updateAbyssProgress(newProgress);
          const floorRewards = getFloorRewards(abyssData.floor, abyssData.difficulty);
          addSouls(Math.floor(floorRewards.souls * 0.5));
          const bossArts = boss ? generateAbyssBossDrop(boss.id, abyssData.difficulty) : [];
          if (bossArts.length > 0) addArtifacts(bossArts);
          const materialText2 = boss && materialDrop2 > 0 ? ` + ${materialDrop2}x ${boss.material}` : '';
          const r: BattleRewards = {
            souls: Math.floor(floorRewards.souls * 0.5), exp: 0,
            artifactDrop: bossArts.length > 0, droppedArtifacts: bossArts, runes: 0,
            bossMaterial: boss && materialDrop2 > 0 ? { name: boss.material, imageUrl: boss.materialImageUrl, count: materialDrop2 } : undefined,
          };
          setRewards(r);
          addLog(`🔁 Босс повержен повторно! +${Math.floor(floorRewards.souls * 0.5)} душ${bossArts.length > 0 ? ` + 🎁 ${bossArts.length} арт.` : ''}${materialText2}`, 'buff');
        } else {
          const floorRewards = getFloorRewards(abyssData.floor, abyssData.difficulty);
          const boss = getBossForFloor(abyssData.floor);
          const materialDrop2 = boss ? (abyssData.difficulty === 'hard' ? 4 : 2) : 0;
          const newProgress = {
            ...progress,
            currentFloor: { ...progress.currentFloor, [abyssData.difficulty]: abyssData.floor },
            goldKeys: progress.goldKeys - 1,
            bossKills: boss
              ? { ...progress.bossKills, [boss.id]: (progress.bossKills[boss.id] ?? 0) + 1 }
              : progress.bossKills,
            materials: boss
              ? { ...(progress.materials ?? {}), [boss.id]: ((progress.materials ?? {})[boss.id] ?? 0) + materialDrop2 }
              : (progress.materials ?? {}),
          };
          updateAbyssProgress(newProgress);
          addSouls(floorRewards.souls);
          addRunes(floorRewards.runes);
          const bossArts = boss ? generateAbyssBossDrop(boss.id, abyssData.difficulty) : [];
          if (bossArts.length > 0) addArtifacts(bossArts);
          const materialText2 = boss && materialDrop2 > 0 ? ` + ${materialDrop2}x ${boss.material}` : '';
          const r: BattleRewards = {
            souls: floorRewards.souls, exp: 0,
            artifactDrop: bossArts.length > 0, droppedArtifacts: bossArts,
            runes: floorRewards.runes,
            bossMaterial: boss && materialDrop2 > 0 ? { name: boss.material, imageUrl: boss.materialImageUrl, count: materialDrop2 } : undefined,
          };
          setRewards(r);
          addLog(`🏆 Этаж ${abyssData.floor} пройден! +${floorRewards.souls} душ, +${floorRewards.runes} рун${bossArts.length > 0 ? ` + 🎁 ${bossArts.length} арт.` : ''}${materialText2}`, 'buff');
        }
      } else if (templeData) {
        // Temple battle rewards with star calculation
        const deadAllies = newUnits.filter(u => !u.isEnemy && u.currentHp <= 0).length;
        const totalDeaths = allyDeathsRef.current + deadAllies;
        allyDeathsRef.current = totalDeaths;
        // Star conditions: 1=win, 2=no deaths, 3=solo/duo no deaths
        let templeStars = 1;
        if (totalDeaths === 0) templeStars = 2;
        if (totalDeaths === 0 && squadSizeRef.current <= 2) templeStars = 3;
        setEarnedStars(templeStars);
        updateTempleProgress(templeData.temple.id, templeData.floor, templeStars);

        const starMultiplier = 1 + (templeStars - 1) * 0.25;
        const droppedRunes = rollRuneReward(templeData.temple, templeData.floor);
        addDivineRunes(templeData.temple.element, droppedRunes.length, templeData.floorData.runeRarity);
        const vipMultT2 = isVipActive() ? 1.5 : 1;
        const souls = Math.floor((30 + 1 * 2) * (1 + templeData.floor * 0.3) * starMultiplier * vipMultT2);
        const exp = Math.floor((50 + 1 * 3) * (1 + templeData.floor * 0.3) * starMultiplier);
        const r: BattleRewards = {
          souls, exp, artifactDrop: false, droppedArtifacts: [],
          templeRunes: { count: droppedRunes.length, runeName: templeData.temple.runeName, runeRarity: templeData.floorData.runeRarity, runeIcon: templeData.temple.runeIcon, element: templeData.temple.element as string },
        };
        setRewards(r);
        addSouls(r.souls);
        addXpToSquad(r.exp);
        addLog(`🏆 Победа! ⭐${templeStars}/3 +${droppedRunes.length} ${templeData.temple.runeName} (${templeData.floorData.runeRarity}) +${r.souls} душ, +${r.exp} опыта`, 'buff');
      } else if (arenaData) {
        // Arena battle rewards — single atomic update
        const currentRating = arenaState.arenaRating;
        const rank = getArenaRank(currentRating);
        processArenaVictory(arenaData.opponentId, ARENA_WIN_RATING, rank.tier);
        const r: BattleRewards = {
          souls: 0, exp: 0,
          artifactDrop: false, droppedArtifacts: [],
        };
        setRewards(r);
        addLog(`🏆 Победа на Арене! +${ARENA_WIN_RATING} очей, +1 монета (${rank.tier})`, 'buff');
        recordArenaBattle({
          opponentId: arenaData.opponentId,
          opponentName: arenaData.opponentName || '',
          attackerRating: currentRating,
          defenderRating: arenaData.opponentRating || 0,
          ratingChange: ARENA_WIN_RATING,
          result: 'win', ...getArenaSquads(),
        });
      } else {
        const r = calculateRewards(1);
        setRewards(r);
        if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
        addSouls(r.souls);
        addXpToSquad(r.exp);
        addLog(`🏆 Победа! +${r.souls} душ, +${r.exp} опыта${r.droppedArtifacts.length > 0 ? ` +${r.droppedArtifacts.length} артефакт(ов)` : ''}`, 'buff');
      }
      setUnits(newUnits);
      setBattleState('victory');
      return;
    }
    if (alivePlayers.length === 0) {
      if (worldBossData) {
        const totalDmg = worldBossTotalDamageRef.current || worldBossTotalDamage;
        const isCerberus = worldBossData.bossId === 'cerberus';
        const bossId = isCerberus ? 'cerberus' : 'hydra';
        const bossName = isCerberus ? 'Цербер' : 'Гидра';
        
        if (isCerberus) {
          recordCerberusDamage(totalDmg);
        } else {
          recordWorldBossDamage(totalDmg);
        }
        addRunes(BASE_ATTACK_REWARD.runes);
        addSouls(BASE_ATTACK_REWARD.souls);
        const r: BattleRewards = {
          souls: BASE_ATTACK_REWARD.souls, exp: 0,
          artifactDrop: false, droppedArtifacts: [],
        };
        setRewards(r);
        addLog(`🐉 ${bossName} повержен! Нанесено ${totalDmg.toLocaleString()} урона. +${BASE_ATTACK_REWARD.runes} рун, +${BASE_ATTACK_REWARD.souls} душ`, 'buff');
        setUnits(newUnits);
        setBattleState('victory');
        // Sync to DB
        if (user && totalDmg > 0) {
          (async () => {
            try {
              const todayStr = new Date().toISOString().slice(0, 10);
              const { data: existing } = await supabase
                .from('world_boss_damage')
                .select('damage_total, damage_today, last_attack_date')
                .eq('user_id', user.id)
                .eq('boss_id', bossId)
                .maybeSingle();

              const isNewDay = !existing?.last_attack_date || existing.last_attack_date !== todayStr;
              const prevTotal = existing?.damage_total ?? 0;
              const prevToday = isNewDay ? 0 : (existing?.damage_today ?? 0);

              const { error } = await supabase.from('world_boss_damage').upsert({
                user_id: user.id,
                boss_id: bossId,
                damage_today: prevToday + totalDmg,
                damage_total: prevTotal + totalDmg,
                attacks_used: 1,
                last_attack_date: todayStr,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,boss_id' });
              if (error) console.error('World boss damage upsert error:', error);
            } catch (e) {
              console.error('World boss damage save failed:', e);
            }
          })();
        }
        return;
      }
      if (arenaData) {
        const currentRating = arenaState.arenaRating;
        updateArenaRating(-ARENA_LOSS_RATING);
        recordArenaBattle({
          opponentId: arenaData.opponentId,
          opponentName: arenaData.opponentName || '',
          attackerRating: currentRating,
          defenderRating: arenaData.opponentRating || 0,
          ratingChange: -ARENA_LOSS_RATING,
          result: 'loss', ...getArenaSquads(),
        });
      }
      addLog('💀 Поражение...', 'debuff');
      setUnits(newUnits);
      setBattleState('defeat');
      return;
    }

    advanceTurn(newUnits);
  }, [
    advanceTurn,
    addArtifacts,
    addDivineRunes,
    addLog,
    addRunes,
    addSouls,
    addXpToSquad,
    applySkillEffects,
    arenaData,
    arenaState.arenaRating,
    campaignData,
    campaignProgress,
    executeSelfBuff,
    processArenaVictory,
    recordArenaBattle,
    getArenaSquads,
    recordCerberusDamage,
    recordWorldBossDamage,
    templeData,
    updateArenaRating,
    updateCampaignProgress,
    worldBossData,
    worldBossTotalDamage,
  ]);

  /* Handle CC'd unit turn — skip it and tick CC durations */
  const handleCCTurn = useCallback(() => {
    if (!currentUnit || !isCC(currentUnit)) return;
    const ccEffect = currentUnit.effects.find(e => ['stun', 'freeze', 'sleep', 'fear', 'polymorph'].includes(e.type));
    if (ccEffect) {
      addLog(`⭐ ${currentUnit.champion.name} пропускает ход (${EFFECT_NAMES[ccEffect.type]})!`, 'debuff');
    }
    const unitIdx = turnOrder[currentTurnIndex];
    const updated = [...unitsRef.current];
    updated[unitIdx] = tickCCEffects(updated[unitIdx]);
    setUnits(updated);
    advanceTurn(updated);
  }, [currentUnit, turnOrder, currentTurnIndex, advanceTurn, addLog]);

  /* enemy AI turn */
  const difficultyTier = (() => {
    const d = campaignData?.difficulty;
    if (d === 'Навь') return 1;
    if (d === 'Правь') return 2;
    if (d === 'Ирий') return 3;
    return 0;
  })();

  useEffect(() => {
    if (battleState !== 'fighting' || !currentUnit || !currentUnit.isEnemy) return;
    if (currentUnit.currentHp <= 0) { advanceTurn(); return; }

    // If CC'd, skip turn
    if (isCC(currentUnit)) {
      const timer = setTimeout(() => handleCCTurn(), 600);
      return () => clearTimeout(timer);
    }

    // World Boss: track rounds (increment ref synchronously, update state for display)
    if (worldBossData) {
      if (isHydraBattle) {
        const newRound = worldBossRoundRef.current + 1;
        worldBossRoundRef.current = newRound;
        setWorldBossRound(newRound);
      }
      // NOTE: Cerberus round is incremented AFTER skill selection (inside setTimeout below)

      // Hydra swallow mechanic: tick on boss turn
      if (isHydraBattle) {
        const aliveHeadUnits = unitsRef.current.filter(u => u.isEnemy && u.currentHp > 0);
        const bossMaxHp = aliveHeadUnits.reduce((sum, u) => sum + u.maxHp, 0) || 999999999;
        const tickResult = tickSwallowMechanic(hydraSwallowRef.current, unitsRef.current, bossMaxHp);
        
        if (tickResult.justSwallowed) {
          const swallowedUnit = unitsRef.current.find(u => u.id === tickResult.justSwallowed);
          if (swallowedUnit) {
            addLog(`🐍 Гидра проглатывает ${swallowedUnit.champion.name}! (${tickResult.state.digestionTimer} ходов до переваривания)`, 'debuff');
            const newUnits = applySwallowToUnits(unitsRef.current, tickResult.justSwallowed!);
            setUnits(newUnits);
            unitsRef.current = newUnits;
          }
        }
        if (tickResult.justDigested) {
          const digestedUnit = unitsRef.current.find(u => u.id === tickResult.justDigested);
          if (digestedUnit) {
            addLog(`💀 ${digestedUnit.champion.name} переварен Гидрой! Герой потерян навсегда.`, 'debuff');
          }
        }
        if (tickResult.newMarkTarget) {
          const markedUnit = unitsRef.current.find(u => u.id === tickResult.newMarkTarget);
          if (markedUnit) {
            addLog(`🐍 Метка Гидры: ${markedUnit.champion.name} (${tickResult.state.markCountdown} ходов)`, 'debuff');
          }
        }
        setHydraSwallow(tickResult.state);
        hydraSwallowRef.current = tickResult.state;

        // Tick head regrowth timers
        const currentHeadsState = hydraHeadsRef.current;
        const totalBossMaxHp = unitsRef.current.filter(u => u.isEnemy).reduce((sum, u) => sum + u.maxHp, 0) || 999999999;
        const regrowthResult = tickHeadRegrowth(currentHeadsState, totalBossMaxHp);
        
        if (regrowthResult.regrownHeads.length > 0) {
          // Replace dead BattleUnits with regrown heads (don't add new ones — replace in place)
          const headChampions = createHydraHeadChampions(regrowthResult.regrownHeads, hydraRoundRef.current);
          const currentUnits = [...unitsRef.current];
          
          // Find dead enemy slots to replace
          const deadEnemyIndices = currentUnits
            .map((u, i) => (u.isEnemy && u.currentHp <= 0) ? i : -1)
            .filter(i => i >= 0);
          
          for (let j = 0; j < headChampions.length && j < deadEnemyIndices.length; j++) {
            const hc = headChampions[j];
            const headDef = ALL_HYDRA_HEADS.find(h => h.id === hc.id);
            const replaceIdx = deadEnemyIndices[j];
            currentUnits[replaceIdx] = {
              id: `enemy-hydra-${hc.id}-r${hydraRoundRef.current}-${Date.now()}-${j}`,
              champion: hc.champion as any,
              currentHp: hc.maxHp,
              maxHp: hc.maxHp,
              isEnemy: true,
              skillCooldowns: hc.champion.skills.map(() => 0),
              effects: [],
              turnMeter: 0,
              immuneEffects: HYDRA_BOSS.immuneEffects,
            };
            addLog(`🐉 Новая голова возродилась: ${headDef?.name ?? hc.id}!`, 'buff');
          }
          
          // Rebuild turn order
          const { nextUnitIndex: nextIdx, updatedMeters } = tickToNextTurn(currentUnits);
          currentUnits.forEach((u, i) => { u.turnMeter = updatedMeters[i]; });
          const predicted = predictTurnOrder(currentUnits, 8);
          const newOrder = [nextIdx, ...predicted];
          
          setUnits(currentUnits);
          unitsRef.current = currentUnits;
          setTurnOrder(newOrder);
          turnOrderRef.current = newOrder;
        }
        
        setHydraHeads(regrowthResult.state);
        hydraHeadsRef.current = regrowthResult.state;

        // Head abilities are now handled by the normal AI turn system
        // (each head is its own BattleUnit with skills)
      }
    }

    const delay = speedX2 ? 400 : 1000;
    const timer = setTimeout(() => {
      // Cerberus: use scripted skill rotation
      if (worldBossData && !isHydraBattle) {
        const skillIdx = getCerberusSkillForRound(worldBossRoundRef.current);
        const skill = currentUnit.champion.skills[skillIdx];
        const attackerIdx = turnOrderRef.current[currentTurnIndex];
        
        // Increment round AFTER selecting skill, BEFORE executing (so next turn uses next skill)
        const newRound = worldBossRoundRef.current + 1;
        worldBossRoundRef.current = newRound;
        setWorldBossRound(newRound);
        
        // Self-buff skills
        if (skill.type === 'buff' && skill.effects?.some(e => e.target === 'self')) {
          executeSelfBuff(attackerIdx, skillIdx);
          return;
        }
        
        const target = chooseTarget(currentUnit, unitsRef.current, difficultyTier);
        if (!target) { advanceTurn(); return; }
        const defenderIdx = unitsRef.current.indexOf(target);
        executeAttack(attackerIdx, defenderIdx, skillIdx);
        return;
      }
      
      const target = chooseTarget(currentUnit, unitsRef.current, difficultyTier);
      if (!target) { advanceTurn(); return; }
      const skillIdx = chooseSkill(currentUnit, target, difficultyTier);
      const attackerIdx = turnOrderRef.current[currentTurnIndex];
      const defenderIdx = unitsRef.current.indexOf(target);
      executeAttack(attackerIdx, defenderIdx, skillIdx);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentTurnIndex, battleState, currentUnit, advanceTurn, executeAttack, executeSelfBuff, handleCCTurn, difficultyTier, speedX2, worldBossData, addLog]);

  /* Auto-battle: player turn auto-play */
  useEffect(() => {
    if (!autoBattle || battleState !== 'fighting' || !currentUnit || currentUnit.isEnemy) return;
    if (currentUnit.currentHp <= 0 || isCC(currentUnit)) return;
    const delay = speedX2 ? 300 : 700;
    const timer = setTimeout(() => {
      // Pick best enemy target and skill using AI logic
      const enemies = unitsRef.current.filter(e => e.isEnemy && e.currentHp > 0);
      if (enemies.length === 0) return;
      const attackerIdx = turnOrderRef.current[currentTurnIndex];
      const attacker = unitsRef.current[attackerIdx];
      // Try to use strongest available skill
      const skills = attacker.champion.skills;
      let bestSkill = 0;
      let bestPower = 0;
      for (let i = 0; i < skills.length; i++) {
        const s = skills[i];
        if (s.type === 'passive' || attacker.skillCooldowns[i] > 0) continue;
        // Self buffs: auto execute
        if ((s.type === 'buff' || s.type === 'heal') && s.effects?.every(e => e.target === 'self' || e.target === 'all_allies')) {
          executeSelfBuff(attackerIdx, i);
          return;
        }
        if (s.power > bestPower) { bestPower = s.power; bestSkill = i; }
      }
      // Pick lowest HP enemy
      const target = enemies.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
      const defenderIdx = unitsRef.current.indexOf(target);
      executeAttack(attackerIdx, defenderIdx, bestSkill);
    }, delay);
    return () => clearTimeout(timer);
  }, [autoBattle, currentTurnIndex, battleState, currentUnit, executeAttack, executeSelfBuff, speedX2]);

  /* Player CC skip */
  useEffect(() => {
    if (battleState !== 'fighting' || !currentUnit || currentUnit.isEnemy) return;
    if (currentUnit.currentHp <= 0) { advanceTurn(); return; }
    if (isCC(currentUnit)) {
      const timer = setTimeout(() => handleCCTurn(), 800);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, battleState, currentUnit, advanceTurn, handleCCTurn]);

  /* ─── SAFETY NET: catch any missed victory/defeat ─── */
  const victoryProcessedRef = useRef(false);
  useEffect(() => {
    if (battleState !== 'fighting' || units.length === 0) return;
    if (victoryProcessedRef.current) return;

    const alivePlayers = units.filter(u => !u.isEnemy && u.currentHp > 0);

    // World boss defeat safety net
    if (worldBossData && alivePlayers.length === 0) {
      victoryProcessedRef.current = true;
      const totalDmg = worldBossTotalDamageRef.current || worldBossTotalDamage;
      const isCerberus = worldBossData.bossId === 'cerberus';
      const bossId = isCerberus ? 'cerberus' : 'hydra';
      const bossName = isCerberus ? 'Цербер' : 'Гидра';

      if (!rewards) {
        if (isCerberus) {
          recordCerberusDamage(totalDmg);
        } else {
          recordWorldBossDamage(totalDmg);
        }
        addRunes(BASE_ATTACK_REWARD.runes);
        addSouls(BASE_ATTACK_REWARD.souls);
        const r: BattleRewards = {
          souls: BASE_ATTACK_REWARD.souls, exp: 0,
          artifactDrop: false, droppedArtifacts: [],
        };
        setRewards(r);
        addLog(`🐉 ${bossName} повержен! Нанесено ${totalDmg.toLocaleString()} урона. +${BASE_ATTACK_REWARD.runes} рун, +${BASE_ATTACK_REWARD.souls} душ`, 'buff');

        if (user && totalDmg > 0) {
          (async () => {
            try {
              const todayStr = new Date().toISOString().slice(0, 10);
              const { data: existing } = await supabase
                .from('world_boss_damage')
                .select('damage_total, damage_today, last_attack_date')
                .eq('user_id', user.id)
                .eq('boss_id', bossId)
                .maybeSingle();

              const isNewDay = !existing?.last_attack_date || existing.last_attack_date !== todayStr;
              const prevTotal = existing?.damage_total ?? 0;
              const prevToday = isNewDay ? 0 : (existing?.damage_today ?? 0);

              const { error } = await supabase.from('world_boss_damage').upsert({
                user_id: user.id,
                boss_id: bossId,
                damage_today: prevToday + totalDmg,
                damage_total: prevTotal + totalDmg,
                attacks_used: 1,
                last_attack_date: todayStr,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,boss_id' });
              if (error) console.error('World boss damage upsert error (safety net):', error);
            } catch (e) {
              console.error('World boss damage save failed (safety net):', e);
            }
          })();
        }
      }
      setBattleState('victory');
      return;
    }

    // Non-world-boss safety net
    if (worldBossData) return;

    const aliveEnemies = units.filter(u => u.isEnemy && u.currentHp > 0);

    if (aliveEnemies.length === 0) {
      // Campaign/Abyss wave check in safety net
      if ((campaignData?.waves || abyssData?.waves) && campaignWavesRef.current && currentWaveRef.current < (campaignWavesRef.current.length - 1)) {
        // Don't process as victory - wave transition will be handled
        return;
      }
      victoryProcessedRef.current = true;
      // Only set victory if rewards haven't been processed yet
      if (!rewards) {
        const deadAllies = units.filter(u => !u.isEnemy && u.currentHp <= 0).length;
        const totalDeaths = deadAllies;
        allyDeathsRef.current = totalDeaths;
        setAllyDeaths(totalDeaths);

        if (campaignData?.stage) {
          const stage = campaignData.stage;
          const diff = campaignData.difficulty as import('@/data/campaignStages').Difficulty;
          const isFirst = !((campaignProgress[diff]?.[stage.chapter]?.highestStage ?? 0) >= stage.stageNumber);
          const stageRewards = isFirst ? stage.rewards.firstClear : stage.rewards.repeat;
          const conditions = stage.starConditions as StarCondition[] | undefined;
          const stars = conditions ? calculateBattleStars(conditions, true, totalDeaths, turnCountRef.current, squadSizeRef.current) : 1;
          setEarnedStars(stars);
          const starMultiplier = 1 + (stars - 1) * 0.25;
          const r = calculateRewards(1);
          r.souls = Math.floor(stageRewards.souls * starMultiplier);
          r.exp = Math.floor(stageRewards.exp * starMultiplier);
          const campaignArtifacts = generateCampaignArtifacts(stage.chapter, stage.stageNumber, diff);
          r.droppedArtifacts = campaignArtifacts;
          r.artifactDrop = campaignArtifacts.length > 0;
          r.artifactRarity = campaignArtifacts[0]?.rarity;
          setRewards(r);
          if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
          addSouls(r.souls);
          addRunes(Math.floor(stageRewards.runes * starMultiplier));
          addXpToSquad(r.exp);
          updateCampaignProgress(diff, stage.chapter, stage.stageNumber, stage.id, stars);
          addLog(`🏆 Победа! ⭐${stars}/3`, 'buff');
        } else if (templeData) {
          const deadAllies = units.filter(u => !u.isEnemy && u.currentHp <= 0).length;
          const totalDeaths = deadAllies;
          let templeStars = 1;
          if (totalDeaths === 0) templeStars = 2;
          if (totalDeaths === 0 && squadSizeRef.current <= 2) templeStars = 3;
          setEarnedStars(templeStars);
          updateTempleProgress(templeData.temple.id, templeData.floor, templeStars);

          const starMultiplier = 1 + (templeStars - 1) * 0.25;
          const droppedRunes = rollRuneReward(templeData.temple, templeData.floor);
          addDivineRunes(templeData.temple.element, droppedRunes.length, templeData.floorData.runeRarity);
          const souls = Math.floor((30 + 1 * 2) * (1 + templeData.floor * 0.3) * starMultiplier);
          const exp = Math.floor((50 + 1 * 3) * (1 + templeData.floor * 0.3) * starMultiplier);
          const r: BattleRewards = {
            souls, exp, artifactDrop: false, droppedArtifacts: [],
            templeRunes: { count: droppedRunes.length, runeName: templeData.temple.runeName, runeRarity: templeData.floorData.runeRarity, runeIcon: templeData.temple.runeIcon, element: templeData.temple.element as string },
          };
          setRewards(r);
          addSouls(r.souls);
          addXpToSquad(r.exp);
        } else if (abyssData) {
          const progress = refreshKeysIfNeeded(player.abyssProgress);
          if (abyssData.secretRoomId) {
            const room = SECRET_ROOMS.find(r => r.id === abyssData.secretRoomId);
            if (room) {
              const newCleared = [...(progress.secretRoomsCleared[abyssData.difficulty] ?? []), room.id];
              updateAbyssProgress({ ...progress, secretRoomsCleared: { ...progress.secretRoomsCleared, [abyssData.difficulty]: newCleared } });
              addSouls(room.rewards.souls);
              addRunes(room.rewards.runes);
              const setName = getSecretRoomSetReward(room);
              const droppedArtifacts: any[] = [];
              if (setName) {
                const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
                const rarity = abyssData.difficulty === 'hard' ? 'Калиновый' : 'Сказанный';
                const stars = abyssData.difficulty === 'hard' ? (Math.random() < 0.5 ? 4 : 5) : (Math.random() < 0.6 ? 3 : 4);
                droppedArtifacts.push(generateArtifact(rarity as any, 0, stars, setName as any, slot));
                if (droppedArtifacts.length > 0) addArtifacts(droppedArtifacts);
              }
              setRewards({ souls: room.rewards.souls, exp: 0, artifactDrop: droppedArtifacts.length > 0, droppedArtifacts, runes: room.rewards.runes });
            }
          } else if (abyssData.isBossRefight) {
            const boss = getBossForFloor(abyssData.floor);
            const matDrop = boss ? (abyssData.difficulty === 'hard' ? 4 : 2) : 0;
            updateAbyssProgress({
              ...progress,
              silverKeys: progress.silverKeys - 1,
              bossKills: boss ? { ...progress.bossKills, [boss.id]: (progress.bossKills[boss.id] ?? 0) + 1 } : progress.bossKills,
              materials: boss ? { ...(progress.materials ?? {}), [boss.id]: ((progress.materials ?? {})[boss.id] ?? 0) + matDrop } : (progress.materials ?? {}),
            });
            const floorRewards = getFloorRewards(abyssData.floor, abyssData.difficulty);
            addSouls(Math.floor(floorRewards.souls * 0.5));
            setRewards({ souls: Math.floor(floorRewards.souls * 0.5), exp: 0, artifactDrop: false, droppedArtifacts: [], runes: 0, bossMaterial: boss && matDrop > 0 ? { name: boss.material, imageUrl: boss.materialImageUrl, count: matDrop } : undefined });
          } else {
            const floorRewards = getFloorRewards(abyssData.floor, abyssData.difficulty);
            const boss = getBossForFloor(abyssData.floor);
            const matDrop = boss ? (abyssData.difficulty === 'hard' ? 4 : 2) : 0;
            updateAbyssProgress({
              ...progress,
              currentFloor: { ...progress.currentFloor, [abyssData.difficulty]: abyssData.floor },
              goldKeys: progress.goldKeys - 1,
              bossKills: boss ? { ...progress.bossKills, [boss.id]: (progress.bossKills[boss.id] ?? 0) + 1 } : progress.bossKills,
              materials: boss ? { ...(progress.materials ?? {}), [boss.id]: ((progress.materials ?? {})[boss.id] ?? 0) + matDrop } : (progress.materials ?? {}),
            });
            addSouls(floorRewards.souls);
            addRunes(floorRewards.runes);
            setRewards({ souls: floorRewards.souls, exp: 0, artifactDrop: false, droppedArtifacts: [], runes: floorRewards.runes, bossMaterial: boss && matDrop > 0 ? { name: boss.material, imageUrl: boss.materialImageUrl, count: matDrop } : undefined });
          }
        } else if (arenaData) {
          const currentRating = arenaState.arenaRating;
          processArenaVictory(arenaData.opponentId, ARENA_WIN_RATING, getArenaRank(currentRating).tier);
          setRewards({ souls: 0, exp: 0, artifactDrop: false, droppedArtifacts: [] });
          recordArenaBattle({
            opponentId: arenaData.opponentId,
            opponentName: arenaData.opponentName || '',
            attackerRating: currentRating,
            defenderRating: arenaData.opponentRating || 0,
            ratingChange: ARENA_WIN_RATING,
            result: 'win', ...getArenaSquads(),
          });
        } else {
          const r = calculateRewards(1);
          setRewards(r);
          if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
          addSouls(r.souls);
          addXpToSquad(r.exp);
        }
      }
      setBattleState('victory');
      return;
    }

    if (alivePlayers.length === 0) {
      victoryProcessedRef.current = true;
      if (arenaData && !rewards) {
        const currentRating = arenaState.arenaRating;
        updateArenaRating(-ARENA_LOSS_RATING);
        recordArenaBattle({
          opponentId: arenaData.opponentId,
          opponentName: arenaData.opponentName || '',
          attackerRating: currentRating,
          defenderRating: arenaData.opponentRating || 0,
          ratingChange: -ARENA_LOSS_RATING,
          result: 'loss', ...getArenaSquads(),
        });
      }
      setBattleState('defeat');
    }
  }, [units, battleState, worldBossData, worldBossTotalDamage, rewards, campaignData, campaignProgress, templeData, arenaData, arenaState.arenaRating, addArtifacts, addSouls, addRunes, addXpToSquad, addDivineRunes, addLog, updateCampaignProgress, processArenaVictory, updateArenaRating, recordArenaBattle, getArenaSquads, recordWorldBossDamage, recordCerberusDamage, user]);

  /* turn timer */
  useEffect(() => {
    if (battleState !== 'fighting' || !currentUnit || currentUnit.isEnemy) return;
    if (isCC(currentUnit)) return;
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          const targets = unitsRef.current.filter(u => u.isEnemy && u.currentHp > 0);
          if (targets.length > 0) {
            const t = targets[0];
            executeAttack(turnOrderRef.current[currentTurnIndex], unitsRef.current.indexOf(t), 0);
          }
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurnIndex, battleState, currentUnit, executeAttack]);

  /* handlers */
  const handleSkillSelect = (idx: number) => {
    if (!currentUnit || currentUnit.isEnemy || currentUnit.skillCooldowns[idx] > 0) return;
    if (isCC(currentUnit)) return;
    const skill = currentUnit.champion.skills[idx];
    if (skill.type === 'passive') return;
    // Self-only buff skills auto-execute without target selection (but NOT heal skills — they need confirmation)
    const isSelfOnly = skill.type === 'buff' && skill.effects?.every(e => e.target === 'self' || e.target === 'all_allies');
    if (isSelfOnly) {
      const attackerIdx = turnOrder[currentTurnIndex];
      executeSelfBuff(attackerIdx, idx);
      return;
    }
    // Heal/cleanse skills targeting all_allies: also auto-execute
    const isGroupHeal = skill.type === 'heal' && skill.effects?.every(e => e.target === 'self' || e.target === 'all_allies');
    if (isGroupHeal) {
      const attackerIdx = turnOrder[currentTurnIndex];
      executeSelfBuff(attackerIdx, idx);
      return;
    }
    setSelectedSkill(idx);
  };

  const handleTargetSelect = (unitIdx: number) => {
    if (selectedSkill === null || !currentUnit || currentUnit.isEnemy) return;
    const target = units[unitIdx];
    const selected = currentUnit.champion.skills[selectedSkill];
    const needsAllyTarget = selected.effects?.some(e => e.target === 'ally') ?? false;
    const needsDeadAlly = selected.effects?.some(e => e.target === 'dead_ally') ?? false;

    if (needsDeadAlly) {
      // Must pick a dead ally
      if (target.isEnemy !== currentUnit.isEnemy) return;
      if (target.currentHp > 0) return;
    } else if (target.currentHp <= 0) {
      return;
    } else if (needsAllyTarget) {
      if (target.isEnemy !== currentUnit.isEnemy) return;
    } else {
      if (!target.isEnemy) return;
      // Провокация: если у врага есть taunt, можно бить только его
      const taunter = units.find(u => u.isEnemy && u.currentHp > 0 && hasEffect(u, 'taunt'));
      if (taunter && target.id !== taunter.id) return;
      // Veil: нельзя выбрать невидимого (если есть другие живые цели)
      if (hasEffect(target, 'veil')) {
        const otherAlive = units.filter(u => u.isEnemy && u.currentHp > 0 && !hasEffect(u, 'veil'));
        if (otherAlive.length > 0) return;
      }
    }

    executeAttack(turnOrder[currentTurnIndex], unitIdx, selectedSkill);
  };
  const selected = selectedSkill !== null && currentUnit ? currentUnit.champion.skills[selectedSkill] : null;
  const isAllyTargetSkill = selected?.effects?.some(e => e.target === 'ally') ?? false;
  const isDeadAllyTargetSkill = selected?.effects?.some(e => e.target === 'dead_ally') ?? false;

  return (
    <div className="min-h-screen pb-4 relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img src={worldBossData ? (worldBossData.bossId === 'cerberus' ? '/ui/cerberus_bg.png' : '/ui/worldboss_bg.png') : bgBattle} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <BattleParticles />
      </div>

      <div className="relative z-10 px-2 sm:px-4 pt-4 sm:pt-6 max-w-4xl mx-auto">
        {battleState === 'prep' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh] px-3">
            <h1 className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow mb-3">
              {campaignData ? `⚔️ ${campaignData.stage.name}` : arenaData ? `🏛️ vs ${arenaData.opponentName}` : 'Великая Охота'}
            </h1>
            <p className="text-muted-foreground mb-6 text-sm text-center">
              {campaignData
                ? `Глава ${campaignData.stage.chapter} · Этап ${campaignData.stage.stageNumber}${campaignData.stage.isBoss ? ' · БОСС' : ''} · ${campaignData.waves?.length ?? 1} раунд(а)`
                : arenaData ? `Колизей Богов · Рейтинг противника: ${arenaData.opponentRating}`
                : `Отряд из ${getSquadChampions().length} героев готов к бою`
              }
            </p>
            <button
              onClick={startBattle}
              disabled={getSquadChampions().length === 0}
              className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-accent-foreground font-kelly text-xl sm:text-2xl px-8 sm:px-12 py-3 sm:py-4 rounded-xl card-lubok transition-all hover:scale-105 active:scale-95 min-h-[56px]"
            >
              ⚔️ В Бой!
            </button>
            {getSquadChampions().length === 0 && (
              <p className="text-muted-foreground mt-3 text-xs">Сначала собери отряд в «Дружине»</p>
            )}
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-muted-foreground hover:text-foreground font-kelly text-sm transition-colors min-h-[44px] px-4"
            >
              ← Назад
            </button>
          </motion.div>
        )}

        {battleState === 'fighting' && currentUnit && (
          <>
            {/* Header with controls */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-kelly text-foreground">
                {totalWaves > 1 && (
                  <span className="text-accent font-kelly text-[10px] sm:text-xs bg-accent/15 px-1.5 py-0.5 rounded">
                    ⚔️ {currentWave + 1}/{totalWaves}
                  </span>
                )}
                <span>Ход:</span>
                <span className={currentUnit.isEnemy ? 'text-accent' : 'text-primary'}>{currentUnit.champion.name}</span>
                {isCC(currentUnit) && <span className="text-accent">⭐</span>}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setAutoBattle(p => !p)}
                  className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-kelly transition-all min-h-[28px] ${
                    autoBattle
                      ? 'bg-primary/30 text-primary ring-1 ring-primary/50'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Авто
                </button>
                <button
                  onClick={() => setSpeedX2(p => !p)}
                  className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-kelly transition-all min-h-[28px] ${
                    speedX2
                      ? 'bg-primary/30 text-primary ring-1 ring-primary/50'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  x2
                </button>
                <div className={`text-xs sm:text-sm font-mono ${turnTimer <= 5 ? 'text-accent animate-pulse' : 'text-muted-foreground'}`}>
                  ⏱ {turnTimer}с
                </div>
                <button
                  onClick={() => {
                    if (campaignData) {
                      const params = new URLSearchParams({
                        chapter: String(campaignData.stage.chapter),
                        difficulty: campaignData.difficulty,
                      });
                      navigate(`/campaign?${params.toString()}`);
                    } else {
                      navigate('/');
                    }
                  }}
                  className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-muted/50 hover:bg-accent/20 text-muted-foreground hover:text-accent font-kelly transition-all min-h-[28px]"
                >
                  ← Назад
                </button>
              </div>
            </div>

            <TurnBar turnOrder={turnOrder} units={units} currentTurnIndex={currentTurnIndex} />

            {/* Hydra Swallow Status Panel */}
            {isHydraBattle && hydraSwallow.swallowedHeroId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/15 border border-destructive/30 rounded-xl p-2 mb-2 max-w-2xl mx-auto"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐍</span>
                    <div>
                      <span className="font-kelly text-destructive">
                        {units.find(u => u.id === hydraSwallow.swallowedHeroId)?.champion.name ?? 'Герой'} проглочен!
                      </span>
                      <div className="text-[10px] text-muted-foreground">
                        ⏱ Переваривание: {hydraSwallow.digestionTimer} ход(а) | Наносите урон любой голове!
                      </div>
                    </div>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <div className="w-24 h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        animate={{ width: `${Math.min(100, (hydraSwallow.rescueDamageDealt / Math.max(1, hydraSwallow.rescueDamageRequired)) * 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                      {hydraSwallow.rescueDamageDealt.toLocaleString()} / {hydraSwallow.rescueDamageRequired.toLocaleString()} (3% HP)
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hydra Heads Status Panel */}
            {isHydraBattle && (
              <motion.div
                key={`hydra-round-${hydraRound}`}
                initial={hydraRound > 1 ? { scale: 1.2, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex items-center justify-center gap-2 sm:gap-3 mb-2 px-3 py-1.5 mx-auto w-fit rounded-lg border border-accent/30 bg-accent/5"
              >
                <span className="text-[12px] sm:text-[13px] font-kelly text-accent">
                  🐉 Возрождение {hydraRound}
                </span>
                {hydraRound > 1 && (
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/20">
                      ⚔ +{Math.round((hydraRound - 1) * 25)}% АТК
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                      ❤ +{Math.round((hydraRound - 1) * 20)}% ЗДР
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      ⚡ +{Math.round((hydraRound - 1) * 10)}% СКР
                    </span>
                  </div>
                )}
              </motion.div>
            )}
            {/* HydraHeadsPanel removed — heads are shown as BattleUnit cards */}
            {isHydraBattle && (
              <div className="text-center mb-1">
                <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                  💀 Общий урон:{' '}
                </span>
                <motion.span
                  key={worldBossTotalDamage}
                  initial={{ scale: 1.3, color: 'hsl(var(--accent))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  transition={{ duration: 0.4 }}
                  className="text-[11px] sm:text-[12px] font-kelly font-bold"
                >
                  {worldBossTotalDamage.toLocaleString()}
                </motion.span>
              </div>
            )}

            {/* Cerberus Status Panel */}
            {worldBossData && !isHydraBattle && (
              <>
                <motion.div
                  key={`cerberus-rebirth-${cerberusRebirth}`}
                  initial={cerberusRebirth > 1 ? { scale: 1.2, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex items-center justify-center gap-2 sm:gap-3 mb-1 px-3 py-1.5 mx-auto w-fit rounded-lg border border-accent/30 bg-accent/5"
                >
                  <span className="text-[12px] sm:text-[13px] font-kelly text-accent">
                    🔥 Возрождение {cerberusRebirth}
                  </span>
                  <span className="text-[11px] font-kelly text-muted-foreground">
                    Раунд {worldBossRound <= 1 ? 1 : (((worldBossRound - 2) % 10) + 1)}/10
                  </span>
                  {cerberusRebirth > 1 && (
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/20">
                        ⚔ +{Math.round((cerberusRebirth - 1) * 25)}% АТК
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                        ❤ +{Math.round((cerberusRebirth - 1) * 20)}% ЗДР
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        ⚡ +{Math.round((cerberusRebirth - 1) * 20)}% СКР
                      </span>
                    </div>
                  )}
                </motion.div>
                <div className="text-center mb-1">
                  <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                    💀 Общий урон:{' '}
                  </span>
                  <motion.span
                    key={worldBossTotalDamage}
                    initial={{ scale: 1.3, color: 'hsl(var(--accent))' }}
                    animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                    transition={{ duration: 0.4 }}
                    className="text-[11px] sm:text-[12px] font-kelly font-bold"
                  >
                    {worldBossTotalDamage.toLocaleString()}
                  </motion.span>
                </div>
              </>
            )}

            {/* Battlefield */}
            <div className="flex flex-col gap-3 sm:gap-5 mb-2 sm:mb-3 max-w-2xl mx-auto">
              {/* enemies — two rows */}
              <div>
                {(() => {
                  const enemies = units.filter(u => u.isEnemy);
                  const enemyTaunter = units.find(t => t.isEnemy && t.currentHp > 0 && hasEffect(t, 'taunt'));
                  const half = Math.ceil(enemies.length / 2);
                  const rows = isHydraBattle ? [enemies] : (enemies.length > 3 ? [enemies.slice(0, half), enemies.slice(half)] : [enemies]);
                  const isWorldBossBattle = !!worldBossData && !isHydraBattle && enemies.length === 1;
                  return (
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      {rows.map((row, ri) => (
                        <div key={ri} className="flex justify-center gap-2 sm:gap-3">
                          {row.map(u => {
                            const globalIdx = units.indexOf(u);
                            const hasVeil = hasEffect(u, 'veil');
                            const otherNonVeiled = units.filter(t => t.isEnemy && t.currentHp > 0 && !hasEffect(t, 'veil')).length > 0;
                            const isTargetable = selectedSkill !== null && u.currentHp > 0 && !currentUnit.isEnemy && !isAllyTargetSkill
                              && (!enemyTaunter || u.id === enemyTaunter.id)
                              && !(hasVeil && otherNonVeiled);
                            return (
                              <div key={u.id} className={isWorldBossBattle ? "w-[344px] sm:w-[462px]" : "w-[80px] sm:w-[110px]"}>
                                <UnitCard
                                  u={u}
                                  isActive={currentUnit === u}
                                  isTargetable={isTargetable}
                                  isWorldBoss={isWorldBossBattle}
                                  visualEffects={visualEffects}
                                  floatingNumbers={floatingNumbers[u.id]}
                                  onClick={() => handleTargetSelect(globalIdx)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {/* players */}
              <div className="flex justify-center gap-2 sm:gap-3">
                {units.filter(u => !u.isEnemy).map(u => {
                  const globalIdx = units.indexOf(u);
                  const isTargetable = selectedSkill !== null && !currentUnit.isEnemy && (
                    (isDeadAllyTargetSkill && u.currentHp <= 0 && !u.isEnemy) ||
                    (!isDeadAllyTargetSkill && u.currentHp > 0 && isAllyTargetSkill)
                  );
                  return (
                    <div key={u.id} className="w-[84px] sm:w-[120px]">
                      <UnitCard
                        u={u}
                        isActive={currentUnit === u}
                        isTargetable={isTargetable}
                        visualEffects={visualEffects}
                        floatingNumbers={floatingNumbers[u.id]}
                        hydraMarkCountdown={isHydraBattle && hydraSwallow.markedHeroId === u.id ? hydraSwallow.markCountdown : null}
                        isSwallowed={isHydraBattle && hydraSwallow.swallowedHeroId === u.id}
                        onClick={() => handleTargetSelect(globalIdx)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skills — hidden during auto-battle */}
            {currentUnit && !currentUnit.isEnemy && currentUnit.currentHp > 0 && !autoBattle && (
              <SkillPanel currentUnit={currentUnit} selectedSkill={selectedSkill} onSelect={handleSkillSelect} onSkip={() => {
                addLog(`⏭️ ${currentUnit.champion.name} пропускает ход`, 'normal');
                advanceTurn();
              }} />
            )}
            {autoBattle && currentUnit && !currentUnit.isEnemy && (
              <div className="text-center text-xs font-kelly text-primary/70 py-2 animate-pulse">
                ⚔️ Авто-бой...
              </div>
            )}


            {/* Battle Log */}
            <BattleLog entries={log} combatStats={combatStatsRef.current} units={units} defaultCollapsed={!worldBossData} />

          </>
        )}

        {(battleState === 'victory' || battleState === 'defeat') && (
          <ResultScreen
            combatStats={combatStatsSnapshot}
            units={units}
            battleState={battleState}
            rewards={rewards}
            earnedStars={campaignData ? earnedStars : undefined}
            starConditions={campaignData?.stage?.starConditions}
            arenaInfo={arenaData ? {
              ratingChange: battleState === 'victory' ? ARENA_WIN_RATING : -ARENA_LOSS_RATING,
              coinTier: battleState === 'victory' ? getArenaRank(arenaState.arenaRating).tier : undefined,
            } : null}
            onContinue={() => {
              if (worldBossData) {
                navigate(worldBossData.bossId === 'cerberus' ? '/trials/worldboss/cerberus' : '/trials/worldboss/hydra');
              } else if (arenaData) {
                navigate('/trials/arena');
              } else if (campaignData) {
                const params = new URLSearchParams({
                  chapter: String(campaignData.stage.chapter),
                  difficulty: campaignData.difficulty,
                });
                navigate(`/campaign?${params.toString()}`);
              } else if (abyssData) {
                navigate('/trials/abyss');
              } else if (templeData) {
                navigate(`/temples/${templeData.temple.id}`);
              } else {
                setBattleState('prep');
                setRewards(null);
              }
            }}
            onHub={() => {
              if (worldBossData) {
                navigate(worldBossData.bossId === 'cerberus' ? '/trials/worldboss/cerberus' : '/trials/worldboss/hydra');
              } else if (arenaData) {
                navigate('/trials/arena');
              } else if (campaignData) {
                const params = new URLSearchParams({
                  chapter: String(campaignData.stage.chapter),
                  difficulty: campaignData.difficulty,
                });
                navigate(`/campaign?${params.toString()}`);
              } else if (abyssData) {
                navigate('/trials/abyss');
              } else if (templeData) {
                navigate(`/temples/${templeData.temple.id}`);
              } else {
                navigate('/');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
