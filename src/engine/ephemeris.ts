import SwissEph from 'swisseph-wasm';
import {
  ActivationSide,
  CelestialBodyKey,
  computeFixingState,
  longitudeToActivationParts,
  PLANET_ORDER_ALL,
  PlanetaryActivation,
} from './hdCalculator';

let sweInstance: SwissEph | null = null;
let sweInitPromise: Promise<SwissEph> | null = null;

async function getSwissEph(): Promise<SwissEph> {
  if (sweInstance) return sweInstance;
  if (!sweInitPromise) {
    sweInitPromise = (async () => {
      const swe = new SwissEph();
      await swe.initSwissEph();
      sweInstance = swe;
      return swe;
    })();
  }
  return sweInitPromise;
}

function dateToJulianDayUt(swe: SwissEph, utcDate: Date): number {
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth() + 1;
  const day = utcDate.getUTCDate();
  const hourDecimal =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60 +
    utcDate.getUTCSeconds() / 3600 +
    utcDate.getUTCMilliseconds() / 3600000;
  return swe.julday(year, month, day, hourDecimal);
}

function calcBodyLongitudeAndSpeed(
  swe: SwissEph,
  jdUt: number,
  planetId: number
): { longitude: number; speed: number } {
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const res = swe.calc_ut(jdUt, planetId, flags);
  if (!res || res.length < 4 || Number.isNaN(res[0])) {
    // 若特定年份超出 SE 檔案範圍，退回 Moshier 內建解析演算法
    const fallback = swe.calc_ut(jdUt, planetId, swe.SEFLG_MOSEPH | swe.SEFLG_SPEED);
    return {
      longitude: ((fallback[0] % 360) + 360) % 360,
      speed: fallback[3] ?? 0,
    };
  }
  return {
    longitude: ((res[0] % 360) + 360) % 360,
    speed: res[3] ?? 0,
  };
}

/**
 * 角度差（帶正負號，範圍 [-180, 180)）：(a - b)
 */
function signedAngleDiffDeg(a: number, b: number): number {
  let diff = ((a - b) % 360 + 540) % 360 - 180;
  if (diff === -180) diff = 180;
  return diff;
}

/**
 * 二分搜尋精確反推設計側時間（Design UTC）：
 * 找出出生前太陽黃經精確落於 (birthSunLon - 88°) 的 UTC 時間點（誤差 < 0.00001°）。
 */
function findDesignUtcDate(swe: SwissEph, birthUtc: Date, birthSunLon: number): Date {
  const targetLon = (((birthSunLon - 88.0) % 360) + 360) % 360;
  const DAY_MS = 86400 * 1000;
  // 太陽退 88° 約落在出生前 85 ~ 92 天之間
  let lowMs = birthUtc.getTime() - 95 * DAY_MS;
  let highMs = birthUtc.getTime() - 82 * DAY_MS;

  for (let i = 0; i < 42; i++) {
    const midMs = (lowMs + highMs) / 2;
    const midJd = dateToJulianDayUt(swe, new Date(midMs));
    const { longitude: midLon } = calcBodyLongitudeAndSpeed(swe, midJd, swe.SE_SUN);
    // 太陽順行：若 midLon 落後 targetLon（diff < 0），代表時間太早，需往後移
    const diff = signedAngleDiffDeg(midLon, targetLon);
    if (Math.abs(diff) < 1e-6) {
      return new Date(midMs);
    }
    if (diff < 0) {
      lowMs = midMs;
    } else {
      highMs = midMs;
    }
  }
  return new Date((lowMs + highMs) / 2);
}

function buildActivation(
  body: CelestialBodyKey,
  side: ActivationSide,
  longitude: number,
  speed: number
): PlanetaryActivation {
  const parts = longitudeToActivationParts(longitude);
  return {
    body,
    side,
    gate: parts.gate,
    line: parts.line,
    color: parts.color,
    tone: parts.tone,
    base: parts.base,
    longitudeDeg: Number(longitude.toFixed(4)),
    speedDegPerDay: Number(speed.toFixed(4)),
    isRetrograde: speed < 0,
    fixingState: computeFixingState(body, parts.gate, parts.line),
    gateInfo: parts.gateInfo,
  };
}

