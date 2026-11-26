import { useEffect, useRef } from 'react';
import {
  FixingState,
  getActivePlanetList,
  PLANET_LABELS_ZH,
  PLANET_SYMBOLS,
  PlanetaryActivation,
  TERM_MAP,
  ViewMode,
} from '../engine/hdCalculator';
import { useWorldStore, VariableDetailLevel } from '../store/useWorldStore';
import { InfoModalRequest } from './InfoModal';

const VARIABLE_LEVEL_LABELS: Array<{ level: VariableDetailLevel; label: string }> = [
  { level: 0, label: '純箭頭' },
  { level: 1, label: 'CT' },
  { level: 2, label: 'CTB' },
];

function getFixingSymbol(state: FixingState): string {
  if (state === 'Exalted') return '▲';
  if (state === 'Detriment') return '▼';
  if (state === 'Both') return '▲▼';
  return '';
}

function InfoBtn({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className="hd-info-btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title="查看說明"
    >
      ℹ︎
    </button>
  );
}

export function ChartResultPanel({
  onOpenInfo,
  onNewChart,
}: {
  onOpenInfo: (req: InfoModalRequest) => void;
  onNewChart: () => void;
}) {
  const chart = useWorldStore((s) => s.chart);
  const viewMode = useWorldStore((s) => s.viewMode);
  const variableDetailLevel = useWorldStore((s) => s.variableDetailLevel);
  const planetToggles = useWorldStore((s) => s.planetToggles);
  const chartRecords = useWorldStore((s) => s.chartRecords);
  const setViewMode = useWorldStore((s) => s.setViewMode);
  const setVariableDetailLevel = useWorldStore((s) => s.setVariableDetailLevel);
  const stepVariableDetailLevel = useWorldStore((s) => s.stepVariableDetailLevel);
  const togglePlanet = useWorldStore((s) => s.togglePlanet);
  const loadSavedRecord = useWorldStore((s) => s.loadSavedRecord);
  const setShowChartDrawer = useWorldStore((s) => s.setShowChartDrawer);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);

  const varSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = varSectionRef.current;
    if (!el) return;
    let lastWheelAt = 0;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt < 140) return;
      lastWheelAt = now;
      stepVariableDetailLevel(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [stepVariableDetailLevel]);

  const derived = chart.derived;
  const activePlanets = getActivePlanetList(planetToggles);

  const renderPlanetColumn = (
    title: string,
    sideClass: string,
    sideData: Record<string, PlanetaryActivation> | null,
    visible: boolean
  ) => (
    <div className={`hd-planet-col ${sideClass} ${visible ? '' : 'hd-planet-col--hidden'}`}>
      <div className="hd-planet-col__head">{title}</div>
      {sideData &&
        activePlanets.map((body) => {
          const item = sideData[body];
          if (!item) return null;
          const fixSym = getFixingSymbol(item.fixingState);
          return (
            <button
              key={`${sideClass}-${body}`}
              type="button"
              className="hd-planet-row"
              title={`${PLANET_LABELS_ZH[body]}｜Gate ${item.gate}.${item.line}（C${item.color} T${item.tone} B${item.base}）點擊進入走廊`}
              onClick={() => enterCorridorByGate(item.gate, sideClass.includes('design') ? 'in' : 'out')}
            >
              <span className="hd-planet-sym">{PLANET_SYMBOLS[body]}</span>
              <span className="hd-planet-val">
                {item.gate}
                <span className="hd-planet-line">.{item.line}</span>
              </span>
              <span className="hd-planet-fix">{fixSym}</span>
            </button>
          );
        })}
    </div>
  );

  const viewModes: Array<{ mode: ViewMode; label: string }> = [
    { mode: 0, label: '無意識' },
    { mode: 1, label: '本命圖' },
    { mode: 2, label: '意識' },
  ];

  const showDesignSide = viewMode === 0 || viewMode === 1;
  const showPersonalitySide = viewMode === 1 || viewMode === 2;

  return (
    <aside className="chart-drawer">
      <div className="chart-drawer__top">
        <div>
          <div className="chart-drawer__name">{chart.name}的人類圖</div>
          <div className="chart-drawer__meta">
            {chart.birthDate} {chart.birthTime} · {chart.locationLabel}
          </div>
        </div>
        <button
          type="button"
          className="inspector-close"
          style={{ position: 'static' }}
          onClick={() => setShowChartDrawer(false)}
          title="收合跑圖面板"
        >
          ✕
        </button>
      </div>

      {/* 歷史紀錄切換列 */}
      {chartRecords.length > 0 && (
        <div className="chart-drawer__history">
          <select
            className="hd-select"
            value={`${chart.name}|${chart.birthDate}|${chart.birthTime}|${chart.timezone}`}
            onChange={(e) => loadSavedRecord(e.target.value)}
            aria-label="切換已存檔紀錄"
          >
            {chartRecords.map((rec) => (
              <option key={rec.id} value={rec.id}>
                📁 {rec.name}（{rec.birthDate} {rec.birthTime}）
              </option>
            ))}
          </select>
          <span className="hd-saved-pill" title="已存於瀏覽器 localStorage">
            {`🗂 ${chartRecords.length} 筆`}
          </span>
        </div>
      )}

      {!derived ? (
        <div className="chart-drawer__loading">正在透過瑞士星曆表計算 30 筆星體資料…</div>
      ) : (
        <div className="chart-drawer__scroll">
          {/* Zen Human Design（主力區塊） */}
          <div className="hd-panel-group">
            <div className="hd-group-title">
              <span>Zen Human Design</span>
              <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'ZenHD' })} />
            </div>

            <div className="hd-info-item">
              <span className="hd-info-label">
                能量區塊
                <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Definition' })} />
              </span>
              <div className="hd-value-wrap">
                <span className="hd-info-val">{TERM_MAP[derived.Definition] || derived.Definition}</span>
                <InfoBtn
                  onClick={() =>
                    onOpenInfo({ mode: 'Value', category: 'Definition', rawValue: derived.Definition })
                  }
                />
              </div>
            </div>

            <div className="hd-info-item">
              <span className="hd-info-label">
                模式
                <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Mode' })} />
              </span>
              <div className="hd-value-wrap">
                <span className="hd-info-val">{TERM_MAP[derived.Mode] || derived.Mode}</span>
                <InfoBtn
                  onClick={() => onOpenInfo({ mode: 'Value', category: 'Mode', rawValue: derived.Mode })}
                />
              </div>
            </div>
          </div>

          {/* Ra 標籤包（維持預設折疊） */}
          <details className="hd-panel-group hd-details">
            <summary className="hd-details__summary">
              <span>Ra 標籤包</span>
              <InfoBtn
                onClick={(e) => {
                  e.preventDefault();
                  onOpenInfo({ mode: 'Label', category: 'RaTags' });
                }}
              />
            </summary>

            <div className="hd-details__body">
              <div className="hd-info-item">
                <span className="hd-info-label">
                  形象
                  <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Profile' })} />
                </span>
                <div className="hd-value-wrap">
                  <span className="hd-info-val">{derived.Profile}</span>
                  <InfoBtn
                    onClick={() =>
                      onOpenInfo({ mode: 'Value', category: 'Profile', rawValue: derived.Profile })
                    }
                  />
                </div>
              </div>

              <div className="hd-info-item">
                <span className="hd-info-label">
                  角色定位
                  <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Type' })} />
                </span>
                <div className="hd-value-wrap">
                  <span className="hd-info-val">{TERM_MAP[derived.Type] || derived.Type}</span>
                  <InfoBtn
                    onClick={() => onOpenInfo({ mode: 'Value', category: 'Type', rawValue: derived.Type })}
                  />
                </div>
              </div>

              <div className="hd-info-item">
                <span className="hd-info-label">
                  內在智慧
                  <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Authority' })} />
                </span>
                <div className="hd-value-wrap">
                  <span className="hd-info-val">{TERM_MAP[derived.Authority] || derived.Authority}</span>
                  <InfoBtn
                    onClick={() =>
                      onOpenInfo({ mode: 'Value', category: 'Authority', rawValue: derived.Authority })
                    }
                  />
                </div>
              </div>

              <div className="hd-info-item">
                <span className="hd-info-label">
                  策略
                  <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Strategy' })} />
                </span>
                <div className="hd-value-wrap">
                  <span className="hd-info-val">{TERM_MAP[derived.Strategy] || derived.Strategy}</span>
                  <InfoBtn
                    onClick={() =>
                      onOpenInfo({ mode: 'Value', category: 'Strategy', rawValue: derived.Strategy })
                    }
                  />
                </div>
              </div>

              <div className="hd-info-item hd-info-item--stack">
                <span className="hd-info-label">
                  人生主題
                  <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'Cross' })} />
                </span>
                <div className="hd-value-wrap">
                  <span className="hd-info-val">{derived.CrossChinese}</span>
                  <InfoBtn
                    onClick={() =>
                      onOpenInfo({ mode: 'Value', category: 'Cross', rawValue: derived.CrossChinese })
                    }
                  />
                </div>
              </div>
            </div>
          </details>

          {/* 視角切換 */}
          <div className="hd-control-block">
            <div className="hd-control-title">
              <span>視角切換</span>
              <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'cons_uncons' })} />
            </div>
            <div className="hd-btn-row">
              {viewModes.map((vm) => (
                <button
                  key={vm.mode}
                  type="button"
                  className={`hd-seg-btn ${viewMode === vm.mode ? 'hd-seg-btn--active' : ''}`}
                  onClick={() => setViewMode(vm.mode)}
                >
                  {vm.label}
                </button>
              ))}
            </div>
          </div>

          {/* 行星切換 */}
          <div className="hd-control-block">
            <div className="hd-control-title">
              <span>行星切換</span>
              <InfoBtn onClick={() => onOpenInfo({ mode: 'Label', category: 'asteroid' })} />
            </div>
            <div className="hd-btn-row">
              <button
                type="button"
                className={`hd-seg-btn ${planetToggles.nodes ? 'hd-seg-btn--active' : ''}`}
                onClick={() => togglePlanet('nodes')}
              >
                南北交
              </button>
              <button
                type="button"
                className={`hd-seg-btn ${planetToggles.chiron ? 'hd-seg-btn--active' : ''}`}
                onClick={() => togglePlanet('chiron')}
              >
                凱龍星
              </button>
              <button
                type="button"
                className={`hd-seg-btn ${planetToggles.lilith ? 'hd-seg-btn--active' : ''}`}
                onClick={() => togglePlanet('lilith')}
              >
                莉莉絲
              </button>
            </div>
          </div>

          {/* 四箭頭 Variables（左上=吸收、右上=動機、左下=環境、右下=視角；支援滾輪與控制 bar 切換 純箭頭 / CT / CTB） */}
          <div
            ref={varSectionRef}
            className="hd-control-block hd-variables-section"
            title="滑鼠滾輪或拖曳控制條切換：純箭頭 ↔ CT ↔ CTB"
          >
            <div className="hd-control-title hd-var-header">
              <span>四箭頭數值</span>
              <span className="hd-var-hint">滾輪 / 拖曳</span>
            </div>

            <div className="hd-var-bar">
              <input
                type="range"
                className="hd-var-slider"
                min={0}
                max={2}
                step={1}
                value={variableDetailLevel}
                onChange={(e) => setVariableDetailLevel(Number(e.target.value) as VariableDetailLevel)}
                aria-label="四箭頭數值顯示層級"
              />
              <div className="hd-var-ticks">
                {VARIABLE_LEVEL_LABELS.map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    className={`hd-var-tick ${variableDetailLevel === item.level ? 'hd-var-tick--active' : ''}`}
                    onClick={() => setVariableDetailLevel(item.level)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hd-variables-grid">
              {derived.variables.map((v) => {
                const isNodeArrow = v.position === 'bl' || v.position === 'br';
                const sideVisible =
                  (v.side === 'design' && showDesignSide) ||
                  (v.side === 'personality' && showPersonalitySide);
                const visible = sideVisible && (!isNodeArrow || planetToggles.nodes);
                return (
                  <div
                    key={v.position}
                    className={`hd-var-chip hd-var-chip--${v.side} ${visible ? '' : 'hd-var-chip--hidden'}`}
                    title={`${v.label}｜C${v.color} T${v.tone} B${v.base}`}
                  >
                    <span className="hd-var-arrow">{v.isLeft ? '◀' : '▶'}</span>
                    <span className="hd-var-label">{v.label}</span>
                    {variableDetailLevel >= 1 && (
                      <span className="hd-var-ctb">
                        <span className="hd-var-c">C{v.color}</span>
                        <span className="hd-var-tb-stack">
                          <span>T{v.tone}</span>
                          {variableDetailLevel >= 2 && <span className="hd-var-base">B{v.base}</span>}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 兩側星體列表（點擊任一閘門直接進走廊） */}
          <div className="hd-planets-split">
            {renderPlanetColumn('無意識 Design', 'hd-planet-col--design', chart.design, showDesignSide)}
            {renderPlanetColumn(
              '意識 Personality',
              'hd-planet-col--personality',
              chart.personality,
              showPersonalitySide
            )}
          </div>

          <div className="hd-drawer-footer">
            <button type="button" className="btn-outline" style={{ width: '100%' }} onClick={onNewChart}>
              再跑一張
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
