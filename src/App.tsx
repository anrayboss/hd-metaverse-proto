import type { CSSProperties } from 'react';
import { UniverseScene } from './world/UniverseScene';
import { FlatChartStage } from './components/FlatChartStage';
import { HudOverlay } from './components/HudOverlay';
import { SceneStudioPanel } from './components/SceneStudioPanel';
import { IdleCinematicOverlay } from './components/IdleCinematicOverlay';
import { useWorldStore } from './store/useWorldStore';
import { useSceneConfigStore } from './store/useSceneConfigStore';

export function App() {
  const theme = useWorldStore((s) => s.theme);
  const displayMode = useWorldStore((s) => s.displayMode);
  const isIdleCinematic = useWorldStore((s) => s.isIdleCinematic);
  const chartPanelFontSize = useSceneConfigStore((s) => s.config.chartPanelFontSize);

  const shellStyle = {
    '--chart-panel-zoom': (chartPanelFontSize / 13).toFixed(3),
  } as CSSProperties;

  return (
    <main
      className="app-shell"
      data-theme={theme}
      data-idle-cinematic={isIdleCinematic ? 'true' : 'false'}
      style={shellStyle}
    >
      {displayMode === 'universe-3d' ? <UniverseScene /> : <FlatChartStage />}
      <HudOverlay />
      {import.meta.env.DEV && <SceneStudioPanel />}
      <IdleCinematicOverlay />
    </main>
  );
}

export default App;
