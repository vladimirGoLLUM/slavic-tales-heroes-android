import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAMPIONS, ELEMENT_ICONS, type Champion } from '@/data/gameData';
import { calculateDamage, type CombatResult } from '@/utils/combat';
import { updateCooldowns, applyCooldown, type BattleUnit } from '@/ai/enemyAI';
import { applyEffect, processEffects, isCC, cleanse, applyDamageWithShield, tickCCEffects, hasEffect } from '@/utils/effects';
import { EFFECT_ICONS, EFFECT_NAMES, isBuffType } from '@/types/game';
import EffectIcon from '@/components/game/EffectIcon';
import type { EffectApplication, StatusEffect } from '@/types/game';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import bgBattle from '@/assets/bg-battle.jpg';

/* ─── types ─── */

interface BattleLogEntry {
  id: number;
  message: string;
  type: 'normal' | 'crit' | 'miss' | 'advantage' | 'heal' | 'buff' | 'debuff' | 'dot';
  turn?: number;
}

interface HeroStats {
  id: string;
  name: string;
  isEnemy: boolean;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  healingReceived: number;
  kills: number;
  buffsApplied: number;
  debuffsApplied: number;
  dotDamageDealt: number;
  dotDamageTaken: number;
  turnsPlayed: number;
  skillsUsed: Record<string, number>;
  maxHit: number;
  crits: number;
  misses: number;
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
  const grouped = effects.reduce<Record<string, StatusEffect[]>>((acc, eff) => {
    (acc[eff.type] ??= []).push(eff);
    return acc;
  }, {});
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
        {Object.entries(grouped).map(([type, effs]) => {
          const representative = effs[0];
          const count = effs.length;
          const maxDuration = Math.max(...effs.map(e => e.duration));
          const totalValue = effs.reduce((s, e) => s + e.value, 0);
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <span className={`text-xs px-1 rounded cursor-default inline-flex items-center gap-0.5 ${
                  isBuffType(representative.type) ? 'bg-primary/20 border border-primary/30' : 'bg-accent/20 border border-accent/30'
                }`}>
                  <EffectIcon type={representative.type} size={14} />
                  {count > 1 && <span className="text-[10px] font-bold">x{count}</span>}
                  <span className="text-[10px] ml-0.5">{maxDuration}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-kelly">{EFFECT_NAMES[representative.type]}</div>
                {count > 1 && <div className="text-primary font-bold">x{count} стаков</div>}
                {totalValue > 0 && <div>Итого: {Math.round(totalValue)}%</div>}
                <div>{maxDuration} ход(а)</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function CalcUnitCard({ u, isTargetable, isActive, onClick }: {
  u: BattleUnit;
  isTargetable?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const hpPercent = (u.currentHp / u.maxHp) * 100;
  const stunned = isCC(u);
  return (
    <motion.div
      animate={{ opacity: u.currentHp > 0 ? 1 : 0.3, scale: isActive ? 1.06 : 1 }}
      onClick={onClick}
      className={`relative bg-surface/60 rounded-xl p-2 card-lubok transition-all ${
        isTargetable ? 'ring-2 ring-accent hover:ring-accent/80 cursor-crosshair' : ''
      } ${stunned ? 'grayscale-[40%]' : ''}`}
    >
      <img src={u.champion.imageUrl} alt={u.champion.name} className="w-full h-20 object-cover rounded-lg hero-image-filter" loading="lazy" />
      <div className="mt-1 text-xs font-kelly text-center truncate">{u.champion.name}</div>
      <div className="w-full h-1.5 bg-muted rounded-full mt-1">
        <div className="h-full blood-gauge rounded-full transition-all duration-500" style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="text-center font-mono text-xs text-muted-foreground">{u.currentHp}/{u.maxHp}</div>
      <EffectBadges effects={u.effects} />
      {isActive && u.currentHp > 0 && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary animate-pulse-glow"
          style={{ boxShadow: '0 0 0 1px hsl(var(--primary) / 0.9), 0 0 28px hsl(var(--primary) / 0.55)' }}
        />
      )}
      {stunned && u.currentHp > 0 && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">⭐</span>
      )}
    </motion.div>
  );
}

/* ─── Hero Picker ─── */

function HeroPicker({ side, team, setTeam }: {
  side: string;
  team: Champion[];
  setTeam: (t: Champion[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = CHAMPIONS.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  const toggle = (c: Champion) => {
    if (team.find(h => h.id === c.id)) {
      setTeam(team.filter(h => h.id !== c.id));
    } else if (team.length < 4) {
      setTeam([...team, c]);
    }
  };

  return (
    <div className="bg-surface/60 rounded-xl p-4 card-lubok">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-kelly text-foreground">{side} ({team.length}/4)</h3>
        <button onClick={() => setOpen(!open)} className="text-xs font-kelly text-primary hover:text-primary/80">
          {open ? 'Скрыть' : '+ Выбрать героев'}
        </button>
      </div>

      {/* Selected */}
      <div className="flex gap-2 flex-wrap mb-2">
        {team.map(c => (
          <div key={c.id} className="flex items-center gap-1 bg-background/40 rounded-lg px-2 py-1">
            <img src={c.imageUrl} alt={c.name} className="w-6 h-6 rounded object-cover" />
            <span className="text-xs font-kelly">{c.name}</span>
            <button onClick={() => toggle(c)} className="text-xs text-accent ml-1">✕</button>
          </div>
        ))}
        {team.length === 0 && <span className="text-xs text-muted-foreground">Выбери до 4 героев</span>}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Поиск героя..."
              className="w-full bg-background/40 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground mb-2 outline-none border border-border/30 focus:border-primary/50"
            />
            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {filtered.map(c => {
                const selected = !!team.find(h => h.id === c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left text-xs transition-all ${
                      selected ? 'bg-primary/20 ring-1 ring-primary' : 'bg-background/30 hover:bg-background/50'
                    } ${team.length >= 4 && !selected ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={team.length >= 4 && !selected}
                  >
                    <img src={c.imageUrl} alt={c.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    <div>
                      <div className="font-kelly truncate">{c.name}</div>
                      <div className="text-muted-foreground">{ELEMENT_ICONS[c.element]} {c.rarity}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── main component ─── */

export default function CalculatorPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'setup' | 'fighting' | 'done'>('setup');
  const [teamA, setTeamA] = useState<Champion[]>([]);
  const [teamB, setTeamB] = useState<Champion[]>([]);

  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [turnOrder, setTurnOrder] = useState<number[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [heroStats, setHeroStats] = useState<Record<string, HeroStats>>({});
  const [turnNumber, setTurnNumber] = useState(1);
  const [showFullLog, setShowFullLog] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const unitsRef = useRef(units);
  unitsRef.current = units;
  const turnOrderRef = useRef(turnOrder);
  turnOrderRef.current = turnOrder;
  const turnNumberRef = useRef(turnNumber);
  turnNumberRef.current = turnNumber;
  const heroStatsRef = useRef(heroStats);
  heroStatsRef.current = heroStats;

  const addLog = useCallback((message: string, type: BattleLogEntry['type'] = 'normal') => {
    setLog(prev => [...prev, { id: Date.now() + Math.random(), message, type, turn: turnNumberRef.current }]);
  }, []);

  const updateStat = useCallback((unitId: string, updater: (s: HeroStats) => HeroStats) => {
    setHeroStats(prev => {
      const cur = prev[unitId];
      if (!cur) return prev;
      return { ...prev, [unitId]: updater(cur) };
    });
  }, []);

  const initStats = (allUnits: BattleUnit[]) => {
    const stats: Record<string, HeroStats> = {};
    for (const u of allUnits) {
      stats[u.id] = {
        id: u.id, name: u.champion.name, isEnemy: u.isEnemy,
        damageDealt: 0, damageTaken: 0, healingDone: 0, healingReceived: 0,
        kills: 0, buffsApplied: 0, debuffsApplied: 0, dotDamageDealt: 0, dotDamageTaken: 0,
        turnsPlayed: 0, skillsUsed: {}, maxHit: 0, crits: 0, misses: 0,
      };
    }
    return stats;
  };

  /* resolve targets */
  function resolveTargets(eff: EffectApplication, attackerIdx: number, defenderIdx: number, units: BattleUnit[]): number[] {
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
      case 'lowest_hp_ally': {
        const allies = units.map((u, i) => ({ u, i })).filter(({ u }) => u.isEnemy === attacker.isEnemy && u.currentHp > 0);
        if (allies.length === 0) return [attackerIdx];
        allies.sort((a, b) => (a.u.currentHp / a.u.maxHp) - (b.u.currentHp / b.u.maxHp));
        return [allies[0].i];
      }
      case 'all_allies':
        return units.map((u, i) => ({ u, i })).filter(({ u }) => u.isEnemy === attacker.isEnemy && u.currentHp > 0).map(({ i }) => i);
      case 'all_enemies':
        return units.map((u, i) => ({ u, i })).filter(({ u }) => u.isEnemy !== attacker.isEnemy && u.currentHp > 0).map(({ i }) => i);
      default: return [];
    }
  }

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
      if (eff.type === 'cleanse') {
        const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
        for (const tIdx of targets) {
          updatedUnits[tIdx] = cleanse(updatedUnits[tIdx]);
          logFn(`✨ ${updatedUnits[tIdx].champion.name}: дебаффы сняты!`, 'buff');
        }
        continue;
      }

      if (eff.type === 'revive') {
        const deadAllies = updatedUnits
          .map((u, i) => ({ u, i }))
          .filter(({ u }) => u.isEnemy === attacker.isEnemy && u.currentHp <= 0);
        // Prefer the manually selected target (defenderIdx)
        const selectedDead = updatedUnits[defenderIdx]?.isEnemy === attacker.isEnemy && updatedUnits[defenderIdx]?.currentHp <= 0
          ? { u: updatedUnits[defenderIdx], i: defenderIdx }
          : deadAllies[0];
        if (selectedDead) {
          const target = selectedDead;
          const reviveHp = Math.floor(target.u.maxHp * (eff.value ?? 30) / 100);
          updatedUnits[target.i] = { ...target.u, currentHp: reviveHp, effects: [] };
          logFn(`🔄 ${target.u.champion.name} воскрешён с ${reviveHp} HP!`, 'heal');
          updateStat(attacker.id, s => ({ ...s, healingDone: s.healingDone + reviveHp }));
          updateStat(target.u.id, s => ({ ...s, healingReceived: s.healingReceived + reviveHp }));
        } else {
          logFn(`🔄 Нет павших союзников для воскрешения`, 'normal');
        }
        continue;
      }

      // Heal effect
      if (eff.type === 'heal') {
        const targets = resolveTargets(eff, attackerIdx, defenderIdx, updatedUnits);
        for (const tIdx of targets) {
          const target = updatedUnits[tIdx];
          const healAmt = Math.floor(target.maxHp * (eff.value ?? 0) / 100);
          const actualHeal = Math.min(healAmt, target.maxHp - target.currentHp);
          updatedUnits[tIdx] = { ...target, currentHp: Math.min(target.maxHp, target.currentHp + healAmt) };
          if (actualHeal > 0) {
            logFn(`💖 ${target.champion.name} исцелён на ${actualHeal} HP [${updatedUnits[tIdx].currentHp}/${target.maxHp}]`, 'heal');
            updateStat(attacker.id, s => ({ ...s, healingDone: s.healingDone + actualHeal }));
            updateStat(target.id, s => ({ ...s, healingReceived: s.healingReceived + actualHeal }));
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
          logFn(`${icon} ${updatedUnits[tIdx].champion.name}: ${name}${eff.value ? ` (${eff.value}%)` : ''} на ${eff.duration} ход(а)`, isBuff ? 'buff' : 'debuff');
          if (isBuff) {
            updateStat(attacker.id, s => ({ ...s, buffsApplied: s.buffsApplied + 1 }));
          } else {
            updateStat(attacker.id, s => ({ ...s, debuffsApplied: s.debuffsApplied + 1 }));
          }
        }
      }
    }
    return updatedUnits;
  }, [updateStat]);

  const processUnitEffects = useCallback((unitIdx: number, currentUnits: BattleUnit[]): BattleUnit[] => {
    const unit = currentUnits[unitIdx];
    if (!unit || unit.currentHp <= 0 || unit.effects.length === 0) return currentUnits;
    const { unit: processed, dotDamage } = processEffects(unit);
    const updated = [...currentUnits];
    updated[unitIdx] = processed;
    if (dotDamage > 0) {
      const dots = unit.effects.filter(e => ['poison', 'bleed', 'burn'].includes(e.type));
      addLog(`${dots.map(e => EFFECT_NAMES[e.type]).join(', ')} ${unit.champion.name} получает ${dotDamage} урона от эффектов`, 'dot');
      updateStat(unit.id, s => ({ ...s, dotDamageTaken: s.dotDamageTaken + dotDamage }));
      // attribute dot damage to sources
      for (const dot of dots) {
        updateStat(dot.sourceId, s => ({ ...s, dotDamageDealt: s.dotDamageDealt + Math.floor(unit.maxHp * dot.value / 100) }));
      }
    }
    if (processed.currentHp > unit.currentHp && dotDamage === 0) {
      const healAmt = processed.currentHp - unit.currentHp;
      addLog(`💚 ${unit.champion.name} восстанавливает ${healAmt} HP`, 'heal');
      updateStat(unit.id, s => ({ ...s, healingReceived: s.healingReceived + healAmt }));
    }
    return updated;
  }, [addLog, updateStat]);

  /* start fight */
  const startFight = useCallback(() => {
    if (teamA.length === 0 || teamB.length === 0) return;

    const mkUnits = (team: Champion[], isEnemy: boolean): BattleUnit[] =>
      team.map((c, i) => ({
        id: `${isEnemy ? 'b' : 'a'}-${c.id}-${i}`,
        champion: c,
        currentHp: c.baseStats.hp,
        maxHp: c.baseStats.hp,
        isEnemy,
        skillCooldowns: c.skills.map(() => 0),
        effects: [],
      }));

    const allUnits = [...mkUnits(teamA, false), ...mkUnits(teamB, true)];
    const order = allUnits
      .map((u, i) => ({ i, spd: u.champion.baseStats.spd }))
      .sort((a, b) => b.spd - a.spd)
      .map(o => o.i);

    setUnits(allUnits);
    setTurnOrder(order);
    setCurrentTurnIndex(0);
    setPhase('fighting');
    setLog([{ id: 0, message: '⚔️ Калькулятор: бой начался!', type: 'normal', turn: 1 }]);
    setSelectedSkill(null);
    setHeroStats(initStats(allUnits));
    setTurnNumber(1);
    setShowFullLog(false);
    setShowStats(true);
  }, [teamA, teamB]);

  const currentUnit = phase === 'fighting' ? units[turnOrder[currentTurnIndex]] : null;

  /* advance turn */
  const advanceTurn = useCallback((freshUnits?: BattleUnit[]) => {
    const u = freshUnits ?? unitsRef.current;
    const to = turnOrderRef.current;
    let next = (currentTurnIndex + 1) % to.length;
    let attempts = 0;
    while (u[to[next]]?.currentHp <= 0 && attempts < to.length) {
      next = (next + 1) % to.length;
      attempts++;
    }

    // Track turn number (full cycle = 1 round)
    if (next <= currentTurnIndex) {
      setTurnNumber(prev => prev + 1);
    }

    const nextUnitIdx = to[next];
    let finalUnits = [...u];
    if (u[nextUnitIdx] && u[nextUnitIdx].currentHp > 0) {
      const afterEffects = processUnitEffects(nextUnitIdx, u);
      finalUnits = afterEffects.map((unit, i) => i === nextUnitIdx ? updateCooldowns(unit) : unit);
      if (finalUnits[nextUnitIdx].currentHp <= 0) {
        addLog(`💀 ${finalUnits[nextUnitIdx].champion.name} погибает от эффектов!`, 'dot');
        const aliveA = finalUnits.filter(u => !u.isEnemy && u.currentHp > 0);
        const aliveB = finalUnits.filter(u => u.isEnemy && u.currentHp > 0);
        if (aliveA.length === 0 || aliveB.length === 0) {
          setUnits(finalUnits);
          setPhase('done');
          addLog(aliveA.length === 0 ? '🔴 Команда Б победила!' : '🔵 Команда А победила!', 'buff');
          return;
        }
      }
    }

    setUnits(finalUnits);
    setCurrentTurnIndex(next);
    setSelectedSkill(null);
  }, [currentTurnIndex, processUnitEffects, addLog]);

  /* Execute a self-only buff (no target needed) */
  const executeSelfBuff = useCallback((attackerIdx: number, skillIdx: number) => {
    const attacker = unitsRef.current[attackerIdx];
    if (!attacker) return;
    const skill = attacker.champion.skills[skillIdx];

    let newUnits = unitsRef.current.map((u, i) =>
      i === attackerIdx ? applyCooldown(u, skillIdx) : u
    );

    updateStat(attacker.id, s => ({
      ...s,
      turnsPlayed: s.turnsPlayed + 1,
      skillsUsed: { ...s.skillsUsed, [skill.name]: (s.skillsUsed[skill.name] || 0) + 1 },
    }));

    const icon = ELEMENT_ICONS[attacker.champion.element];
    addLog(`${icon} ${attacker.champion.name} использует ${skill.name}`, 'buff');

    newUnits = applySkillEffects(skill, attackerIdx, attackerIdx, newUnits, addLog);
    advanceTurn(newUnits);
  }, [advanceTurn, addLog, applySkillEffects, updateStat]);

  /* execute attack */
  const executeAttack = useCallback((attackerIdx: number, defenderIdx: number, skillIdx: number) => {
    const attacker = unitsRef.current[attackerIdx];
    const defender = unitsRef.current[defenderIdx];
    if (!attacker || !defender) return;

    const skill = attacker.champion.skills[skillIdx];

    // Self-only buff → redirect
    if (skill.type === 'buff' && skill.effects?.every(e => e.target === 'self' || e.target === 'all_allies')) {
      executeSelfBuff(attackerIdx, skillIdx);
      return;
    }

    const result = calculateDamage(attacker.champion, defender.champion, skill, undefined, undefined, attacker, defender);

    // Track stats
    updateStat(attacker.id, s => ({
      ...s,
      turnsPlayed: s.turnsPlayed + 1,
      skillsUsed: { ...s.skillsUsed, [skill.name]: (s.skillsUsed[skill.name] || 0) + 1 },
      damageDealt: s.damageDealt + result.finalDamage,
      maxHit: Math.max(s.maxHit, result.finalDamage),
      crits: s.crits + (result.isCrit ? 1 : 0),
      misses: s.misses + (result.isMiss ? 1 : 0),
    }));
    updateStat(defender.id, s => ({ ...s, damageTaken: s.damageTaken + result.finalDamage }));

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
        if (shieldResult.shieldAbsorbed > 0) addLog(`🛡✨ ${enemy.champion.name}: щит поглотил ${shieldResult.shieldAbsorbed} урона`, 'buff');
        updateStat(enemy.id, s => ({ ...s, damageTaken: s.damageTaken + res.finalDamage }));
        updateStat(attacker.id, s => ({ ...s, damageDealt: s.damageDealt + res.finalDamage, maxHit: Math.max(s.maxHit, res.finalDamage) }));
        if (eIdx !== defenderIdx) {
          const extraTag = res.isCrit ? ' 💥КРИТ!' : res.elementAdvantage ? ' ✨элем.' : '';
          const icon = ELEMENT_ICONS[attacker.champion.element];
          addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ${enemy.champion.name} (-${res.finalDamage}) [${enemy.champion.name}: ${Math.max(0, enemy.currentHp - res.finalDamage)}/${enemy.maxHp}]${extraTag}`,
            res.isCrit ? 'crit' : res.elementAdvantage ? 'advantage' : 'normal');
          if (newUnits[eIdx].currentHp <= 0 && enemy.currentHp > 0) {
            updateStat(attacker.id, s => ({ ...s, kills: s.kills + 1 }));
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

    const icon = ELEMENT_ICONS[attacker.champion.element];
    if (result.isMiss) {
      addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ПРОМАХ!`, 'miss');
    } else {
      const extra = result.isCrit ? ' 💥КРИТ!' : result.elementAdvantage ? ' ✨элем.' : '';
      addLog(`${icon} ${attacker.champion.name} → ${skill.name} → ${defender.champion.name} (-${result.finalDamage}) [${defender.champion.name}: ${Math.max(0, defender.currentHp - result.finalDamage)}/${defender.maxHp}]${extra}`,
        result.isCrit ? 'crit' : result.elementAdvantage ? 'advantage' : 'normal');
    }

    // Check kill
    if (newUnits[defenderIdx].currentHp <= 0 && defender.currentHp > 0) {
      updateStat(attacker.id, s => ({ ...s, kills: s.kills + 1 }));
      addLog(`💀 ${defender.champion.name} повержен!`, 'debuff');
    }

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
          updateStat(atk.id, s => ({ ...s, healingDone: s.healingDone + actualHeal }));
        }
      }
    }

    // Counterattack check
    if (newUnits[defenderIdx].currentHp > 0 && !result.isMiss) {
      const hasCounter = newUnits[defenderIdx].effects.some(e => e.type === 'counterattack');
      if (hasCounter) {
        const counterSkill = newUnits[defenderIdx].champion.skills[0];
        const counterResult = calculateDamage(
          newUnits[defenderIdx].champion, newUnits[attackerIdx].champion, counterSkill,
          undefined, undefined, newUnits[defenderIdx], newUnits[attackerIdx]
        );
        const counterShield = applyDamageWithShield(newUnits[attackerIdx], counterResult.finalDamage);
        newUnits = newUnits.map((u, i) =>
          i === attackerIdx ? counterShield.unit : u
        );
        addLog(`↩️ ${newUnits[defenderIdx].champion.name} контратакует ${attacker.champion.name} (-${counterResult.finalDamage})${counterResult.isCrit ? ' 💥КРИТ!' : ''}`, 'normal');
      }
    }

    const aliveA = newUnits.filter(u => !u.isEnemy && u.currentHp > 0);
    const aliveB = newUnits.filter(u => u.isEnemy && u.currentHp > 0);

    if (aliveA.length === 0 || aliveB.length === 0) {
      setUnits(newUnits);
      setPhase('done');
      addLog(aliveA.length === 0 ? '🔴 Команда Б победила!' : '🔵 Команда А победила!', 'buff');
      return;
    }

    advanceTurn(newUnits);
  }, [advanceTurn, addLog, applySkillEffects, updateStat, executeSelfBuff]);

  /* skip turn */
  const handleSkipTurn = useCallback(() => {
    if (!currentUnit || currentUnit.currentHp <= 0) return;
    updateStat(currentUnit.id, s => ({ ...s, turnsPlayed: s.turnsPlayed + 1 }));
    addLog(`⏭️ ${currentUnit.champion.name} пропускает ход`, 'normal');
    advanceTurn();
  }, [currentUnit, advanceTurn, addLog, updateStat]);

  /* Handle CC auto-skip */
  useEffect(() => {
    if (phase !== 'fighting' || !currentUnit) return;
    if (currentUnit.currentHp <= 0) { advanceTurn(); return; }
    if (isCC(currentUnit)) {
      const ccEff = currentUnit.effects.find(e => ['stun', 'freeze', 'sleep', 'fear', 'polymorph'].includes(e.type));
      if (ccEff) addLog(`⭐ ${currentUnit.champion.name} пропускает ход (${EFFECT_NAMES[ccEff.type]})!`, 'debuff');
      const t = setTimeout(() => {
        const unitIdx = turnOrder[currentTurnIndex];
        const updated = [...unitsRef.current];
        updated[unitIdx] = tickCCEffects(updated[unitIdx]);
        setUnits(updated);
        advanceTurn(updated);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [currentTurnIndex, phase, currentUnit, advanceTurn, addLog]);

  /* handlers */
  const handleSkillSelect = (idx: number) => {
    if (!currentUnit || currentUnit.skillCooldowns[idx] > 0 || isCC(currentUnit)) return;
    const skill = currentUnit.champion.skills[idx];
    const isSelfOnly = skill.type === 'buff' && skill.effects?.every(e => e.target === 'self' || e.target === 'all_allies');
    if (isSelfOnly) {
      const attackerIdx = turnOrder[currentTurnIndex];
      executeSelfBuff(attackerIdx, idx);
      return;
    }
    setSelectedSkill(idx);
  };

  const handleTargetSelect = (unitIdx: number) => {
    if (selectedSkill === null || !currentUnit) return;
    const target = units[unitIdx];
    const selected = currentUnit.champion.skills[selectedSkill];
    const needsAllyTarget = selected.effects?.some(e => e.target === 'ally') ?? false;

    const needsDeadAlly = selected.effects?.some(e => e.target === 'dead_ally') ?? false;
    if (needsDeadAlly) {
      if (target.isEnemy !== currentUnit.isEnemy || target.currentHp > 0) return;
    } else if (target.currentHp <= 0) {
      return;
    } else if (needsAllyTarget) {
      if (target.isEnemy !== currentUnit.isEnemy) return;
    } else {
      if (target.isEnemy === currentUnit.isEnemy) return;
      // Провокация: если есть враг с taunt, можно бить только его
      const enemySide = !currentUnit.isEnemy;
      const taunter = units.find(u => u.isEnemy === enemySide && u.currentHp > 0 && hasEffect(u, 'taunt'));
      if (taunter && target.id !== taunter.id) return;
    }

    executeAttack(turnOrder[currentTurnIndex], unitIdx, selectedSkill);
  };

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [log.length]);

  /* Team labels */
  const currentSide = currentUnit ? (currentUnit.isEnemy ? 'Команда Б' : 'Команда А') : '';
  const selected = selectedSkill !== null && currentUnit ? currentUnit.champion.skills[selectedSkill] : null;
  const isAllyTargetSkill = selected?.effects?.some(e => e.target === 'ally') ?? false;
  const isDeadAllyTargetSkill = selected?.effects?.some(e => e.target === 'dead_ally') ?? false;

  return (
    <div className="min-h-screen pb-28 relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img src={bgBattle} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      <div className="relative z-10 px-4 pt-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">←</button>
          <h1 className="text-3xl font-kelly text-primary text-gold-glow">⚖️ Калькулятор боёв</h1>
        </div>

        {phase === 'setup' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <HeroPicker side="🔵 Команда А" team={teamA} setTeam={setTeamA} />
            <HeroPicker side="🔴 Команда Б" team={teamB} setTeam={setTeamB} />

            <button
              onClick={startFight}
              disabled={teamA.length === 0 || teamB.length === 0}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-accent-foreground font-kelly text-xl px-8 py-4 rounded-xl card-lubok transition-all hover:scale-[1.02] active:scale-95"
            >
              ⚔️ Начать бой
            </button>
          </motion.div>
        )}

        {(phase === 'fighting' || phase === 'done') && currentUnit && (
          <>
            {/* Current turn info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-kelly">
                <span className={currentUnit.isEnemy ? 'text-accent' : 'text-primary'}>{currentSide}:</span>
                <span className="text-foreground">{currentUnit.champion.name}</span>
                {isCC(currentUnit) && <span className="text-accent">⭐</span>}
              </div>
            </div>

            {/* Turn bar */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
              {turnOrder.map((idx, ti) => {
                const u = units[idx];
                if (!u || u.currentHp <= 0) return null;
                const isCurrent = ti === currentTurnIndex;
                return (
                  <div key={u.id} className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-kelly transition-all ${
                    isCurrent ? 'bg-primary text-primary-foreground scale-110' : 'bg-surface text-surface-foreground'
                  } ${u.isEnemy ? 'border border-accent/30' : 'border border-primary/30'}`}>
                    {ELEMENT_ICONS[u.champion.element]} {u.champion.name.split(' ')[0]}
                  </div>
                );
              })}
            </div>

            {/* Battlefield */}
            <div className="grid grid-rows-2 gap-6 mb-4">
              {/* Team B (top) */}
              <div>
                <div className="text-xs font-kelly text-accent mb-1">🔴 Команда Б</div>
                <div className="grid grid-cols-4 gap-3">
                  {units.filter(u => u.isEnemy).map(u => {
                    const globalIdx = units.indexOf(u);
                    const enemySide = currentUnit ? !currentUnit.isEnemy : true;
                    const taunter = units.find(t => t.isEnemy === enemySide && t.currentHp > 0 && hasEffect(t, 'taunt'));
                    const canTarget = selectedSkill !== null && currentUnit && (
                      isDeadAllyTargetSkill
                        ? (u.isEnemy === currentUnit.isEnemy && u.currentHp <= 0)
                        : (u.currentHp > 0 && (isAllyTargetSkill ? u.isEnemy === currentUnit.isEnemy : (u.isEnemy !== currentUnit.isEnemy && (!taunter || u.id === taunter.id))))
                    );
                    return (
                      <CalcUnitCard key={u.id} u={u} isActive={currentUnit === u} isTargetable={canTarget} onClick={() => handleTargetSelect(globalIdx)} />
                    );
                  })}
                </div>
              </div>
              {/* Team A (bottom) */}
              <div>
                <div className="text-xs font-kelly text-primary mb-1">🔵 Команда А</div>
                <div className="grid grid-cols-4 gap-3">
                  {units.filter(u => !u.isEnemy).map(u => {
                    const globalIdx = units.indexOf(u);
                    const allySide = currentUnit ? currentUnit.isEnemy : false;
                    const taunter2 = units.find(t => t.isEnemy === allySide && t.currentHp > 0 && hasEffect(t, 'taunt'));
                    const canTarget = selectedSkill !== null && currentUnit && (
                      isDeadAllyTargetSkill
                        ? (u.isEnemy === currentUnit.isEnemy && u.currentHp <= 0)
                        : (u.currentHp > 0 && (isAllyTargetSkill ? u.isEnemy === currentUnit.isEnemy : (u.isEnemy !== currentUnit.isEnemy && (!taunter2 || u.id === taunter2.id))))
                    );
                    return (
                      <CalcUnitCard key={u.id} u={u} isActive={currentUnit === u} isTargetable={canTarget} onClick={() => handleTargetSelect(globalIdx)} />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Skill panel — both sides manual */}
            {phase === 'fighting' && currentUnit && currentUnit.currentHp > 0 && !isCC(currentUnit) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/80 backdrop-blur-sm rounded-xl p-4 card-lubok">
                <div className="text-sm font-kelly text-muted-foreground mb-2">
                  {ELEMENT_ICONS[currentUnit.champion.element]} {currentSide}: {currentUnit.champion.name}
                  {selectedSkill !== null && <span className="text-accent ml-2">→ {isAllyTargetSkill ? 'Выбери союзника' : 'Выбери цель'}</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {currentUnit.champion.skills.map((skill, i) => {
                    const onCooldown = currentUnit.skillCooldowns[i] > 0;
                    const hasEffects = skill.effects && skill.effects.length > 0;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSkillSelect(i)}
                        disabled={onCooldown}
                        className={`text-left p-2 rounded-lg transition-all text-sm ${
                          selectedSkill === i
                            ? 'bg-primary/20 ring-1 ring-primary'
                            : onCooldown
                              ? 'bg-secondary/30 opacity-50 cursor-not-allowed'
                              : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <div className="font-kelly text-foreground">{skill.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{skill.description.slice(0, 50)}…</div>
                        {hasEffects && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {skill.effects!.map((eff, ei) => (
                              <span key={ei} className={`text-[10px] px-1 rounded ${
                                isBuffType(eff.type) ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
                              }`}><EffectIcon type={eff.type} size={12} /></span>
                            ))}
                          </div>
                        )}
                        {onCooldown && <div className="text-xs text-accent mt-1">⏱ {currentUnit.skillCooldowns[i]} ход(а)</div>}
                      </button>
                    );
                  })}
                </div>
                {/* Skip turn button */}
                <button
                  onClick={handleSkipTurn}
                  className="mt-3 w-full py-2 rounded-lg bg-muted/50 hover:bg-muted/80 text-sm font-kelly text-muted-foreground transition-all"
                >
                  ⏭️ Пропустить ход
                </button>
              </motion.div>
            )}

            {/* Battle log - compact during fight */}
            <div className="mt-4 bg-surface/40 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-kelly text-muted-foreground">📜 Лог боя (ход {turnNumber})</span>
                <button
                  onClick={() => setShowFullLog(!showFullLog)}
                  className="text-xs font-kelly text-primary hover:text-primary/80"
                >
                  {showFullLog ? 'Свернуть' : `Показать всё (${log.length})`}
                </button>
              </div>
              <div ref={logRef} className={`overflow-y-auto ${showFullLog ? 'max-h-96' : 'max-h-32'}`}>
                {(showFullLog ? log : log.slice(-15)).map(e => (
                  <div key={e.id} className={`text-xs font-spectral ${LOG_COLORS[e.type]}`}>
                    {e.turn !== undefined && <span className="text-muted-foreground/50 mr-1">[{e.turn}]</span>}
                    {e.message}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Stats Table */}
            {(phase === 'done' || showStats) && Object.keys(heroStats).length > 0 && (
              <div className="mt-4 bg-surface/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-kelly text-foreground">📊 Статистика боя</span>
                  {phase === 'fighting' && (
                    <button onClick={() => setShowStats(!showStats)} className="text-xs font-kelly text-primary hover:text-primary/80">
                      {showStats ? 'Скрыть' : 'Показать'}
                    </button>
                  )}
                </div>

                {/* Team A stats */}
                <div className="mb-4">
                  <div className="text-xs font-kelly text-primary mb-2">🔵 Команда А</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/30">
                          <th className="text-left py-1 px-1">Герой</th>
                          <th className="text-right py-1 px-1">Урон</th>
                          <th className="text-right py-1 px-1">Получено</th>
                          <th className="text-right py-1 px-1">Лечение</th>
                          <th className="text-right py-1 px-1">Убийства</th>
                          <th className="text-right py-1 px-1">Макс удар</th>
                          <th className="text-right py-1 px-1">Криты</th>
                          <th className="text-right py-1 px-1">Баффы</th>
                          <th className="text-right py-1 px-1">Дебаффы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(heroStats).filter(s => !s.isEnemy).map(s => {
                          const unit = units.find(u => u.id === s.id);
                          return (
                            <tr key={s.id} className="border-b border-border/10 hover:bg-background/20">
                              <td className="py-1.5 px-1 font-kelly">{s.name}</td>
                              <td className="text-right py-1 px-1 text-accent">{s.damageDealt.toLocaleString()}</td>
                              <td className="text-right py-1 px-1 text-red-400">{s.damageTaken.toLocaleString()}</td>
                              <td className="text-right py-1 px-1 text-green-400">{(s.healingDone + s.healingReceived).toLocaleString()}</td>
                              <td className="text-right py-1 px-1">{s.kills}</td>
                              <td className="text-right py-1 px-1 text-primary">{s.maxHit.toLocaleString()}</td>
                              <td className="text-right py-1 px-1">{s.crits}</td>
                              <td className="text-right py-1 px-1 text-primary">{s.buffsApplied}</td>
                              <td className="text-right py-1 px-1 text-accent">{s.debuffsApplied}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Team B stats */}
                <div>
                  <div className="text-xs font-kelly text-accent mb-2">🔴 Команда Б</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/30">
                          <th className="text-left py-1 px-1">Герой</th>
                          <th className="text-right py-1 px-1">Урон</th>
                          <th className="text-right py-1 px-1">Получено</th>
                          <th className="text-right py-1 px-1">Лечение</th>
                          <th className="text-right py-1 px-1">Убийства</th>
                          <th className="text-right py-1 px-1">Макс удар</th>
                          <th className="text-right py-1 px-1">Криты</th>
                          <th className="text-right py-1 px-1">Баффы</th>
                          <th className="text-right py-1 px-1">Дебаффы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(heroStats).filter(s => s.isEnemy).map(s => (
                          <tr key={s.id} className="border-b border-border/10 hover:bg-background/20">
                            <td className="py-1.5 px-1 font-kelly">{s.name}</td>
                            <td className="text-right py-1 px-1 text-accent">{s.damageDealt.toLocaleString()}</td>
                            <td className="text-right py-1 px-1 text-red-400">{s.damageTaken.toLocaleString()}</td>
                            <td className="text-right py-1 px-1 text-green-400">{(s.healingDone + s.healingReceived).toLocaleString()}</td>
                            <td className="text-right py-1 px-1">{s.kills}</td>
                            <td className="text-right py-1 px-1 text-primary">{s.maxHit.toLocaleString()}</td>
                            <td className="text-right py-1 px-1">{s.crits}</td>
                            <td className="text-right py-1 px-1 text-primary">{s.buffsApplied}</td>
                            <td className="text-right py-1 px-1 text-accent">{s.debuffsApplied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                {phase === 'done' && (
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-kelly text-primary mb-1">🔵 Команда А — Итого</div>
                        <div>Общий урон: <span className="text-accent">{Object.values(heroStats).filter(s => !s.isEnemy).reduce((a, s) => a + s.damageDealt, 0).toLocaleString()}</span></div>
                        <div>Общее лечение: <span className="text-green-400">{Object.values(heroStats).filter(s => !s.isEnemy).reduce((a, s) => a + s.healingDone + s.healingReceived, 0).toLocaleString()}</span></div>
                        <div>Убийства: {Object.values(heroStats).filter(s => !s.isEnemy).reduce((a, s) => a + s.kills, 0)}</div>
                      </div>
                      <div>
                        <div className="font-kelly text-accent mb-1">🔴 Команда Б — Итого</div>
                        <div>Общий урон: <span className="text-accent">{Object.values(heroStats).filter(s => s.isEnemy).reduce((a, s) => a + s.damageDealt, 0).toLocaleString()}</span></div>
                        <div>Общее лечение: <span className="text-green-400">{Object.values(heroStats).filter(s => s.isEnemy).reduce((a, s) => a + s.healingDone + s.healingReceived, 0).toLocaleString()}</span></div>
                        <div>Убийства: {Object.values(heroStats).filter(s => s.isEnemy).reduce((a, s) => a + s.kills, 0)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Раундов: {turnNumber}</div>
                  </div>
                )}
              </div>
            )}

            {/* Result / Reset */}
            {phase === 'done' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center">
                <div className="text-2xl font-kelly text-primary mb-4">Бой окончен!</div>
                <button
                  onClick={() => { setPhase('setup'); setLog([]); setUnits([]); setHeroStats({}); }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-kelly px-8 py-3 rounded-xl transition-all"
                >
                  Новый бой
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
