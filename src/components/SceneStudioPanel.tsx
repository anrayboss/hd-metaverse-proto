import { useEffect, useRef, useState } from 'react';
import { LevaPanel, button, folder, useControls, useCreateStore } from 'leva';
import { DEFAULT_SCENE_CONFIG, useSceneConfigStore } from '../store/useSceneConfigStore';
import { DisplayMode, useWorldStore } from '../store/useWorldStore';

const DISPLAY_MODES: Array<{ id: DisplayMode; label: string; short: string }> = [
  { id: 'bodygraph-2d', label: '2D 本命圖', short: '2D 本命圖' },
  { id: 'mandala-2d', label: '2D 基礎曼陀羅', short: '基礎曼陀羅' },
  { id: 'universe-3d', label: '3D 元宇宙', short: '3D 元宇宙' },
];

function DisplayModeDockPanel() {
  const displayMode = useWorldStore((s) => s.displayMode);
  const setDisplayMode = useWorldStore((s) => s.setDisplayMode);
  const stepDisplayMode = useWorldStore((s) => s.stepDisplayMode);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeIdx = Math.max(
    0,
    DISPLAY_MODES.findIndex((m) => m.id === displayMode)
  );
  const current = DISPLAY_MODES[activeIdx];

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let lastWheelAt = 0;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt < 140) return;
      lastWheelAt = now;
      // 向上滾進階（2D → 曼陀羅 → 3D），向下滾退回
      stepDisplayMode(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [stepDisplayMode]);

  return (
    <div
      ref={panelRef}
      className="dock-mode-panel"
      title="滑鼠滾輪或展開拖曳切換：2D 本命圖 ↔ 2D 基礎曼陀羅 ↔ 3D 元宇宙"
    >
      <button
        type="button"
        className="dock-mode-panel__head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="dock-mode-panel__title">
          <span>{expanded ? '▼' : '▶'}</span>
          <span>🧭 檢視模式</span>
        </span>
        <span className="dock-mode-panel__badge">{current.short}</span>
      </button>

      {expanded && (
        <div className="dock-mode-panel__body">
          <input
            type="range"
            className="hd-var-slider"
            min={0}
            max={2}
            step={1}
            value={activeIdx}
            onChange={(e) => {
              const target = DISPLAY_MODES[Number(e.target.value)];
              if (target) setDisplayMode(target.id);
            }}
            aria-label="切換 2D 本命圖、2D 基礎曼陀羅、3D 元宇宙"
          />
          <div className="hd-var-ticks">
            {DISPLAY_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`hd-var-tick ${displayMode === m.id ? 'hd-var-tick--active' : ''}`}
                onClick={() => setDisplayMode(m.id)}
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PALETTE_KEYS = [
  'colorDesign',
  'colorPersonality',
  'colorBoth',
  'colorActiveGateBg',
  'colorFloorLight',
  'colorGridStroke',
  'colorCircleDefined',
  'colorCircleUndefined',
  'colorChannelActive',
  'colorChannelInactive',
  'colorCenterHead',
  'colorCenterAjna',
  'colorCenterThroat',
  'colorCenterG',
  'colorCenterEgo',
  'colorCenterSolar',
  'colorCenterSpleen',
  'colorCenterSacral',
  'colorCenterRoot',
  'colorQuadInitiation',
  'colorQuadCivilization',
  'colorQuadDuality',
  'colorQuadMutation',
] as const;

const DEFAULT_PALETTE = Object.fromEntries(
  PALETTE_KEYS.map((k) => [k, DEFAULT_SCENE_CONFIG[k]])
) as Pick<typeof DEFAULT_SCENE_CONFIG, (typeof PALETTE_KEYS)[number]>;

export function SceneStudioPanel() {
  const displayMode = useWorldStore((s) => s.displayMode);
  const setConfig = useSceneConfigStore((s) => s.setConfig);
  const setShowRuler = useSceneConfigStore((s) => s.setShowRuler);
  const hoveredRuler = useSceneConfigStore((s) => s.hoveredRuler);
  const saveToLocalFile = useSceneConfigStore((s) => s.saveToLocalFile);
  const saveStatus = useSceneConfigStore((s) => s.saveStatus);

  // Adobe 風格雙獨立可折疊面板：上方「場景調參 Studio」、下方獨立「全站調色盤」
  const studioStore = useCreateStore();
  const paletteStore = useCreateStore();

  const [studioValues, setStudio] = useControls(
    () => ({
      showRuler: { value: false, label: '📏 顯示尺規 (懸停長寬高)' },
      '地板與曼陀羅': folder(
        {
          floorY: { value: DEFAULT_SCENE_CONFIG.floorY, min: -4, max: 2, step: 0.05, label: '地板高度 Y' },
          floorDepth: { value: DEFAULT_SCENE_CONFIG.floorDepth, min: 0.4, max: 8, step: 0.1, label: '圓盤厚度' },
          gateDividerWidth: { value: DEFAULT_SCENE_CONFIG.gateDividerWidth, min: 0.5, max: 10, step: 0.2, label: '閘門分隔線粗細' },
          ringLabelY: { value: DEFAULT_SCENE_CONFIG.ringLabelY, min: 0, max: 4, step: 0.05, label: '象限/神格/星座/八卦 Y' },
          hexagramBaseY: { value: DEFAULT_SCENE_CONFIG.hexagramBaseY, min: 0, max: 4, step: 0.05, label: '卦象底座 Y' },
          hexagramY: { value: DEFAULT_SCENE_CONFIG.hexagramY, min: 0.2, max: 6, step: 0.05, label: '卦象高度 Y' },
          hexagramScale: { value: DEFAULT_SCENE_CONFIG.hexagramScale, min: 0.4, max: 2.5, step: 0.05, label: '卦象縮放' },
          gateNumberY: { value: DEFAULT_SCENE_CONFIG.gateNumberY, min: 1, max: 9, step: 0.1, label: '卦上數字 Y' },
          gateNumberSize: { value: DEFAULT_SCENE_CONFIG.gateNumberSize, min: 0.6, max: 3, step: 0.05, label: '數字大小' },
          gateRingNumberY: { value: DEFAULT_SCENE_CONFIG.gateRingNumberY, min: 0, max: 5, step: 0.05, label: '第4層數字環 Y' },
          baseTextY: { value: DEFAULT_SCENE_CONFIG.baseTextY, min: 0, max: 4, step: 0.05, label: '鹼基文字 Y' },
          baseTextSize: { value: DEFAULT_SCENE_CONFIG.baseTextSize, min: 0.5, max: 2.5, step: 0.05, label: '鹼基字大小' },
          centerMarkerY: { value: DEFAULT_SCENE_CONFIG.centerMarkerY, min: 0, max: 5, step: 0.05, label: '外環中心塊 Y' },
          centerMarkerScale: { value: DEFAULT_SCENE_CONFIG.centerMarkerScale, min: 0.4, max: 2.5, step: 0.05, label: '外環中心塊縮放' },
          codonTokenY: { value: DEFAULT_SCENE_CONFIG.codonTokenY, min: 0, max: 5, step: 0.05, label: '密碼子環 Token Y' },
          avatarMinY: { value: DEFAULT_SCENE_CONFIG.avatarMinY, min: 0, max: 5, step: 0.05, label: '金探子最低高度 Y' },
        },
        { collapsed: false }
      ),
      '人體圖與九中心': folder(
        {
          bodyGraphFlatY: { value: DEFAULT_SCENE_CONFIG.bodyGraphFlatY, min: -1, max: 3, step: 0.02, label: '躺平人體圖 Y' },
          bodyGraphScale: { value: DEFAULT_SCENE_CONFIG.bodyGraphScale, min: 0.4, max: 2.2, step: 0.02, label: '人體圖縮放' },
          bodyGraphAtriumRadius: { value: DEFAULT_SCENE_CONFIG.bodyGraphAtriumRadius, min: 14, max: 26, step: 0.2, label: '中庭底板半徑' },
          centerEmissiveDefined: { value: DEFAULT_SCENE_CONFIG.centerEmissiveDefined, min: 0, max: 1.5, step: 0.02, label: '定義中心發光' },
          centerInteriorOpacity: { value: DEFAULT_SCENE_CONFIG.centerInteriorOpacity, min: 0.15, max: 1, step: 0.02, label: '室內牆透明度' },
          centerInteriorLight: { value: DEFAULT_SCENE_CONFIG.centerInteriorLight, min: 0, max: 12, step: 0.2, label: '室內點光強度' },
        },
        { collapsed: true }
      ),
      '通道管線與匯流點': folder(
        {
          channelRadius: { value: DEFAULT_SCENE_CONFIG.channelRadius, min: 0.06, max: 0.8, step: 0.01, label: '一般通道管徑' },
          channelActiveRadius: { value: DEFAULT_SCENE_CONFIG.channelActiveRadius, min: 0.08, max: 1.0, step: 0.01, label: '定義通道管徑' },
          channelInsideRadius: { value: DEFAULT_SCENE_CONFIG.channelInsideRadius, min: 0.2, max: 1.5, step: 0.02, label: '管內穿梭管徑' },
          channelPulseSize: { value: DEFAULT_SCENE_CONFIG.channelPulseSize, min: 0.05, max: 0.8, step: 0.02, label: '微中子光點大小' },
          channelPulseSpeed: { value: DEFAULT_SCENE_CONFIG.channelPulseSpeed, min: 0.05, max: 2.0, step: 0.05, label: '微中子流速' },
          channelRingOpacity: { value: DEFAULT_SCENE_CONFIG.channelRingOpacity, min: 0, max: 1, step: 0.02, label: '管內導光環濃度' },
          junctionSphereRadius: { value: DEFAULT_SCENE_CONFIG.junctionSphereRadius, min: 0.1, max: 0.9, step: 0.02, label: '34/10 匯流點半徑' },
        },
        { collapsed: true }
      ),
      '1/64 閘門走廊': folder(
        {
          corridorWallHeight: { value: DEFAULT_SCENE_CONFIG.corridorWallHeight, min: 2, max: 14, step: 0.2, label: '透明牆高度' },
          corridorWallOpacity: { value: DEFAULT_SCENE_CONFIG.corridorWallOpacity, min: 0.02, max: 0.6, step: 0.02, label: '透明牆濃度' },
          corridorCameraY: { value: DEFAULT_SCENE_CONFIG.corridorCameraY, min: 1.2, max: 6, step: 0.05, label: '走廊視角高度' },
          corridorWalkSpeed: { value: DEFAULT_SCENE_CONFIG.corridorWalkSpeed, min: 4, max: 40, step: 1, label: '走廊移動速度' },
          corridorStationScale: { value: DEFAULT_SCENE_CONFIG.corridorStationScale, min: 0.4, max: 2.0, step: 0.05, label: '8 站物件縮放' },
        },
        { collapsed: true }
      ),
      '微中子流場': folder(
        {
          neutrinoPointSize: { value: DEFAULT_SCENE_CONFIG.neutrinoPointSize, min: 0.08, max: 1.2, step: 0.02, label: '粒子大小' },
          neutrinoOpacity: { value: DEFAULT_SCENE_CONFIG.neutrinoOpacity, min: 0, max: 1, step: 0.02, label: '粒子透明度' },
          neutrinoRotSpeed: { value: DEFAULT_SCENE_CONFIG.neutrinoRotSpeed, min: 0, max: 0.15, step: 0.002, label: '旋轉速度' },
          neutrinoArcHeight: { value: DEFAULT_SCENE_CONFIG.neutrinoArcHeight, min: 0, max: 40, step: 1, label: '太陽弧線高度' },
          neutrinoPulseScale: { value: DEFAULT_SCENE_CONFIG.neutrinoPulseScale, min: 0.1, max: 2.5, step: 0.05, label: '太陽飛球大小' },
        },
        { collapsed: true }
      ),
      '光影與鏡頭': folder(
        {
          ambientIntensity: { value: DEFAULT_SCENE_CONFIG.ambientIntensity, min: 0.2, max: 2.5, step: 0.05, label: '環境光強度' },
          directionalIntensity: { value: DEFAULT_SCENE_CONFIG.directionalIntensity, min: 0.2, max: 3.0, step: 0.05, label: '方向光強度' },
          centerPointLightIntensity: { value: DEFAULT_SCENE_CONFIG.centerPointLightIntensity, min: 0, max: 12, step: 0.2, label: '中庭頂光強度' },
          fogDensity: { value: DEFAULT_SCENE_CONFIG.fogDensity, min: 0, max: 0.008, step: 0.0002, label: '迷霧濃度' },
          birdEyeHeight: { value: DEFAULT_SCENE_CONFIG.birdEyeHeight, min: 120, max: 320, step: 2, label: '鳥瞰高度' },
          bodyGraphCamY: { value: DEFAULT_SCENE_CONFIG.bodyGraphCamY, min: 10, max: 90, step: 1, label: '人體圖鏡頭 Y' },
          bodyGraphCamZ: { value: DEFAULT_SCENE_CONFIG.bodyGraphCamZ, min: 0.1, max: 60, step: 1, label: '人體圖鏡頭 Z' },
          freeRoamSpeed: { value: DEFAULT_SCENE_CONFIG.freeRoamSpeed, min: 8, max: 80, step: 2, label: '自由漫遊速度' },
        },
        { collapsed: true }
      ),
      '💾 寫回本機 JSON': button(() => {
        void saveToLocalFile();
      }),
      '↩️ 重置場景參數': button(() => {
        setStudio({ ...DEFAULT_SCENE_CONFIG, showRuler: false });
        setConfig(DEFAULT_SCENE_CONFIG);
        setShowRuler(false);
      }),
    }),
    { store: studioStore }
  );

  const [paletteValues, setPalette] = useControls(
    () => ({
      '核心啟動與畫布': folder(
        {
          colorDesign: { value: DEFAULT_SCENE_CONFIG.colorDesign, label: '無意識／品牌色' },
          colorPersonality: { value: DEFAULT_SCENE_CONFIG.colorPersonality, label: '意識深色' },
          colorBoth: { value: DEFAULT_SCENE_CONFIG.colorBoth, label: '紅黑雙重色' },
          colorActiveGateBg: { value: DEFAULT_SCENE_CONFIG.colorActiveGateBg, label: '定義閘門底色' },
          colorFloorLight: { value: DEFAULT_SCENE_CONFIG.colorFloorLight, label: '淺色底盤／畫布' },
          colorGridStroke: { value: DEFAULT_SCENE_CONFIG.colorGridStroke, label: '曼陀羅格線色' },
          colorCircleDefined: { value: DEFAULT_SCENE_CONFIG.colorCircleDefined, label: '2D 定義閘門圈' },
          colorCircleUndefined: { value: DEFAULT_SCENE_CONFIG.colorCircleUndefined, label: '2D 空白閘門圈' },
          colorChannelActive: { value: DEFAULT_SCENE_CONFIG.colorChannelActive, label: '3D 啟動通道色' },
          colorChannelInactive: { value: DEFAULT_SCENE_CONFIG.colorChannelInactive, label: '3D 空白通道色' },
        },
        { collapsed: false }
      ),
      '九中心色碼': folder(
        {
          colorCenterHead: { value: DEFAULT_SCENE_CONFIG.colorCenterHead, label: '頭頂 Head' },
          colorCenterAjna: { value: DEFAULT_SCENE_CONFIG.colorCenterAjna, label: '心智 Ajna' },
          colorCenterThroat: { value: DEFAULT_SCENE_CONFIG.colorCenterThroat, label: '喉嚨 Throat' },
          colorCenterG: { value: DEFAULT_SCENE_CONFIG.colorCenterG, label: '自性 G' },
          colorCenterEgo: { value: DEFAULT_SCENE_CONFIG.colorCenterEgo, label: '心臟 Ego' },
          colorCenterSolar: { value: DEFAULT_SCENE_CONFIG.colorCenterSolar, label: '情緒 Solar' },
          colorCenterSpleen: { value: DEFAULT_SCENE_CONFIG.colorCenterSpleen, label: '脾臟 Spleen' },
          colorCenterSacral: { value: DEFAULT_SCENE_CONFIG.colorCenterSacral, label: '薦骨 Sacral' },
          colorCenterRoot: { value: DEFAULT_SCENE_CONFIG.colorCenterRoot, label: '根部 Root' },
        },
        { collapsed: true }
      ),
      '2D 四象限數字色': folder(
        {
          colorQuadInitiation: { value: DEFAULT_SCENE_CONFIG.colorQuadInitiation, label: '第一象限 起始' },
          colorQuadCivilization: { value: DEFAULT_SCENE_CONFIG.colorQuadCivilization, label: '第二象限 文明' },
          colorQuadDuality: { value: DEFAULT_SCENE_CONFIG.colorQuadDuality, label: '第三象限 二元' },
          colorQuadMutation: { value: DEFAULT_SCENE_CONFIG.colorQuadMutation, label: '第四象限 突變' },
        },
        { collapsed: true }
      ),
      '💾 儲存調色盤至 JSON': button(() => {
        void saveToLocalFile();
      }),
      '↩️ 重置調色盤': button(() => {
        setPalette(DEFAULT_PALETTE);
        setConfig(DEFAULT_PALETTE);
      }),
    }),
    { store: paletteStore }
  );

  useEffect(() => {
    const { showRuler, ...sceneValues } = studioValues;
    setConfig(sceneValues);
    setShowRuler(showRuler);
  }, [studioValues, setConfig, setShowRuler]);

  useEffect(() => {
    setConfig(paletteValues);
  }, [paletteValues, setConfig]);

  return (
    <>
      <div className="studio-leva-dock">
        <DisplayModeDockPanel />
        {displayMode === 'universe-3d' && (
          <LevaPanel
            store={studioStore}
            fill
            collapsed={true}
            titleBar={{ title: '🎛️ 場景調參 Studio', drag: false, filter: true }}
          />
        )}
        <LevaPanel
          store={paletteStore}
          fill
          collapsed={true}
          titleBar={{ title: '🎨 全站調色盤 (2D / 3D)', drag: false, filter: true }}
        />
      </div>

      {displayMode === 'universe-3d' && hoveredRuler && (
        <div
          className="ruler-badge"
          style={{
            position: 'fixed',
            left: Math.min(window.innerWidth - 260, hoveredRuler.clientX + 16),
            top: Math.min(window.innerHeight - 64, hoveredRuler.clientY + 16),
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        >
          <div className="ruler-badge__name">{hoveredRuler.name}</div>
          <div className="ruler-badge__dims">
            長(X) {hoveredRuler.size[0].toFixed(2)}m · 高(Y) {hoveredRuler.size[1].toFixed(2)}m · 深(Z){' '}
            {hoveredRuler.size[2].toFixed(2)}m
          </div>
        </div>
      )}
      {saveStatus && <div className="studio-toast">{saveStatus}</div>}
    </>
  );
}
