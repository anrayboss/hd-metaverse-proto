import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { getGateWorldPosition, MANDALA_GATES } from '../data/mandalaData';
import { useWorldStore } from '../store/useWorldStore';
import { useSceneConfigStore } from '../store/useSceneConfigStore';
import { avatarState } from './avatarState';

type RigMode = 'overview' | 'corridor' | 'interior' | 'free-roam';
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const isUserInteracting = useRef(false);
  const smoothCorridorAngle = useRef<number | null>(null);
  const enteredCenterIdRef = useRef<string | null>(null);
  const prevModeRef = useRef<RigMode>('overview');
  const prevCorridorDirRef = useRef<'in' | 'out'>('in');
  const prevFreeRoamTickRef = useRef(0);
  const prevFreeRRef = useRef<number | null>(null);
  const corridorGlideRef = useRef(false);
  const freeRoamGlideRef = useRef(false);
  const idleOrbitRef = useRef<{
    active: boolean;
    elapsed: number;
    azimuth: number;
    basePolar: number;
    baseRadius: number;
    azimuthDir: number;
  }>({
    active: false,
    elapsed: 0,
    azimuth: 0,
    basePolar: Math.PI * 0.36,
    baseRadius: 7.5,
    azimuthDir: 1,
  });

  const stage = useWorldStore((s) => s.stage);
  const chart = useWorldStore((s) => s.chart);
  const cameraFocusTarget = useWorldStore((s) => s.cameraFocusTarget);
  const freeRoamResetTick = useWorldStore((s) => s.freeRoamResetTick);
  const isIdleCinematic = useWorldStore((s) => s.isIdleCinematic);
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
      const avatarFocus = targetVec.clone().add(outDir.clone().multiplyScalar(5.5));
      avatarFocus.y += 1.6;
      const camPos = targetVec.clone().add(outDir.multiplyScalar(17));
      camPos.y += 6.0;
      return { desiredPos: camPos, desiredTarget: avatarFocus };
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
          desiredPos: new THREE.Vector3(0, config.birdEyeHeight, 0.1),
          desiredTarget: new THREE.Vector3(0, 14, 0),
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
  const nextAvatarPos = useMemo(() => new THREE.Vector3(), []);
  const deltaAvatar = useMemo(() => new THREE.Vector3(), []);
  const desiredCamVec = useMemo(() => new THREE.Vector3(), []);
  const channelStartVec = useMemo(() => new THREE.Vector3(), []);
  const channelEndVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const currentMode: RigMode = interiorSpace
      ? 'interior'
      : stage === 'corridor' || stage === 'black-sun'
        ? 'corridor'
        : stage === 'free-roam'
          ? 'free-roam'
          : 'overview';

    const modeChanged = prevModeRef.current !== currentMode;

    const minCamY = Math.max(config.avatarMinY, config.floorY + 0.1);
    const minAvatarY = config.avatarMinY;

    // 0. 待機電影模式（閒置 3 分鐘）：圍繞金探子進行水平＋垂直混搭電影運鏡
    if (isIdleCinematic) {
      const orbit = idleOrbitRef.current;
      if (!orbit.active) {
        // 若停在 overview 尚未將金探子定位到畫面中心，先置於中庭上空 14m
        if (currentMode === 'overview') {
          avatarState.position.set(0, 14, 0);
        }
        const offset = desiredCamVec.subVectors(camera.position, avatarState.position);
        const currentDist = offset.length();
        orbit.active = true;
        orbit.elapsed = 0;
        orbit.azimuth = currentDist > 0.2 ? Math.atan2(offset.x, offset.z) : 0;
        orbit.basePolar =
          currentDist > 0.2
            ? THREE.MathUtils.clamp(Math.acos(THREE.MathUtils.clamp(offset.y / currentDist, -1, 1)), 0.48, 1.32)
            : 1.08;
        orbit.baseRadius =
          currentMode === 'interior' ? 3.8 : currentMode === 'corridor' ? 5.2 : 7.8;
        orbit.azimuthDir = Math.random() < 0.5 ? 1 : -1;
      }

      orbit.elapsed += delta;
      const t = orbit.elapsed;

      // 水平緩慢公轉（帶微妙速度起伏）＋ 垂直雙諧波起伏 ＋ 距離在 [min, max] 間有機呼吸推拉
      const azimuthSpeed =
        config.idleOrbitSpeed * (1 + Math.sin(t * 0.19) * 0.25) * orbit.azimuthDir;
      orbit.azimuth += azimuthSpeed * delta;

      const vSpeed = config.idleVerticalSpeed;
      const vAmp = config.idleVerticalAmp;
      const targetPolar = THREE.MathUtils.clamp(
        1.05 +
          Math.sin(t * vSpeed) * vAmp +
          Math.sin(t * vSpeed * 0.46 + 1.3) * (vAmp * 0.4),
        0.44,
        1.44
      );

      const minDist = Math.min(config.idleCameraDistMin, config.idleCameraDistMax);
      const maxDist = Math.max(config.idleCameraDistMin, config.idleCameraDistMax);
      const zSpeed = config.idleZoomSpeed;
      // 雙頻平滑波（0..1），避免死板往復，營造自然電影推拉節奏
      const zoomWave =
        0.5 + 0.36 * Math.sin(t * zSpeed + 0.4) + 0.14 * Math.sin(t * zSpeed * 0.43 + 1.9);
      const targetRadius = THREE.MathUtils.lerp(minDist, maxDist, THREE.MathUtils.clamp(zoomWave, 0, 1));

      const sinP = Math.sin(targetPolar);
      desiredCamVec.set(
        avatarState.position.x + Math.sin(orbit.azimuth) * sinP * targetRadius,
        Math.max(minCamY, avatarState.position.y + Math.cos(targetPolar) * targetRadius),
        avatarState.position.z + Math.cos(orbit.azimuth) * sinP * targetRadius
      );

      const smoothAlpha = 1 - Math.exp(-delta * 2.4);
      camera.position.lerp(desiredCamVec, smoothAlpha);
      if (camera.position.y < minCamY) camera.position.y = minCamY;
      controls.target.lerp(avatarState.position, 1 - Math.exp(-delta * 4.5));
      avatarState.velocity.multiplyScalar(0.85);
      controls.update();
      prevModeRef.current = currentMode;
      return;
    } else if (idleOrbitRef.current.active) {
      idleOrbitRef.current.active = false;
    }

    // 1. 人體圖內部自由探索（全第三人稱：controls.target 永遠綁定在 avatarState.position）
    if (currentMode === 'interior' && interiorSpace) {
      const entryKey =
        interiorSpace.type === 'free'
          ? 'free'
          : interiorSpace.type === 'center'
            ? `center:${interiorSpace.centerId}`
            : `channel:${interiorSpace.channelId}`;

      if (interiorSpace.type !== 'free' && enteredCenterIdRef.current !== entryKey) {
        if (interiorSpace.type === 'center') {
          nextAvatarPos.set(...interiorSpace.position);
          nextAvatarPos.y += 0.35;
          desiredCamVec.copy(nextAvatarPos).add(new THREE.Vector3(0, 1.35, 3.8));
        } else {
          channelStartVec.set(...interiorSpace.start);
          channelEndVec.set(...interiorSpace.end);
          nextAvatarPos.lerpVectors(channelStartVec, channelEndVec, 0.14);
          desiredCamVec.copy(nextAvatarPos).add(new THREE.Vector3(0, 1.35, 3.8));
        }
        const lerpAlpha = 1 - Math.exp(-delta * 6.0);
        avatarState.position.lerp(nextAvatarPos, lerpAlpha);
        avatarState.velocity.set(0, 0, 0);
        camera.position.lerp(desiredCamVec, lerpAlpha);
        controls.target.lerp(avatarState.position, lerpAlpha);
        if (avatarState.position.distanceTo(nextAvatarPos) < 0.08) {
          enteredCenterIdRef.current = entryKey;
        }
        if (camera.position.y < minCamY) camera.position.y = minCamY;
        controls.update();
        prevModeRef.current = currentMode;
        return;
      }

      enteredCenterIdRef.current = entryKey;

      const keys = keysPressed.current;
      const speed =
        (keys['ShiftLeft'] || keys['ShiftRight']
          ? config.interiorSprintSpeed
          : config.interiorFlySpeed) * delta;
      moveDelta.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) {
        forward.set(0, 0, -1);
      } else {
        forward.normalize();
      }
      right.crossVectors(forward, WORLD_UP).normalize();

      if (keys['KeyW'] || keys['ArrowUp']) moveDelta.addScaledVector(forward, speed);
      if (keys['KeyS'] || keys['ArrowDown']) moveDelta.addScaledVector(forward, -speed);
      if (keys['KeyD'] || keys['ArrowRight']) moveDelta.addScaledVector(right, speed);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDelta.addScaledVector(right, -speed);

      const verticalDelta = ((keys['KeyE'] ? 1 : 0) - (keys['KeyQ'] ? 1 : 0)) * speed;

      if (moveDelta.lengthSq() > 0) {
        avatarState.position.add(moveDelta);
        camera.position.add(moveDelta);
        controls.target.add(moveDelta);
        avatarState.velocity.copy(moveDelta).divideScalar(Math.max(delta, 0.001));
        avatarState.heading = Math.atan2(moveDelta.x, moveDelta.z);
      } else {
        avatarState.velocity.multiplyScalar(0.8);
      }

      if (verticalDelta !== 0) {
        const clampedAvatarY = Math.max(minAvatarY, avatarState.position.y + verticalDelta);
        const actualDy = clampedAvatarY - avatarState.position.y;
        avatarState.position.y = clampedAvatarY;
        camera.position.y = Math.max(minCamY, camera.position.y + actualDy);
        controls.target.y = clampedAvatarY;
      }

      const xzAlpha = 1 - Math.exp(-delta * 14);
      controls.target.x = THREE.MathUtils.lerp(controls.target.x, avatarState.position.x, xzAlpha);
      controls.target.z = THREE.MathUtils.lerp(controls.target.z, avatarState.position.z, xzAlpha);
      if (verticalDelta === 0) {
        controls.target.y = THREE.MathUtils.lerp(controls.target.y, avatarState.position.y, xzAlpha);
      }
      if (camera.position.y < minCamY) camera.position.y = minCamY;

      // GTA 式自動走出偵測（改判化身座標，避免拉遠鏡頭誤觸退出）
      const avatarR = Math.hypot(avatarState.position.x, avatarState.position.z);
      const avatarY = avatarState.position.y;

      if (avatarR > 23.4 && avatarY < 5.2) {
        const avatarAngle = Math.atan2(avatarState.position.z, avatarState.position.x);
        let nearestGate = MANDALA_GATES[0];
        let bestDiff = Infinity;
        for (const g of MANDALA_GATES) {
          let d = Math.abs(g.angleRad - avatarAngle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (d < bestDiff) {
            bestDiff = d;
            nearestGate = g;
          }
        }
        useWorldStore.getState().enterCorridorByGate(nearestGate.gate, 'out', 24.8);
        prevModeRef.current = currentMode;
        return;
      }

      if (avatarY > 6.2) {
        useWorldStore.getState().exitInteriorSpace();
        useWorldStore.setState({ stage: 'free-roam' });
        prevModeRef.current = currentMode;
        return;
      }

      controls.update();
      prevModeRef.current = currentMode;
      return;
    }

    enteredCenterIdRef.current = null;

    // 2. 1/64 曼陀羅閘門走廊（第三人稱：鏡頭跟在微中子後方並可 360° 繞轉觀察）
    if (currentMode === 'corridor') {
      const targetAngle = MANDALA_GATES[activeCorridorIndex].angleRad;
      const corridorY = Math.max(1.1, config.corridorCameraY - 0.9);

      if (modeChanged || smoothCorridorAngle.current === null) {
        smoothCorridorAngle.current = targetAngle;
        avatarState.position.set(
          Math.cos(targetAngle) * corridorRadius,
          corridorY,
          Math.sin(targetAngle) * corridorRadius
        );
        corridorGlideRef.current = true;
      } else {
        let diff = targetAngle - smoothCorridorAngle.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        smoothCorridorAngle.current += diff * (1 - Math.exp(-delta * 7.5));
      }

      if (prevCorridorDirRef.current !== corridorDirection) {
        corridorGlideRef.current = true;
        prevCorridorDirRef.current = corridorDirection;
      }

      const keys = keysPressed.current;
      let nextR = corridorRadius;
      const walkSpeed = config.corridorWalkSpeed * delta;
      const forwardSign = corridorDirection === 'in' ? -1 : 1;
      if (keys['KeyW'] || keys['ArrowUp']) nextR += forwardSign * walkSpeed;
      if (keys['KeyS'] || keys['ArrowDown']) nextR -= forwardSign * walkSpeed;

      const a = smoothCorridorAngle.current;

      // 走廊內口無縫進人體圖：走到 R <= 23.2 且朝內時直接走進人體圖中庭內部（保持第三人稱距離）
      if (nextR <= 23.2 && corridorDirection === 'in') {
        const entryR = 20.6;
        const entryY = Math.max(0.9, config.bodyGraphFlatY + 1.15);
        avatarState.position.set(Math.cos(a) * entryR, entryY, Math.sin(a) * entryR);
        controls.target.copy(avatarState.position);
        camera.position.set(
          Math.cos(a) * (entryR + 4.4),
          entryY + 1.4,
          Math.sin(a) * (entryR + 4.4)
        );
        controls.update();
        useWorldStore
          .getState()
          .enterBodyGraphInteriorAuto(MANDALA_GATES[activeCorridorIndex].gate);
        prevModeRef.current = currentMode;
        return;
      }

      // 走廊外口穿透卦象無縫走出曼陀羅（R >= 89.5 且朝外時進入自由探索）
      if (nextR >= 89.5 && corridorDirection === 'out') {
        const exitR = 91.5;
        avatarState.position.set(Math.cos(a) * exitR, corridorY, Math.sin(a) * exitR);
        controls.target.copy(avatarState.position);
        camera.position.set(
          Math.cos(a) * (exitR - 6.8),
          corridorY + 1.9,
          Math.sin(a) * (exitR - 6.8)
        );
        controls.update();
        prevFreeRRef.current = exitR;
        useWorldStore.setState({ stage: 'free-roam', interiorSpace: null, cameraFocusTarget: null });
        prevModeRef.current = currentMode;
        return;
      }

      if (nextR !== corridorRadius) {
        useWorldStore.getState().setCorridorRadius(nextR);
      }

      nextAvatarPos.set(Math.cos(a) * nextR, corridorY, Math.sin(a) * nextR);
      deltaAvatar.subVectors(nextAvatarPos, avatarState.position);

      avatarState.position.copy(nextAvatarPos);
      avatarState.velocity.copy(deltaAvatar).divideScalar(Math.max(delta, 0.001));
      avatarState.heading = Math.atan2(Math.cos(a) * forwardSign, Math.sin(a) * forwardSign);

      if (isUserInteracting.current) {
        corridorGlideRef.current = false;
      }

      if (corridorGlideRef.current) {
        // 剛進入走廊或按 R 反轉視角時，平滑滑行至化身斜後方（過肩視角）
        const backR = nextR - forwardSign * 6.8;
        desiredCamVec.set(Math.cos(a) * backR, corridorY + 1.9, Math.sin(a) * backR);
        const lerpAlpha = 1 - Math.exp(-delta * 6.5);
        camera.position.lerp(desiredCamVec, lerpAlpha);
        controls.target.lerp(avatarState.position, lerpAlpha);
        if (camera.position.distanceTo(desiredCamVec) < 0.2) {
          corridorGlideRef.current = false;
        }
      } else {
        // 正常走廊飛行：鏡頭與化身同步平移，滑鼠可隨時 360° 繞轉觀察 8 站立體物件
        camera.position.add(deltaAvatar);
        controls.target.lerp(avatarState.position, 1 - Math.exp(-delta * 14));
      }

      if (camera.position.y < minCamY) camera.position.y = minCamY;
      controls.update();
      prevModeRef.current = currentMode;
      return;
    }

    smoothCorridorAngle.current = null;

    // 3. 導覽／鳥瞰定點階段（intro / red-sun / bodygraph）
    if (currentMode === 'overview') {
      const lerpAlpha = 1 - Math.exp(-delta * 3.0);
      camera.position.lerp(desiredPos, lerpAlpha);
      controls.target.lerp(desiredTarget, lerpAlpha);
      if (camera.position.y < minCamY) camera.position.y = minCamY;
      controls.update();
      prevModeRef.current = currentMode;
      return;
    }

    // 4. 外部自由探索模式（全第三人稱：繞著微中子化身飛翔）
    if (freeRoamResetTick !== prevFreeRoamTickRef.current) {
      prevFreeRoamTickRef.current = freeRoamResetTick;
      // 置於中庭上方 14m，避免落入 R < 21.5 && y < 4.8 誤判進入人體圖內部空間
      avatarState.position.set(0, 14, 0);
      freeRoamGlideRef.current = true;
    } else if (modeChanged && prevModeRef.current === 'overview') {
      avatarState.position.set(0, 14, 0);
      freeRoamGlideRef.current = true;
    }

    if (isUserInteracting.current) {
      freeRoamGlideRef.current = false;
    }

    if (cameraFocusTarget && !isUserInteracting.current) {
      const lerpAlpha = 1 - Math.exp(-delta * 3.5);
      avatarState.position.lerp(desiredTarget, lerpAlpha);
      camera.position.lerp(desiredPos, lerpAlpha);
      controls.target.lerp(avatarState.position, lerpAlpha);
      if (camera.position.distanceTo(desiredPos) < 0.5) {
        useWorldStore.setState({ cameraFocusTarget: null });
      }
    } else if (freeRoamGlideRef.current) {
      const lerpAlpha = 1 - Math.exp(-delta * 3.8);
      camera.position.lerp(desiredPos, lerpAlpha);
      controls.target.lerp(avatarState.position, lerpAlpha);
      if (camera.position.distanceTo(desiredPos) < 0.8) {
        freeRoamGlideRef.current = false;
      }
    }

    const keys = keysPressed.current;
    const speed =
      (keys['ShiftLeft'] || keys['ShiftRight']
        ? config.freeRoamSpeed * config.freeRoamSprintMultiplier
        : config.freeRoamSpeed) * delta;
    moveDelta.set(0, 0, 0);

    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }
    right.crossVectors(forward, WORLD_UP).normalize();

    if (keys['KeyW'] || keys['ArrowUp']) moveDelta.addScaledVector(forward, speed);
    if (keys['KeyS'] || keys['ArrowDown']) moveDelta.addScaledVector(forward, -speed);
    if (keys['KeyD'] || keys['ArrowRight']) moveDelta.addScaledVector(right, speed);
    if (keys['KeyA'] || keys['ArrowLeft']) moveDelta.addScaledVector(right, -speed);

    const verticalDelta = ((keys['KeyE'] ? 1 : 0) - (keys['KeyQ'] ? 1 : 0)) * speed;

    if (moveDelta.lengthSq() > 0) {
      freeRoamGlideRef.current = false;
      useWorldStore.setState({ cameraFocusTarget: null });
      avatarState.position.add(moveDelta);
      camera.position.add(moveDelta);
      controls.target.add(moveDelta);
      avatarState.velocity.copy(moveDelta).divideScalar(Math.max(delta, 0.001));
      avatarState.heading = Math.atan2(moveDelta.x, moveDelta.z);
    } else {
      avatarState.velocity.multiplyScalar(0.82);
    }

    if (verticalDelta !== 0) {
      freeRoamGlideRef.current = false;
      useWorldStore.setState({ cameraFocusTarget: null });
      const clampedAvatarY = Math.max(minAvatarY, avatarState.position.y + verticalDelta);
      const actualDy = clampedAvatarY - avatarState.position.y;
      avatarState.position.y = clampedAvatarY;
      camera.position.y = Math.max(minCamY, camera.position.y + actualDy);
      controls.target.y = clampedAvatarY;
    }

    const xzAlpha = 1 - Math.exp(-delta * 14);
    controls.target.x = THREE.MathUtils.lerp(controls.target.x, avatarState.position.x, xzAlpha);
    controls.target.z = THREE.MathUtils.lerp(controls.target.z, avatarState.position.z, xzAlpha);
    if (verticalDelta === 0 && !freeRoamGlideRef.current) {
      controls.target.y = THREE.MathUtils.lerp(controls.target.y, avatarState.position.y, xzAlpha);
    }
    if (camera.position.y < minCamY) camera.position.y = minCamY;

    // GTA 式自動進入偵測（改判化身座標；重置飛往鳥瞰期間不觸發）
    if (!freeRoamGlideRef.current) {
      const freeR = Math.hypot(avatarState.position.x, avatarState.position.z);
      const freeY = avatarState.position.y;
      if (freeR < 21.5 && freeY < 4.8 && freeY > -1.0) {
        prevFreeRRef.current = freeR;
        useWorldStore.getState().enterBodyGraphInteriorAuto();
        prevModeRef.current = currentMode;
        return;
      }

      // 從曼陀羅外側向內穿透卦象（R = 88）無縫走進對應 1/64 閘門走廊
      if (
        prevFreeRRef.current !== null &&
        prevFreeRRef.current >= 89.5 &&
        freeR < 89.5 &&
        freeR >= 84.0 &&
        freeY >= minAvatarY &&
        freeY < 6.5
      ) {
        const avatarAngle = Math.atan2(avatarState.position.z, avatarState.position.x);
        let nearestGate = MANDALA_GATES[0];
        let bestDiff = Infinity;
        for (const g of MANDALA_GATES) {
          let d = Math.abs(g.angleRad - avatarAngle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (d < bestDiff) {
            bestDiff = d;
            nearestGate = g;
          }
        }
        prevFreeRRef.current = 85.5;
        useWorldStore.getState().enterCorridorByGate(nearestGate.gate, 'in', 85.5);
        prevModeRef.current = currentMode;
        return;
      }
      prevFreeRRef.current = freeR;
    } else {
      prevFreeRRef.current = null;
    }

    controls.update();
    prevModeRef.current = currentMode;
  });

  const inInterior = interiorSpace !== null;

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.07}
      enableRotate
      enablePan={stage === 'free-roam' || inInterior}
      enableZoom={
        stage === 'free-roam' ||
        stage === 'bodygraph' ||
        stage === 'intro' ||
        stage === 'corridor' ||
        stage === 'black-sun' ||
        inInterior
      }
      minDistance={1.5}
      maxDistance={290}
      maxPolarAngle={Math.PI / 2}
      onStart={() => {
        isUserInteracting.current = true;
      }}
      onEnd={() => {
        isUserInteracting.current = false;
      }}
    />
  );
}
