import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface HolographicCardProps {
  imageUrl: string;
  name: string;
  element: string;
  elementColor: string;
}

/**
 * Вариант 4: Голографический эффект
 * Переливающийся голографический эффект поверх карточки героя.
 */
export default function HolographicCard({ imageUrl, name, element, elementColor }: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
    setRotate({
      x: ((y - 50) / 50) * -12,
      y: ((x - 50) / 50) * 12,
    });
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-kelly text-primary">4. Голограмма</h3>
      <div
        ref={cardRef}
        className="relative w-[220px] h-[300px] cursor-pointer select-none"
        style={{ perspective: '600px' }}
        onMouseMove={e => { handleMove(e.clientX, e.clientY); setIsHovered(true); }}
        onTouchMove={e => { handleMove(e.touches[0].clientX, e.touches[0].clientY); setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); setRotate({ x: 0, y: 0 }); }}
        onTouchEnd={() => { setIsHovered(false); setRotate({ x: 0, y: 0 }); }}
      >
        <motion.div
          className="relative w-full h-full rounded-2xl overflow-hidden"
          animate={{
            rotateX: rotate.x,
            rotateY: rotate.y,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: isHovered
              ? `0 20px 60px -10px hsl(${elementColor} / 0.5), 0 0 40px hsl(${elementColor} / 0.2)`
              : `0 10px 30px -10px hsl(${elementColor} / 0.3)`,
          }}
        >
          {/* Dark background */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, hsl(${elementColor} / 0.15), hsl(var(--background)))`,
            }}
          />

          {/* Hero image */}
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top hero-image-filter"
            style={{ zIndex: 1 }}
          />

          {/* Rainbow holographic overlay — use overlay blend so hero stays visible */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 2,
              mixBlendMode: 'overlay',
              background: `
                linear-gradient(
                  ${mousePos.x * 3.6}deg,
                  rgba(255, 0, 0, 0.15) 0%,
                  rgba(255, 154, 0, 0.2) 15%,
                  rgba(208, 222, 33, 0.15) 25%,
                  rgba(0, 255, 128, 0.2) 40%,
                  rgba(0, 200, 255, 0.15) 55%,
                  rgba(100, 100, 255, 0.2) 70%,
                  rgba(180, 0, 255, 0.15) 85%,
                  rgba(255, 0, 100, 0.15) 100%
                )
              `,
              opacity: isHovered ? 1 : 0.4,
              transition: 'opacity 0.3s',
            }}
          />

          {/* Scanline effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 3,
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.03) 2px,
                rgba(255, 255, 255, 0.03) 4px
              )`,
            }}
          />

          {/* Moving light beam */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 4,
              background: isHovered
                ? `linear-gradient(${mousePos.x * 1.8}deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)`
                : `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)`,
              opacity: isHovered ? 1 : 0.3,
              transition: 'opacity 0.3s',
            }}
          />

          {/* Sparkle dot that follows cursor */}
          {isHovered && (
            <motion.div
              className="absolute w-3 h-3 rounded-full pointer-events-none"
              style={{
                zIndex: 5,
                background: `radial-gradient(circle, white, hsl(${elementColor}))`,
                boxShadow: `0 0 15px white, 0 0 30px hsl(${elementColor})`,
                left: `${mousePos.x}%`,
                top: `${mousePos.y}%`,
                transform: 'translate(-50%, -50%)',
                filter: 'blur(1px)',
              }}
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}

          {/* Border glow */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              zIndex: 6,
              border: isHovered
                ? `2px solid hsl(${elementColor} / 0.8)`
                : `2px solid hsl(${elementColor} / 0.4)`,
              boxShadow: isHovered
                ? `inset 0 0 20px hsl(${elementColor} / 0.2), 0 0 15px hsl(${elementColor} / 0.3)`
                : `inset 0 0 10px hsl(${elementColor} / 0.1)`,
              transition: 'all 0.3s',
            }}
          />

          {/* Name */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 text-center"
            style={{
              zIndex: 7,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            }}
          >
            <span className="font-kelly text-sm text-foreground drop-shadow-lg">{name}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
