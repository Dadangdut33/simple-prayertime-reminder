import type { DigitalClockFormatPreset, HijriDate } from '../types';
import { DIGITAL_CLOCK_FORMAT_PRESETS } from '../types';

/** Format a date string from the backend (RFC3339) as a local time string */
export function formatTime(isoOrTimeStr: string, format: '12h' | '24h' = '24h'): string {
  if (!isoOrTimeStr) return '--:--';
  const date = new Date(isoOrTimeStr);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
  });
}

export function formatTimeInZone(
  isoOrTimeStr: string,
  timeZone: string,
  format: '12h' | '24h' = '24h',
  includeSeconds = false,
): string {
  if (!isoOrTimeStr) return '--:--';
  const date = new Date(isoOrTimeStr);
  if (isNaN(date.getTime())) return '--:--';
  try {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: format === '12h',
      timeZone,
    });
  } catch {
    return formatTime(isoOrTimeStr, format);
  }
}

export function formatOffsetSeconds(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

let regionDisplayNames: Intl.DisplayNames | null = null;

// From the river to the sea, palestine will be free!
export function getCountryName(countryCode: string): string {
  const trimmed = countryCode.trim();
  if (!trimmed) return '';
  const normalized = trimmed.toUpperCase();
  if (normalized === 'IL') {
    return 'Palestine';
  }

  try {
    if (!regionDisplayNames) {
      const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
      regionDisplayNames = new Intl.DisplayNames([locale], { type: 'region' });
    }
    const name = regionDisplayNames.of(normalized);
    if (name) {
      return name.replace(/Israel/gi, 'Palestine');
    }
  } catch {
    // Fall back to code if Intl.DisplayNames is unavailable.
  }

  return normalized.replace(/Israel/gi, 'Palestine');
}

export function formatCityLabel(city: {
  name: string;
  admin1?: string;
  countryCode?: string;
  country?: string;
}): string {
  const name = city.name?.trim() ?? '';
  const admin1 = city.admin1?.trim() ?? '';
  const countryRaw = (city.countryCode || city.country || '').trim();
  const countryCode = countryRaw.toUpperCase();

  const isJerusalem = name.localeCompare('jerusalem', undefined, { sensitivity: 'accent' }) === 0;
  const isJerusalemRegion = countryCode === 'IL' || countryCode === 'PS';
  const displayName = isJerusalem && isJerusalemRegion ? 'Al-Quds (Jerusalem)' : name;

  const showAdmin1 = admin1.length > 2 && /[A-Za-z]/.test(admin1);
  const countryName =
    countryRaw.length === 2 ? getCountryName(countryRaw) : countryRaw.replace(/Israel/gi, 'Palestine');

  return [displayName, showAdmin1 ? admin1 : '', countryName].filter(Boolean).join(', ');
}

/** Return a "HH:mm:ss" countdown string from now until a future time */
export function getCountdown(toIso: string): string {
  const to = new Date(toIso);
  const diff = to.getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Convert total seconds to H h M m display string */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Normalize a bearing into the 0-360 range */
export function normalizeBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/** Convert a bearing to a detailed 32-point compass abbreviation */
export function bearingToCardinal(bearing: number): string {
  const directions = [
    'N',
    'NbE',
    'NNE',
    'NEbN',
    'NE',
    'NEbE',
    'ENE',
    'EbN',
    'E',
    'EbS',
    'ESE',
    'SEbE',
    'SE',
    'SEbS',
    'SSE',
    'SbE',
    'S',
    'SbW',
    'SSW',
    'SWbS',
    'SW',
    'SWbW',
    'WSW',
    'WbS',
    'W',
    'WbN',
    'WNW',
    'NWbW',
    'NW',
    'NWbN',
    'NNW',
    'NbW',
  ];
  const normalized = normalizeBearing(bearing);
  return directions[Math.round(normalized / 11.25) % 32];
}

/** Convert a bearing to a detailed human-readable compass label */
export function bearingToCompassLabel(bearing: number): string {
  const labels: Record<string, string> = {
    N: 'North',
    NbE: 'North by East',
    NNE: 'North-Northeast',
    NEbN: 'Northeast by North',
    NE: 'Northeast',
    NEbE: 'Northeast by East',
    ENE: 'East-Northeast',
    EbN: 'East by North',
    E: 'East',
    EbS: 'East by South',
    ESE: 'East-Southeast',
    SEbE: 'Southeast by East',
    SE: 'Southeast',
    SEbS: 'Southeast by South',
    SSE: 'South-Southeast',
    SbE: 'South by East',
    S: 'South',
    SbW: 'South by West',
    SSW: 'South-Southwest',
    SWbS: 'Southwest by South',
    SW: 'Southwest',
    SWbW: 'Southwest by West',
    WSW: 'West-Southwest',
    WbS: 'West by South',
    W: 'West',
    WbN: 'West by North',
    WNW: 'West-Northwest',
    NWbW: 'Northwest by West',
    NW: 'Northwest',
    NWbN: 'Northwest by North',
    NNW: 'North-Northwest',
    NbW: 'North by West',
  };
  const abbreviation = bearingToCardinal(bearing);
  return `${labels[abbreviation]} (${abbreviation})`;
}

/** Format today's date as 'Monday, 5 March 2026' */
export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format date to ISO yyyy-MM-dd */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get number of days in a month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Format hijri date from HijriDate object */
export function formatHijri(h: HijriDate | null): string {
  if (!h) return '';
  const months = [
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
  const monthName = months[h.month] ?? h.month;
  return `${h.day} ${monthName} ${h.year} H`;
}

/** Get prayer times for a DaySchedule as a named list */
function parseLocalDateValue(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map((value) => Number(value));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isFriday(dateStr?: string): boolean {
  const date = parseLocalDateValue(dateStr);
  if (!date) return false;
  return date.getDay() === 5;
}

export function getPrayerDisplayName(name: string, dateStr?: string): string {
  if (name !== 'Zuhr') return name;
  return isFriday(dateStr) ? "Jumu'ah" : name;
}

export function getPrayerList(schedule: {
  date?: string;
  fajr: string;
  sunrise: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}) {
  const zuhrLabel = getPrayerDisplayName('Zuhr', schedule.date);
  return [
    { name: 'Fajr', time: schedule.fajr },
    { name: 'Sunrise', time: schedule.sunrise },
    { name: zuhrLabel, time: schedule.zuhr },
    { name: 'Asr', time: schedule.asr },
    { name: 'Maghrib', time: schedule.maghrib },
    { name: 'Isha', time: schedule.isha },
  ] as const;
}

/** Clamp a number between min and max */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function resolveDigitalClockFormat(preset: DigitalClockFormatPreset, customFormat?: string): string {
  if (preset === 'custom') {
    const trimmed = customFormat?.trim();
    return trimmed || 'HH:mm:ss';
  }

  return DIGITAL_CLOCK_FORMAT_PRESETS.find((option) => option.value === preset)?.format || 'HH:mm:ss';
}

export function formatDigitalClock(date: Date, preset: DigitalClockFormatPreset, customFormat?: string): string {
  const format = resolveDigitalClockFormat(preset, customFormat);
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const weekdayShort = date.toLocaleDateString(undefined, {
    weekday: 'short',
  });
  const weekdayLong = date.toLocaleDateString(undefined, {
    weekday: 'long',
  });
  const monthShort = date.toLocaleDateString(undefined, {
    month: 'short',
  });
  const monthLong = date.toLocaleDateString(undefined, {
    month: 'long',
  });

  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: pad(date.getFullYear() % 100),
    MMMM: monthLong,
    MMM: monthShort,
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    dddd: weekdayLong,
    ddd: weekdayShort,
    DD: pad(date.getDate()),
    D: String(date.getDate()),
    HH: pad(hours24),
    H: String(hours24),
    hh: pad(hours12),
    h: String(hours12),
    mm: pad(minutes),
    m: String(minutes),
    ss: pad(seconds),
    s: String(seconds),
    A: hours24 >= 12 ? 'PM' : 'AM',
    a: hours24 >= 12 ? 'pm' : 'am',
  };

  const tokenPattern = /YYYY|MMMM|dddd|MMM|ddd|YY|MM|DD|HH|hh|mm|ss|M|D|H|h|m|s|A|a/g;

  return format.replace(tokenPattern, (token) => tokens[token] ?? token);
}
