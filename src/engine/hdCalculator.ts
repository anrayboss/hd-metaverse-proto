import {
  CenterId,
  CHANNELS,
  ChannelInfo,
  GATE_BY_NUMBER,
  GateInfo,
  RAVE_MANDALA_ORDER,
} from '../data/mandalaData';
import crossNamesRaw from '../data/crossNames.json';
import { LINE_FIXINGS } from '../data/fixings';

export type CelestialBodyKey =
  | 'Sun'
  | 'Earth'
  | 'North Node'
  | 'South Node'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Chiron'
  | 'Lilith';

export type ActivationSide = 'design' | 'personality';
export type FixingState = 'Exalted' | 'Detriment' | 'Both' | 'None';

/** 0 = 無意識 (Design), 1 = 本命圖 (Combined), 2 = 意識 (Personality) */
export type ViewMode = 0 | 1 | 2;

export interface PlanetToggles {
  nodes: boolean;
  chiron: boolean;
  lilith: boolean;
}

export interface PlanetaryActivation {
  body: CelestialBodyKey;
  side: ActivationSide;
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  longitudeDeg: number;
  speedDegPerDay: number;
  isRetrograde: boolean;
  fixingState: FixingState;
  gateInfo: GateInfo;
}

export interface VariableArrow {
  position: 'tl' | 'bl' | 'tr' | 'br';
  side: ActivationSide;
  label: string;
  isLeft: boolean; // Tone <= 3 為左箭頭，Tone >= 4 為右箭頭
  color: number;
  tone: number;
  base: number;
}

export interface GateActivationStatus {
  d: boolean;
  p: boolean;
}

export interface DerivedBodygraphProps {
  Type: string;
  Authority: string;
  Definition: string;
  Strategy: string;
  Mode: string;
  Profile: string;
  CrossEnglish: string;
  CrossChinese: string;
  activeGates: number[];
  gateStatus: Record<number, GateActivationStatus>;
  activeChannels: ChannelInfo[];
  definedCenters: CenterId[];
  variables: VariableArrow[];
}

export const PLANET_ORDER_CORE: CelestialBodyKey[] = [
  'Sun',
  'Earth',
  'North Node',
  'South Node',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];

export const PLANET_ORDER_ALL: CelestialBodyKey[] = [
  ...PLANET_ORDER_CORE,
  'Chiron',
  'Lilith',
];

export const PLANET_SYMBOLS: Record<CelestialBodyKey, string> = {
  Sun: '☉',
  Earth: '⊕',
  'North Node': '☊',
  'South Node': '☋',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Chiron: 'k',
  Lilith: '⚸',
};

export const PLANET_LABELS_ZH: Record<CelestialBodyKey, string> = {
  Sun: '太陽',
  Earth: '地球',
  'North Node': '北交點',
  'South Node': '南交點',
  Moon: '月亮',
  Mercury: '水星',
  Venus: '金星',
  Mars: '火星',
  Jupiter: '木星',
  Saturn: '土星',
  Uranus: '天王星',
  Neptune: '海王星',
  Pluto: '冥王星',
  Chiron: '凱龍星',
  Lilith: '黑月莉莉斯',
};

/** 保留過往 2D 跑圖專案的自定義術語對照表 */
export const TERM_MAP: Record<string, string> = {
  name: '稱呼',
  birthdate: '出生日期',
  birthtime: '出生時間',
  timezone: '時區',
  asteroid: '星體切換',
  cons_uncons: '視角切換',
  Manifestor: '顯化者',
  Generator: '建造者',
  'Manifesting Generator': '顯化創造者',
  Projector: '引導者',
  Reflector: '沉浸者',
  'To Inform': '表明自己的意圖',
  'To Respond - Generator': '信任自己的薦骨',
  'To Respond - Manifesting Generator': '信任自己的薦骨，並表明自己的意圖',
  'Wait for the Invitation': '累積實力並伺機行動',
  'Wait a Lunar Cycle': '用一個月的時間感受自己的不同面向',
  'Emotional - Solar Plexus': '情緒智慧',
  Sacral: '薦骨智慧',
  Splenic: '脾臟智慧',
  Ego: '心臟智慧',
  'Self Projected': '自我定位智慧',
  Mental: '環境智慧',
  None: '無內在智慧',
  Lunar: '月亮智慧',
  'No Definition': '沒有固定區塊',
  'Single Definition': '一個區塊',
  'Split Definition': '兩個區塊',
  'Triple Split Definition': '三個區塊',
  'Quadruple Split Definition': '四個區塊',
  'To Do': '執行',
  'To Wait': '臨在',
};

