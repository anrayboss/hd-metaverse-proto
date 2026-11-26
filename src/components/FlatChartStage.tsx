import {
  FixingState,
  getActivePlanetList,
  PLANET_LABELS_ZH,
  PLANET_SYMBOLS,
  PlanetaryActivation,
} from '../engine/hdCalculator';
import { useWorldStore } from '../store/useWorldStore';
import { BasicMandala2D } from './BasicMandala2D';
import { BodyGraph2DSvg } from './BodyGraph2DSvg';

function getFixingSymbol(state: FixingState): string {
  if (state === 'Exalted') return '▲';
  if (state === 'Detriment') return '▼';
  if (state === 'Both') return '▲▼';
  return '';
}

/**
 * 2D 平面出圖舞台：
 * - displayMode === 'bodygraph-2d'：完整沿用過往 2D 跑圖專案（左側無意識星體＋中央 body-graph.svg＋右側意識星體）
 * - displayMode === 'mandala-2d'：基礎版曼陀羅（外圈 64 易經卦象＋中圈閘門數字＋內圈 12 星座＋正中央 body-graph.svg）
 */
export function FlatChartStage() {
  const displayMode = useWorldStore((s) => s.displayMode);
  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const showChartDrawer = useWorldStore((s) => s.showChartDrawer);
  const setDisplayMode = useWorldStore((s) => s.setDisplayMode);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);

  const activePlanets = getActivePlanetList(planetToggles);
  const showDesign = viewMode === 0 || viewMode === 1;
  const showPersonality = viewMode === 1 || viewMode === 2;

  const renderStagePlanetColumn = (
    sideClass: 'design' | 'personality',
    data: Record<string, PlanetaryActivation> | null,
    visible: boolean
  ) => (
    <div
      className={`flat-planet-col flat-planet-col--${sideClass} ${visible ? '' : 'flat-planet-col--hidden'}`}
    >
      <div className="flat-planet-col__title">
        {sideClass === 'design' ? '無意識 Design' : '意識 Personality'}
      </div>
      {data &&
        activePlanets.map((body) => {
          const item = data[body];
          if (!item) return null;
          return (
            <button
              key={`${sideClass}-${body}`}
              type="button"
              className="flat-planet-row"
              title={`${PLANET_LABELS_ZH[body]}｜Gate ${item.gate}.${item.line} — 點擊進入 3D 走廊`}
              onClick={() => {
                setDisplayMode('universe-3d');
                enterCorridorByGate(item.gate, sideClass === 'design' ? 'in' : 'out');
              }}
            >
              <span className="flat-planet-sym">{PLANET_SYMBOLS[body]}</span>
              <span className="flat-planet-val">
                {item.gate}
                <span className="flat-planet-line">.{item.line}</span>
              </span>
              <span className="flat-planet-fix">{getFixingSymbol(item.fixingState)}</span>
            </button>
          );
        })}
    </div>
  );

  return (
    <div className={`flat-stage ${showChartDrawer ? 'flat-stage--with-drawer' : ''}`}>
      <div className="flat-stage__card">
        <div className="flat-stage__header">
          <div>
            <h2>{chart.name}的人類圖</h2>
            <p>
              {chart.birthDate} {chart.birthTime} · {chart.locationLabel}
            </p>
          </div>
          <span className="flat-stage__badge">
            {displayMode === 'bodygraph-2d' ? '2D 平面本命圖' : '2D 基礎版曼陀羅'}
          </span>
        </div>

        {displayMode === 'bodygraph-2d' ? (
          <div className="flat-bodygraph-layout">
            {renderStagePlanetColumn('design', chart.design, showDesign)}
            <div className="flat-bodygraph-center">
              <BodyGraph2DSvg className="bodygraph-2d-svg--full" />
            </div>
            {renderStagePlanetColumn('personality', chart.personality, showPersonality)}
          </div>
        ) : (
          <div className="flat-mandala-layout">
            <BasicMandala2D />
          </div>
        )}

        <div className="flat-stage__footer">
          <span>© 人類設計 Lifestyle 為您呈現</span>
          <span>點擊任一星體或曼陀羅閘門可直接飛入 3D 閘門走廊</span>
        </div>
      </div>
    </div>
  );
}
