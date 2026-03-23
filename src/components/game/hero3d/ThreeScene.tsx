import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ThreeSceneProps {
  imageUrl: string;
  name: string;
  element: string;
  elementColor: string;
}

/**
 * Вариант 3: Магическая карточка с частицами стихии
 * Герой парит в потоке стихийных частиц с пульсирующим свечением.
 */
export default function ThreeScene({ imageUrl, name, element, elementColor }: ThreeSceneProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((clientY - rect.top) / rect.height - 0.5) * -20;
    setRotate({ x: y, y: x });
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-kelly text-primary">3. Магическая аура</h3>
      <div
        ref={cardRef}
        className="relative w-[220px] h-[300px] cursor-pointer select-none"
        style={{ perspective: '700px' }}
        onMouseMove={e => { handleMove(e.clientX, e.clientY); setIsHovered(true); }}
        onTouchMove={e => { handleMove(e.touches[0].clientX, e.touches[0].clientY); setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); setRotate({ x: 0, y: 0 }); }}
        onTouchEnd={() => { setIsHovered(false); setRotate({ x: 0, y: 0 }); }}
      >
        {/* Outer glow pulse */}
        <motion.div
          className="absolute -inset-3 rounded-3xl pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? [
                  `0 0 30px hsl(${elementColor} / 0.4), 0 0 60px hsl(${elementColor} / 0.2)`,
                  `0 0 50px hsl(${elementColor} / 0.6), 0 0 80px hsl(${elementColor} / 0.3)`,
                  `0 0 30px hsl(${elementColor} / 0.4), 0 0 60px hsl(${elementColor} / 0.2)`,
                ]
              : `0 0 20px hsl(${elementColor} / 0.2)`,
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <motion.div
          className="relative w-full h-full rounded-2xl overflow-hidden"
          animate={{ rotateX: rotate.x, rotateY: rotate.y }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Dark elemental bg */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, hsl(${elementColor} / 0.25), hsl(var(--background)) 70%)`,
            }}
          />

          {/* Hero image */}
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top hero-image-filter"
          />

          {/* Rising particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 2 + Math.random() * 4,
                  height: 2 + Math.random() * 4,
                  left: `${5 + Math.random() * 90}%`,
                  bottom: '-5%',
                  background: `hsl(${elementColor})`,
                  boxShadow: `0 0 8px hsl(${elementColor}), 0 0 16px hsl(${elementColor} / 0.5)`,
                }}
                animate={{
                  y: [0, -(320 + Math.random() * 100)],
                  x: [0, (Math.random() - 0.5) * 40],
                  opacity: [0, 0.9, 0.9, 0],
                  scale: [0.5, 1, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Elemental energy waves */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 80%, hsl(${elementColor} / 0.3), transparent 50%)`,
            }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Border glow */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: `2px solid hsl(${elementColor} / 0.5)`,
              boxShadow: `inset 0 0 30px hsl(${elementColor} / 0.15)`,
            }}
          />

          {/* Name */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-center bg-gradient-to-t from-black/80 to-transparent">
            <span className="font-kelly text-sm text-foreground drop-shadow-lg">{name}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
