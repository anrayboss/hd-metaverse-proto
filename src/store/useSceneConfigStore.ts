import { create } from 'zustand';
import initialConfig from '../data/sceneConfig.json';

export interface SceneConfig {
  // 地板與曼陀羅
  floorY: number;
  floorDepth: number;
  hexagramY: number;
  hexagramScale: number;
  gateNumberY: number;
  gateNumberSize: number;
  baseTextSize: number;
  centerMarkerScale: number;
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
  // 通道管線與匯流點
  channelRadius: number;
  channelActiveRadius: number;
  channelInsideRadius: number;
  channelPulseSize: number;
  channelPulseSpeed: number;
  channelRingOpacity: number;
  junctionSphereRadius: number;
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
}

interface SceneConfigState {
  config: SceneConfig;
  saveStatus: string;
  setConfig: (partial: Partial<SceneConfig>) => void;
  resetConfig: () => void;
  saveToLocalFile: () => Promise<void>;
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = { ...initialConfig };

export const useSceneConfigStore = create<SceneConfigState>((set, get) => ({
  config: { ...DEFAULT_SCENE_CONFIG },
  saveStatus: '',

  setConfig: (partial) =>
    set((state) => ({
      config: { ...state.config, ...partial },
    })),

  resetConfig: () => set({ config: { ...DEFAULT_SCENE_CONFIG }, saveStatus: '已還原初始值' }),

  saveToLocalFile: async () => {
    try {
      const res = await fetch('/__save-scene-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(get().config),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ saveStatus: '✅ 已寫回 src/data/sceneConfig.json' });
    } catch {
      set({ saveStatus: '⚠️ 僅限本機 npm run dev 模式寫檔' });
    }
    setTimeout(() => set({ saveStatus: '' }), 3000);
  },
}));
