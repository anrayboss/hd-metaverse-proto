import { useEffect, useRef, useState } from 'react';
import { CenterId, GATE_BY_NUMBER } from '../data/mandalaData';
import { useWorldStore } from '../store/useWorldStore';

const BRAND_COLOR = '#f2ba79';
const COLOR_CIRCLE_DEFINED = '#FCE9D0';
const COLOR_CIRCLE_UNDEFINED = '#F2BA78';
const COLOR_GATE_DESIGN = BRAND_COLOR;
const COLOR_GATE_PERSONALITY = '#333333';
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
 * 100% 還原九中心著色、64 閘門單/雙色、coveringGates 白色底覆蓋、圓圈與四箭頭（含南北交連動隱藏）
 */
export function BodyGraph2DSvg({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>(cachedSvgMarkup || '');

  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const theme = useWorldStore((s) => s.theme);

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

    const undefinedCenterFill = theme === 'light' ? '#ffffff' : '#1e293b';
    const personalityColor = theme === 'light' ? COLOR_GATE_PERSONALITY : '#e2e8f0';

    // 1. 重置全部九中心
    Object.values(CENTER_ID_TO_SVG_ID).forEach((svgId) => {
      const el = root.querySelector<SVGElement>(`#${svgId}`);
      if (el) el.style.fill = undefinedCenterFill;
    });

    // 2. 重置 64 閘門（保留 coveringGates 預設白色覆蓋邏輯）
    for (let i = 1; i <= 64; i++) {
      const designEl = root.querySelector<SVGElement>(`#gate-${i}-design`);
      const personalityEl = root.querySelector<SVGElement>(`#gate-${i}-personality`);
      const fillColor = COVERING_GATES.has(i) ? (theme === 'light' ? '#FFFFFF' : '#0f172a') : 'transparent';
      if (designEl) designEl.style.fill = fillColor;
      if (personalityEl) personalityEl.style.fill = fillColor;
    }

    root.querySelectorAll<SVGElement>('[id^="gate-circle-"]').forEach((el) => {
      el.style.opacity = '0';
      el.style.fill = 'transparent';
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
      if (el) el.style.fill = BRAND_COLOR;
    });

    // 4. 著色啟動閘門與閘門圓圈（完全對齊過往 updateLayers 邏輯）
    Object.entries(derived.gateStatus).forEach(([gateStr, status]) => {
      const gateNum = Number(gateStr);
      const elD = root.querySelector<SVGElement>(`#gate-${gateNum}-design`);
      const elP = root.querySelector<SVGElement>(`#gate-${gateNum}-personality`);
      const elCircle = root.querySelector<SVGElement>(`#gate-circle-${gateNum}`);

      let showCircle = false;
      let dColor = COVERING_GATES.has(gateNum) ? (theme === 'light' ? '#FFFFFF' : '#0f172a') : 'transparent';
      let pColor = dColor;

      if (viewMode === 0) {
        if (status.d) {
          dColor = pColor = COLOR_GATE_DESIGN;
          showCircle = true;
        }
      } else if (viewMode === 2) {
        if (status.p) {
          dColor = pColor = personalityColor;
          showCircle = true;
        }
      } else {
        if (status.d && status.p) {
          dColor = COLOR_GATE_DESIGN;
          pColor = personalityColor;
          showCircle = true;
        } else if (status.d) {
          dColor = pColor = COLOR_GATE_DESIGN;
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
            ? COLOR_CIRCLE_DEFINED
            : COLOR_CIRCLE_UNDEFINED;
          elCircle.style.opacity = '1';
        }
      }
    });

    // 5. 四箭頭（Variables）＋ 隱藏南北交點時連動隱藏 bl (環境) 與 br (視角)
    derived.variables.forEach((v) => {
      const isNodeArrow = v.position === 'bl' || v.position === 'br';
      const sideVisible =
        viewMode === 1 ||
        (viewMode === 0 && v.side === 'design') ||
        (viewMode === 2 && v.side === 'personality');
      const visible = sideVisible && (!isNodeArrow || planetToggles.nodes);

      const arrowLeft = root.querySelector<SVGElement>(`#arrow-${v.position}-left`);
      const arrowRight = root.querySelector<SVGElement>(`#arrow-${v.position}-right`);
      const textColor = root.querySelector<SVGElement>(`#text-${v.position}-color`);
      const textTone = root.querySelector<SVGElement>(`#text-${v.position}-tone`);

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
        textColor.style.opacity = visible ? '1' : '0';
        textColor.style.visibility = visible ? 'visible' : 'hidden';
      }
      if (textTone) {
        textTone.textContent = `T${v.tone}`;
        textTone.style.opacity = visible ? '1' : '0';
        textTone.style.visibility = visible ? 'visible' : 'hidden';
      }
    });
  }, [svgMarkup, chart, viewMode, planetToggles, theme]);

  return (
    <div
      ref={containerRef}
      className={`bodygraph-2d-svg ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
