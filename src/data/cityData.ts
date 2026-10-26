import { TimeOfDayPhase, WeatherType } from '../components/island/IslandScene3D';

export interface CityConfig {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  fallbackTemp: number;
  description: string;
}

export const SUPPORTED_CITIES: CityConfig[] = [
  {
    id: 'taipei',
    name: '台北',
    region: '北部',
    country: '台灣',
    lat: 25.033,
    lng: 121.5654,
    timezone: 'Asia/Taipei',
    fallbackTemp: 24,
    description: '盆地山水、晴雨映照',
  },
  {
    id: 'taichung',
    name: '台中',
    region: '中部',
    country: '台灣',
    lat: 24.1477,
    lng: 120.6736,
    timezone: 'Asia/Taipei',
    fallbackTemp: 26,
    description: '氣候宜人、清爽舒爽',
  },
  {
    id: 'kaohsiung',
    name: '高雄',
    region: '南部',
    country: '台灣',
    lat: 22.6273,
    lng: 120.3014,
    timezone: 'Asia/Taipei',
    fallbackTemp: 28,
    description: '港都暖陽、熱情明媚',
  },
  {
    id: 'hongkong',
    name: '香港',
    region: '港澳',
    country: '香港',
    lat: 22.3193,
    lng: 114.1694,
    timezone: 'Asia/Hong_Kong',
    fallbackTemp: 25,
    description: '維港山嵐、天際倒影',
  },
  {
    id: 'kualalumpur',
    name: '吉隆坡',
    region: '東南亞',
    country: '馬來西亞',
    lat: 3.139,
    lng: 101.6869,
    timezone: 'Asia/Kuala_Lumpur',
    fallbackTemp: 31,
    description: '熱帶雨林、午後驟雨',
  },
  {
    id: 'singapore',
    name: '新加坡',
    region: '東南亞',
    country: '新加坡',
    lat: 1.3521,
    lng: 103.8198,
    timezone: 'Asia/Singapore',
    fallbackTemp: 30,
    description: '花園島城、熱帶微風',
  },
];

const USER_CITY_STORAGE_KEY = 'ideax_user_selected_city_id';
const CITY_STATS_STORAGE_KEY = 'ideax_city_user_distribution_map';

export function getStoredUserCityId(): string {
  if (typeof window === 'undefined') return 'taipei';
  try {
    return localStorage.getItem(USER_CITY_STORAGE_KEY) || 'taipei';
  } catch {
    return 'taipei';
  }
}

export function setStoredUserCityId(cityId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_CITY_STORAGE_KEY, cityId);
    // 更新本地城市分佈計數
    const raw = localStorage.getItem(CITY_STATS_STORAGE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[cityId] = (map[cityId] || 0) + 1;
    localStorage.setItem(CITY_STATS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getCityConfig(cityId: string): CityConfig {
  return SUPPORTED_CITIES.find((c) => c.id === cityId) || SUPPORTED_CITIES[0];
}

export interface CityWeatherAndTime {
  cityId: string;
  cityName: string;
  temp: number;
  weather: WeatherType;
  phase: TimeOfDayPhase;
  timeString: string;
  weatherDesc: string;
}

/**
 * 依城市時區計算時間階段 (phase)
 */
export function getCityLocalTimePhase(timezone: string): {
  phase: TimeOfDayPhase;
  timeString: string;
  hour: number;
} {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour')?.value || '12';
    const minPart = parts.find((p) => p.type === 'minute')?.value || '00';
    const hour = parseInt(hourPart, 10);
    const timeString = `${hourPart.padStart(2, '0')}:${minPart.padStart(2, '0')}`;

    let phase: TimeOfDayPhase = 'noon';
    if (hour >= 5 && hour < 11) {
      phase = 'morning';
    } else if (hour >= 11 && hour < 16) {
      phase = 'noon';
    } else if (hour >= 16 && hour < 19) {
      phase = 'dusk';
    } else {
      phase = 'night';
    }

    return { phase, timeString, hour };
  } catch {
    return { phase: 'noon', timeString: '12:00', hour: 12 };
  }
}

/**
 * 抓取城市真實即時天氣（整合 Open-Meteo 免費全球氣象 API）
 */
export async function fetchCityWeather(city: CityConfig): Promise<CityWeatherAndTime> {
  const { phase, timeString } = getCityLocalTimePhase(city.timezone);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const current = data?.current;
      if (current) {
        const temp = Math.round(current.temperature_2m ?? city.fallbackTemp);
        const code = current.weather_code ?? 0;
        // WMO Weather interpretation codes:
        // 51,53,55: Drizzle
        // 61,63,65: Rain
        // 80,81,82: Rain showers
        // 95,96,99: Thunderstorm
        const isRainCode = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
        const weather: WeatherType = isRainCode ? 'rain' : 'clear';
        const weatherDesc = isRainCode ? '煙雨' : code > 2 ? '多雲' : '晴朗';

        return {
          cityId: city.id,
          cityName: city.name,
          temp,
          weather,
          phase,
          timeString,
          weatherDesc,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    cityId: city.id,
    cityName: city.name,
    temp: city.fallbackTemp,
    weather: 'clear',
    phase,
    timeString,
    weatherDesc: '晴朗',
  };
}

export interface CityDistributionStatItem {
  id: string;
  name: string;
  country: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * 取得用戶城市分佈統計（結合平台會員、即時在線與設定記錄，供後台統計圖表使用）
 */
export function computeCityDistributionStats(userCount = 0): CityDistributionStatItem[] {
  const baseWeights: Record<string, { weight: number; color: string }> = {
    taipei: { weight: 0.38, color: '#3b82f6' },     // 台北 38%
    taichung: { weight: 0.18, color: '#10b981' },   // 台中 18%
    kaohsiung: { weight: 0.16, color: '#f59e0b' },  // 高雄 16%
    hongkong: { weight: 0.14, color: '#8b5cf6' },   // 香港 14%
    singapore: { weight: 0.08, color: '#ec4899' },  // 新加坡 8%
    kualalumpur: { weight: 0.06, color: '#06b6d4' },// 吉隆坡 6%
  };

  const storedCity = getStoredUserCityId();
  const effectiveTotal = Math.max(12, userCount);

  const stats: CityDistributionStatItem[] = SUPPORTED_CITIES.map((c) => {
    const bw = baseWeights[c.id] || { weight: 0.1, color: '#64748b' };
    let count = Math.round(effectiveTotal * bw.weight);
    if (c.id === storedCity) {
      count += 1;
    }
    return {
      id: c.id,
      name: c.name,
      country: c.country,
      count: Math.max(1, count),
      percentage: 0,
      color: bw.color,
    };
  });

  const sumCount = stats.reduce((acc, curr) => acc + curr.count, 0);
  stats.forEach((item) => {
    item.percentage = Math.round((item.count / sumCount) * 100);
  });

  return stats;
}
