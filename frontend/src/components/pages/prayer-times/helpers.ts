import dayjs, { type Dayjs } from 'dayjs';
import type { DaySchedule, HijriCalendarDay, HijriDate } from '../../../types';
import i18n from '../../../i18n';

export type CalendarMode = 'gregorian' | 'hijri';

export function buildScheduleMap(schedules: DaySchedule[]): Record<string, DaySchedule> {
  return Object.fromEntries(schedules.map((schedule) => [schedule.date.slice(0, 10), schedule]));
}

export function buildHijriMap(days: HijriCalendarDay[]): Record<string, HijriDate> {
  return Object.fromEntries(days.map((day) => [day.date, day.hijri]));
}

export function getHijriMonthName(month: number): string {
  return i18n.t(`hijri.months.${month}`, { defaultValue: i18n.t('calendar.monthFallback', { month }) });
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

export function formatExportRangeLabel(startDate: Dayjs, endDate: Dayjs): string {
  if (startDate.isSame(endDate, 'day')) {
    return startDate.format('D MMM YYYY');
  }

  if (startDate.isSame(endDate, 'month')) {
    return `${startDate.format('D')} - ${endDate.format('D MMM YYYY')}`;
  }

  if (startDate.isSame(endDate, 'year')) {
    return `${startDate.format('D MMM')} - ${endDate.format('D MMM YYYY')}`;
  }

  return `${startDate.format('D MMM YYYY')} - ${endDate.format('D MMM YYYY')}`;
}

export function getWeekdayHeaders(): string[] {
  return [
    i18n.t('calendar.weekdays.short.sunday'),
    i18n.t('calendar.weekdays.short.monday'),
    i18n.t('calendar.weekdays.short.tuesday'),
    i18n.t('calendar.weekdays.short.wednesday'),
    i18n.t('calendar.weekdays.short.thursday'),
    i18n.t('calendar.weekdays.short.friday'),
    i18n.t('calendar.weekdays.short.saturday'),
  ];
}

export function getMonthCalendarDays(month: Dayjs): Dayjs[] {
  const start = month.startOf('month').startOf('week');

  return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
}

export function formatLongGregorianDate(date: Dayjs): string {
  return date.format('dddd, D MMMM YYYY');
}

export function toIsoDate(date: Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export interface CalendarDayPresentation {
  primaryLabel: string;
  primaryContext: string;
  secondaryLabel: string;
  secondaryContext: string;
}

export function getCalendarDayPresentation(
  mode: CalendarMode,
  date: Dayjs,
  hijriDate: HijriDate | undefined,
  useArabicIndicDigits: boolean,
): CalendarDayPresentation {
  const gregorianDay = String(date.date());
  const gregorianMonth = date.format('MMM');
  const hijriDay = hijriDate
    ? formatHijriDayNumber(hijriDate.day, useArabicIndicDigits)
    : '';

  if (mode === 'hijri') {
    return {
      primaryLabel: hijriDay,
      primaryContext: hijriDate ? getHijriMonthName(hijriDate.month) : '',
      secondaryLabel: gregorianDay,
      secondaryContext: gregorianMonth,
    };
  }

  return {
    primaryLabel: gregorianDay,
    primaryContext: '',
    secondaryLabel: hijriDay,
    secondaryContext: hijriDate
      ? getHijriMonthName(hijriDate.month).replace('al-', '')
      : '',
  };
}
