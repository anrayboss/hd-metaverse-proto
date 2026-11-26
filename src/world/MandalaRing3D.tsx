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

  // 直接繪製於地板頂面的高解析貼圖：包含定義閘門底色 (#fcf2e4)、64 等分放射分隔線與 10 層同心圓線
  const floorTexture = useMemo(() => {
    const size = 2048;
    const half = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const rToPx = (r: number) => (r / discRadius) * half;

    // 1. 地板底色
    ctx.fillStyle = isLight ? '#ffffff' : '#0c1324';
    ctx.fillRect(0, 0, size, size);

    // 2. 跑圖有定義（啟動）的閘門走廊填上底色 #fcf2e4
    const activeSet = new Set(chart.activeGates);
    const sectorStep = (Math.PI * 2) / 64;
    const rInnerPx = rToPx(RING_RADII.atriumMax);
    const rOuterPx = rToPx(RING_RADII.corridorOuter);

    ctx.fillStyle = isLight ? '#fcf2e4' : 'rgba(252, 242, 228, 0.16)';
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

    // 3. 64 等分 1/64 閘門放射分隔線（從 R=22 貫穿至 R=88）
    ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.52)' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.6;
    for (const g of MANDALA_GATES) {
      const boundaryAngle = g.angleRad - sectorStep / 2;
      const cos = Math.cos(boundaryAngle);
      const sin = Math.sin(boundaryAngle);
      ctx.beginPath();
      ctx.moveTo(half + cos * rInnerPx, half + sin * rInnerPx);
      ctx.lineTo(half + cos * rOuterPx, half + sin * rOuterPx);
      ctx.stroke();
    }

    // 4. 10 層同心圓清晰分隔線
    const ringDefs = [
      { r: RING_RADII.atriumMax, w: 2.8 },
      { r: 34.5, w: 1.8 },
      { r: 41.5, w: 1.8 },
      { r: 48.5, w: 1.8 },
      { r: 55.5, w: 1.8 },
      { r: 62.5, w: 1.8 },
      { r: 69.5, w: 1.8 },
      { r: 76.5, w: 2.2 },
      { r: 83.5, w: 2.4 },
      { r: RING_RADII.corridorOuter, w: 2.4 },
    ];
    ctx.strokeStyle = isLight ? 'rgba(71, 85, 105, 0.68)' : 'rgba(148, 163, 184, 0.45)';
    for (const ring of ringDefs) {
      ctx.lineWidth = ring.w;
      ctx.beginPath();
      ctx.arc(half, half, rToPx(ring.r), 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [chart.activeGates, isLight, discRadius]);

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
    // 十二星座（每 ~5.33 閘門 1 個）
    for (let i = 0; i < 12; i++) {
      const midIdx = ((i + 0.5) * (64 / 12) - 2 + 64) % 64;
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
          <meshStandardMaterial
            map={floorTexture}
            roughness={0.88}
            metalness={0.02}
            polygonOffset
            polygonOffsetFactor={-1}
          />
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
