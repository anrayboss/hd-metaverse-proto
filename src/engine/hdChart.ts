import { CenterId, GATE_BY_NUMBER, GateInfo, RAVE_MANDALA_ORDER } from '../data/mandalaData';
import { DEFAULT_CITY, localDateTimeToUtc } from '../data/cities';
import { computeEphemeris30 } from './ephemeris';
import {
  analyzeBodygraph,
  CelestialBodyKey,
  DerivedBodygraphProps,
  PLANET_ORDER_ALL,
  PlanetaryActivation,
  PlanetToggles,
  ViewMode,
} from './hdCalculator';
import { buildRecordId, ChartRecordEntry, SavedActivationItem } from './chartRecords';

export interface SunActivation {
  gate: number;
  line: number;
  longitudeDeg: number;
  gateInfo: GateInfo;
}

export interface BirthInput {
  name?: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  locationLabel?: string;
  timezone?: string; // IANA timezone, e.g. 'Asia/Taipei'
  lat?: number;
  lng?: number;
}

export interface ChartData {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  locationLabel: string;
  timezone: string;
  lat: number;
  lng: number;
  timezoneOffsetHours: number;
  timezoneOffsetMinutes: number;
  birthUtcIso: string;
  designUtcIso: string;
  blackSun: SunActivation; // 個性太陽（意識／出生當下）
  redSun: SunActivation; // 設計太陽（無意識／出生前太陽退 88°）
  personality: Record<CelestialBodyKey, PlanetaryActivation> | null;
  design: Record<CelestialBodyKey, PlanetaryActivation> | null;
  activations30: PlanetaryActivation[];
  derived: DerivedBodygraphProps | null;
  definedCenters: CenterId[];
  activeGates: number[];
  isFullEphemeris: boolean;
  ephemerisNote: string;
}

/**
 * 同步版簡化太陽黃經計算（僅作為 WASM 初始化完成前的即時首屏佔位）
 */
function calcSolarLongitudeDegFallback(utcDate: Date): number {
  const jd = utcDate.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const gDeg = (357.528 + 0.9856003 * n) % 360;
  const gRad = (gDeg * Math.PI) / 180;
  const lambda = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
  return ((lambda % 360) + 360) % 360;
}

function longitudeToSunActivation(longitudeDeg: number): SunActivation {
  const offsetFromGate41 = (((longitudeDeg - 302.0) % 360) + 360) % 360;
  const gateIndex = Math.floor(offsetFromGate41 / 5.625) % 64;
  const withinGateDeg = offsetFromGate41 - gateIndex * 5.625;
  const line = Math.min(6, Math.floor(withinGateDeg / 0.9375) + 1);
  const gate = RAVE_MANDALA_ORDER[gateIndex];
  return {
    gate,
    line,
    longitudeDeg: Number(longitudeDeg.toFixed(2)),
    gateInfo: GATE_BY_NUMBER[gate],
  };
}

/**
 * 同步版快速初算（首屏零阻塞用；完整 30 星體請呼叫 calculateFullChartAsync）
 */
export function calculateChart(
  birthDate: string,
  birthTime: string,
  timezoneOffsetHours = 8
): ChartData {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  const utcMs =
    Date.UTC(year || 1993, (month || 9) - 1, day || 6, hour || 1, minute || 52) -
    timezoneOffsetHours * 3600 * 1000;
  const utcDate = new Date(utcMs);

  const blackLon = calcSolarLongitudeDegFallback(utcDate);
  const redLon = (((blackLon - 88.0) % 360) + 360) % 360;

  const blackSun = longitudeToSunActivation(blackLon);
  const redSun = longitudeToSunActivation(redLon);

  const blackEarthGate = RAVE_MANDALA_ORDER[(blackSun.gateInfo.wheelIndex + 32) % 64];
  const redEarthGate = RAVE_MANDALA_ORDER[(redSun.gateInfo.wheelIndex + 32) % 64];

  const activeGates = Array.from(
    new Set([blackSun.gate, redSun.gate, blackEarthGate, redEarthGate])
  );

  return {
    name: '預設示例',
    birthDate,
    birthTime,
    locationLabel: DEFAULT_CITY.label,
    timezone: DEFAULT_CITY.timezone,
    lat: DEFAULT_CITY.lat,
    lng: DEFAULT_CITY.lng,
    timezoneOffsetHours,
    timezoneOffsetMinutes: timezoneOffsetHours * 60,
    birthUtcIso: utcDate.toISOString(),
    designUtcIso: new Date(utcMs - 88.5 * 86400 * 1000).toISOString(),
    blackSun,
    redSun,
    personality: null,
    design: null,
    activations30: [],
    derived: null,
    definedCenters: [blackSun.gateInfo.centerId, redSun.gateInfo.centerId],
    activeGates,
    isFullEphemeris: false,
    ephemerisNote: '正在等待瑞士星曆表 WASM 計算完整 30 筆天體資料…',
  };
}

/**
 * 完整 30 星體非同步算圖（瑞士星曆表 WASM + IANA 歷史時區 DST + 88° 二分搜尋反推）
 */
