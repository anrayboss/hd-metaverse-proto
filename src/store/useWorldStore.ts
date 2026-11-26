import { create } from 'zustand';
import {
  BirthInput,
  calculateChart,
  calculateFullChartAsync,
  ChartData,
  chartDataToRecordEntry,
  recordEntryToChartData,
} from '../engine/hdChart';
import {
  analyzeBodygraph,
  PlanetToggles,
  ViewMode,
} from '../engine/hdCalculator';
import {
  ChartRecordEntry,
  loadChartRecords,
  upsertChartRecord,
} from '../engine/chartRecords';
import { CenterId, GateInfo, MANDALA_GATES } from '../data/mandalaData';
import { DEFAULT_CITY } from '../data/cities';

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
  viewMode: ViewMode;
  planetToggles: PlanetToggles;
  isCalculatingChart: boolean;
  chartError: string | null;
  lastSavedToDisk: boolean;
  chartRecords: ChartRecordEntry[];
  showChartDrawer: boolean;
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
  generateFullChart: (input: BirthInput, saveRecord?: boolean) => Promise<ChartData | null>;
  loadSavedRecord: (recordId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  togglePlanet: (key: keyof PlanetToggles) => void;
  setShowChartDrawer: (open: boolean) => void;
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

const DEFAULT_TOGGLES: PlanetToggles = {
  nodes: true,
  chiron: false,
  lilith: false,
};

const initialRecords = loadChartRecords();
const initialChart: ChartData =
  initialRecords.length > 0
    ? recordEntryToChartData(initialRecords[0], 1, DEFAULT_TOGGLES)
    : calculateChart('1993-09-06', '01:52', 8);

function recomputeDerivedOnChart(
  chart: ChartData,
  viewMode: ViewMode,
  toggles: PlanetToggles
): ChartData {
  if (!chart.design || !chart.personality) return chart;
  const derived = analyzeBodygraph(chart.design, chart.personality, viewMode, toggles);
  return {
    ...chart,
    derived,
    definedCenters: derived.definedCenters,
    activeGates: derived.activeGates,
  };
}

export const useWorldStore = create<WorldState>((set, get) => ({
  theme: 'light',
  stage: 'intro',
  chart: initialChart,
  viewMode: 1,
  planetToggles: DEFAULT_TOGGLES,
  isCalculatingChart: false,
  chartError: null,
  lastSavedToDisk: false,
  chartRecords: initialRecords,
  showChartDrawer: false,
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

  generateFullChart: async (input, saveRecord = true) => {
    const { viewMode, planetToggles } = get();
    set({ isCalculatingChart: true, chartError: null });
    try {
      const fullChart = await calculateFullChartAsync(input, viewMode, planetToggles);
      let nextRecords = get().chartRecords;
      let savedToDisk = false;

      if (saveRecord) {
        const entry = chartDataToRecordEntry(fullChart);
        const saved = await upsertChartRecord(entry);
        nextRecords = saved.records;
        savedToDisk = saved.savedToDisk;
      }

      set({
        chart: fullChart,
        activeCorridorIndex: fullChart.redSun.gateInfo.wheelIndex,
        isCalculatingChart: false,
        chartRecords: nextRecords,
        lastSavedToDisk: savedToDisk,
        showChartDrawer: true,
      });
      return fullChart;
    } catch (err) {
      set({
        isCalculatingChart: false,
        chartError: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  loadSavedRecord: (recordId) => {
    const { chartRecords, viewMode, planetToggles } = get();
    const found = chartRecords.find((r) => r.id === recordId);
    if (!found) return;
    const restored = recordEntryToChartData(found, viewMode, planetToggles);
    set({
      chart: restored,
      activeCorridorIndex: restored.redSun.gateInfo.wheelIndex,
      showChartDrawer: true,
    });
  },

  setViewMode: (mode) => {
    const { chart, planetToggles } = get();
    const updated = recomputeDerivedOnChart(chart, mode, planetToggles);
    set({ viewMode: mode, chart: updated });
  },

  togglePlanet: (key) => {
    const { chart, viewMode, planetToggles } = get();
    const nextToggles: PlanetToggles = {
      ...planetToggles,
      [key]: !planetToggles[key],
    };
    const updated = recomputeDerivedOnChart(chart, viewMode, nextToggles);
    set({ planetToggles: nextToggles, chart: updated });
  },

  setShowChartDrawer: (open) => set({ showChartDrawer: open }),

  enterCorridorByGate: (gateNumber, dir = 'in', startRadius) => {
    const idx = MANDALA_GATES.findIndex((g) => g.gate === gateNumber);
    if (idx < 0) return;
    const radius = startRadius ?? (dir === 'in' ? 85 : 25);
    set({
      stage: dir === 'in' ? 'corridor' : 'black-sun',
      activeCorridorIndex: idx,
      corridorRadius: radius,
      corridorDirection: dir,
      selected: { type: 'gate', gate: MANDALA_GATES[idx] },
      cameraFocusTarget: null,
    });
  },

  switchAdjacentCorridor: (dir) => {
    const nextIdx = (get().activeCorridorIndex + dir + 64) % 64;
    set({
      activeCorridorIndex: nextIdx,
      selected: { type: 'gate', gate: MANDALA_GATES[nextIdx] },
    });
  },

  setCorridorRadius: (r) =>
    set({
      corridorRadius: Math.max(23, Math.min(87, r)),
    }),

  toggleCorridorDirection: () =>
    set((s) => ({
      corridorDirection: s.corridorDirection === 'in' ? 'out' : 'in',
    })),

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

// 若一開始沒有歷史紀錄，背景自動以預設出生資料初始化完整瑞士星曆表（不阻塞首屏）
if (typeof window !== 'undefined' && !initialChart.isFullEphemeris) {
  void useWorldStore
    .getState()
    .generateFullChart(
      {
        name: '預設示例',
        birthDate: '1993-09-06',
        birthTime: '01:52',
        locationLabel: DEFAULT_CITY.label,
        timezone: DEFAULT_CITY.timezone,
        lat: DEFAULT_CITY.lat,
        lng: DEFAULT_CITY.lng,
      },
      false
    )
    .then(() => {
      // 首次背景載入完成不自動彈開抽屜，保留乾淨的入口鳥瞰畫面
      useWorldStore.setState({ showChartDrawer: false });
    });
}
