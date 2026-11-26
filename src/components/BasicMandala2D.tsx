import { useMemo } from 'react';
import { MANDALA_GATES } from '../data/mandalaData';
import { getActivePlanetList, PLANET_SYMBOLS } from '../engine/hdCalculator';
import { useWorldStore } from '../store/useWorldStore';
import { BodyGraph2DSvg } from './BodyGraph2DSvg';

// 與 3D MandalaRing3D / mandalaData.ts 完全一致的 12 星座順序（從 wheelIndex = 62 水瓶座開始逆時針排列）
const ZODIAC_RING_3D_ORDER: Array<{ name: string; symbol: string }> = [
  { symbol: '♒', name: '水瓶' },
  { symbol: '♓', name: '雙魚' },
  { symbol: '♈', name: '牡羊' },
  { symbol: '♉', name: '金牛' },
  { symbol: '♊', name: '雙子' },
  { symbol: '♋', name: '巨蟹' },
  { symbol: '♌', name: '獅子' },
  { symbol: '♍', name: '處女' },
  { symbol: '♎', name: '天秤' },
  { symbol: '♏', name: '天蠍' },
  { symbol: '♐', name: '射手' },
  { symbol: '♑', name: '魔羯' },
];

const CX = 500;
const CY = 500;
const R_OUTER_HEX = 445;
const R_MID_GATE = 372;
const R_INNER_ZODIAC = 308;
const R_CORE_CIRCLE = 240;

const SECTOR_DEG = 360 / 64; // 5.625°

/** 與 3D MandalaRing3D / mandalaData.ts 完全一致的 wheelIndex → 角度公式 */
function wheelIndexToSvgRad(wheelFloat: number): number {
  return -Math.PI / 2 - ((wheelFloat - 57.5) / 64) * Math.PI * 2;
}

function polar(r: number, rad: number): [number, number] {
  return [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r];
}

