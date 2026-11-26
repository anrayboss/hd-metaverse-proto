import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

interface HoveredBox {
  center: [number, number, number];
  size: [number, number, number];
}

export function RulerOverlay() {
  const showRuler = useSceneConfigStore((s) => s.showRuler);
  const setHoveredRuler = useSceneConfigStore((s) => s.setHoveredRuler);
  const { camera, gl, scene } = useThree();
  const [boxState, setBoxState] = useState<HoveredBox | null>(null);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const box = useMemo(() => new THREE.Box3(), []);
  const sizeVec = useMemo(() => new THREE.Vector3(), []);
  const centerVec = useMemo(() => new THREE.Vector3(), []);
  const rulerGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!showRuler) {
      setBoxState(null);
      setHoveredRuler(null);
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
        if (
          rulerGroupRef.current &&
          (obj === rulerGroupRef.current || rulerGroupRef.current.children.includes(obj))
        ) {
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
        setBoxState(null);
        setHoveredRuler(null);
        return;
      }

      box.setFromObject(found);
      if (box.isEmpty()) {
        setBoxState(null);
        setHoveredRuler(null);
        return;
      }
      box.getSize(sizeVec);
      box.getCenter(centerVec);

      const dims: [number, number, number] = [sizeVec.x, sizeVec.y, sizeVec.z];
      setBoxState({
        center: [centerVec.x, centerVec.y, centerVec.z],
        size: dims,
      });
      setHoveredRuler({
        name: found.name || found.parent?.name || '3D 物件',
        size: dims,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };

    const onPointerLeave = () => {
      setBoxState(null);
      setHoveredRuler(null);
    };

    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerleave', onPointerLeave);
    return () => {
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [showRuler, camera, gl, scene, raycaster, pointer, box, sizeVec, centerVec, setHoveredRuler]);

  if (!showRuler || !boxState) return null;

  return (
    <group ref={rulerGroupRef}>
      <mesh position={boxState.center} scale={boxState.size}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
