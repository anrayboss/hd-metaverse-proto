import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

interface HoveredBox {
  name: string;
  center: [number, number, number];
  size: [number, number, number];
  topY: number;
}

export function RulerOverlay() {
  const showRuler = useSceneConfigStore((s) => s.showRuler);
  const { camera, gl, scene } = useThree();
  const [hovered, setHovered] = useState<HoveredBox | null>(null);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const box = useMemo(() => new THREE.Box3(), []);
  const sizeVec = useMemo(() => new THREE.Vector3(), []);
  const centerVec = useMemo(() => new THREE.Vector3(), []);
  const rulerGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!showRuler) {
      setHovered(null);
      return;
    }

    const dom = gl.domElement;
    const onPointerMove = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let found: THREE.Object3D | null = null;
      for (const hit of intersects) {
        const obj = hit.object;
        // 跳過尺規本身、粒子點雲、線條與完全透明碰撞盒
        if (rulerGroupRef.current && (obj === rulerGroupRef.current || rulerGroupRef.current.children.includes(obj))) {
          continue;
        }
        if (obj.userData?.ignoreRuler) continue;
        if (obj instanceof THREE.Points || obj instanceof THREE.Line) continue;
        if (!(obj instanceof THREE.Mesh)) continue;
        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (mat && 'transparent' in mat && mat.transparent && 'opacity' in mat && mat.opacity === 0) {
          continue;
        }
        found = obj;
        break;
      }

      if (!found) {
        setHovered(null);
        return;
      }

      box.setFromObject(found);
      if (box.isEmpty()) {
        setHovered(null);
        return;
      }
      box.getSize(sizeVec);
      box.getCenter(centerVec);

      setHovered({
        name: found.name || found.parent?.name || '3D 物件',
        center: [centerVec.x, centerVec.y, centerVec.z],
        size: [sizeVec.x, sizeVec.y, sizeVec.z],
        topY: box.max.y,
      });
    };

    const onPointerLeave = () => setHovered(null);

    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerleave', onPointerLeave);
    return () => {
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [showRuler, camera, gl, scene, raycaster, pointer, box, sizeVec, centerVec]);

  if (!showRuler || !hovered) return null;

  return (
    <group ref={rulerGroupRef}>
      {/* 包圍盒線框 */}
      <mesh position={hovered.center} scale={hovered.size}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.85} />
      </mesh>

      {/* 長寬高懸浮標示 */}
      <Html
        position={[hovered.center[0], hovered.topY + 0.65, hovered.center[2]]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="ruler-badge">
          <div className="ruler-badge__name">{hovered.name}</div>
          <div className="ruler-badge__dims">
            長(X) {hovered.size[0].toFixed(2)}m · 高(Y) {hovered.size[1].toFixed(2)}m · 深(Z){' '}
            {hovered.size[2].toFixed(2)}m
          </div>
        </div>
      </Html>
    </group>
  );
}
