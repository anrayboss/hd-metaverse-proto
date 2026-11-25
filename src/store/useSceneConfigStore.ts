import { create } from 'zustand';
import initialConfig from '../data/sceneConfig.json';

export interface SceneConfig {
  floorY: number;
  floorDepth: number;
  hexagramY: number;
  gateNumberY: number;
  corridorWallHeight: number;
  corridorWallOpacity: number;
  corridorCameraY: number;
  bodyGraphFlatY: number;
  ambientIntensity: number;
  fogDensity: number;
  birdEyeHeight: number;
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
