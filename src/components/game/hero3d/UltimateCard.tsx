import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface UltimateCardProps {
  imageUrl: string;
  name: string;
  element: string;
  elementColor: string; // HSL e.g. "30 50% 40%"
}

/**
 * Комбинированная карточка: Параллакс + Вращение + Голограмма
 */
export default function UltimateCard({ imageUrl, name, element, elementColor }: UltimateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  // Drag rotation state (from prism)
  const [dragRotY, setDragRotY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [autoSpin, setAutoSpin] = useState(true);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card || isDragging) return;
    const rect = card.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    // Parallax tilt
    setRotate({ x: (ny - 0.5) * -25, y: (nx - 0.5) * 25 });
    // Holo position
    setMousePos({ x: nx * 100, y: ny * 100 });
    // Glare
    setGlare({ x: nx * 100, y: ny * 100, opacity: 0.3 });
  }, [isDragging]);

  const handleDragStart = (x: number) => {
    setIsDragging(true);
    setDragStartX(x);
    setAutoSpin(false);
    if (autoTimer.current) clearTimeout(autoTimer.current);
  };

  const handleDragMove = (x: number) => {
    if (!isDragging) return;
    const delta = (x - dragStartX) * 0.4;
    setDragRotY(prev => prev + delta);
    setDragStartX(x);
    // Clear tilt while dragging
    setRotate({ x: 0, y: 0 });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    autoTimer.current = setTimeout(() => setAutoSpin(true), 4000);
  };

  const handleEnter = () => setIsHovered(true);
  const handleLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  // Combined rotation: parallax tilt + drag Y + optional auto-spin
  const totalRotateY = rotate.y + dragRotY;

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-kelly text-primary">✦ Объединённая карточка</h3>
      <div
        ref={cardRef}
        className="relative w-[240px] h-[320px] cursor-pointer select-none"
        style={{ perspective: '800px' }}
        onMouseMove={e => { handleMove(e.clientX, e.clientY); handleEnter(); }}
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => { handleLeave(); handleDragEnd(); }}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => {
          handleDragMove(e.touches[0].clientX);
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
          handleEnter();
        }}
        onTouchEnd={() => { handleLeave(); handleDragEnd(); }}
      >
        {/* Outer glow pulse */}
        <motion.div
          className="absolute -inset-2 rounded-3xl pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? [
                  `0 0 25px hsl(${elementColor} / 0.3), 0 0 50px hsl(${elementColor} / 0.15)`,
                  `0 0 40px hsl(${elementColor} / 0.5), 0 0 70px hsl(${elementColor} / 0.25)`,
                  `0 0 25px hsl(${elementColor} / 0.3), 0 0 50px hsl(${elementColor} / 0.15)`,
                ]
              : `0 0 15px hsl(${elementColor} / 0.15)`,
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />

        <motion.div
          className="relative w-full h-full rounded-2xl overflow-hidden"
          animate={{
            rotateX: rotate.x,
            rotateY: autoSpin && !isHovered ? [dragRotY, dragRotY + 8, dragRotY] : totalRotateY,
          }}
          transition={
            autoSpin && !isHovered
              ? { duration: 6, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 250, damping: 20 }
          }
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: isHovered
              ? `0 25px 60px -10px hsl(${elementColor} / 0.5)`
              : `0 10px 30px -10px hsl(${elementColor} / 0.3)`,
          }}
        >
          {/* Background parallax layer */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, hsl(${elementColor} / 0.3), transparent 60%), 
                           linear-gradient(135deg, hsl(${elementColor} / 0.15), hsl(var(--background)) 80%)`,
              transform: 'translateZ(-20px) scale(1.1)',
            }}
          />

          {/* Hero image (mid layer with parallax offset) */}
          <motion.img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top hero-image-filter"
            style={{ transform: 'translateZ(10px)', zIndex: 1 }}
            animate={{
              x: rotate.y * 0.4,
              y: rotate.x * -0.4,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />

          {/* Floating particles (foreground parallax) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: 'translateZ(30px)', zIndex: 2 }}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: `hsl(${elementColor})`,
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  boxShadow: `0 0 6px hsl(${elementColor})`,
                }}
                animate={{
                  y: [0, -12, 0],
                  opacity: [0.2, 0.8, 0.2],
                  scale: [0.7, 1.3, 0.7],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Holographic rainbow overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 3,
              mixBlendMode: 'overlay',
              background: `linear-gradient(
                ${mousePos.x * 3.6}deg,
                rgba(255, 0, 0, 0.12) 0%,
                rgba(255, 154, 0, 0.18) 15%,
                rgba(208, 222, 33, 0.12) 25%,
                rgba(0, 255, 128, 0.18) 40%,
                rgba(0, 200, 255, 0.12) 55%,
                rgba(100, 100, 255, 0.18) 70%,
                rgba(180, 0, 255, 0.12) 85%,
                rgba(255, 0, 100, 0.12) 100%
              )`,
              opacity: isHovered ? 0.9 : 0.25,
              transition: 'opacity 0.3s',
            }}
          />

          {/* Glare spotlight */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              zIndex: 4,
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 55%)`,
              transition: 'background 0.1s',
            }}
          />

          {/* Moving light beam */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 4,
              background: isHovered
                ? `linear-gradient(${mousePos.x * 1.8}deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)`
                : 'none',
            }}
          />

          {/* Sparkle follower */}
          {isHovered && (
            <motion.div
              className="absolute w-2.5 h-2.5 rounded-full pointer-events-none"
              style={{
                zIndex: 5,
                background: `radial-gradient(circle, white, hsl(${elementColor}))`,
                boxShadow: `0 0 12px white, 0 0 24px hsl(${elementColor})`,
                left: `${mousePos.x}%`,
                top: `${mousePos.y}%`,
                transform: 'translate(-50%, -50%)',
                filter: 'blur(0.5px)',
              }}
              animate={{ scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}

          {/* Border glow */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              zIndex: 6,
              border: `2px solid hsl(${elementColor} / ${isHovered ? 0.7 : 0.4})`,
              boxShadow: `inset 0 0 25px hsl(${elementColor} / ${isHovered ? 0.2 : 0.1})`,
              transition: 'all 0.3s',
            }}
          />

          {/* Name plate */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 text-center"
            style={{
              zIndex: 7,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
              transform: 'translateZ(20px)',
            }}
          >
            <span className="font-kelly text-sm text-foreground drop-shadow-lg">{name}</span>
          </div>
        </motion.div>
      </div>
      <p className="text-[10px] text-muted-foreground">Наведите или перетащите</p>
    </div>
  );
}
