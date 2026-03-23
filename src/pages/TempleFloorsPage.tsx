import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TEMPLES } from '@/data/templeData';
import { useGame } from '@/context/GameContext';
import { toast } from 'sonner';
import QuickBuyButton from '@/components/game/QuickBuyButton';

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

function calcPower(stats: { hp: number; atk: number; def: number; spd: number }) {
  return stats.hp + stats.atk * 4 + stats.def * 3 + stats.spd * 5;
}

export default function TempleFloorsPage() {
  const { templeId } = useParams<{ templeId: string }>();
  const navigate = useNavigate();
  const { player, getSquadChampions, spendEnergy, getEnergyInfo } = useGame();

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

  const handleFloorClick = (floor: number) => {
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

        {/* Rune reward info */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-surface border border-border">
          <img src={temple.runeIcon} alt={temple.runeName} className="w-8 h-8 object-contain" />
          <div>
            <p className="font-kelly text-sm text-foreground">{temple.runeName}</p>
            <p className="text-[10px] text-muted-foreground">Награда: 1–2 элементные руны за победу (редкость зависит от этажа)</p>
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
            return (
              <motion.button
                key={floorData.floor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handleFloorClick(floorData.floor)}
                disabled={!hasEnergy}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border card-lubok bg-gradient-to-r ${temple.color} border-border transition-all group ${
                  hasEnergy ? 'hover:border-primary/50' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Floor number */}
                <div className="w-12 h-12 rounded-xl bg-background/60 border border-border flex items-center justify-center flex-shrink-0">
                  <span className="font-kelly text-lg text-foreground">{floorData.floor}</span>
                </div>

                <div className="flex-1 text-left">
                  <span className="font-kelly text-sm text-foreground block">{floorData.bossName}</span>
                  <span className="text-[10px] text-muted-foreground">⚡ Мощь: {power.toLocaleString()}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      HP: {floorData.boss.baseStats.hp.toLocaleString()} • ATK: {floorData.boss.baseStats.atk.toLocaleString()} • DEF: {floorData.boss.baseStats.def.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <img src="/ui/energy.png" alt="" className="w-3 h-3" />
                    <span className={`text-[10px] font-kelly ${hasEnergy ? 'text-cyan-400' : 'text-accent'}`}>{cost}⚡</span>
                  </div>
                </div>

                {/* Rune rarity badge */}
                <div className={`px-2 py-1 rounded text-[10px] font-kelly ${RARITY_COLORS[floorData.runeRarity] || ''}`}>
                  {floorData.runeRarity}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
