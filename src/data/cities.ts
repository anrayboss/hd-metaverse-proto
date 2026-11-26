export interface CityOption {
  id: string;
  label: string;
  country: string;
  timezone: string; // IANA timezone, e.g. 'Asia/Taipei'
  lat: number;
  lng: number;
}

export const CITY_OPTIONS: CityOption[] = [
  // 台灣主要城市
  { id: 'taipei', label: '台北 Taipei', country: '台灣', timezone: 'Asia/Taipei', lat: 25.033, lng: 121.5654 },
  { id: 'new-taipei', label: '新北 New Taipei', country: '台灣', timezone: 'Asia/Taipei', lat: 25.012, lng: 121.4657 },
  { id: 'keelung', label: '基隆 Keelung', country: '台灣', timezone: 'Asia/Taipei', lat: 25.1276, lng: 121.7392 },
  { id: 'taoyuan', label: '桃園 Taoyuan', country: '台灣', timezone: 'Asia/Taipei', lat: 24.9936, lng: 121.301 },
  { id: 'hsinchu', label: '新竹 Hsinchu', country: '台灣', timezone: 'Asia/Taipei', lat: 24.8138, lng: 120.9675 },
  { id: 'taichung', label: '台中 Taichung', country: '台灣', timezone: 'Asia/Taipei', lat: 24.1477, lng: 120.6736 },
  { id: 'changhua', label: '彰化 Changhua', country: '台灣', timezone: 'Asia/Taipei', lat: 24.0518, lng: 120.5161 },
  { id: 'chiayi', label: '嘉義 Chiayi', country: '台灣', timezone: 'Asia/Taipei', lat: 23.4801, lng: 120.4491 },
  { id: 'tainan', label: '台南 Tainan', country: '台灣', timezone: 'Asia/Taipei', lat: 22.9999, lng: 120.2269 },
  { id: 'kaohsiung', label: '高雄 Kaohsiung', country: '台灣', timezone: 'Asia/Taipei', lat: 22.6273, lng: 120.3014 },
  { id: 'pingtung', label: '屏東 Pingtung', country: '台灣', timezone: 'Asia/Taipei', lat: 22.669, lng: 120.4879 },
  { id: 'yilan', label: '宜蘭 Yilan', country: '台灣', timezone: 'Asia/Taipei', lat: 24.757, lng: 121.753 },
  { id: 'hualien', label: '花蓮 Hualien', country: '台灣', timezone: 'Asia/Taipei', lat: 23.9872, lng: 121.6016 },
  { id: 'taitung', label: '台東 Taitung', country: '台灣', timezone: 'Asia/Taipei', lat: 22.7583, lng: 121.1444 },
  // 亞洲
  { id: 'hong-kong', label: '香港 Hong Kong', country: '香港', timezone: 'Asia/Hong_Kong', lat: 22.3193, lng: 114.1694 },
  { id: 'macau', label: '澳門 Macau', country: '澳門', timezone: 'Asia/Macau', lat: 22.1987, lng: 113.5439 },
  { id: 'tokyo', label: '東京 Tokyo', country: '日本', timezone: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503 },
  { id: 'osaka', label: '大阪 Osaka', country: '日本', timezone: 'Asia/Tokyo', lat: 34.6937, lng: 135.5023 },
  { id: 'seoul', label: '首爾 Seoul', country: '韓國', timezone: 'Asia/Seoul', lat: 37.5665, lng: 126.978 },
  { id: 'singapore', label: '新加坡 Singapore', country: '新加坡', timezone: 'Asia/Singapore', lat: 1.3521, lng: 103.8198 },
  { id: 'kuala-lumpur', label: '吉隆坡 Kuala Lumpur', country: '馬來西亞', timezone: 'Asia/Kuala_Lumpur', lat: 3.139, lng: 101.6869 },
  { id: 'bangkok', label: '曼谷 Bangkok', country: '泰國', timezone: 'Asia/Bangkok', lat: 13.7563, lng: 100.5018 },
  { id: 'ho-chi-minh', label: '胡志明市 Ho Chi Minh', country: '越南', timezone: 'Asia/Ho_Chi_Minh', lat: 10.8231, lng: 106.6297 },
  { id: 'manila', label: '馬尼拉 Manila', country: '菲律賓', timezone: 'Asia/Manila', lat: 14.5995, lng: 120.9842 },
  { id: 'jakarta', label: '雅加達 Jakarta', country: '印尼', timezone: 'Asia/Jakarta', lat: -6.2088, lng: 106.8456 },
  { id: 'mumbai', label: '孟買 Mumbai', country: '印度', timezone: 'Asia/Kolkata', lat: 19.076, lng: 72.8777 },
  { id: 'dubai', label: '杜拜 Dubai', country: '阿聯酋', timezone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708 },
  // 歐洲
  { id: 'london', label: '倫敦 London', country: '英國', timezone: 'Europe/London', lat: 51.5074, lng: -0.1278 },
  { id: 'paris', label: '巴黎 Paris', country: '法國', timezone: 'Europe/Paris', lat: 48.8566, lng: 2.3522 },
  { id: 'berlin', label: '柏林 Berlin', country: '德國', timezone: 'Europe/Berlin', lat: 52.52, lng: 13.405 },
  { id: 'zurich', label: '蘇黎世 Zurich', country: '瑞士', timezone: 'Europe/Zurich', lat: 47.3769, lng: 8.5417 },
  { id: 'amsterdam', label: '阿姆斯特丹 Amsterdam', country: '荷蘭', timezone: 'Europe/Amsterdam', lat: 52.3676, lng: 4.9041 },
  { id: 'madrid', label: '馬德里 Madrid', country: '西班牙', timezone: 'Europe/Madrid', lat: 40.4168, lng: -3.7038 },
  { id: 'ibiza', label: '伊比薩 Ibiza', country: '西班牙', timezone: 'Europe/Madrid', lat: 38.9067, lng: 1.4206 },
  { id: 'rome', label: '羅馬 Rome', country: '義大利', timezone: 'Europe/Rome', lat: 41.9028, lng: 12.4964 },
  // 美洲
  { id: 'new-york', label: '紐約 New York', country: '美國', timezone: 'America/New_York', lat: 40.7128, lng: -74.006 },
  { id: 'chicago', label: '芝加哥 Chicago', country: '美國', timezone: 'America/Chicago', lat: 41.8781, lng: -87.6298 },
  { id: 'denver', label: '丹佛 Denver', country: '美國', timezone: 'America/Denver', lat: 39.7392, lng: -104.9903 },
  { id: 'los-angeles', label: '洛杉磯 Los Angeles', country: '美國', timezone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437 },
  { id: 'san-francisco', label: '舊金山 San Francisco', country: '美國', timezone: 'America/Los_Angeles', lat: 37.7749, lng: -122.4194 },
  { id: 'seattle', label: '西雅圖 Seattle', country: '美國', timezone: 'America/Los_Angeles', lat: 47.6062, lng: -122.3321 },
  { id: 'honolulu', label: '檀香山 Honolulu', country: '美國', timezone: 'Pacific/Honolulu', lat: 21.3069, lng: -157.8583 },
  { id: 'vancouver', label: '溫哥華 Vancouver', country: '加拿大', timezone: 'America/Vancouver', lat: 49.2827, lng: -123.1207 },
  { id: 'toronto', label: '多倫多 Toronto', country: '加拿大', timezone: 'America/Toronto', lat: 43.6532, lng: -79.3832 },
  { id: 'montreal', label: '蒙特婁 Montreal', country: '加拿大', timezone: 'America/Toronto', lat: 45.5017, lng: -73.5673 },
  // 大洋洲
  { id: 'sydney', label: '雪梨 Sydney', country: '澳洲', timezone: 'Australia/Sydney', lat: -33.8688, lng: 151.2093 },
  { id: 'melbourne', label: '墨爾本 Melbourne', country: '澳洲', timezone: 'Australia/Melbourne', lat: -37.8136, lng: 144.9631 },
  { id: 'auckland', label: '奧克蘭 Auckland', country: '紐西蘭', timezone: 'Pacific/Auckland', lat: -36.8485, lng: 174.7633 },
  // UTC
  { id: 'utc', label: 'UTC 標準時間', country: 'UTC', timezone: 'UTC', lat: 0, lng: 0 },
];

