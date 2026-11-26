import { useMemo } from 'react';
import { MANDALA_GATES } from '../data/mandalaData';
import { getActivePlanetList, PLANET_SYMBOLS } from '../engine/hdCalculator';
import { useSceneConfigStore } from '../store/useSceneConfigStore';
import { useWorldStore } from '../store/useWorldStore';
import { BodyGraph2DSvg } from './BodyGraph2DSvg';

// 與 3D MandalaRing3D 完全同源：天蠍與射手交界精準對齊 Gate 14 (52) 與 Gate 34 (53) 交界 (52.5)
const ZODIAC_RING_3D_ORDER: Array<{ name: string; symbol: string; bandColor: string }> = [
  { symbol: '♒', name: '水瓶', bandColor: '#a8c97f' },
  { symbol: '♓', name: '雙魚', bandColor: '#8faec9' },
  { symbol: '♈', name: '牡羊', bandColor: '#df8888' },
  { symbol: '♉', name: '金牛', bandColor: '#a98d73' },
  { symbol: '♊', name: '雙子', bandColor: '#a8c97f' },
  { symbol: '♋', name: '巨蟹', bandColor: '#8faec9' },
  { symbol: '♌', name: '獅子', bandColor: '#df8888' },
  { symbol: '♍', name: '處女', bandColor: '#a98d73' },
  { symbol: '♎', name: '天秤', bandColor: '#a8c97f' },
  { symbol: '♏', name: '天蠍', bandColor: '#8faec9' },
  { symbol: '♐', name: '射手', bandColor: '#df8888' },
  { symbol: '♑', name: '魔羯', bandColor: '#a98d73' },
];

const CX = 500;
const CY = 500;
const R_HEX_CENTER = 468; // 最外圈易經卦象（不加外框或包覆線）
const R_TICK_OUTER = 434; // 6 爻放射線延伸至阿拉伯數字與卦象之間
const R_GATE_OUTER = 420; // 阿拉伯數字圈外緣
const R_GATE_INNER = 368; // 阿拉伯數字圈內緣 / 星座圈外緣
const R_ZODIAC_INNER = 324; // 星座圈內緣
const R_PLANET_MARK = 300; // 啟動星體符號位置（星座內側）

const SECTOR_RAD = (Math.PI * 2) / 64; // 5.625°
const LINE_RAD = SECTOR_RAD / 6; // 0.9375°

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

