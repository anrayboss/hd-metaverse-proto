import { create } from 'zustand';
import { calculateChart, ChartData } from '../engine/hdChart';
import { CenterId, GateInfo, MANDALA_GATES } from '../data/mandalaData';

export type ThemeMode = 'light' | 'dark';

export type JourneyStage =
  | 'intro'
  | 'red-sun'
  | 'corridor'
  | 'bodygraph'
  | 'black-sun'
  | 'free-roam';

export type CorridorDirection = 'in' | 'out';

export type SelectedEntity =
  | { type: 'gate'; gate: GateInfo }
  | { type: 'center'; centerId: CenterId }
  | null;

interface WorldState {
  theme: ThemeMode;
  stage: JourneyStage;
  chart: ChartData;
  selected: SelectedEntity;
  cameraFocusTarget: [number, number, number] | null;
  showReceiptModal: boolean;
  // 1/64 完整閘門走廊極座標狀態（R ∈ [23, 87]）
  activeCorridorIndex: number;
  corridorRadius: number;
  corridorDirection: CorridorDirection;
  toggleTheme: () => void;
  setStage: (stage: JourneyStage) => void;
  nextStage: () => void;
  prevStage: () => void;
  updateBirthData: (birthDate: string, birthTime: string) => void;
  enterCorridorByGate: (gateNumber: number, dir?: CorridorDirection, startRadius?: number) => void;
  switchAdjacentCorridor: (dir: -1 | 1) => void;
  setCorridorRadius: (r: number) => void;
  toggleCorridorDirection: () => void;
  selectGate: (gate: GateInfo, focusPos?: [number, number, number]) => void;
  selectCenter: (centerId: CenterId, focusPos?: [number, number, number]) => void;
  clearSelection: () => void;
  setShowReceiptModal: (open: boolean) => void;
}

const STAGE_ORDER: JourneyStage[] = [
  'intro',
  'red-sun',
  'corridor',
  'bodygraph',
  'black-sun',
  'free-roam',
];

const initialChart = calculateChart('1995-07-15', '14:30', 8);

export const useWorldStore = create<WorldState>((set, get) => ({
  theme: 'light',
  stage: 'intro',
  chart: initialChart,
  selected: null,
  cameraFocusTarget: null,
  showReceiptModal: false,
  activeCorridorIndex: initialChart.redSun.gateInfo.wheelIndex,
  corridorRadius: 85,
  corridorDirection: 'in',

  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  setStage: (stage) => {
    const { chart } = get();
    if (stage === 'corridor') {
      set({
        stage,
        activeCorridorIndex: chart.redSun.gateInfo.wheelIndex,
        corridorRadius: 85,
        corridorDirection: 'in',
        selected: { type: 'gate', gate: chart.redSun.gateInfo },
        cameraFocusTarget: null,
      });
      return;
    }
    if (stage === 'black-sun') {
      set({
        stage,
        activeCorridorIndex: chart.blackSun.gateInfo.wheelIndex,
        corridorRadius: 25,
        corridorDirection: 'out',
        selected: { type: 'gate', gate: chart.blackSun.gateInfo },
        cameraFocusTarget: null,
      });
      return;
    }
    set({ stage, cameraFocusTarget: null });
  },

  nextStage: () => {
    const idx = STAGE_ORDER.indexOf(get().stage);
    if (idx < STAGE_ORDER.length - 1) {
      get().setStage(STAGE_ORDER[idx + 1]);
    }
  },

  prevStage: () => {
    const idx = STAGE_ORDER.indexOf(get().stage);
    if (idx > 0) {
      get().setStage(STAGE_ORDER[idx - 1]);
    }
  },

  updateBirthData: (birthDate, birthTime) => {
    const chart = calculateChart(birthDate, birthTime, 8);
    set({
      chart,
      activeCorridorIndex: chart.redSun.gateInfo.wheelIndex,
    });
  },

  enterCorridorByGate: (gateNumber, dir = 'in', startRadius) => {
    const found = MANDALA_GATES.find((g) => g.gate === gateNumber);
    if (!found) return;
    set({
      stage: 'corridor',
      activeCorridorIndex: found.wheelIndex,
      corridorDirection: dir,
      corridorRadius: startRadius ?? (dir === 'in' ? 85 : 25),
      selected: { type: 'gate', gate: found },
      cameraFocusTarget: null,
    });
  },

  switchAdjacentCorridor: (dir) => {
    const nextIdx = (get().activeCorridorIndex + dir + 64) % 64;
    const nextGate = MANDALA_GATES[nextIdx];
    set({
      activeCorridorIndex: nextIdx,
      selected: { type: 'gate', gate: nextGate },
    });
  },

  setCorridorRadius: (r) => set({ corridorRadius: Math.max(23, Math.min(86.5, r)) }),

  toggleCorridorDirection: () =>
    set((s) => ({ corridorDirection: s.corridorDirection === 'in' ? 'out' : 'in' })),

  selectGate: (gate, focusPos) =>
    set({
      selected: { type: 'gate', gate },
      cameraFocusTarget: focusPos ?? null,
    }),

  selectCenter: (centerId, focusPos) =>
    set({
      selected: { type: 'center', centerId },
      cameraFocusTarget: focusPos ?? null,
    }),

  clearSelection: () => set({ selected: null, cameraFocusTarget: null }),

  setShowReceiptModal: (open) => set({ showReceiptModal: open }),
}));
