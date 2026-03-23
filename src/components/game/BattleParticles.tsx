import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/** Floating ember/spark particles for battle background */
export default function BattleParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 5,
    opacity: 0.2 + Math.random() * 0.5,
    type: Math.random() > 0.6 ? 'ember' : 'spark',
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${
            p.type === 'ember'
              ? 'bg-gradient-to-t from-orange-500 to-yellow-300'
              : 'bg-gradient-to-t from-primary/60 to-primary/20'
          }`}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
          }}
          initial={{ y: '100vh', opacity: 0 }}
          animate={{
            y: ['-10vh'],
            opacity: [0, p.opacity, p.opacity, 0],
            x: [0, (Math.random() - 0.5) * 60],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
      {/* Ambient fog layer */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/40 to-transparent" />
    </div>
  );
}
