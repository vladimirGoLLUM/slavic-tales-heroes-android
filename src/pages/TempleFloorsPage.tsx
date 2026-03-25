import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TEMPLES, getTempleFloorModifiers } from '@/data/templeData';
import { rollRuneReward } from '@/data/templeData';
import { useGame } from '@/context/GameContext';
import { toast } from 'sonner';
import QuickBuyButton from '@/components/game/QuickBuyButton';
import XpDisplay from '@/components/game/XpDisplay';
import SquadPickerModal from '@/components/game/SquadPickerModal';

const TEMPLE_FLOOR_ENERGY: Record<number, number> = {
  1: 3, 2: 3, 3: 4, 4: 4, 5: 5,
};

export function getTempleEnergyCost(floor: number): number {
  return TEMPLE_FLOOR_ENERGY[floor] ?? 3;
}

const RARITY_COLORS: Record<string, string> = {
  'Обиходный': 'bg-muted/30 text-muted-foreground',
  'Заветный': 'bg-green-500/20 text-green-300',
  'Сказанный': 'bg-blue-500/20 text-blue-300',
  'Калиновый': 'bg-purple-500/20 text-purple-300',
  'Самоцветный': 'bg-amber-500/20 text-amber-300',
};

const RARITY_COLORS_MAP: Record<string, string> = {
  'Обиходный': 'hsl(40 10% 50%)',
  'Заветный': 'hsl(145 50% 45%)',
  'Сказанный': 'hsl(220 60% 60%)',
  'Калиновый': 'hsl(280 55% 60%)',
  'Самоцветный': 'hsl(40 85% 55%)',
};

function calcPower(stats: { hp: number; atk: number; def: number; spd: number }) {
  return stats.hp + stats.atk * 4 + stats.def * 3 + stats.spd * 5;
}

interface MultiBattleResult {
  count: number;
  totalSouls: number;
  totalExp: number;
  totalRunes: number;
  runeRarity: string;
  runeName: string;
}