const MOTORS: CenterId[] = ['root', 'sacral', 'solar', 'ego'];
const CROSS_NAMES = crossNamesRaw as Record<string, string>;

/**
 * 黃經度數 → Gate / Line / Color / Tone / Base
 * Gate 41 起始於水瓶座 2°（黃經 302.0°），一圈 360° = 64 閘門 = 384 爻 = 2304 色 = 13824 音 = 69120 基
 */
export function longitudeToActivationParts(longitudeDeg: number) {
  const norm = (((longitudeDeg - 302.0) % 360) + 360) % 360;
  const pct = norm / 360;

  const gateIndex = Math.floor(pct * 64) % 64;
  const gate = RAVE_MANDALA_ORDER[gateIndex];
  const line = (Math.floor(pct * 384) % 6) + 1;
  const color = (Math.floor(pct * 2304) % 6) + 1;
  const tone = (Math.floor(pct * 13824) % 6) + 1;
  const base = (Math.floor(pct * 69120) % 5) + 1;

  return {
    gate,
    line,
    color,
    tone,
    base,
    gateInfo: GATE_BY_NUMBER[gate],
  };
}

/** 計算單一星體落點是否曜升（Exalted）或落陷（Detriment） */
export function computeFixingState(body: CelestialBodyKey, gate: number, line: number): FixingState {
  const rule = LINE_FIXINGS[`${gate}.${line}`];
  if (!rule) return 'None';
  const match = (target?: string) => {
    if (!target || target === 'None') return false;
    return target.trim().toLowerCase() === body.toLowerCase();
  };
  const isEx = match(rule.exalted);
  const isDet = match(rule.detriment);
  if (isEx && isDet) return 'Both';
  if (isEx) return 'Exalted';
  if (isDet) return 'Detriment';
  return 'None';
}

export function getActivePlanetList(toggles: PlanetToggles): CelestialBodyKey[] {
  let list: CelestialBodyKey[] = [...PLANET_ORDER_CORE];
  if (!toggles.nodes) {
    list = list.filter((p) => p !== 'North Node' && p !== 'South Node');
  }
  if (toggles.chiron) list.push('Chiron');
  if (toggles.lilith) list.push('Lilith');
  return list;
}

export function getStrategyByType(type: string): string {
  const map: Record<string, string> = {
    Manifestor: 'To Inform',
    Generator: 'To Respond - Generator',
    'Manifesting Generator': 'To Respond - Manifesting Generator',
    Projector: 'Wait for the Invitation',
    Reflector: 'Wait a Lunar Cycle',
  };
  return map[type] || '-';
}

export function getModeByType(type: string): string {
  return type === 'Manifestor' || type === 'Manifesting Generator' ? 'To Do' : 'To Wait';
}

