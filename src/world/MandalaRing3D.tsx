import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  CENTERS,
  CenterId,
  CenterInfo,
  GateInfo,
  MANDALA_GATES,
  QUADRANT_META,
  RING_RADII,
} from '../data/mandalaData';
import { ENABLE_SUN_GUIDE, useWorldStore } from '../store/useWorldStore';
import { getActivePlanetList, PLANET_SYMBOLS } from '../engine/hdCalculator';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

type PlanetKey = keyof typeof PLANET_SYMBOLS;

/** 輔助：將一段 XZ 平面圓弧環面（rIn..rOut, a0..a1）推入頂點與顏色陣列 */
function pushArcRingBand(
  positions: number[],
  colors: number[] | null,
  rIn: number,
  rOut: number,
  a0: number,
  a1: number,
  segments: number,
  color?: THREE.Color
) {
  const step = (a1 - a0) / segments;
  for (let i = 0; i < segments; i++) {
    const t0 = a0 + i * step;
    const t1 = a0 + (i + 1) * step;
    const c0 = Math.cos(t0);
    const s0 = Math.sin(t0);
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);

    const x0i = c0 * rIn;
    const z0i = s0 * rIn;
    const x0o = c0 * rOut;
    const z0o = s0 * rOut;
    const x1o = c1 * rOut;
    const z1o = s1 * rOut;
    const x1i = c1 * rIn;
    const z1i = s1 * rIn;

    // 兩個三角形組成一個梯形弧段
    positions.push(
      x0i, 0, z0i,
      x1o, 0, z1o,
      x0o, 0, z0o,
      x0i, 0, z0i,
      x1i, 0, z1i,
      x1o, 0, z1o
    );
    if (colors && color) {
      for (let v = 0; v < 6; v++) {
        colors.push(color.r, color.g, color.b);
      }
    }
  }
}

/** 輔助：將一條沿角度 angle 從 rIn 到 rOut、寬度為 width 的 XZ 扁平向量線段推入頂點陣列 */
function pushRadialRibbon(
  positions: number[],
  rIn: number,
  rOut: number,
  angle: number,
  width: number
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfW = width * 0.5;
  // 垂直於徑向的切線單位向量 (-sin, cos)
  const px = -sin * halfW;
  const pz = cos * halfW;

  const x0a = cos * rIn - px;
  const z0a = sin * rIn - pz;
  const x0b = cos * rIn + px;
  const z0b = sin * rIn + pz;
  const x1b = cos * rOut + px;
  const z1b = sin * rOut + pz;
  const x1a = cos * rOut - px;
  const z1a = sin * rOut - pz;

  positions.push(
    x0a, 0, z0a,
    x1b, 0, z1b,
    x0b, 0, z0b,
    x0a, 0, z0a,
    x1a, 0, z1a,
    x1b, 0, z1b
  );
}

function buildGeometryFromArrays(positions: number[], colors?: number[] | null): THREE.BufferGeometry | null {
  if (positions.length === 0) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors && colors.length === positions.length) {
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  geom.computeBoundingSphere();
  return geom;
}

/**
 * 純 3D 向量地球符號（⊕）：外圓環與內部十字四端無縫連接，拉近零鋸齒
 */
