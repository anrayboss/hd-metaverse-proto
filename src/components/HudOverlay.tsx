import { useState } from 'react';
import { CENTERS, MANDALA_GATES, QUADRANT_META, RING_RADII } from '../data/mandalaData';
import { CITY_OPTIONS, DEFAULT_CITY } from '../data/cities';
import { ENABLE_SUN_GUIDE, JourneyStage, useWorldStore } from '../store/useWorldStore';
import { ChartResultPanel } from './ChartResultPanel';
import { InfoModal, InfoModalRequest } from './InfoModal';

const ALL_STAGE_STEPS: Array<{ id: JourneyStage; label: string }> = [
  { id: 'intro', label: '0. 鳥瞰入口' },
  { id: 'red-sun', label: '1. 紅太陽卦象' },
  { id: 'corridor', label: '2. 閘門走廊 (In)' },
  { id: 'bodygraph', label: '3. 人體圖中庭' },
  { id: 'black-sun', label: '4. 黑太陽走廊 (Out)' },
  { id: 'free-roam', label: '5. 鳥瞰自由探索' },
];

const STAGE_STEPS = ENABLE_SUN_GUIDE
  ? ALL_STAGE_STEPS
  : ALL_STAGE_STEPS.filter((s) => s.id === 'intro' || s.id === 'free-roam');

const STATIONS_IN = [
  { r: RING_RADII.quadrant, label: '象限' },
  { r: RING_RADII.gateNumber, label: '數字' },
  { r: RING_RADII.centerBlock, label: '中心' },
  { r: RING_RADII.godhead, label: '神格' },
  { r: RING_RADII.zodiac, label: '星座' },
  { r: RING_RADII.trigram, label: '八卦' },
  { r: RING_RADII.codonToken, label: '密碼子環' },
  { r: RING_RADII.physiology, label: '生理對應' },
];

