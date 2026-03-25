import { useState, useMemo, useEffect } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { calculateUnitPower } from '@/data/campaignStages';
import { RARITY_ORDER, type Rarity } from '@/data/gameData';
import HeroCard from '@/components/game/HeroCard';
import TutorialGlow from '@/components/game/TutorialGlow';

const RARITIES: Rarity[] = ['Самоцветный', 'Калиновый', 'Сказанный', 'Заветный', 'Обиходный'];
const RARITY_COLORS: Record<Rarity, string> = {
  'Обиходный': 'hsl(0 0% 60%)',
  'Заветный': 'hsl(120 40% 50%)',
  'Сказанный': 'hsl(210 60% 55%)',
  'Калиновый': 'hsl(270 50% 55%)',
  'Самоцветный': 'hsl(40 80% 55%)',
};

export default function SquadsPage() {
  const navigate = useNavigate();
  const { player, setActiveSquad, renameSquad, addToSquadSlot, removeFromSquadSlot, addSquad, deleteSquad, getFullStats, advanceTutorial } = useGame();
  const [selectedSquad, setSelectedSquad] = useState(player.activeSquadId);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [showHeroPicker, setShowHeroPicker] = useState(false);
  const [filterRarity, setFilterRarity] = useState<Rarity | null>(null);

  const currentSquad = player.squads[selectedSquad];
  const squadMembers = currentSquad.members
    .map(id => player.champions.find(c => c.id === id))
    .filter(Boolean);

  const squadPower = squadMembers.reduce((sum, pc) => {
    if (!pc) return sum;
    const stats = getFullStats(pc);
    return sum + calculateUnitPower(stats);
  }, 0);

  const step = player.tutorialStep ?? 99;
  // Step 7: add heroes, step 8/22/38: back button, step 18/32: click first hero
  const showAddHint = step === 7 && squadMembers.length < 4;
  const showEquipHint = step === 18 || step === 32;
  const isBackHighlighted = step === 8 || step === 22 || step === 38;

  // Auto-open hero picker when step 7
  useEffect(() => {
    if (step === 7 && squadMembers.length < 4 && !showHeroPicker) {
      setShowHeroPicker(true);
    }
  }, [step, squadMembers.length]);

  const isActive = selectedSquad === player.activeSquadId;

  // Heroes not in this squad, filtered & sorted by rarity desc
  const availableHeroes = useMemo(() => {
    let list = player.champions.filter(c => !currentSquad.members.includes(c.id));
    if (filterRarity) list = list.filter(c => c.champion.rarity === filterRarity);
    return list.sort((a, b) => RARITY_ORDER[b.champion.rarity] - RARITY_ORDER[a.champion.rarity]);
  }, [player.champions, currentSquad.members, filterRarity]);

  const startRename = (squadId: number) => {
    setEditingName(squadId);
    setTempName(player.squads[squadId].name);
  };

  const confirmRename = () => {
    if (editingName !== null && tempName.trim()) {
      renameSquad(editingName, tempName.trim());
    }
    setEditingName(null);
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              if (step === 8) advanceTutorial(8);
              if (step === 22) advanceTutorial(22);
              if (step === 38) advanceTutorial(38);
              navigate('/');
            }}
            className={`relative text-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isBackHighlighted ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isBackHighlighted && (
              <TutorialGlow label={
                step === 8 ? 'Отряд собран! Возвращайся на главный экран.' :
                step === 22 ? 'Отлично! Герой вооружён. Возвращайся.' :
                step === 38 ? 'Обучение почти завершено! Возвращайся.' : 'Вернись назад'
              } wide />
            )}
            ←
          </button>
          <img src="/ui/icon_squads.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Отряды</h1>
        </div>

        <button
          onClick={() => step >= 39 && navigate('/collection')}
          disabled={step < 39}
          className={`w-full flex items-center gap-4 border rounded-xl px-5 py-4 card-lubok transition-all min-h-[60px] group mb-4 ${
            step < 39 ? 'bg-surface/30 border-border/30 opacity-40 grayscale cursor-not-allowed' : 'bg-surface/70 hover:bg-surface/90 border-border/50 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <img src="/ui/icon_collection.png" alt="Дружина" className="w-10 h-10 object-contain flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col items-start">
            <span className="font-kelly text-base text-foreground">Дружина</span>
            <span className="text-xs text-muted-foreground">Твои герои</span>
          </div>
          <span className="ml-auto text-muted-foreground/50 text-lg">›</span>
        </button>

        {/* Squad tabs */}
        {step >= 39 && (
        <DragScroll className="flex gap-1.5 mb-4 pb-1">
          {player.squads.map((sq) => {
            const validCount = sq.members.filter(id => player.champions.some(c => c.id === id)).length;
            return (
              <button
                key={sq.id}
                onClick={() => { setSelectedSquad(sq.id); setShowHeroPicker(false); }}
                className={`flex-shrink-0 px-3 py-2 rounded-lg font-kelly text-sm transition-all min-h-[40px] ${
                  selectedSquad === sq.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface text-muted-foreground hover:bg-surface/80'
                } ${sq.id === player.activeSquadId ? 'ring-1 ring-accent' : ''}`}
              >
                {sq.name}
                {validCount > 0 && (
                  <span className="ml-1 text-xs opacity-70">({validCount})</span>
                )}
              </button>
            );
          })}
          {player.squads.length < 10 && (
            <button
              onClick={() => {
                const newId = addSquad();
                if (newId !== null) setSelectedSquad(newId);
              }}
              className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface/60 hover:bg-primary/20 border border-dashed border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary text-xl flex items-center justify-center transition-all"
            >
              +
            </button>
          )}
        </DragScroll>
        )}

        {/* Current squad info */}
        <motion.div
          key={selectedSquad}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/60 rounded-xl border border-border p-4 card-lubok mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-kelly text-lg text-foreground">{currentSquad.name}</h2>
              {step >= 39 && editingName !== selectedSquad && (
                <button
                  onClick={() => startRename(selectedSquad)}
                  className="text-muted-foreground hover:text-foreground text-sm min-h-[36px] px-1"
                >
                  ✏️
                </button>
              )}
            </div>
            {editingName === selectedSquad && step >= 39 && (
              <div className="flex items-center gap-2">
                <input
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmRename()}
                  autoFocus
                  className="bg-background border border-border rounded px-2 py-1 text-foreground font-kelly text-sm w-32"
                  maxLength={20}
                />
                <button onClick={confirmRename} className="text-primary text-sm font-kelly min-h-[36px] px-2">✓</button>
              </div>
            )}
            {step >= 39 && (
            <div className="flex items-center gap-1.5">
              {player.squads.length > 1 && !isActive && (
                <button
                  onClick={() => {
                    deleteSquad(selectedSquad);
                    setSelectedSquad(player.squads.find(s => s.id !== selectedSquad)?.id ?? 0);
                  }}
                  className="px-2 py-1.5 rounded-lg font-kelly text-xs min-h-[36px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 transition-all"
                >
                  🗑
                </button>
              )}
              <button
                onClick={() => setActiveSquad(selectedSquad)}
                className={`px-3 py-1.5 rounded-lg font-kelly text-xs min-h-[36px] transition-all ${
                  isActive
                    ? 'bg-accent/20 text-accent border border-accent/40'
                    : 'bg-surface hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border'
                }`}
              >
                {isActive ? '★ Активный' : 'Сделать активным'}
              </button>
            </div>
            )}
          </div>

          {/* Squad power */}
          {squadMembers.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-lg">⚔️</span>
              <span className="font-kelly text-sm text-muted-foreground">Сила отряда:</span>
              <span className="font-mono text-lg text-accent font-bold">{squadPower.toLocaleString()}</span>
            </div>
          )}

          {/* Tutorial hint — equip weapon/helmet */}
          {showEquipHint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-primary/10 border border-primary/40 rounded-lg px-3 py-2 mb-2"
            >
              <motion.span
                className="text-primary text-xl"
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                👇
              </motion.span>
              <span className="text-sm font-kelly text-primary">
                {step === 18 ? 'Нажми на героя → откроется его карточка с экипировкой.' : 'Нажми на героя → надень Шлем и прокачай Меч!'}
              </span>
              <motion.span
                className="text-primary text-xl"
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                👇
              </motion.span>
            </motion.div>
          )}

          {/* Tutorial hint — add heroes */}
          {showAddHint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-primary/10 border border-primary/40 rounded-lg px-3 py-2 mb-2"
            >
              <motion.span className="text-primary text-xl" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1 }}>👇</motion.span>
              <span className="text-sm font-kelly text-primary">Выбери героев для отряда. В бой идут только герои из активного отряда!</span>
              <motion.span className="text-primary text-xl" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1 }}>👇</motion.span>
            </motion.div>
          )}

          {/* Squad members grid */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${(showEquipHint || showAddHint) ? 'ring-2 ring-primary/50 rounded-xl p-1 animate-pulse' : ''}`}>
            <AnimatePresence mode="popLayout">
              {squadMembers.map((pc) => {
                if (!pc) return null;
                const isFirstHero = showEquipHint && squadMembers.indexOf(pc) === 0;
                return (
                <motion.div
                  key={pc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`relative ${isFirstHero ? 'ring-2 ring-primary rounded-xl' : ''}`}
                >
                  {isFirstHero && (
                    <TutorialGlow label={step === 18 ? 'Нажми на героя' : 'Выбери героя'} wide />
                  )}
                  <HeroCard
                    champion={pc.champion}
                    level={pc.level}
                    stars={pc.stars}
                    redStars={pc.redStars ?? 0}
                    currentHp={pc.currentHp}
                    onClick={() => {
                      if (isFirstHero && (step === 18 || step === 32)) advanceTutorial(step);
                      navigate(`/hero/${pc.id}`);
                    }}
                    compact
                  />
                  {step >= 39 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromSquadSlot(selectedSquad, pc.id); }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    ✕
                  </button>
                  )}
                </motion.div>
              );
              })}
            </AnimatePresence>

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - squadMembers.length) }).map((_, i) => (
              <motion.div
                key={`empty-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-2 border-dashed border-border/30 rounded-xl h-40 sm:h-48 flex items-center justify-center cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setShowHeroPicker(true)}
              >
                <span className="text-muted-foreground text-3xl">+</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Hero picker */}
        <AnimatePresence>
          {showHeroPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-surface/40 rounded-xl border border-border p-3 card-lubok">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-kelly text-sm text-foreground">Выбери героя</h3>
                  <button
                    onClick={() => setShowHeroPicker(false)}
                    className="text-muted-foreground hover:text-foreground min-h-[36px] px-2"
                  >
                    ✕
                  </button>
                </div>
                {/* Rarity filter */}
                <div className="flex gap-1 mb-2 flex-wrap">
                  <button
                    onClick={() => setFilterRarity(null)}
                    className={`px-2 py-1 rounded-md text-xs font-kelly min-h-[32px] transition-all ${
                      !filterRarity
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface text-muted-foreground hover:bg-surface/80'
                    }`}
                  >
                    Все
                  </button>
                  {RARITIES.map(r => (
                    <button
                      key={r}
                      onClick={() => setFilterRarity(filterRarity === r ? null : r)}
                      className={`px-2 py-1 rounded-md text-xs font-kelly min-h-[32px] transition-all border ${
                        filterRarity === r
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground bg-surface/40'
                      }`}
                      style={{
                        borderColor: RARITY_COLORS[r],
                        ...(filterRarity === r ? { background: `${RARITY_COLORS[r]}22` } : {}),
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {availableHeroes.length === 0 ? (
                  <p className="text-muted-foreground text-xs py-4 text-center">Нет доступных героев</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                    {availableHeroes.map(pc => (
                      <button
                        key={pc.id}
                        onClick={() => {
                          addToSquadSlot(selectedSquad, pc.id);
                          if (currentSquad.members.length >= 3) setShowHeroPicker(false);
                        }}
                        className="text-left"
                        disabled={currentSquad.members.length >= 4}
                      >
                        <HeroCard
                          champion={pc.champion}
                          level={pc.level}
                          stars={pc.stars}
                          redStars={pc.redStars ?? 0}
                          currentHp={pc.currentHp}
                          compact
                        />
                      </button>
                    ))}
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
