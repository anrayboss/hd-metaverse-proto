import { useEffect } from 'react';
import { Leva, button, folder, useControls } from 'leva';
import { DEFAULT_SCENE_CONFIG, useSceneConfigStore } from '../store/useSceneConfigStore';

export function SceneStudioPanel() {
  const setConfig = useSceneConfigStore((s) => s.setConfig);
  const saveToLocalFile = useSceneConfigStore((s) => s.saveToLocalFile);
  const saveStatus = useSceneConfigStore((s) => s.saveStatus);

  const [values, set] = useControls('3D 場景即時調參', () => ({
    '地板與曼陀羅': folder({
      floorY: { value: DEFAULT_SCENE_CONFIG.floorY, min: -4, max: 2, step: 0.05, label: '地板高度 Y' },
      floorDepth: { value: DEFAULT_SCENE_CONFIG.floorDepth, min: 0.4, max: 8, step: 0.1, label: '圓盤厚度' },
      hexagramY: { value: DEFAULT_SCENE_CONFIG.hexagramY, min: 0.2, max: 6, step: 0.05, label: '卦象高度 Y' },
      gateNumberY: { value: DEFAULT_SCENE_CONFIG.gateNumberY, min: 1, max: 9, step: 0.1, label: '數字高度 Y' },
    }),
    '走廊與人體圖': folder({
      corridorWallHeight: { value: DEFAULT_SCENE_CONFIG.corridorWallHeight, min: 2, max: 14, step: 0.2, label: '透明牆高度' },
      corridorWallOpacity: { value: DEFAULT_SCENE_CONFIG.corridorWallOpacity, min: 0.02, max: 0.6, step: 0.02, label: '透明牆濃度' },
      corridorCameraY: { value: DEFAULT_SCENE_CONFIG.corridorCameraY, min: 1.2, max: 6, step: 0.05, label: '走廊視角高度' },
      bodyGraphFlatY: { value: DEFAULT_SCENE_CONFIG.bodyGraphFlatY, min: -1, max: 3, step: 0.02, label: '躺平人體圖 Y' },
    }),
    '光影與鏡頭': folder({
      ambientIntensity: { value: DEFAULT_SCENE_CONFIG.ambientIntensity, min: 0.2, max: 2.5, step: 0.05, label: '環境光強度' },
      fogDensity: { value: DEFAULT_SCENE_CONFIG.fogDensity, min: 0, max: 0.008, step: 0.0002, label: '迷霧濃度' },
      birdEyeHeight: { value: DEFAULT_SCENE_CONFIG.birdEyeHeight, min: 120, max: 320, step: 2, label: '鳥瞰高度' },
    }),
    '💾 寫回本機 JSON': button(() => {
      void saveToLocalFile();
    }),
    '↩️ 重置為已存檔數值': button(() => {
      set(DEFAULT_SCENE_CONFIG);
      setConfig(DEFAULT_SCENE_CONFIG);
    }),
  }));

  useEffect(() => {
    setConfig(values);
  }, [values, setConfig]);

  return (
    <>
      <Leva collapsed={false} titleBar={{ title: '🎛️ 場景調參 Studio' }} />
      {saveStatus && <div className="studio-toast">{saveStatus}</div>}
    </>
  );
}