export function HudOverlay() {
  const theme = useWorldStore((s) => s.theme);
  const toggleTheme = useWorldStore((s) => s.toggleTheme);
  const stage = useWorldStore((s) => s.stage);
  const chart = useWorldStore((s) => s.chart);
  const isCalculatingChart = useWorldStore((s) => s.isCalculatingChart);
  const chartError = useWorldStore((s) => s.chartError);
  const chartRecords = useWorldStore((s) => s.chartRecords);
  const showChartDrawer = useWorldStore((s) => s.showChartDrawer);
  const selected = useWorldStore((s) => s.selected);
  const interiorSpace = useWorldStore((s) => s.interiorSpace);
  const showReceiptModal = useWorldStore((s) => s.showReceiptModal);
  const activeCorridorIndex = useWorldStore((s) => s.activeCorridorIndex);
  const corridorRadius = useWorldStore((s) => s.corridorRadius);
  const corridorDirection = useWorldStore((s) => s.corridorDirection);
  const setStage = useWorldStore((s) => s.setStage);
  const nextStage = useWorldStore((s) => s.nextStage);
  const prevStage = useWorldStore((s) => s.prevStage);
  const updateBirthData = useWorldStore((s) => s.updateBirthData);
  const generateFullChart = useWorldStore((s) => s.generateFullChart);
  const loadSavedRecord = useWorldStore((s) => s.loadSavedRecord);
  const setShowChartDrawer = useWorldStore((s) => s.setShowChartDrawer);
  const enterCorridorByGate = useWorldStore((s) => s.enterCorridorByGate);
  const enterCenterInterior = useWorldStore((s) => s.enterCenterInterior);
  const enterChannelInterior = useWorldStore((s) => s.enterChannelInterior);
  const exitInteriorSpace = useWorldStore((s) => s.exitInteriorSpace);
  const switchAdjacentCorridor = useWorldStore((s) => s.switchAdjacentCorridor);
  const setCorridorRadius = useWorldStore((s) => s.setCorridorRadius);
  const toggleCorridorDirection = useWorldStore((s) => s.toggleCorridorDirection);
  const clearSelection = useWorldStore((s) => s.clearSelection);
  const setShowReceiptModal = useWorldStore((s) => s.setShowReceiptModal);

  const [personName, setPersonName] = useState(chart.name === '預設示例' ? '' : chart.name);
  const [birthDate, setBirthDate] = useState(chart.birthDate);
  const [birthTime, setBirthTime] = useState(chart.birthTime);
  const [cityId, setCityId] = useState(
    CITY_OPTIONS.find((c) => c.label === chart.locationLabel)?.id || DEFAULT_CITY.id
  );
  const [infoModal, setInfoModal] = useState<InfoModalRequest | null>(null);

  const selectedCity = CITY_OPTIONS.find((c) => c.id === cityId) || DEFAULT_CITY;

  const handleGenerateAndEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await generateFullChart(
      {
        name: personName.trim() || '無名',
        birthDate,
        birthTime,
        locationLabel: selectedCity.label,
        timezone: selectedCity.timezone,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
      },
      true
    );
    if (res) {
      setStage(ENABLE_SUN_GUIDE ? 'red-sun' : 'free-roam');
    }
  };

  const handleJustCalculate = async () => {
    await generateFullChart(
      {
        name: personName.trim() || '無名',
        birthDate,
        birthTime,
        locationLabel: selectedCity.label,
        timezone: selectedCity.timezone,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
      },
      true
    );
  };

  const selectedCenter =
    selected?.type === 'center' ? CENTERS.find((c) => c.id === selected.centerId) : null;
  const activeCorridorGate = MANDALA_GATES[activeCorridorIndex];
  const inCorridor = stage === 'corridor' || stage === 'black-sun';

  const orderedStations = corridorDirection === 'in' ? STATIONS_IN : [...STATIONS_IN].reverse();
  const closestStation = STATIONS_IN.reduce((best, cur) =>
    Math.abs(cur.r - corridorRadius) < Math.abs(best.r - corridorRadius) ? cur : best
  );

  const forwardSign = corridorDirection === 'in' ? -1 : 1;
  const leftStep: -1 | 1 = corridorDirection === 'in' ? -1 : 1;

  return (
    <div className="hud-root">
      <header className="hud-header">
        <div className="hud-brand">
          <span className="hud-brand__dot" />
          <div>
            <div className="hud-brand__title">人類設計宇宙｜1/64 閘門走廊</div>
            <div className="hud-brand__sub">鳥瞰曼陀羅 · 瑞士星曆表 30 星體跑圖</div>
          </div>
        </div>

        <nav className="stage-pills">
          {STAGE_STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`stage-pill ${stage === s.id ? 'stage-pill--active' : ''}`}
              onClick={() => setStage(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className={`btn-outline ${showChartDrawer ? 'btn-outline--active' : ''}`}
            onClick={() => setShowChartDrawer(!showChartDrawer)}
          >
            {showChartDrawer ? '收合跑圖面板' : '📊 跑圖結果'}
          </button>
          <button type="button" className="btn-ghost" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 深色' : '☀️ 淺色'}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setShowReceiptModal(true)}
          >
            本命能量座標卡
          </button>
        </div>
      </header>

      {/* Stage 0：鳥瞰出生入口 */}
      {stage === 'intro' && (
        <section className="intro-card" style={{ alignSelf: 'flex-start', margin: 'auto 0 0 0' }}>
          <h1>把自主權還給你</h1>
          <p className="intro-card__desc">
            輸入出生時間與地點，透過瑞士星曆表計算意識／無意識 30 筆星體閘門與爻線，並自動存入紀錄。
          </p>

          <form onSubmit={handleGenerateAndEnter} className="intro-form">
            <div className="form-row">
              <label>
                <span className="label-with-info">
                  稱呼
                  <button
                    type="button"
                    className="hd-info-btn"
                    onClick={() => setInfoModal({ mode: 'Label', category: 'name' })}
                  >
                    ℹ︎
                  </button>
                </span>
                <input
                  type="text"
                  placeholder="請輸入稱呼"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                />
              </label>

              <label>
                <span className="label-with-info">
                  出生城市／時區
                  <button
                    type="button"
                    className="hd-info-btn"
                    onClick={() => setInfoModal({ mode: 'Label', category: 'timezone' })}
                  >
                    ℹ︎
                  </button>
                </span>
                <select
                  className="hd-select"
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}（{c.timezone}）
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                <span className="label-with-info">
                  出生日期
                  <button
                    type="button"
                    className="hd-info-btn"
                    onClick={() => setInfoModal({ mode: 'Label', category: 'birthdate' })}
                  >
                    ℹ︎
                  </button>
                </span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    updateBirthData(e.target.value, birthTime);
                  }}
                  required
                />
              </label>
              <label>
                <span className="label-with-info">
                  出生時間
                  <button
                    type="button"
                    className="hd-info-btn"
                    onClick={() => setInfoModal({ mode: 'Label', category: 'birthtime' })}
                  >
                    ℹ︎
                  </button>
                </span>
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => {
                    setBirthTime(e.target.value);
                    updateBirthData(birthDate, e.target.value);
                  }}
                  required
                />
              </label>
            </div>

            {chartRecords.length > 0 && (
              <div className="intro-history-row">
                <select
                  className="hd-select"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) loadSavedRecord(e.target.value);
                  }}
                >
                  <option value="">📂 快速載入歷史紀錄（{chartRecords.length} 筆）</option>
                  {chartRecords.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.name} · {rec.birthDate} {rec.birthTime} ({rec.locationLabel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="live-preview">
              <div className="preview-item preview-item--red">
                <span className="preview-label">紅太陽入口（-88°）</span>
                <strong>
                  Gate {chart.redSun.gate}.{chart.redSun.line} · {chart.redSun.gateInfo.ichingName}
                </strong>
              </div>
              <div className="preview-item preview-item--black">
                <span className="preview-label">黑太陽出口</span>
                <strong>
                  Gate {chart.blackSun.gate}.{chart.blackSun.line} ·{' '}
                  {chart.blackSun.gateInfo.ichingName}
                </strong>
              </div>
            </div>

            {chartError && <div className="hd-error-msg">計算失敗：{chartError}</div>}

            <div className="guide-actions">
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={isCalculatingChart}
              >
                {isCalculatingChart ? '星曆計算中…' : '繪製人類圖並進入 →'}
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={isCalculatingChart}
                onClick={handleJustCalculate}
              >
                僅跑圖檢視
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 人體圖內部自由漫遊提示條（九中心與通道連通空間） */}
      {interiorSpace && (
        <section className="guide-panel">
          <span className="guide-badge guide-badge--cyan">
            人體圖內部自由漫遊｜
            {interiorSpace.type === 'free'
              ? interiorSpace.fromGate
                ? `從 Gate ${interiorSpace.fromGate} 走廊無縫進入`
                : '無縫進入中庭空間'
              : interiorSpace.type === 'center'
                ? `起點：${CENTERS.find((c) => c.id === interiorSpace.centerId)?.name}`
                : `起點：${interiorSpace.channelId} ${interiorSpace.name}`}
          </span>
          <p style={{ marginTop: 6 }}>
            滑鼠拖曳 360° 轉頭，<code>W A S D</code> 自由穿梭九中心與通道；走出外緣將無縫銜接對應閘門走廊，按{' '}
            <code>E</code> 飛高或 <code>Esc</code> 退出。
          </p>
          <div className="guide-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn-primary" onClick={exitInteriorSpace}>
              退出人體圖內部空間 (Esc)
            </button>
          </div>
        </section>
      )}

      {/* Stages 1 & 3 */}
      {!interiorSpace && (stage === 'red-sun' || stage === 'bodygraph') && (
        <section className="guide-panel">
          {stage === 'red-sun' && (
            <>
              <span className="guide-badge guide-badge--red">STEP 1 · 紅太陽卦象</span>
              <h2>
                Gate {chart.redSun.gate}.{chart.redSun.line}（{chart.redSun.gateInfo.ichingName}）
              </h2>
              <p>點擊卦象或按下一步，沿 1/64 走廊由外向內穿越 8 層立體物件進入人體圖。</p>
            </>
          )}

          {stage === 'bodygraph' && (
            <>
              <span className="guide-badge guide-badge--cyan">STEP 3 · 人體圖中庭</span>
              <h2>中央九大中心與磁單極</h2>
              <p>
                下一步將轉向你的黑太陽閘門（Gate {chart.blackSun.gate}），由內向外走完反向順序走出曼陀羅。
              </p>
            </>
          )}

          <div className="guide-actions">
            <button type="button" className="btn-ghost" onClick={prevStage}>
              ← 上一步
            </button>
            <button type="button" className="btn-primary" onClick={nextStage}>
              {stage === 'red-sun' ? '進入紅太陽走廊 (In) →' : '從黑太陽走廊走出 (Out) →'}
            </button>
          </div>
        </section>
      )}

      {/* Stages 2 & 4：完整 1/64 閘門走廊（In / Out 雙向） */}
      {inCorridor && (
        <section className="guide-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="guide-badge guide-badge--cyan">
              Gate {activeCorridorGate.gate} 走廊｜
              {corridorDirection === 'in' ? 'IN（外 → 人體圖）' : 'OUT（人體圖 → 外）'}
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={toggleCorridorDirection}
            >
              🔄 切換 {corridorDirection === 'in' ? 'Out 反向' : 'In 進人體'} (R)
            </button>
          </div>

          <h2>
            Gate {activeCorridorGate.gate} · {activeCorridorGate.ichingName}
          </h2>

          {/* 8 站進度條（In 正序 / Out 逆序） */}
          <div className="station-strip">
            {orderedStations.map((st) => (
              <button
                key={st.label}
                type="button"
                className={`station-chip ${closestStation.label === st.label ? 'station-chip--active' : ''}`}
                onClick={() => setCorridorRadius(st.r + (corridorDirection === 'in' ? 4.5 : -4.5))}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="corridor-pad" style={{ marginTop: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => switchAdjacentCorridor(leftStep)}>
              ← 左鄰閘門
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCorridorRadius(corridorRadius + forwardSign * 6)}
            >
              ↑ 前進 (W)
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCorridorRadius(corridorRadius - forwardSign * 6)}
            >
              ↓ 後退 (S)
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => switchAdjacentCorridor((leftStep * -1) as -1 | 1)}
            >
              右鄰閘門 →
            </button>
          </div>

          <div className="guide-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => setStage('free-roam')}>
              回鳥瞰視角
            </button>
            <button type="button" className="btn-primary" onClick={nextStage}>
              {stage === 'corridor' ? '進入中央人體圖 →' : '完成並切回鳥瞰探索 →'}
            </button>
          </div>
        </section>
      )}

      {stage === 'free-roam' && (
        <div className="controls-hint">
          <span>
            <strong>鳥瞰自由探索</strong>｜點擊任一<strong>卦象或 1/64 扇形空間</strong>即進入該閘門走廊
          </span>
          <span>
            <code>W A S D</code> 移動 · <code>Q / E</code> 升降 · 滑鼠拖曳／滾輪縮放
          </span>
        </div>
      )}

      {/* 右側完整跑圖結果面板（Zen HD + Ra 標籤包預設折疊 + 視角/行星切換 + 30 星體列表） */}
      {showChartDrawer && (
        <ChartResultPanel
          onOpenInfo={(req) => setInfoModal(req)}
          onNewChart={() => {
            setShowChartDrawer(false);
            setStage('intro');
          }}
        />
      )}

      {/* 閘門／中心檢視卡（進入人體圖內部空間後不顯示預覽卡） */}
      {selected && !showChartDrawer && !interiorSpace && (
        <aside className="inspector-card">
          <button type="button" className="inspector-close" onClick={clearSelection}>
            ✕
          </button>

          {selected.type === 'gate' && (
            <>
              <span
                className="guide-badge"
                style={{
                  borderColor: QUADRANT_META[selected.gate.quadrant].color,
                  color: QUADRANT_META[selected.gate.quadrant].color,
                }}
              >
                {QUADRANT_META[selected.gate.quadrant].name}
              </span>
              <h3>
                Gate {selected.gate.gate} · {selected.gate.ichingName}
              </h3>

              <div className="layers-grid">
                <div><span>1. 象限</span><strong>{QUADRANT_META[selected.gate.quadrant].shortName}</strong></div>
                <div><span>2. 數字</span><strong>{selected.gate.gate}</strong></div>
                <div><span>3. 中心</span><strong>{CENTERS.find((c) => c.id === selected.gate.centerId)?.name}</strong></div>
                <div><span>4. 神格</span><strong>{selected.gate.godhead}</strong></div>
                <div><span>5. 星座</span><strong>{selected.gate.zodiac}</strong></div>
                <div><span>6. 八卦</span><strong>{selected.gate.trigram}</strong></div>
                <div><span>7. 密碼子環</span><strong>{selected.gate.codonRing}</strong></div>
                <div><span>8. 生理對應</span><strong>{selected.gate.physiology}</strong></div>
              </div>

              {!inCorridor && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => enterCorridorByGate(selected.gate.gate, 'in', 85)}
                >
                  進入 Gate {selected.gate.gate} 走廊 (In) →
                </button>
              )}
            </>
          )}

          {selectedCenter && selected.type === 'center' && (
            <>
              <span className="guide-badge guide-badge--cyan">
                {chart.definedCenters.includes(selectedCenter.id) ? '已定義中心' : '空白中心'}
              </span>
              <h3>
                {selectedCenter.name} ({selectedCenter.enName})
              </h3>
              <p className="inspector-lead">{selectedCenter.theme}</p>
              <div className="inspector-meta">
                包含閘門：{selectedCenter.gates.map((g) => `#${g}`).join(' ')}
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', marginTop: 10 }}
                onClick={() =>
                  enterCenterInterior(
                    selectedCenter.id,
                    selected.worldPos ?? [selectedCenter.flatPos[0], 0.5, selectedCenter.flatPos[1]]
                  )
                }
              >
                🚪 進入 {selectedCenter.name} 內部空間 →
              </button>
            </>
          )}

          {selected.type === 'channel' && (
            <>
              <span className="guide-badge guide-badge--gold">
                通道 · {selected.channelId}
              </span>
              <h3>{selected.name}</h3>
              {selected.description && (
                <p className="inspector-lead">{selected.description}</p>
              )}
              <div className="inspector-meta" style={{ marginBottom: 10 }}>
                連接閘門：Gate {selected.gates[0]} ↔ Gate {selected.gates[1]}
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() =>
                  enterChannelInterior(
                    selected.channelId,
                    selected.name,
                    selected.start,
                    selected.end
                  )
                }
              >
                🌀 從此通道進入人體圖內部空間 →
              </button>
            </>
          )}
        </aside>
      )}

      {showReceiptModal && (
        <div className="modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="inspector-close" onClick={() => setShowReceiptModal(false)}>
              ✕
            </button>
            <span className="guide-badge guide-badge--gold">本命能量座標卡</span>
            <h2>
              {chart.name} · {chart.birthDate} {chart.birthTime}
            </h2>
            <div className="receipt-grid">
              <div className="receipt-box receipt-box--red">
                <div className="receipt-label">紅太陽入口</div>
                <div className="receipt-val">
                  Gate {chart.redSun.gate}.{chart.redSun.line} · {chart.redSun.gateInfo.ichingName}
                </div>
                <div className="receipt-sub">生理：{chart.redSun.gateInfo.physiology}</div>
              </div>
              <div className="receipt-box receipt-box--black">
                <div className="receipt-label">黑太陽出口</div>
                <div className="receipt-val">
                  Gate {chart.blackSun.gate}.{chart.blackSun.line} · {chart.blackSun.gateInfo.ichingName}
                </div>
                <div className="receipt-sub">生理：{chart.blackSun.gateInfo.physiology}</div>
              </div>
            </div>
            <p className="receipt-note">{chart.ephemerisNote}</p>
            <div className="cta-group">
              <a className="btn-primary" href="https://hdlifestyle.online/self-study-manual/" target="_blank" rel="noreferrer">
                人類設計自學手冊 →
              </a>
              <a className="btn-outline" href="https://human-design-alive.onrender.com/" target="_blank" rel="noreferrer">
                Human Design Alive
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 過往 2D 跑圖完整字典說明 Modal */}
      <InfoModal request={infoModal} onClose={() => setInfoModal(null)} />
    </div>
  );
}
