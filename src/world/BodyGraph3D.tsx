import { Suspense, useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Line, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  CENTERS,
  CENTER_LINKS,
  CHANNELS,
  CenterId,
  CenterInfo,
  GATE_BY_NUMBER,
} from '../data/mandalaData';
import { useWorldStore } from '../store/useWorldStore';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

const BODYGRAPH_GLB_URL = '/models/bodygraph.glb';

const CENTER_NAME_TO_ID: Record<string, CenterId> = {
  center_head: 'head',
  center_ajna: 'ajna',
  center_throat: 'throat',
  center_g: 'g',
  center_ego: 'ego',
  center_solar: 'solar',
  center_spleen: 'spleen',
  center_sacral: 'sacral',
  center_root: 'root',
};

/** 整合迴路 5 條分支通道（改由 34、10 匯流至 57-20 主幹線，不再拉 6 條交叉直線） */
const INTEGRATION_BRANCH_IDS = new Set(['20-10', '20-34', '10-57', '10-34', '57-34']);

/** 計算點 P 投影到線段 A-B 上的匯流點（限制在 t ∈ [0.22, 0.78] 以保持自然接管） */
function projectPointToSegment(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3
): THREE.Vector3 {
  const ab = b.clone().sub(a);
  const lenSq = ab.lengthSq();
  if (lenSq < 1e-6) return a.clone().lerp(b, 0.5);
  const t = Math.max(0.22, Math.min(0.78, p.clone().sub(a).dot(ab) / lenSq));
  return a.clone().addScaledVector(ab, t);
}

/**
 * 單條可進入的中空 3D 通道管（openEnded + DoubleSide 內壁 + 內壁導光環，點擊可進入管線內部）
 */
