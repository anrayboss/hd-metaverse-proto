import { useEffect, useMemo, useRef, useState } from 'react';
import { LevaPanel, button, folder, useControls, useCreateStore } from 'leva';
import {
  DEFAULT_SCENE_CONFIG,
  SceneConfig,
  useSceneConfigStore,
} from '../store/useSceneConfigStore';
import { DisplayMode, useWorldStore } from '../store/useWorldStore';

const DISPLAY_MODES: Array<{ id: DisplayMode; label: string; short: string }> = [
  { id: 'bodygraph-2d', label: '2D 本命圖', short: '2D 本命圖' },
  { id: 'mandala-2d', label: '2D 基礎曼陀羅', short: '基礎曼陀羅' },
  { id: 'universe-3d', label: '3D 元宇宙', short: '3D 元宇宙' },
];

function DisplayModeDockPanel({ fontSize }: { fontSize: number }) {
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
      style={{ fontSize: `${Math.max(11, fontSize)}px` }}
      title="滑鼠滾輪或展開拖曳切換：2D 本命圖 ↔ 2D 基礎曼陀羅 ↔ 3D 元宇宙"
    >
      <button
        type="button"
        className="dock-mode-panel__head"
        style={{ fontSize: `${Math.max(11, fontSize)}px` }}
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

type PaletteKey = (typeof PALETTE_KEYS)[number];
type StudioNumericKey = Exclude<keyof SceneConfig, PaletteKey>;

interface ParamSpec {
  min: number;
  max: number;
  step: number;
  label: string;
}

/**
 * 所有場景數值參數規格（不傳 min/max 給 Leva 以取消 slider bar，
 * 改由滑鼠移至參數上直接滾輪微調＋原生拖曳／鍵盤輸入，並依此表安全 clamp）
 */
const STUDIO_PARAM_SPECS: Record<StudioNumericKey, ParamSpec> = {
  // 介面字體
  studioFontSize: { min: 9, max: 18, step: 0.5, label: '調參面板字體 (px)' },
  chartPanelFontSize: { min: 10, max: 20, step: 0.5, label: '跑圖面板字體 (px)' },
  // 地板與曼陀羅
  floorY: { min: -4, max: 2, step: 0.05, label: '地板高度 Y' },
  floorDepth: { min: 0.4, max: 8, step: 0.1, label: '圓盤厚度' },
  gateDividerWidth: { min: 0.5, max: 10, step: 0.2, label: '閘門分隔線粗細' },
  ringLabelY: { min: 0, max: 4, step: 0.05, label: '象限/神格/星座/八卦 Y' },
  hexagramBaseY: { min: 0, max: 4, step: 0.05, label: '卦象底座 Y' },
  hexagramY: { min: 0.2, max: 6, step: 0.05, label: '卦象高度 Y' },
  hexagramScale: { min: 0.4, max: 2.5, step: 0.05, label: '卦象縮放' },
  gateNumberY: { min: 1, max: 9, step: 0.1, label: '卦上數字 Y' },
  gateNumberSize: { min: 0.6, max: 3, step: 0.05, label: '數字大小' },
  gateRingNumberY: { min: 0, max: 5, step: 0.05, label: '第4層數字環 Y' },
  baseTextY: { min: 0, max: 4, step: 0.05, label: '鹼基文字 Y' },
  baseTextSize: { min: 0.5, max: 2.5, step: 0.05, label: '鹼基字大小' },
  centerMarkerY: { min: 0, max: 5, step: 0.05, label: '外環中心塊 Y' },
  centerMarkerScale: { min: 0.4, max: 2.5, step: 0.05, label: '外環中心塊縮放' },
  codonTokenY: { min: 0, max: 5, step: 0.05, label: '密碼子環 Token Y' },
  avatarMinY: { min: 0, max: 5, step: 0.05, label: '金探子最低高度 Y' },
  // 人體圖與九中心
  bodyGraphFlatY: { min: -1, max: 3, step: 0.02, label: '躺平人體圖 Y' },
  bodyGraphScale: { min: 0.4, max: 2.2, step: 0.02, label: '人體圖縮放' },
  bodyGraphAtriumRadius: { min: 14, max: 26, step: 0.2, label: '中庭底板半徑' },
  centerEmissiveDefined: { min: 0, max: 1.5, step: 0.02, label: '定義中心發光' },
  centerInteriorOpacity: { min: 0.15, max: 1, step: 0.02, label: '室內牆透明度' },
  centerInteriorLight: { min: 0, max: 12, step: 0.2, label: '室內點光強度' },
  // 通道管線與匯流點
  channelRadius: { min: 0.06, max: 0.8, step: 0.01, label: '一般通道管徑' },
  channelActiveRadius: { min: 0.08, max: 1.0, step: 0.01, label: '定義通道管徑' },
  channelInsideRadius: { min: 0.2, max: 1.5, step: 0.02, label: '管內穿梭管徑' },
  channelPulseSize: { min: 0.05, max: 0.8, step: 0.02, label: '微中子光點大小' },
  channelPulseSpeed: { min: 0.05, max: 2.0, step: 0.05, label: '微中子流速' },
  channelRingOpacity: { min: 0, max: 1, step: 0.02, label: '管內導光環濃度' },
  junctionSphereRadius: { min: 0.1, max: 0.9, step: 0.02, label: '34/10 匯流點半徑' },
  // 1/64 閘門走廊
  corridorWallHeight: { min: 2, max: 14, step: 0.2, label: '透明牆高度' },
  corridorWallOpacity: { min: 0.02, max: 0.6, step: 0.02, label: '透明牆濃度' },
  corridorCameraY: { min: 1.2, max: 6, step: 0.05, label: '走廊視角高度' },
  corridorWalkSpeed: { min: 4, max: 40, step: 1, label: '走廊移動速度' },
  corridorStationScale: { min: 0.4, max: 2.0, step: 0.05, label: '8 站物件縮放' },
  // 微中子流場
  neutrinoPointSize: { min: 0.08, max: 1.2, step: 0.02, label: '粒子大小' },
  neutrinoOpacity: { min: 0, max: 1, step: 0.02, label: '粒子透明度' },
  neutrinoRotSpeed: { min: 0, max: 0.15, step: 0.002, label: '旋轉速度' },
  neutrinoArcHeight: { min: 0, max: 40, step: 1, label: '太陽弧線高度' },
  neutrinoPulseScale: { min: 0.1, max: 2.5, step: 0.05, label: '太陽飛球大小' },
  // 光影與鏡頭
  ambientIntensity: { min: 0.2, max: 3.5, step: 0.05, label: '環境光強度' },
  directionalIntensity: { min: 0.2, max: 3.5, step: 0.05, label: '方向光強度' },
  centerPointLightIntensity: { min: 0, max: 12, step: 0.2, label: '中庭頂光強度' },
  fogDensity: { min: 0, max: 0.008, step: 0.0002, label: '迷霧濃度' },
  birdEyeHeight: { min: 120, max: 320, step: 2, label: '鳥瞰高度' },
  bodyGraphCamY: { min: 10, max: 90, step: 1, label: '人體圖鏡頭 Y' },
  bodyGraphCamZ: { min: 0.1, max: 60, step: 1, label: '人體圖鏡頭 Z' },
  // 金探子飛行與衝刺
  freeRoamSpeed: { min: 4, max: 120, step: 1, label: '外部飛行速度' },
  freeRoamSprintMultiplier: { min: 1.0, max: 5.0, step: 0.05, label: '外部衝刺倍率 (Shift)' },
  interiorFlySpeed: { min: 1.0, max: 20.0, step: 0.2, label: '室內飛行速度' },
  interiorSprintSpeed: { min: 2.0, max: 35.0, step: 0.5, label: '室內衝刺速度 (Shift)' },
  // 待機電影模式
  idleTimeoutSec: { min: 10, max: 600, step: 5, label: '閒置觸發秒數' },
  idleOrbitSpeed: { min: 0.02, max: 1.0, step: 0.02, label: '水平旋轉速度' },
  idleVerticalSpeed: { min: 0, max: 1.0, step: 0.02, label: '垂直起伏速度' },
  idleVerticalAmp: { min: 0, max: 0.6, step: 0.02, label: '垂直起伏幅度' },
  idleCameraDistFree: { min: 2, max: 30, step: 0.2, label: '外部距金探子距離' },
  idleCameraDistCorridor: { min: 1.5, max: 16, step: 0.2, label: '走廊距金探子距離' },
  idleCameraDistInterior: { min: 1.5, max: 12, step: 0.2, label: '室內距金探子距離' },
  idleZoomAmp: { min: 0, max: 0.45, step: 0.02, label: '景深呼吸推拉幅度' },
};

const STUDIO_NUMERIC_KEYS = Object.keys(STUDIO_PARAM_SPECS) as StudioNumericKey[];
const STUDIO_KEY_SET = new Set<string>(STUDIO_NUMERIC_KEYS);

function numCtrl(key: StudioNumericKey) {
  const spec = STUDIO_PARAM_SPECS[key];
  // 不傳 min/max 讓 Leva 取消 slider bar，保留精簡數字框＋拖曳＋本元件滾輪微調
  return {
    value: DEFAULT_SCENE_CONFIG[key],
    step: spec.step,
    label: spec.label,
  };
}

function pickStudioValues(cfg: SceneConfig): Record<StudioNumericKey, number> {
  const out = {} as Record<StudioNumericKey, number>;
  for (const k of STUDIO_NUMERIC_KEYS) {
    out[k] = cfg[k];
  }
  return out;
}

function pickPaletteValues(cfg: SceneConfig): Record<PaletteKey, string> {
  const out = {} as Record<PaletteKey, string>;
  for (const k of PALETTE_KEYS) {
    out[k] = cfg[k];
  }
  return out;
}

function extractParamKeyFromId(id: string | null | undefined): StudioNumericKey | null {
  if (!id) return null;
  const lastSegment = id.split('.').pop() ?? id;
  return STUDIO_KEY_SET.has(lastSegment) ? (lastSegment as StudioNumericKey) : null;
}

export function SceneStudioPanel() {
  const displayMode = useWorldStore((s) => s.displayMode);
  const setConfig = useSceneConfigStore((s) => s.setConfig);
  const setShowRuler = useSceneConfigStore((s) => s.setShowRuler);
  const hoveredRuler = useSceneConfigStore((s) => s.hoveredRuler);
  const saveToLocalFile = useSceneConfigStore((s) => s.saveToLocalFile);
  const saveStatus = useSceneConfigStore((s) => s.saveStatus);
  const studioFontSize = useSceneConfigStore((s) => s.config.studioFontSize);

  const studioWrapRef = useRef<HTMLDivElement>(null);

  // 用 useState 鎖定 store 參考，使其生命週期與 useControls 內部 useState 一致，避免 Vite HMR 時不同步導致面板變空隱藏
  const rawStudioStore = useCreateStore();
  const rawPaletteStore = useCreateStore();
  const [studioStore] = useState(() => rawStudioStore);
  const [paletteStore] = useState(() => rawPaletteStore);

  const [studioValues, setStudio] = useControls(
    () => ({
      showRuler: { value: false, label: '📏 顯示尺規 (懸停長寬高)' },
      '介面字體': folder(
        {
          studioFontSize: numCtrl('studioFontSize'),
          chartPanelFontSize: numCtrl('chartPanelFontSize'),
        },
        { collapsed: true }
      ),
      '地板與曼陀羅': folder(
        {
          floorY: numCtrl('floorY'),
          floorDepth: numCtrl('floorDepth'),
          gateDividerWidth: numCtrl('gateDividerWidth'),
          ringLabelY: numCtrl('ringLabelY'),
          hexagramBaseY: numCtrl('hexagramBaseY'),
          hexagramY: numCtrl('hexagramY'),
          hexagramScale: numCtrl('hexagramScale'),
          gateNumberY: numCtrl('gateNumberY'),
          gateNumberSize: numCtrl('gateNumberSize'),
          gateRingNumberY: numCtrl('gateRingNumberY'),
          baseTextY: numCtrl('baseTextY'),
          baseTextSize: numCtrl('baseTextSize'),
          centerMarkerY: numCtrl('centerMarkerY'),
          centerMarkerScale: numCtrl('centerMarkerScale'),
          codonTokenY: numCtrl('codonTokenY'),
          avatarMinY: numCtrl('avatarMinY'),
        },
        { collapsed: false }
      ),
      '人體圖與九中心': folder(
        {
          bodyGraphFlatY: numCtrl('bodyGraphFlatY'),
          bodyGraphScale: numCtrl('bodyGraphScale'),
          bodyGraphAtriumRadius: numCtrl('bodyGraphAtriumRadius'),
          centerEmissiveDefined: numCtrl('centerEmissiveDefined'),
          centerInteriorOpacity: numCtrl('centerInteriorOpacity'),
          centerInteriorLight: numCtrl('centerInteriorLight'),
        },
        { collapsed: true }
      ),
      '通道管線與匯流點': folder(
        {
          channelRadius: numCtrl('channelRadius'),
          channelActiveRadius: numCtrl('channelActiveRadius'),
          channelInsideRadius: numCtrl('channelInsideRadius'),
          channelPulseSize: numCtrl('channelPulseSize'),
          channelPulseSpeed: numCtrl('channelPulseSpeed'),
          channelRingOpacity: numCtrl('channelRingOpacity'),
          junctionSphereRadius: numCtrl('junctionSphereRadius'),
        },
        { collapsed: true }
      ),
      '1/64 閘門走廊': folder(
        {
          corridorWallHeight: numCtrl('corridorWallHeight'),
          corridorWallOpacity: numCtrl('corridorWallOpacity'),
          corridorCameraY: numCtrl('corridorCameraY'),
          corridorWalkSpeed: numCtrl('corridorWalkSpeed'),
          corridorStationScale: numCtrl('corridorStationScale'),
        },
        { collapsed: true }
      ),
      '微中子流場': folder(
        {
          neutrinoPointSize: numCtrl('neutrinoPointSize'),
          neutrinoOpacity: numCtrl('neutrinoOpacity'),
          neutrinoRotSpeed: numCtrl('neutrinoRotSpeed'),
          neutrinoArcHeight: numCtrl('neutrinoArcHeight'),
          neutrinoPulseScale: numCtrl('neutrinoPulseScale'),
        },
        { collapsed: true }
      ),
      '光影與鏡頭': folder(
        {
          ambientIntensity: numCtrl('ambientIntensity'),
          directionalIntensity: numCtrl('directionalIntensity'),
          centerPointLightIntensity: numCtrl('centerPointLightIntensity'),
          fogDensity: numCtrl('fogDensity'),
          birdEyeHeight: numCtrl('birdEyeHeight'),
          bodyGraphCamY: numCtrl('bodyGraphCamY'),
          bodyGraphCamZ: numCtrl('bodyGraphCamZ'),
        },
        { collapsed: true }
      ),
      '金探子飛行與衝刺': folder(
        {
          freeRoamSpeed: numCtrl('freeRoamSpeed'),
          freeRoamSprintMultiplier: numCtrl('freeRoamSprintMultiplier'),
          interiorFlySpeed: numCtrl('interiorFlySpeed'),
          interiorSprintSpeed: numCtrl('interiorSprintSpeed'),
        },
        { collapsed: true }
      ),
      '待機電影模式': folder(
        {
          idleTimeoutSec: numCtrl('idleTimeoutSec'),
          idleOrbitSpeed: numCtrl('idleOrbitSpeed'),
          idleVerticalSpeed: numCtrl('idleVerticalSpeed'),
          idleVerticalAmp: numCtrl('idleVerticalAmp'),
          idleCameraDistFree: numCtrl('idleCameraDistFree'),
          idleCameraDistCorridor: numCtrl('idleCameraDistCorridor'),
          idleCameraDistInterior: numCtrl('idleCameraDistInterior'),
          idleZoomAmp: numCtrl('idleZoomAmp'),
        },
        { collapsed: true }
      ),
      '💾 寫回本機 JSON': button(() => {
        void saveToLocalFile();
      }),
      '↩️ 重設回已儲存數值': button(() => {
        const savedStudio = pickStudioValues(useSceneConfigStore.getState().savedConfig);
        setStudio({ ...savedStudio, showRuler: false });
        setConfig(savedStudio);
        setShowRuler(false);
        useSceneConfigStore.setState({ saveStatus: '↩️ 已重設回已儲存數值' });
        setTimeout(() => useSceneConfigStore.setState({ saveStatus: '' }), 2200);
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
        const savedPalette = pickPaletteValues(useSceneConfigStore.getState().savedConfig);
        setPalette(savedPalette);
        setConfig(savedPalette);
        useSceneConfigStore.setState({ saveStatus: '↩️ 已還原已儲存調色盤' });
        setTimeout(() => useSceneConfigStore.setState({ saveStatus: '' }), 2200);
      }),
    }),
    { store: paletteStore }
  );

  useEffect(() => {
    const { showRuler, ...sceneValues } = studioValues;
    // 安全 clamp，避免手動鍵盤輸入或拖曳超出合理區間
    const clamped: Partial<SceneConfig> = {};
    for (const k of STUDIO_NUMERIC_KEYS) {
      const raw = sceneValues[k];
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        const { min, max } = STUDIO_PARAM_SPECS[k];
        clamped[k] = Math.max(min, Math.min(max, raw));
      }
    }
    setConfig(clamped);
    setShowRuler(showRuler);
  }, [studioValues, setConfig, setShowRuler]);

  useEffect(() => {
    setConfig(paletteValues);
  }, [paletteValues, setConfig]);

  // 滑鼠移到任一參數列（標籤或數字框）上時，直接用滾輪微調數值（按住 Shift 為 5 倍步進）
  useEffect(() => {
    const wrap = studioWrapRef.current;
    if (!wrap) return;

    const findParamKeyAtTarget = (target: EventTarget | null): StudioNumericKey | null => {
      if (!(target instanceof HTMLElement)) return null;

      // 1. 直接在 input 上
      const directInput = target.closest('input[id]') as HTMLInputElement | null;
      if (directInput) {
        const key = extractParamKeyFromId(directInput.id);
        if (key) return key;
      }

      // 2. 在 label 上
      const labelEl = target.closest('label[for]') as HTMLLabelElement | null;
      if (labelEl) {
        const key = extractParamKeyFromId(labelEl.htmlFor);
        if (key) return key;
      }

      // 3. 往父層最多找 3 層，匹配單一數值輸入列
      let node: HTMLElement | null = target;
      for (let depth = 0; depth < 3 && node && node !== wrap; depth++) {
        const inputs = node.querySelectorAll<HTMLInputElement>('input[id]');
        if (inputs.length === 1) {
          const key = extractParamKeyFromId(inputs[0].id);
          if (key) return key;
        }
        node = node.parentElement;
      }
      return null;
    };

    const handleWheel = (e: WheelEvent) => {
      const key = findParamKeyAtTarget(e.target);
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();

      const spec = STUDIO_PARAM_SPECS[key];
      const currentVal = useSceneConfigStore.getState().config[key];
      const dir = e.deltaY < 0 ? 1 : -1;
      const mult = e.shiftKey ? 5 : 1;
      const nextVal = Number(
        Math.max(spec.min, Math.min(spec.max, currentVal + dir * spec.step * mult)).toFixed(6)
      );
      if (nextVal !== currentVal) {
        setStudio({ [key]: nextVal } as Partial<typeof studioValues>);
      }
    };

    wrap.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', handleWheel);
  }, [setStudio]);

  const dockWidthPx = Math.round(280 * Math.max(1, studioFontSize / 11));
  const levaTheme = useMemo(
    () => ({
      fontSizes: {
        root: `${studioFontSize}px`,
      },
      sizes: {
        rootWidth: `${dockWidthPx}px`,
        controlWidth: `${Math.round(92 * Math.max(1, studioFontSize / 11))}px`,
      },
    }),
    [studioFontSize, dockWidthPx]
  );

  return (
    <>
      <div className="studio-leva-dock" style={{ width: `${dockWidthPx}px` }}>
        <DisplayModeDockPanel fontSize={studioFontSize} />
        {displayMode === 'universe-3d' && (
          <div
            ref={studioWrapRef}
            className="studio-leva-dock__studio-wrap"
            title="滑鼠移至任一參數上滾動滾輪或左右拖曳即可調整（按住 Shift 加速 5 倍）"
          >
            <LevaPanel
              store={studioStore}
              theme={levaTheme}
              fill
              collapsed={true}
              neverHide
              titleBar={{ title: '🎛️ 場景調參 Studio', drag: false, filter: true }}
            />
          </div>
        )}
        <LevaPanel
          store={paletteStore}
          theme={levaTheme}
          fill
          collapsed={true}
          neverHide
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
