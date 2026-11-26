import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { getGateWorldPosition, MANDALA_GATES } from '../data/mandalaData';
import { useWorldStore } from '../store/useWorldStore';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

export function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const isUserInteracting = useRef(false);
  const smoothCorridorAngle = useRef<number | null>(null);
  const enteredCenterIdRef = useRef<string | null>(null);

  const stage = useWorldStore((s) => s.stage);
  const chart = useWorldStore((s) => s.chart);
  const cameraFocusTarget = useWorldStore((s) => s.cameraFocusTarget);
  const interiorSpace = useWorldStore((s) => s.interiorSpace);
  const activeCorridorIndex = useWorldStore((s) => s.activeCorridorIndex);
  const corridorRadius = useWorldStore((s) => s.corridorRadius);
  const corridorDirection = useWorldStore((s) => s.corridorDirection);
  const config = useSceneConfigStore((s) => s.config);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysPressed.current[e.code] = true;

      const state = useWorldStore.getState();

      if (e.code === 'Escape' && state.interiorSpace) {
        e.preventDefault();
        state.exitInteriorSpace();
        return;
      }

      const inCorridor = state.stage === 'corridor' || state.stage === 'black-sun';
      if (inCorridor) {
        const leftStep: -1 | 1 = state.corridorDirection === 'in' ? -1 : 1;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          state.switchAdjacentCorridor(leftStep);
          return;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          state.switchAdjacentCorridor((leftStep * -1) as -1 | 1);
          return;
        }
        if (e.code === 'KeyR') {
          e.preventDefault();
          state.toggleCorridorDirection();
          return;
        }
      }

      if (
        e.code === 'Space' &&
        !state.interiorSpace &&
        state.stage !== 'intro' &&
        state.stage !== 'free-roam'
      ) {
        e.preventDefault();
        state.nextStage();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };
    const onWheel = (e: WheelEvent) => {
      const state = useWorldStore.getState();
      if (state.stage === 'corridor' || state.stage === 'black-sun') {
        // 滾輪往前推（deltaY < 0）沿目前視角方向前進
        const forwardSign = state.corridorDirection === 'in' ? -1 : 1;
        const step = e.deltaY < 0 ? forwardSign * 2.2 : -forwardSign * 2.2;
        state.setCorridorRadius(state.corridorRadius + step);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  const { desiredPos, desiredTarget } = useMemo(() => {
    const redPos = new THREE.Vector3(...getGateWorldPosition(chart.redSun.gate));
    const redDir = redPos.clone().normalize();

    if (cameraFocusTarget && stage === 'free-roam') {
      const targetVec = new THREE.Vector3(...cameraFocusTarget);
      const outDir =
        targetVec.length() > 6
          ? targetVec.clone().normalize()
          : new THREE.Vector3(0, 0.15, 1).normalize();
      const camPos = targetVec.clone().add(outDir.multiplyScalar(14));
      camPos.y += 5.5;
      return { desiredPos: camPos, desiredTarget: targetVec };
    }

    switch (stage) {
      case 'intro':
        return {
          desiredPos: new THREE.Vector3(0, config.birdEyeHeight, 0.1),
          desiredTarget: new THREE.Vector3(0, 0, 0),
        };
      case 'red-sun':
        return {
          desiredPos: redDir.clone().multiplyScalar(102).add(new THREE.Vector3(0, 8.5, 0)),
          desiredTarget: redDir.clone().multiplyScalar(82).add(new THREE.Vector3(0, 2, 0)),
        };
      case 'bodygraph':
        return {
          desiredPos: new THREE.Vector3(0, config.bodyGraphCamY, config.bodyGraphCamZ),
          desiredTarget: new THREE.Vector3(0, 0.35, 0),
        };
      case 'free-roam':
      default:
        return {
          desiredPos: new THREE.Vector3(0, config.birdEyeHeight - 7, 0.1),
          desiredTarget: new THREE.Vector3(0, 0, 0),
        };
    }
  }, [
    stage,
    chart.redSun.gate,
    cameraFocusTarget,
    config.birdEyeHeight,
    config.bodyGraphCamY,
    config.bodyGraphCamZ,
  ]);

  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const moveDelta = useMemo(() => new THREE.Vector3(), []);
  const corridorCamPos = useMemo(() => new THREE.Vector3(), []);
  const corridorLookPos = useMemo(() => new THREE.Vector3(), []);
  const channelStartVec = useMemo(() => new THREE.Vector3(), []);
  const channelEndVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // 1. 統一「人體圖內部自由步行空間」：
    //    - type === 'free'：從曼陀羅走廊或自由飛行自然走入，零跳轉、完全保留當下位置與朝向
    //    - type === 'center' | 'channel'：先平滑飛至該起點，接著解鎖為統一 360° + WASD/QE 自由步行
    if (interiorSpace) {
      const entryKey =
        interiorSpace.type === 'free'
          ? 'free'
          : interiorSpace.type === 'center'
            ? `center:${interiorSpace.centerId}`
            : `channel:${interiorSpace.channelId}`;

      if (interiorSpace.type !== 'free' && enteredCenterIdRef.current !== entryKey) {
        let initCam: THREE.Vector3;
        let initTarget: THREE.Vector3;
        if (interiorSpace.type === 'center') {
          const cPos = new THREE.Vector3(...interiorSpace.position);
          initCam = cPos.clone().add(new THREE.Vector3(0, 0.08, 0.22));
          initTarget = cPos.clone().add(new THREE.Vector3(0, 0.08, -0.35));
        } else {
          channelStartVec.set(...interiorSpace.start);
          channelEndVec.set(...interiorSpace.end);
          initCam = corridorCamPos.lerpVectors(channelStartVec, channelEndVec, 0.12).clone();
          initTarget = corridorLookPos.lerpVectors(channelStartVec, channelEndVec, 0.35).clone();
        }
        const lerpAlpha = 1 - Math.exp(-delta * 6.0);
        camera.position.lerp(initCam, lerpAlpha);
        controls.target.lerp(initTarget, lerpAlpha);
        if (camera.position.distanceTo(initCam) < 0.08) {
          enteredCenterIdRef.current = entryKey;
        }
        controls.update();
        return;
      }

      enteredCenterIdRef.current = entryKey;

      // 已進入人體圖內部空間：統一自由步行，可任意在九中心與 36 通道間雙向行走
      const keys = keysPressed.current;
      const speed = (keys['ShiftLeft'] || keys['ShiftRight'] ? 7.5 : 3.4) * delta;
      moveDelta.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();

      if (keys['KeyW'] || keys['ArrowUp']) moveDelta.addScaledVector(forward, speed);
      if (keys['KeyS'] || keys['ArrowDown']) moveDelta.addScaledVector(forward, -speed);
      if (keys['KeyD'] || keys['ArrowRight']) moveDelta.addScaledVector(right, speed);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDelta.addScaledVector(right, -speed);
      if (keys['KeyE']) moveDelta.y += speed;
      if (keys['KeyQ']) moveDelta.y -= speed;

      if (moveDelta.lengthSq() > 0) {
        camera.position.add(moveDelta);
        controls.target.add(moveDelta);
      }

      // GTA 式自動走出偵測（帶遲滯區間防邊界抖動）：
      const camR = Math.hypot(camera.position.x, camera.position.z);
      const camY = camera.position.y;

      // 水平走出中庭外緣（R > 23.4 且低於 5.2m）→ 無縫走進對應方位角的 1/64 曼陀羅走廊（朝外 Out）
      if (camR > 23.4 && camY < 5.2) {
        const camAngle = Math.atan2(camera.position.z, camera.position.x);
        let nearestGate = MANDALA_GATES[0];
        let bestDiff = Infinity;
        for (const g of MANDALA_GATES) {
          let d = Math.abs(g.angleRad - camAngle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (d < bestDiff) {
            bestDiff = d;
            nearestGate = g;
          }
        }
        useWorldStore.getState().enterCorridorByGate(nearestGate.gate, 'out', 24.8);
        return;
      }

      // 垂直飛高離開（y > 6.2m）→ 無縫退回鳥瞰自由探索模式
      if (camY > 6.2) {
        useWorldStore.getState().exitInteriorSpace();
        useWorldStore.setState({ stage: 'free-roam' });
        return;
      }

      controls.update();
      return;
    }

    enteredCenterIdRef.current = null;

    // 3. 1/64 曼陀羅閘門走廊模式（走到內口 R <= 23.2 時無縫走進人體圖內部空間！）
    const inCorridor = stage === 'corridor' || stage === 'black-sun';

    if (inCorridor) {
      const targetAngle = MANDALA_GATES[activeCorridorIndex].angleRad;
      if (smoothCorridorAngle.current === null) {
        smoothCorridorAngle.current = targetAngle;
      } else {
        let diff = targetAngle - smoothCorridorAngle.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        smoothCorridorAngle.current += diff * (1 - Math.exp(-delta * 7.5));
      }

      const keys = keysPressed.current;
      let nextR = corridorRadius;
      const walkSpeed = config.corridorWalkSpeed * delta;
      const forwardSign = corridorDirection === 'in' ? -1 : 1;
      if (keys['KeyW'] || keys['ArrowUp']) nextR += forwardSign * walkSpeed;
      if (keys['KeyS'] || keys['ArrowDown']) nextR -= forwardSign * walkSpeed;

      // 走廊內口無縫進人體圖：走到 R <= 23.2 且朝內時直接走進人體圖中庭內部！
      if (nextR <= 23.2 && corridorDirection === 'in') {
        const a = smoothCorridorAngle.current;
        const entryR = 20.6;
        const entryY = Math.max(0.9, config.bodyGraphFlatY + 1.15);
        camera.position.set(Math.cos(a) * entryR, entryY, Math.sin(a) * entryR);
        controls.target.set(Math.cos(a) * (entryR - 4), entryY - 0.1, Math.sin(a) * (entryR - 4));
        controls.update();
        useWorldStore
          .getState()
          .enterBodyGraphInteriorAuto(MANDALA_GATES[activeCorridorIndex].gate);
        return;
      }

      if (nextR !== corridorRadius) {
        useWorldStore.getState().setCorridorRadius(nextR);
      }

      const a = smoothCorridorAngle.current;
      corridorCamPos.set(
        Math.cos(a) * corridorRadius,
        config.corridorCameraY,
        Math.sin(a) * corridorRadius
      );

      const lookR =
        corridorDirection === 'in'
          ? Math.max(0, corridorRadius - 18)
          : corridorRadius + 18;
      corridorLookPos.set(Math.cos(a) * lookR, 2.6, Math.sin(a) * lookR);

      const lerpAlpha = 1 - Math.exp(-delta * 6.5);
      camera.position.lerp(corridorCamPos, lerpAlpha);
      controls.target.lerp(corridorLookPos, lerpAlpha);
      controls.update();
      return;
    }

    smoothCorridorAngle.current = null;

    if (stage !== 'free-roam') {
      const lerpAlpha = 1 - Math.exp(-delta * 3.0);
      camera.position.lerp(desiredPos, lerpAlpha);
      controls.target.lerp(desiredTarget, lerpAlpha);
      controls.update();
      return;
    }

    if (cameraFocusTarget && !isUserInteracting.current) {
      const lerpAlpha = 1 - Math.exp(-delta * 3.5);
      camera.position.lerp(desiredPos, lerpAlpha);
      controls.target.lerp(desiredTarget, lerpAlpha);
      if (camera.position.distanceTo(desiredPos) < 0.5) {
        useWorldStore.setState({ cameraFocusTarget: null });
      }
    }

    const keys = keysPressed.current;
    const speed = (keys['ShiftLeft'] || keys['ShiftRight'] ? config.freeRoamSpeed * 1.85 : config.freeRoamSpeed) * delta;
    moveDelta.set(0, 0, 0);

    camera.getWorldDirection(forward);
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    if (keys['KeyW'] || keys['ArrowUp']) moveDelta.addScaledVector(forward, speed);
    if (keys['KeyS'] || keys['ArrowDown']) moveDelta.addScaledVector(forward, -speed);
    if (keys['KeyD'] || keys['ArrowRight']) moveDelta.addScaledVector(right, speed);
    if (keys['KeyA'] || keys['ArrowLeft']) moveDelta.addScaledVector(right, -speed);
    if (keys['KeyE']) moveDelta.y += speed;
    if (keys['KeyQ']) moveDelta.y -= speed;

    if (moveDelta.lengthSq() > 0) {
      useWorldStore.setState({ cameraFocusTarget: null });
      camera.position.add(moveDelta);
      controls.target.add(moveDelta);
    }

    // GTA 式自動進入偵測：自由飛行降低並進入中庭範圍（R < 21.5 且 y < 4.8）即無縫進入人體圖內部空間
    const freeR = Math.hypot(camera.position.x, camera.position.z);
    const freeY = camera.position.y;
    if (freeR < 21.5 && freeY < 4.8 && freeY > -1.0) {
      useWorldStore.getState().enterBodyGraphInteriorAuto();
      return;
    }

    controls.update();
  });

  const inCorridor = stage === 'corridor' || stage === 'black-sun';
  const inInterior = interiorSpace !== null;

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.07}
      enableRotate={!inCorridor}
      enablePan={stage === 'free-roam' || inInterior}
      enableZoom={
        stage === 'free-roam' ||
        stage === 'bodygraph' ||
        stage === 'intro' ||
        inInterior
      }
      minDistance={0.15}
      maxDistance={290}
      onStart={() => {
        isUserInteracting.current = true;
      }}
      onEnd={() => {
        isUserInteracting.current = false;
      }}
    />
  );
}
