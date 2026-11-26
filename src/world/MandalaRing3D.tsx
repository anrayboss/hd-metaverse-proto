import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  CENTERS,
  CenterInfo,
  GateInfo,
  MANDALA_GATES,
  QUADRANT_META,
  RING_RADII,
} from '../data/mandalaData';
import { ENABLE_SUN_GUIDE, useWorldStore } from '../store/useWorldStore';
import { getActivePlanetList, PLANET_SYMBOLS } from '../engine/hdCalculator';
import { useSceneConfigStore } from '../store/useSceneConfigStore';

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
  onEnterCorridor: (gateNumber: number) => void;
}

function CenterMiniMarker({
  shape,
  color,
  position,
  scale,
}: {
  shape: CenterInfo['shape'];
  color: string;
  position: [number, number, number];
  scale: number;
}) {
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

      {/* 第 5 層：所屬中心彩色幾何塊狀體 */}
      <CenterMiniMarker
        shape={centerInfo.shape}
        color={centerInfo.color}
        position={centerPos}
        scale={centerMarkerScale}
      />

      {/* 第 9 層：密碼子環 Token 珠 */}
      <mesh position={codonPos}>
        <sphereGeometry args={[0.75, 12, 12]} />
        <meshStandardMaterial
          color={gate.codonColor}
          emissive={gate.codonColor}
          emissiveIntensity={0.4}
        />
      </mesh>
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

  const discRadius = RING_RADII.hexagram + 3.5;

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

  // 直接繪製於地板頂面的高解析貼圖（純白底 + 各資料環之間的 6 爻小塊填色 + 放射星體符號 + 加粗閘門分隔線）
  const floorTexture = useMemo(() => {
    const size = 2048;
    const half = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const rToPx = (r: number) => (r / discRadius) * half;

    // 1. 3D 地板純白底（深色主題則維持深藍底）
    ctx.fillStyle = isLight ? '#ffffff' : '#0c1324';
    ctx.fillRect(0, 0, size, size);

    // 2. 統計每個 (gate, line) 的定義狀態 & 每個 gate 內的啟動星體清單（嚴格同星體列表順序）
    const activeLines = new Map<string, { d: boolean; p: boolean }>();
    const gatePlanets = new Map<number, Array<{ sym: string; side: 'd' | 'p' }>>();
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
            arr.push({ sym, side: 'd' });
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
            arr.push({ sym, side: 'p' });
            gatePlanets.set(item.gate, arr);
          }
        }
      }
    }

    const activeSet = new Set(chart.activeGates);
    const sectorStep = (Math.PI * 2) / 64;
    const lineStep = sectorStep / 6;
    const rInnerPx = rToPx(RING_RADII.atriumMax);
    const rOuterPx = rToPx(RING_RADII.corridorOuter);

    // 2a. 有定義閘門的柔和走廊底色 #fcf2e4
    ctx.fillStyle = isLight ? '#fcf2e4' : 'rgba(252, 242, 228, 0.14)';
    for (const g of MANDALA_GATES) {
      if (!activeSet.has(g.gate)) continue;
      const a0 = g.angleRad - sectorStep / 2;
      const a1 = g.angleRad + sectorStep / 2;
      ctx.beginPath();
      ctx.arc(half, half, rOuterPx, a0, a1, false);
      ctx.arc(half, half, rInnerPx, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }

    // 2b. 只在各資料環交界（含星座與神格環之間、最外圈數字／象限到卦象之間）的薄環上填上定義爻線小色塊（逆時針 1→6 爻）
    const lineBlockBands: Array<[number, number]> = [
      [34.5, 36.2], // 星體與密碼子環交界
      [48.5, 50.2], // 八卦與星座環交界
      [55.5, 57.2], // 星座與神格環之間
      [62.5, 64.2], // 神格與中心示意環交界
      [76.5, 78.2], // 阿拉伯數字與象限環交界
      [83.5, RING_RADII.corridorOuter], // 象限／數字到卦象之間的 6 爻刻度細環
    ];

    for (const g of MANDALA_GATES) {
      const startAngle = g.angleRad + sectorStep / 2;
      for (let line = 1; line <= 6; line++) {
        const st = activeLines.get(`${g.gate}.${line}`);
        if (!st) continue;
        const aStart = startAngle - (line - 1) * lineStep;
        const aEnd = startAngle - line * lineStep;
        ctx.fillStyle =
          st.d && st.p
            ? '#e07a22'
            : st.d
              ? '#f2ba79'
              : isLight
                ? '#111827'
                : '#e2e8f0';
        for (const [rIn, rOut] of lineBlockBands) {
          ctx.beginPath();
          ctx.arc(half, half, rToPx(rOut), aEnd, aStart, false);
          ctx.arc(half, half, rToPx(rIn), aStart, aEnd, true);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 3a. 最外圈（象限／數字到卦象之間）的 384 條 6 爻細刻度線（開放式不封外圈）
    ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.45)' : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 0.85;
    const rTickInPx = rToPx(83.5);
    for (const g of MANDALA_GATES) {
      const startAngle = g.angleRad + sectorStep / 2;
      for (let line = 1; line < 6; line++) {
        const a = startAngle - line * lineStep;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(half + cos * rTickInPx, half + sin * rTickInPx);
        ctx.lineTo(half + cos * rOuterPx, half + sin * rOuterPx);
        ctx.stroke();
      }
    }

    // 3b. 依每一層資料的實際單位數獨立繪製切塊邊框（透明底色，不讓閘門分割線貫穿內外）：
    //     - 64 塊：星體 (22..34.5)、密碼子環 (34.5..41.5)、中心示意 (62.5..69.5)、阿拉伯數字 (69.5..76.5) + 外圈 6 爻主刻度 (83.5..88)
    //     - 8 塊：八卦 (41.5..48.5)
    //     - 12 塊：星座 (48.5..55.5)
    //     - 16 塊：神格 (55.5..62.5)
    //     - 4 塊：象限 (76.5..83.5)
    const wheelIdxToAngle = (idx: number) => -Math.PI / 2 - ((idx - 57.5) / 64) * Math.PI * 2;
    const drawRadialSegments = (angles: number[], rIn: number, rOut: number, lineW: number) => {
      const pIn = rToPx(rIn);
      const pOut = rToPx(rOut);
      ctx.lineWidth = lineW;
      for (const a of angles) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(half + cos * pIn, half + sin * pIn);
        ctx.lineTo(half + cos * pOut, half + sin * pOut);
        ctx.stroke();
      }
    };

    ctx.strokeStyle = isLight ? 'rgba(51, 65, 85, 0.72)' : 'rgba(148, 163, 184, 0.48)';

    // 64 塊層（閘門分隔線寬度同步調參面板 gateDividerWidth）
    const gateAngles = MANDALA_GATES.map((g) => g.angleRad - sectorStep / 2);
    const bands64: Array<[number, number]> = [
      [RING_RADII.atriumMax, 34.5], // 星體／生理環
      [34.5, 41.5], // 密碼子環
      [62.5, 69.5], // 中心示意環
      [69.5, 76.5], // 阿拉伯數字環
      [83.5, RING_RADII.corridorOuter], // 最外圈 6 爻主刻度
    ];
    for (const [rIn, rOut] of bands64) {
      drawRadialSegments(gateAngles, rIn, rOut, config.gateDividerWidth);
    }

    // 八卦：8 塊（每塊涵蓋 8 個閘門，起於 idx = 4 - 0.5）
    const trigramAngles = Array.from({ length: 8 }, (_, i) => wheelIdxToAngle(i * 8 + 4 - 0.5));
    drawRadialSegments(trigramAngles, 41.5, 48.5, Math.max(2.2, config.gateDividerWidth * 0.9));

    // 星座：12 塊（天蠍／射手交界精準對齊 Gate 14／34 = 52.5）
    const zodiacAngles = Array.from({ length: 12 }, (_, i) =>
      wheelIdxToAngle(i * (64 / 12) - 5 / 6)
    );
    drawRadialSegments(zodiacAngles, 48.5, 55.5, Math.max(2.2, config.gateDividerWidth * 0.9));

    // 神格：16 塊（每塊涵蓋 4 個閘門，起於 idx = 62 - 0.5）
    const godheadAngles = Array.from({ length: 16 }, (_, i) => wheelIdxToAngle(i * 4 + 62 - 0.5));
    drawRadialSegments(godheadAngles, 55.5, 62.5, Math.max(2.0, config.gateDividerWidth * 0.85));

    // 象限：4 塊（每塊涵蓋 16 個閘門，起於 idx = 2 - 0.5）
    const quadrantAngles = Array.from({ length: 4 }, (_, i) => wheelIdxToAngle(i * 16 + 2 - 0.5));
    drawRadialSegments(quadrantAngles, 76.5, 83.5, Math.max(2.6, config.gateDividerWidth));

    // 4. 各層同心圓框線（不封最外圈 R=88，保留通透感）
    const ringDefs = [
      { r: RING_RADII.atriumMax, w: 2.8 },
      { r: 34.5, w: 2.0 },
      { r: 41.5, w: 2.0 },
      { r: 48.5, w: 2.0 },
      { r: 55.5, w: 2.0 },
      { r: 62.5, w: 2.0 },
      { r: 69.5, w: 2.0 },
      { r: 76.5, w: 2.2 },
      { r: 83.5, w: 2.4 },
    ];
    ctx.strokeStyle = isLight ? 'rgba(51, 65, 85, 0.72)' : 'rgba(148, 163, 184, 0.48)';
    for (const ring of ringDefs) {
      ctx.lineWidth = ring.w;
      ctx.beginPath();
      ctx.arc(half, half, rToPx(ring.r), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. 3D 啟動星體符號（同 2D 做法：置於內資料環與中央人體圖之間，依星體列表順序沿放射方向由外向內排列）
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px "Noto Sans TC", "Segoe UI Symbol", sans-serif';
    for (const g of MANDALA_GATES) {
      const list = gatePlanets.get(g.gate);
      if (!list || list.length === 0) continue;
      list.forEach((entry, idx) => {
        const rSym = 32.2 - idx * 2.55;
        if (rSym < 22.8) return;
        const px = half + Math.cos(g.angleRad) * rToPx(rSym);
        const py = half + Math.sin(g.angleRad) * rToPx(rSym);
        ctx.fillStyle = entry.side === 'd' ? '#e59a43' : isLight ? '#0f172a' : '#f1f5f9';
        ctx.fillText(entry.sym, px, py);
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [chart.activeGates, chart.design, chart.personality, viewMode, planetToggles, isLight, discRadius, config.gateDividerWidth]);

  useEffect(() => {
    return () => {
      floorTexture?.dispose();
    };
  }, [floorTexture]);

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
    // 易經八卦（每 8 閘門 1 個）
    for (let i = 0; i < 8; i++) {
      const midIdx = (i * 8 + 4 + 3.5) % 64;
      const g = MANDALA_GATES[Math.floor(midIdx)];
      const a = -Math.PI / 2 - ((midIdx - 57.5) / 64) * Math.PI * 2;
      items.push({ key: `tri-${i}`, text: g.trigram, r: RING_RADII.trigram, angle: a, size: 1.45 });
    }
    return items;
  }, []);

  const labelY = config.ringLabelY;

  return (
    <group>
      {/* 大阪世博大屋根扁平厚實心圓盤底盤（頂面精確切齊 config.floorY） */}
      <mesh geometry={grandRingGeometry} position={[0, config.floorY, 0]} receiveShadow>
        <meshStandardMaterial
          color={isLight ? '#ffffff' : '#0c1324'}
          metalness={isLight ? 0.05 : 0.45}
          roughness={isLight ? 0.85 : 0.45}
        />
      </mesh>

      {/* 直接繪製於地板頂面的曼陀羅貼圖（定義閘門 #fcf2e4 底色 + 64 放射分隔線 + 10 層同心圓） */}
      {floorTexture && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, config.floorY + 0.015, 0]}
          receiveShadow
        >
          <circleGeometry args={[discRadius - 0.05, 128]} />
          {isLight ? (
            <meshBasicMaterial
              map={floorTexture}
              toneMapped={false}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          ) : (
            <meshStandardMaterial
              map={floorTexture}
              roughness={0.88}
              metalness={0.02}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          )}
        </mesh>
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
          centerInfo={centerMap[gate.centerId]}
          onEnterCorridor={(gateNum) => enterCorridorByGate(gateNum, 'in', 85)}
        />
      ))}
    </group>
  );
}