export default function TempleFloorsPage() {
  const { templeId } = useParams<{ templeId: string }>();
  const navigate = useNavigate();
  const { player, getSquadChampions, spendEnergy, getEnergyInfo, templeProgress, addDivineRunes, addSouls, addXpToSquad, updateTempleProgress, setActiveSquad, isVipActive } = useGame();
  const [multiBattleResult, setMultiBattleResult] = useState<MultiBattleResult | null>(null);
  const [showSquadPicker, setShowSquadPicker] = useState(false);
  const pendingBattleAction = useRef<(() => void) | null>(null);

  const temple = TEMPLES.find(t => t.id === templeId);
  if (!temple) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Храм не найден</p>
      </div>
    );
  }

  const squad = getSquadChampions();
  const energyInfo = getEnergyInfo();

  const getRuneCount = (rarity: string) => {
    const key = `${temple.element}_${rarity}`;
    return player.divineRunes[key as keyof typeof player.divineRunes] ?? 0;
  };

  const getFloorStars = (floor: number) => {
    return templeProgress[temple.id]?.[floor] ?? 0;
  };

  const executeFloorBattle = (floor: number) => {
    if (squad.length === 0) {
      toast.error('Соберите отряд перед боем!');
      return;
    }
    const cost = getTempleEnergyCost(floor);
    if (!spendEnergy(cost)) {
      toast.error(`Недостаточно энергии! Нужно: ${cost}⚡`);
      return;
    }
    navigate(`/battle?mode=temple&templeId=${temple.id}&floor=${floor}`);
  };

  const handleFloorClick = (floor: number) => {
    pendingBattleAction.current = () => executeFloorBattle(floor);
    setShowSquadPicker(true);
  };

  const handleSquadConfirm = (squadId: number) => {
    setActiveSquad(squadId);
    setShowSquadPicker(false);
    setTimeout(() => {
      pendingBattleAction.current?.();
      pendingBattleAction.current = null;
    }, 0);
  };

  const executeMultiBattle = (floor: number, count: number) => {
    if (squad.length === 0) {
      toast.error('Соберите отряд перед боем!');
      return;
    }
    const costPerBattle = getTempleEnergyCost(floor);
    const totalCost = costPerBattle * count;
    if (!spendEnergy(totalCost)) {
      toast.error(`Недостаточно энергии! Нужно: ${totalCost}⚡`);
      return;
    }

    const floorData = temple.floors[floor - 1];
    let totalRunes = 0;
    let totalSouls = 0;
    let totalExp = 0;
    const starMultiplier = 1.5; // 3-star bonus

    for (let i = 0; i < count; i++) {
      const droppedRunes = rollRuneReward(temple, floor);
      addDivineRunes(temple.element, droppedRunes.length, floorData.runeRarity);
      totalRunes += droppedRunes.length;
      const souls = Math.floor((30 + 1 * 2) * (1 + floor * 0.3) * starMultiplier);
      const exp = Math.floor((50 + 1 * 3) * (1 + floor * 0.3) * starMultiplier);
      totalSouls += souls;
      totalExp += exp;
    }

    addSouls(totalSouls);
    addXpToSquad(totalExp);
    updateTempleProgress(temple.id, floor, 3);

    setMultiBattleResult({
      count,
      totalSouls,
      totalExp,
      totalRunes,
      runeRarity: floorData.runeRarity,
      runeName: temple.runeName,
    });
  };

  const handleMultiBattle = (floor: number, count: number) => {
    pendingBattleAction.current = () => executeMultiBattle(floor, count);
    setShowSquadPicker(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/temples')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src={temple.icon} alt={temple.name} className="w-10 h-10 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">{temple.name}</h1>
        </div>

        {/* Rune inventory for this temple */}
        <div className="p-3 rounded-xl bg-surface border border-border mb-4">
          <div className="flex items-center gap-2 mb-2">
            <img src={temple.runeIcon} alt={temple.runeName} className="w-8 h-8 object-contain" />
            <div>
              <p className="font-kelly text-sm text-foreground">{temple.runeName}</p>
              <p className="text-[10px] text-muted-foreground">Ваши руны по качеству</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'].map(rarity => {
              const count = getRuneCount(rarity);
              return (
                <div key={rarity} className="text-center bg-background/40 rounded-lg p-1.5">
                  <div className="text-[9px] font-kelly truncate" style={{ color: RARITY_COLORS_MAP[rarity] }}>{rarity}</div>
                  <div className="font-mono text-sm text-foreground font-bold">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Energy info */}
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-surface border border-border">
          <img src="/ui/energy.png" alt="Энергия" className="w-6 h-6 object-contain" />
          <span className="font-kelly text-sm text-foreground">{energyInfo.current}/{energyInfo.max} ⚡</span>
          <QuickBuyButton type="energy" size="md" />
        </div>

        {/* Floors */}
        <div className="flex flex-col gap-3">
          {temple.floors.map((floorData, i) => {
            const power = calcPower(floorData.boss.baseStats);
            const cost = getTempleEnergyCost(floorData.floor);
            const hasEnergy = energyInfo.current >= cost;
            const floorStars = getFloorStars(floorData.floor);
            const has3Stars = floorStars >= 3;
            const templeMods = getTempleFloorModifiers(temple.element, floorData.floor);
            const hasModifiers = !!(templeMods.floorBuff || templeMods.modifiers.length > 0 || templeMods.elementalHazard);

            return (
              <motion.div
                key={floorData.floor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-2xl border card-lubok bg-gradient-to-r ${temple.color} border-border transition-all ${
                  hasEnergy ? 'hover:border-primary/50' : 'opacity-50'
                }`}
              >
                <button
                  onClick={() => handleFloorClick(floorData.floor)}
                  disabled={!hasEnergy}
                  className="w-full flex items-center gap-4 p-4 text-left disabled:cursor-not-allowed"
                >
                  {/* Floor number */}
                  <div className="w-12 h-12 rounded-xl bg-background/60 border border-border flex items-center justify-center flex-shrink-0">
                    <span className="font-kelly text-lg text-foreground">{floorData.floor}</span>
                  </div>

                  <div className="flex-1">
                    <span className="font-kelly text-sm text-foreground block">{floorData.bossName}</span>
                    <span className="text-[10px] text-muted-foreground">⚡ Мощь: {power.toLocaleString()}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        HP: {floorData.boss.baseStats.hp.toLocaleString()} • ATK: {floorData.boss.baseStats.atk.toLocaleString()} • DEF: {floorData.boss.baseStats.def.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5">
                        <img src="/ui/energy.png" alt="" className="w-3 h-3" />
                        <span className={`text-[10px] font-kelly ${hasEnergy ? 'text-cyan-400' : 'text-accent'}`}>{cost}⚡</span>
                      </div>
                      {/* Stars display */}
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(s => (
                          <span key={s} className="text-[12px]" style={{ color: s <= floorStars ? 'hsl(45 100% 55%)' : 'hsl(var(--muted-foreground) / 0.25)' }}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rune rarity badge */}
                  <div className={`px-2 py-1 rounded text-[10px] font-kelly ${RARITY_COLORS[floorData.runeRarity] || ''}`}>
                    {floorData.runeRarity}
                  </div>
                </button>

                {/* Temple modifiers display */}
                {hasModifiers && (
                  <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
                    {templeMods.floorBuff && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-kelly bg-accent/20 text-accent border border-accent/30">
                        {templeMods.floorBuff.icon} {templeMods.floorBuff.label}
                      </span>
                    )}
                    {templeMods.elementalHazard && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-kelly bg-destructive/20 text-destructive border border-destructive/30">
                        {templeMods.elementalHazard.icon} {templeMods.elementalHazard.label}
                      </span>
                    )}
                    {templeMods.modifiers.map(mod => (
                      <span
                        key={mod.id}
                        title={mod.description}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-kelly border ${
                          mod.playerDebuffs ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-accent/15 text-accent border-accent/30'
                        }`}
                      >
                        {mod.icon} {mod.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Auto-battle buttons for 3-star floors */}
                {has3Stars && (
                  <div className="flex gap-2 px-4 pb-3 -mt-1">
                    <button
                      onClick={() => handleMultiBattle(floorData.floor, 5)}
                      disabled={energyInfo.current < cost * 5}
                      className="flex-1 py-1.5 rounded-lg font-kelly text-[11px] bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ⚡ Автобой ×5 ({cost * 5}⚡)
                    </button>
                    <button
                      onClick={() => handleMultiBattle(floorData.floor, 10)}
                      disabled={energyInfo.current < cost * 10}
                      className="flex-1 py-1.5 rounded-lg font-kelly text-[11px] bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ⚡ Автобой ×10 ({cost * 10}⚡)
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Multi-battle results modal */}
        <AnimatePresence>
          {multiBattleResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setMultiBattleResult(null)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-card rounded-2xl p-6 max-w-sm w-full card-lubok border border-primary/30"
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">⚡</div>
                  <h2 className="text-xl font-kelly text-primary text-gold-glow">Автобой ×{multiBattleResult.count}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Все бои выиграны с 3 звёздами!</p>
                </div>

                <div className="bg-background/50 rounded-xl p-4 mb-4 border border-border/30">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <img src="/ui/icon_souls.png" alt="Души" className="w-5 h-5" />
                        <span>Души</span>
                      </div>
                      <span className="font-mono text-base font-bold text-primary">{multiBattleResult.totalSouls}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <img src={temple.runeIcon} alt="Руны" className="w-5 h-5" />
                        <span>{multiBattleResult.runeName}</span>
                      </div>
                      <span className="font-mono text-base font-bold text-foreground">{multiBattleResult.totalRunes}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <img src="/ui/icon_xp.png" alt="Опыт" className="w-5 h-5" />
                        <span>Опыт</span>
                      </div>
                      <span className="font-mono text-base font-bold text-foreground"><XpDisplay xp={multiBattleResult.totalExp} /></span>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-[10px] font-kelly" style={{ color: RARITY_COLORS_MAP[multiBattleResult.runeRarity] }}>
                      Качество рун: {multiBattleResult.runeRarity}
                    </span>
                    {isVipActive() && (
                      <p className="text-[10px] text-[hsl(40,85%,55%)] mt-1">👑 VIP: ×1.5 к наградам</p>
                    )}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMultiBattleResult(null)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-kelly text-lg py-3 rounded-xl transition-all min-h-[48px] card-lubok"
                >
                  Отлично!
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SquadPickerModal
        open={showSquadPicker}
        onClose={() => { setShowSquadPicker(false); pendingBattleAction.current = null; }}
        onConfirm={handleSquadConfirm}
      />
    </div>
  );
}
