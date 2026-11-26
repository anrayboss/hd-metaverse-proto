import bundledRecords from '../data/chartRecords.json';
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
  const fromBundle = Array.isArray(bundledRecords) ? (bundledRecords as ChartRecordEntry[]) : [];
  if (typeof window === 'undefined') return fromBundle;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fromBundle;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fromBundle;
    // 合併本機 JSON 與 localStorage（以 id 去重，較新優先）
    const map = new Map<string, ChartRecordEntry>();
    for (const r of fromBundle) map.set(r.id, r);
    for (const r of parsed as ChartRecordEntry[]) map.set(r.id, r);
    return Array.from(map.values()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return fromBundle;
  }
}

export function buildRecordId(name: string, birthDate: string, birthTime: string, timezone: string): string {
  return `${name.trim() || '未命名'}|${birthDate}|${birthTime}|${timezone}`;
}

/**
 * 新增或更新一筆 30 星體跑圖紀錄：
 * 1. 立即同步寫入瀏覽器 localStorage
 * 2. 若在 DEV 本機開發環境，同步 POST /__save-chart-records 寫回專案 src/data/chartRecords.json
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

  let savedToDisk = false;
  if (typeof fetch !== 'undefined' && import.meta.env?.DEV) {
    try {
      const res = await fetch('/__save-chart-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextRecords),
      });
      savedToDisk = res.ok;
    } catch {
      savedToDisk = false;
    }
  }

  return { records: nextRecords, savedToDisk };
}