function calcAll15BodiesAt(
  swe: SwissEph,
  utcDate: Date,
  side: ActivationSide
): Record<CelestialBodyKey, PlanetaryActivation> {
  const jdUt = dateToJulianDayUt(swe, utcDate);

  const sun = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_SUN);
  const earthLon = (sun.longitude + 180) % 360;

  // 人類設計標準採用真交點 (SE_TRUE_NODE)
  const northNode = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_TRUE_NODE);
  const southNodeLon = (northNode.longitude + 180) % 360;

  const moon = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_MOON);
  const mercury = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_MERCURY);
  const venus = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_VENUS);
  const mars = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_MARS);
  const jupiter = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_JUPITER);
  const saturn = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_SATURN);
  const uranus = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_URANUS);
  const neptune = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_NEPTUNE);
  const pluto = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_PLUTO);
  const chiron = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_CHIRON);
  // 黑月莉莉斯採用平均遠地點 (SE_MEAN_APOG)
  const lilith = calcBodyLongitudeAndSpeed(swe, jdUt, swe.SE_MEAN_APOG);

  return {
    Sun: buildActivation('Sun', side, sun.longitude, sun.speed),
    Earth: buildActivation('Earth', side, earthLon, sun.speed),
    'North Node': buildActivation('North Node', side, northNode.longitude, northNode.speed),
    'South Node': buildActivation('South Node', side, southNodeLon, northNode.speed),
    Moon: buildActivation('Moon', side, moon.longitude, moon.speed),
    Mercury: buildActivation('Mercury', side, mercury.longitude, mercury.speed),
    Venus: buildActivation('Venus', side, venus.longitude, venus.speed),
    Mars: buildActivation('Mars', side, mars.longitude, mars.speed),
    Jupiter: buildActivation('Jupiter', side, jupiter.longitude, jupiter.speed),
    Saturn: buildActivation('Saturn', side, saturn.longitude, saturn.speed),
    Uranus: buildActivation('Uranus', side, uranus.longitude, uranus.speed),
    Neptune: buildActivation('Neptune', side, neptune.longitude, neptune.speed),
    Pluto: buildActivation('Pluto', side, pluto.longitude, pluto.speed),
    Chiron: buildActivation('Chiron', side, chiron.longitude, chiron.speed),
    Lilith: buildActivation('Lilith', side, lilith.longitude, lilith.speed),
  };
}

export interface Ephemeris30Result {
  birthUtcIso: string;
  designUtcIso: string;
  personality: Record<CelestialBodyKey, PlanetaryActivation>;
  design: Record<CelestialBodyKey, PlanetaryActivation>;
  /** 扁平 30 筆陣列（意識 15 筆 + 無意識 15 筆） */
  activations30: PlanetaryActivation[];
}

/**
 * 透過瑞士星曆表 WASM 計算意識（出生當下）與無意識（太陽退 88°）共 30 筆天體資料。
 */
export async function computeEphemeris30(birthUtc: Date): Promise<Ephemeris30Result> {
  const swe = await getSwissEph();
  const personality = calcAll15BodiesAt(swe, birthUtc, 'personality');
  const designUtc = findDesignUtcDate(swe, birthUtc, personality.Sun.longitudeDeg);
  const design = calcAll15BodiesAt(swe, designUtc, 'design');

  const activations30: PlanetaryActivation[] = [
    ...PLANET_ORDER_ALL.map((k) => personality[k]),
    ...PLANET_ORDER_ALL.map((k) => design[k]),
  ];

  return {
    birthUtcIso: birthUtc.toISOString(),
    designUtcIso: designUtc.toISOString(),
    personality,
    design,
    activations30,
  };
}
