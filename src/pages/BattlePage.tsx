import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateDamage, type CombatResult } from '@/utils/combat';
import { chooseTarget, chooseSkill, updateCooldowns, applyCooldown, type BattleUnit } from '@/ai/enemyAI';
import { tickToNextTurn, predictTurnOrder, boostTurnMeter, reduceTurnMeter, TM_THRESHOLD } from '@/utils/turnMeter';
import { calculateRewards, type BattleRewards } from '@/utils/rewards';
import { ELEMENT_ICONS, CHAMPIONS } from '@/data/gameData';
import { ARENA_WIN_RATING, ARENA_LOSS_RATING, getRankFromRating as getArenaRank } from '@/data/arenaData';
import { calculateArtifactStats } from '@/data/artifacts';
import iconSouls from '@/assets/icons/icon_souls.png';
import { applyEffect, processEffects, isCC, cleanse, applyDamageWithShield, tickCCEffects, hasEffect } from '@/utils/effects';
import { EFFECT_ICONS, EFFECT_NAMES, isBuffType, isDebuffType } from '@/types/game';
import EffectIcon from '@/components/game/EffectIcon';
import BattleParticles from '@/components/game/BattleParticles';
import AttackEffect from '@/components/game/AttackEffect';
import MythicOverlay from '@/components/game/MythicOverlay';
import type { EffectApplication, StatusEffect } from '@/types/game';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { calculateBattleStars, type StarCondition, WAVES_PER_STAGE } from '@/data/campaignStages';
import { generateCampaignArtifacts } from '@/data/campaignDrops';
import { HYDRA_BOSS, getBossSkillForRound, getScaledBossStats, BASE_ATTACK_REWARD } from '@/data/worldBoss';
import { CERBERUS_BOSS, getCerberusSkillForRound, getScaledCerberusStats } from '@/data/worldBossCerberus';
import { TEMPLES, rollRuneReward } from '@/data/templeData';
import bgBattle from '@/assets/bg-battle.jpg';

/* ─── sub-components ─── */

interface BattleLogEntry {
  id: number;
  message: string;
  type: 'normal' | 'crit' | 'miss' | 'advantage' | 'heal' | 'buff' | 'debuff' | 'dot';
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
    <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 mb-2 sm:mb-4 scrollbar-none -mx-1 px-1">
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
    </div>
  );
}

interface FloatingNumber {
  id: string;
  value: number;
  type: 'damage' | 'crit' | 'heal' | 'miss';
}