function VectorEarthSymbol({
  position,
  color,
  radius = 0.62,
}: {
  position: [number, number, number];
  color: string;
  radius?: number;
}) {
  const stroke = radius * 0.19;
  const innerR = radius - stroke;
  const barLen = radius * 2 - stroke * 0.4;
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[innerR, radius, 48]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[barLen, stroke]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[stroke, barLen]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

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

/** 旋風之環、奇蹟之環、啟迪者之環：雙圓球中間以短 bar 連接 */
const DOUBLE_ORB_CODON_RINGS = new Set(['旋風之環', '奇蹟之環', '啟迪者之環']);

interface GateHexagramProps {
  gate: GateInfo;
  isRedSun: boolean;
  isBlackSun: boolean;
  isSelected: boolean;
  isLight: boolean;
  hexagramBaseY: number;
  hexagramY: number;
  hexagramScale: number;
  gateNumberY: number;
  gateNumberSize: number;
  gateRingNumberY: number;
  baseTextY: number;
  baseTextSize: number;
  centerMarkerY: number;
  centerMarkerScale: number;
  codonTokenY: number;
  centerInfo: CenterInfo;
  centerGeometry?: THREE.BufferGeometry;
  onEnterCorridor: (gateNumber: number) => void;
}

function CenterMiniMarker({
  shape,
  color,
  position,
  scale,
  angleRad,
  customGeometry,
}: {
  shape: CenterInfo['shape'];
  color: string;
  position: [number, number, number];
  scale: number;
  angleRad: number;
  customGeometry?: THREE.BufferGeometry;
}) {
  if (customGeometry) {
    // 直接水平平移 bodygraph.glb 裡的原始中心模型，完全保留你畫的姿態與朝向
    return (
      <mesh geometry={customGeometry} position={position} scale={scale}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} />
      </mesh>
    );
  }

  const rotZ =
    shape === 'triangle-down'
      ? Math.PI
      : shape === 'triangle-left'
        ? Math.PI / 2
        : shape === 'triangle-right'
          ? -Math.PI / 2
          : 0;

  return (
    <mesh position={position} rotation={[0, 0, rotZ]} scale={scale}>
      {shape === 'diamond' ? (
        <octahedronGeometry args={[1.15, 0]} />
      ) : shape === 'square' ? (
        <boxGeometry args={[1.65, 1.0, 1.65]} />
      ) : (
        <cylinderGeometry args={[0.1, 1.25, 1.0, 3]} />
      )}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} />
    </mesh>
  );
}

