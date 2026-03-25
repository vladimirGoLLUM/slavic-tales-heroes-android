import { useState } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { TOWER_ELEMENTS, TOWER_STATS, TOWER_UPGRADE_TABLE, MAX_TOWER_LEVEL, TOWER_COIN_TIERS, TOWER_COIN_NAMES, getAvailableCoins, type TowerStat, type TowerCoinTier } from '@/data/towerData';
import { ELEMENT_ICONS, type Element } from '@/data/gameData';
import type { ArenaMetalTier } from '@/data/arenaData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import coinYariloImg from '@/assets/icons/coin-yarilo.png';
import coinVelesSilverImg from '@/assets/icons/coin-veles-silver.png';
import coinDazhdbogImg from '@/assets/icons/coin-dazhdbog.png';
import coinSvarogImg from '@/assets/icons/coin-svarog.png';
import coinVelesMoonImg from '@/assets/icons/coin-veles-moon.png';

const COIN_ICONS: Record<TowerCoinTier, string> = {
  'Ярь-Медь': coinYariloImg,
  'Кованое Серебро': coinVelesSilverImg,
  'Червонное Золото': coinDazhdbogImg,
  'Пламень-Сталь': coinSvarogImg,
  'Лунный Мефрил': coinVelesMoonImg,
};

const ELEMENT_BG: Record<string, string> = {
  'Огонь': 'from-red-900/30 to-red-800/10',
  'Вода': 'from-blue-900/30 to-blue-800/10',
  'Лес': 'from-green-900/30 to-green-800/10',
  'Камень': 'from-amber-900/30 to-amber-800/10',
  'Тень': 'from-purple-900/30 to-purple-800/10',
  'Свет': 'from-yellow-900/30 to-yellow-800/10',
};

