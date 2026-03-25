import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TEMPLES } from '@/data/templeData';
import { useGame } from '@/context/GameContext';

export default function TemplesPage() {
  const navigate = useNavigate();
  const { player } = useGame();

  const getTotalRunes = (element: string) => {
    const rarities = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];
    return rarities.reduce((sum, r) => {
      const key = `${element}_${r}`;
      return sum + (player.divineRunes[key as keyof typeof player.divineRunes] ?? 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/trials')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_temples.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Храмы</h1>
        </div>

        {/* Temple list */}
        <div className="flex flex-col gap-3">
          {TEMPLES.map((temple, i) => {
            const totalRunes = getTotalRunes(temple.element);
            return (
              <motion.button
                key={temple.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => navigate(`/temples/${temple.id}`)}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border card-lubok bg-gradient-to-r ${temple.color} border-border hover:border-primary/50 transition-all group`}
              >
                <img
                  src={temple.icon}
                  alt={temple.name}
                  className="w-16 h-16 object-contain group-hover:scale-110 transition-transform flex-shrink-0"
                />
                <div className="flex-1 text-left">
                  <span className="font-kelly text-base text-foreground block">{temple.name}</span>
                  <span className="text-xs text-muted-foreground">5 этажей • Боссы элемента {temple.element === 'Божественность' ? 'Божественности' : temple.element}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <img src={temple.runeIcon} alt={temple.runeName} className="w-8 h-8 object-contain" />
                  {totalRunes > 0 && (
                    <span className="text-[10px] font-mono text-primary font-bold">{totalRunes}</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