/** 依 Profile 與太陽/地球四個閘門精準反查 192 組人生主題（Incarnation Cross） */
export function resolveIncarnationCross(
  pSunGate: number,
  pEarthGate: number,
  dSunGate: number,
  dEarthGate: number,
  pSunLine: number,
  dSunLine: number
): { english: string; chinese: string } {
  const profile = `${pSunLine}/${dSunLine}`;
  const anglePrefix =
    profile === '4/1'
      ? 'Juxtaposition Cross'
      : ['5/1', '5/2', '6/2', '6/3'].includes(profile)
        ? 'Left Angle Cross'
        : 'Right Angle Cross';

  const needle = `(${pSunGate}/${pEarthGate} | ${dSunGate}/${dEarthGate})`;

  for (const [en, zh] of Object.entries(CROSS_NAMES)) {
    if (en.startsWith(anglePrefix) && en.includes(needle)) {
      return { english: en, chinese: zh };
    }
  }
  // 退而求其次：只比對角度前綴 + P-Sun 閘門（處理個別字典手打括號差異，如 14/5）
  for (const [en, zh] of Object.entries(CROSS_NAMES)) {
    if (en.startsWith(anglePrefix) && en.includes(`(${pSunGate}/`)) {
      return { english: en, chinese: zh };
    }
  }
  const fallback = `${anglePrefix} ${needle}`;
  return { english: fallback, chinese: fallback };
}

