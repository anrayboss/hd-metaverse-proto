import { Canvas } from '@react-three/fiber';
import { NeutrinoField } from './NeutrinoField';
import { MandalaRing3D } from './MandalaRing3D';
import { PhysiologyCorridors3D } from './PhysiologyCorridors3D';
import { BodyGraph3D } from './BodyGraph3D';
import { CameraRig } from './CameraRig';
import { useWorldStore } from '../store/useWorldStore';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

export function UniverseScene() {
  const clearSelection = useWorldStore((s) => s.clearSelection);
  const theme = useWorldStore((s) => s.theme);
  const config = useSceneConfigStore((s) => s.config);
  const isLight = theme === 'light';
  const bg = isLight ? '#f4f7fb' : '#05070e';

  return (
    <div className="canvas-wrapper">
      <Canvas
        camera={{ position: [0, config.birdEyeHeight, 0.1], fov: 48, near: 0.2, far: 620 }}
        dpr={[1, 2]}
        onPointerMissed={() => clearSelection()}
      >
        <color attach="background" args={[bg]} />
        <fogExp2 attach="fog" args={[bg, isLight ? config.fogDensity : config.fogDensity * 2.5]} />

        <ambientLight intensity={isLight ? config.ambientIntensity : config.ambientIntensity * 0.45} />
        <directionalLight
          position={[45, 130, 55]}
          intensity={isLight ? 1.25 : 1.05}
          color={isLight ? '#ffffff' : '#dbeafe'}
        />
        <pointLight
          position={[0, 14, 0]}
          intensity={isLight ? 2.5 : 6}
          distance={58}
          color="#fde68a"
        />

        <NeutrinoField />
        <MandalaRing3D />
        <PhysiologyCorridors3D />
        <BodyGraph3D />
        <CameraRig />
      </Canvas>
    </div>
  );
}
