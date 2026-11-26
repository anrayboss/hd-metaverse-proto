import { Suspense, useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Line, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import {
  CENTERS,
  CENTER_LINKS,
  CHANNELS,
  CenterId,
  CenterInfo,
  GATE_BY_NUMBER,
} from '../data/mandalaData';
import { VariableArrow, ViewMode } from '../engine/hdCalculator';
import { useWorldStore, VariableDetailLevel } from '../store/useWorldStore';
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
const INTEGRATION_BRANCH_IDS = new Set(['10-20', '34-20', '34-10', '57-10', '34-57']);

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
  isInInterior,
  extendStart = 0.35,
  extendEnd = 0.35,
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
  isInInterior: boolean;
  extendStart?: number;
  extendEnd?: number;
  onSelectChannel: () => void;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const config = useSceneConfigStore((s) => s.config);
  const bothActive = activeA && activeB;

  const { segA, segB, dir, length, ringPositions, fullQuat, extStart } = useMemo(() => {
    const rawVec = end.clone().sub(start);
    const d = rawVec.clone().normalize();
    // 兩端往中心內部微幅延伸，讓中空通道管線與九中心留空空間無縫連通
    const sPt = start.clone().addScaledVector(d, -extendStart);
    const ePt = end.clone().addScaledVector(d, extendEnd);
    const mid = sPt.clone().add(ePt).multiplyScalar(0.5);
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
    const fullVec = ePt.clone().sub(sPt);
    const len = fullVec.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);

    // 管內導光環（讓攝影機在中心與通道間穿梭時清楚辨識連通空間）
    const ringCount = Math.max(2, Math.min(7, Math.floor(len / 1.4)));
    const rings: THREE.Vector3[] = [];
    for (let i = 1; i <= ringCount; i++) {
      rings.push(sPt.clone().addScaledVector(d, (len * i) / (ringCount + 1)));
    }

    return {
      segA: buildSeg(sPt, mid),
      segB: buildSeg(mid, ePt),
      dir: d,
      length: len,
      ringPositions: rings,
      fullQuat: quat,
      extStart: sPt,
    };
  }, [start, end, extendStart, extendEnd]);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const speed = bothActive ? config.channelPulseSpeed : config.channelPulseSpeed * 0.5;
    const phase = (state.clock.elapsedTime * speed + (gates[0] % 7) * 0.13) % 1;
    pulseRef.current.position.copy(extStart).addScaledVector(dir, phase * length);
  });

  const inactiveColor = isLight ? config.colorChannelInactive : '#334155';
  const activeColor = config.colorChannelActive;
  // 進入人體圖內部空間時，全部通道皆展開為可通行中空管徑，方便從中心直接走進通道
  const radius = isInInterior
    ? config.channelInsideRadius
    : bothActive
      ? config.channelActiveRadius
      : config.channelRadius;

  return (
    <group
      name={`Channel_${channelId}_${channelName}`}
      onClick={(e) => {
        if (isInInterior) return;
        e.stopPropagation();
        onSelectChannel();
      }}
      onPointerOver={(e) => {
        if (isInInterior) return;
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (isInInterior) return;
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
          transparent={isInInterior}
          opacity={isInInterior ? config.centerInteriorOpacity : 1}
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
          transparent={isInInterior}
          opacity={isInInterior ? config.centerInteriorOpacity : 1}
        />
      </mesh>

      {/* 管線內部結構導光環（攝影機進入內部時清晰可見空間尺度） */}
      {ringPositions.map((rp, idx) => (
        <mesh key={idx} position={rp} quaternion={fullQuat}>
          <torusGeometry args={[radius * 0.92, 0.018, 8, 24]} />
          <meshBasicMaterial
            color={bothActive ? '#fef08a' : isLight ? '#0284c7' : '#7dd3fc'}
            transparent
            opacity={isInInterior ? Math.max(0.6, config.channelRingOpacity) : config.channelRingOpacity}
          />
        </mesh>
      ))}

      {/* 能量微中子光點沿通道流動 */}
      <mesh ref={pulseRef}>
        <sphereGeometry
          args={[
            isInInterior
              ? config.channelPulseSize * 0.35
              : bothActive
                ? config.channelPulseSize
                : config.channelPulseSize * 0.65,
            12,
            12,
          ]}
        />
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

/** 與 public/assets/body-graph.svg (#arrow-tr-right) 完全一致的 2D 書法風格右箭頭貝茲路徑 */
const BODYGRAPH_2D_ARROW_RIGHT_PATH =
  'M164.744,39.62c-0.471,0.183-0.9,0.38-1.29,0.589s-0.744,0.443-1.063,0.705' +
  'c-0.317,0.261-0.607,0.554-0.865,0.878c-0.26,0.324-0.496,0.693-0.71,1.105c-0.105,0.199-0.238,0.329-0.4,0.388' +
  'c-0.163,0.061-0.319,0.09-0.471,0.09c-0.127,0-0.246-0.024-0.363-0.074c-0.119-0.05-0.225-0.117-0.318-0.201' +
  'c-0.095-0.083-0.171-0.181-0.229-0.294c-0.057-0.112-0.085-0.23-0.085-0.356c0-0.163,0.03-0.306,0.091-0.431' +
  'c0.061-0.127,0.152-0.257,0.277-0.392c0.396-0.398,0.922-0.742,1.576-1.031c0.654-0.29,1.472-0.55,2.454-0.78h-1.41' +
  'c-1.256,0-2.368,0.043-3.34,0.129c-0.973,0.086-1.84,0.182-2.6,0.286c-0.762,0.105-1.431,0.201-2.008,0.287' +
  'c-0.579,0.086-1.097,0.129-1.557,0.129c-0.355,0-0.632-0.093-0.833-0.279c-0.196-0.185-0.296-0.44-0.296-0.764' +
  'c0-0.325,0.1-0.58,0.296-0.764c0.201-0.186,0.478-0.279,0.833-0.279c0.46,0,0.978,0.043,1.557,0.129' +
  'c0.577,0.086,1.246,0.183,2.008,0.29c0.76,0.108,1.627,0.205,2.6,0.291c0.972,0.086,2.084,0.129,3.34,0.129h1.41' +
  'c-0.982-0.236-1.8-0.497-2.454-0.784s-1.18-0.632-1.576-1.035c-0.125-0.136-0.217-0.266-0.277-0.388s-0.091-0.266-0.091-0.427' +
  'c0-0.131,0.028-0.252,0.085-0.365c0.059-0.112,0.135-0.21,0.229-0.294c0.094-0.083,0.199-0.149,0.318-0.2' +
  'c0.117-0.05,0.236-0.074,0.363-0.074c0.151,0,0.308,0.031,0.471,0.093c0.162,0.063,0.295,0.191,0.4,0.385' +
  'c0.214,0.413,0.45,0.781,0.71,1.105c0.258,0.324,0.548,0.616,0.865,0.879c0.318,0.26,0.673,0.496,1.063,0.705' +
  'c0.39,0.209,0.819,0.406,1.29,0.588V39.62z';

/** 以與 2D body-graph.svg 相同的 Times New Roman 字形繪製高解析水平置中 CTB 標籤 */
function VariableLabel3D({
  text,
  color,
  position,
}: {
  text: string;
  color: string;
  position: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = '500 74px "Times New Roman", "TimesNewRomanPSMT", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [text, color]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.4, 1.1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * 3D 人體圖四箭頭（Variables）：
 * - 直接採用 2D body-graph.svg 的書法箭頭貝茲路徑擠出 3D 幾何，並以同款 Times New Roman 字形繪製數值
 * - 佈局對齊 2D：箭頭置中在上，CT / CTB 水平一排置中在箭頭正下方
 * - 同步連動 variableDetailLevel、viewMode 與南北交點開關
 */
function VariableArrows3D({
  variables,
  headPos,
  ajnaPos,
  viewMode,
  variableDetailLevel,
  showNodes,
  isLight,
}: {
  variables: VariableArrow[];
  headPos?: THREE.Vector3;
  ajnaPos?: THREE.Vector3;
  viewMode: ViewMode;
  variableDetailLevel: VariableDetailLevel;
  showNodes: boolean;
  isLight: boolean;
}) {
  const config = useSceneConfigStore((s) => s.config);

  const arrowGeo = useMemo(() => {
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${BODYGRAPH_2D_ARROW_RIGHT_PATH}"/></svg>`;
    const parsed = new SVGLoader().parse(svgMarkup);
    const shapes = parsed.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.14,
      bevelEnabled: false,
      curveSegments: 24,
    });
    geo.computeBoundingBox();
    if (geo.boundingBox) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      geo.boundingBox.getSize(size);
      geo.boundingBox.getCenter(center);
      geo.translate(-center.x, -center.y, 0);
      const targetWidth = 2.75;
      const s = targetWidth / Math.max(size.x, 0.001);
      // 翻轉 Y 以對齊 SVG 座標方向並等比縮放（深度維持約 0.14）
      geo.scale(s, -s, 1);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => () => arrowGeo.dispose(), [arrowGeo]);

  const topZ = headPos ? headPos.z : -12.6;
  const rawBotZ = ajnaPos ? ajnaPos.z : -8.7;
  const botZ = Math.abs(rawBotZ - topZ) < 3.8 ? topZ + 3.8 : rawBotZ;
  const yArrow = 0.22;
  const yText = 0.4;

  const designColor = config.colorDesign;
  const personalityColor = isLight ? config.colorPersonality : '#e2e8f0';

  return (
    <group name="VariableArrows3D">
      {variables.map((v) => {
        const isNodeArrow = v.position === 'bl' || v.position === 'br';
        const sideVisible =
          viewMode === 1 ||
          (viewMode === 0 && v.side === 'design') ||
          (viewMode === 2 && v.side === 'personality');
        const visible = sideVisible && (!isNodeArrow || showNodes);
        if (!visible) return null;

        const isLeftSide = v.position === 'tl' || v.position === 'bl';
        const rowZ = v.position === 'tl' || v.position === 'tr' ? topZ : botZ;
        const colX = isLeftSide ? -6.6 : 6.6;
        const color = isLeftSide ? '#000000' : personalityColor;
        const labelText =
          variableDetailLevel >= 2
            ? `C${v.color} T${v.tone} B${v.base}`
            : `C${v.color} T${v.tone}`;

        return (
          <group key={v.position} name={`VariableArrow_${v.position}`}>
            <mesh
              geometry={arrowGeo}
              position={[colX, yArrow, rowZ - 0.15]}
              rotation={[-Math.PI / 2, 0, v.isLeft ? Math.PI : 0]}
            >
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isLight ? 0.15 : 0.45}
                roughness={0.4}
                metalness={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>

            {variableDetailLevel >= 1 && (
              <VariableLabel3D text={labelText} color={color} position={[colX, yText, rowZ + 1.15]} />
            )}
          </group>
        );
      })}
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
  variables,
  viewMode,
  variableDetailLevel,
  showNodes,
  isLight,
  yOffset,
  isInInterior,
  interiorCenterId,
  onSelectCenter,
  onSelectGate,
  onSelectChannel,
}: {
  definedCenters: CenterId[];
  activeGates: number[];
  variables: VariableArrow[];
  viewMode: ViewMode;
  variableDetailLevel: VariableDetailLevel;
  showNodes: boolean;
  isLight: boolean;
  yOffset: number;
  isInInterior: boolean;
  interiorCenterId: CenterId | null;
  onSelectCenter: (c: CenterInfo, worldPos: [number, number, number]) => void;
  onSelectGate: (gateNum: number, worldPos: [number, number, number]) => void;
  onSelectChannel: (
    channelId: string,
    name: string,
    description: string,
    gates: [number, number],
    start: [number, number, number],
    end: [number, number, number]
  ) => void;
}) {
  const { scene } = useGLTF(BODYGRAPH_GLB_URL);
  const config = useSceneConfigStore((s) => s.config);
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

  const centerColorMap: Record<CenterId, string> = useMemo(
    () => ({
      head: config.colorCenterHead,
      ajna: config.colorCenterAjna,
      throat: config.colorCenterThroat,
      g: config.colorCenterG,
      ego: config.colorCenterEgo,
      solar: config.colorCenterSolar,
      spleen: config.colorCenterSpleen,
      sacral: config.colorCenterSacral,
      root: config.colorCenterRoot,
    }),
    [
      config.colorCenterHead,
      config.colorCenterAjna,
      config.colorCenterThroat,
      config.colorCenterG,
      config.colorCenterEgo,
      config.colorCenterSolar,
      config.colorCenterSpleen,
      config.colorCenterSacral,
      config.colorCenterRoot,
    ]
  );

  // 依據定義中心與啟動閘門即時更新 GLB 材質顏色
  useEffect(() => {
    modelRoot.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;

      const centerId = mesh.userData.centerId as CenterId | undefined;
      if (centerId) {
        const cColor = centerColorMap[centerId];
        const isDef = definedCenters.includes(centerId);
        mat.color.set(isDef ? cColor : isLight ? config.colorFloorLight : '#1e293b');
        mat.emissive.set(isDef ? cColor : '#64748b');
        mat.emissiveIntensity = isInInterior
          ? config.centerEmissiveDefined * 1.35
          : isDef
            ? config.centerEmissiveDefined
            : 0.05;
        mat.roughness = 0.45;
        // 雙面渲染：進入人體圖內部時全部九中心皆呈留空內壁，方便從中心直接走進通道、反之亦然
        mat.side = THREE.DoubleSide;
        mat.transparent = isInInterior;
        mat.opacity = isInInterior ? config.centerInteriorOpacity : 1;
        mat.needsUpdate = true;
        return;
      }

      const gateNum = mesh.userData.gateNumber as number | undefined;
      if (gateNum !== undefined) {
        const isActive = activeGates.includes(gateNum);
        mat.color.set(isActive ? config.colorChannelActive : isLight ? '#e2e8f0' : '#475569');
        mat.emissive.set(isActive ? config.colorChannelActive : '#334155');
        mat.emissiveIntensity = isActive ? 0.7 : 0.1;
      }
    });
  }, [
    modelRoot,
    definedCenters,
    activeGates,
    isLight,
    centerColorMap,
    isInInterior,
    config.centerEmissiveDefined,
    config.centerInteriorOpacity,
    config.colorFloorLight,
    config.colorChannelActive,
  ]);

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
      description: string;
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
        name: '34 匯流（即知即行／自給自足／自我砥礪）',
        description: '由 34 閘門匯流至 57-20 主幹線，串聯 34-20、34-57 與 34-10',
        gates: [34, 20] as [number, number],
        start: p34,
        end: junction34,
        activeA: is34Active,
        activeB: junctionLit,
      });
    }

    const p10 = gatePositions[10];
    if (p10) {
      // 10 閘門管子朝 9 點鐘方向（-X 水平，保持 z = p10.z）延伸並連接至 57-20 主幹線
      const dz = p20.z - p57.z;
      const t10 =
        Math.abs(dz) > 1e-5
          ? Math.max(0.06, Math.min(0.94, (p10.z - p57.z) / dz))
          : 0.5;
      const junction10 = new THREE.Vector3(
        p57.x + t10 * (p20.x - p57.x),
        p10.y,
        p10.z
      );
      const is10Active = activeGates.includes(10);
      const junctionLit = is10Active && (anyMainActive || activeGates.includes(34));
      branches.push({
        id: '10-junction',
        name: '10 匯流（覺醒／審美眼光／自我砥礪）',
        description: '由 10 閘門朝 9 點鐘方向水平延伸連接 57-20 主幹線，串聯 10-20、57-10 與 34-10',
        gates: [10, 57] as [number, number],
        start: p10,
        end: junction10,
        activeA: is10Active,
        activeB: junctionLit,
      });
    }

    return branches;
  }, [gatePositions, activeGates]);

  const toWorldTuple = (v: THREE.Vector3): [number, number, number] => [
    v.x * config.bodyGraphScale,
    v.y * config.bodyGraphScale + yOffset + 0.12,
    v.z * config.bodyGraphScale,
  ];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // 進入人體圖內部空間後，不再點擊觸發物件預覽視角
    if (isInInterior) return;
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
    <group position={[0, 0.12, 0]} scale={config.bodyGraphScale}>
      {/* 中庭圓形底板（淺色模式純白底） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[config.bodyGraphAtriumRadius, 64]} />
        {isLight ? (
          <meshBasicMaterial color={config.colorFloorLight} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#090e1c" roughness={0.9} />
        )}
      </mesh>

      {/* Spline 3D 模型（9 大中心 + 閘門定位塊） */}
      <primitive
        object={modelRoot}
        onClick={handleClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (isInInterior) return;
          if (e.object.userData.centerId || e.object.userData.gateNumber) {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          if (isInInterior) return;
          document.body.style.cursor = 'auto';
        }}
      />

      {/* 當攝影機位於人體圖內部空間時，提供柔光照明看清九中心與通道連通內室 */}
      {isInInterior && (
        <pointLight
          position={
            activeInteriorCenterPos
              ? [activeInteriorCenterPos.x, activeInteriorCenterPos.y + 0.6, activeInteriorCenterPos.z]
              : [0, 1.5, 0]
          }
          intensity={config.centerInteriorLight}
          distance={26}
          color="#fef3c7"
        />
      )}

      {/* 一般通道中空管線（與九中心連通，點擊可選中並進入人體圖內部空間） */}
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
            isInInterior={isInInterior}
            onSelectChannel={() =>
              onSelectChannel(
                ch.id,
                ch.name,
                ch.description,
                ch.gates,
                toWorldTuple(s),
                toWorldTuple(e)
              )
            }
          />
        );
      })}

      {/* 整合迴路特殊接線：34 與 10（朝 9 點鐘水平延伸）連接至 57-20 主幹線 */}
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
            isInInterior={isInInterior}
            extendStart={0.35}
            extendEnd={0}
            onSelectChannel={() =>
              onSelectChannel(
                br.id,
                br.name,
                br.description,
                br.gates,
                toWorldTuple(br.start),
                toWorldTuple(br.end)
              )
            }
          />
          {/* 匯流點中空接頭環 */}
          <mesh position={br.end}>
            <sphereGeometry args={[config.junctionSphereRadius, 14, 14]} />
            <meshStandardMaterial
              color={br.activeA ? '#f59e0b' : isLight ? '#cbd5e1' : '#475569'}
              emissive={br.activeA ? '#f59e0b' : '#0f172a'}
              emissiveIntensity={br.activeA ? 0.65 : 0.1}
              side={THREE.DoubleSide}
              transparent={isInInterior}
              opacity={isInInterior ? config.centerInteriorOpacity : 1}
            />
          </mesh>
        </group>
      ))}

      {/* 3D 曼陀羅四箭頭（Variables）：位置對齊 2D 本命圖（頭頂與邏輯中心兩側） */}
      {variables.length > 0 && (
        <VariableArrows3D
          variables={variables}
          headPos={centerPositions.head}
          ajnaPos={centerPositions.ajna}
          viewMode={viewMode}
          variableDetailLevel={variableDetailLevel}
          showNodes={showNodes}
          isLight={isLight}
        />
      )}
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
  const viewMode = useWorldStore((s) => s.viewMode);
  const variableDetailLevel = useWorldStore((s) => s.variableDetailLevel);
  const planetToggles = useWorldStore((s) => s.planetToggles);
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
            variables={chart.derived?.variables ?? []}
            viewMode={viewMode}
            variableDetailLevel={variableDetailLevel}
            showNodes={planetToggles.nodes}
            isLight={isLight}
            yOffset={config.bodyGraphFlatY}
            isInInterior={interiorSpace !== null}
            interiorCenterId={interiorSpace?.type === 'center' ? interiorSpace.centerId : null}
            onSelectCenter={(c, worldPos) => selectCenter(c.id, worldPos)}
            onSelectGate={(gateNum, worldPos) => {
              const info = GATE_BY_NUMBER[gateNum];
              if (info) selectGate(info, worldPos);
            }}
            onSelectChannel={(id, name, description, gates, start, end) =>
              selectChannel(id, name, description, gates, start, end)
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
