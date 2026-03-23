import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import bgHub from '@/assets/bg-hub.jpg';
import { useNavigate } from 'react-router-dom';
import { computeGodsCoins } from '@/data/arenaData';
import { calculateUnitPower } from '@/data/campaignStages';
import coinGodsImg from '@/assets/icons/coin-gods.png';
import iconSouls from '@/assets/icons/icon_souls.png';
import QuickBuyButton from '@/components/game/QuickBuyButton';

export default function HubPage() {
  const { player, getEnergyInfo, arenaState, getFullStats } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email === 'wowcv@yandex.ru';
  const energy = getEnergyInfo();
  const godsCoins = useMemo(() => computeGodsCoins(arenaState.godsCoins, arenaState.lastGodsCoinUpdate).coins, [arenaState.godsCoins, arenaState.lastGodsCoinUpdate]);

  const totalPower = useMemo(() => {
    return player.champions.reduce((sum, pc) => {
      const stats = getFullStats(pc);
      return sum + calculateUnitPower(stats);
    }, 0);
  }, [player.champions, getFullStats]);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const buttons = [
    { label: 'Отряды', icon: '/ui/icon_squads.png', path: '/squads', description: 'Отряды и Дружина' },
    { label: 'Алтарь Призыва', icon: '/ui/icon_summon.png', path: '/summon', description: 'Призови героев' },
    { label: 'Испытания', icon: '/ui/icon_trials.png', path: '/trials', description: 'Кампания, Арена и др.' },
    { label: 'Торжище', icon: '/ui/icon_shop.png', path: '/shop', description: 'Мифриловые Руны', locked: !isAdmin },
    { label: 'Горн Древних', icon: '/ui/icon_forge.png', path: '/ancient-forge', description: 'Кузница и Инвентарь' },
    { label: 'Ещё', icon: '/ui/icon_more.png', path: '/more', description: 'Настройки, Герои...' },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img src={bgHub} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-12 max-w-md mx-auto flex flex-col items-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-kelly text-primary text-gold-glow tracking-[0.3em]">
            ГЕРОИ БЫЛИНЫ
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base font-kelly">
            Судьба предков в твоих руках
          </p>
        </motion.div>

        {/* Player name in ornamental frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <div className="relative px-8 py-2.5">
            <div className="absolute inset-0 border-2 border-primary/60 rounded-lg" />
            <div className="absolute inset-[3px] border border-primary/30 rounded-md" />
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br" />
            <span className="font-kelly text-lg sm:text-xl text-foreground relative z-10">
              {player.username}
            </span>
          </div>
        </motion.div>

        {/* Total Power */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 text-center"
        >
          <span className="text-sm font-kelly text-muted-foreground">Общая сила: </span>
          <span className="text-sm font-mono text-primary">{totalPower.toLocaleString()}</span>
        </motion.div>

        {/* Resources bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-4 sm:gap-6 mb-8 bg-surface/60 backdrop-blur-sm rounded-lg px-4 py-2 card-lubok"
        >
          <span className="font-mono text-sm text-primary flex items-center gap-1"><img src={iconSouls} alt="Души" className="w-4 h-4" /> {player.souls}</span>
          <span className="font-mono text-sm text-foreground flex items-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4" /> {player.runes}</span>
          <span className="font-mono text-sm text-foreground flex items-center gap-1">
            <img src="/ui/icon_mithril.png" alt="МР" className="w-4 h-4 inline-block" />
            {player.mithrilRunes}
          </span>
          <span className="font-mono text-sm text-accent-foreground flex items-center gap-1">
            <img src="/ui/energy.png" alt="Энергия" className="w-4 h-4 inline-block" />
            {energy.current}/{energy.max}
            <QuickBuyButton type="energy" />
          </span>
          <span className="font-mono text-sm text-foreground flex items-center gap-1">
            <img src={coinGodsImg} alt="Монеты Богов" className="w-4 h-4 inline-block" />
            {godsCoins}
            <QuickBuyButton type="coins" />
          </span>
        </motion.div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3">
          {buttons.map((btn, i) => (
            <motion.button
              key={btn.path}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              onClick={() => !btn.locked && navigate(btn.path)}
              disabled={btn.locked}
              className={`w-full flex items-center gap-4 bg-surface/70 backdrop-blur-sm border border-border/50 rounded-xl px-5 py-4 card-lubok transition-all min-h-[60px] group ${
                btn.locked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-surface/90 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <img src={btn.icon} alt={btn.label} className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col items-start">
                <span className="font-kelly text-base sm:text-lg text-foreground">
                  {btn.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {btn.description}
                </span>
              </div>
              {btn.locked ? (
                <span className="ml-auto text-lg">🔒</span>
              ) : (
                <span className="ml-auto text-muted-foreground/50 text-lg">›</span>
              )}
            </motion.button>
          ))}

          {/* Fullscreen button */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + buttons.length * 0.08 }}
            onClick={toggleFullscreen}
            className="w-full flex items-center gap-4 bg-surface/70 backdrop-blur-sm hover:bg-surface/90 border border-border/50 hover:border-primary/40 rounded-xl px-5 py-4 card-lubok transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[60px] group"
          >
            <img src="/ui/icon_fullscreen.png" alt="Во весь экран" className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-start">
              <span className="font-kelly text-base sm:text-lg text-foreground">
                {isFullscreen ? 'Свернуть' : 'Во весь экран'}
              </span>
              <span className="text-xs text-muted-foreground">
                {isFullscreen ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран'}
              </span>
            </div>
            <span className="ml-auto text-muted-foreground/50 text-lg">›</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
