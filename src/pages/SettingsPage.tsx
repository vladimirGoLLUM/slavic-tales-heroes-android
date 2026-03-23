import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { resetProgress, saving, player, setUsername } = useGame();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player.username);

  const handleReset = async () => {
    await resetProgress();
    setConfirmReset(false);
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">←</button>
          <img src="/ui/icon_settings.png" alt="" className="w-8 h-8 object-contain" />
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow">
            Настройки
          </motion.h1>
        </div>

        <div className="space-y-4">
          {/* Account info */}
          <div className="bg-surface/50 backdrop-blur-sm rounded-xl p-4 card-lubok border border-border/30">
            <h2 className="font-kelly text-sm text-muted-foreground mb-2">Аккаунт</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground font-mono text-xs">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Имя</span>
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="bg-background/60 border border-border rounded-lg px-2 py-1 text-xs text-foreground font-kelly w-28 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      maxLength={20}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        const trimmed = nameInput.trim();
                        if (trimmed.length < 1) { toast.error('Имя не может быть пустым'); return; }
                        setUsername(trimmed);
                        setEditingName(false);
                        toast.success('Имя изменено!');
                      }}
                      className="text-xs font-kelly text-primary hover:text-primary/80 min-h-[32px] px-2"
                    >✓</button>
                    <button
                      onClick={() => { setNameInput(player.username); setEditingName(false); }}
                      className="text-xs font-kelly text-muted-foreground hover:text-foreground min-h-[32px] px-1"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setNameInput(player.username); setEditingName(true); }}
                    className="flex items-center gap-1.5 text-foreground font-kelly hover:text-primary transition-colors"
                  >
                    {player.username} <span className="text-xs text-muted-foreground">✏️</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Save status */}
          <div className="bg-surface/50 backdrop-blur-sm rounded-xl p-4 card-lubok border border-border/30">
            <h2 className="font-kelly text-sm text-muted-foreground mb-2">Сохранение</h2>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-muted-foreground">{saving ? 'Сохранение...' : 'Прогресс сохранён'}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Прогресс автоматически сохраняется в облако
            </p>
          </div>

          {/* Game stats */}
          <div className="bg-surface/50 backdrop-blur-sm rounded-xl p-4 card-lubok border border-border/30">
            <h2 className="font-kelly text-sm text-muted-foreground mb-2">Статистика</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Герои</span>
                <span className="text-foreground font-mono">{player.champions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Души</span>
                <span className="text-foreground font-mono">{player.souls}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Руны</span>
                <span className="text-foreground font-mono">{player.runes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Артефакты</span>
                <span className="text-foreground font-mono">{player.artifacts.length}</span>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-kelly text-sm py-3 rounded-xl transition-all min-h-[48px]"
          >
            Выйти из аккаунта
          </button>

          {/* Reset progress */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <h2 className="font-kelly text-sm text-destructive mb-2">Опасная зона</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Это действие удалит всех героев, артефакты, прогресс кампании и ресурсы. Отменить невозможно.
            </p>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full bg-destructive/20 hover:bg-destructive/30 text-destructive font-kelly text-sm py-2.5 rounded-lg transition-all border border-destructive/40 min-h-[44px]"
              >
                🗑️ Стереть персонажа
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-destructive font-kelly text-center">Ты уверен? Это нельзя отменить!</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-kelly text-sm py-2.5 rounded-lg transition-all min-h-[44px]"
                  >
                    Да, стереть всё
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-kelly text-sm py-2.5 rounded-lg transition-all min-h-[44px]"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
