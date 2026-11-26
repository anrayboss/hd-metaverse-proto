import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../store/useWorldStore';
import { avatarState } from './avatarState';

/**
 * 第三人稱玩家化身（微中子光靈）
 * 預留 avatarConfig 介面，未來可無痛替換為自訂角色／捏臉模型
 */
export function PlayerAvatar() {
  const rootRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  const stage = useWorldStore((s) => s.stage);
  const interiorSpace = useWorldStore((s) => s.interiorSpace);
  const avatarConfig = useWorldStore((s) => s.avatarConfig);

  const visible =
    interiorSpace !== null ||
    stage === 'free-roam' ||
    stage === 'corridor' ||
    stage === 'black-sun';

  // 在人體圖內部自動縮小比例，讓狹窄中心／通道內視線不被擋住
  const contextScale = interiorSpace !== null ? 0.34 : stage === 'corridor' || stage === 'black-sun' ? 0.65 : 1.0;

  useFrame((state, delta) => {
    if (!rootRef.current || !visible) return;
    const t = state.clock.elapsedTime;

    rootRef.current.position.copy(avatarState.position);
    rootRef.current.scale.setScalar(avatarConfig.scale * contextScale);

    // 依移動方向平滑轉向並帶一點速度前傾
    const speed = avatarState.velocity.length();
    const targetTilt = Math.min(0.28, speed * 0.02);
    rootRef.current.rotation.y = avatarState.heading;
    rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetTilt, 1 - Math.exp(-delta * 10));

    if (innerRingRef.current) {
      innerRingRef.current.rotation.x = t * 2.1;
      innerRingRef.current.rotation.y = t * 1.4;
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -t * 1.3;
      outerRingRef.current.rotation.x = Math.sin(t * 1.2) * 0.45;
    }
  });

  if (!visible) return null;

  return (
    <group ref={rootRef}>
      {/* 核心發光體（未來可依 avatarConfig.style 切換為自訂 GLB / 捏臉角色） */}
      <mesh>
        {avatarConfig.style === 'crystal-sprite' ? (
          <octahedronGeometry args={[0.42, 0]} />
        ) : (
          <sphereGeometry args={[0.36, 20, 20]} />
        )}
        <meshStandardMaterial
          color={avatarConfig.primaryColor}
          emissive={avatarConfig.primaryColor}
          emissiveIntensity={1.4}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>

      {/* 內層陀螺光環 */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[0.56, 0.03, 10, 32]} />
        <meshBasicMaterial color={avatarConfig.accentColor} transparent opacity={0.85} />
      </mesh>

      {/* 外層能量光環 */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[0.78, 0.022, 10, 36]} />
        <meshBasicMaterial color={avatarConfig.primaryColor} transparent opacity={0.48} />
      </mesh>

      {/* 隨身微光（照亮鄰近走廊或中心表面） */}
      <pointLight color={avatarConfig.primaryColor} intensity={1.8} distance={9} />
    </group>
  );
}
