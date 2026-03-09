import dayjs, { type Dayjs } from 'dayjs';
import type { DaySchedule, HijriCalendarDay, HijriDate } from '../../../types';

const HIJRI_MONTHS = [
  '',
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

export function buildScheduleMap(schedules: DaySchedule[]): Record<string, DaySchedule> {
  return Object.fromEntries(schedules.map((schedule) => [schedule.date.slice(0, 10), schedule]));
}

export function buildHijriMap(days: HijriCalendarDay[]): Record<string, HijriDate> {
  return Object.fromEntries(days.map((day) => [day.date, day.hijri]));
}

export function getHijriMonthName(month: number): string {
  return HIJRI_MONTHS[month] ?? `Month ${month}`;
}

export function toArabicIndicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
}

export function formatHijriDayNumber(
  value: number,
  useArabicIndicDigits: boolean,
): string {
  return useArabicIndicDigits ? toArabicIndicDigits(value) : String(value);
}

export function formatHijriDateLabel(hijri?: HijriDate | null): string {
  if (!hijri) {
    return 'Hijri date unavailable';
  }

  return `${hijri.day} ${getHijriMonthName(hijri.month)} ${hijri.year} AH`;
}

export function formatHijriDateShort(hijri?: HijriDate | null): string {
  if (!hijri) {
    return '';
  }

  return `${hijri.day} ${getHijriMonthName(hijri.month)} ${hijri.year} AH`;
}

export function formatCalendarTimeCompact(
  isoOrTimeStr: string,
  format: '12h' | '24h' = '24h',
): string {
  if (!isoOrTimeStr) return '--:--';

  const date = new Date(isoOrTimeStr);
  if (Number.isNaN(date.getTime())) return '--:--';

  if (format === '24h') {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  const formatted = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return formatted.replace(' AM', 'a').replace(' PM', 'p');
}

export function getHijriMonthRangeLabel(days: HijriCalendarDay[]): string {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const day of days) {
    const key = `${day.hijri.year}-${day.hijri.month}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(`${getHijriMonthName(day.hijri.month)} ${day.hijri.year} AH`);
  }

  return labels.join(' / ');
}

export function formatMonthHeading(date: Dayjs): string {
  return date.format('MMMM YYYY');
}

export function formatLongGregorianDate(date: Dayjs): string {
  return date.format('dddd, D MMMM YYYY');
}

export function toIsoDate(date: Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD');
}