export default function AncientTowerPage() {
  const navigate = useNavigate();
  const { player, arenaState, upgradeTowerStat } = useGame();
  const [selectedCell, setSelectedCell] = useState<{ element: string; stat: TowerStat } | null>(null);

  const currentLevel = selectedCell
    ? (player.towerUpgrades[selectedCell.element]?.[selectedCell.stat] ?? 0)
    : 0;
  const nextEntry = selectedCell && currentLevel < MAX_TOWER_LEVEL
    ? TOWER_UPGRADE_TABLE[currentLevel]
    : null;
  const canAfford = nextEntry
    ? getAvailableCoins(arenaState.arenaCoins, nextEntry.coinTier, nextEntry.cost).canAfford
    : false;

  const handleUpgrade = () => {
    if (!selectedCell) return;
    const ok = upgradeTowerStat(selectedCell.element, selectedCell.stat);
    if (ok) {
      toast.success(`${ELEMENT_ICONS[selectedCell.element as Element]} ${TOWER_STATS.find(s => s.key === selectedCell.stat)?.label} повышен!`);
    } else {
      toast.error('Недостаточно Рунных монет!');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/ancient-forge')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="font-kelly text-2xl text-foreground">🏛️ Башня Древних</h1>
        </div>

        {/* Arena Coins display */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TOWER_COIN_TIERS.map(tier => (
            <div key={tier} className="flex items-center gap-1 bg-surface/60 border border-border/40 rounded-lg px-2 py-1 text-xs">
              <img src={COIN_ICONS[tier]} alt={TOWER_COIN_NAMES[tier]} className="w-5 h-5" />
              <span className="text-muted-foreground">{TOWER_COIN_NAMES[tier].split(' ')[0]}:</span>
              <span className="font-bold text-foreground">{arenaState.arenaCoins[tier] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Element upgrade grid */}
        <DragScroll>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-2 font-kelly text-muted-foreground">Элемент</th>
                {TOWER_STATS.map(s => (
                  <th key={s.key} className="text-center py-2 px-1 font-kelly text-muted-foreground">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOWER_ELEMENTS.map((el, i) => (
                <motion.tr
                  key={el}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border-b border-border/20 bg-gradient-to-r ${ELEMENT_BG[el]}`}
                >
                  <td className="py-2.5 px-2 font-kelly whitespace-nowrap">
                    <span className="mr-1">{ELEMENT_ICONS[el as Element]}</span>
                    {el}
                  </td>
                  {TOWER_STATS.map(s => {
                    const level = player.towerUpgrades[el]?.[s.key] ?? 0;
                    const isMax = level >= MAX_TOWER_LEVEL;
                    return (
                      <td key={s.key} className="text-center py-2.5 px-1">
                        <button
                          onClick={() => setSelectedCell({ element: el, stat: s.key })}
                          className={`inline-flex items-center justify-center min-w-[50px] rounded-md px-1.5 py-1 transition-colors border ${
                            isMax
                              ? 'bg-primary/20 border-primary/40 text-primary font-bold'
                              : 'bg-surface/40 border-border/30 hover:border-primary/50 hover:bg-surface/70 text-foreground'
                          }`}
                        >
                          {level}/{MAX_TOWER_LEVEL}
                        </button>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </DragScroll>

        {/* Side panel */}
        <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
          <SheetContent side="right" className="w-[340px] sm:w-[400px] overflow-y-auto">
            {selectedCell && (
              <>
                <SheetHeader>
                  <SheetTitle className="font-kelly text-lg">
                    {ELEMENT_ICONS[selectedCell.element as Element]} {selectedCell.element} — {TOWER_STATS.find(s => s.key === selectedCell.stat)?.label}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Уровень: <span className="text-foreground font-bold">{currentLevel}</span> / {MAX_TOWER_LEVEL}
                    {currentLevel > 0 && (
                      <span className="ml-2 text-primary">+{TOWER_UPGRADE_TABLE[currentLevel - 1].bonusPercent}%</span>
                    )}
                  </p>
                </SheetHeader>

                {/* Upgrade table */}
                <div className="mt-4 max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b border-border/30">
                        <th className="text-left py-1.5 px-2">Ур</th>
                        <th className="text-center py-1.5 px-2">Монеты</th>
                        <th className="text-left py-1.5 px-2">Тип</th>
                        <th className="text-center py-1.5 px-2">Бонус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TOWER_UPGRADE_TABLE.map(entry => {
                        const isDone = currentLevel >= entry.level;
                        const isCurrent = currentLevel + 1 === entry.level;
                        return (
                          <tr
                            key={entry.level}
                            className={`border-b border-border/10 ${
                              isDone ? 'opacity-40' : isCurrent ? 'bg-primary/10' : ''
                            }`}
                          >
                            <td className="py-1.5 px-2 font-bold">{entry.level}</td>
                            <td className="text-center py-1.5 px-2">{entry.cost}</td>
                            <td className="py-1.5 px-2 whitespace-nowrap">
                              <img src={COIN_ICONS[entry.coinTier]} alt="" className="w-4 h-4 inline" /> {TOWER_COIN_NAMES[entry.coinTier]}
                            </td>
                            <td className="text-center py-1.5 px-2 text-primary font-bold">+{entry.bonusPercent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Ascend button */}
                <div className="mt-4">
                  {currentLevel < MAX_TOWER_LEVEL ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Следующий уровень: {nextEntry?.cost} × <img src={COIN_ICONS[nextEntry!.coinTier]} alt="" className="w-4 h-4 inline" /> {TOWER_COIN_NAMES[nextEntry!.coinTier]}
                      </p>
                      <Button
                        onClick={handleUpgrade}
                        disabled={!canAfford}
                        className="w-full font-kelly"
                        size="lg"
                      >
                        ⬆️ Вознести
                      </Button>
                      {!canAfford && (
                        <p className="text-xs text-destructive mt-1 text-center">Недостаточно монет</p>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-primary font-kelly text-lg">✨ Максимум!</div>
                  )}
                </div>

                {/* Rune coin conversion info */}
                <div className="mt-6 border-t border-border/30 pt-4">
                  <h3 className="font-kelly text-sm mb-2 text-muted-foreground">Рунные монеты (из Колизея Богов)</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1"><img src={coinVelesMoonImg} className="w-4 h-4" /> Луна Велеса 1 = 2 <img src={coinSvarogImg} className="w-4 h-4" /> Пламень Сварога</div>
                    <div className="flex items-center gap-1"><img src={coinSvarogImg} className="w-4 h-4" /> Пламень Сварога 1 = 2 <img src={coinDazhdbogImg} className="w-4 h-4" /> Златник Даждьбога</div>
                    <div className="flex items-center gap-1"><img src={coinDazhdbogImg} className="w-4 h-4" /> Златник Даждьбога 1 = 2 <img src={coinVelesSilverImg} className="w-4 h-4" /> Сребреник Велеса</div>
                    <div className="flex items-center gap-1"><img src={coinVelesSilverImg} className="w-4 h-4" /> Сребреник Велеса 1 = 2 <img src={coinYariloImg} className="w-4 h-4" /> Монета Ярилы</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Монеты конвертируются автоматически при прокачке</p>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
