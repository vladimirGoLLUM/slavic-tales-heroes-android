import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getAccountLevelFromXp } from '@/data/accountLevel';
import { generateArtifact } from '@/data/artifacts';
import { useMemo, useRef } from 'react';
import TutorialGlow from '@/components/game/TutorialGlow';

const ITEMS = [
  { path: '/forge', label: 'Кузница', icon: '/ui/icon_forge.png', description: 'Улучшение снаряжения', requiredLevel: 5 },
  { path: '/inventory', label: 'Сокровищница', icon: '/ui/icon_treasury.png', description: 'Все предметы', requiredLevel: 5 },
  { path: '/ancient-tower', label: 'Башня Древних', icon: '/ui/icon_ancient_tower.png', description: 'Испытания башни', requiredLevel: 15 },
  { path: '/furnace', label: 'Горнило', icon: '/ui/icon_furnace.png', description: 'Закалка материалами боссов', requiredLevel: 30 },
];

export default function AncientForgePage() {
  const navigate = useNavigate();
  const { player, advanceTutorial } = useGame();
  const accountLevel = useMemo(() => getAccountLevelFromXp(player.accountXp ?? 0).level, [player.accountXp]);
  const step = player.tutorialStep ?? 99;
  const gaveSellWeapon = useRef(false);

  const handleClick = (item: typeof ITEMS[0]) => {
    if (step === 42 && item.path === '/forge') {
      advanceTutorial(42);
      navigate(item.path);
    } else if (step === 48 && item.path === '/inventory') {
      // Give a weapon for sell tutorial
      if (!gaveSellWeapon.current) {
        gaveSellWeapon.current = true;
        // We add the artifact via the game context in the next step
        // The artifact was already added when entering step 48
      }
      advanceTutorial(48);
      navigate(item.path);
    } else if (step >= 41 && step <= 50) {
      // During tutorial, only highlighted items are clickable
      return;
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (step === 47) {
                // After forging, give sell weapon and advance to 48
                advanceTutorial(47);
              }
              navigate('/');
            }}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_forge.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Горн Древних</h1>
        </div>

        <div className="flex flex-col gap-3">
          {ITEMS.map((item, i) => {
            const locked = step >= 41 && step <= 50
              ? false // During tutorial, show items but control via tutorial logic
              : accountLevel < item.requiredLevel;
            
            const isTutorialHighlighted = (step === 42 && item.path === '/forge') || (step === 48 && item.path === '/inventory');
            const isTutorialLocked = step >= 41 && step <= 50 && !isTutorialHighlighted;
            const isLevelLocked = !(step >= 41 && step <= 50) && accountLevel < item.requiredLevel;
            const isDisabled = isLevelLocked || isTutorialLocked;

            return (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => !isDisabled && handleClick(item)}
                disabled={isDisabled}
                className={`relative w-full flex items-center gap-4 border rounded-xl px-5 py-4 card-lubok transition-all min-h-[60px] group ${
                  isDisabled
                    ? 'bg-surface/30 border-border/30 opacity-40 cursor-not-allowed'
                    : isTutorialHighlighted
                      ? 'bg-primary/10 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
                      : 'bg-surface/60 hover:bg-surface/80 border-border/50 hover:border-primary/40'
                }`}
              >
                {isTutorialHighlighted && (
                  <TutorialGlow wide label={step === 42 ? 'В Кузнице можно повысить ★ звёзды предмета, сделав его сильнее!' : 'Ненужные предметы можно продать за Души. Зайди в Сокровищницу!'} />
                )}
                <div className="relative flex-shrink-0">
                  <img src={item.icon} alt={item.label} className={`w-10 h-10 object-contain ${isDisabled ? 'grayscale' : isTutorialHighlighted ? 'animate-bounce' : 'group-hover:scale-110'} transition-all`} />
                  {isLevelLocked && (
                    <span className="absolute -top-1 -right-1 text-sm">🔒</span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-kelly text-base text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {isLevelLocked ? `Доступно с ${item.requiredLevel} ур.` : item.description}
                  </span>
                </div>
                {isLevelLocked ? (
                  <span className="ml-auto text-xs font-kelly text-primary/70 bg-primary/10 rounded-full px-2 py-0.5">
                    {item.requiredLevel} ур.
                  </span>
                ) : (
                  <span className="ml-auto text-muted-foreground/50 text-lg">›</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
