import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const TRIALS = [
  { id: 'campaign', label: 'Кампания', icon: '/ui/icon_campaign.png', path: '/campaign', available: true, description: 'Сюжетные сражения' },
  { id: 'temples', label: 'Храмы', icon: '/ui/icon_temples.png', path: '/temples', available: true, description: 'Боссы элементов' },
  { id: 'arena', label: 'Колизей Богов', icon: '/ui/icon_arena.png', path: '/trials/arena', available: true, description: 'PvP бои' },
  { id: 'worldboss', label: 'Мировые Боссы', icon: '/ui/icon_worldboss.png', path: '/trials/worldboss', available: true, description: 'Гидра — нанеси максимум урона' },
  { id: 'dungeon', label: 'Подземелья', icon: '/ui/icon_dungeon.png', path: '/dungeon', available: false, description: 'Случайные этажи' },
  { id: 'tower', label: 'Башня', icon: '/ui/icon_tower.png', path: '/tower', available: false, description: 'Бесконечное восхождение' },
];

export default function TrialsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_trials.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Испытания</h1>
        </div>

        {/* Trials grid */}
        <div className="grid grid-cols-2 gap-3">
          {TRIALS.map((trial, i) => (
            <motion.button
              key={trial.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => trial.available && navigate(trial.path)}
              disabled={!trial.available}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border card-lubok min-h-[140px] transition-all ${
                trial.available
                  ? 'bg-surface border-border hover:border-primary/50 hover:bg-surface/80'
                  : 'bg-surface/40 border-border/30 opacity-50 cursor-not-allowed'
              }`}
            >
              <img src={trial.icon} alt={trial.label} className="w-16 h-16 object-contain" />
              <span className="font-kelly text-sm text-foreground">{trial.label}</span>
              <span className="text-[10px] text-muted-foreground">{trial.description}</span>
              {!trial.available && (
                <span className="absolute top-2 right-2 text-lg">🔒</span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
