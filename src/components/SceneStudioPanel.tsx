import { useEffect } from 'react';
import { Leva, button, folder, useControls } from 'leva';
import { DEFAULT_SCENE_CONFIG, useSceneConfigStore } from '../store/useSceneConfigStore';

export function SceneStudioPanel() {
  const setConfig = useSceneConfigStore((s) => s.setConfig);
  const saveToLocalFile = useSceneConfigStore((s) => s.saveToLocalFile);
  const saveStatus = useSceneConfigStore((s) => s.saveStatus);

  const [values, set] = useControls('3D 場景即時調參', () => ({
    '地板與曼陀羅': folder(
      {
        floorY: { value: DEFAULT_SCENE_CONFIG.floorY, min: -4, max: 2, step: 0.05, label: '地板高度 Y' },
        floorDepth: { value: DEFAULT_SCENE_CONFIG.floorDepth, min: 0.4, max: 8, step: 0.1, label: '圓盤厚度' },
        hexagramY: { value: DEFAULT_SCENE_CONFIG.hexagramY, min: 0.2, max: 6, step: 0.05, label: '卦象高度 Y' },
        hexagramScale: { value: DEFAULT_SCENE_CONFIG.hexagramScale, min: 0.4, max: 2.5, step: 0.05, label: '卦象縮放' },
        gateNumberY: { value: DEFAULT_SCENE_CONFIG.gateNumberY, min: 1, max: 9, step: 0.1, label: '數字高度 Y' },
        gateNumberSize: { value: DEFAULT_SCENE_CONFIG.gateNumberSize, min: 0.6, max: 3, step: 0.05, label: '數字大小' },
        baseTextSize: { value: DEFAULT_SCENE_CONFIG.baseTextSize, min: 0.5, max: 2.5, step: 0.05, label: '鹼基字大小' },
        centerMarkerScale: { value: DEFAULT_SCENE_CONFIG.centerMarkerScale, min: 0.4, max: 2.5, step: 0.05, label: '外環中心塊縮放' },
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
      { collapsed: false }
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