function UnitCard({ u, isTargetable, isActive, visualEffects, floatingNumbers, isWorldBoss, onClick }: {
  u: BattleUnit;
  isTargetable?: boolean;
  isActive?: boolean;
  visualEffects: Record<string, boolean>;
  floatingNumbers?: FloatingNumber[];
  isWorldBoss?: boolean;
  onClick?: () => void;
}) {
  const isHit = visualEffects[`hit-${u.id}`];
  const isCritHit = visualEffects[`crit-${u.id}`];
  const stunned = isCC(u);
  const hpPercent = (u.currentHp / u.maxHp) * 100;
  const effectType = isCritHit ? 'crit' : isHit ? 'hit' : null;

  return (
    <motion.div
      animate={{
        opacity: u.currentHp > 0 ? 1 : 0.3,
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

      {/* Element aura glow for active unit */}
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

      <EffectBadges effects={u.effects} />

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
              'text-accent'
            }`}
          >
            {fn.type === 'miss' ? 'ПРОМАХ' : fn.type === 'heal' ? `+${fn.value}` : `-${fn.value}`}
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
          <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 sm:grid sm:grid-cols-3 sm:gap-1.5 sm:overflow-visible sm:mx-0 sm:px-0">
            {currentUnit.champion.skills.map((skill, i) => {
              const onCooldown = currentUnit.skillCooldowns[i] > 0;
              const isPassive = skill.type === 'passive';
              const hasEffects = skill.effects && skill.effects.length > 0;
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

function BattleLog({ entries }: { entries: BattleLogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [entries.length]);

  return (
    <div ref={ref} className="mt-2 sm:mt-4 bg-surface/40 rounded-xl p-2 sm:p-3 max-h-20 sm:max-h-32 overflow-y-auto">
      {entries.slice(-8).map(e => (
        <div key={e.id} className={`text-[10px] sm:text-xs font-spectral ${LOG_COLORS[e.type]}`}>{e.message}</div>
      ))}
    </div>
  );
}

function ResultScreen({ battleState, rewards, earnedStars, starConditions, arenaInfo, onContinue, onHub }: {
  battleState: 'victory' | 'defeat';
  rewards: BattleRewards | null;
  earnedStars?: number;
  starConditions?: StarCondition[];
  arenaInfo?: { ratingChange: number; coinTier?: string } | null;
  onContinue: () => void;
  onHub: () => void;
}) {
  const isWin = battleState === 'victory';
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
          <p className="text-xs text-foreground flex items-center justify-center gap-1"><img src={iconSouls} alt="Души" className="w-4 h-4" /> +{rewards.souls} душ</p>
          <p className="text-xs text-foreground">📚 +{rewards.exp} опыта</p>
          {rewards.runes != null && rewards.runes > 0 && (
            <p className="text-xs text-foreground flex items-center justify-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4" /> +{rewards.runes} рун</p>
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
          {rewards.droppedArtifacts.length > 0 && (
            <div className="mt-2 border-t border-border/30 pt-2">
              <p className="text-xs font-kelly text-accent mb-1">🏺 Артефакты:</p>
              {rewards.droppedArtifacts.map(art => (
                <div key={art.id} className="text-xs text-foreground">
                  <span className="text-primary">{art.name}</span>
                  <span className="text-muted-foreground ml-1">({art.rarity})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={onContinue} className="bg-primary hover:bg-primary/90 text-primary-foreground font-kelly px-6 py-2.5 rounded-xl transition-all min-h-[44px] text-sm">Продолжить</button>
        <button onClick={onHub} className="bg-secondary hover:bg-secondary/80 text-foreground font-kelly px-6 py-2.5 rounded-xl transition-all min-h-[44px] text-sm">В Стан</button>
      </div>
    </motion.div>
  );
}

/* ─── main component ─── */

export default function BattlePage() {
  const { player, getSquadChampions, getEffectiveStats, getHeroArtifacts, addArtifacts, addXpToSquad, addSouls, addRunes, addDivineRunes, campaignProgress, updateCampaignProgress, arenaState, markArenaOpponentDefeated, updateArenaRating, addArenaCoins, processArenaVictory, recordWorldBossDamage, recordCerberusDamage } = useGame();
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
        return JSON.parse(raw) as { stage: import('@/data/campaignStages').Stage; difficulty: string; enemies: any[]; waves?: any[][] };
      }
    } catch {}
    return null;
  });

  // Wave system for campaign battles
  const [currentWave, setCurrentWave] = useState(0);
  const [totalWaves, setTotalWaves] = useState(1);
  const campaignWavesRef = useRef<any[][] | null>(null);
  
  // Initialize waves from campaign data
  useEffect(() => {
    if (campaignData?.waves) {
      campaignWavesRef.current = campaignData.waves;
      setTotalWaves(campaignData.waves.length);
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
      return { bossId: 'hydra', todayDamage: 0 };
    } catch {}
    return null;
  });

  const [worldBossTotalDamage, setWorldBossTotalDamage] = useState(0);
  const [worldBossRound, setWorldBossRound] = useState(1);

  // If page is refreshed and no battle context exists, redirect to home
  const hasBattleContext = !!(templeData || arenaData || campaignData || worldBossData);
  useEffect(() => {
    if (!hasBattleContext) {
      navigate('/', { replace: true });
    }
  }, [hasBattleContext, navigate]);

  const [battleState, setBattleState] = useState<'prep' | 'fighting' | 'victory' | 'defeat'>('prep');
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [turnOrder, setTurnOrder] = useState<number[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [visualEffects, setVisualEffects] = useState<Record<string, boolean>>({});
  const [turnTimer, setTurnTimer] = useState(15);
  const [rewards, setRewards] = useState<BattleRewards | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<Record<string, FloatingNumber[]>>({});
  const [autoBattle, setAutoBattle] = useState(() => localStorage.getItem('bylina_autoBattle') === 'true');
  const [speedX2, setSpeedX2] = useState(() => localStorage.getItem('bylina_speedX2') === 'true');
  useEffect(() => { localStorage.setItem('bylina_autoBattle', String(autoBattle)); }, [autoBattle]);
  useEffect(() => { localStorage.setItem('bylina_speedX2', String(speedX2)); }, [speedX2]);
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

  const addLog = useCallback((message: string, type: BattleLogEntry['type'] = 'normal') => {
    setLog(prev => [...prev.slice(-29), { id: Date.now() + Math.random(), message, type }]);
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
      })
      .then(({ error }) => {
        if (error) console.error('Arena history insert error:', error);
      });
  }, [user, player.username]);

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

    // If world boss battle
    if (worldBossData) {
      const boss = worldBossData.bossId === 'cerberus' ? CERBERUS_BOSS : HYDRA_BOSS;
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
      }];
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
  }, [campaignData, templeData, arenaData]);

  /* Helper: apply skill effects to relevant targets */
  const applySkillEffects = useCallback((
    skill: typeof CHAMPIONS[0]['skills'][0],
    attackerIdx: number,
    defenderIdx: number,
    currentUnits: BattleUnit[],
    logFn: (msg: string, type: BattleLogEntry['type']) => void
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
          const healAmt = Math.floor(target.maxHp * (eff.value ?? 0) / 100);
          const actualHeal = Math.min(healAmt, target.maxHp - target.currentHp);
          updatedUnits[tIdx] = { ...target, currentHp: Math.min(target.maxHp, target.currentHp + healAmt) };
          if (actualHeal > 0) {
            logFn(`💖 ${target.champion.name} исцелён на ${actualHeal} HP [${updatedUnits[tIdx].currentHp}/${target.maxHp}]`, 'heal');
            spawnFloat(updatedUnits[tIdx].id, actualHeal, 'heal');
          }
        }
        continue;
      }

      const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
      for (const tIdx of targets) {
        const result = applyEffect(updatedUnits[tIdx], eff, attacker.id);
        updatedUnits[tIdx] = result.unit;
        if (result.applied) {
          const icon = EFFECT_NAMES[eff.type];
          const name = EFFECT_NAMES[eff.type];
          const isBuff = isBuffType(eff.type);
          logFn(
            `${icon} ${updatedUnits[tIdx].champion.name}: ${name}${eff.value > 0 ? ` (${eff.value}%)` : ''} на ${eff.duration} ход(а)`,
            isBuff ? 'buff' : 'debuff'
          );
        }
      }
    }
    return updatedUnits;
  }, [spawnFloat]);

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
    const squad = getSquadChampions();
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

      const enhancedChampion = { ...pc.champion, baseStats: finalStats };
      return {
        id: pc.id,
        champion: enhancedChampion,
        currentHp: finalStats.hp,
        maxHp: finalStats.hp,
        isEnemy: false,
        skillCooldowns: pc.champion.skills.map(() => 0),
        effects: [],
        turnMeter: 0,
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

    const allUnits = applyPassives([...playerUnits, ...enemies]);

    const order = allUnits
      .map((u, i) => ({ i, spd: u.champion.baseStats.spd }))
      .sort((a, b) => b.spd - a.spd)
      .map(o => o.i);

    setUnits(allUnits);
    setTurnOrder(order);
    setCurrentTurnIndex(0);
    setBattleState('fighting');
    const waveCount = campaignData?.waves?.length ?? 1;
    setLog([{ id: 0, message: waveCount > 1 ? `⚔️ Раунд 1/${waveCount} — Бой начинается!` : '⚔️ Бой начинается! Предки с нами!', type: 'normal' }]);
    setSelectedSkill(null);
    setTurnTimer(15);
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
  }, [getSquadChampions, getEffectiveStats, getHeroArtifacts, generateEnemyTeam]);

  // Auto-start battle (skip prep screen)
  useEffect(() => {
    if (battleState === 'prep' && getSquadChampions().length > 0) {
      startBattle();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUnit = battleState === 'fighting' ? units[turnOrder[currentTurnIndex]] : null;

  /* Process effects at start of turn (DoT, HoT, duration tick) */
  const processUnitEffects = useCallback((unitIdx: number, currentUnits: BattleUnit[]): BattleUnit[] => {
    const unit = currentUnits[unitIdx];
    if (!unit || unit.currentHp <= 0 || unit.effects.length === 0) return currentUnits;

    const { unit: processed, dotDamage } = processEffects(unit);
    const updated = [...currentUnits];
    updated[unitIdx] = processed;

    if (dotDamage > 0) {
      const dots = unit.effects.filter(e => ['poison', 'bleed', 'burn'].includes(e.type));
      const dotNames = dots.map(e => EFFECT_NAMES[e.type]).join(', ');
      addLog(`${dotNames} ${unit.champion.name} получает ${dotDamage} урона от эффектов`, 'dot');
      spawnFloat(unit.id, dotDamage, 'damage');
    }

    // Check if HoT healed
    if (processed.currentHp > unit.currentHp && dotDamage === 0) {
      const healed = processed.currentHp - unit.currentHp;
      addLog(`💚 ${unit.champion.name} восстанавливает ${healed} HP`, 'heal');
      spawnFloat(unit.id, healed, 'heal');
    }

    return updated;
  }, [addLog, spawnFloat]);

  /* advance turn — accepts optional fresh units to avoid stale ref */
  const advanceTurn = useCallback((freshUnits?: BattleUnit[]) => {
    const u = freshUnits ?? unitsRef.current;
    const to = turnOrderRef.current;
    let next = (currentTurnIndex + 1) % to.length;
    let attempts = 0;
    while (u[to[next]]?.currentHp <= 0 && attempts < to.length) {
      next = (next + 1) % to.length;
      attempts++;
    }

    // Decrement cooldowns for the next unit
    const nextUnitIdx = to[next];
    let finalUnits = [...u];
    if (u[nextUnitIdx] && u[nextUnitIdx].currentHp > 0) {
      // First process effects (DoT, reduce durations)
      const afterEffects = processUnitEffects(nextUnitIdx, u);
      
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
          // Campaign wave check on DoT kill
          if (campaignData?.waves && currentWaveRef.current < (campaignData.waves.length - 1)) {
            const nextWaveIdx = currentWaveRef.current + 1;
            const waveUnits = spawnNextWave(finalUnits, nextWaveIdx);
            if (waveUnits) {
              setCurrentWave(nextWaveIdx);
              currentWaveRef.current = nextWaveIdx;
              addLog(`🔔 Раунд ${nextWaveIdx + 1}/${campaignData.waves.length}!`, 'buff');
              const order = waveUnits
                .map((u, i) => ({ i, spd: u.champion.baseStats.spd }))
                .sort((a, b) => b.spd - a.spd)
                .map(o => o.i);
              setUnits(waveUnits);
              unitsRef.current = waveUnits;
              setTurnOrder(order);
              turnOrderRef.current = order;
              setCurrentTurnIndex(0);
              setSelectedSkill(null);
              setTurnTimer(15);
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
            const r = calculateRewards(1);
            r.souls = Math.floor(stageRewards.souls * starMultiplier);
            r.exp = Math.floor(stageRewards.exp * starMultiplier);
            const campaignArtifacts = generateCampaignArtifacts(stage.chapter, stage.stageNumber, diff);
            r.droppedArtifacts = campaignArtifacts;
            r.artifactDrop = campaignArtifacts.length > 0;
            r.artifactRarity = campaignArtifacts[0]?.rarity;
            r.runes = Math.floor(stageRewards.runes * starMultiplier);
            setRewards(r);
            if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
            addSouls(r.souls);
            addRunes(Math.floor(stageRewards.runes * starMultiplier));
            addXpToSquad(r.exp);
            updateCampaignProgress(diff, stage.chapter, stage.stageNumber, stage.id, stars);
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
              result: 'win',
            });
          } else if (templeData) {
            const droppedRunes = rollRuneReward(templeData.temple, templeData.floor);
            addDivineRunes(templeData.temple.element, droppedRunes.length);
            const souls = Math.floor((30 + 1 * 2) * (1 + templeData.floor * 0.3));
            const exp = Math.floor((50 + 1 * 3) * (1 + templeData.floor * 0.3));
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
              result: 'loss',
            });
          }
          setBattleState('defeat');
          setUnits(finalUnits);
          return;
        }
      }
    }

    setUnits(finalUnits);
    setCurrentTurnIndex(next);
    setSelectedSkill(null);
    setTurnTimer(15);
    // Count player turns only
    if (!finalUnits[to[next]]?.isEnemy) {
      setTurnCount(prev => prev + 1);
      turnCountRef.current += 1;
    }
  }, [currentTurnIndex, processUnitEffects, addLog, arenaData, arenaState.arenaRating, processArenaVictory, updateArenaRating, recordArenaBattle, campaignData, campaignProgress, templeData, addArtifacts, addSouls, addRunes, addXpToSquad, addDivineRunes, updateCampaignProgress]);

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
        if (shieldResult.shieldAbsorbed > 0) addLog(`🛡✨ ${enemy.champion.name}: щит поглотил ${shieldResult.shieldAbsorbed} урона`, 'buff');
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
      newUnits = unitsRef.current.map((u, i) => {
        let updated = u;
        if (i === defenderIdx) {
          const shieldResult = applyDamageWithShield(updated, result.finalDamage);
          updated = shieldResult.unit;
        }
        if (i === attackerIdx) updated = applyCooldown(updated, skillIdx);
        return updated;
      });
    }

    // Floating numbers for single-target
    if (skill.type !== 'aoe') {
      if (result.isMiss) {
        spawnFloat(defender.id, 0, 'miss');
      } else {
        spawnFloat(defender.id, result.finalDamage, result.isCrit ? 'crit' : 'damage');
      }
    }

    // log damage
    if (result.isMiss) {
      addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ПРОМАХ!`, 'miss');
    } else {
      const extra = result.isCrit ? ' 💥КРИТ!' : result.elementAdvantage ? ' ✨элем.' : '';
      addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ${defender.champion.name} (-${result.finalDamage})${extra}`,
        result.isCrit ? 'crit' : result.elementAdvantage ? 'advantage' : 'normal');
    }

    // Apply skill effects
    newUnits = applySkillEffects(skill, attackerIdx, defenderIdx, newUnits, addLog);

    // Lifesteal: check if attacker has lifesteal buff (from any source), heal for % of damage dealt
    if (!result.isMiss && result.finalDamage > 0) {
      const lsBuff = newUnits[attackerIdx].effects.find(e => e.type === 'lifesteal');
      if (lsBuff) {
        const healAmt = Math.floor(result.finalDamage * (lsBuff.value ?? 50) / 100);
        const atk = newUnits[attackerIdx];
        const actualHeal = Math.min(healAmt, atk.maxHp - atk.currentHp);
        newUnits[attackerIdx] = { ...atk, currentHp: Math.min(atk.maxHp, atk.currentHp + healAmt) };
        if (actualHeal > 0) {
          addLog(`🧛 ${atk.champion.name} крадёт ${actualHeal} HP`, 'heal');
          spawnFloat(atk.id, actualHeal, 'heal');
        }
      }
    }

    // Counterattack check: if defender has counterattack effect and is alive
    if (newUnits[defenderIdx].currentHp > 0 && !result.isMiss) {
      const hasCounter = newUnits[defenderIdx].effects.some(e => e.type === 'counterattack');
      if (hasCounter) {
        const counterSkill = newUnits[defenderIdx].champion.skills[0]; // basic attack
        const counterResult = calculateDamage(
          newUnits[defenderIdx].champion, newUnits[attackerIdx].champion, counterSkill,
          undefined, undefined,
          newUnits[defenderIdx], newUnits[attackerIdx]
        );
        const counterShield = applyDamageWithShield(newUnits[attackerIdx], counterResult.finalDamage);
        newUnits = newUnits.map((u, i) =>
          i === attackerIdx ? counterShield.unit : u
        );
        const cIcon = ELEMENT_ICONS[newUnits[defenderIdx].champion.element];
        addLog(`↩️ ${newUnits[defenderIdx].champion.name} контратакует ${attacker.champion.name} (-${counterResult.finalDamage})${counterResult.isCrit ? ' 💥КРИТ!' : ''}`, 'normal');
      }
    }

    // World boss: boss never dies, track damage dealt
    if (worldBossData) {
      // Accumulate damage dealt to boss (boss HP doesn't decrease meaningfully)
      const bossUnit = newUnits.find(u => u.isEnemy);
      if (bossUnit) {
        const dmgDealt = bossUnit.maxHp - bossUnit.currentHp;
        // Reset boss HP (infinite HP)
        newUnits = newUnits.map(u => u.isEnemy ? { ...u, currentHp: u.maxHp } : u);
        setWorldBossTotalDamage(prev => prev + (result.isMiss ? 0 : result.finalDamage));
      }
    }

    // check win/lose
    const aliveEnemies = newUnits.filter(u => u.isEnemy && u.currentHp > 0);
    const alivePlayers = newUnits.filter(u => !u.isEnemy && u.currentHp > 0);

    // World boss: boss never "dies" — skip victory for world boss
    if (aliveEnemies.length === 0 && !worldBossData) {
      // Campaign wave check: if more waves remain, spawn next wave
      if (campaignData?.waves && currentWaveRef.current < (campaignData.waves.length - 1)) {
        const nextWaveIdx = currentWaveRef.current + 1;
        const waveUnits = spawnNextWave(newUnits, nextWaveIdx);
        if (waveUnits) {
          setCurrentWave(nextWaveIdx);
          currentWaveRef.current = nextWaveIdx;
          const isBossWave = campaignData.stage.isBoss && nextWaveIdx === campaignData.waves.length - 1;
          addLog(`🔔 Раунд ${nextWaveIdx + 1}/${campaignData.waves.length}!${isBossWave ? ' ⚠️ БОСС!' : ''}`, 'buff');
          // Rebuild turn order with new units
          const order = waveUnits
            .map((u, i) => ({ i, spd: u.champion.baseStats.spd }))
            .sort((a, b) => b.spd - a.spd)
            .map(o => o.i);
          setUnits(waveUnits);
          unitsRef.current = waveUnits;
          setTurnOrder(order);
          turnOrderRef.current = order;
          setCurrentTurnIndex(0);
          setSelectedSkill(null);
          setTurnTimer(15);
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
        r.souls = Math.floor(stageRewards.souls * starMultiplier);
        r.exp = Math.floor(stageRewards.exp * starMultiplier);
        
        // Campaign-specific artifact drops (chapter determines set, stage determines slot, difficulty determines rarity)
        const campaignArtifacts = generateCampaignArtifacts(stage.chapter, stage.stageNumber, diff);
        r.droppedArtifacts = campaignArtifacts;
        r.artifactDrop = campaignArtifacts.length > 0;
        r.artifactRarity = campaignArtifacts[0]?.rarity;
        r.runes = Math.floor(stageRewards.runes * starMultiplier);
        setRewards(r);
        if (r.droppedArtifacts.length > 0) addArtifacts(r.droppedArtifacts);
        addSouls(r.souls);
        addRunes(Math.floor(stageRewards.runes * starMultiplier));
        addXpToSquad(r.exp);
        updateCampaignProgress(diff, stage.chapter, stage.stageNumber, stage.id, stars);
        addLog(`🏆 Победа! ⭐${stars}/3 +${r.souls} душ, +${Math.floor(stageRewards.runes * starMultiplier)} рун, +${r.exp} опыта${isFirst ? ' (первое прохождение!)' : ''}`, 'buff');
      } else if (templeData) {
        // Temple battle rewards: divine runes only, no artifacts
        const droppedRunes = rollRuneReward(templeData.temple, templeData.floor);
        addDivineRunes(templeData.temple.element, droppedRunes.length);
        const souls = Math.floor((30 + 1 * 2) * (1 + templeData.floor * 0.3));
        const exp = Math.floor((50 + 1 * 3) * (1 + templeData.floor * 0.3));
        const r: BattleRewards = {
          souls,
          exp,
          artifactDrop: false,
          droppedArtifacts: [],
          templeRunes: {
            count: droppedRunes.length,
            runeName: templeData.temple.runeName,
            runeRarity: templeData.floorData.runeRarity,
            runeIcon: templeData.temple.runeIcon,
            element: templeData.temple.element as string,
          },
        };
        setRewards(r);
        addSouls(r.souls);
        addXpToSquad(r.exp);
        addLog(`🏆 Победа! +${droppedRunes.length} ${templeData.temple.runeName} (${templeData.floorData.runeRarity}) +${r.souls} душ, +${r.exp} опыта`, 'buff');
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
          result: 'win',
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
        const totalDmg = worldBossTotalDamage;
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
        if (user) {
          (async () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const { data: existing } = await supabase
              .from('world_boss_damage')
              .select('damage_total, damage_today, last_attack_date')
              .eq('user_id', user.id)
              .eq('boss_id', bossId)
              .maybeSingle();

            const isNewDay = existing?.last_attack_date !== todayStr;
            const prevTotal = existing?.damage_total ?? 0;
            const prevToday = isNewDay ? 0 : (existing?.damage_today ?? 0);

            await supabase.from('world_boss_damage').upsert({
              user_id: user.id,
              boss_id: bossId,
              damage_today: prevToday + totalDmg,
              damage_total: prevTotal + totalDmg,
              attacks_used: 1,
              last_attack_date: todayStr,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,boss_id' });
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
          result: 'loss',
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

    // World Boss: track rounds & scale ATK every 10 rounds
    if (worldBossData) {
      setWorldBossRound(prev => {
        const newRound = prev + 1;
        if (newRound % 10 === 0) {
          const cycle = Math.floor(newRound / 10);
          const atkBoost = 1 + cycle * 0.15; // +15% per 10 rounds
          const currentBoss = worldBossData?.bossId === 'cerberus' ? CERBERUS_BOSS : HYDRA_BOSS;
          const bossName = currentBoss.name;
          setUnits(prevUnits => prevUnits.map(u => {
            if (!u.isEnemy) return u;
            const newAtk = Math.floor(currentBoss.baseStats.atk * atkBoost);
            return {
              ...u,
              champion: {
                ...u.champion,
                baseStats: { ...u.champion.baseStats, atk: newAtk },
              },
            };
          }));
          addLog(`🔥 ${bossName} усиливается! АТК x${atkBoost.toFixed(2)} (раунд ${newRound})`, 'debuff');
        }
        return newRound;
      });
    }

    const delay = speedX2 ? 400 : 1000;
    const timer = setTimeout(() => {
      const target = chooseTarget(currentUnit, unitsRef.current, difficultyTier);
      if (!target) { advanceTurn(); return; }
      const skillIdx = chooseSkill(currentUnit, target, difficultyTier);
      const attackerIdx = turnOrderRef.current[currentTurnIndex];
      const defenderIdx = unitsRef.current.indexOf(target);
      executeAttack(attackerIdx, defenderIdx, skillIdx);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentTurnIndex, battleState, currentUnit, advanceTurn, executeAttack, handleCCTurn, difficultyTier, speedX2, worldBossData, addLog]);

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
    if (battleState !== 'fighting' || units.length === 0 || worldBossData) return;
    if (victoryProcessedRef.current) return;

    const aliveEnemies = units.filter(u => u.isEnemy && u.currentHp > 0);
    const alivePlayers = units.filter(u => !u.isEnemy && u.currentHp > 0);

    if (aliveEnemies.length === 0) {
      // Campaign wave check in safety net
      if (campaignData?.waves && currentWaveRef.current < (campaignData.waves.length - 1)) {
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
          const droppedRunes = rollRuneReward(templeData.temple, templeData.floor);
          addDivineRunes(templeData.temple.element, droppedRunes.length);
          const souls = Math.floor((30 + 1 * 2) * (1 + templeData.floor * 0.3));
          const exp = Math.floor((50 + 1 * 3) * (1 + templeData.floor * 0.3));
          const r: BattleRewards = {
            souls, exp, artifactDrop: false, droppedArtifacts: [],
            templeRunes: { count: droppedRunes.length, runeName: templeData.temple.runeName, runeRarity: templeData.floorData.runeRarity, runeIcon: templeData.temple.runeIcon, element: templeData.temple.element as string },
          };
          setRewards(r);
          addSouls(r.souls);
          addXpToSquad(r.exp);
        } else if (arenaData) {
          const currentRating = arenaState.arenaRating;
          const rank = getArenaRank(currentRating);
          processArenaVictory(arenaData.opponentId, ARENA_WIN_RATING, rank.tier);
          setRewards({ souls: 0, exp: 0, artifactDrop: false, droppedArtifacts: [] });
          recordArenaBattle({
            opponentId: arenaData.opponentId,
            opponentName: arenaData.opponentName || '',
            attackerRating: currentRating,
            defenderRating: arenaData.opponentRating || 0,
            ratingChange: ARENA_WIN_RATING,
            result: 'win',
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
          result: 'loss',
        });
      }
      setBattleState('defeat');
    }
  }, [units, battleState, worldBossData, rewards, campaignData, campaignProgress, templeData, arenaData, arenaState.arenaRating, addArtifacts, addSouls, addRunes, addXpToSquad, addDivineRunes, addLog, updateCampaignProgress, processArenaVictory, updateArenaRating, recordArenaBattle]);

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
          return 15;
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

            {/* Battlefield */}
            <div className="flex flex-col gap-3 sm:gap-5 mb-2 sm:mb-3 max-w-2xl mx-auto">
              {/* enemies — two rows */}
              <div>
                {(() => {
                  const enemies = units.filter(u => u.isEnemy);
                  const enemyTaunter = units.find(t => t.isEnemy && t.currentHp > 0 && hasEffect(t, 'taunt'));
                  const half = Math.ceil(enemies.length / 2);
                  const rows = enemies.length > 3 ? [enemies.slice(0, half), enemies.slice(half)] : [enemies];
                  const isWorldBossBattle = !!worldBossData && enemies.length === 1;
                  return (
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      {rows.map((row, ri) => (
                        <div key={ri} className="flex justify-center gap-2 sm:gap-3">
                          {row.map(u => {
                            const globalIdx = units.indexOf(u);
                            const isTargetable = selectedSkill !== null && u.currentHp > 0 && !currentUnit.isEnemy && !isAllyTargetSkill
                              && (!enemyTaunter || u.id === enemyTaunter.id);
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

          </>
        )}

        {(battleState === 'victory' || battleState === 'defeat') && (
          <ResultScreen
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
