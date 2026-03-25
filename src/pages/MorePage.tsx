import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MORE_ITEMS = [
  { path: '/daily-quests', label: 'Ежедневные задания', icon: '📋', description: 'Награды за ежедневную активность', isEmoji: true },
  { path: '/achievements', label: 'Достижения', icon: '/ui/icon_achievements.png', description: 'Свитки Славы' },
  { path: '/settings', label: 'Настройки', icon: '/ui/icon_settings.png', description: 'Управление аккаунтом' },
  { path: '/heroes', label: 'Герои', icon: '/ui/icon_heroes.png', description: 'Все герои игры' },
  { path: '/artifacts', label: 'Артефакты', icon: '/ui/icon_artifacts.png', description: 'Справочник артефактов' },
  { path: '/calculator', label: 'Калькулятор', icon: '/ui/icon_calculator.png', description: 'Расчёт характеристик' },
  { path: '/compare', label: 'Сравнение', icon: '/ui/icon_compare.png', description: 'Сравни героев' },
  { path: '/hero-3d-showcase', label: '3D Герои', icon: '/ui/icon_heroes.png', description: '3D-отображение героев' },
  { path: '/relics', label: 'Реликвии Бездны', icon: '/relics/seal_overlord.png', description: 'Коллекция реликвий' },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="font-kelly text-2xl text-foreground">Ещё</h1>
        </div>

        <div className="flex flex-col gap-2">
          {MORE_ITEMS.map((item, i) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 bg-surface/60 hover:bg-surface/80 border border-border/50 hover:border-primary/40 rounded-xl px-4 py-3 card-lubok transition-all min-h-[56px]"
            >
              {'isEmoji' in item && item.isEmoji ? (
                <span className="text-3xl w-10 h-10 flex items-center justify-center">{item.icon}</span>
              ) : (
                <img src={item.icon} alt={item.label} className="w-10 h-10 object-contain" />
              )}
              <div className="flex flex-col items-start">
                <span className="font-kelly text-sm text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
              <span className="ml-auto text-muted-foreground/50">›</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
