import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../store/useWorldStore';
import { avatarState } from './avatarState';

/**
 * 第三人稱玩家化身：金探子（Golden Snitch）造型
 * 預留 avatarConfig 介面，未來可擴充自訂角色／捏臉模型
 */
export function PlayerAvatar() {
  const rootRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const stage = useWorldStore((s) => s.stage);
  const interiorSpace = useWorldStore((s) => s.interiorSpace);
  const avatarConfig = useWorldStore((s) => s.avatarConfig);
  const isIdleCinematic = useWorldStore((s) => s.isIdleCinematic);

  const visible =
    isIdleCinematic ||
    interiorSpace !== null ||
    stage === 'free-roam' ||
    stage === 'corridor' ||
    stage === 'black-sun';

  const contextScale =
    interiorSpace !== null ? 0.36 : stage === 'corridor' || stage === 'black-sun' ? 0.68 : 1.0;

  useFrame((state, delta) => {
    if (!rootRef.current || !visible) return;
    const t = state.clock.elapsedTime;

    rootRef.current.position.copy(avatarState.position);
    // 微幅懸浮呼吸感
    rootRef.current.position.y += Math.sin(t * 4.2) * 0.06 * contextScale;
    rootRef.current.scale.setScalar(avatarConfig.scale * contextScale);

    const speed = avatarState.velocity.length();
    const targetTilt = Math.min(0.32, speed * 0.022);
    rootRef.current.rotation.y = avatarState.heading;
    rootRef.current.rotation.x = THREE.MathUtils.lerp(
      rootRef.current.rotation.x,
      targetTilt,
      1 - Math.exp(-delta * 10)
    );

    // 金探子雙翼振翅（移動時加速振翅）
    const flapFreq = 16 + Math.min(20, speed * 1.2);
    const flapAngle = Math.sin(t * flapFreq) * 0.55;
    if (leftWingRef.current) {
      leftWingRef.current.rotation.z = flapAngle + 0.18;
      leftWingRef.current.rotation.y = 0.22;
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.z = -flapAngle - 0.18;
      rightWingRef.current.rotation.y = -0.22;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z = t * 1.4;
    }
  });

  if (!visible) return null;

  return (
    <group ref={rootRef} name="金探子化身">
      {/* 金探子核心球體 */}
      <mesh name="金探子核心">
        {avatarConfig.style === 'crystal-sprite' ? (
          <octahedronGeometry args={[0.45, 0]} />
        ) : (
          <sphereGeometry args={[0.38, 24, 24]} />
        )}
        <meshStandardMaterial
          color={avatarConfig.primaryColor}
          emissive={avatarConfig.primaryColor}
          emissiveIntensity={0.55}
          metalness={0.82}
          roughness={0.18}
        />
      </mesh>

      {/* 球體赤道／子午線金探子刻紋環 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.39, 0.022, 8, 32]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh ref={haloRef}>
        <torusGeometry args={[0.56, 0.018, 8, 32]} />
        <meshBasicMaterial color={avatarConfig.accentColor} transparent opacity={0.55} />
      </mesh>

      {/* 左翼 */}
      <group ref={leftWingRef} position={[-0.36, 0.08, 0]}>
        <mesh position={[-0.55, 0.05, 0]} rotation={[0.15, 0, 0.12]}>
          <boxGeometry args={[1.05, 0.04, 0.34]} />
          <meshStandardMaterial
            color={avatarConfig.accentColor}
            emissive={avatarConfig.accentColor}
            emissiveIntensity={0.45}
            transparent
            opacity={0.86}
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[-0.45, -0.02, -0.14]} rotation={[0.1, 0.18, 0.05]}>
          <boxGeometry args={[0.78, 0.03, 0.18]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#fef08a"
            emissiveIntensity={0.35}
            transparent
            opacity={0.72}
          />
        </mesh>
      </group>

      {/* 右翼 */}
      <group ref={rightWingRef} position={[0.36, 0.08, 0]}>
        <mesh position={[0.55, 0.05, 0]} rotation={[0.15, 0, -0.12]}>
          <boxGeometry args={[1.05, 0.04, 0.34]} />
          <meshStandardMaterial
            color={avatarConfig.accentColor}
            emissive={avatarConfig.accentColor}
            emissiveIntensity={0.45}
            transparent
            opacity={0.86}
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0.45, -0.02, -0.14]} rotation={[0.1, -0.18, -0.05]}>
          <boxGeometry args={[0.78, 0.03, 0.18]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#fef08a"
            emissiveIntensity={0.35}
            transparent
            opacity={0.72}
          />
        </mesh>
      </group>

      {/* 隨身微光 */}
      <pointLight color={avatarConfig.primaryColor} intensity={1.8} distance={9} />
    </group>
  );
}
