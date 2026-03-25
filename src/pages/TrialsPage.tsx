import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { CONTENT_UNLOCK_LEVELS, isContentUnlocked } from '@/data/accountLevel';
import TutorialGlow from '@/components/game/TutorialGlow';

const TRIALS = [
  { id: 'campaign', label: 'Кампания', icon: '/ui/icon_campaign.png', path: '/campaign', contentKey: 'campaign', description: 'Сюжетные сражения' },
  { id: 'temples', label: 'Храмы', icon: '/ui/icon_temples.png', path: '/temples', contentKey: 'temples', description: 'Боссы элементов' },
  { id: 'arena', label: 'Колизей Богов', icon: '/ui/icon_arena.png', path: '/trials/arena', contentKey: 'arena', description: 'PvP бои' },
  { id: 'worldboss', label: 'Мировые Боссы', icon: '/ui/icon_worldboss.png', path: '/trials/worldboss', contentKey: 'worldboss', description: 'Гидра — нанеси максимум урона' },
  { id: 'dungeon', label: 'Подземелья', icon: '/ui/icon_dungeon.png', path: '/dungeon', contentKey: 'dungeon', description: 'Случайные этажи' },
  { id: 'abyss', label: 'Бездна', icon: '/ui/icon_abyss.png', path: '/trials/abyss', contentKey: 'abyss', description: 'Ежемесячное восхождение — 160 этажей' },
];



export default function TrialsPage() {
  const navigate = useNavigate();
  const { accountLevel, player, advanceTutorial } = useGame();
  const step = player.tutorialStep ?? 99;

  const isCampaignHighlighted = step === 10 || step === 24;
  const isBackHighlighted = step === 16 || step === 30;

  const handleBack = () => {
    if (step === 16) advanceTutorial(16);
    if (step === 30) advanceTutorial(30);
    navigate('/');
  };

  const handleTrialClick = (trial: typeof TRIALS[0]) => {
    if (trial.id === 'campaign') {
      if (step === 10) advanceTutorial(10);
      if (step === 24) advanceTutorial(24);
    }
    navigate(trial.path);
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className={`relative text-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isBackHighlighted ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isBackHighlighted && <TutorialGlow rounded="rounded-xl" label={step === 16 ? 'Хорошее начало! Возвращайся на главный экран.' : 'Прогресс растёт! Вернись на главный экран.'} wide below />}
            <span className="relative z-20">←</span>
          </button>
          <img src="/ui/icon_trials.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Испытания</h1>
        </div>

        {/* Trials grid */}
        <div className="grid grid-cols-2 gap-3">
          {TRIALS.map((trial, i) => {
            const unlocked = step >= 39 ? isContentUnlocked(trial.contentKey, accountLevel) : (trial.id === 'campaign');
            const requiredLvl = CONTENT_UNLOCK_LEVELS[trial.contentKey] ?? 1;
            const isHighlighted = isCampaignHighlighted && trial.id === 'campaign';
            return (
              <motion.button
                key={trial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => unlocked && handleTrialClick(trial)}
                disabled={!unlocked}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border card-lubok min-h-[140px] transition-all ${
                  isHighlighted
                    ? 'bg-primary/10 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
                    : unlocked
                    ? 'bg-surface border-border hover:border-primary/50 hover:bg-surface/80'
                    : 'bg-surface/40 border-border/30 opacity-50 cursor-not-allowed'
                }`}
              >
                {isHighlighted && <TutorialGlow label={step === 10 ? 'Кампания — сюжетные бои. Побеждай врагов и получай награды!' : 'Продолжи Кампанию — новые враги и награды ждут!'} wide below />}
                <span className="relative z-20 flex flex-col items-center gap-2">
                  <img src={trial.icon} alt={trial.label} className={`w-16 h-16 object-contain ${isHighlighted ? 'animate-bounce' : ''}`} />
                  <span className={`font-kelly text-sm ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>{trial.label}</span>
                  <span className="text-[10px] text-muted-foreground">{trial.description}</span>
                </span>
                {!unlocked && (
                  <span className="absolute top-2 right-2 text-[10px] font-kelly text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30 z-20">
                    🔒 {step >= 39 ? `Ур.${requiredLvl}` : 'Скоро'}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
