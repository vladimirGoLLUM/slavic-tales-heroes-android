import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import {
  TOTAL_FLOORS, BOSS_INTERVAL, getBossForFloor, getFloorEnemyPower, getFloorRewards,
  type AbyssDifficulty, ABYSS_BOSSES, refreshKeysIfNeeded, buildAbyssEnemyWaves,
  SECRET_ROOMS, isHeroAllowed, getRestrictionLabel, buildSecretRoomWaves,
  type SecretRoom, ABYSS_BOSS_SET_DROP, ABYSS_MILESTONES, getSecretRoomSetReward,
  GOLD_KEYS_DAILY, SILVER_KEYS_DAILY,
} from '@/data/abyssData';
import { ABYSS_BOSS_DATA } from '@/data/abyssBosses';
import { CHAMPIONS, type Element, type Rarity } from '@/data/gameData';
import { calculateUnitPower } from '@/data/campaignStages';
import { SET_ICONS } from '@/data/artifacts';
import { MILESTONE_ITEM_TO_RELIC, getRelicById } from '@/data/relics';
import { toast } from 'sonner';
import SquadPickerModal from '@/components/game/SquadPickerModal';

const MILESTONE_ICONS: Record<number, string> = {
  20: '/ui/milestone_first_steps.png',
  40: '/ui/milestone_warrior.png',
  60: '/ui/milestone_guardian.png',
  80: '/ui/milestone_first_cycle.png',
  100: '/ui/milestone_conqueror.png',
  120: '/ui/milestone_lord.png',
  140: '/ui/milestone_legend.png',
  160: '/ui/milestone_overlord.png',
};

const FLOORS_PER_ROW = 5;

function KeyRefreshTimer() {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-xs text-primary font-mono font-bold">{timeLeft}</span>;
}

function MonthlyResetTimer() {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const diff = nextMonth.getTime() - now.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) {
        setTimeLeft(`${d}д ${String(h).padStart(2, '0')}ч`);
      } else {
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-xs font-mono font-bold text-destructive">{timeLeft}</span>;
}

type Tab = 'floors' | 'secrets' | 'bestiary';

const ELEMENT_COLORS: Record<string, string> = {
  'Тень': 'text-purple-400',
  'Камень': 'text-amber-500',
  'Огонь': 'text-red-400',
  'Вода': 'text-blue-400',
  'Свет': 'text-yellow-300',
  'Лес': 'text-green-400',
};

const SHIELD_ICONS = {
  normal: '/ui/floor_shield_banner.png',
  cleared: '/ui/floor_shield_cleared.png',
  boss: '/ui/floor_shield_boss.png',
  locked: '/ui/floor_shield_locked.png',
};

const FLOOR_TYPE_ICONS: Record<string, string> = {
  swords: '/ui/floor_swords.png',
  dagger: '/ui/floor_dagger.png',
  shield: '/ui/floor_shield.png',
  demon: '/ui/floor_demon.png',
  skull: '/ui/floor_skull.png',
};

