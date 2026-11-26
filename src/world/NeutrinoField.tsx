import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { getGateWorldPosition } from '../data/mandalaData';
import { useWorldStore } from '../store/useWorldStore';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

const PARTICLE_COUNT = 2600;

export function NeutrinoField() {
  const pointsRef = useRef<THREE.Points>(null);
  const redPulseRef = useRef<THREE.Mesh>(null);
  const blackPulseRef = useRef<THREE.Mesh>(null);

  const theme = useWorldStore((s) => s.theme);
  const isLight = theme === 'light';
  const stage = useWorldStore((s) => s.stage);
  const chart = useWorldStore((s) => s.chart);
  const config = useSceneConfigStore((s) => s.config);

  const { positions, baseColors } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);

    const cCyan = new THREE.Color('#66d9ff');
    const cViolet = new THREE.Color('#a78bfa');
    const cGold = new THREE.Color('#f5d07a');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 18 + Math.pow(Math.random(), 0.72) * 110;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.45 + 12;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const pick = Math.random();
      const c = pick < 0.55 ? cCyan : pick < 0.85 ? cViolet : cGold;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, baseColors: col };
  }, []);

  const redGatePos = useMemo(
    () => new THREE.Vector3(...getGateWorldPosition(chart.redSun.gate)),
    [chart.redSun.gate]
  );
  const blackGatePos = useMemo(
    () => new THREE.Vector3(...getGateWorldPosition(chart.blackSun.gate)),
    [chart.blackSun.gate]
  );
  const corePos = useMemo(() => new THREE.Vector3(0, 1.4, 0), []);

  const redCurve = useMemo(() => {
    const mid = redGatePos.clone().lerp(corePos, 0.5);
    mid.y += config.neutrinoArcHeight;
    return new THREE.QuadraticBezierCurve3(redGatePos, mid, corePos);
  }, [redGatePos, corePos, config.neutrinoArcHeight]);

  const blackCurve = useMemo(() => {
    const mid = corePos.clone().lerp(blackGatePos, 0.5);
    mid.y += config.neutrinoArcHeight;
    return new THREE.QuadraticBezierCurve3(corePos, mid, blackGatePos);
  }, [blackGatePos, corePos, config.neutrinoArcHeight]);

  const redLinePoints = useMemo(
    () => redCurve.getPoints(56).map((p) => [p.x, p.y, p.z] as [number, number, number]),
    [redCurve]
  );
  const blackLinePoints = useMemo(
    () => blackCurve.getPoints(56).map((p) => [p.x, p.y, p.z] as [number, number, number]),
    [blackCurve]
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      const rotSpeed = stage === 'bodygraph' ? config.neutrinoRotSpeed * 2.5 : config.neutrinoRotSpeed;
      pointsRef.current.rotation.y += delta * rotSpeed;
    }

    if (redPulseRef.current) {
      const u = (t * 0.24) % 1;
      redPulseRef.current.position.copy(redCurve.getPoint(u));
      redPulseRef.current.scale.setScalar(config.neutrinoPulseScale + Math.sin(t * 7) * 0.14);
    }

    if (blackPulseRef.current) {
      const u = (t * 0.24 + 0.5) % 1;
      blackPulseRef.current.position.copy(blackCurve.getPoint(u));
      blackPulseRef.current.scale.setScalar(config.neutrinoPulseScale + Math.cos(t * 7) * 0.14);
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={baseColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={config.neutrinoPointSize}
          color={isLight ? '#64748b' : '#ffffff'}
          vertexColors={!isLight}
          transparent
          opacity={isLight ? config.neutrinoOpacity : Math.min(1, config.neutrinoOpacity * 1.9)}
          blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <Line
        points={redLinePoints}
        color="#ff5544"
        lineWidth={stage === 'red-sun' || stage === 'corridor' ? 2.6 : 1.3}
        transparent
        opacity={stage === 'red-sun' || stage === 'corridor' ? 0.88 : 0.42}
      />
      <mesh ref={redPulseRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff7366" transparent opacity={0.95} />
      </mesh>

      <Line
        points={blackLinePoints}
        color="#f5d07a"
        lineWidth={stage === 'black-sun' || stage === 'bodygraph' ? 2.6 : 1.3}
        transparent
        opacity={stage === 'black-sun' || stage === 'bodygraph' ? 0.88 : 0.42}
      />
      <mesh ref={blackPulseRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}