function describeArcWedge(rInner: number, rOuter: number, startRad: number, endRad: number): string {
  const [x1, y1] = polar(rOuter, startRad);
  const [x2, y2] = polar(rOuter, endRad);
  const [x3, y3] = polar(rInner, endRad);
  const [x4, y4] = polar(rInner, startRad);
  const sweep = endRad > startRad ? 1 : 0;
  const revSweep = sweep === 1 ? 0 : 1;
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 ${sweep} ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 ${revSweep} ${x4} ${y4} Z`;
}

/**
 * 基礎版 2D 曼陀羅：
 * 最外圈：64 易經卦象（六爻）＋ 啟動星體標記
 * 中間圈：64 閘門阿拉伯數字（點擊可直入 3D 該閘門走廊）
 * 內圈：12 星座符號與中文名（與 3D 曼陀羅完全同源對齊）
 * 正中央：可點擊的 2D 平面人體圖（body-graph.svg）
 */
export function BasicMandala2D() {
  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const theme = useWorldStore((s) => s.theme);
  const setDisplayMode = useWorldStore((s) => s.setDisplayMode);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);

  const isLight = theme === 'light';
  const strokeColor = isLight ? '#94a3b8' : '#334155';
  const textPrimary = isLight ? '#0f172a' : '#f1f5f9';
  const textMuted = isLight ? '#475569' : '#94a3b8';
  const ringBg = isLight ? '#ffffff' : '#0f172a';
  const ringAltBg = isLight ? '#f8fafc' : '#131d33';
  const designColor = '#f2ba79';
  const personalityColor = isLight ? '#1e293b' : '#e2e8f0';

  // 統計每個閘門上有哪些啟動星體（依 viewMode 與 planetToggles 過濾）
  const gateBadges = useMemo(() => {
    const map: Record<number, { d: string[]; p: string[] }> = {};
    if (!chart.design || !chart.personality) return map;
    const activePlanets = getActivePlanetList(planetToggles);
    for (const body of activePlanets) {
      const sym = PLANET_SYMBOLS[body];
      if (viewMode === 0 || viewMode === 1) {
        const g = chart.design[body]?.gate;
        if (g) {
          if (!map[g]) map[g] = { d: [], p: [] };
          map[g].d.push(sym);
        }
      }
      if (viewMode === 2 || viewMode === 1) {
        const g = chart.personality[body]?.gate;
        if (g) {
          if (!map[g]) map[g] = { d: [], p: [] };
          map[g].p.push(sym);
        }
      }
    }
    return map;
  }, [chart.design, chart.personality, viewMode, planetToggles]);

  const halfSectorRad = ((SECTOR_DEG / 2) * Math.PI) / 180;

  return (
    <div className="basic-mandala-wrap">
      <svg viewBox="0 0 1000 1000" className="basic-mandala-svg" role="img" aria-label="基礎版人類設計曼陀羅">
        {/* 背景同心圓環底色 */}
        <circle cx={CX} cy={CY} r={R_OUTER_HEX} fill={ringBg} stroke={strokeColor} strokeWidth={1.6} />
        <circle cx={CX} cy={CY} r={R_MID_GATE} fill={ringAltBg} stroke={strokeColor} strokeWidth={1.4} />
        <circle cx={CX} cy={CY} r={R_INNER_ZODIAC} fill={ringBg} stroke={strokeColor} strokeWidth={1.4} />
        <circle cx={CX} cy={CY} r={R_CORE_CIRCLE} fill={ringAltBg} stroke={strokeColor} strokeWidth={1.6} />

        {/* 內圈：12 星座分隔線與星座符號（完全對齊 3D MandalaRing3D 公式） */}
        {ZODIAC_RING_3D_ORDER.map((z, i) => {
          // 每個閘門中心在 wheelIndex，邊界在 wheelIndex - 0.5；第 i 星座從 idx = i*(64/12) - 2 開始
          const startIdx = i * (64 / 12) - 2 - 0.5;
          const midIdx = (i + 0.5) * (64 / 12) - 2 - 0.5;
          const startRad = wheelIndexToSvgRad(startIdx);
          const midRad = wheelIndexToSvgRad(midIdx);
          const [lx1, ly1] = polar(R_CORE_CIRCLE, startRad);
          const [lx2, ly2] = polar(R_INNER_ZODIAC, startRad);
          const [tx, ty] = polar((R_CORE_CIRCLE + R_INNER_ZODIAC) / 2, midRad);
          const deg = (midRad * 180) / Math.PI + 90;

          return (
            <g key={z.name}>
              <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={strokeColor} strokeWidth={1.1} opacity={0.85} />
              <g transform={`translate(${tx}, ${ty}) rotate(${deg})`}>
                <text
                  y={-5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="20"
                  fill={textPrimary}
                  fontWeight={600}
                >
                  {z.symbol}
                </text>
                <text
                  y={14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11.5"
                  fill={textMuted}
                  fontWeight={600}
                >
                  {z.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* 中間圈（64 閘門阿拉伯數字）＋ 最外圈（64 易經卦象六爻） */}
        {MANDALA_GATES.map((gate) => {
          const a = gate.angleRad;
          const aStart = a + halfSectorRad;
          const aEnd = a - halfSectorRad;
          const badges = gateBadges[gate.gate];
          const hasD = Boolean(badges && badges.d.length > 0);
          const hasP = Boolean(badges && badges.p.length > 0);
          const isActive = hasD || hasP;

          const wedgeFill =
            hasD && hasP
              ? 'rgba(242, 186, 121, 0.34)'
              : hasD
                ? 'rgba(242, 186, 121, 0.28)'
                : hasP
                  ? isLight
                    ? 'rgba(51, 65, 85, 0.14)'
                    : 'rgba(226, 232, 240, 0.18)'
                  : 'transparent';

          const hexLineColor =
            hasD && hasP
              ? '#e07a22'
              : hasD
                ? designColor
                : hasP
                  ? personalityColor
                  : isLight
                    ? '#475569'
                    : '#64748b';

          const [numX, numY] = polar((R_INNER_ZODIAC + R_MID_GATE) / 2, a);
          const [hexX, hexY] = polar((R_MID_GATE + R_OUTER_HEX) / 2, a);
          const [outerX, outerY] = polar(R_OUTER_HEX + 18, a);
          const [divX1, divY1] = polar(R_INNER_ZODIAC, aStart);
          const [divX2, divY2] = polar(R_OUTER_HEX, aStart);
          const rotDeg = (a * 180) / Math.PI + 90;

          return (
            <g
              key={gate.gate}
              className="mandala-gate-sector"
              onClick={() => {
                setDisplayMode('universe-3d');
                enterCorridorByGate(gate.gate, 'in', 85);
              }}
            >
              <title>{`Gate ${gate.gate} · ${gate.ichingName}（${gate.zodiac}）— 點擊進入 3D 走廊`}</title>

              {/* 閘門高亮底色扇形 */}
              <path
                d={describeArcWedge(R_INNER_ZODIAC, R_MID_GATE, aStart, aEnd)}
                fill={wedgeFill}
                stroke="none"
              />

              {/* 64 等分放射分隔線 */}
              <line
                x1={divX1}
                y1={divY1}
                x2={divX2}
                y2={divY2}
                stroke={strokeColor}
                strokeWidth={0.7}
                opacity={0.6}
              />

              {/* 中間圈：閘門阿拉伯數字 */}
              <g transform={`translate(${numX}, ${numY}) rotate(${rotDeg})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isActive ? '14.5' : '12.5'}
                  fontWeight={isActive ? 800 : 600}
                  fill={hasD ? '#c27824' : hasP ? textPrimary : textMuted}
                >
                  {gate.gate}
                </text>
              </g>

              {/* 最外圈：易經六爻卦象（初爻在內、上爻在外） */}
              <g transform={`translate(${hexX}, ${hexY}) rotate(${rotDeg})`}>
                {gate.lines.map((isYang, idx) => {
                  const y = (2.5 - idx) * 5.2;
                  if (isYang === 1) {
                    return (
                      <line
                        key={idx}
                        x1={-11}
                        y1={y}
                        x2={11}
                        y2={y}
                        stroke={hexLineColor}
                        strokeWidth={isActive ? 2.6 : 2}
                        strokeLinecap="round"
                      />
                    );
                  }
                  return (
                    <g key={idx}>
                      <line
                        x1={-11}
                        y1={y}
                        x2={-2.5}
                        y2={y}
                        stroke={hexLineColor}
                        strokeWidth={isActive ? 2.6 : 2}
                        strokeLinecap="round"
                      />
                      <line
                        x1={2.5}
                        y1={y}
                        x2={11}
                        y2={y}
                        stroke={hexLineColor}
                        strokeWidth={isActive ? 2.6 : 2}
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
              </g>

              {/* 最外圍啟動星體符號標記 */}
              {isActive && (
                <text
                  x={outerX}
                  y={outerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="13"
                  fontWeight={700}
                  fill={hasD && !hasP ? '#d98c32' : textPrimary}
                >
                  {[...(badges?.d || []), ...(badges?.p || [])].slice(0, 3).join('')}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 正中央：可點擊的 2D 平面人體圖（body-graph.svg） */}
      <div className="basic-mandala-core">
        <BodyGraph2DSvg className="bodygraph-2d-svg--mandala" />
      </div>
    </div>
  );
}