function FloorPreviewPopup({ floor, difficulty, x, y }: { floor: number; difficulty: AbyssDifficulty; x: number; y: number }) {
  const rewards = getFloorRewards(floor, difficulty);
  const boss = getBossForFloor(floor);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="fixed z-[100] bg-card/95 border border-primary/40 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-sm pointer-events-none min-w-[160px]"
      style={{ left: Math.min(x, window.innerWidth - 180), top: Math.max(y - 100, 8) }}
    >
      <div className="font-kelly text-sm text-foreground mb-1">Этаж {floor}</div>
      {boss && <div className="text-xs text-purple-300 mb-1">{boss.icon} {boss.name}</div>}
      <div className="space-y-0.5 text-[11px]">
        <div className="flex items-center gap-1">
          <img src="/ui/icon_souls.png" alt="" className="w-3.5 h-3.5" />
          <span className="text-foreground">{rewards.souls} Душ</span>
        </div>
        <div className="flex items-center gap-1">
          <img src="/ui/icon_runes.png" alt="" className="w-3.5 h-3.5" />
          <span className="text-foreground">{rewards.runes} Рун</span>
        </div>
        {rewards.material && (
          <div className="flex items-center gap-1">
            <span>{rewards.materialIcon}</span>
            <span className="text-amber-300">{rewards.material}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface FloorGridProps {
  currentFloor: number;
  nextFloor: number;
  difficulty: AbyssDifficulty;
  fighting: number | null;
  progress: any;
  handleFight: (floor: number) => void;
  playerTopPower: number;
}

function FloorGrid({ currentFloor, nextFloor, difficulty, fighting, handleFight, playerTopPower }: FloorGridProps) {
  const [previewFloor, setPreviewFloor] = useState<{ floor: number; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextFloorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (nextFloorRef.current) {
      nextFloorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const startLongPress = useCallback((floor: number, e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    longPressTimer.current = setTimeout(() => {
      setPreviewFloor({ floor, x: clientX, y: clientY });
    }, 400);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    setPreviewFloor(null);
  }, []);

  const floorIcons = [FLOOR_TYPE_ICONS.swords, FLOOR_TYPE_ICONS.dagger, FLOOR_TYPE_ICONS.shield, FLOOR_TYPE_ICONS.demon, FLOOR_TYPE_ICONS.skull];
  const COLS = 5;

  // Build diagonal zigzag: floors 1-5 go columns 0→4, floors 6-10 go columns 4→0, etc.
  const allFloors = Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1);
  const floorRows = allFloors.map((floor) => {
    const group = Math.floor((floor - 1) / COLS); // which group of 5
    const posInGroup = (floor - 1) % COLS;         // 0-4 within group
    const goingRight = group % 2 === 0;
    const col = goingRight ? posInGroup : (COLS - 1 - posInGroup);
    return { floor, col };
  });

  // Reverse so highest floors are at top
  const displayFloors = [...floorRows].reverse();

  // Build connector pairs for lines (in display order)
  const connectors = displayFloors.slice(0, -1).map((curr, i) => {
    const next = displayFloors[i + 1];
    return { fromCol: curr.col, toCol: next.col };
  });

  const ROW_HEIGHT = 80;

  // Aura colors by floor type — returns solid color for trails and glow for auras
  const getAuraColor = (floor: number, boss: any, cleared: boolean, isNext: boolean, locked: boolean) => {
    if (locked) return 'rgba(100,100,120,0.1)';
    if (isNext) return 'rgba(245,158,11,0.7)';
    if (boss) return 'rgba(220,38,38,0.6)';
    if (cleared) return 'rgba(34,197,94,0.55)';
    const colors = [
      'rgba(139,92,246,0.5)',
      'rgba(59,130,246,0.5)',
      'rgba(6,182,212,0.5)',
      'rgba(245,158,11,0.5)',
      'rgba(236,72,153,0.5)',
    ];
    return colors[floor % colors.length];
  };

  return (
    <>
      <AnimatePresence>{previewFloor && <FloorPreviewPopup floor={previewFloor.floor} difficulty={difficulty} x={previewFloor.x} y={previewFloor.y} />}</AnimatePresence>
      <div className="relative" style={{ height: displayFloors.length * ROW_HEIGHT }}>
        {/* SVG aura trails between floors */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          preserveAspectRatio="none"
        >
          <defs>
            {connectors.map((conn, i) => {
              const curr = displayFloors[i];
              const next = displayFloors[i + 1];
              const boss1 = getBossForFloor(curr.floor);
              const cleared1 = curr.floor <= currentFloor;
              const isNext1 = curr.floor === nextFloor;
              const locked1 = curr.floor > nextFloor;
              const boss2 = getBossForFloor(next.floor);
              const cleared2 = next.floor <= currentFloor;
              const isNext2 = next.floor === nextFloor;
              const locked2 = next.floor > nextFloor;
              const c1 = getAuraColor(curr.floor, boss1, cleared1, isNext1, locked1);
              const c2 = getAuraColor(next.floor, boss2, cleared2, isNext2, locked2);
              return (
                <linearGradient key={`grad-${i}`} id={`aura-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
              );
            })}
            <filter id="line-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {connectors.map((conn, i) => {
            const centerPct1 = conn.fromCol * 20 + 10;
            const centerPct2 = conn.toCol * 20 + 10;
            const centerY1 = i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const centerY2 = (i + 1) * ROW_HEIGHT + ROW_HEIGHT / 2;

            return (
              <line
                key={i}
                x1={`${centerPct1}%`}
                y1={centerY1}
                x2={`${centerPct2}%`}
                y2={centerY2}
                stroke={`url(#aura-grad-${i})`}
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.8"
                filter="url(#line-glow)"
              />
            );
          })}
        </svg>

        {/* Floor nodes */}
        {displayFloors.map(({ floor, col }, rowIdx) => {
          const boss = getBossForFloor(floor);
          const cleared = floor <= currentFloor;
          const isNext = floor === nextFloor;
          const isFighting = fighting === floor;
          const locked = floor > nextFloor;
          const isSecondCycle = floor > 80;
          const floorMod = floor % 5;
          const bossIdx = boss ? ABYSS_BOSSES.findIndex(b => b.id === boss.id) : -1;
          const bossData = bossIdx >= 0 ? ABYSS_BOSS_DATA[bossIdx] : null;

          let shieldImg = SHIELD_ICONS.normal;
          if (locked) shieldImg = SHIELD_ICONS.locked;
          else if (boss) shieldImg = SHIELD_ICONS.boss;
          else if (cleared) shieldImg = SHIELD_ICONS.cleared;

          const auraColor = getAuraColor(floor, boss, cleared, isNext, locked);
          const centerPct = col * 20 + 10;

            const enemyPower = getFloorEnemyPower(floor, difficulty);

            return (
              <div
                key={floor}
                className="absolute z-[1]"
                style={{
                  top: rowIdx * ROW_HEIGHT,
                  left: `${centerPct}%`,
                  transform: 'translateX(-50%)',
                  height: ROW_HEIGHT,
                }}
              >
                {/* Enemy power label above floor */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-[2]">
                  <span className={`text-[12px] font-extrabold drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] ${
                    locked ? 'text-muted-foreground/40'
                    : cleared ? 'text-green-400/70'
                    : (() => {
                        const ratio = playerTopPower > 0 ? enemyPower / playerTopPower : 999;
                        if (ratio > 1.5) return 'text-red-500';
                        if (ratio > 1.15) return 'text-orange-400';
                        if (ratio > 0.85) return 'text-amber-300/80';
                        return 'text-green-400';
                      })()
                  }`}>
                    ⚔ {enemyPower >= 1000 ? `${(enemyPower / 1000).toFixed(1)}k` : enemyPower}
                  </span>
                </div>
                <motion.button
                  ref={isNext ? nextFloorRef : undefined}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0 }}
                  onClick={() => {
                    if (previewFloor) { cancelLongPress(); return; }
                    const isClearedBoss = cleared && !!boss;
                    if (isClearedBoss || isNext) handleFight(floor);
                  }}
                  onTouchStart={(e) => startLongPress(floor, e)}
                  onTouchEnd={cancelLongPress}
                  onMouseDown={(e) => startLongPress(floor, e)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  disabled={!isNext && !(cleared && !!boss) || fighting !== null}
                  className={`relative flex flex-col items-center justify-center rounded-lg transition-all
                    w-[72px] h-[72px] flex-shrink-0
                    ${isNext ? 'z-10' : ''}
                    ${boss ? 'w-[80px] h-[80px]' : ''}
                    ${locked ? 'opacity-40' : ''}
                  `}
                >
                  {/* Aura glow behind icon — pulsing 3s cycle */}
                  {!locked && (
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        background: `radial-gradient(circle, ${auraColor} 0%, ${auraColor} 30%, transparent 70%)`,
                        transform: 'scale(1.8)',
                        filter: 'blur(14px)',
                      }}
                    />
                  )}
                  <div className="relative w-[68px] h-[68px] flex items-center justify-center">
                    <img src={shieldImg} alt="" className={`w-full h-full object-contain ${
                      isNext ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''
                    }`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {isFighting ? (
                        <div className="animate-spin text-xs">⚔️</div>
                      ) : boss && bossData ? (
                        <div className="relative">
                          <img src={bossData.imageUrl} alt={boss.name}
                            className={`w-9 h-9 rounded-full object-cover object-top border ${
                              isSecondCycle ? 'border-red-400' : 'border-amber-400/70'
                            }`}
                          />
                          {isSecondCycle && (
                            <div className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[6px] font-bold rounded-full w-3 h-3 flex items-center justify-center leading-none">II</div>
                          )}
                        </div>
                      ) : cleared ? (
                        <span className="text-primary text-base font-bold">✓</span>
                      ) : !locked ? (
                        <img src={floorIcons[floorMod]} alt="" className="w-7 h-7 object-contain opacity-70" />
                      ) : null}
                    </div>
                  </div>
                  <span className={`text-[11px] font-kelly leading-none mt-0.5 ${
                    boss ? 'text-amber-300' : isNext ? 'text-amber-400' : cleared ? 'text-foreground/70' : 'text-muted-foreground/50'
                  }`}>
                    {floor}
                  </span>
                  {isNext && (
                    <div className="absolute inset-0 rounded-lg border-2 border-amber-400/40 animate-pulse pointer-events-none" />
                  )}
                </motion.button>
              </div>
            );
          })}
      </div>
    </>
  );
}

export default function AbyssPage() {
  const navigate = useNavigate();
  const { player, addToSquadSlot, removeFromSquadSlot, setActiveSquad, addSouls, addRunes, updateAbyssProgress, addRelic, spendMithrilRunes, getFullStats } = useGame();

  const playerTopPower = useMemo(() => {
    const powers = player.champions.map(pc => {
      const stats = getFullStats(pc);
      return calculateUnitPower(stats);
    });
    powers.sort((a, b) => b - a);
    return powers.slice(0, 4).reduce((s, v) => s + v, 0);
  }, [player.champions, getFullStats]);

  const buyGoldKeys = useCallback(() => {
    if (!spendMithrilRunes(50)) { toast.error('Недостаточно Мифриловых Рун!'); return; }
    const newProgress = { ...player.abyssProgress, goldKeys: player.abyssProgress.goldKeys + 1 };
    updateAbyssProgress(newProgress);
    toast.success('+1 Золотой ключ за 50 МР');
  }, [spendMithrilRunes, player.abyssProgress, updateAbyssProgress]);

  const buySilverKeys = useCallback(() => {
    if (!spendMithrilRunes(80)) { toast.error('Недостаточно Мифриловых Рун!'); return; }
    const newProgress = { ...player.abyssProgress, silverKeys: player.abyssProgress.silverKeys + 1 };
    updateAbyssProgress(newProgress);
    toast.success('+1 Серебряный ключ за 80 МР');
  }, [spendMithrilRunes, player.abyssProgress, updateAbyssProgress]);

  const progress = useMemo(() => refreshKeysIfNeeded(player.abyssProgress), [player.abyssProgress]);
  const [difficulty, setDifficulty] = useState<AbyssDifficulty>(() => {
    const saved = sessionStorage.getItem('abyssDifficulty');
    return (saved === 'hard' ? 'hard' : 'normal') as AbyssDifficulty;
  });

  // Persist difficulty selection
  useEffect(() => {
    sessionStorage.setItem('abyssDifficulty', difficulty);
  }, [difficulty]);
  const [fighting] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('floors');
  const [selectedBoss, setSelectedBoss] = useState<number | null>(null);
  const [squadPickerRoom, setSquadPickerRoom] = useState<SecretRoom | null>(null);
  const [pickedHeroes, setPickedHeroes] = useState<string[]>([]);
  const [heroSort, setHeroSort] = useState<'power' | 'level' | 'element'>('power');
  const [showMilestones, setShowMilestones] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAbyssSquadPicker, setShowAbyssSquadPicker] = useState(false);
  const pendingAbyssFight = useRef<(() => void) | null>(null);

  const currentFloor = progress.currentFloor[difficulty];
  const nextFloor = currentFloor + 1;

  const executeFight = (floor: number) => {
    const boss = getBossForFloor(floor);
    const cleared = floor <= currentFloor;
    const isBossRefight = cleared && !!boss;

    if (!isBossRefight && floor !== nextFloor) return;

    if (isBossRefight) {
      if (progress.silverKeys < 1) {
        toast.error('Нет Серебряных ключей для повторного боя с боссом!');
        return;
      }
    } else {
      if (progress.goldKeys < 1) {
        toast.error('Нет Золотых ключей! Подождите до завтра.');
        return;
      }
    }

    const waves = buildAbyssEnemyWaves(floor, difficulty);

    sessionStorage.setItem('abyssBattle', JSON.stringify({
      floor,
      difficulty,
      waves,
      enemies: waves[0],
      isBossRefight,
    }));

    navigate('/battle');
  };

  const handleFight = (floor: number) => {
    pendingAbyssFight.current = () => executeFight(floor);
    setShowAbyssSquadPicker(true);
  };

  const handleAbyssSquadConfirm = (squadId: number) => {
    setActiveSquad(squadId);
    setShowAbyssSquadPicker(false);
    setTimeout(() => {
      pendingAbyssFight.current?.();
      pendingAbyssFight.current = null;
    }, 0);
  };

  return (
    <div className="min-h-screen pb-32 pt-4 px-3 relative">
      {/* Tower background */}
      <div className="fixed inset-0 z-0">
        <img src="/bg/abyss_tower_bg.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10 max-w-lg mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md pb-2 pt-1 -mx-3 px-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/trials')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_abyss.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Бездна</h1>
        </div>

        {/* Monthly reset + Keys — single row */}
        <div className="flex flex-wrap items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🔄</span>
            <span className="text-xs text-muted-foreground">Сброс</span>
            <MonthlyResetTimer />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <img src="/ui/icon_gold_key.png" alt="" className="w-4 h-4 object-contain" />
            <span className="text-amber-400 font-bold text-xs">{progress.goldKeys}</span>
            <button onClick={buyGoldKeys} className="w-5 h-5 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center transition-colors" title="Купить 1 ключ за 50 МР">+</button>
          </div>
          <div className="flex items-center gap-1">
            <img src="/ui/icon_silver_key.png" alt="" className="w-4 h-4 object-contain" />
            <span className="text-purple-300 font-bold text-xs">{progress.silverKeys}</span>
            <button onClick={buySilverKeys} className="w-5 h-5 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center transition-colors" title="Купить 1 ключ за 80 МР">+</button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">⏳</span>
            <KeyRefreshTimer />
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-4">
          {([['floors', 'Этажи', '/ui/icon_abyss_floors.png'], ['secrets', 'Потайные', '/ui/icon_abyss_secrets.png'], ['bestiary', 'Бестиарий', '/ui/icon_abyss_bestiary.png']] as [Tab, string, string][]).map(([t, label, icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl font-kelly text-sm border transition-all flex items-center justify-center gap-1.5 ${
                tab === t
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-surface/40 border-border/40 text-muted-foreground hover:border-border'
              }`}
            >
              <img src={icon} alt={label} className="w-5 h-5 object-contain" />
              {label}
            </button>
          ))}
        </div>

        {/* Difficulty selector inside sticky header */}
        {tab === 'floors' && (
          <div className="flex gap-2 mb-2">
            {(['normal', 'hard'] as AbyssDifficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2.5 rounded-xl font-kelly text-sm border transition-all flex items-center justify-center gap-2 ${
                  difficulty === d
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(45_60%_55%/0.35)]'
                    : 'bg-surface/40 border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                <img
                  src={d === 'normal' ? '/ui/icon_difficulty_normal.png' : '/ui/icon_difficulty_hard.png'}
                  alt=""
                  className={`w-7 h-7 object-contain transition-all ${difficulty === d ? 'drop-shadow-[0_0_6px_hsl(45_60%_55%/0.6)]' : 'opacity-70'}`}
                />
                {d === 'normal' ? 'Обычный' : 'Трудный'}
              </button>
            ))}
          </div>
        )}

        {/* Rules button in sticky header */}
        <button
          onClick={() => setShowRules(true)}
          className="w-full mb-2 flex items-center justify-between gap-2 bg-surface/40 border border-border/30 rounded-xl px-3 py-2 hover:border-primary/40 transition-all"
        >
          <div className="flex items-center gap-2">
            <img src="/ui/icon_abyss_rules.png" alt="Правила" className="w-5 h-5 object-contain" />
            <span className="font-kelly text-sm text-foreground">Правила Бездны</span>
          </div>
          <span className="text-muted-foreground text-lg">›</span>
        </button>
        </div>{/* end sticky header */}

        <AnimatePresence mode="wait">
          {tab === 'floors' ? (
            <motion.div key="floors" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>




              {/* Floor grid */}
              <FloorGrid
                currentFloor={currentFloor}
                nextFloor={nextFloor}
                difficulty={difficulty}
                fighting={fighting}
                progress={progress}
                handleFight={handleFight}
                playerTopPower={playerTopPower}
              />






            </motion.div>
          ) : tab === 'secrets' ? (
            <motion.div key="secrets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {/* Difficulty for secret rooms */}
              <div className="flex gap-2 mb-4">
                {(['normal', 'hard'] as AbyssDifficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-xl font-kelly text-sm border transition-all flex items-center justify-center gap-2 ${
                      difficulty === d
                        ? 'bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(45_60%_55%/0.35)]'
                        : 'bg-surface/40 border-border/40 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <img
                      src={d === 'normal' ? '/ui/icon_difficulty_normal.png' : '/ui/icon_difficulty_hard.png'}
                      alt=""
                      className={`w-7 h-7 object-contain transition-all ${difficulty === d ? 'drop-shadow-[0_0_6px_hsl(45_60%_55%/0.6)]' : 'opacity-70'}`}
                    />
                    {d === 'normal' ? 'Обычный' : 'Трудный'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-green-400 font-bold text-xs">🆓 Бесплатно — 1 раз в день</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface/40 border border-border/30 rounded-lg px-3 py-1.5 text-sm ml-auto">
                  <span>⏳</span>
                  <KeyRefreshTimer />
                </div>
              </div>

              <p className="text-muted-foreground text-xs mb-4">
                Потайные комнаты — особые испытания с ограничениями. Бесплатный вход раз в день. Награда — экипировка от сета босса.
              </p>

              <div className="space-y-2">
                {SECRET_ROOMS.map(room => {
                  const isUnlocked = currentFloor >= room.unlockFloor;
                  const isCleared = progress.secretRoomsCleared[difficulty]?.includes(room.id);
                  const ownedHeroes = player.champions.map(pc => pc.champion);
                  const eligibleCount = ownedHeroes.filter(h => isHeroAllowed(h.element as any, h.rarity as any, room.restriction)).length;

                  const handleSecretFight = () => {
                    if (!isUnlocked) {
                      toast.error(`Пройдите этаж ${room.unlockFloor} чтобы открыть`);
                      return;
                    }
                    if (isCleared) {
                      toast.info('Эта комната уже пройдена сегодня');
                      return;
                    }
                    if (eligibleCount < 1) {
                      toast.error('Нет подходящих героев для этой комнаты!');
                      return;
                    }
                    setSquadPickerRoom(room);
                    setPickedHeroes([]);
                  };

                  const setReward = getSecretRoomSetReward(room);
                  const setIcon = setReward ? SET_ICONS[setReward as keyof typeof SET_ICONS] : null;

                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: room.id * 0.03 }}
                      className={`border rounded-xl p-3 transition-all ${
                        isCleared
                          ? 'bg-primary/10 border-primary/30'
                          : isUnlocked
                          ? 'bg-surface/40 border-border/40'
                          : 'bg-surface/20 border-border/20 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-background/40 rounded-lg shrink-0 relative overflow-hidden">
                          {getBossForFloor(room.unlockFloor) ? (() => {
                            const boss = getBossForFloor(room.unlockFloor);
                            const bossIdx = ABYSS_BOSSES.findIndex(b => b.id === boss!.id);
                            const bossData = bossIdx >= 0 ? ABYSS_BOSS_DATA[bossIdx] : null;
                            return bossData ? (
                              <img src={bossData.imageUrl} alt="" className="w-full h-full rounded-lg object-cover object-top" />
                            ) : (
                              <span>{room.icon}</span>
                            );
                          })() : <span>{room.icon}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-kelly text-sm text-foreground">{room.name}</span>
                            {isCleared && <span className="text-primary text-xs">✓</span>}
                            {!isUnlocked && <span className="text-[10px] text-muted-foreground">🔒 Этаж {room.unlockFloor}</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{room.description}</p>

                          {/* Restriction badge */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[9px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded border border-destructive/20">
                              ⚠️ {getRestrictionLabel(room.restriction)}
                            </span>
                            {isUnlocked && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {eligibleCount} герой(ев) подходят
                              </span>
                            )}
                          </div>

                          {/* Rewards */}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                            <span>💰 {room.rewards.souls} душ</span>
                            <span>🔮 {room.rewards.runes} рун</span>
                            {setReward && (
                              <span className="flex items-center gap-1 bg-amber-900/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/20">
                                {setIcon && <img src={setIcon} alt="" className="w-3.5 h-3.5 object-contain" />}
                                {setReward}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Fight button */}
                        {isUnlocked && !isCleared && (
                          <button
                            onClick={handleSecretFight}
                            className="shrink-0 px-3 py-1.5 rounded-lg font-kelly text-xs border transition-all bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                          >
                            ⚔️
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Info */}
              <div className="bg-surface/40 border border-border/30 rounded-xl p-4 text-xs text-muted-foreground space-y-2 mt-4">
                <h3 className="font-kelly text-sm text-foreground mb-2">🚪 О Потайных комнатах</h3>
                <p>• Каждая комната имеет <strong>ограничения</strong> на состав отряда</p>
                <p>• Вход <strong>бесплатный</strong> — 1 раз в день для каждой комнаты</p>
                <p>• Обновляются <strong>ежедневно</strong></p>
                <p>• Награда — экипировка от <strong>сета босса</strong> на том же этаже</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="bestiary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <p className="text-muted-foreground text-xs mb-4">Информация о боссах Бездны, их навыках и наградах за победу.</p>

              <div className="space-y-2">
                {ABYSS_BOSS_DATA.map((boss, idx) => {
                  const abyssBoss = ABYSS_BOSSES[idx];
                  const isOpen = selectedBoss === idx;
                  const bossFloor = (idx + 1) * BOSS_INTERVAL;
                  const defeated = currentFloor >= bossFloor;
                  const kills = progress.bossKills[boss.id] ?? 0;

                  return (
                    <motion.div
                      key={boss.id}
                      layout
                      className={`border rounded-xl overflow-hidden transition-all ${
                        isOpen ? 'bg-surface/60 border-primary/40' : 'bg-surface/30 border-border/30'
                      }`}
                    >
                      {/* Boss header */}
                      <button
                        onClick={() => setSelectedBoss(isOpen ? null : idx)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <img
                          src={boss.imageUrl}
                          alt={boss.name}
                          className={`w-14 h-14 rounded-xl object-cover object-top border-2 ${
                            defeated ? 'border-primary/50' : 'border-border/30 grayscale opacity-70'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-kelly text-sm text-foreground truncate">{boss.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{boss.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold ${ELEMENT_COLORS[boss.element] ?? 'text-foreground'}`}>
                              {boss.element}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Этаж {bossFloor}</span>
                            {defeated && <span className="text-[10px] text-primary">✓ Побеждён</span>}
                            {kills > 0 && <span className="text-[10px] text-muted-foreground">×{kills}</span>}
                          </div>
                        </div>
                        <span className="text-muted-foreground text-lg">{isOpen ? '▾' : '▸'}</span>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-3">
                              {/* Stats */}
                              <div className="grid grid-cols-4 gap-1.5">
                                {([
                                  ['❤️', 'HP', boss.baseStats.hp],
                                  ['⚔️', 'ATK', boss.baseStats.atk],
                                  ['🛡️', 'DEF', boss.baseStats.def],
                                  ['💨', 'SPD', boss.baseStats.spd],
                                  ['🎯', 'КРИТ%', `${boss.baseStats.critChance}%`],
                                  ['💥', 'КРУ', `${boss.baseStats.critDmg}%`],
                                  ['🔰', 'СОПР', boss.baseStats.resistance],
                                  ['👁️', 'ТОЧН', boss.baseStats.accuracy],
                                ] as [string, string, number | string][]).map(([icon, label, val]) => (
                                  <div key={label} className="bg-background/50 rounded-lg p-1.5 text-center">
                                    <div className="text-[9px] text-muted-foreground">{icon} {label}</div>
                                    <div className="text-xs font-bold text-foreground">
                                      {typeof val === 'number' ? val.toLocaleString() : val}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Immunities */}
                              {boss.immuneEffects.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground">Иммунитет:</span>
                                  {boss.immuneEffects.map(eff => (
                                    <span key={eff} className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                                      {eff}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Skills */}
                              <div className="space-y-2">
                                <h4 className="font-kelly text-xs text-foreground">⚔️ Навыки</h4>
                                {boss.skills.map((skill, si) => (
                                  <div key={si} className="bg-background/40 rounded-lg p-2.5 border border-border/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-bold text-foreground">{skill.name}</span>
                                      <div className="flex items-center gap-1.5">
                                        {skill.cooldown > 0 && (
                                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                                            КД: {skill.cooldown}
                                          </span>
                                        )}
                                        <span className="text-[9px] bg-surface/60 text-muted-foreground px-1.5 py-0.5 rounded">
                                          {skill.type === 'aoe' ? 'АОЕ' : skill.type === 'buff' ? 'Бафф' : skill.type === 'heal' ? 'Лечение' : skill.type === 'control' ? 'Контроль' : 'Урон'}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-1.5">{skill.description}</p>
                                    {skill.effects && skill.effects.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {skill.effects.map((eff: any, ei: number) => (
                                          <span
                                            key={ei}
                                            className="text-[9px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded border border-primary/20"
                                          >
                                            {eff.type}{eff.value ? ` ${eff.value}%` : ''}{eff.duration ? ` (${eff.duration}х)` : ''}
                                            {eff.chance < 1 ? ` ${Math.round(eff.chance * 100)}%` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Drop */}
                              {abyssBoss && (
                                <div className="bg-amber-900/10 border border-amber-700/20 rounded-lg p-2.5">
                                  <h4 className="font-kelly text-xs text-foreground mb-1">🎁 Награда</h4>
                                  <div className="flex items-center gap-2">
                                    <img src={abyssBoss.materialImageUrl} alt={abyssBoss.material} className="w-10 h-10 object-contain rounded-lg bg-background/40 p-1" />
                                    <div className="flex-1">
                                      <div className="text-xs font-bold text-foreground">{abyssBoss.material}</div>
                                      <div className="text-[10px] text-muted-foreground">Материал для улучшения артефактов</div>
                                    </div>
                                    <div className="flex flex-col items-center bg-background/50 rounded-lg px-2.5 py-1 border border-border/30">
                                      <span className="text-sm font-bold text-primary">{progress.materials?.[abyssBoss.id] ?? 0}</span>
                                      <span className="text-[8px] text-muted-foreground">шт.</span>
                                    </div>
                                  </div>
                                  {ABYSS_BOSS_SET_DROP[abyssBoss.id] && (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                                      <img
                                        src={SET_ICONS[ABYSS_BOSS_SET_DROP[abyssBoss.id]]}
                                        alt={ABYSS_BOSS_SET_DROP[abyssBoss.id]}
                                        className="w-8 h-8 object-contain rounded-lg bg-background/40 p-0.5"
                                      />
                                      <div>
                                        <div className="text-xs font-bold text-foreground">{ABYSS_BOSS_SET_DROP[abyssBoss.id]}</div>
                                        <div className="text-[10px] text-muted-foreground">Эксклюзивный сет артефактов</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Squad picker modal for secret rooms */}
        <AnimatePresence>
          {squadPickerRoom && (() => {
            const room = squadPickerRoom;
            const maxSlots = room.restriction.type === 'max_heroes' ? room.restriction.count : 4;
            const eligibleHeroes = player.champions.filter(pc =>
              isHeroAllowed(pc.champion.element as Element, pc.champion.rarity as Rarity, room.restriction)
            );

            const launchBattle = () => {
              if (pickedHeroes.length === 0) {
                toast.error('Выберите хотя бы одного героя!');
                return;
              }

              const waves = buildSecretRoomWaves(room, difficulty);
              sessionStorage.setItem('abyssBattle', JSON.stringify({
                floor: room.unlockFloor,
                difficulty,
                waves,
                enemies: waves[0],
                secretRoomId: room.id,
                secretRoomSquad: pickedHeroes,
              }));
              setSquadPickerRoom(null);
              navigate('/battle');
            };

            return (
              <motion.div
                key="squad-picker-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
                onClick={() => setSquadPickerRoom(null)}
              >
                <motion.div
                  initial={{ y: 300 }}
                  animate={{ y: 0 }}
                  exit={{ y: 300 }}
                  className="w-full max-w-lg bg-background border-t border-border rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-kelly text-lg text-foreground">{room.icon} {room.name}</h3>
                      <p className="text-[10px] text-destructive">⚠️ {getRestrictionLabel(room.restriction)}</p>
                    </div>
                    <button onClick={() => setSquadPickerRoom(null)} className="text-muted-foreground text-xl">✕</button>
                  </div>

                  {/* Selected squad */}
                  <div className="flex gap-2 mb-3">
                    {Array.from({ length: maxSlots }).map((_, i) => {
                      const heroId = pickedHeroes[i];
                      const pc = heroId ? player.champions.find(c => c.id === heroId) : null;
                      return (
                        <div
                          key={i}
                          className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${
                            pc ? 'border-primary/50 bg-primary/10' : 'border-border/40 bg-surface/20'
                          }`}
                          onClick={() => pc && setPickedHeroes(prev => prev.filter(id => id !== pc.id))}
                        >
                          {pc ? (
                            <div className="relative w-full h-full">
                              <img src={pc.champion.imageUrl} alt="" className="w-full h-full rounded-xl object-cover object-top" />
                              <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/60 text-foreground rounded-b-xl truncate px-0.5">
                                {pc.champion.name.split(' ').pop()}
                              </span>
                              <span className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[9px] flex items-center justify-center">✕</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-lg">+</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Подходящие ({eligibleHeroes.length}):</span>
                    <div className="flex gap-1">
                      {([['power', '💪'], ['level', '📊'], ['element', '🔮']] as ['power' | 'level' | 'element', string][]).map(([s, icon]) => (
                        <button
                          key={s}
                          onClick={() => setHeroSort(s)}
                          className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                            heroSort === s ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-surface/30 border-border/30 text-muted-foreground'
                          }`}
                        >
                          {icon} {s === 'power' ? 'Сила' : s === 'level' ? 'Уровень' : 'Стихия'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hero grid */}
                  <div className="grid grid-cols-5 gap-1.5 mb-4">
                    {[...eligibleHeroes].sort((a, b) => {
                      if (heroSort === 'level') return b.level - a.level;
                      if (heroSort === 'element') return a.champion.element.localeCompare(b.champion.element) || b.level - a.level;
                      // power
                      const pw = (pc: typeof a) => {
                        const s = pc.champion.baseStats;
                        return s.hp + s.atk * 4 + s.def * 3 + s.spd * 5;
                      };
                      return pw(b) - pw(a);
                    }).map(pc => {
                      const isPicked = pickedHeroes.includes(pc.id);
                      const isFull = pickedHeroes.length >= maxSlots;
                      return (
                        <button
                          key={pc.id}
                          onClick={() => {
                            if (isPicked) {
                              setPickedHeroes(prev => prev.filter(id => id !== pc.id));
                            } else if (!isFull) {
                              setPickedHeroes(prev => [...prev, pc.id]);
                            }
                          }}
                          disabled={!isPicked && isFull}
                          className={`relative rounded-xl border overflow-hidden transition-all ${
                            isPicked
                              ? 'border-primary ring-1 ring-primary/50'
                              : isFull
                              ? 'border-border/20 opacity-30'
                              : 'border-border/30 hover:border-border/60'
                          }`}
                        >
                          <img src={pc.champion.imageUrl} alt="" className="w-full aspect-square object-cover object-top" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-0.5 py-0.5">
                            <div className="text-[7px] text-foreground truncate text-center">{pc.champion.name.split(' ').pop()}</div>
                            <div className="text-[7px] text-muted-foreground text-center">Ур.{pc.level}</div>
                          </div>
                          {isPicked && (
                            <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[9px] flex items-center justify-center">
                              {pickedHeroes.indexOf(pc.id) + 1}
                            </div>
                          )}
                          <div className={`absolute top-0.5 left-0.5 text-[8px] px-1 rounded ${ELEMENT_COLORS[pc.champion.element] ?? ''}`}>
                            {pc.champion.element.charAt(0)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {eligibleHeroes.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">Нет подходящих героев</p>
                  )}

                  {/* Launch button */}
                  <button
                    onClick={launchBattle}
                    disabled={pickedHeroes.length === 0}
                    className="w-full py-3 rounded-xl font-kelly text-lg border-2 transition-all bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ⚔️ В бой ({pickedHeroes.length}/{maxSlots})
                  </button>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Milestones Modal */}
        <AnimatePresence>
          {showMilestones && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowMilestones(false)}
            >
              <motion.div
                initial={{ scale: 0.85, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-card rounded-2xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto card-lubok border border-primary/30"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img src="/ui/milestone_first_steps.png" alt="" className="w-7 h-7 object-contain" />
                    <h2 className="font-kelly text-lg text-foreground">Награды за прохождение</h2>
                  </div>
                  <button onClick={() => setShowMilestones(false)} className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center">×</button>
                </div>

                <div className="space-y-1.5">
                  {ABYSS_MILESTONES.map(m => {
                    const unlocked = currentFloor >= m.floor;
                    const claimed = (progress.milestonesClaimed?.[difficulty] ?? []).includes(m.floor);
                    const canClaim = unlocked && !claimed;

                    const handleClaim = () => {
                      if (!canClaim) return;
                      const r = m.rewards;
                      if (r.souls) addSouls(r.souls);
                      if (r.runes) addRunes(r.runes);
                      if (r.bonusItem) {
                        const relicId = MILESTONE_ITEM_TO_RELIC[r.bonusItem];
                        if (relicId) addRelic(relicId);
                      }
                      const newProgress = {
                        ...player.abyssProgress,
                        milestonesClaimed: {
                          ...player.abyssProgress.milestonesClaimed ?? { normal: [], hard: [] },
                          [difficulty]: [...(player.abyssProgress.milestonesClaimed?.[difficulty] ?? []), m.floor],
                        },
                        goldKeys: (player.abyssProgress.goldKeys) + (r.goldKeys ?? 0),
                        silverKeys: (player.abyssProgress.silverKeys) + (r.silverKeys ?? 0),
                      };
                      updateAbyssProgress(newProgress);
                      const parts: string[] = [];
                      if (r.souls) parts.push(`${r.souls} Душ`);
                      if (r.runes) parts.push(`${r.runes} Рун`);
                      if (r.goldKeys) parts.push(`${r.goldKeys} 🔑`);
                      if (r.silverKeys) parts.push(`${r.silverKeys} 🗝️`);
                      if (r.bonusItem) {
                        const relic = getRelicById(MILESTONE_ITEM_TO_RELIC[r.bonusItem] ?? '');
                        parts.push(`🏺 ${r.bonusItem}`);
                        if (relic) parts.push(`(Реликвия!)`);
                      }
                      toast.success(`${m.icon} ${m.label}: ${parts.join(', ')}`);
                    };

                    return (
                      <div
                        key={m.floor}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-xs transition-all ${
                          claimed
                            ? 'bg-primary/10 border-primary/20 opacity-60'
                            : canClaim
                            ? 'bg-amber-900/20 border-amber-500/40 ring-1 ring-amber-500/20'
                            : 'bg-surface/20 border-border/20 opacity-40'
                        }`}
                      >
                        <img src={MILESTONE_ICONS[m.floor] ?? '/ui/milestone_first_steps.png'} alt={m.label} className="w-8 h-8 object-contain" />
                        <div className="flex-1 min-w-0">
                          <div className="font-kelly text-foreground truncate">{m.label} <span className="text-muted-foreground font-mono">({m.floor} эт.)</span></div>
                          <div className="text-muted-foreground text-[10px] flex flex-wrap gap-x-2">
                            {m.rewards.souls && <span className="inline-flex items-center gap-0.5"><img src="/ui/icon_souls.png" alt="Души" className="w-3.5 h-3.5 inline" /> {m.rewards.souls}</span>}
                            {m.rewards.runes && <span className="inline-flex items-center gap-0.5"><img src="/ui/icon_runes.png" alt="Руны" className="w-3.5 h-3.5 inline" /> {m.rewards.runes}</span>}
                            {m.rewards.goldKeys && <span className="inline-flex items-center gap-0.5"><img src="/ui/icon_gold_key.png" alt="Золотые ключи" className="w-3.5 h-3.5 inline" /> {m.rewards.goldKeys}</span>}
                            {m.rewards.silverKeys && <span className="inline-flex items-center gap-0.5"><img src="/ui/icon_silver_key.png" alt="Серебряные ключи" className="w-3.5 h-3.5 inline" /> {m.rewards.silverKeys}</span>}
                            {m.rewards.bonusItem && (() => {
                              const relicId = MILESTONE_ITEM_TO_RELIC[m.rewards.bonusItem!];
                              const relic = relicId ? getRelicById(relicId) : null;
                              return (
                                <span className="inline-flex items-center gap-0.5">
                                  <img src={relic?.icon ?? '/ui/icon_legendary_gem.png'} alt={m.rewards.bonusItem} className="w-3.5 h-3.5 inline" /> {m.rewards.bonusItem}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        {claimed ? (
                          <span className="text-primary text-sm">✓</span>
                        ) : canClaim ? (
                          <button
                            onClick={handleClaim}
                            className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/40 text-primary font-kelly text-xs hover:bg-primary/30 transition-all whitespace-nowrap"
                          >
                            Забрать
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">🔒</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules Modal */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowRules(false)}
            >
              <motion.div
                initial={{ scale: 0.85, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-card rounded-2xl p-5 max-w-md w-full card-lubok border border-primary/30"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img src="/ui/icon_abyss_rules.png" alt="Правила" className="w-6 h-6 object-contain" />
                    <h2 className="font-kelly text-lg text-foreground">Правила Бездны</h2>
                  </div>
                  <button onClick={() => setShowRules(false)} className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center">×</button>
                </div>
                <div className="text-xs text-muted-foreground space-y-2.5">
                  <p>• <strong className="text-foreground">160 этажей</strong>, каждый 10-й — босс с уникальными механиками</p>
                  <p>• <strong className="text-foreground">Золотые ключи</strong> для новых этажей (+12 каждый день)</p>
                  <p>• <strong className="text-foreground">Серебряные ключи</strong> для переигровки боссов (+10 каждый день)</p>
                  <p>• <strong className="text-foreground">Потайные комнаты</strong> — бесплатно, раз в день</p>
                  <p>• <strong className="text-foreground">Обычный и Трудный</strong> режимы можно проходить параллельно</p>
                  <p>• Боссы дропают <strong className="text-foreground">уникальные материалы</strong> для улучшения артефактов в Горне Древних</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SquadPickerModal
        open={showAbyssSquadPicker}
        onClose={() => { setShowAbyssSquadPicker(false); pendingAbyssFight.current = null; }}
        onConfirm={handleAbyssSquadConfirm}
      />
    </div>
  );
}
