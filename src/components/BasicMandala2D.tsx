import { useMemo } from 'react';
import { MANDALA_GATES, QuadrantId } from '../data/mandalaData';
import { getActivePlanetList, PLANET_SYMBOLS } from '../engine/hdCalculator';
import { useSceneConfigStore } from '../store/useSceneConfigStore';
import { useWorldStore } from '../store/useWorldStore';
import { BodyGraph2DSvg } from './BodyGraph2DSvg';

// 天蠍與射手交界精準對齊 Gate 14 (52) 與 Gate 34 (53) 交界 (52.5)
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

const QUADRANT_NUM_COLOR: Record<QuadrantId, string> = {
  initiation: '#a6342a', // 第一象限（紅棕）
  civilization: '#3f7337', // 第二象限（綠）
  duality: '#a35d1e', // 第三象限（橘棕）
  mutation: '#24486b', // 第四象限（深藍）
};

const CX = 500;
const CY = 500;
const R_HEX_CENTER = 470; // 最外圈易經卦象（無任何包覆線條）
const R_LINE_BAND_OUTER = 434; // 數字到卦象之間的 6 爻細環外緣
const R_LINE_BAND_INNER = 420; // 數字圈外緣 / 6 爻細環內緣
const R_GATE_INNER = 374; // 數字圈內緣 / 星座圈外緣
const R_ZODIAC_INNER = 324; // 星座圈內緣
const R_PLANET_START = 304; // 星體符號放射起始半徑（星座環與人體圖之間）
const R_PLANET_STEP = 20; // 同一閘門多個星體由外向內的放射間距
const R_INNER_RING = 190; // 內區 64 條輕量放射格線內緣（不穿透中央人體圖）