function GateHexagram({
  gate,
  isRedSun,
  isBlackSun,
  isSelected,
  isLight,
  hexagramBaseY,
  hexagramY,
  hexagramScale,
  gateNumberY,
  gateNumberSize,
  gateRingNumberY,
  baseTextY,
  baseTextSize,
  centerMarkerY,
  centerMarkerScale,
  codonTokenY,
  centerInfo,
  centerGeometry,
  onEnterCorridor,
}: GateHexagramProps) {
  const portalRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const cosA = Math.cos(gate.angleRad);
  const sinA = Math.sin(gate.angleRad);

  const hexPos: [number, number, number] = [cosA * RING_RADII.hexagram, hexagramBaseY, sinA * RING_RADII.hexagram];
  const basePos: [number, number, number] = [cosA * RING_RADII.base, baseTextY, sinA * RING_RADII.base];
  const numPos: [number, number, number] = [cosA * RING_RADII.gateNumber, gateRingNumberY, sinA * RING_RADII.gateNumber];
  const centerPos: [number, number, number] = [cosA * RING_RADII.centerBlock, centerMarkerY, sinA * RING_RADII.centerBlock];
  const codonPos: [number, number, number] = [cosA * RING_RADII.codonToken, codonTokenY, sinA * RING_RADII.codonToken];

  // 讓卦象面向圓心
  const rotY = -gate.angleRad + Math.PI / 2;

  const accentColor = isRedSun
    ? '#dc2626'
    : isBlackSun
      ? '#d97706'
      : isSelected || hovered
        ? '#0284c7'
        : isLight
          ? '#0f172a'
          : QUADRANT_META[gate.quadrant].color;

  const isSpecial = ENABLE_SUN_GUIDE && (isRedSun || isBlackSun);

  useFrame((state) => {
    if (portalRingRef.current) {
      portalRingRef.current.rotation.z = state.clock.elapsedTime * (isRedSun ? 0.65 : -0.65);
    }
  });

  return (
    <group>
      {/* 外環第 2 層：易經 64 卦象（全填滿點擊區 + Billboard 永遠正對鏡頭） */}
      <group position={hexPos}>
        <Billboard position={[0, hexagramY, 0]} follow>
          <group scale={hexagramScale}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onEnterCorridor(gate.gate);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
          >
            <boxGeometry args={[3.2, 3.2, 0.8]} />
            <meshBasicMaterial
              color="#0284c7"
              transparent
              opacity={hovered || isSelected ? 0.2 : 0}
              depthWrite={false}
            />
          </mesh>

          {/* 立體易經六爻（隨 Billboard 永遠正對鏡頭） */}
          <group>
            {gate.lines.map((isYang, idx) => {
              const y = (idx - 2.5) * 0.44;
              if (isYang === 1) {
                return (
                  <mesh key={idx} position={[0, y, 0]}>
                    <boxGeometry args={[2.55, 0.24, 0.22]} />
                    <meshStandardMaterial
                      color={accentColor}
                      emissive={accentColor}
                      emissiveIntensity={isSpecial ? 0.85 : hovered || isSelected ? 0.7 : 0.12}
                    />
                  </mesh>
                );
              }
              return (
                <group key={idx} position={[0, y, 0]}>
                  <mesh position={[-0.76, 0, 0]}>
                    <boxGeometry args={[1.02, 0.24, 0.22]} />
                    <meshStandardMaterial
                      color={accentColor}
                      emissive={accentColor}
                      emissiveIntensity={isSpecial ? 0.85 : hovered || isSelected ? 0.7 : 0.12}
                    />
                  </mesh>
                  <mesh position={[0.76, 0, 0]}>
                    <boxGeometry args={[1.02, 0.24, 0.22]} />
                    <meshStandardMaterial
                      color={accentColor}
                      emissive={accentColor}
                      emissiveIntensity={isSpecial ? 0.85 : hovered || isSelected ? 0.7 : 0.12}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>

          {isSpecial && (
            <group>
              <mesh ref={portalRingRef}>
                <torusGeometry args={[2.8, 0.14, 16, 48]} />
                <meshBasicMaterial color={accentColor} transparent opacity={0.9} />
              </mesh>
              <Html position={[0, 3.6, 0]} center distanceFactor={95} style={{ pointerEvents: 'none' }}>
                <div className={`portal-tag ${isRedSun ? 'portal-tag--red' : 'portal-tag--black'}`}>
                  <span className="portal-tag__badge">
                    {isRedSun ? '紅太陽入口' : '黑太陽出口'}
                  </span>
                  <span className="portal-tag__title">Gate {gate.gate}</span>
                </div>
              </Html>
            </group>
          )}
          </group>
        </Billboard>

        {/* 卦象上方立體閘門數字（Billboard 永遠正對鏡頭） */}
        <Billboard position={[0, gateNumberY, 0]} follow>
          <Text
            fontSize={isSpecial ? gateNumberSize * 1.37 : hovered || isSelected ? gateNumberSize * 1.22 : gateNumberSize}
            color={isSpecial ? accentColor : hovered || isSelected ? '#0284c7' : isLight ? '#0f172a' : '#f8fafc'}
            outlineWidth={0.09}
            outlineColor={isLight ? '#ffffff' : '#05070e'}
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
          >
            {String(gate.gate)}
          </Text>
        </Billboard>
      </group>

      {/* 第 1 層（最外圈）：DNA 鹼基 A/C/G/U */}
      <Billboard position={basePos} follow>
        <Text
          fontSize={baseTextSize}
          color={isLight ? '#475569' : '#94a3b8'}
          anchorX="center"
          anchorY="middle"
          fontWeight={600}
        >
          {gate.bases}
        </Text>
      </Billboard>

      {/* 第 4 層：64 閘門數字環（鳥瞰清晰對齊） */}
      <Billboard position={numPos} follow>
        <Text
          fontSize={gateNumberSize * 1.15}
          color={isSpecial ? accentColor : isLight ? '#0f172a' : '#e2e8f0'}
          outlineWidth={0.06}
          outlineColor={isLight ? '#ffffff' : '#05070e'}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {String(gate.gate)}
        </Text>
      </Billboard>

      {/* 第 5 層：所屬中心立體示意（直接使用 bodygraph.glb 中心模型） */}
      <CenterMiniMarker
        shape={centerInfo.shape}
        color={centerInfo.color}
        position={centerPos}
        scale={centerMarkerScale}
        angleRad={gate.angleRad}
        customGeometry={centerGeometry}
      />

      {/* 第 9 層：密碼子環 Token 珠（旋風／奇蹟／啟迪者之環為雙圓球＋短 bar 沿圓環切線方向排列） */}
      {DOUBLE_ORB_CODON_RINGS.has(gate.codonRing) ? (
        <group position={codonPos} rotation={[0, -gate.angleRad + Math.PI / 2, 0]}>
          <mesh position={[-0.48, 0, 0]}>
            <sphereGeometry args={[0.42, 12, 12]} />
            <meshStandardMaterial
              color={gate.codonColor}
              emissive={gate.codonColor}
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0.48, 0, 0]}>
            <sphereGeometry args={[0.42, 12, 12]} />
            <meshStandardMaterial
              color={gate.codonColor}
              emissive={gate.codonColor}
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.92, 10]} />
            <meshStandardMaterial
              color={gate.codonColor}
              emissive={gate.codonColor}
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      ) : (
        <mesh position={codonPos}>
          <sphereGeometry args={[0.72, 12, 12]} />
          <meshStandardMaterial
            color={gate.codonColor}
            emissive={gate.codonColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * 大阪世博「大屋根」扁平厚圓環（10 層同心圓 + 64 等分 1/64 閘門放射分界線）
 */
export function MandalaRing3D() {
  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const selected = useWorldStore((s) => s.selected);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);
  const theme = useWorldStore((s) => s.theme);
  const config = useSceneConfigStore((s) => s.config);
  const isLight = theme === 'light';

  const centerMap = useMemo(() => Object.fromEntries(CENTERS.map((c) => [c.id, c])), []);

  // 從 bodygraph.glb 抽取 9 個中心模型幾何（套用 world 旋轉使三角形正面完全朝向天空 +Y）
  const { scene: bodyGraphScene } = useGLTF(BODYGRAPH_GLB_URL);
  const centerGeometries = useMemo(() => {
    bodyGraphScene.updateMatrixWorld(true);
    const map: Partial<Record<CenterId, THREE.BufferGeometry>> = {};
    const rotMat = new THREE.Matrix4();
    bodyGraphScene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const cid = CENTER_NAME_TO_ID[mesh.name.toLowerCase()];
      if (!cid || map[cid]) return;
      const geom = mesh.geometry.clone();
      // 只套用該物件在 GLB 中的真實世界旋轉（不含額外翻轉），直接水平平移擺上中心圈
      rotMat.extractRotation(mesh.matrixWorld);
      geom.applyMatrix4(rotMat);
      geom.computeBoundingBox();
      if (geom.boundingBox) {
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        geom.boundingBox.getSize(size);
        geom.boundingBox.getCenter(center);
        geom.translate(-center.x, -center.y, -center.z);
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const normScale = 2.1 / maxDim;
        geom.scale(normScale, normScale, normScale);
      }
      map[cid] = geom;
    });
    return map;
  }, [bodyGraphScene]);

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

  const discRadius = RING_RADII.hexagram + 3.8;

  // 實心圓盤（取消上緣凸起 bevel，讓圓盤頂面精確切齊 config.floorY，不會切到上方物件）
  const grandRingGeometry = useMemo(() => {
    const outer = new THREE.Shape();
    outer.absarc(0, 0, discRadius, 0, Math.PI * 2, false);

    const geom = new THREE.ExtrudeGeometry(outer, {
      depth: config.floorDepth,
      bevelEnabled: false,
      curveSegments: 96,
    });
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [config.floorDepth, discRadius]);

  // 純 3D 向量幾何底層（告別 2048px 像素模糊：定義底色、6 圈 384 爻小色塊、所有同心圓與 4/8/12/16/64 切塊分割線、放射星體清單）
  const vectorFloor = useMemo(() => {
    const activeLines = new Map<string, { d: boolean; p: boolean }>();
    const gatePlanets = new Map<number, Array<{ body: PlanetKey; sym: string; side: 'd' | 'p' }>>();
    const activePlanets = getActivePlanetList(planetToggles);
    if (chart.design && chart.personality) {
      for (const body of activePlanets) {
        const sym = PLANET_SYMBOLS[body];
        if (viewMode === 0 || viewMode === 1) {
          const item = chart.design[body];
          if (item) {
            const key = `${item.gate}.${item.line}`;
            const cur = activeLines.get(key) || { d: false, p: false };
            cur.d = true;
            activeLines.set(key, cur);
            const arr = gatePlanets.get(item.gate) || [];
            arr.push({ body, sym, side: 'd' });
            gatePlanets.set(item.gate, arr);
          }
        }
        if (viewMode === 2 || viewMode === 1) {
          const item = chart.personality[body];
          if (item) {
            const key = `${item.gate}.${item.line}`;
            const cur = activeLines.get(key) || { d: false, p: false };
            cur.p = true;
            activeLines.set(key, cur);
            const arr = gatePlanets.get(item.gate) || [];
            arr.push({ body, sym, side: 'p' });
            gatePlanets.set(item.gate, arr);
          }
        }
      }
    }

    const activeSet = new Set(chart.activeGates);
    const sectorStep = (Math.PI * 2) / 64;
    const lineStep = sectorStep / 6;

    // 1. 有定義閘門柔和走廊底色（純向量扇形合併）
    const activeBgPos: number[] = [];
    for (const g of MANDALA_GATES) {
      if (!activeSet.has(g.gate)) continue;
      pushArcRingBand(
        activeBgPos,
        null,
        RING_RADII.atriumMax,
        RING_RADII.corridorOuter,
        g.angleRad - sectorStep / 2,
        g.angleRad + sectorStep / 2,
        4
      );
    }

    // 2. 6 圈獨立 6 爻小色塊（純向量頂點色合併為單一 Draw Call）
    const lineBlockBands: Array<[number, number]> = [
      [32.5, 34.5], // 星體那圈外緣
      [45.8, 47.8], // 八卦 ↔ 星座之間
      [54.8, 56.8], // 星座 ↔ 神格之間
      [63.8, 65.8], // 神格 ↔ 中心示意之間
      [79.8, 81.8], // 阿拉伯數字 ↔ 象限之間
      [88.8, RING_RADII.corridorOuter], // 象限 ↔ 卦象之間
    ];

    const colDesign = new THREE.Color(config.colorDesign);
    const colPersonality = new THREE.Color(isLight ? config.colorPersonality : '#e2e8f0');
    const colBoth = new THREE.Color(config.colorBoth);

    const lineBlocksPos: number[] = [];
    const lineBlocksCol: number[] = [];
    for (const g of MANDALA_GATES) {
      const startAngle = g.angleRad + sectorStep / 2;
      for (let line = 1; line <= 6; line++) {
        const st = activeLines.get(`${g.gate}.${line}`);
        if (!st) continue;
        const aStart = startAngle - (line - 1) * lineStep;
        const aEnd = startAngle - line * lineStep;
        const color = st.d && st.p ? colBoth : st.d ? colDesign : colPersonality;
        for (const [rIn, rOut] of lineBlockBands) {
          pushArcRingBand(lineBlocksPos, lineBlocksCol, rIn, rOut, aEnd, aStart, 2, color);
        }
      }
    }

    // 3. 384 條 6 等分爻線細刻度（向量矩形條合併）
    const fineTicksPos: number[] = [];
    const fineTickW = 0.055;
    for (const [rIn, rOut] of lineBlockBands) {
      for (const g of MANDALA_GATES) {
        const startAngle = g.angleRad + sectorStep / 2;
        for (let line = 1; line < 6; line++) {
          const a = startAngle - line * lineStep;
          pushRadialRibbon(fineTicksPos, rIn, rOut, a, fineTickW);
        }
      }
    }

    // 4. 所有主邊界分割線（4/8/12/16/64 切塊＋14 圈同心圓，依 gateDividerWidth 換算精準向量寬度）
    const mainLinesPos: number[] = [];
    const pxToWorld = (px: number) => px * 0.068;
    const wheelIdxToAngle = (idx: number) => -Math.PI / 2 - ((idx - 57.5) / 64) * Math.PI * 2;
    const addRadials = (angles: number[], rIn: number, rOut: number, widthPx: number) => {
      const w = pxToWorld(widthPx);
      for (const a of angles) {
        pushRadialRibbon(mainLinesPos, rIn, rOut, a, w);
      }
    };

    const gateAngles = MANDALA_GATES.map((g) => g.angleRad - sectorStep / 2);

    // 6 圈爻線環的 64 條閘門主邊界線
    for (const [rIn, rOut] of lineBlockBands) {
      addRadials(gateAngles, rIn, rOut, Math.max(1.8, config.gateDividerWidth * 0.75));
    }

    // 64 塊層
    const bands64: Array<[number, number]> = [
      [RING_RADII.atriumMax, 34.5],
      [34.5, 38.8],
      [65.8, 72.8],
      [72.8, 79.8],
      [88.8, RING_RADII.corridorOuter],
    ];
    for (const [rIn, rOut] of bands64) {
      addRadials(gateAngles, rIn, rOut, config.gateDividerWidth);
    }

    // 八卦 8 塊（乾卦對齊 1..11）
    const trigramAngles = Array.from({ length: 8 }, (_, i) => wheelIdxToAngle(i * 8 + 2 - 0.5));
    addRadials(trigramAngles, 38.8, 45.8, Math.max(2.2, config.gateDividerWidth * 0.9));

    // 星座 12 塊（天蠍／射手對齊 14／34）
    const zodiacAngles = Array.from({ length: 12 }, (_, i) =>
      wheelIdxToAngle(i * (64 / 12) - 5 / 6)
    );
    addRadials(zodiacAngles, 47.8, 54.8, Math.max(2.2, config.gateDividerWidth * 0.9));

    // 神格 16 塊
    const godheadAngles = Array.from({ length: 16 }, (_, i) => wheelIdxToAngle(i * 4 + 62 - 0.5));
    addRadials(godheadAngles, 56.8, 63.8, Math.max(2.0, config.gateDividerWidth * 0.85));

    // 象限 4 塊
    const quadrantAngles = Array.from({ length: 4 }, (_, i) => wheelIdxToAngle(i * 16 + 2 - 0.5));
    addRadials(quadrantAngles, 81.8, 88.8, Math.max(2.6, config.gateDividerWidth));

    // 14 圈同心圓框線（不封最外圈 R=92.8 保留通透感）
    const ringDefs = [
      { r: RING_RADII.atriumMax, w: 2.8 },
      { r: 32.5, w: 1.4 },
      { r: 34.5, w: 2.0 },
      { r: 38.8, w: 2.0 },
      { r: 45.8, w: 2.0 },
      { r: 47.8, w: 2.0 },
      { r: 54.8, w: 2.0 },
      { r: 56.8, w: 2.0 },
      { r: 63.8, w: 2.0 },
      { r: 65.8, w: 2.0 },
      { r: 72.8, w: 2.0 },
      { r: 79.8, w: 2.2 },
      { r: 81.8, w: 2.2 },
      { r: 88.8, w: 2.4 },
    ];
    for (const ring of ringDefs) {
      const halfW = pxToWorld(ring.w) * 0.5;
      pushArcRingBand(mainLinesPos, null, ring.r - halfW, ring.r + halfW, 0, Math.PI * 2, 128);
    }

    // 5. 3D 向量星體符號項目（位於星體圈內側 23..31，依星體列表順序由外向內放射排列）
    const planetItems: Array<{
      key: string;
      body: PlanetKey;
      sym: string;
      x: number;
      z: number;
      color: string;
    }> = [];
    for (const g of MANDALA_GATES) {
      const list = gatePlanets.get(g.gate);
      if (!list || list.length === 0) continue;
      list.forEach((entry, idx) => {
        const rSym = 30.8 - idx * 2.35;
        if (rSym < 22.8) return;
        planetItems.push({
          key: `${g.gate}-${entry.side}-${entry.body}-${idx}`,
          body: entry.body,
          sym: entry.sym,
          x: Math.cos(g.angleRad) * rSym,
          z: Math.sin(g.angleRad) * rSym,
          color:
            entry.side === 'd'
              ? config.colorDesign
              : isLight
                ? config.colorPersonality
                : '#f1f5f9',
        });
      });
    }

    return {
      activeBgGeom: buildGeometryFromArrays(activeBgPos),
      lineBlocksGeom: buildGeometryFromArrays(lineBlocksPos, lineBlocksCol),
      fineTicksGeom: buildGeometryFromArrays(fineTicksPos),
      mainLinesGeom: buildGeometryFromArrays(mainLinesPos),
      planetItems,
    };
  }, [
    chart.activeGates,
    chart.design,
    chart.personality,
    viewMode,
    planetToggles,
    isLight,
    config.gateDividerWidth,
    config.colorDesign,
    config.colorPersonality,
    config.colorBoth,
  ]);

  useEffect(() => {
    return () => {
      vectorFloor.activeBgGeom?.dispose();
      vectorFloor.lineBlocksGeom?.dispose();
      vectorFloor.fineTicksGeom?.dispose();
      vectorFloor.mainLinesGeom?.dispose();
    };
  }, [vectorFloor]);

  // 十六神格、十二星座、易經八卦大區塊鳥瞰文字（讓鳥瞰圖跟海報一樣清晰！）
  const ringLabels = useMemo(() => {
    const items: Array<{ key: string; text: string; r: number; angle: number; size: number }> = [];
    // 四象限文字（各佔 16 閘門中點）
    const quadCenters: Array<[string, number]> = [
      ['第一象限：起始（開創・心智）', 9.5],
      ['第二象限：文明（形式）', 25.5],
      ['第三象限：二元（連結）', 41.5],
      ['第四象限：突變（轉化）', 57.5],
    ];
    for (const [text, idx] of quadCenters) {
      const a = -Math.PI / 2 - ((idx - 57.5) / 64) * Math.PI * 2;
      items.push({ key: `q-${idx}`, text, r: RING_RADII.quadrant, angle: a, size: 2.3 });
    }
    // 十六神格（每 4 閘門 1 個）
    for (let i = 0; i < 16; i++) {
      const midIdx = (i * 4 + 62 + 1.5) % 64;
      const g = MANDALA_GATES[Math.floor(midIdx)];
      const a = -Math.PI / 2 - ((midIdx - 57.5) / 64) * Math.PI * 2;
      items.push({ key: `gh-${i}`, text: g.godhead, r: RING_RADII.godhead, angle: a, size: 1.55 });
    }
    // 十二星座（精準對齊天蠍與射手交界 = Gate 14 與 Gate 34 交界）
    for (let i = 0; i < 12; i++) {
      const midIdx = ((i + 0.5) * (64 / 12) - 5 / 6 + 64) % 64;
      const g = MANDALA_GATES[Math.floor(midIdx)];
      const a = -Math.PI / 2 - ((midIdx - 57.5) / 64) * Math.PI * 2;
      items.push({ key: `zod-${i}`, text: g.zodiac, r: RING_RADII.zodiac, angle: a, size: 1.45 });
    }
    // 易經八卦（每 8 閘門 1 個；乾卦對齊 Gate 1 (50) ~ Gate 11 (57)）
    for (let i = 0; i < 8; i++) {
      const midIdx = (i * 8 + 2 + 3.5) % 64;
      const g = MANDALA_GATES[Math.floor(midIdx)];
      const a = -Math.PI / 2 - ((midIdx - 57.5) / 64) * Math.PI * 2;
      items.push({ key: `tri-${i}`, text: g.trigram, r: RING_RADII.trigram, angle: a, size: 1.45 });
    }
    return items;
  }, []);

  const labelY = config.ringLabelY;

  return (
    <group>
      {/* 大阪世博大屋根扁平厚實心圓盤底盤（略低於貼圖面 0.16m，徹底消除鳥瞰 Z-fighting 破圖） */}
      <mesh geometry={grandRingGeometry} position={[0, config.floorY - 0.16, 0]} receiveShadow>
        <meshStandardMaterial
          color={isLight ? '#ffffff' : '#0c1324'}
          metalness={isLight ? 0.05 : 0.45}
          roughness={isLight ? 0.85 : 0.45}
        />
      </mesh>

      {/* 純向量地板底面（零像素貼圖，任意距離皆刀鋒銳利） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.floorY, 0]} receiveShadow>
        <circleGeometry args={[discRadius, 128]} />
        {isLight ? (
          <meshBasicMaterial color={config.colorFloorLight} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#0c1324" roughness={0.88} metalness={0.02} />
        )}
      </mesh>

      {/* 向量層 1：有定義閘門柔和走廊底色 */}
      {vectorFloor.activeBgGeom && (
        <mesh geometry={vectorFloor.activeBgGeom} position={[0, config.floorY + 0.008, 0]}>
          <meshBasicMaterial
            color={isLight ? config.colorActiveGateBg : '#fcf2e4'}
            transparent={!isLight}
            opacity={isLight ? 1 : 0.14}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 向量層 2：6 圈 384 爻線小色塊（頂點色單 Draw Call） */}
      {vectorFloor.lineBlocksGeom && (
        <mesh geometry={vectorFloor.lineBlocksGeom} position={[0, config.floorY + 0.016, 0]}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}

      {/* 向量層 3：384 條 6 等分爻線細刻度 */}
      {vectorFloor.fineTicksGeom && (
        <mesh geometry={vectorFloor.fineTicksGeom} position={[0, config.floorY + 0.024, 0]}>
          <meshBasicMaterial
            color={isLight ? '#64748b' : '#94a3b8'}
            transparent
            opacity={isLight ? 0.5 : 0.34}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 向量層 4：14 圈同心圓與 4/8/12/16/64 切塊主分割線 */}
      {vectorFloor.mainLinesGeom && (
        <mesh geometry={vectorFloor.mainLinesGeom} position={[0, config.floorY + 0.032, 0]}>
          <meshBasicMaterial
            color={isLight ? config.colorGridStroke : '#94a3b8'}
            transparent={!isLight}
            opacity={isLight ? 1 : 0.5}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 向量層 5：3D 啟動星體符號（地球採純向量無縫十字圓環；其餘採 MSDF 向量字型） */}
      {vectorFloor.planetItems.map((item) =>
        item.body === 'Earth' ? (
          <VectorEarthSymbol
            key={item.key}
            position={[item.x, config.floorY + 0.044, item.z]}
            color={item.color}
            radius={0.62}
          />
        ) : (
          <Text
            key={item.key}
            position={[item.x, config.floorY + 0.044, item.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={1.55}
            color={item.color}
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
          >
            {item.sym}
          </Text>
        )
      )}

      {/* 鳥瞰圖象限／神格／星座／八卦環文字（最低 Y=0.6 防陷進地板） */}
      {ringLabels.map((lbl) => (
        <Text
          key={lbl.key}
          position={[Math.cos(lbl.angle) * lbl.r, labelY, Math.sin(lbl.angle) * lbl.r]}
          rotation={[-Math.PI / 2, 0, -lbl.angle - Math.PI / 2]}
          fontSize={lbl.size}
          color={isLight ? '#1e293b' : '#cbd5e1'}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {lbl.text}
        </Text>
      ))}

      {/* 64 閘門卦象＋鹼基＋數字＋中心塊＋密碼子珠 */}
      {MANDALA_GATES.map((gate) => (
        <GateHexagram
          key={gate.gate}
          gate={gate}
          isRedSun={ENABLE_SUN_GUIDE && chart.redSun.gate === gate.gate}
          isBlackSun={ENABLE_SUN_GUIDE && chart.blackSun.gate === gate.gate}
          isSelected={selected?.type === 'gate' && selected.gate.gate === gate.gate}
          isLight={isLight}
          hexagramBaseY={config.hexagramBaseY}
          hexagramY={config.hexagramY}
          hexagramScale={config.hexagramScale}
          gateNumberY={config.gateNumberY}
          gateNumberSize={config.gateNumberSize}
          gateRingNumberY={config.gateRingNumberY}
          baseTextY={config.baseTextY}
          baseTextSize={config.baseTextSize}
          centerMarkerY={config.centerMarkerY}
          centerMarkerScale={config.centerMarkerScale}
          codonTokenY={config.codonTokenY}
          centerInfo={{ ...centerMap[gate.centerId], color: centerColorMap[gate.centerId] }}
          centerGeometry={centerGeometries[gate.centerId]}
          onEnterCorridor={(gateNum) => enterCorridorByGate(gateNum, 'in', 85)}
        />
      ))}
    </group>
  );
}
