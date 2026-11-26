import { UniverseScene } from './world/UniverseScene';
import { FlatChartStage } from './components/FlatChartStage';
import { HudOverlay } from './components/HudOverlay';
import { SceneStudioPanel } from './components/SceneStudioPanel';
import { useWorldStore } from './store/useWorldStore';

export function App() {
  const theme = useWorldStore((s) => s.theme);
  const displayMode = useWorldStore((s) => s.displayMode);

  return (
    <main className="app-shell" data-theme={theme}>
      {displayMode === 'universe-3d' ? <UniverseScene /> : <FlatChartStage />}
      <HudOverlay />
      {import.meta.env.DEV && displayMode === 'universe-3d' && <SceneStudioPanel />}
    </main>
  );
}

export default App;
