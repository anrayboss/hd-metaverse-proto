import { UniverseScene } from './world/UniverseScene';
import { FlatChartStage } from './components/FlatChartStage';
import { HudOverlay } from './components/HudOverlay';
import { SceneStudioPanel } from './components/SceneStudioPanel';
import { IdleCinematicOverlay } from './components/IdleCinematicOverlay';
import { useWorldStore } from './store/useWorldStore';

export function App() {
  const theme = useWorldStore((s) => s.theme);
  const displayMode = useWorldStore((s) => s.displayMode);
  const isIdleCinematic = useWorldStore((s) => s.isIdleCinematic);

  return (
    <main
      className="app-shell"
      data-theme={theme}
      data-idle-cinematic={isIdleCinematic ? 'true' : 'false'}
    >
      {displayMode === 'universe-3d' ? <UniverseScene /> : <FlatChartStage />}
      <HudOverlay />
      {import.meta.env.DEV && <SceneStudioPanel />}
      <IdleCinematicOverlay />
    </main>
  );
}

export default App;
