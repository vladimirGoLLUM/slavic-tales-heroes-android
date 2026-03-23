import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HYDRA_BOSS } from '@/data/worldBoss';
import { CERBERUS_BOSS } from '@/data/worldBossCerberus';

const BOSSES = [
  {
    id: HYDRA_BOSS.id,
    name: HYDRA_BOSS.name,
    title: HYDRA_BOSS.title,
    icon: HYDRA_BOSS.imageUrl,
    path: '/trials/worldboss/hydra',
    available: true,
  },
  {
    id: CERBERUS_BOSS.id,
    name: CERBERUS_BOSS.name,
    title: CERBERUS_BOSS.title,
    icon: CERBERUS_BOSS.imageUrl,
    path: '/trials/worldboss/cerberus',
    available: true,
  },
];

export default function WorldBossListPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/trials')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_worldboss.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Мировые Боссы</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {BOSSES.map((boss, i) => (
            <motion.button
              key={boss.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => boss.available && navigate(boss.path)}
              disabled={!boss.available}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border card-lubok min-h-[160px] transition-all active:scale-95 ${
                boss.available
                  ? 'bg-surface border-border hover:border-primary/50 hover:bg-surface/80'
                  : 'bg-surface/40 border-border/30 opacity-50 cursor-not-allowed'
              }`}
            >
              <img
                src={boss.icon}
                alt={boss.name}
                className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30"
              />
              <span className="font-kelly text-sm text-foreground">{boss.name}</span>
              <span className="text-[10px] text-muted-foreground">{boss.title}</span>
              {!boss.available && (
                <span className="absolute top-2 right-2 text-lg">🔒</span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
