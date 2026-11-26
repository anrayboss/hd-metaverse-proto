import SwissEph from 'swisseph-wasm';

const RAVE_MANDALA_ORDER = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];

function lonToGateLine(lon) {
  const norm = (((lon - 302.0) % 360) + 360) % 360;
  const pct = norm / 360;
  return {
    gate: RAVE_MANDALA_ORDER[Math.floor(pct * 64) % 64],
    line: (Math.floor(pct * 384) % 6) + 1,
    color: (Math.floor(pct * 2304) % 6) + 1,
    tone: (Math.floor(pct * 13824) % 6) + 1,
    base: (Math.floor(pct * 69120) % 5) + 1,
  };
}

function dateToJd(swe, d) {
  return swe.julday(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + d.getUTCMilliseconds() / 3600000,
    swe.SE_GREG_CAL
  );
}

function signedAngleDiffDeg(a, b) {
  let diff = (((a - b) % 360) + 540) % 360 - 180;
  if (diff === -180) diff = 180;
  return diff;
}

async function run() {
  const swe = new SwissEph();
  await swe.initSwissEph();

  // 測試基準：1993-09-06 01:52 Asia/Taipei (UTC+8 => 1993-09-05T17:52:00Z)
  const birthUtc = new Date('1993-09-05T17:52:00.000Z');
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

  const pJd = dateToJd(swe, birthUtc);
  const pSunLon = ((swe.calc_ut(pJd, swe.SE_SUN, flags)[0] % 360) + 360) % 360;

  // 二分搜尋 88° 設計時間
  const targetLon = (((pSunLon - 88.0) % 360) + 360) % 360;
  let low = birthUtc.getTime() - 95 * 86400 * 1000;
  let high = birthUtc.getTime() - 82 * 86400 * 1000;
  for (let i = 0; i < 42; i++) {
    const mid = (low + high) / 2;
    const midLon = ((swe.calc_ut(dateToJd(swe, new Date(mid)), swe.SE_SUN, flags)[0] % 360) + 360) % 360;
    const diff = signedAngleDiffDeg(midLon, targetLon);
    if (Math.abs(diff) < 1e-6) {
      low = high = mid;
      break;
    }
    if (diff < 0) low = mid;
    else high = mid;
  }
  const designUtc = new Date((low + high) / 2);
  const dJd = dateToJd(swe, designUtc);
  const dSunLon = ((swe.calc_ut(dJd, swe.SE_SUN, flags)[0] % 360) + 360) % 360;

  const sunDiff = Math.abs(signedAngleDiffDeg(pSunLon, dSunLon) - 88.0);
  if (sunDiff > 0.001) {
    throw new Error(`Design Sun 88° offset error too large: ${sunDiff}`);
  }

  const bodies = [
    ['Sun', swe.SE_SUN],
    ['Moon', swe.SE_MOON],
    ['North Node', swe.SE_TRUE_NODE],
    ['Mercury', swe.SE_MERCURY],
    ['Venus', swe.SE_VENUS],
    ['Mars', swe.SE_MARS],
    ['Jupiter', swe.SE_JUPITER],
    ['Saturn', swe.SE_SATURN],
    ['Uranus', swe.SE_URANUS],
    ['Neptune', swe.SE_NEPTUNE],
    ['Pluto', swe.SE_PLUTO],
    ['Chiron', swe.SE_CHIRON],
    ['Lilith', swe.SE_MEAN_APOG],
  ];

  const calcSide = (jd) => {
    const rows = [];
    for (const [name, id] of bodies) {
      const r = swe.calc_ut(jd, id, flags);
      const lon = ((r[0] % 360) + 360) % 360;
      const gl = lonToGateLine(lon);
      rows.push({ name, lon: lon.toFixed(3), ...gl });
      if (name === 'Sun') {
        const earthLon = (lon + 180) % 360;
        rows.push({ name: 'Earth', lon: earthLon.toFixed(3), ...lonToGateLine(earthLon) });
      }
      if (name === 'North Node') {
        const snLon = (lon + 180) % 360;
        rows.push({ name: 'South Node', lon: snLon.toFixed(3), ...lonToGateLine(snLon) });
      }
    }
    return rows;
  };

  const pRows = calcSide(pJd);
  const dRows = calcSide(dJd);
  if (pRows.length !== 15 || dRows.length !== 15) {
    throw new Error(`Expected 15+15=30 bodies, got ${pRows.length}+${dRows.length}`);
  }

  console.log('✅ Swiss Ephemeris 30-body verification passed!');
  console.log(`   Birth UTC : ${birthUtc.toISOString()}`);
  console.log(`   Design UTC: ${designUtc.toISOString()} (Δ88° err: ${sunDiff.toFixed(6)}°)`);
  console.log(`   P-Sun: ${pRows[0].gate}.${pRows[0].line} (C${pRows[0].color} T${pRows[0].tone}) | D-Sun: ${dRows[0].gate}.${dRows[0].line} (C${dRows[0].color} T${dRows[0].tone})`);
  console.log(`   P-Chiron: ${pRows.find((r) => r.name === 'Chiron').gate}.${pRows.find((r) => r.name === 'Chiron').line} | P-Lilith: ${pRows.find((r) => r.name === 'Lilith').gate}.${pRows.find((r) => r.name === 'Lilith').line}`);
  console.log(`   D-Chiron: ${dRows.find((r) => r.name === 'Chiron').gate}.${dRows.find((r) => r.name === 'Chiron').line} | D-Lilith: ${dRows.find((r) => r.name === 'Lilith').gate}.${dRows.find((r) => r.name === 'Lilith').line}`);

  swe.close();
}

run().catch((err) => {
  console.error('❌ Chart verification failed:', err);
  process.exit(1);
});
