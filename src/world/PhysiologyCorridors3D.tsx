import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
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
import { useSceneConfigStore } from '../store/useSceneConfigStore';

const SECTOR_ANGLE = (Math.PI * 2) / 64; // 5.625°

/**
 * 可直接點擊的隧道側牆：點擊左牆或右牆直接切換至該側鄰近閘門走廊（取代懸浮箭頭）
 */
function ClickableCorridorWall({
  wallAngle,
  corridorMidR,
  corridorLength,
  wallHeight,
  wallOpacity,
  floorY,
  corridorRadius,
  dirSign,
  targetGateNumber,
  isLight,
  onSwitch,
}: {
  wallAngle: number;
  corridorMidR: number;
  corridorLength: number;
  wallHeight: number;
  wallOpacity: number;
  floorY: number;
  corridorRadius: number;
  dirSign: number;
  targetGateNumber: number;
  isLight: boolean;
  onSwitch: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  // 提示文字跟著玩家視線前方附著在牆面上
  const hintR = Math.max(
    RING_RADII.corridorInner + 3,
    Math.min(RING_RADII.corridorOuter - 3, corridorRadius + dirSign * 7.5)
  );
  const localHintX = hintR - corridorMidR;

  const baseColor = hovered ? '#f59e0b' : isLight ? '#0284c7' : '#7dd3fc';
  const emissiveColor = hovered ? '#d97706' : '#0284c7';

  return (
    <group
      position={[
        Math.cos(wallAngle) * corridorMidR,
        floorY + wallHeight / 2,
        Math.sin(wallAngle) * corridorMidR,
      ]}
      rotation={[0, -wallAngle, 0]}
    >
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSwitch();
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
        <planeGeometry args={[corridorLength, wallHeight]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={hovered ? 0.75 : isLight ? 0.2 : 0.45}
          transparent
          opacity={hovered ? Math.min(0.42, wallOpacity + 0.18) : wallOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, wallHeight / 2, 0]}>
        <boxGeometry args={[corridorLength, 0.12, 0.12]} />
        <meshBasicMaterial
          color={hovered ? '#f59e0b' : isLight ? '#0284c7' : '#7dd3fc'}
          transparent
          opacity={hovered ? 1 : 0.85}
        />
      </mesh>
      {hovered && (
        <Billboard position={[localHintX, 0.2, 0]} follow>
          <Text
            fontSize={0.46}
            color={isLight ? '#b45309' : '#fef08a'}
            outlineWidth={0.04}
            outlineColor={isLight ? '#ffffff' : '#05070e'}
            fontWeight={700}
          >
            {`點擊切換 → Gate ${targetGateNumber}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/**
 * 單一閘門完整 1/64 走廊內的 8 大立體物件站點（In：象限→數字→中心塊狀體→神格→星座→八卦→密碼子環 Token→生理對應→人體圖；Out 相反）
 */
function CorridorStations({
  gate,
  centerInfo,
  isLight,
}: {
  gate: GateInfo;
  centerInfo: CenterInfo;
  isLight: boolean;
}) {
  const tokenRef = useRef<THREE.Mesh>(null);
  const centerBlockRef = useRef<THREE.Mesh>(null);

  const cosA = Math.cos(gate.angleRad);
  const sinA = Math.sin(gate.angleRad);
  const rotY = -gate.angleRad + Math.PI / 2;

  const atR = (r: number, y: number): [number, number, number] => [cosA * r, y, sinA * r];

  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const outlineColor = isLight ? '#ffffff' : '#05070e';
  const quadMeta = QUADRANT_META[gate.quadrant];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (tokenRef.current) {
      tokenRef.current.rotation.y = t * 1.1;
      tokenRef.current.rotation.x = t * 0.6;
    }
    if (centerBlockRef.current) {
      centerBlockRef.current.rotation.y = Math.sin(t * 0.9) * 0.35;
    }
  });

  const centerRotZ =
    centerInfo.shape === 'triangle-down'
      ? Math.PI
      : centerInfo.shape === 'triangle-left'
        ? Math.PI / 2
        : centerInfo.shape === 'triangle-right'
          ? -Math.PI / 2
          : 0;

  return (
    <group>
      {/* 1. 象限立體拱門 (R = 80) */}
      <group position={atR(RING_RADII.quadrant, 0)} rotation={[0, rotY, 0]}>
        <mesh position={[-2.6, 2.5, 0]}>
          <boxGeometry args={[0.25, 5.0, 0.25]} />
          <meshStandardMaterial color={quadMeta.color} emissive={quadMeta.color} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[2.6, 2.5, 0]}>
          <boxGeometry args={[0.25, 5.0, 0.25]} />
          <meshStandardMaterial color={quadMeta.color} emissive={quadMeta.color} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 5.0, 0]}>
          <boxGeometry args={[5.45, 0.28, 0.3]} />
          <meshStandardMaterial color={quadMeta.color} emissive={quadMeta.color} emissiveIntensity={0.4} />
        </mesh>
        <Billboard position={[0, 3.85, 0]} follow>
          <Text fontSize={0.62} color={quadMeta.color} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {quadMeta.name}
          </Text>
        </Billboard>
      </group>

      {/* 2. 立體閘門數字 (R = 73) */}
      <group position={atR(RING_RADII.gateNumber, 2.7)}>
        <Billboard follow>
          <Text
            fontSize={2.1}
            color={isLight ? '#0f172a' : '#fef08a'}
            outlineWidth={0.08}
            outlineColor={outlineColor}
            fontWeight={800}
          >
            {String(gate.gate)}
          </Text>
        </Billboard>
        <Billboard position={[0, -1.35, 0]} follow>
          <Text fontSize={0.42} color={textColor} outlineWidth={0.03} outlineColor={outlineColor}>
            {`Gate ${gate.gate} · ${gate.ichingName}`}
          </Text>
        </Billboard>
      </group>

      {/* 3. 中心立體塊狀體 (R = 66) */}
      <group position={atR(RING_RADII.centerBlock, 2.5)}>
        <mesh ref={centerBlockRef} rotation={[0, 0, centerRotZ]}>
          {centerInfo.shape === 'diamond' ? (
            <octahedronGeometry args={[1.15, 0]} />
          ) : centerInfo.shape === 'square' ? (
            <boxGeometry args={[1.5, 1.5, 0.9]} />
          ) : (
            <coneGeometry args={[1.1, 1.5, 3]} />
          )}
          <meshStandardMaterial
            color={centerInfo.color}
            emissive={centerInfo.color}
            emissiveIntensity={0.55}
            metalness={0.25}
            roughness={0.3}
          />
        </mesh>
        <Billboard position={[0, 1.45, 0]} follow>
          <Text fontSize={0.54} color={textColor} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {centerInfo.name}
          </Text>
        </Billboard>
      </group>

      {/* 4. 十六神格立體石碑 (R = 59) */}
      <group position={atR(RING_RADII.godhead, 0)} rotation={[0, rotY, 0]}>
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[2.1, 3.4, 0.22]} />
          <meshStandardMaterial
            color={isLight ? '#e2e8f0' : '#1e293b'}
            transparent
            opacity={0.78}
            metalness={0.2}
          />
        </mesh>
        <Billboard position={[0, 2.5, 0]} follow>
          <Text fontSize={0.62} color={isLight ? '#6d28d9' : '#ddd6fe'} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {`神格｜${gate.godhead}`}
          </Text>
        </Billboard>
      </group>

      {/* 5. 十二星座立體環標 (R = 52) */}
      <group position={atR(RING_RADII.zodiac, 2.7)} rotation={[0, rotY, 0]}>
        <mesh>
          <torusGeometry args={[1.35, 0.08, 12, 36]} />
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.5} />
        </mesh>
        <Billboard follow>
          <Text fontSize={0.58} color={isLight ? '#0369a1' : '#7dd3fc'} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {`星座｜${gate.zodiac}`}
          </Text>
        </Billboard>
      </group>

      {/* 6. 易經八卦立體牌 (R = 45) */}
      <group position={atR(RING_RADII.trigram, 2.6)} rotation={[0, rotY, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.16, 8]} />
          <meshStandardMaterial color="#d97706" emissive="#d97706" emissiveIntensity={0.35} transparent opacity={0.65} />
        </mesh>
        <Billboard position={[0, 0.45, 0]} follow>
          <Text fontSize={0.56} color={isLight ? '#b45309' : '#fde68a'} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {`八卦｜${gate.trigram}`}
          </Text>
        </Billboard>
      </group>

      {/* 7. 密碼子環代表 Token (R = 38) */}
      <group position={atR(RING_RADII.codonToken, 2.5)}>
        <mesh ref={tokenRef}>
          <dodecahedronGeometry args={[0.92, 0]} />
          <meshStandardMaterial
            color={gate.codonColor}
            emissive={gate.codonColor}
            emissiveIntensity={0.65}
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>
        <Billboard position={[0, 1.4, 0]} follow>
          <Text fontSize={0.52} color={gate.codonColor} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {`密碼子環｜${gate.codonRing}`}
          </Text>
        </Billboard>
      </group>

      {/* 8. 生理對應立體空間站 (R = 30) */}
      <group position={atR(RING_RADII.physiology, 0)} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[2.0, 0.35, 3.6]} />
          <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.4} transparent opacity={0.55} />
        </mesh>
        <Billboard position={[0, 2.5, 0]} follow>
          <Text fontSize={0.54} color={isLight ? '#be185d' : '#fbcfe8'} outlineWidth={0.04} outlineColor={outlineColor} fontWeight={700}>
            {`生理對應｜${gate.physiology}`}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

/**
 * 64 條完整 1/64 曼陀羅閘門走廊（從 R=22 貫穿至 R=88，直接點擊左右側牆壁切換鄰近閘門）
 */
export function PhysiologyCorridors3D() {
  const theme = useWorldStore((s) => s.theme);
  const config = useSceneConfigStore((s) => s.config);
  const wallHeight = config.corridorWallHeight;
  const isLight = theme === 'light';
  const stage = useWorldStore((s) => s.stage);
  const chart = useWorldStore((s) => s.chart);
  const activeCorridorIndex = useWorldStore((s) => s.activeCorridorIndex);
  const corridorRadius = useWorldStore((s) => s.corridorRadius);
  const corridorDirection = useWorldStore((s) => s.corridorDirection);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);
  const switchAdjacentCorridor = useWorldStore((s) => s.switchAdjacentCorridor);

  const centerMap = useMemo(() => Object.fromEntries(CENTERS.map((c) => [c.id, c])), []);

  const corridorLength = RING_RADII.corridorOuter - RING_RADII.corridorInner; // 66m 完整貫穿
  const corridorMidR = (RING_RADII.corridorInner + RING_RADII.corridorOuter) / 2; // 55m

  // 完整 1/64 扇形底板（鳥瞰點任意一份空間皆可進入走廊）
  const fullWedgeFloorGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const half = SECTOR_ANGLE / 2 - 0.0015;
    shape.absarc(0, 0, RING_RADII.corridorOuter - 0.2, -half, half, false);
    shape.absarc(0, 0, RING_RADII.corridorInner + 0.2, half, -half, true);
    shape.closePath();

    const geom = new THREE.ShapeGeometry(shape, 4);
    geom.rotateX(Math.PI / 2);
    return geom;
  }, []);

  const isInCorridor = stage === 'corridor' || stage === 'black-sun';
  const activeGate = MANDALA_GATES[activeCorridorIndex];
  const prevGate = MANDALA_GATES[(activeCorridorIndex - 1 + 64) % 64];
  const nextGate = MANDALA_GATES[(activeCorridorIndex + 1) % 64];

  // 兩側物理透明牆（直接點擊該側牆壁即切往該側相鄰閘門）
  const minusWallAngle = activeGate.angleRad - SECTOR_ANGLE / 2;
  const plusWallAngle = activeGate.angleRad + SECTOR_ANGLE / 2;
  const dirSign = corridorDirection === 'in' ? -1 : 1;

  return (
    <group>
      {/* 64 份完整 1/64 扇形空間（點擊任意一份直接進入該閘門走廊） */}
      {MANDALA_GATES.map((gate) => {
        const isActive = isInCorridor && gate.wheelIndex === activeCorridorIndex;
        const isRed = gate.gate === chart.redSun.gate;
        const isBlack = gate.gate === chart.blackSun.gate;
        const color = isActive
          ? '#0284c7'
          : isRed
            ? '#ef4444'
            : isBlack
              ? '#f59e0b'
              : QUADRANT_META[gate.quadrant].color;
        const opacity = isActive ? 0.22 : isRed || isBlack ? 0.16 : 0.025;

        return (
          <mesh
            key={gate.gate}
            geometry={fullWedgeFloorGeometry}
            position={[0, config.floorY + 0.04, 0]}
            rotation={[0, -gate.angleRad, 0]}
            onClick={(e) => {
              e.stopPropagation();
              enterCorridorByGate(gate.gate, 'in', 85);
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isActive ? 0.45 : isRed || isBlack ? 0.3 : 0.05}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* 進入走廊時：兩側可點擊切換的透明牆壁 + 8 大立體物件站點 */}
      {isInCorridor && (
        <group>
          <ClickableCorridorWall
            wallAngle={minusWallAngle}
            corridorMidR={corridorMidR}
            corridorLength={corridorLength}
            wallHeight={wallHeight}
            wallOpacity={config.corridorWallOpacity}
            floorY={config.floorY}
            corridorRadius={corridorRadius}
            dirSign={dirSign}
            targetGateNumber={prevGate.gate}
            isLight={isLight}
            onSwitch={() => switchAdjacentCorridor(-1)}
          />
          <ClickableCorridorWall
            wallAngle={plusWallAngle}
            corridorMidR={corridorMidR}
            corridorLength={corridorLength}
            wallHeight={wallHeight}
            wallOpacity={config.corridorWallOpacity}
            floorY={config.floorY}
            corridorRadius={corridorRadius}
            dirSign={dirSign}
            targetGateNumber={nextGate.gate}
            isLight={isLight}
            onSwitch={() => switchAdjacentCorridor(1)}
          />

          {/* 8 大立體站點（象限 → 數字 → 中心塊狀體 → 神格 → 星座 → 八卦 → 密碼子環 Token → 生理對應） */}
          <group scale={[1, config.corridorStationScale, 1]}>
            <CorridorStations
              gate={activeGate}
              centerInfo={centerMap[activeGate.centerId]}
              isLight={isLight}
            />
          </group>
        </group>
      )}
    </group>
  );
}
