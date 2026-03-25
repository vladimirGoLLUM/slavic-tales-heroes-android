import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { CHAMPIONS } from '@/data/gameData';
import { toast } from 'sonner';

export default function AvatarPicker() {
  const { player, avatarUrl, setAvatarUrl } = useGame();
  const [picking, setPicking] = useState(false);

  // Get unique hero images from owned champions
  const ownedHeroImages = Array.from(
    new Map(
      player.champions.map(pc => [pc.champion.id, { id: pc.champion.id, name: pc.champion.name, imageUrl: pc.champion.imageUrl }])
    ).values()
  );

  const currentAvatar = avatarUrl || ownedHeroImages[0]?.imageUrl || null;

  const handleSelect = (imageUrl: string) => {
    setAvatarUrl(imageUrl);
    setPicking(false);
    toast.success('Аватар изменён!');
  };

  return (
    <div className="bg-surface/50 backdrop-blur-sm rounded-xl p-4 card-lubok border border-border/30">
      <h2 className="font-kelly text-sm text-muted-foreground mb-3">Аватар</h2>
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-16 h-16 rounded-xl border-2 border-primary/40 overflow-hidden bg-background/60 flex-shrink-0">
          {currentAvatar ? (
            <img src={currentAvatar} alt="Аватар" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">👤</div>
          )}
        </div>
        <div className="flex-1">
          <button
            onClick={() => setPicking(!picking)}
            className="text-xs font-kelly text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all border border-primary/20 min-h-[32px]"
          >
            {picking ? '✕ Закрыть' : '✏️ Сменить аватар'}
          </button>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Виден другим игрокам в Колизее и рейтингах
          </p>
        </div>
      </div>

      {picking && (
        <div className="mt-3 pt-3 border-t border-border/20">
          <p className="text-xs text-muted-foreground mb-2 font-kelly">Выбери героя как аватар:</p>
          {ownedHeroImages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Нет доступных героев. Призови героя!</p>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {ownedHeroImages.map(hero => (
                <button
                  key={hero.id}
                  onClick={() => handleSelect(hero.imageUrl)}
                  className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    currentAvatar === hero.imageUrl
                      ? 'border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
                      : 'border-border/30 hover:border-primary/50'
                  }`}
                  title={hero.name}
                >
                  <img src={hero.imageUrl} alt={hero.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
