/**
 * 解析排定時程字串為毫秒時間戳，以利按「由近到遠」排序與背景定時派發
 */
export function parseScheduleTimestamp(timeStr?: string, fallbackTimestamp?: number): number {
  if (fallbackTimestamp && fallbackTimestamp > 0) {
    return fallbackTimestamp;
  }
  if (!timeStr) return Date.now() + 1000 * 60 * 60 * 24;
  const now = Date.now();

  const secMatch = timeStr.match(/(\d+)\s*秒後/);
  if (secMatch) {
    return now + parseInt(secMatch[1], 10) * 1000;
  }

  const minMatch = timeStr.match(/(\d+)\s*分鐘後/);
  if (minMatch) {
    return now + parseInt(minMatch[1], 10) * 60 * 1000;
  }

  const hourMatch = timeStr.match(/(\d+)\s*小時後/);
  if (hourMatch) {
    return now + parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }

  let dayOffset = 0;
  if (timeStr.includes('今天') || timeStr.includes('今日')) {
    dayOffset = 0;
  } else if (timeStr.includes('明天') || timeStr.includes('明日')) {
    dayOffset = 1;
  } else if (timeStr.includes('後天')) {
    dayOffset = 2;
  } else if (timeStr.includes('3 天後') || timeStr.includes('3天後')) {
    dayOffset = 3;
  } else if (timeStr.includes('本週末')) {
    dayOffset = 4;
  } else if (timeStr.includes('下週一')) {
    dayOffset = 5;
  } else if (timeStr.includes('平日')) {
    dayOffset = 1;
  }

  const timePartMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timePartMatch) {
    const hours = parseInt(timePartMatch[1], 10);
    const minutes = parseInt(timePartMatch[2], 10);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setHours(hours, minutes, 0, 0);
    if (dayOffset === 0 && targetDate.getTime() < now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate.getTime();
  }

  return now + (dayOffset + 1) * 24 * 60 * 60 * 1000;
}
