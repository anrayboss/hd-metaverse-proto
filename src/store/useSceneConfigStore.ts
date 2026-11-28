import { create } from 'zustand';
import initialConfig from '../data/sceneConfig.json';

export interface SceneConfig {
  // 地板與曼陀羅
  floorY: number;
  floorDepth: number;
  gateDividerWidth: number;
  ringLabelY: number;
  hexagramBaseY: number;
  hexagramY: number;
  hexagramScale: number;
  gateNumberY: number;
  gateNumberSize: number;
  gateRingNumberY: number;
  baseTextY: number;
  baseTextSize: number;
  centerMarkerY: number;
  centerMarkerScale: number;
  codonTokenY: number;
  avatarMinY: number;
  // 1/64 閘門走廊
  corridorWallHeight: number;
  corridorWallOpacity: number;
  corridorCameraY: number;
  corridorWalkSpeed: number;
  corridorStationScale: number;
  // 中庭人體圖與九中心
  bodyGraphFlatY: number;
  bodyGraphScale: number;
  bodyGraphAtriumRadius: number;
  centerEmissiveDefined: number;
  centerInteriorOpacity: number;
  centerInteriorLight: number;
  bodyGraphGateNumSize: number;
  bodyGraphGateExtrude: number;
  // 通道管線與匯流點
  channelRadius: number;
  channelActiveRadius: number;
  channelInsideRadius: number;
  channelPulseSize: number;
  channelPulseSpeed: number;
  channelRingOpacity: number;
  junctionSphereRadius: number;
  rootSideChannelOffsetZ: number;
  // 微中子流場
  neutrinoPointSize: number;
  neutrinoOpacity: number;
  neutrinoRotSpeed: number;
  neutrinoArcHeight: number;
  neutrinoPulseScale: number;
  // 光影與鏡頭
  ambientIntensity: number;
  directionalIntensity: number;
  centerPointLightIntensity: number;
  fogDensity: number;
  birdEyeHeight: number;
  bodyGraphCamY: number;
  bodyGraphCamZ: number;
  freeRoamSpeed: number;
  freeRoamSprintMultiplier: number;
  interiorFlySpeed: number;
  interiorSprintSpeed: number;
  // 待機電影模式
  idleTimeoutSec: number;
  idleOrbitSpeed: number;
  idleVerticalSpeed: number;
  idleVerticalAmp: number;
  idleCameraDistMin: number;
  idleCameraDistMax: number;
  idleZoomSpeed: number;
  // 介面字體尺寸
  studioFontSize: number;
  chartPanelFontSize: number;
  // 全站調色盤（2D 本命圖 / 2D 基礎曼陀羅 / 3D 元宇宙共用）
  colorDesign: string;
  colorPersonality: string;
  colorBoth: string;
  colorActiveGateBg: string;
  colorFloorLight: string;
  colorGridStroke: string;
  colorCircleDefined: string;
  colorCircleUndefined: string;
  colorChannelActive: string;
  colorChannelInactive: string;
  colorBodyGraphGateDefined: string;
  colorBodyGraphGateUndefined: string;
  colorCenterHead: string;
  colorCenterAjna: string;
  colorCenterThroat: string;
  colorCenterG: string;
  colorCenterEgo: string;
  colorCenterSolar: string;
  colorCenterSpleen: string;
  colorCenterSacral: string;
  colorCenterRoot: string;
  colorQuadInitiation: string;
  colorQuadCivilization: string;
  colorQuadDuality: string;
  colorQuadMutation: string;
  // 3D 人體圖閘門數字自訂水平偏移 [dx, dz]（可於前端滑鼠拖曳調整並寫回 JSON）
  gateDigitOffsets: Record<string, [number, number]>;
}

export interface HoveredRulerInfo {
  name: string;
  size: [number, number, number];
  clientX: number;
  clientY: number;
}

interface SceneConfigState {
  config: SceneConfig;
  savedConfig: SceneConfig;
  showRuler: boolean;
  hoveredRuler: HoveredRulerInfo | null;
  editGateDigits: boolean;
  isDraggingGateDigit: boolean;
  saveStatus: string;
  setConfig: (partial: Partial<SceneConfig>) => void;
  setShowRuler: (show: boolean) => void;
  setHoveredRuler: (info: HoveredRulerInfo | null) => void;
  setEditGateDigits: (enabled: boolean) => void;
  setIsDraggingGateDigit: (dragging: boolean) => void;
  setGateDigitOffset: (gateNum: number, dx: number, dz: number) => void;
  resetGateDigitOffsets: () => void;
  resetConfig: () => void;
  saveToLocalFile: () => Promise<void>;
}

const rawInitial = initialConfig as unknown as Partial<SceneConfig>;
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  ...(rawInitial as SceneConfig),
  gateDigitOffsets: { ...(rawInitial.gateDigitOffsets ?? {}) },
};

export const useSceneConfigStore = create<SceneConfigState>((set, get) => ({
  config: { ...DEFAULT_SCENE_CONFIG, gateDigitOffsets: { ...DEFAULT_SCENE_CONFIG.gateDigitOffsets } },
  savedConfig: { ...DEFAULT_SCENE_CONFIG, gateDigitOffsets: { ...DEFAULT_SCENE_CONFIG.gateDigitOffsets } },
  showRuler: false,
  hoveredRuler: null,
  editGateDigits: false,
  isDraggingGateDigit: false,
  saveStatus: '',

  setConfig: (partial) =>
    set((state) => ({
      config: { ...state.config, ...partial },
    })),

  setShowRuler: (showRuler) => set({ showRuler, hoveredRuler: showRuler ? get().hoveredRuler : null }),

  setHoveredRuler: (hoveredRuler) => set({ hoveredRuler }),

  setEditGateDigits: (editGateDigits) =>
    set({ editGateDigits, isDraggingGateDigit: editGateDigits ? get().isDraggingGateDigit : false }),

  setIsDraggingGateDigit: (isDraggingGateDigit) => set({ isDraggingGateDigit }),

  setGateDigitOffset: (gateNum, dx, dz) =>
    set((state) => ({
      config: {
        ...state.config,
        gateDigitOffsets: {
          ...state.config.gateDigitOffsets,
          [String(gateNum)]: [Number(dx.toFixed(3)), Number(dz.toFixed(3))],
        },
      },
    })),

  resetGateDigitOffsets: () =>
    set((state) => ({
      config: {
        ...state.config,
        gateDigitOffsets: {},
      },
      saveStatus: '↩️ 已清除全部閘門數字手動偏移',
    })),

  resetConfig: () =>
    set((state) => ({
      config: {
        ...state.savedConfig,
        gateDigitOffsets: { ...state.savedConfig.gateDigitOffsets },
      },
      saveStatus: '已還原至已儲存數值',
    })),

  saveToLocalFile: async () => {
    try {
      const current: SceneConfig = {
        ...get().config,
        gateDigitOffsets: { ...get().config.gateDigitOffsets },
      };
      const res = await fetch('/__save-scene-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({
        savedConfig: { ...current, gateDigitOffsets: { ...current.gateDigitOffsets } },
        saveStatus: '✅ 已寫回 src/data/sceneConfig.json',
      });
    } catch {
      set({ saveStatus: '⚠️ 僅限本機 npm run dev 模式寫檔' });
    }
    setTimeout(() => set({ saveStatus: '' }), 3000);
  },
}));
