import { UniverseScene } from './world/UniverseScene';
import { HudOverlay } from './components/HudOverlay';
import { useWorldStore } from './store/useWorldStore';

export function App() {
  const theme = useWorldStore((s) => s.theme);

  return (
    <main className="app-shell" data-theme={theme}>
      <UniverseScene />
      <HudOverlay />
    </main>
  );
}

export default App;