export async function calculateFullChartAsync(
  input: BirthInput,
  viewMode: ViewMode = 1,
  toggles: PlanetToggles = { nodes: true, chiron: false, lilith: false }
): Promise<ChartData> {
  const name = input.name?.trim() || '無名';
  const timezone = input.timezone || DEFAULT_CITY.timezone;
  const locationLabel = input.locationLabel || DEFAULT_CITY.label;
  const lat = input.lat ?? DEFAULT_CITY.lat;
  const lng = input.lng ?? DEFAULT_CITY.lng;

  const { utcDate, offsetMinutes } = localDateTimeToUtc(
    input.birthDate,
    input.birthTime,
    timezone
  );

  const ephem = await computeEphemeris30(utcDate);
  const derived = analyzeBodygraph(ephem.design, ephem.personality, viewMode, toggles);

  const blackSun: SunActivation = {
    gate: ephem.personality.Sun.gate,
    line: ephem.personality.Sun.line,
    longitudeDeg: ephem.personality.Sun.longitudeDeg,
    gateInfo: ephem.personality.Sun.gateInfo,
  };
  const redSun: SunActivation = {
    gate: ephem.design.Sun.gate,
    line: ephem.design.Sun.line,
    longitudeDeg: ephem.design.Sun.longitudeDeg,
    gateInfo: ephem.design.Sun.gateInfo,
  };

  return {
    name,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    locationLabel,
    timezone,
    lat,
    lng,
    timezoneOffsetHours: Number((offsetMinutes / 60).toFixed(2)),
    timezoneOffsetMinutes: offsetMinutes,
    birthUtcIso: ephem.birthUtcIso,
    designUtcIso: ephem.designUtcIso,
    blackSun,
    redSun,
    personality: ephem.personality,
    design: ephem.design,
    activations30: ephem.activations30,
    derived,
    definedCenters: derived.definedCenters,
    activeGates: derived.activeGates,
    isFullEphemeris: true,
    ephemerisNote:
      '瑞士星曆表 (Swiss Ephemeris WASM) 完整 30 筆天體（含凱龍星、黑月莉莉斯），紅太陽以二分搜尋精確退 88°。',
  };
}

/** 將 ChartData 轉為可持久化的 30 筆歷史紀錄物件 */
export function chartDataToRecordEntry(chart: ChartData): ChartRecordEntry {
  const activations30: SavedActivationItem[] = chart.activations30.map((a) => ({
    side: a.side,
    body: a.body,
    gate: a.gate,
    line: a.line,
    color: a.color,
    tone: a.tone,
    base: a.base,
    longitudeDeg: a.longitudeDeg,
    isRetrograde: a.isRetrograde,
    fixingState: a.fixingState,
  }));

  return {
    id: buildRecordId(chart.name, chart.birthDate, chart.birthTime, chart.timezone),
    name: chart.name,
    birthDate: chart.birthDate,
    birthTime: chart.birthTime,
    locationLabel: chart.locationLabel,
    timezone: chart.timezone,
    lat: chart.lat,
    lng: chart.lng,
    timezoneOffsetMinutes: chart.timezoneOffsetMinutes,
    birthUtcIso: chart.birthUtcIso,
    designUtcIso: chart.designUtcIso,
    savedAt: new Date().toISOString(),
    summary: {
      Type: chart.derived?.Type || '-',
      Authority: chart.derived?.Authority || '-',
      Definition: chart.derived?.Definition || '-',
      Mode: chart.derived?.Mode || '-',
      Profile: chart.derived?.Profile || '-',
      CrossChinese: chart.derived?.CrossChinese || '-',
    },
    activations30,
  };
}

/** 從已存檔的 ChartRecordEntry 快速還原為完整 ChartData（免重跑星曆） */
export function recordEntryToChartData(
  record: ChartRecordEntry,
  viewMode: ViewMode = 1,
  toggles: PlanetToggles = { nodes: true, chiron: false, lilith: false }
): ChartData {
  const personality = {} as Record<CelestialBodyKey, PlanetaryActivation>;
  const design = {} as Record<CelestialBodyKey, PlanetaryActivation>;

  for (const item of record.activations30) {
    const full: PlanetaryActivation = {
      ...item,
      speedDegPerDay: item.isRetrograde ? -0.1 : 0.1,
      gateInfo: GATE_BY_NUMBER[item.gate],
    };
    if (item.side === 'personality') {
      personality[item.body] = full;
    } else {
      design[item.body] = full;
    }
  }

  const activations30: PlanetaryActivation[] = [
    ...PLANET_ORDER_ALL.map((k) => personality[k]).filter(Boolean),
    ...PLANET_ORDER_ALL.map((k) => design[k]).filter(Boolean),
  ];

  const derived = analyzeBodygraph(design, personality, viewMode, toggles);

  return {
    name: record.name,
    birthDate: record.birthDate,
    birthTime: record.birthTime,
    locationLabel: record.locationLabel,
    timezone: record.timezone,
    lat: record.lat,
    lng: record.lng,
    timezoneOffsetHours: Number((record.timezoneOffsetMinutes / 60).toFixed(2)),
    timezoneOffsetMinutes: record.timezoneOffsetMinutes,
    birthUtcIso: record.birthUtcIso,
    designUtcIso: record.designUtcIso,
    blackSun: {
      gate: personality.Sun.gate,
      line: personality.Sun.line,
      longitudeDeg: personality.Sun.longitudeDeg,
      gateInfo: personality.Sun.gateInfo,
    },
    redSun: {
      gate: design.Sun.gate,
      line: design.Sun.line,
      longitudeDeg: design.Sun.longitudeDeg,
      gateInfo: design.Sun.gateInfo,
    },
    personality,
    design,
    activations30,
    derived,
    definedCenters: derived.definedCenters,
    activeGates: derived.activeGates,
    isFullEphemeris: true,
    ephemerisNote: '自已存檔的瑞士星曆表 30 筆紀錄還原。',
  };
}
