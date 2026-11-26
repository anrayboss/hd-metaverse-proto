import { ActivationSide, CelestialBodyKey, FixingState } from './hdCalculator';

export interface SavedActivationItem {
  side: ActivationSide;
  body: CelestialBodyKey;
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  longitudeDeg: number;
  isRetrograde: boolean;
  fixingState: FixingState;
}

export interface ChartRecordEntry {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  locationLabel: string;
  timezone: string;
  lat: number;
  lng: number;
  timezoneOffsetMinutes: number;
  birthUtcIso: string;
  designUtcIso: string;
  savedAt: string;
  summary: {
    Type: string;
    Authority: string;
    Definition: string;
    Mode: string;
    Profile: string;
    CrossChinese: string;
  };
  /** 30 筆完整星體閘門與爻線資料（意識 15 筆 + 無意識 15 筆） */
  activations30: SavedActivationItem[];
}

const STORAGE_KEY = 'hd-metaverse-chart-records-v1';

export function loadChartRecords(): ChartRecordEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ChartRecordEntry[]).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export function buildRecordId(name: string, birthDate: string, birthTime: string, timezone: string): string {
  return `${name.trim() || '未命名'}|${birthDate}|${birthTime}|${timezone}`;
}

/**
 * 新增或更新一筆 30 星體跑圖紀錄（純瀏覽器 localStorage 持久化，不寫入版控檔案）
 */
export async function upsertChartRecord(
  entry: ChartRecordEntry
): Promise<{ records: ChartRecordEntry[]; savedToDisk: boolean }> {
  const existing = loadChartRecords();
  const filtered = existing.filter((r) => r.id !== entry.id);
  const nextRecords = [entry, ...filtered];

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    } catch {
      // ignore quota errors
    }
  }

  return { records: nextRecords, savedToDisk: false };
}