function ChannelConduit({
  channelId,
  channelName,
  gates,
  start,
  end,
  activeA,
  activeB,
  isLight,
  isInsideThis,
  onSelectChannel,
}: {
  channelId: string;
  channelName: string;
  gates: [number, number];
  start: THREE.Vector3;
  end: THREE.Vector3;
  activeA: boolean;
  activeB: boolean;
  isLight: boolean;
  isInsideThis: boolean;
  onSelectChannel: () => void;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const bothActive = activeA && activeB;

  const { segA, segB, dir, length, ringPositions, fullQuat } = useMemo(() => {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const buildSeg = (p1: THREE.Vector3, p2: THREE.Vector3) => {
      const vec = p2.clone().sub(p1);
      const len = vec.length();
      const center = p1.clone().add(p2).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vec.clone().normalize()
      );
      return { center, quat, len };
    };
    const fullVec = end.clone().sub(start);
    const len = fullVec.length();
    const d = fullVec.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);

    // 管內導光環（讓攝影機進入管線內部時有強烈空間透視感）
    const ringCount = Math.max(2, Math.min(7, Math.floor(len / 1.4)));
    const rings: THREE.Vector3[] = [];
    for (let i = 1; i <= ringCount; i++) {
      rings.push(start.clone().addScaledVector(d, (len * i) / (ringCount + 1)));
    }

    return {
      segA: buildSeg(start, mid),
      segB: buildSeg(mid, end),
      dir: d,
      length: len,
      ringPositions: rings,
      fullQuat: quat,
    };
  }, [start, end]);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const speed = bothActive ? 0.55 : 0.28;
    const phase = (state.clock.elapsedTime * speed + (gates[0] % 7) * 0.13) % 1;
    pulseRef.current.position.copy(start).addScaledVector(dir, phase * length);
  });

  const inactiveColor = isLight ? '#cbd5e1' : '#334155';
  const activeColor = '#f59e0b';
  // 攝影機在管內時稍微放大管徑，提供舒適的沉浸視野；外部維持細緻建築比例
  const radius = isInsideThis ? 0.42 : bothActive ? 0.28 : 0.22;

  return (
    <group
      name={`Channel_${channelId}_${channelName}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelectChannel();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 前半段中空管：Gate A → 中點 */}
      <mesh position={segA.center} quaternion={segA.quat}>
        <cylinderGeometry args={[radius, radius, segA.len, 20, 1, true]} />
        <meshStandardMaterial
          color={activeA ? activeColor : inactiveColor}
          emissive={activeA ? activeColor : '#0f172a'}
          emissiveIntensity={activeA ? 0.65 : 0.12}
          roughness={0.35}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 後半段中空管：中點 → Gate B */}
      <mesh position={segB.center} quaternion={segB.quat}>
        <cylinderGeometry args={[radius, radius, segB.len, 20, 1, true]} />
        <meshStandardMaterial
          color={activeB ? activeColor : inactiveColor}
          emissive={activeB ? activeColor : '#0f172a'}
          emissiveIntensity={activeB ? 0.65 : 0.12}
          roughness={0.35}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 管線內部結構導光環（攝影機進入管內時清晰可見空間尺度） */}
      {ringPositions.map((rp, idx) => (
        <mesh key={idx} position={rp} quaternion={fullQuat}>
          <torusGeometry args={[radius * 0.92, 0.018, 8, 24]} />
          <meshBasicMaterial
            color={bothActive ? '#fef08a' : isLight ? '#0284c7' : '#7dd3fc'}
            transparent
            opacity={isInsideThis ? 0.85 : 0.28}
          />
        </mesh>
      ))}

      {/* 能量微中子光點沿通道流動 */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[isInsideThis ? 0.1 : bothActive ? 0.28 : 0.18, 12, 12]} />
        <meshStandardMaterial
          color={bothActive ? '#fef08a' : isLight ? '#38bdf8' : '#7dd3fc'}
          emissive={bothActive ? '#f59e0b' : '#0ea5e9'}
          emissiveIntensity={bothActive ? 1.8 : 0.9}
          transparent
          opacity={bothActive ? 0.95 : 0.75}
        />
      </mesh>
    </group>
  );
}

/**
 * 讀取 Spline 匯出的 bodygraph.glb：
 * 1. 自動置中與等比縮放至中庭圓盤
 * 2. 依 Center_* 名稱套色與點擊事件
 * 3. 自動掃描所有 Gate_<編號> 物件的 3D 幾何中心，並從 CHANNELS 表自動生成立體通道管
 */
function SplineAtriumBodyGraph({
  definedCenters,
  activeGates,
  isLight,
  yOffset,
  interiorCenterId,
  interiorChannelId,
  onSelectCenter,
  onSelectGate,
  onSelectChannel,
}: {
  definedCenters: CenterId[];
  activeGates: number[];
  isLight: boolean;
  yOffset: number;
  interiorCenterId: CenterId | null;
  interiorChannelId: string | null;
  onSelectCenter: (c: CenterInfo, worldPos: [number, number, number]) => void;
  onSelectGate: (gateNum: number, worldPos: [number, number, number]) => void;
  onSelectChannel: (
    channelId: string,
    name: string,
    gates: [number, number],
    start: [number, number, number],
    end: [number, number, number]
  ) => void;
}) {
  const { scene } = useGLTF(BODYGRAPH_GLB_URL);
  const centerMap = useMemo(() => Object.fromEntries(CENTERS.map((c) => [c.id, c])), []);

  const { modelRoot, gatePositions, centerPositions } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);

    // 計算原始包圍盒並自動對齊中庭大小（Z 軸約 30.5 單位，底部貼齊 y = 0.08）
    const rawBox = new THREE.Box3().setFromObject(cloned);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    const maxPlanar = Math.max(rawSize.x, rawSize.z, 0.001);
    const fitScale = 30.5 / maxPlanar;

    const wrapper = new THREE.Group();
    cloned.position.set(
      -rawCenter.x * fitScale,
      -rawBox.min.y * fitScale + 0.08,
      -rawCenter.z * fitScale
    );
    cloned.scale.setScalar(fitScale);
    wrapper.add(cloned);
    wrapper.updateMatrixWorld(true);

    const gates: Record<number, THREE.Vector3> = {};
    const centers: Partial<Record<CenterId, THREE.Vector3>> = {};

    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      // 複製獨立材質，避免修改共享 material 互相污染
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }

      const lower = mesh.name.toLowerCase();
      const centerId = CENTER_NAME_TO_ID[lower];
      if (centerId) {
        mesh.userData.centerId = centerId;
        const box = new THREE.Box3().setFromObject(mesh);
        const pos = new THREE.Vector3();
        box.getCenter(pos);
        centers[centerId] = pos;
        return;
      }

      const gateMatch = mesh.name.match(/^Gate_(\d+)$/i);
      if (gateMatch) {
        const gateNum = Number(gateMatch[1]);
        mesh.userData.gateNumber = gateNum;
        const box = new THREE.Box3().setFromObject(mesh);
        const pos = new THREE.Vector3();
        box.getCenter(pos);
        gates[gateNum] = pos;
      }
    });

    return { modelRoot: wrapper, gatePositions: gates, centerPositions: centers };
  }, [scene]);

  // 依據定義中心與啟動閘門即時更新 GLB 材質顏色
  useEffect(() => {
    modelRoot.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;

      const centerId = mesh.userData.centerId as CenterId | undefined;
      if (centerId) {
        const info = centerMap[centerId];
        const isDef = definedCenters.includes(centerId);
        const isInsideThisCenter = interiorCenterId === centerId;
        mat.color.set(isDef ? info.color : isLight ? '#f8fafc' : '#1e293b');
        mat.emissive.set(isDef ? info.color : '#64748b');
        mat.emissiveIntensity = isInsideThisCenter ? 0.42 : isDef ? 0.28 : 0.05;
        mat.roughness = 0.45;
        // 雙面渲染：讓攝影機飛進九中心內部時可以看到完整立體內牆（不會因背面剔除消失）
        mat.side = THREE.DoubleSide;
        mat.transparent = isInsideThisCenter;
        mat.opacity = isInsideThisCenter ? 0.72 : 1;
        mat.needsUpdate = true;
        return;
      }

      const gateNum = mesh.userData.gateNumber as number | undefined;
      if (gateNum !== undefined) {
        const isActive = activeGates.includes(gateNum);
        mat.color.set(isActive ? '#f59e0b' : isLight ? '#e2e8f0' : '#475569');
        mat.emissive.set(isActive ? '#f59e0b' : '#334155');
        mat.emissiveIntensity = isActive ? 0.7 : 0.1;
      }
    });
  }, [modelRoot, definedCenters, activeGates, isLight, centerMap, interiorCenterId]);

  // 排除 5 條整合迴路分支（改由 34、10 接到 57-20 主幹線的匯流點）
  const standardChannels = useMemo(
    () =>
      CHANNELS.filter(
        (ch) =>
          !INTEGRATION_BRANCH_IDS.has(ch.id) &&
          gatePositions[ch.gates[0]] !== undefined &&
          gatePositions[ch.gates[1]] !== undefined
      ),
    [gatePositions]
  );

  // 計算 34、10 接到 57-20 主幹線上的匯流點
  const integrationBranches = useMemo(() => {
    const p20 = gatePositions[20];
    const p57 = gatePositions[57];
    if (!p20 || !p57) return [];

    const branches: Array<{
      id: string;
      name: string;
      gates: [number, number];
      start: THREE.Vector3;
      end: THREE.Vector3;
      activeA: boolean;
      activeB: boolean;
    }> = [];

    const anyMainActive = activeGates.includes(20) || activeGates.includes(57);

    const p34 = gatePositions[34];
    if (p34) {
      const junction34 = projectPointToSegment(p34, p57, p20);
      const is34Active = activeGates.includes(34);
      const junctionLit = is34Active && (anyMainActive || activeGates.includes(10));
      branches.push({
        id: '34-junction',
        name: '34 匯流至 57-20 主幹線（魅力／力量／探索）',
        gates: [34, 20],
        start: p34,
        end: junction34,
        activeA: is34Active,
        activeB: junctionLit,
      });
    }

    const p10 = gatePositions[10];
    if (p10) {
      const junction10 = projectPointToSegment(p10, p57, p20);
      const is10Active = activeGates.includes(10);
      const junctionLit = is10Active && (anyMainActive || activeGates.includes(34));
      branches.push({
        id: '10-junction',
        name: '10 匯流至 57-20 主幹線（覺醒／完美形式／探索）',
        gates: [10, 57],
        start: p10,
        end: junction10,
        activeA: is10Active,
        activeB: junctionLit,
      });
    }

    return branches;
  }, [gatePositions, activeGates]);

  const toWorldTuple = (v: THREE.Vector3): [number, number, number] => [
    v.x,
    v.y + yOffset + 0.12,
    v.z,
  ];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const target = e.object;
    const gateNum = target.userData.gateNumber as number | undefined;
    if (gateNum !== undefined) {
      e.stopPropagation();
      const pos = gatePositions[gateNum];
      onSelectGate(gateNum, pos ? toWorldTuple(pos) : [0, yOffset + 0.5, 0]);
      return;
    }
    const centerId = target.userData.centerId as CenterId | undefined;
    if (centerId) {
      e.stopPropagation();
      const info = centerMap[centerId];
      const pos = centerPositions[centerId];
      onSelectCenter(
        info,
        pos ? toWorldTuple(pos) : [info.flatPos[0], yOffset + 0.5, info.flatPos[1]]
      );
    }
  };

  const activeInteriorCenterPos = interiorCenterId ? centerPositions[interiorCenterId] : null;

  return (
    <group position={[0, 0.12, 0]}>
      {/* 中庭圓形底板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[21.8, 64]} />
        <meshStandardMaterial color={isLight ? '#f8fafc' : '#090e1c'} roughness={0.9} />
      </mesh>

      {/* Spline 3D 模型（9 大中心 + 閘門定位塊） */}
      <primitive
        object={modelRoot}
        onClick={handleClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (e.object.userData.centerId || e.object.userData.gateNumber) {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      />

      {/* 當攝影機位於九中心內部時，在中心內點亮柔光以看清立體幾何內室空間 */}
      {activeInteriorCenterPos && (
        <pointLight
          position={[
            activeInteriorCenterPos.x,
            activeInteriorCenterPos.y + 0.2,
            activeInteriorCenterPos.z,
          ]}
          intensity={3.5}
          distance={8}
          color="#fef3c7"
        />
      )}

      {/* 一般通道中空管線（點擊可選中並進入管線內部） */}
      {standardChannels.map((ch) => {
        const s = gatePositions[ch.gates[0]];
        const e = gatePositions[ch.gates[1]];
        return (
          <ChannelConduit
            key={ch.id}
            channelId={ch.id}
            channelName={ch.name}
            gates={ch.gates}
            start={s}
            end={e}
            activeA={activeGates.includes(ch.gates[0])}
            activeB={activeGates.includes(ch.gates[1])}
            isLight={isLight}
            isInsideThis={interiorChannelId === ch.id}
            onSelectChannel={() =>
              onSelectChannel(ch.id, ch.name, ch.gates, toWorldTuple(s), toWorldTuple(e))
            }
          />
        );
      })}

      {/* 整合迴路特殊接線：34、10 連接至 57-20 主幹線的匯流節點 */}
      {integrationBranches.map((br) => (
        <group key={br.id}>
          <ChannelConduit
            channelId={br.id}
            channelName={br.name}
            gates={br.gates}
            start={br.start}
            end={br.end}
            activeA={br.activeA}
            activeB={br.activeB}
            isLight={isLight}
            isInsideThis={interiorChannelId === br.id}
            onSelectChannel={() =>
              onSelectChannel(br.id, br.name, br.gates, toWorldTuple(br.start), toWorldTuple(br.end))
            }
          />
          {/* 匯流點接頭環 */}
          <mesh position={br.end}>
            <sphereGeometry args={[0.3, 14, 14]} />
            <meshStandardMaterial
              color={br.activeA ? '#f59e0b' : isLight ? '#cbd5e1' : '#475569'}
              emissive={br.activeA ? '#f59e0b' : '#0f172a'}
              emissiveIntensity={br.activeA ? 0.65 : 0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(BODYGRAPH_GLB_URL);

function generateHumanSilhouettePoints(count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cInner = new THREE.Color('#7dd3fc');
  const cOuter = new THREE.Color('#818cf8');
  const scale = 1.62;

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let x = 0;
    let y = 0;
    let z = 0;

    if (r < 0.14) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      const rad = 1.35 + (Math.random() - 0.5) * 0.12;
      x = rad * Math.sin(v) * Math.cos(u) * 0.88;
      y = 6.2 + rad * Math.cos(v) * 1.1;
      z = rad * Math.sin(v) * Math.sin(u) * 0.92;
    } else if (r < 0.19) {
      const a = Math.random() * Math.PI * 2;
      const rad = 0.62 + (Math.random() - 0.5) * 0.1;
      x = Math.cos(a) * rad;
      y = 3.9 + Math.random() * 1.1;
      z = Math.sin(a) * rad;
    } else if (r < 0.65) {
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const width = 2.1 + Math.sin(t * Math.PI * 0.9) * 1.45 + (t > 0.7 ? (t - 0.7) * 2.2 : 0);
      const depth = 1.25 + Math.sin(t * Math.PI) * 0.55;
      const jitter = 0.92 + Math.random() * 0.16;
      x = Math.cos(a) * width * jitter;
      y = -4.8 + t * 8.6;
      z = Math.sin(a) * depth * jitter;
    } else if (r < 0.84) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const armRad = 0.55 * (1 - t * 0.35);
      const cx = side * (3.2 + t * 2.4);
      const cy = 3.3 - t * 5.2;
      const cz = Math.sin(t * Math.PI) * 0.5;
      x = cx + Math.cos(a) * armRad;
      y = cy + Math.sin(a) * armRad * 0.6;
      z = cz + Math.sin(a) * armRad;
    } else {
      const a = Math.random() * Math.PI * 2;
      const rad = 1.4 + Math.random() * 3.8;
      x = Math.cos(a) * rad;
      y = -5.4 + (Math.random() - 0.5) * 1.4;
      z = Math.sin(a) * rad * 0.68;
    }

    positions[i * 3] = x * scale;
    positions[i * 3 + 1] = y * scale + 9.2;
    positions[i * 3 + 2] = z * scale;

    const mix = Math.min(1, Math.max(0, (y + 6) / 14));
    const c = cOuter.clone().lerp(cInner, mix);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  return { positions, colors };
}

function CenterNode({
  center,
  isDefined,
  isSelected,
  onSelect,
}: {
  center: CenterInfo;
  isDefined: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime;
      const baseScale = isSelected ? 1.25 : 1;
      const pulse = isDefined ? 1 + Math.sin(t * 2.4 + center.position[1]) * 0.06 : 1;
      meshRef.current.scale.setScalar(baseScale * pulse);
    }
  });

  const rotZ =
    center.shape === 'triangle-down'
      ? Math.PI
      : center.shape === 'triangle-left'
        ? Math.PI / 2
        : center.shape === 'triangle-right'
          ? -Math.PI / 2
          : 0;

  return (
    <group
      position={[center.position[0], center.position[1] + 8.0, center.position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh ref={meshRef} rotation={[0, 0, rotZ]}>
        {center.shape === 'diamond' ? (
          <octahedronGeometry args={[1.45, 0]} />
        ) : center.shape === 'square' ? (
          <boxGeometry args={[1.8, 1.8, 0.85]} />
        ) : (
          <coneGeometry args={[1.35, 1.8, 3]} />
        )}
        <meshStandardMaterial
          color={isDefined ? center.color : '#94a3b8'}
          emissive={isDefined ? center.color : '#334155'}
          emissiveIntensity={isSelected ? 1.5 : isDefined ? 0.85 : 0.2}
          transparent
          opacity={isDefined ? 0.92 : 0.35}
          wireframe={!isDefined}
        />
      </mesh>
    </group>
  );
}

export function BodyGraph3D() {
  const monopoleRef = useRef<THREE.Mesh>(null);
  const theme = useWorldStore((s) => s.theme);
  const config = useSceneConfigStore((s) => s.config);
  const isLight = theme === 'light';
  const chart = useWorldStore((s) => s.chart);
  const selected = useWorldStore((s) => s.selected);
  const interiorSpace = useWorldStore((s) => s.interiorSpace);
  const selectCenter = useWorldStore((s) => s.selectCenter);
  const selectGate = useWorldStore((s) => s.selectGate);
  const selectChannel = useWorldStore((s) => s.selectChannel);

  const { positions, colors } = useMemo(() => generateHumanSilhouettePoints(2600), []);
  const centerMap = useMemo(() => Object.fromEntries(CENTERS.map((c) => [c.id, c])), []);

  // 隱藏站立的 3D 人體圖，僅顯示躺平的人體圖中庭
  const showVertical3D = false;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (monopoleRef.current) {
      monopoleRef.current.rotation.x = t * 0.9;
      monopoleRef.current.rotation.y = t * 1.1;
    }
  });

  return (
    <group>
      <group position={[0, config.bodyGraphFlatY, 0]}>
        <Suspense fallback={null}>
          <SplineAtriumBodyGraph
            definedCenters={chart.definedCenters}
            activeGates={chart.activeGates}
            isLight={isLight}
            yOffset={config.bodyGraphFlatY}
            interiorCenterId={interiorSpace?.type === 'center' ? interiorSpace.centerId : null}
            interiorChannelId={interiorSpace?.type === 'channel' ? interiorSpace.channelId : null}
            onSelectCenter={(c, worldPos) => selectCenter(c.id, worldPos)}
            onSelectGate={(gateNum, worldPos) => {
              const info = GATE_BY_NUMBER[gateNum];
              if (info) selectGate(info, worldPos);
            }}
            onSelectChannel={(id, name, gates, start, end) =>
              selectChannel(id, name, gates, start, end)
            }
          />
        </Suspense>
      </group>

      {showVertical3D && (
        <group>
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={positions.length / 3}
                array={positions}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-color"
                count={colors.length / 3}
                array={colors}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              size={isLight ? 0.22 : 0.18}
              color={isLight ? '#334155' : '#ffffff'}
              vertexColors={!isLight}
              transparent
              opacity={isLight ? 0.42 : 0.55}
              blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
              depthWrite={false}
              sizeAttenuation
            />
          </points>

          <mesh ref={monopoleRef} position={[0, 9.4, 0]}>
            <torusGeometry args={[2.25, 0.06, 12, 48]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.82} />
          </mesh>

          {CENTERS.map((center) => (
            <CenterNode
              key={center.id}
              center={center}
              isDefined={chart.definedCenters.includes(center.id)}
              isSelected={selected?.type === 'center' && selected.centerId === center.id}
              onSelect={() => selectCenter(center.id, center.position)}
            />
          ))}

          {CENTER_LINKS.map(([aId, bId]) => {
            const a = centerMap[aId];
            const b = centerMap[bId];
            const bothDefined =
              chart.definedCenters.includes(aId) && chart.definedCenters.includes(bId);
            return (
              <Line
                key={`v-${aId}-${bId}`}
                points={[
                  [a.position[0], a.position[1] + 8.0, a.position[2]],
                  [b.position[0], b.position[1] + 8.0, b.position[2]],
                ]}
                color={bothDefined ? '#f59e0b' : '#475569'}
                lineWidth={bothDefined ? 2.4 : 1.0}
                transparent
                opacity={bothDefined ? 0.8 : 0.25}
              />
            );
          })}
        </group>
      )}
    </group>
  );
}
