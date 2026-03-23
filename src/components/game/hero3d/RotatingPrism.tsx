import { useState } from 'react';
import { motion } from 'framer-motion';

interface RotatingPrismProps {
  imageUrl: string;
  name: string;
  element: string;
  elementColor: string;
}

/**
 * Вариант 2: Вращающийся 3D-куб/призма
 * Портрет героя на гранях куба, вращаемого свайпом/драгом.
 */
export default function RotatingPrism({ imageUrl, name, element, elementColor }: RotatingPrismProps) {
  const [rotY, setRotY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  const handleStart = (x: number) => {
    setIsDragging(true);
    setStartX(x);
    setAutoRotate(false);
  };
  const handleMove = (x: number) => {
    if (!isDragging) return;
    const delta = (x - startX) * 0.5;
    setRotY(prev => prev + delta);
    setStartX(x);
  };
  const handleEnd = () => {
    setIsDragging(false);
    setTimeout(() => setAutoRotate(true), 3000);
  };

  const faceSize = 200;
  const halfSize = faceSize / 2;

  const faces = [
    { rY: 0, label: 'Фронт' },
    { rY: 90, label: 'Правая' },
    { rY: 180, label: 'Тыл' },
    { rY: 270, label: 'Левая' },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-kelly text-primary">2. 3D-призма</h3>
      <div
        className="relative cursor-grab active:cursor-grabbing select-none"
        style={{
          width: faceSize,
          height: 280,
          perspective: '800px',
        }}
        onMouseDown={e => handleStart(e.clientX)}
        onMouseMove={e => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={e => handleStart(e.touches[0].clientX)}
        onTouchMove={e => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <motion.div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
          }}
          animate={{
            rotateY: autoRotate ? [rotY, rotY + 360] : rotY,
          }}
          transition={autoRotate ? {
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          } : {
            type: 'spring',
            stiffness: 100,
            damping: 20,
          }}
        >
          {faces.map((face, i) => (
            <div
              key={i}
              className="absolute top-0 left-0 w-full h-full rounded-xl overflow-hidden"
              style={{
                transform: `rotateY(${face.rY}deg) translateZ(${halfSize}px)`,
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Each face shows the hero */}
              <div
                className="w-full h-full relative"
                style={{
                  background: `linear-gradient(135deg, hsl(${elementColor} / 0.2), hsl(var(--background)))`,
                }}
              >
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover object-top hero-image-filter"
                  style={{
                    filter: i === 2 ? 'brightness(0.4) contrast(1.2)' : i === 1 || i === 3 ? 'brightness(0.7)' : 'none',
                  }}
                />
                {/* Element glow edge */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 30px hsl(${elementColor} / 0.3)`,
                    border: `1px solid hsl(${elementColor} / 0.4)`,
                  }}
                />
                {/* Name at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-2 text-center bg-gradient-to-t from-black/80 to-transparent">
                  <span className="font-kelly text-xs text-foreground">{name}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Top cap */}
          <div
            className="absolute top-0 left-0 rounded-lg"
            style={{
              width: faceSize,
              height: faceSize,
              transform: `rotateX(90deg) translateZ(0px)`,
              background: `radial-gradient(circle, hsl(${elementColor} / 0.3), hsl(${elementColor} / 0.05))`,
              backfaceVisibility: 'hidden',
            }}
          />
        </motion.div>
      </div>
      <p className="text-[10px] text-muted-foreground">Перетащите для вращения</p>
    </div>
  );
}
