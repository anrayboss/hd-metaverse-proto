import { CENTERS, CenterId, GATE_BY_NUMBER, GateInfo, RAVE_MANDALA_ORDER } from '../data/mandalaData';

export interface SunActivation {
  gate: number;
  line: number;
  longitudeDeg: number;
  gateInfo: GateInfo;
}

export interface ChartData {
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  timezoneOffsetHours: number;
  blackSun: SunActivation; // 個性太陽（意識／出生當下）
  redSun: SunActivation; // 設計太陽（無意識／出生前太陽退 88°）
  definedCenters: CenterId[];
  activeGates: number[];
  ephemerisNote: string;
}

/**
 * 計算指定 UTC 時間的太陽視黃經（度數 0..360）
 * 採用標準天文平均黃經 + 中心差公式（誤差 < 0.05°，Phase 1 無需笨重 WASM）
 * 未來可直接替換為 Human Design Alive API 或 swisseph-wasm，不影響 3D 層。
 */
function calcSolarLongitudeDeg(utcDate: Date): number {
  const jd = utcDate.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0; // Days since J2000.0
  const L = (280.46 + 0.9856474 * n) % 360;
  const gDeg = (357.528 + 0.9856003 * n) % 360;
  const gRad = (gDeg * Math.PI) / 180;
  const lambda = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
  return ((lambda % 360) + 360) % 360;
}

/**
 * 黃經度數 → 人類設計曼陀羅閘門與爻線
 * Gate 41 起始於水瓶座 2°（黃經 302.0°），每閘門 5.625°（每爻 0.9375°）
 */
function longitudeToGateLine(longitudeDeg: number): SunActivation {
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
 * 輸入出生日期與時間，輸出標準化的 ChartData（資料層契約）
 */
export function calculateChart(
  birthDate: string,
  birthTime: string,
  timezoneOffsetHours = 8
): ChartData {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  const utcMs =
    Date.UTC(year || 1995, (month || 1) - 1, day || 1, hour || 12, minute || 0) -
    timezoneOffsetHours * 3600 * 1000;
  const utcDate = new Date(utcMs);

  const blackLon = calcSolarLongitudeDeg(utcDate);
  // 紅太陽定義：太陽黃經精確往回推 88°（約出生前 88~89 天）
  const redLon = (((blackLon - 88.0) % 360) + 360) % 360;

  const blackSun = longitudeToGateLine(blackLon);
  const redSun = longitudeToGateLine(redLon);

  // 太陽對宮即地球閘門（曼陀羅上 +32 格）
  const blackEarthGate = RAVE_MANDALA_ORDER[(blackSun.gateInfo.wheelIndex + 32) % 64];
  const redEarthGate = RAVE_MANDALA_ORDER[(redSun.gateInfo.wheelIndex + 32) % 64];

  const activeGates = Array.from(
    new Set([blackSun.gate, redSun.gate, blackEarthGate, redEarthGate])
  );

  // 依據太陽/地球所落中心 + 確定性派生，點亮代表性定義中心（Phase 1 視覺呈現）
  const definedSet = new Set<CenterId>([
    blackSun.gateInfo.centerId,
    redSun.gateInfo.centerId,
    'g',
  ]);
  const seed = (year + month * 31 + day * 7 + hour) % CENTERS.length;
  definedSet.add(CENTERS[seed].id);
  definedSet.add(CENTERS[(seed + 3) % CENTERS.length].id);

  return {
    birthDate,
    birthTime,
    timezoneOffsetHours,
    blackSun,
    redSun,
    definedCenters: Array.from(definedSet),
    activeGates,
    ephemerisNote: 'Phase 1 簡化天文太陽星曆（誤差 < 0.05°；紅太陽精確退 88°），之後可直接接入 Human Design Alive 完整 26 星體資料。',
  };
}
