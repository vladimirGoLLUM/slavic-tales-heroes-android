import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  url: string;
  autoRotate?: boolean;
}

function Model({ url, autoRotate = true }: ModelProps) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  // Auto-center and scale the model
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.5 / maxDim;

  useFrame((_, delta) => {
    if (autoRotate && ref.current) {
      ref.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={ref} scale={scale} position={[-center.x * scale, -center.y * scale + 0.2, -center.z * scale]}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-kelly whitespace-nowrap">Загрузка 3D модели…</p>
      </div>
    </Html>
  );
}

interface GLBModelViewerProps {
  url: string;
  name: string;
  className?: string;
}

export default function GLBModelViewer({ url, name, className = '' }: GLBModelViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border/50 bg-card ${className}`}>
      <div className="aspect-square sm:aspect-[4/3] w-full">
        <Canvas
          camera={{ position: [0, 1.5, 4], fov: 45 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} />
          <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffd700" />

          <Suspense fallback={<LoadingIndicator />}>
            <Model url={url} autoRotate={autoRotate} />
            <ContactShadows position={[0, -1.2, 0]} opacity={0.4} scale={6} blur={2} />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={8}
            maxPolarAngle={Math.PI / 1.8}
            onStart={() => setAutoRotate(false)}
          />
        </Canvas>
      </div>

      {/* Info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent px-4 py-3">
        <h3 className="font-kelly text-lg text-primary">{name}</h3>
        <p className="text-xs text-muted-foreground">
          {autoRotate ? 'Автовращение' : 'Перетаскивайте для вращения'} • Колёсико для зума
        </p>
      </div>

      {/* Rotate toggle */}
      <button
        onClick={() => setAutoRotate(!autoRotate)}
        className="absolute top-3 right-3 bg-background/70 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-kelly text-foreground hover:bg-background/90 transition-colors"
      >
        {autoRotate ? '⏸ Стоп' : '🔄 Вращать'}
      </button>
    </div>
  );
}
