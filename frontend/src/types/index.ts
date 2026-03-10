// ---- Prayer types ----
export interface DaySchedule {
  date: string;
  fajr: string;
  sunrise: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  isNormal: boolean;
}

export interface NextPrayerInfo {
  name: string;
  time: string;
}

// ---- Hijri ----
export interface HijriDate {
  day: number;
  month: number;
  year: number;
}

export interface HijriCalendarDay {
  date: string;
  hijri: HijriDate;
}

// ---- Location ----
export interface Location {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
}

export interface AppInfo {
  version: string;
  repositoryUrl: string;
  detectedOs: string;
  installMethod: string;
  configDirectory: string;
  configFile: string;
  executablePath: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  hasUpdate: boolean;
  installMethod: string;
  updateTitle: string;
  updateDetail: string;
  actionLabel: string;
  updateCommand: string;
}

// ---- Settings ----
export type NotificationStyle = 'native' | 'window';
export type AdhanSelection = 'normal' | 'fajr';

export interface PrayerNotificationSetting {
  enabled: boolean;
  beforeMinutes: number;
  afterMinutes: number;
}

export interface PerPrayerNotification {
  fajr: PrayerNotificationSetting;
  sunrise: PrayerNotificationSetting;
  zuhr: PrayerNotificationSetting;
  asr: PrayerNotificationSetting;
  maghrib: PrayerNotificationSetting;
  isha: PrayerNotificationSetting;
}

export interface NotificationSettings {
  style: NotificationStyle;
  playAdhan: boolean;
  adhanVolume: number;
  prayers: PerPrayerNotification;
}

export interface LocationSettings {
  autoDetect: boolean;
  inputMode: 'list' | 'custom';
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
}

export interface CitySearchResult {
  id: number;
  name: string;
  countryCode: string;
  admin1: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  label: string;
}

export type WorldPrayerCity = CitySearchResult;

export type WorldPrayerSort = 'manual' | 'name' | 'offset' | 'current-time' | 'next-prayer';

export interface WorldPrayerSettings {
  cities: WorldPrayerCity[];
  sortBy: WorldPrayerSort;
}

export interface WorldPrayerCitySummary {
  city: WorldPrayerCity;
  offsetSeconds: number;
  currentTime: string;
  nextPrayer: NextPrayerInfo;
  today: DaySchedule;
}

export interface GeonamesInfo {
  source: string;
  lastUpdated: string;
}

export interface PrayerOffsets {
  fajr: number;
  sunrise: number;
  zuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerSettings {
  method: string;
  asrMethod: string;
  offsets: PrayerOffsets;
  customFajrAngle: number;
  customIshaAngle: number;
  customMaghribDuration: number;
}

export type ClockType = 'digital' | 'analog';
export type DigitalClockFormatPreset =
  | '24h-seconds'
  | '24h-short'
  | '12h-seconds'
  | '12h-short'
  | 'weekday-date'
  | 'custom';
export type ThemePreset = 'indigo' | 'emerald' | 'sunset' | 'rose' | 'ocean';
export type PrayerTimesViewMode = 'table' | 'calendar';
export type PrayerCalendarSystem = 'gregorian' | 'hijri' | 'side-by-side';

export interface DashboardSettings {
  showClock: boolean;
  clockType: ClockType;
  digitalClockFormat: DigitalClockFormatPreset;
  digitalClockCustom: string;
  analogClockSize: number;
  showAllClockHours: boolean;
}

export interface PrayerTimesSettings {
  viewMode: PrayerTimesViewMode;
  calendarSystem: PrayerCalendarSystem;
  useArabicIndicDigits: boolean;
}

export interface Settings {
  location: LocationSettings;
  prayer: PrayerSettings;
  notification: NotificationSettings;
  dashboard: DashboardSettings;
  prayerTimes: PrayerTimesSettings;
  worldPrayer: WorldPrayerSettings;
  theme: string;
  themePreset: ThemePreset;
  language: string;
  autoStart: boolean;
  autoCheckUpdates: boolean;
  trayLeftClick: 'toggle-window' | 'open-menu' | 'none';
  hijriDateOffset: number;
  timeFormat: '12h' | '24h';
}

// ---- Reminder event ----
export type WindowState = 'before' | 'ontime' | 'after';

export interface ReminderInfo {
  prayerName: string;
  state: WindowState;
  minutesLeft: number;
}

// ---- Named prayer list ----
export const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Zuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];

export const CALCULATION_METHODS = [
  { value: 'AstronomicalTwilight', label: 'Astronomical Twilight (Fajr 18° / Isha 18°)' },
  { value: 'MWL', label: 'Muslim World League (Fajr 18° / Isha 17°)' },
  { value: 'ISNA', label: 'ISNA (North America) (Fajr 15° / Isha 15°)' },
  { value: 'Egypt', label: 'Egyptian General Authority (Fajr 19.5° / Isha 17.5°)' },
  { value: 'EgyptBis', label: 'Egyptian General Authority Bis (Fajr 20° / Isha 18°)' },
  { value: 'UmmAlQura', label: 'Umm al-Qura (Fajr 18.5° / Isha +90 min)' },
  { value: 'Gulf', label: 'Gulf Region (Fajr 19.5° / Isha +90 min)' },
  { value: 'Algerian', label: 'Algerian Ministry (Fajr 18° / Isha 17°)' },
  { value: 'Karachi', label: 'University of Karachi (Fajr 18° / Isha 18°)' },
  { value: 'Kemenag', label: 'Kemenag (Fajr 20° / Isha 18°)' },
  { value: 'JAKIM', label: 'JAKIM (Fajr 20° / Isha 18°)' },
  { value: 'MUIS', label: 'MUIS (Fajr 20° / Isha 18°)' },
  { value: 'Diyanet', label: 'Diyanet (Fajr 18° / Isha 17°)' },
  { value: 'UOIF', label: 'UOIF (France) (Fajr 12° / Isha 12°)' },
  { value: 'France15', label: 'France (Fajr 15° / Isha 15°)' },
  { value: 'France18', label: 'France (Fajr 18° / Isha 18°)' },
  { value: 'Tunisia', label: 'Tunisia (Fajr 18° / Isha 18°)' },
  { value: 'Tehran', label: 'Tehran (Fajr 17.7° / Isha 14°)' },
  { value: 'Jafari', label: 'Jafari (Fajr 16° / Isha 14°)' },
  { value: 'Custom', label: 'Custom (angles + optional Maghrib duration)' },
] as const;

export const THEME_PRESETS = [
  { value: 'indigo', label: 'Indigo Dawn' },
  { value: 'emerald', label: 'Emerald Grove' },
  { value: 'sunset', label: 'Sunset Ember' },
  { value: 'rose', label: 'Rose Quartz' },
  { value: 'ocean', label: 'Ocean Tide' },
] as const;

export const DIGITAL_CLOCK_FORMAT_PRESETS = [
  {
    value: '24h-seconds',
    label: '24-hour with seconds',
    format: 'HH:mm:ss',
  },
  {
    value: '24h-short',
    label: '24-hour compact',
    format: 'HH:mm',
  },
  {
    value: '12h-seconds',
    label: '12-hour with seconds',
    format: 'hh:mm:ss A',
  },
  {
    value: '12h-short',
    label: '12-hour compact',
    format: 'hh:mm A',
  },
  {
    value: 'weekday-date',
    label: 'Weekday and date',
    format: 'dddd, D MMM • HH:mm',
  },
  {
    value: 'custom',
    label: 'Custom',
    format: '',
  },
] as const;
