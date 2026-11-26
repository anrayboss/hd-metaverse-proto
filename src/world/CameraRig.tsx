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

    // 1. 統一「人體圖內部自由步行空間」：不論從九中心或通道進入，先平滑飛至起點，接著解鎖為 360° 環視 + WASD/QE 自由穿梭（可從中心直接走進通道、反之亦然）
    if (interiorSpace) {
      const entryKey =
        interiorSpace.type === 'center'
          ? `center:${interiorSpace.centerId}`
          : `channel:${interiorSpace.channelId}`;

      if (enteredCenterIdRef.current !== entryKey) {
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

      // 已進入人體圖內部空間：統一自由漫遊，可任意在九中心與 36 通道間雙向行走
      const keys = keysPressed.current;
      const speed = (keys['ShiftLeft'] || keys['ShiftRight'] ? 6.5 : 3.0) * delta;
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
      controls.update();
      return;
    }

    enteredCenterIdRef.current = null;

    // 3. 1/64 曼陀羅閘門走廊模式
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