function describePieWedge(rOuter: number, startRad: number, endRad: number): string {
  const [x1, y1] = polar(rOuter, startRad);
  const [x2, y2] = polar(rOuter, endRad);
  const sweep = endRad > startRad ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 ${sweep} ${x2} ${y2} Z`;
}

/**
 * 基礎版 2D 曼陀羅：
 * - 最外圈：64 易經卦象（乾淨懸浮於最外圍，無外圓框與包覆線）
 * - 384 條 6 等分爻線放射線從圓心延伸至阿拉伯數字與卦象之間（逆時針 1→6 爻），有定義的閘門爻線填色
 * - 64 條閘門分隔線寬度同步連動前端調參面板 gateDividerWidth
 * - 內圈：12 星座彩色環（天蠍／射手交界精準重疊 Gate 14／34 交界）
 * - 正中央：可點擊的 2D 平面人體圖（body-graph.svg）
 */
export function BasicMandala2D() {
  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const theme = useWorldStore((s) => s.theme);
  const gateDividerWidth = useSceneConfigStore((s) => s.config.gateDividerWidth);
  const setDisplayMode = useWorldStore((s) => s.setDisplayMode);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);

  const isLight = theme === 'light';
  const strokeColor = isLight ? '#94a3b8' : '#334155';
  const lineTickColor = isLight ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.2)';
  const textPrimary = isLight ? '#0f172a' : '#f1f5f9';
  const textMuted = isLight ? '#475569' : '#94a3b8';
  const innerBg = isLight ? '#ffffff' : '#0f172a';
  const gateDividerStroke = Math.max(0.6, gateDividerWidth * 0.45);

  // 統計每個 (gate, line) 的啟動星體（依 viewMode 與 planetToggles 動態更新）
  const activeLineMap = useMemo(() => {
    const map = new Map<string, { d: string[]; p: string[] }>();
    if (!chart.design || !chart.personality) return map;
    const activePlanets = getActivePlanetList(planetToggles);
    for (const body of activePlanets) {
      const sym = PLANET_SYMBOLS[body];
      if (viewMode === 0 || viewMode === 1) {
        const item = chart.design[body];
        if (item) {
          const key = `${item.gate}.${item.line}`;
          const cur = map.get(key) || { d: [], p: [] };
          cur.d.push(sym);
          map.set(key, cur);
        }
      }
      if (viewMode === 2 || viewMode === 1) {
        const item = chart.personality[body];
        if (item) {
          const key = `${item.gate}.${item.line}`;
          const cur = map.get(key) || { d: [], p: [] };
          cur.p.push(sym);
          map.set(key, cur);
        }
      }
    }
    return map;
  }, [chart.design, chart.personality, viewMode, planetToggles]);

  const activeGateSet = useMemo(() => new Set(chart.activeGates), [chart.activeGates]);

  return (
    <div className="basic-mandala-wrap">
      <svg viewBox="0 0 1000 1000" className="basic-mandala-svg" role="img" aria-label="基礎版人類設計曼陀羅">
        {/* 內圓背景（只包到阿拉伯數字圈外緣，最外圈卦象不加外圓框） */}
        <circle cx={CX} cy={CY} r={R_GATE_OUTER} fill={innerBg} stroke={strokeColor} strokeWidth={1.3} />

        {/* 1. 有定義的閘門爻線填色（從圓心延伸至阿拉伯數字圈外緣，每閘門 6 等份逆時針 1→6 爻） */}
        {MANDALA_GATES.map((gate) => {
          const startAngle = gate.angleRad + SECTOR_RAD / 2;
          return [1, 2, 3, 4, 5, 6].map((line) => {
            const st = activeLineMap.get(`${gate.gate}.${line}`);
            if (!st) return null;
            const hasD = st.d.length > 0;
            const hasP = st.p.length > 0;
            const a0 = startAngle - (line - 1) * LINE_RAD;
            const a1 = startAngle - line * LINE_RAD;
            const fill =
              hasD && hasP
                ? 'rgba(224, 122, 34, 0.34)'
                : hasD
                  ? 'rgba(242, 186, 121, 0.36)'
                  : isLight
                    ? 'rgba(100, 116, 139, 0.2)'
                    : 'rgba(203, 213, 225, 0.22)';
            return (
              <path
                key={`line-fill-${gate.gate}-${line}`}
                d={describePieWedge(R_GATE_OUTER, a1, a0)}
                fill={fill}
                stroke="none"
              />
            );
          });
        })}

        {/* 2. 384 條 6 等分爻線放射線（從圓心拉出並延伸至阿拉伯數字與卦象之間） */}
        {MANDALA_GATES.map((gate) => {
          const startAngle = gate.angleRad + SECTOR_RAD / 2;
          return [1, 2, 3, 4, 5].map((line) => {
            const a = startAngle - line * LINE_RAD;
            const [x2, y2] = polar(R_TICK_OUTER, a);
            return (
              <line
                key={`line-ray-${gate.gate}-${line}`}
                x1={CX}
                y1={CY}
                x2={x2}
                y2={y2}
                stroke={lineTickColor}
                strokeWidth={0.55}
              />
            );
          });
        })}

        {/* 3. 64 條閘門分隔線（從圓心延伸至阿拉伯數字與卦象之間，寬度同步調參面板 gateDividerWidth） */}
        {MANDALA_GATES.map((gate) => {
          const a = gate.angleRad + SECTOR_RAD / 2;
          const [x2, y2] = polar(R_TICK_OUTER, a);
          return (
            <line
              key={`gate-div-${gate.gate}`}
              x1={CX}
              y1={CY}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={gateDividerStroke}
              opacity={0.78}
            />
          );
        })}

        {/* 4. 內圈：12 星座彩色環（天蠍與射手交界精準對齊 Gate 14 與 Gate 34 交界） */}
        {ZODIAC_RING_3D_ORDER.map((z, i) => {
          const startIdx = i * (64 / 12) - 5 / 6;
          const endIdx = (i + 1) * (64 / 12) - 5 / 6;
          const midIdx = (i + 0.5) * (64 / 12) - 5 / 6;
          const startRad = wheelIndexToSvgRad(startIdx);
          const endRad = wheelIndexToSvgRad(endIdx);
          const midRad = wheelIndexToSvgRad(midIdx);
          const [tx, ty] = polar((R_ZODIAC_INNER + R_GATE_INNER) / 2, midRad);
          const deg = (midRad * 180) / Math.PI + 90;

          return (
            <g key={z.name}>
              <path
                d={describeArcWedge(R_ZODIAC_INNER, R_GATE_INNER, endRad, startRad)}
                fill={z.bandColor}
                fillOpacity={isLight ? 0.88 : 0.65}
                stroke={isLight ? '#ffffff' : '#0f172a'}
                strokeWidth={1.2}
              />
              <g transform={`translate(${tx}, ${ty}) rotate(${deg})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="15.5"
                  fill="#ffffff"
                  fontWeight={700}
                >
                  {`${z.symbol} ${z.name}`}
                </text>
              </g>
            </g>
          );
        })}

        {/* 數字圈內外圓邊線（不包覆最外圈易經卦象） */}
        <circle cx={CX} cy={CY} r={R_GATE_OUTER} fill="none" stroke={strokeColor} strokeWidth={1.3} />
        <circle cx={CX} cy={CY} r={R_GATE_INNER} fill="none" stroke={strokeColor} strokeWidth={1.2} />
        <circle cx={CX} cy={CY} r={R_ZODIAC_INNER} fill="none" stroke={strokeColor} strokeWidth={1.2} />

        {/* 5. 啟動星體符號（精準對齊該閘門爻線角度，置於星座環內側） */}
        {MANDALA_GATES.map((gate) => {
          const startAngle = gate.angleRad + SECTOR_RAD / 2;
          return [1, 2, 3, 4, 5, 6].map((line) => {
            const st = activeLineMap.get(`${gate.gate}.${line}`);
            if (!st) return null;
            const midA = startAngle - (line - 0.5) * LINE_RAD;
            const allSyms: Array<{ sym: string; side: 'd' | 'p' }> = [
              ...st.d.map((s) => ({ sym: s, side: 'd' as const })),
              ...st.p.map((s) => ({ sym: s, side: 'p' as const })),
            ];
            return allSyms.map((entry, idx) => {
              const [px, py] = polar(R_PLANET_MARK - idx * 20, midA);
              return (
                <text
                  key={`sym-${gate.gate}-${line}-${entry.side}-${idx}`}
                  x={px}
                  y={py}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="17"
                  fontWeight={700}
                  fill={entry.side === 'd' ? '#e59a43' : textPrimary}
                >
                  {entry.sym}
                </text>
              );
            });
          });
        })}

        {/* 6. 中間圈（64 閘門阿拉伯數字）＋ 最外圈（無外框包覆的 64 易經卦象） */}
        {MANDALA_GATES.map((gate) => {
          const a = gate.angleRad;
          const isActive = activeGateSet.has(gate.gate);
          const [numX, numY] = polar((R_GATE_INNER + R_GATE_OUTER) / 2, a);
          const [hexX, hexY] = polar(R_HEX_CENTER, a);
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

              {/* 透明點擊扇形（涵蓋數字與最外圈卦象） */}
              <path
                d={describeArcWedge(R_GATE_INNER, R_HEX_CENTER + 24, a - SECTOR_RAD / 2, a + SECTOR_RAD / 2)}
                fill="transparent"
              />

              {/* 中間圈：閘門阿拉伯數字 */}
              <g transform={`translate(${numX}, ${numY}) rotate(${rotDeg})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isActive ? '15.5' : '13.5'}
                  fontWeight={isActive ? 800 : 600}
                  fill={isActive ? textPrimary : textMuted}
                >
                  {gate.gate}
                </text>
              </g>

              {/* 最外圈：純淨懸浮的易經六爻卦象（無任何包覆線條） */}
              <g transform={`translate(${hexX}, ${hexY}) rotate(${rotDeg})`}>
                {gate.lines.map((isYang, idx) => {
                  const y = (2.5 - idx) * 4.5;
                  if (isYang === 1) {
                    return (
                      <line
                        key={idx}
                        x1={-10}
                        y1={y}
                        x2={10}
                        y2={y}
                        stroke={textPrimary}
                        strokeWidth={2.2}
                        strokeLinecap="butt"
                      />
                    );
                  }
                  return (
                    <g key={idx}>
                      <line
                        x1={-10}
                        y1={y}
                        x2={-2.2}
                        y2={y}
                        stroke={textPrimary}
                        strokeWidth={2.2}
                        strokeLinecap="butt"
                      />
                      <line
                        x1={2.2}
                        y1={y}
                        x2={10}
                        y2={y}
                        stroke={textPrimary}
                        strokeWidth={2.2}
                        strokeLinecap="butt"
                      />
                    </g>
                  );
                })}
              </g>
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
