import { useEffect, useRef, useState } from 'react';
import { CENTERS, CenterId, GATE_BY_NUMBER } from '../data/mandalaData';
import { useSceneConfigStore } from '../store/useSceneConfigStore';
import { useWorldStore } from '../store/useWorldStore';

const COVERING_GATES = new Set([15, 5, 2, 14, 46, 29]);

const CENTER_ID_TO_SVG_ID: Record<CenterId, string> = {
  head: 'center-head',
  ajna: 'center-ajna',
  throat: 'center-throat',
  g: 'center-g',
  ego: 'center-heart',
  sacral: 'center-sacral',
  spleen: 'center-splenic',
  solar: 'center-solar-plexus',
  root: 'center-root',
};

const SVG_ID_TO_CENTER_ID: Record<string, CenterId> = Object.fromEntries(
  Object.entries(CENTER_ID_TO_SVG_ID).map(([k, v]) => [v, k as CenterId])
);

let cachedSvgMarkup: string | null = null;
let svgFetchPromise: Promise<string> | null = null;

function loadBodyGraphSvg(): Promise<string> {
  if (cachedSvgMarkup) return Promise.resolve(cachedSvgMarkup);
  if (!svgFetchPromise) {
    svgFetchPromise = fetch('/assets/body-graph.svg')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load body-graph.svg (${res.status})`);
        return res.text();
      })
      .then((text) => {
        cachedSvgMarkup = text;
        return text;
      });
  }
  return svgFetchPromise;
}

/**
 * 沿用過往 2D 跑圖專案的 body-graph.svg 向量人體圖：
 * - 100% 還原九中心著色、64 閘門單/雙色、coveringGates 白色底覆蓋、圓圈與四箭頭（含南北交連動隱藏）
 * - 點擊互動：
 *   1. 點擊閘門數字（透穿命中定義圈圈）、閘門定義圈圈或通道填色範圍 → 切換至 3D 並飛入該閘門走廊
 *   2. 點擊九中心（排除閘門定義圈圈範圍）→ 切換至 3D 並進入該中心內部空間
 */
export function BodyGraph2DSvg({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>(cachedSvgMarkup || '');

  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const variableDetailLevel = useWorldStore((s) => s.variableDetailLevel);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const theme = useWorldStore((s) => s.theme);
  const config = useSceneConfigStore((s) => s.config);
  const setDisplayMode = useWorldStore((s) => s.setDisplayMode);
  const stepVariableDetailLevel = useWorldStore((s) => s.stepVariableDetailLevel);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);
  const enterCenterInterior = useWorldStore((s) => s.enterCenterInterior);

  useEffect(() => {
    if (svgMarkup) return;
    let alive = true;
    loadBodyGraphSvg()
      .then((text) => {
        if (alive) setSvgMarkup(text);
      })
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [svgMarkup]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !svgMarkup) return;

    const svgEl = root.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', '100%');
      svgEl.setAttribute('height', '100%');
      svgEl.style.display = 'block';
    }

    // 讓轉外框的閘門數字不攔截指標事件，點擊數字時直接精準透穿到底下的 #gate-circle-<N>
    const numberOutlineGroup = root.querySelector<SVGElement>('[id^="九中心數字"]');
    if (numberOutlineGroup) {
      numberOutlineGroup.style.pointerEvents = 'none';
    }

    const undefinedCenterFill = theme === 'light' ? config.colorFloorLight : '#1e293b';
    const designColor = config.colorDesign;
    const personalityColor = theme === 'light' ? config.colorPersonality : '#e2e8f0';
    const circleDefColor = config.colorCircleDefined;
    const circleUndefColor = config.colorCircleUndefined;

    // 1. 重置全部九中心（啟用點擊游標）
    Object.values(CENTER_ID_TO_SVG_ID).forEach((svgId) => {
      const el = root.querySelector<SVGElement>(`#${svgId}`);
      if (el) {
        el.style.fill = undefinedCenterFill;
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'all';
      }
    });

    // 2. 重置 64 閘門填色區塊（啟用點擊游標與指標事件）
    for (let i = 1; i <= 64; i++) {
      const designEl = root.querySelector<SVGElement>(`#gate-${i}-design`);
      const personalityEl = root.querySelector<SVGElement>(`#gate-${i}-personality`);
      const fillColor = COVERING_GATES.has(i) ? (theme === 'light' ? config.colorFloorLight : '#0f172a') : 'transparent';
      if (designEl) {
        designEl.style.fill = fillColor;
        designEl.style.cursor = 'pointer';
        designEl.style.pointerEvents = 'all';
      }
      if (personalityEl) {
        personalityEl.style.fill = fillColor;
        personalityEl.style.cursor = 'pointer';
        personalityEl.style.pointerEvents = 'all';
      }
    }

    // 閘門定義圈圈即使未定義透明也保留全範圍點擊命中（優先於底下的中心）
    root.querySelectorAll<SVGElement>('[id^="gate-circle-"]').forEach((el) => {
      el.style.opacity = '0';
      el.style.fill = 'rgba(0, 0, 0, 0)';
      el.style.cursor = 'pointer';
      el.style.pointerEvents = 'all';
    });
    root.querySelectorAll<SVGElement>('[id^="arrow-"]').forEach((el) => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
    });
    root.querySelectorAll<SVGElement>('[id^="text-"]').forEach((el) => {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
    });

    const derived = chart.derived;
    if (!derived) return;

    // 3. 著色已定義中心
    const definedSet = new Set(derived.definedCenters);
    derived.definedCenters.forEach((centerId) => {
      const svgId = CENTER_ID_TO_SVG_ID[centerId];
      const el = root.querySelector<SVGElement>(`#${svgId}`);
      if (el) el.style.fill = designColor;
    });

    // 4. 著色啟動閘門與閘門圓圈（完全對齊過往 updateLayers 邏輯並支援前端調色盤）
    Object.entries(derived.gateStatus).forEach(([gateStr, status]) => {
      const gateNum = Number(gateStr);
      const elD = root.querySelector<SVGElement>(`#gate-${gateNum}-design`);
      const elP = root.querySelector<SVGElement>(`#gate-${gateNum}-personality`);
      const elCircle = root.querySelector<SVGElement>(`#gate-circle-${gateNum}`);

      let showCircle = false;
      let dColor = COVERING_GATES.has(gateNum) ? (theme === 'light' ? config.colorFloorLight : '#0f172a') : 'transparent';
      let pColor = dColor;

      if (viewMode === 0) {
        if (status.d) {
          dColor = pColor = designColor;
          showCircle = true;
        }
      } else if (viewMode === 2) {
        if (status.p) {
          dColor = pColor = personalityColor;
          showCircle = true;
        }
      } else {
        if (status.d && status.p) {
          dColor = designColor;
          pColor = personalityColor;
          showCircle = true;
        } else if (status.d) {
          dColor = pColor = designColor;
          showCircle = true;
        } else if (status.p) {
          dColor = pColor = personalityColor;
          showCircle = true;
        }
      }

      if (elD) elD.style.fill = dColor;
      if (elP) elP.style.fill = pColor;

      if (showCircle && elCircle) {
        const centerId = GATE_BY_NUMBER[gateNum]?.centerId;
        if (centerId) {
          elCircle.style.fill = definedSet.has(centerId)
            ? circleDefColor
            : circleUndefColor;
          elCircle.style.opacity = '1';
        }
      }
    });

    // 5. 四箭頭（Variables）＋ Base 數值（置於 Tone 下方）＋ CTB 顯示層級 ＋ 隱藏南北交點時連動隱藏 bl (環境) 與 br (視角)
    const parseMatrixXY = (el: SVGElement | null): [number, number] | null => {
      if (!el) return null;
      const tf = el.getAttribute('transform') || '';
      const m = tf.match(/matrix\([^)]*\s([-\d.]+)\s+([-\d.]+)\)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2])];
    };

    derived.variables.forEach((v) => {
      const isNodeArrow = v.position === 'bl' || v.position === 'br';
      const sideVisible =
        viewMode === 1 ||
        (viewMode === 0 && v.side === 'design') ||
        (viewMode === 2 && v.side === 'personality');
      const visible = sideVisible && (!isNodeArrow || planetToggles.nodes);
      const showCT = visible && variableDetailLevel >= 1;
      const showBase = visible && variableDetailLevel >= 2;

      const arrowLeft = root.querySelector<SVGElement>(`#arrow-${v.position}-left`);
      const arrowRight = root.querySelector<SVGElement>(`#arrow-${v.position}-right`);
      const textColor = root.querySelector<SVGElement>(`#text-${v.position}-color`);
      const textTone = root.querySelector<SVGElement>(`#text-${v.position}-tone`);
      let textBase = root.querySelector<SVGElement>(`#text-${v.position}-base`);

      if (!textBase && textTone && textTone.parentElement) {
        const cPos = parseMatrixXY(textColor);
        const tPos = parseMatrixXY(textTone);
        const dy = cPos && tPos ? tPos[1] - cPos[1] : 9.4;
        const bx = tPos ? tPos[0] : 0;
        const by = tPos ? tPos[1] + dy : 0;
        const created = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        created.setAttribute('id', `text-${v.position}-base`);
        created.setAttribute('transform', `matrix(1 0 0 1 ${bx} ${by})`);
        created.setAttribute('fill', textTone.getAttribute('fill') || '#231815');
        created.setAttribute('font-family', textTone.getAttribute('font-family') || "'TimesNewRomanPSMT'");
        created.setAttribute('font-size', textTone.getAttribute('font-size') || '8');
        textTone.parentElement.insertBefore(created, textTone.nextSibling);
        textBase = created;
      }

      if (arrowLeft) {
        arrowLeft.style.display = v.isLeft ? 'block' : 'none';
        arrowLeft.style.visibility = visible ? 'visible' : 'hidden';
      }
      if (arrowRight) {
        arrowRight.style.display = v.isLeft ? 'none' : 'block';
        arrowRight.style.visibility = visible ? 'visible' : 'hidden';
      }
      if (textColor) {
        textColor.textContent = `C${v.color}`;
        textColor.style.opacity = showCT ? '1' : '0';
        textColor.style.visibility = showCT ? 'visible' : 'hidden';
      }
      if (textTone) {
        textTone.textContent = `T${v.tone}`;
        textTone.style.opacity = showCT ? '1' : '0';
        textTone.style.visibility = showCT ? 'visible' : 'hidden';
      }
      if (textBase) {
        textBase.textContent = `B${v.base}`;
        textBase.style.opacity = showBase ? '1' : '0';
        textBase.style.visibility = showBase ? 'visible' : 'hidden';
      }
    });
  }, [
    svgMarkup,
    chart,
    viewMode,
    variableDetailLevel,
    planetToggles,
    theme,
    config.colorDesign,
    config.colorPersonality,
    config.colorFloorLight,
    config.colorCircleDefined,
    config.colorCircleUndefined,
  ]);

  // 在 2D 四箭頭與 CTB 文字上方滾動滑鼠滾輪即可直接切換 純箭頭 ↔ CT ↔ CTB
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let lastWheelAt = 0;
    const onWheel = (e: WheelEvent) => {
      let el = e.target as Element | null;
      let hitVariable = false;
      while (el && el !== root) {
        const id = el.id || '';
        if (/^(arrow|text)-(tl|bl|tr|br)-/.test(id)) {
          hitVariable = true;
          break;
        }
        el = el.parentElement;
      }
      if (!hitVariable) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt < 140) return;
      lastWheelAt = now;
      stepVariableDetailLevel(e.deltaY > 0 ? 1 : -1);
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [stepVariableDetailLevel]);

  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    let el = e.target as Element | null;
    while (el && el !== containerRef.current) {
      const id = el.id || '';

      // 1. 點到閘門定義圈圈（含透穿的閘門數字）或閘門填色區塊 → 跳至 3D 閘門走廊
      const gateCircleMatch = id.match(/^gate-circle-(\d+)$/);
      if (gateCircleMatch) {
        e.stopPropagation();
        const gateNum = Number(gateCircleMatch[1]);
        setDisplayMode('universe-3d');
        enterCorridorByGate(gateNum, 'in', 85);
        return;
      }

      const gateFillMatch = id.match(/^gate-(\d+)-(design|personality)$/);
      if (gateFillMatch) {
        e.stopPropagation();
        const gateNum = Number(gateFillMatch[1]);
        setDisplayMode('universe-3d');
        enterCorridorByGate(gateNum, 'in', 85);
        return;
      }

      // 2. 點到九中心（已自然排除上層的閘門定義圈圈）→ 跳至 3D 該中心內部空間
      const centerId = SVG_ID_TO_CENTER_ID[id];
      if (centerId) {
        e.stopPropagation();
        const centerInfo = CENTERS.find((c) => c.id === centerId);
        const cfg = useSceneConfigStore.getState().config;
        const pos: [number, number, number] = centerInfo
          ? [
              centerInfo.flatPos[0] * cfg.bodyGraphScale,
              cfg.bodyGraphFlatY + 0.55,
              centerInfo.flatPos[1] * cfg.bodyGraphScale,
            ]
          : [0, cfg.bodyGraphFlatY + 0.55, 0];
        setDisplayMode('universe-3d');
        enterCenterInterior(centerId, pos);
        return;
      }

      el = el.parentElement;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`bodygraph-2d-svg ${className}`}
      onClick={handleSvgClick}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
