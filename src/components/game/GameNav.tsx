import { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { computeGodsCoins } from '@/data/arenaData';
import iconSouls from '@/assets/icons/icon_souls.png';
import QuickBuyButton from '@/components/game/QuickBuyButton';
import { useUnclaimedAchievements } from '@/hooks/useUnclaimedAchievements';
import { useUnclaimedDailyQuests } from '@/hooks/useUnclaimedDailyQuests';

const mainItems = [
  { path: '/', label: 'Стан', icon: '/ui/icon_squads.png' },
  { path: '/collection', label: 'Дружина', icon: '/ui/icon_collection.png' },
  { path: '/trials', label: 'Испытания', icon: '/ui/icon_trials.png' },
];

const menuItems = [
  { path: '/heroes', label: 'Герои', icon: '/ui/icon_heroes.png' },
  { path: '/artifacts', label: 'Артефакты', icon: '/ui/icon_artifacts.png' },
  { path: '/forge', label: 'Кузница', icon: '/ui/icon_forge.png' },
  { path: '/summon', label: 'Призыв', icon: '/ui/icon_summon.png' },
  { path: '/calculator', label: 'Калькулятор', icon: '/ui/icon_calculator.png' },
  { path: '/inventory', label: 'Инвентарь', icon: '/ui/icon_inventory.png' },
  { path: '/compare', label: 'Сравнение', icon: '/ui/icon_compare.png' },
  { path: '/hero-3d-showcase', label: '3D Герои', icon: '/ui/icon_heroes.png' },
];

export default function GameNav() {
  const location = useLocation();
  const { player, saving, getEnergyInfo, arenaState, isXpBoosterActive, isRuneBoosterActive, isSoulBoosterActive, isVipActive } = useGame();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const unclaimedCount = useUnclaimedAchievements();
  const unclaimedDailyCount = useUnclaimedDailyQuests();
  const totalBadge = unclaimedCount + unclaimedDailyCount;

  const hiddenPaths = ['/collection', '/campaign', '/battle', '/trials', '/squads', '/more'];
  
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <>
      {/* Menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => { setMenuOpen(false); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-20 left-4 right-4 bg-surface rounded-xl border border-border p-3 card-lubok"
              onClick={e => e.stopPropagation()}
            >
                <div className="grid grid-cols-3 gap-2">
                  {menuItems.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg min-h-[56px] transition-all ${
                        location.pathname === item.path
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:bg-surface/80'
                      }`}
                    >
                      <img src={item.icon} alt={item.label} className="w-6 h-6 object-contain" />
                      <span className="text-xs font-kelly">{item.label}</span>
                    </NavLink>
                  ))}
                  {/* Settings button */}
                  <button
                    onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg min-h-[56px] transition-all text-muted-foreground hover:bg-surface/80"
                  >
                    <img src="/ui/icon_settings.png" alt="Настройки" className="w-6 h-6 object-contain" />
                    <span className="text-xs font-kelly">Настройки</span>
                  </button>
                  {/* Fullscreen button */}
                  <button
                    onClick={() => { toggleFullscreen(); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg min-h-[56px] transition-all text-muted-foreground hover:bg-surface/80"
                  >
                    <img src="/ui/icon_fullscreen.png" alt="" className="w-6 h-6 object-contain" />
                    <span className="text-xs font-kelly">{isFullscreen ? 'Оконный' : 'На весь экран'}</span>
                  </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border safe-area-bottom">
        {/* Resources bar */}
        <div className="flex justify-center items-center gap-3 py-1 border-b border-border/50 text-sm">
          <span className="font-mono text-primary flex items-center gap-1"><img src={iconSouls} alt="Души" className="w-4 h-4" /> {player.souls}</span>
          <span className="font-mono text-foreground flex items-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4" /> {player.runes}</span>
          <span className="font-mono text-cyan-400 flex items-center gap-0.5">
            <img src="/ui/energy.png" alt="Энергия" className="w-4 h-4" />
            {getEnergyInfo().current}/{getEnergyInfo().max}
            <QuickBuyButton type="energy" />
          </span>
          <span className="font-mono text-amber-400 flex items-center gap-0.5">
            <img src="/ui/icon_gods_coin.png" alt="Монеты Богов" className="w-4 h-4" />
            {(() => { const { coins } = computeGodsCoins(arenaState.godsCoins, arenaState.lastGodsCoinUpdate); return coins; })()}
            <QuickBuyButton type="coins" />
          </span>
          {isXpBoosterActive() && <img src="/ui/icon_booster_xp.png" alt="×2 XP" className="w-4 h-4 object-contain animate-pulse" title="Пламя Ратоборца активно" loading="lazy" />}
          {isRuneBoosterActive() && <img src="/ui/icon_booster_runes.png" alt="×2 Руны" className="w-4 h-4 object-contain animate-pulse" title="Рунный Прилив активен" loading="lazy" />}
          {isSoulBoosterActive() && <img src="/ui/icon_booster_souls.png" alt="×2 Души" className="w-4 h-4 object-contain animate-pulse" title="Зов Предков активен" loading="lazy" />}
          {isVipActive() && <span className="text-sm animate-pulse" title="VIP активна">👑</span>}
          {saving && <span className="text-muted-foreground text-xs animate-pulse">💾</span>}
        </div>

        {/* Nav items */}
        <div className="flex justify-around items-center py-1.5 px-2 max-w-lg mx-auto">
          {mainItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 px-4 py-1 min-w-[56px] min-h-[44px] justify-center"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <img src={item.icon} alt={item.label} className="w-6 h-6 object-contain" />
                <span className={`text-[11px] font-kelly ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* More menu button */}
          <button
            onClick={() => { setMenuOpen(!menuOpen); }}
            className="relative flex flex-col items-center gap-0.5 px-4 py-1 min-w-[56px] min-h-[44px] justify-center"
          >
            <div className="relative">
              <img src="/ui/icon_more.png" alt="Ещё" className="w-6 h-6 object-contain" />
              {totalBadge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-pulse shadow-lg">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </div>
            <span className={`text-[11px] font-kelly ${menuOpen ? 'text-primary' : 'text-muted-foreground'}`}>
              Ещё
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