const SECTOR_RAD = (Math.PI * 2) / 64; // 5.625°
const LINE_RAD = SECTOR_RAD / 6; // 0.9375°

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
 * 基礎版 2D 曼陀羅（對齊參考圖 1）：
 * - 最外圈：64 易經卦象（無框、無包覆線）
 * - 數字到卦象之間的薄 6 爻刻度環：只對有定義的 (gate, line) 繪製小弧塊填色（最省資源且極致清爽）
 * - 數字圈：64 閘門阿拉伯數字（依四象限著色，定義閘門淡米黃底色）
 * - 星座圈：白底細黑框，天蠍／射手交界對齊 Gate 14／34 交界
 * - 星座與人體圖之間：星體符號依星體列表順序沿放射方向由外向內排列
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
  const strokeColor = isLight ? '#334155' : '#475569';
  const softStroke = isLight ? 'rgba(100, 116, 139, 0.35)' : 'rgba(148, 163, 184, 0.25)';
  const tickStroke = isLight ? 'rgba(100, 116, 139, 0.5)' : 'rgba(148, 163, 184, 0.35)';
  const textPrimary = isLight ? '#0f172a' : '#f1f5f9';
  const ringBg = isLight ? '#ffffff' : '#0f172a';
  const gateDividerStroke = Math.max(0.6, gateDividerWidth * 0.42);

  // 1. 每個 (gate, line) 的定義狀態（給 6 爻小弧塊填色用）
  // 2. 每個 gate 內的啟動星體清單（嚴格依 PLANET_ORDER_ALL 順序，放射狀由外向內排在星座環與人體圖之間）
  const { activeLineMap, gatePlanetsMap } = useMemo(() => {
    const lineMap = new Map<string, { d: boolean; p: boolean }>();
    const byGate = new Map<number, Array<{ sym: string; side: 'd' | 'p'; line: number }>>();
    if (!chart.design || !chart.personality) {
      return { activeLineMap: lineMap, gatePlanetsMap: byGate };
    }

    const activePlanets = getActivePlanetList(planetToggles);
    for (const body of activePlanets) {
      const sym = PLANET_SYMBOLS[body];
      if (viewMode === 0 || viewMode === 1) {
        const item = chart.design[body];
        if (item) {
          const key = `${item.gate}.${item.line}`;
          const cur = lineMap.get(key) || { d: false, p: false };
          cur.d = true;
          lineMap.set(key, cur);

          const arr = byGate.get(item.gate) || [];
          arr.push({ sym, side: 'd', line: item.line });
          byGate.set(item.gate, arr);
        }
      }
      if (viewMode === 2 || viewMode === 1) {
        const item = chart.personality[body];
        if (item) {
          const key = `${item.gate}.${item.line}`;
          const cur = lineMap.get(key) || { d: false, p: false };
          cur.p = true;
          lineMap.set(key, cur);

          const arr = byGate.get(item.gate) || [];
          arr.push({ sym, side: 'p', line: item.line });
          byGate.set(item.gate, arr);
        }
      }
    }

    return { activeLineMap: lineMap, gatePlanetsMap: byGate };
  }, [chart.design, chart.personality, viewMode, planetToggles]);

  const activeGateSet = useMemo(() => new Set(chart.activeGates), [chart.activeGates]);

  return (
    <div className="basic-mandala-wrap">
      <svg viewBox="0 0 1000 1000" className="basic-mandala-svg" role="img" aria-label="基礎版人類設計曼陀羅">
        {/* 背景底圓（到數字圈外緣，卦象不加外框） */}
        <circle cx={CX} cy={CY} r={R_LINE_BAND_INNER} fill={ringBg} />

        {/* 1. 內圈輕量 64 等分放射格線（星座環內側至人體圖外圍，清爽不雜亂） */}
        {MANDALA_GATES.map((gate) => {
          const a = gate.angleRad + SECTOR_RAD / 2;
          const [x1, y1] = polar(R_INNER_RING, a);
          const [x2, y2] = polar(R_ZODIAC_INNER, a);
          return (
            <line
              key={`inner-ray-${gate.gate}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={softStroke}
              strokeWidth={0.75}
            />
          );
        })}

        {/* 2. 數字圈：有定義閘門的淡底色塊（僅填在數字環上，不蓋到星座或人體圖） */}
        {MANDALA_GATES.map((gate) => {
          if (!activeGateSet.has(gate.gate)) return null;
          const a0 = gate.angleRad - SECTOR_RAD / 2;
          const a1 = gate.angleRad + SECTOR_RAD / 2;
          return (
            <path
              key={`gate-bg-${gate.gate}`}
              d={describeArcWedge(R_GATE_INNER, R_LINE_BAND_INNER, a0, a1)}
              fill={isLight ? '#fcf2e4' : 'rgba(242, 186, 121, 0.16)'}
            />
          );
        })}

        {/* 3. 數字到卦象之間的薄 6 爻環：僅對有定義的 (gate, line) 填小色塊（逆時針 1→6 爻） */}
        {MANDALA_GATES.map((gate) => {
          const startAngle = gate.angleRad + SECTOR_RAD / 2;
          return [1, 2, 3, 4, 5, 6].map((line) => {
            const st = activeLineMap.get(`${gate.gate}.${line}`);
            if (!st) return null;
            const aStart = startAngle - (line - 1) * LINE_RAD;
            const aEnd = startAngle - line * LINE_RAD;
            const fill =
              st.d && st.p
                ? '#e07a22'
                : st.d
                  ? '#f2ba79'
                  : isLight
                    ? '#111827'
                    : '#e2e8f0';
            return (
              <path
                key={`line-block-${gate.gate}-${line}`}
                d={describeArcWedge(R_LINE_BAND_INNER, R_LINE_BAND_OUTER, aEnd, aStart)}
                fill={fill}
              />
            );
          });
        })}

        {/* 4. 數字到卦象之間的 384 條 6 爻細刻度線（只畫在薄環上，不延伸入圓心） */}
        {MANDALA_GATES.map((gate) => {
          const startAngle = gate.angleRad + SECTOR_RAD / 2;
          return [1, 2, 3, 4, 5].map((line) => {
            const a = startAngle - line * LINE_RAD;
            const [x1, y1] = polar(R_LINE_BAND_INNER, a);
            const [x2, y2] = polar(R_LINE_BAND_OUTER, a);
            return (
              <line
                key={`tick-${gate.gate}-${line}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tickStroke}
                strokeWidth={0.6}
              />
            );
          });
        })}

        {/* 5. 64 條閘門分隔線（數字圈＋6 爻薄環，寬度同步前端調參面板 gateDividerWidth） */}
        {MANDALA_GATES.map((gate) => {
          const a = gate.angleRad + SECTOR_RAD / 2;
          const [x1, y1] = polar(R_GATE_INNER, a);
          const [x2, y2] = polar(R_LINE_BAND_OUTER, a);
          return (
            <line
              key={`gate-div-${gate.gate}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={gateDividerStroke}
              opacity={0.82}
            />
          );
        })}

        {/* 6. 內圈 12 星座環（白底細框，天蠍／射手交界對齊 Gate 14／34 交界） */}
        {ZODIAC_RING_3D_ORDER.map((z, i) => {
          const startIdx = i * (64 / 12) - 5 / 6;
          const midIdx = (i + 0.5) * (64 / 12) - 5 / 6;
          const startRad = wheelIndexToSvgRad(startIdx);
          const midRad = wheelIndexToSvgRad(midIdx);
          const [lx1, ly1] = polar(R_ZODIAC_INNER, startRad);
          const [lx2, ly2] = polar(R_GATE_INNER, startRad);
          const [tx, ty] = polar((R_ZODIAC_INNER + R_GATE_INNER) / 2, midRad);
          const deg = (midRad * 180) / Math.PI + 90;

          return (
            <g key={z.name}>
              <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={strokeColor} strokeWidth={1.3} />
              <g transform={`translate(${tx}, ${ty}) rotate(${deg})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="16"
                  fill={textPrimary}
                  fontWeight={700}
                >
                  {`${z.symbol} ${z.name}`}
                </text>
              </g>
            </g>
          );
        })}

        {/* 同心圓邊線（最外圈只到 6 爻細環，不包覆易經卦象） */}
        <circle cx={CX} cy={CY} r={R_LINE_BAND_OUTER} fill="none" stroke={tickStroke} strokeWidth={0.8} />
        <circle cx={CX} cy={CY} r={R_LINE_BAND_INNER} fill="none" stroke={strokeColor} strokeWidth={1.2} />
        <circle cx={CX} cy={CY} r={R_GATE_INNER} fill="none" stroke={strokeColor} strokeWidth={1.4} />
        <circle cx={CX} cy={CY} r={R_ZODIAC_INNER} fill="none" stroke={strokeColor} strokeWidth={1.4} />

        {/* 7. 啟動星體符號：位於星座環與人體圖之間，依星體列表順序沿放射方向由外向內排列 */}
        {MANDALA_GATES.map((gate) => {
          const list = gatePlanetsMap.get(gate.gate);
          if (!list || list.length === 0) return null;
          return list.map((entry, idx) => {
            const [px, py] = polar(R_PLANET_START - idx * R_PLANET_STEP, gate.angleRad);
            return (
              <text
                key={`psym-${gate.gate}-${entry.side}-${idx}`}
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
        })}

        {/* 8. 中間圈（64 閘門阿拉伯數字）＋ 最外圈（無外框包覆的 64 易經卦象） */}
        {MANDALA_GATES.map((gate) => {
          const a = gate.angleRad;
          const isActive = activeGateSet.has(gate.gate);
          const [numX, numY] = polar((R_GATE_INNER + R_LINE_BAND_INNER) / 2, a);
          const [hexX, hexY] = polar(R_HEX_CENTER, a);
          const rotDeg = (a * 180) / Math.PI + 90;
          const numColor = isLight ? QUADRANT_NUM_COLOR[gate.quadrant] : isActive ? '#fde68a' : '#cbd5e1';

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
                  fontSize={isActive ? '16' : '14.5'}
                  fontWeight={isActive ? 800 : 700}
                  fill={numColor}
                >
                  {gate.gate}
                </text>
              </g>

              {/* 最外圈：純淨懸浮的易經六爻卦象（無任何包覆線條） */}
              <g transform={`translate(${hexX}, ${hexY}) rotate(${rotDeg})`}>
                {gate.lines.map((isYang, idx) => {
                  const y = (2.5 - idx) * 4.4;
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