function checkMotorToThroat(definedCenters: Set<CenterId>, pairs: Array<[CenterId, CenterId]>): boolean {
  if (!definedCenters.has('throat')) return false;
  const adj: Partial<Record<CenterId, CenterId[]>> = {};
  for (const [c1, c2] of pairs) {
    if (!adj[c1]) adj[c1] = [];
    if (!adj[c2]) adj[c2] = [];
    adj[c1]!.push(c2);
    adj[c2]!.push(c1);
  }
  const queue: CenterId[] = ['throat'];
  const visited = new Set<CenterId>(['throat']);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (MOTORS.includes(curr)) return true;
    for (const next of adj[curr] || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

function calculateDefinition(definedCenters: Set<CenterId>, pairs: Array<[CenterId, CenterId]>): string {
  if (definedCenters.size === 0) return 'No Definition';
  const adj: Partial<Record<CenterId, CenterId[]>> = {};
  definedCenters.forEach((c) => {
    adj[c] = [];
  });
  for (const [c1, c2] of pairs) {
    adj[c1]?.push(c2);
    adj[c2]?.push(c1);
  }
  const visited = new Set<CenterId>();
  let clusters = 0;
  for (const center of definedCenters) {
    if (!visited.has(center)) {
      clusters++;
      const q: CenterId[] = [center];
      visited.add(center);
      while (q.length > 0) {
        const u = q.shift()!;
        for (const v of adj[u] || []) {
          if (!visited.has(v)) {
            visited.add(v);
            q.push(v);
          }
        }
      }
    }
  }
  if (clusters === 1) return 'Single Definition';
  if (clusters === 2) return 'Split Definition';
  if (clusters === 3) return 'Triple Split Definition';
  if (clusters >= 4) return 'Quadruple Split Definition';
  return 'Single Definition';
}

function determineType(definedCenters: Set<CenterId>, hasMotorToThroat: boolean): string {
  if (definedCenters.size === 0) return 'Reflector';
  if (definedCenters.has('sacral')) {
    return hasMotorToThroat ? 'Manifesting Generator' : 'Generator';
  }
  return hasMotorToThroat ? 'Manifestor' : 'Projector';
}

function determineAuthority(definedCenters: Set<CenterId>): string {
  if (definedCenters.has('solar')) return 'Emotional - Solar Plexus';
  if (definedCenters.has('sacral')) return 'Sacral';
  if (definedCenters.has('spleen')) return 'Splenic';
  if (definedCenters.has('ego')) return 'Ego';
  if (definedCenters.has('g')) return 'Self Projected';
  if (definedCenters.size > 0) return 'Mental';
  return 'Lunar';
}

/**
 * 依據 30 筆星體資料、視角模式（0/1/2）與星體開關（南北交/凱龍/莉莉絲），
 * 0ms 即時推導所有通道、定義中心、能量區塊、模式、類型、權威、策略、人生主題與四箭頭。
 */
export function analyzeBodygraph(
  design: Record<CelestialBodyKey, PlanetaryActivation>,
  personality: Record<CelestialBodyKey, PlanetaryActivation>,
  viewMode: ViewMode = 1,
  toggles: PlanetToggles = { nodes: true, chiron: false, lilith: false }
): DerivedBodygraphProps {
  const activePlanets = getActivePlanetList(toggles);
  const gateStatus: Record<number, GateActivationStatus> = {};

  for (const body of activePlanets) {
    const dAct = design[body];
    if (dAct) {
      if (!gateStatus[dAct.gate]) gateStatus[dAct.gate] = { d: false, p: false };
      gateStatus[dAct.gate].d = true;
    }
    const pAct = personality[body];
    if (pAct) {
      if (!gateStatus[pAct.gate]) gateStatus[pAct.gate] = { d: false, p: false };
      gateStatus[pAct.gate].p = true;
    }
  }

  const activeGateSet = new Set<number>();
  for (const [gStr, status] of Object.entries(gateStatus)) {
    const g = Number(gStr);
    if (viewMode === 0 && status.d) activeGateSet.add(g);
    else if (viewMode === 2 && status.p) activeGateSet.add(g);
    else if (viewMode === 1 && (status.d || status.p)) activeGateSet.add(g);
  }

  const activeChannels: ChannelInfo[] = [];
  const definedCentersSet = new Set<CenterId>();
  const connectedPairs: Array<[CenterId, CenterId]> = [];

  for (const ch of CHANNELS) {
    const [g1, g2] = ch.gates;
    if (activeGateSet.has(g1) && activeGateSet.has(g2)) {
      activeChannels.push(ch);
      definedCentersSet.add(ch.centers[0]);
      definedCentersSet.add(ch.centers[1]);
      connectedPairs.push(ch.centers);
    }
  }

  const hasMotorToThroat = checkMotorToThroat(definedCentersSet, connectedPairs);
  const Type = determineType(definedCentersSet, hasMotorToThroat);
  const Authority = determineAuthority(definedCentersSet);
  const Definition = calculateDefinition(definedCentersSet, connectedPairs);
  const Strategy = getStrategyByType(Type);
  const Mode = getModeByType(Type);

  const pSun = personality.Sun;
  const pEarth = personality.Earth;
  const dSun = design.Sun;
  const dEarth = design.Earth;

  const Profile = `${pSun.line} / ${dSun.line}`;
  const cross = resolveIncarnationCross(
    pSun.gate,
    pEarth.gate,
    dSun.gate,
    dEarth.gate,
    pSun.line,
    dSun.line
  );

  const dNode = design['North Node'];
  const pNode = personality['North Node'];

  // 順序對應 2x2 網格：左上=吸收、右上=動機、左下=環境、右下=視角
  const variables: VariableArrow[] = [
    {
      position: 'tl',
      side: 'design',
      label: '吸收',
      isLeft: dSun.tone <= 3,
      color: dSun.color,
      tone: dSun.tone,
      base: dSun.base,
    },
    {
      position: 'tr',
      side: 'personality',
      label: '動機',
      isLeft: pSun.tone <= 3,
      color: pSun.color,
      tone: pSun.tone,
      base: pSun.base,
    },
    {
      position: 'bl',
      side: 'design',
      label: '環境',
      isLeft: dNode.tone <= 3,
      color: dNode.color,
      tone: dNode.tone,
      base: dNode.base,
    },
    {
      position: 'br',
      side: 'personality',
      label: '視角',
      isLeft: pNode.tone <= 3,
      color: pNode.color,
      tone: pNode.tone,
      base: pNode.base,
    },
  ];

  return {
    Type,
    Authority,
    Definition,
    Strategy,
    Mode,
    Profile,
    CrossEnglish: cross.english,
    CrossChinese: cross.chinese,
    activeGates: Array.from(activeGateSet).sort((a, b) => a - b),
    gateStatus,
    activeChannels,
    definedCenters: Array.from(definedCentersSet),
    variables,
  };
}
