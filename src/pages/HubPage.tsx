import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import bgHub from '@/assets/bg-hub.jpg';
import { useNavigate } from 'react-router-dom';
import { computeGodsCoins } from '@/data/arenaData';
import { calculateUnitPower } from '@/data/campaignStages';
import { getAccountLevelFromXp, MAX_ACCOUNT_LEVEL } from '@/data/accountLevel';
import coinGodsImg from '@/assets/icons/coin-gods.png';
import iconSouls from '@/assets/icons/icon_souls.png';
import QuickBuyButton from '@/components/game/QuickBuyButton';
import PlayerAvatar from '@/components/game/PlayerAvatar';
import ResourceInfoPopover from '@/components/game/ResourceInfoPopover';
import WelcomeModal from '@/components/game/WelcomeModal';
import TutorialGlow from '@/components/game/TutorialGlow';
import TutorialCompleteModal from '@/components/game/TutorialCompleteModal';
import LoginBonusModal from '@/components/game/LoginBonusModal';
import { useUnclaimedAchievements } from '@/hooks/useUnclaimedAchievements';
import { useUnclaimedDailyQuests } from '@/hooks/useUnclaimedDailyQuests';

function BoosterIcon({ icon, alt, label, getTimeLeft, onExtend, borderColor }: { icon: string; alt: string; label: string; getTimeLeft: () => number; onExtend: () => void; borderColor: string }) {
  const [showTime, setShowTime] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 60000);
    return () => clearInterval(id);
  }, [getTimeLeft]);
  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const timeLabel = h >= 24 ? `${Math.floor(h / 24)}д ${h % 24}ч` : `${h}ч ${m}м`;
  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setShowTime(prev => !prev)}
        onDoubleClick={onExtend}
        className={`w-10 h-10 rounded-lg border ${borderColor} bg-surface/60 flex items-center justify-center transition-all hover:scale-110`}
        title={`${label} — дважды нажми для продления`}
      >
        <img src={icon} alt={alt} className="w-6 h-6 object-contain animate-pulse" loading="lazy" />
      </button>
      <AnimatePresence>
        {showTime && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            className={`absolute -bottom-7 whitespace-nowrap bg-surface border ${borderColor} rounded px-1.5 py-0.5 z-10`}
          >
            <span className="font-mono text-[10px] text-foreground">{timeLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HubPage() {
  const { player, getEnergyInfo, arenaState, getFullStats, advanceTutorial, isXpBoosterActive, getXpBoosterTimeLeft, spendMithrilRunes, activateXpBooster, isRuneBoosterActive, getRuneBoosterTimeLeft, activateRuneBooster, isSoulBoosterActive, getSoulBoosterTimeLeft, activateSoulBooster, isVipActive, getVipTimeLeft, canClaimVipDaily, claimVipDaily, canClaimLoginBonus } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const unclaimedDailyCount = useUnclaimedDailyQuests();
  const unclaimedAchievCount = useUnclaimedAchievements();
  const isAdmin = user?.email === 'wowcv@yandex.ru';
  const energy = getEnergyInfo();
  const godsCoins = useMemo(() => computeGodsCoins(arenaState.godsCoins, arenaState.lastGodsCoinUpdate).coins, [arenaState.godsCoins, arenaState.lastGodsCoinUpdate]);
  const step = player.tutorialStep ?? 99;

  const totalPower = useMemo(() => {
    return player.champions.reduce((sum, pc) => {
      const stats = getFullStats(pc);
      return sum + calculateUnitPower(stats);
    }, 0);
  }, [player.champions, getFullStats]);

  const { level: accountLvl, xpInLevel, xpForNext } = useMemo(
    () => getAccountLevelFromXp(player.accountXp ?? 0),
    [player.accountXp]
  );
  const xpPercent = accountLvl >= MAX_ACCOUNT_LEVEL ? 100 : Math.floor((xpInLevel / xpForNext) * 100);

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showBoosterDialog, setShowBoosterDialog] = useState(false);
  const [showLoginBonus, setShowLoginBonus] = useState(false);

  // Auto-open login bonus modal when there's a reward to claim
  useEffect(() => {
    if (step >= 39 && canClaimLoginBonus()) {
      const timer = setTimeout(() => setShowLoginBonus(true), 800);
      return () => clearTimeout(timer);
    }
  }, [step, canClaimLoginBonus]);

  useEffect(() => {
    if (step === 0) {
      const seen = sessionStorage.getItem('welcome_shown');
      if (!seen) {
        setShowWelcome(true);
        sessionStorage.setItem('welcome_shown', '1');
      }
    }
  }, [step]);

  // Show completion modal when step reaches 39
  useEffect(() => {
    if (step === 39) {
      setShowComplete(true);
    }
  }, [step]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Tutorial step → which hub button path is highlighted
  const highlightMap: Record<number, string> = {
    0: '/summon', 6: '/squads', 9: '/trials', 17: '/squads', 23: '/trials', 31: '/squads',
    41: '/ancient-forge',
  };
  const highlightedPath = highlightMap[step] ?? null;

  // Tutorial locked: buttons are locked if step is too low
  const isLocked = (path: string): boolean => {
    if (step >= 41 && step <= 50) {
      // During forge tutorial, only ancient-forge is unlocked
      return path !== '/ancient-forge';
    }
    if (step >= 39) return false; // tutorial complete
    if (path === '/summon') return false; // always accessible
    if (path === '/squads') return step < 6;
    if (path === '/trials') return step < 9;
    if (path === '/ancient-forge') return step < 39;
    if (path === '/daily-quests') return step < 39;
    if (path === '/achievements') return step < 39;
    if (path === '/shop') return step < 39;
    if (path === '/more') return step < 39;
    return false;
  };

  const getHintText = (path: string): string | null => {
    if (step === 0 && path === '/summon') return 'Алтарь Призыва — здесь ты получишь героев! Открой сосуд и призови воинов.';
    if (step === 6 && path === '/squads') return 'Отряд — твоя боевая команда из 4 героев. Зайди и собери его!';
    if (step === 9 && path === '/trials') return 'Испытания — все боевые режимы. Начни с Кампании!';
    if (step === 17 && path === '/squads') return 'Снаряжение усиливает героя. Зайди в Отряд и экипируй Меч!';
    if (step === 23 && path === '/trials') return 'Со снаряжением ты сильнее! Пройди второй этап Кампании.';
    if (step === 31 && path === '/squads') return 'Шлем повышает Здоровье, а прокачка Меча усиливает его. Зайди!';
    if (step === 41 && path === '/ancient-forge') return 'Здесь можно улучшать и продавать снаряжение. Зайди!';
    return null;
  };

  const getLockText = (): string => {
    if (step < 6) return '🔒 Открой сосуды!';
    if (step < 9) return '🔒 Собери отряд!';
    if (step < 17) return '🔒 Пройди Кампанию!';
    if (step < 23) return '🔒 Экипируй Меч!';
    if (step < 31) return '🔒 Пройди 2-й бой!';
    return '🔒 Прокачай снаряжение!';
  };

  const handleButtonClick = (path: string) => {
    // Advance tutorial on specific steps
    if (step === 0 && path === '/summon') advanceTutorial(0);
    if (step === 6 && path === '/squads') advanceTutorial(6);
    if (step === 9 && path === '/trials') advanceTutorial(9);
    if (step === 17 && path === '/squads') advanceTutorial(17);
    if (step === 23 && path === '/trials') advanceTutorial(23);
    if (step === 31 && path === '/squads') advanceTutorial(31);
    if (step === 41 && path === '/ancient-forge') advanceTutorial(41);
    navigate(path);
  };

  const buttons = [
    { label: 'Отряды', icon: '/ui/icon_squads.png', path: '/squads', description: 'Отряды и Дружина' },
    { label: 'Алтарь Призыва', icon: '/ui/icon_summon.png', path: '/summon', description: 'Призови героев' },
    { label: 'Испытания', icon: '/ui/icon_trials.png', path: '/trials', description: 'Кампания, Арена и др.' },
    { label: 'Торжище', icon: '/ui/icon_shop.png', path: '/shop', description: 'Мифриловые Руны' },
    { label: 'Горн Древних', icon: '/ui/icon_forge.png', path: '/ancient-forge', description: 'Кузница и Инвентарь' },
    { label: 'Задания', icon: '/ui/icon_daily_quests.png', path: '/daily-quests', description: 'Ежедневные задания' },
    { label: 'Достижения', icon: '/ui/icon_achievements.png', path: '/achievements', description: 'Свитки Славы' },
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

        {/* Player name + Level */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-4 w-full"
        >
          <div className="relative px-5 py-2.5 flex items-center gap-3">
            <div className="absolute inset-0 border-2 border-primary/60 rounded-lg" />
            <div className="absolute inset-[3px] border border-primary/30 rounded-md" />
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br" />
            <PlayerAvatar size={36} className="relative z-10" />
            <div className="flex-1 relative z-10 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-kelly text-lg sm:text-xl text-foreground truncate">
                  {player.username}
                </span>
                {isVipActive() && (
                  <span className="font-kelly text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/40 flex-shrink-0">
                    👑 VIP
                  </span>
                )}
                <span className="font-kelly text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30 flex-shrink-0">
                  Ур. {accountLvl}
                </span>
              </div>
              {/* XP Progress bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-2 bg-background/60 rounded-full overflow-hidden border border-border/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                  {accountLvl >= MAX_ACCOUNT_LEVEL ? 'MAX' : `${xpInLevel}/${xpForNext}`}
                </span>
              </div>
            </div>
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

        {/* Boosters row */}
        {(isXpBoosterActive() || isRuneBoosterActive() || isSoulBoosterActive()) && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-center justify-center gap-3">
            {isXpBoosterActive() && (
              <BoosterIcon icon="/ui/icon_booster_xp.png" alt="×2 XP" label="Пламя Ратоборца" getTimeLeft={getXpBoosterTimeLeft} onExtend={() => setShowBoosterDialog(true)} borderColor="border-accent/50" />
            )}
            {isRuneBoosterActive() && (
              <BoosterIcon icon="/ui/icon_booster_runes.png" alt="×2 Руны" label="Рунный Прилив" getTimeLeft={getRuneBoosterTimeLeft} onExtend={() => setShowBoosterDialog(true)} borderColor="border-[hsl(200,60%,50%)]/50" />
            )}
            {isSoulBoosterActive() && (
              <BoosterIcon icon="/ui/icon_booster_souls.png" alt="×2 Души" label="Зов Предков" getTimeLeft={getSoulBoosterTimeLeft} onExtend={() => setShowBoosterDialog(true)} borderColor="border-[hsl(120,40%,50%)]/50" />
            )}
          </motion.div>
        )}

        {/* VIP Daily Bonus */}
        {isVipActive() && canClaimVipDaily() && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-3 flex justify-center">
            <button
              onClick={() => {
                if (claimVipDaily()) {
                  toast.success('👑 VIP бонус получен!', {
                    description: '+50 Энергии, +1 Заветный Сосуд, +500 Душ',
                  });
                }
              }}
              className="px-4 py-2 rounded-lg bg-accent/20 border border-accent/50 text-accent font-kelly text-sm hover:bg-accent/30 transition-all animate-pulse"
            >
              👑 Забрать VIP бонус
            </button>
          </motion.div>
        )}

        {/* Login Bonus button */}
        {step >= 39 && (player.loginBonusDay ?? 0) < 7 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-3 flex justify-center">
            <button
              onClick={() => setShowLoginBonus(true)}
              className={`px-4 py-2 rounded-lg border font-kelly text-sm transition-all ${
                canClaimLoginBonus()
                  ? 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 animate-pulse'
                  : 'bg-surface/40 border-border/40 text-muted-foreground'
              }`}
            >
              🎁 Бонус входа {canClaimLoginBonus() ? `(День ${(player.loginBonusDay ?? 0) + 1})` : `✓`}
            </button>
          </motion.div>
        )}

        {/* Resources bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-4 sm:gap-6 mb-8 bg-surface/60 backdrop-blur-sm rounded-lg px-4 py-2 card-lubok"
        >
          <ResourceInfoPopover type="souls">
            <span className="font-mono text-sm text-primary flex items-center gap-1"><img src={iconSouls} alt="Души" className="w-4 h-4" /> {player.souls}</span>
          </ResourceInfoPopover>
          <ResourceInfoPopover type="runes">
            <span className="font-mono text-sm text-foreground flex items-center gap-1"><img src="/ui/icon_runes.png" alt="Руны" className="w-4 h-4" /> {player.runes}</span>
          </ResourceInfoPopover>
          <ResourceInfoPopover type="mithril">
            <span className="font-mono text-sm text-foreground flex items-center gap-1">
              <img src="/ui/icon_mithril.png" alt="МР" className="w-4 h-4 inline-block" />
              {player.mithrilRunes}
            </span>
          </ResourceInfoPopover>
          <ResourceInfoPopover type="energy">
            <span className="font-mono text-sm text-accent-foreground flex items-center gap-1">
              <img src="/ui/energy.png" alt="Энергия" className="w-4 h-4 inline-block" />
              {energy.current}/{energy.max}
              <QuickBuyButton type="energy" />
            </span>
          </ResourceInfoPopover>
          <ResourceInfoPopover type="coins">
            <span className="font-mono text-sm text-foreground flex items-center gap-1">
              <img src={coinGodsImg} alt="Монеты Богов" className="w-4 h-4 inline-block" />
              {godsCoins}
              <QuickBuyButton type="coins" />
            </span>
          </ResourceInfoPopover>
        </motion.div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3">
          {buttons.map((btn, i) => {
            const locked = isLocked(btn.path);
            const isHighlighted = highlightedPath === btn.path;
            const hint = getHintText(btn.path);
            return (
              <motion.button
                key={btn.path}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                onClick={() => !locked && handleButtonClick(btn.path)}
                disabled={locked}
                className={`relative w-full flex items-center gap-4 backdrop-blur-sm border rounded-xl px-5 py-4 card-lubok transition-all min-h-[60px] group ${
                  locked
                    ? 'bg-surface/30 border-border/30 opacity-40 cursor-not-allowed grayscale'
                    : isHighlighted
                      ? 'bg-primary/10 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] hover:bg-primary/20 hover:scale-[1.03] active:scale-[0.98]'
                      : 'bg-surface/70 border-border/50 hover:bg-surface/90 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isHighlighted && (
                  <TutorialGlow label={hint || undefined} wide />
                )}
                <div className="relative flex-shrink-0">
                  <img src={btn.icon} alt={btn.label} className={`w-10 h-10 sm:w-12 sm:h-12 object-contain transition-transform ${isHighlighted ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                  {(() => {
                    const badge = btn.path === '/daily-quests' ? unclaimedDailyCount : btn.path === '/achievements' ? unclaimedAchievCount : 0;
                    return badge > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-pulse shadow-lg">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="flex flex-col items-start">
                  <span className={`font-kelly text-base sm:text-lg ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>
                    {btn.label}
                  </span>
                  <span className={`text-xs ${isHighlighted ? 'text-primary/80 font-semibold' : 'text-muted-foreground'}`}>
                    {locked ? getLockText() : hint ?? btn.description}
                  </span>
                </div>
                <span className={`ml-auto text-lg ${locked ? 'text-muted-foreground/50' : isHighlighted ? 'text-primary animate-pulse' : 'text-muted-foreground/50'}`}>{locked ? '🔒' : '›'}</span>
              </motion.button>
            );
          })}

          {/* Fullscreen button */}
          {step >= 39 && (
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
          )}
        </div>
      </div>
      <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />
      <TutorialCompleteModal open={showComplete} onClose={() => { setShowComplete(false); advanceTutorial(39); }} />

      {/* Unified booster extend dialog */}
      <AnimatePresence>
        {showBoosterDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setShowBoosterDialog(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-5 card-lubok max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-kelly text-lg text-primary text-center mb-1">Продление бустеров</h3>
              <div className="flex items-center justify-center gap-1 text-xs text-foreground bg-background/40 rounded-lg px-3 py-1 mb-4">
                <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                <span className="font-mono">{player.mithrilRunes} МР</span>
              </div>

              {/* Individual boosters */}
              {([
                { icon: '/ui/icon_booster_xp.png', name: 'Пламя Ратоборца', desc: '×2 Опыт', activate: activateXpBooster, price1: 150, price3: 300 },
                { icon: '/ui/icon_booster_runes.png', name: 'Рунный Прилив', desc: '×2 Руны', activate: activateRuneBooster, price1: 150, price3: 300 },
                { icon: '/ui/icon_booster_souls.png', name: 'Зов Предков', desc: '×2 Души', activate: activateSoulBooster, price1: 150, price3: 300 },
              ] as const).map(b => (
                <div key={b.name} className="mb-3 bg-background/30 rounded-xl p-3 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={b.icon} alt="" className="w-8 h-8 object-contain" loading="lazy" />
                    <div>
                      <span className="font-kelly text-sm text-foreground">{b.name}</span>
                      <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (!spendMithrilRunes(b.price1)) { toast.error('Недостаточно МР!'); return; }
                        b.activate(1);
                        toast.success(`${b.name} +1 день!`);
                      }}
                      disabled={player.mithrilRunes < b.price1}
                      className="flex flex-col items-center gap-0.5 bg-background/40 border border-border/50 hover:border-primary/40 rounded-lg p-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="font-kelly text-xs text-foreground">+1 день</span>
                      <div className="flex items-center gap-0.5">
                        <img src="/ui/icon_mithril.png" alt="" className="w-3 h-3" />
                        <span className="text-xs font-bold text-primary">{b.price1}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        if (!spendMithrilRunes(b.price3)) { toast.error('Недостаточно МР!'); return; }
                        b.activate(3);
                        toast.success(`${b.name} +3 дня!`);
                      }}
                      disabled={player.mithrilRunes < b.price3}
                      className="flex flex-col items-center gap-0.5 bg-background/40 border border-border/50 hover:border-primary/40 rounded-lg p-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="font-kelly text-xs text-foreground">+3 дня</span>
                      <div className="flex items-center gap-0.5">
                        <img src="/ui/icon_mithril.png" alt="" className="w-3 h-3" />
                        <span className="text-xs font-bold text-primary">{b.price3}</span>
                      </div>
                    </button>
                  </div>
                </div>
              ))}

              {/* Bundle deals */}
              <div className="border-t border-border/30 pt-3 mt-1">
                <h4 className="font-kelly text-xs text-accent text-center mb-2">🔥 Набор «Все 3 бустера» — скидка!</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (!spendMithrilRunes(350)) { toast.error('Недостаточно МР!'); return; }
                      activateXpBooster(1); activateRuneBooster(1); activateSoulBooster(1);
                      toast.success('Все 3 бустера активированы на 1 день!');
                      setShowBoosterDialog(false);
                    }}
                    disabled={player.mithrilRunes < 350}
                    className="flex flex-col items-center gap-1 bg-accent/10 border border-accent/30 hover:border-accent/60 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex gap-1">
                      <img src="/ui/icon_booster_xp.png" alt="" className="w-5 h-5 object-contain" />
                      <img src="/ui/icon_booster_runes.png" alt="" className="w-5 h-5 object-contain" />
                      <img src="/ui/icon_booster_souls.png" alt="" className="w-5 h-5 object-contain" />
                    </div>
                    <span className="font-kelly text-xs text-foreground">×3 +1 день</span>
                    <div className="flex items-center gap-0.5">
                      <img src="/ui/icon_mithril.png" alt="" className="w-3 h-3" />
                      <span className="text-xs font-bold text-accent">350</span>
                      <span className="text-[9px] text-muted-foreground line-through ml-0.5">450</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (!spendMithrilRunes(650)) { toast.error('Недостаточно МР!'); return; }
                      activateXpBooster(3); activateRuneBooster(3); activateSoulBooster(3);
                      toast.success('Все 3 бустера активированы на 3 дня!');
                      setShowBoosterDialog(false);
                    }}
                    disabled={player.mithrilRunes < 650}
                    className="flex flex-col items-center gap-1 bg-accent/10 border border-accent/30 hover:border-accent/60 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex gap-1">
                      <img src="/ui/icon_booster_xp.png" alt="" className="w-5 h-5 object-contain" />
                      <img src="/ui/icon_booster_runes.png" alt="" className="w-5 h-5 object-contain" />
                      <img src="/ui/icon_booster_souls.png" alt="" className="w-5 h-5 object-contain" />
                    </div>
                    <span className="font-kelly text-xs text-foreground">×3 +3 дня</span>
                    <div className="flex items-center gap-0.5">
                      <img src="/ui/icon_mithril.png" alt="" className="w-3 h-3" />
                      <span className="text-xs font-bold text-accent">650</span>
                      <span className="text-[9px] text-muted-foreground line-through ml-0.5">900</span>
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowBoosterDialog(false)}
                className="text-xs text-muted-foreground hover:text-foreground mt-3 w-full text-center"
              >
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginBonusModal open={showLoginBonus} onOpenChange={setShowLoginBonus} />
    </div>
  );
}
