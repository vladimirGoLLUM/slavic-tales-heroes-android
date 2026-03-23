import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import berendeyImg from '@/assets/heroes/berendey.png';
import chernobogImg from '@/assets/heroes/chernobog.png';
import morskayaImg from '@/assets/heroes/morskaya-tsaritsa.png';
import svarozhichImg from '@/assets/heroes/svarozhich.png';
import gorinyaImg from '@/assets/heroes/gorynya.png';
import ParallaxCard from '@/components/game/hero3d/ParallaxCard';
import RotatingPrism from '@/components/game/hero3d/RotatingPrism';
import ThreeScene from '@/components/game/hero3d/ThreeScene';
import HolographicCard from '@/components/game/hero3d/HolographicCard';
import UltimateCard from '@/components/game/hero3d/UltimateCard';
import GLBModelViewer from '@/components/game/hero3d/GLBModelViewer';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BERENDEY_GLB = `${SUPABASE_URL}/storage/v1/object/public/hero-models/berendey.glb`;

export default function Hero3DShowcasePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8 relative">
      <div className="fixed inset-0 z-0 bg-background" />
      <div className="relative z-10 px-3 sm:px-4 pt-4 sm:pt-8 max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground text-sm font-kelly mb-4 flex items-center gap-1"
        >
          ← Стан
        </button>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow text-center mb-2"
        >
          ✨ 3D-Отображение Героев
        </motion.h1>
        <p className="text-center text-muted-foreground text-sm mb-8">
          3D модели • Карточки с эффектами
        </p>

        {/* 3D GLB Model Viewer — featured */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10 max-w-2xl mx-auto"
        >
          <GLBModelViewer
            url={BERENDEY_GLB}
            name="Берендей"
            className="shadow-[0_0_40px_hsl(140_70%_40%/0.2)]"
          />
        </motion.div>

        {/* Combined card */}
        <div className="flex justify-center mb-10">
          <UltimateCard
            imageUrl={gorinyaImg}
            name="Горыня"
            element="Камень"
            elementColor="30 50% 40%"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
          <ParallaxCard
            imageUrl={berendeyImg}
            name="Берендей"
            element="Лес"
            elementColor="140 70% 40%"
          />

          <RotatingPrism
            imageUrl={chernobogImg}
            name="Чернобог"
            element="Тень"
            elementColor="270 60% 45%"
          />

          <ThreeScene
            imageUrl={morskayaImg}
            name="Морская Царица"
            element="Вода"
            elementColor="210 80% 50%"
          />

          <HolographicCard
            imageUrl={svarozhichImg}
            name="Сварожич"
            element="Огонь"
            elementColor="15 90% 55%"
          />
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground mb-4">
            Наведите мышь или проведите пальцем по карточкам для взаимодействия
          </p>
        </div>
      </div>
    </div>
  );
}