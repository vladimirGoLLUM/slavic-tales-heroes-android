import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { calculateUnitPower } from '@/data/campaignStages';
import { ELEMENT_ICONS } from '@/data/gameData';

interface SquadPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (squadId: number) => void;
  title?: string;
}

export default function SquadPickerModal({ open, onClose, onConfirm, title = 'Выбери отряд' }: SquadPickerModalProps) {
  const { player, getFullStats } = useGame();
  const [selected, setSelected] = useState(player.activeSquadId);

  const squadsData = useMemo(() => {
    return player.squads.map(sq => {
      const members = sq.members
        .map(id => player.champions.find(c => c.id === id))
        .filter(Boolean);
      const power = members.reduce((sum, pc) => {
        if (!pc) return sum;
        const stats = getFullStats(pc);
        return sum + calculateUnitPower(stats);
      }, 0);
      return { ...sq, members, power };
    });
  }, [player.squads, player.champions, getFullStats]);

  if (!open) return null;

  const selectedSquad = squadsData.find(s => s.id === selected);
  const hasMembers = selectedSquad && selectedSquad.members.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-surface rounded-2xl border border-border card-lubok p-4 w-full max-w-sm max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-kelly text-lg text-foreground">⚔️ {title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>

          <div className="space-y-2 mb-4">
            {squadsData.map(sq => (
              <motion.button
                key={sq.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(sq.id)}
                className={`w-full rounded-xl p-3 border transition-all text-left ${
                  selected === sq.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border/40 bg-background/50 hover:border-border'
                } ${sq.members.length === 0 ? 'opacity-40' : ''}`}
                disabled={sq.members.length === 0}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-kelly text-sm text-foreground">{sq.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">⚡ {sq.power}</span>
                </div>
                <div className="flex gap-1.5">
                  {sq.members.length > 0 ? sq.members.map(pc => pc && (
                    <div key={pc.id} className="relative">
                      <img
                        src={pc.champion.imageUrl}
                        alt={pc.champion.name}
                        className="w-10 h-10 rounded-lg object-cover hero-image-filter border border-border/30"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px]">
                        {ELEMENT_ICONS[pc.champion.element]}
                      </span>
                    </div>
                  )) : (
                    <span className="text-xs text-muted-foreground">Пусто</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (hasMembers) onConfirm(selected);
            }}
            disabled={!hasMembers}
            className={`w-full font-kelly text-lg py-3 rounded-xl transition-all min-h-[48px] card-lubok ${
              hasMembers
                ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
            }`}
          >
            ⚔️ Атаковать!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
