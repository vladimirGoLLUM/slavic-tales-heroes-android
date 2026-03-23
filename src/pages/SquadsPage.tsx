import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { calculateUnitPower } from '@/data/campaignStages';
import { RARITY_ORDER, type Rarity } from '@/data/gameData';
import HeroCard from '@/components/game/HeroCard';

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
  const { player, setActiveSquad, renameSquad, addToSquadSlot, removeFromSquadSlot } = useGame();
  const [selectedSquad, setSelectedSquad] = useState(player.activeSquadId);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [showHeroPicker, setShowHeroPicker] = useState(false);
  const [filterRarity, setFilterRarity] = useState<Rarity | null>(null);

  const currentSquad = player.squads[selectedSquad];
  const squadMembers = currentSquad.members
    .map(id => player.champions.find(c => c.id === id))
    .filter(Boolean);

  const { getFullStats } = useGame();
  const squadPower = squadMembers.reduce((sum, pc) => {
    if (!pc) return sum;
    const stats = getFullStats(pc);
    return sum + calculateUnitPower(stats);
  }, 0);

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
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_squads.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Отряды</h1>
        </div>

        <button
          onClick={() => navigate('/collection')}
          className="w-full flex items-center gap-4 bg-surface/70 hover:bg-surface/90 border border-border/50 hover:border-primary/40 rounded-xl px-5 py-4 card-lubok transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[60px] group mb-4"
        >
          <img src="/ui/icon_collection.png" alt="Дружина" className="w-10 h-10 object-contain flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col items-start">
            <span className="font-kelly text-base text-foreground">Дружина</span>
            <span className="text-xs text-muted-foreground">Твои герои</span>
          </div>
          <span className="ml-auto text-muted-foreground/50 text-lg">›</span>
        </button>

        {/* Squad tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
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
        </div>

        {/* Current squad info */}
        <motion.div
          key={selectedSquad}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/60 rounded-xl border border-border p-4 card-lubok mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            {editingName === selectedSquad ? (
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
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-kelly text-lg text-foreground">{currentSquad.name}</h2>
                <button
                  onClick={() => startRename(selectedSquad)}
                  className="text-muted-foreground hover:text-foreground text-sm min-h-[36px] px-1"
                >
                  ✏️
                </button>
              </div>
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

          {/* Squad power */}
          {squadMembers.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-lg">⚔️</span>
              <span className="font-kelly text-sm text-muted-foreground">Сила отряда:</span>
              <span className="font-mono text-lg text-accent font-bold">{squadPower.toLocaleString()}</span>
            </div>
          )}

          {/* Squad members grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <AnimatePresence mode="popLayout">
              {squadMembers.map((pc) => pc && (
                <motion.div
                  key={pc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative"
                >
                  <HeroCard
                    champion={pc.champion}
                    level={pc.level}
                    stars={pc.stars}
                    currentHp={pc.currentHp}
                    onClick={() => navigate(`/hero/${pc.id}`)}
                    compact
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromSquadSlot(selectedSquad, pc.id); }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
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
