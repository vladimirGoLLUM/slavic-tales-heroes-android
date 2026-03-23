import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ParallaxCardProps {
  imageUrl: string;
  name: string;
  element: string;
  elementColor: string; // HSL string like "20 90% 55%"
}

/**
 * Вариант 1: 3D-карточка с параллакс-эффектом
 * Карточка наклоняется за курсором/пальцем, создавая эффект глубины.
 */
export default function ParallaxCard({ imageUrl, name, element, elementColor }: ParallaxCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -30;
    const rotateY = (x - 0.5) * 30;
    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: x * 100, y: y * 100, opacity: 0.35 });
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  };
  const handleLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-kelly text-primary">1. Параллакс-карточка</h3>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseLeave={handleLeave}
        onTouchEnd={handleLeave}
        className="relative w-[220px] h-[300px] cursor-pointer"
        style={{
          perspective: '800px',
        }}
      >
        <motion.div
          animate={{
            rotateX: rotate.x,
            rotateY: rotate.y,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative w-full h-full rounded-2xl overflow-hidden"
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: `0 20px 60px -15px hsl(${elementColor} / 0.4), 0 0 30px hsl(${elementColor} / 0.15)`,
          }}
        >
          {/* Background layer (parallax offset) */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br rounded-2xl"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, hsl(${elementColor} / 0.3), transparent 60%), 
                           linear-gradient(135deg, hsl(${elementColor} / 0.15), hsl(var(--background)) 80%)`,
              transform: `translateZ(-20px) scale(1.1)`,
            }}
          />

          {/* Hero image (mid layer) */}
          <motion.img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top hero-image-filter"
            style={{ transform: 'translateZ(10px)' }}
            animate={{
              x: rotate.y * 0.5,
              y: rotate.x * -0.5,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />

          {/* Particle layer (foreground) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: 'translateZ(30px)' }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: `hsl(${elementColor})`,
                  left: `${15 + Math.random() * 70}%`,
                  top: `${15 + Math.random() * 70}%`,
                  boxShadow: `0 0 6px hsl(${elementColor})`,
                }}
                animate={{
                  y: [0, -15, 0],
                  opacity: [0.3, 0.9, 0.3],
                  scale: [0.8, 1.3, 0.8],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Glare effect */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
              transition: 'background 0.1s',
            }}
          />

          {/* Border frame */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: `2px solid hsl(${elementColor} / 0.5)`,
              boxShadow: `inset 0 0 20px hsl(${elementColor} / 0.1)`,
            }}
          />

          {/* Name plate */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 text-center"
            style={{
              background: 'linear-gradient(transparent, hsl(var(--background) / 0.9))',
              transform: 'translateZ(20px)',
            }}
          >
            <span className="font-kelly text-sm text-foreground drop-shadow-lg">{name}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