export const DEFAULT_CITY = CITY_OPTIONS[0];

/**
 * 將「當地出生日期時間 + IANA 時區」精確轉換為 UTC Date（自動涵蓋該歷史日期的夏令時 DST）。
 * 回傳 { utcDate, offsetMinutes }，其中 offsetMinutes = (當地時間 - UTC)，例如台北為 +480。
 */
export function localDateTimeToUtc(
  birthDate: string,
  birthTime: string,
  ianaTimezone: string
): { utcDate: Date; offsetMinutes: number } {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  const y = year || 1993;
  const m = month || 9;
  const d = day || 6;
  const hh = Number.isFinite(hour) ? hour : 0;
  const mm = Number.isFinite(minute) ? minute : 0;

  // 先把當地牆鐘時間當成 UTC 時間點作為初始猜測
  const wallAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0);

  const getOffsetAt = (utcMs: number): number => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(new Date(utcMs));
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = Number(p.value);
      }
    }
    const zonedAsUtcMs = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      map.hour === 24 ? 0 : map.hour,
      map.minute,
      map.second
    );
    return Math.round((zonedAsUtcMs - utcMs) / 60000);
  };

  // 兩次收斂修正，確保跨越 DST 切換邊界時依然精確
  let offsetMinutes = getOffsetAt(wallAsUtcMs);
  let utcMs = wallAsUtcMs - offsetMinutes * 60000;
  const refinedOffset = getOffsetAt(utcMs);
  if (refinedOffset !== offsetMinutes) {
    offsetMinutes = refinedOffset;
    utcMs = wallAsUtcMs - offsetMinutes * 60000;
  }

  return {
    utcDate: new Date(utcMs),
    offsetMinutes,
  };
}
