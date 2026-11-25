import { useMemo, useRef, useState } from 'react';
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
import { useWorldStore } from '../store/useWorldStore';

interface GateHexagramProps {
  gate: GateInfo;
  isRedSun: boolean;
  isBlackSun: boolean;
  isSelected: boolean;
  isLight: boolean;
  centerInfo: CenterInfo;
  onEnterCorridor: (gateNumber: number) => void;
}

function CenterMiniMarker({
  shape,
  color,
  position,
}: {
  shape: CenterInfo['shape'];
  color: string;
  position: [number, number, number];
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
    <mesh position={position} rotation={[0, 0, rotZ]}>
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
  centerInfo,
  onEnterCorridor,
}: GateHexagramProps) {
  const portalRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const cosA = Math.cos(gate.angleRad);
  const sinA = Math.sin(gate.angleRad);

  const hexPos: [number, number, number] = [cosA * RING_RADII.hexagram, 0.25, sinA * RING_RADII.hexagram];
  const basePos: [number, number, number] = [cosA * RING_RADII.base, 0.4, sinA * RING_RADII.base];
  const numPos: [number, number, number] = [cosA * RING_RADII.gateNumber, 1.4, sinA * RING_RADII.gateNumber];
  const centerPos: [number, number, number] = [cosA * RING_RADII.centerBlock, 0.6, sinA * RING_RADII.centerBlock];
  const codonPos: [number, number, number] = [cosA * RING_RADII.codonToken, 0.6, sinA * RING_RADII.codonToken];

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

  const isSpecial = isRedSun || isBlackSun;

  useFrame((state) => {
    if (portalRingRef.current) {
      portalRingRef.current.rotation.z = state.clock.elapsedTime * (isRedSun ? 0.65 : -0.65);
    }
  });

  return (
    <group>
      {/* 外環第 2 層：易經 64 卦象（全填滿點擊區 + Billboard 永遠正對鏡頭） */}
      <group position={hexPos}>
        <Billboard position={[0, 1.75, 0]} follow>
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
        </Billboard>

        {/* 卦象上方立體閘門數字（Billboard 永遠正對鏡頭） */}
        <Billboard position={[0, 4.3, 0]} follow>
          <Text
            fontSize={isSpecial ? 1.85 : hovered || isSelected ? 1.65 : 1.35}
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
          fontSize={1.15}
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
          fontSize={1.55}
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
      <CenterMiniMarker shape={centerInfo.shape} color={centerInfo.color} position={centerPos} />

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
  const isLight = theme === 'light';

  const centerMap = useMemo(() => Object.fromEntries(CENTERS.map((c) => [c.id, c])), []);

  // 實心圓盤（中間不挖空，避免從下方看到人體圖背面）且整體降低，確保不切到任何物件
  const grandRingGeometry = useMemo(() => {
    const outer = new THREE.Shape();
    outer.absarc(0, 0, RING_RADII.hexagram + 3.5, 0, Math.PI * 2, false);

    const geom = new THREE.ExtrudeGeometry(outer, {
      depth: 2.6,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.2,
      bevelSegments: 2,
      curveSegments: 96,
    });
    geom.rotateX(Math.PI / 2);
    return geom;
  }, []);

  // 10 層同心圓清晰分界線（對齊海報鳥瞰視角）
  const concentricRings = useMemo(
    () => [
      { r: RING_RADII.atriumMax, w: 0.35 },
      { r: 34.5, w: 0.22 },
      { r: 41.5, w: 0.22 },
      { r: 48.5, w: 0.22 },
      { r: 55.5, w: 0.22 },
      { r: 62.5, w: 0.22 },
      { r: 69.5, w: 0.22 },
      { r: 76.5, w: 0.28 },
      { r: 83.5, w: 0.32 },
    ],
    []
  );

  // 64 條完整放射分界線（從 R=22 貫穿至 R=88，清楚標出每份 1/64 閘門空間）
  const sectorDividers = useMemo(() => {
    const sectorStep = (Math.PI * 2) / 64;
    const len = RING_RADII.corridorOuter - RING_RADII.corridorInner;
    const midR = (RING_RADII.corridorOuter + RING_RADII.corridorInner) / 2;
    return MANDALA_GATES.map((g) => {
      const boundaryAngle = g.angleRad - sectorStep / 2;
      return {
        key: g.gate,
        pos: [Math.cos(boundaryAngle) * midR, 0.08, Math.sin(boundaryAngle) * midR] as [
          number,
          number,
          number,
        ],
        rotY: -boundaryAngle,
        len,
      };
    });
  }, []);

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
    // 易經八卦（每 8 閘門 1 個）
    for (let i = 0; i < 8; i++) {
      const midIdx = (i * 8 + 4 + 3.5) % 64;
      const g = MANDALA_GATES[Math.floor(midIdx)];
      const a = -Math.PI / 2 - ((midIdx - 57.5) / 64) * Math.PI * 2;
      items.push({ key: `tri-${i}`, text: g.trigram, r: RING_RADII.trigram, angle: a, size: 1.45 });
    }
    return items;
  }, []);

  return (
    <group>
      {/* 大阪世博大屋根扁平厚實心圓盤底盤（降低至 y = -0.35 避免切到上方物件） */}
      <mesh geometry={grandRingGeometry} position={[0, -0.35, 0]} receiveShadow>
        <meshStandardMaterial
          color={isLight ? '#ffffff' : '#0c1324'}
          metalness={isLight ? 0.05 : 0.45}
          roughness={isLight ? 0.85 : 0.45}
        />
      </mesh>

      {/* 10 層同心圓清晰分界線 */}
      {concentricRings.map((ring, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
          <ringGeometry args={[ring.r - ring.w / 2, ring.r + ring.w / 2, 128]} />
          <meshBasicMaterial
            color={isLight ? '#64748b' : '#475569'}
            transparent
            opacity={isLight ? 0.65 : 0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* 64 等分 1/64 閘門放射分界線 */}
      {sectorDividers.map((s) => (
        <mesh key={s.key} position={s.pos} rotation={[0, s.rotY, 0]}>
          <boxGeometry args={[s.len, 0.06, 0.14]} />
          <meshBasicMaterial
            color={isLight ? '#94a3b8' : '#334155'}
            transparent
            opacity={isLight ? 0.55 : 0.4}
          />
        </mesh>
      ))}

      {/* 鳥瞰圖象限／神格／八卦環文字 */}
      {ringLabels.map((lbl) => (
        <Text
          key={lbl.key}
          position={[Math.cos(lbl.angle) * lbl.r, 0.16, Math.sin(lbl.angle) * lbl.r]}
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
          isRedSun={chart.redSun.gate === gate.gate}
          isBlackSun={chart.blackSun.gate === gate.gate}
          isSelected={selected?.type === 'gate' && selected.gate.gate === gate.gate}
          isLight={isLight}
          centerInfo={centerMap[gate.centerId]}
          onEnterCorridor={(gateNum) => enterCorridorByGate(gateNum, 'in', 85)}
        />
      ))}
    </group>
  );
}
