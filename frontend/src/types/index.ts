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

export interface ReminderDebugEntry {
  prayerName: string;
  state: string;
  scheduledTime: string;
  offsetMinutes: number;
  enabled: boolean;
  deltaSeconds: number;
  isFuture: boolean;
}

export interface DebugTimeInfo {
  nowRFC3339: string;
  clock: string;
  timezone: string;
  offset: string;
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

// ---- Quran ----
export interface QuranBookmark {
  id: string;
  url: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuranNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuranData {
  bookmarks: QuranBookmark[];
  notes: QuranNote[];
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
  persistentReminder: boolean;
  autoDismissSeconds: number;
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
  enableTestTools: boolean;
}

// ---- Reminder event ----
export type WindowState = 'before' | 'ontime' | 'after';

export interface ReminderInfo {
  prayerName: string;
  state: WindowState;
  minutesLeft: number;
  offsetMinutes?: number;
  triggerId?: number;
  live?: boolean;
}

export interface ReminderTestSnapshot {
  timezone: string;
  currentTime: string;
  simulatedTime: string;
  prayerName: string;
  prayerTime: string;
  offsetSeconds: number;
  state: WindowState;
  minutesLeft: number;
  nextPrayerName: string;
  nextPrayerTime: string;
  schedule: Record<string, string>;
}

// ---- Named prayer list ----
export const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Zuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];
export const PRAYER_NAME_FAJR: PrayerName = 'Fajr';
export const PRAYER_NAME_SUNRISE: PrayerName = 'Sunrise';
export const PRAYER_NAME_ZUHR: PrayerName = 'Zuhr';
export const PRAYER_NAME_ASR: PrayerName = 'Asr';
export const PRAYER_NAME_MAGHRIB: PrayerName = 'Maghrib';
export const PRAYER_NAME_ISHA: PrayerName = 'Isha';

export const CALCULATION_METHODS = [
  { value: 'AstronomicalTwilight', labelKey: 'prayer.methods.astronomical' },
  { value: 'MWL', labelKey: 'prayer.methods.mwl' },
  { value: 'ISNA', labelKey: 'prayer.methods.isna' },
  { value: 'Egypt', labelKey: 'prayer.methods.egypt' },
  { value: 'EgyptBis', labelKey: 'prayer.methods.egyptBis' },
  { value: 'UmmAlQura', labelKey: 'prayer.methods.ummAlQura' },
  { value: 'Gulf', labelKey: 'prayer.methods.gulf' },
  { value: 'Algerian', labelKey: 'prayer.methods.algerian' },
  { value: 'Karachi', labelKey: 'prayer.methods.karachi' },
  { value: 'Kemenag', labelKey: 'prayer.methods.kemenag' },
  { value: 'JAKIM', labelKey: 'prayer.methods.jakim' },
  { value: 'MUIS', labelKey: 'prayer.methods.muis' },
  { value: 'Diyanet', labelKey: 'prayer.methods.diyanet' },
  { value: 'UOIF', labelKey: 'prayer.methods.uoif' },
  { value: 'France15', labelKey: 'prayer.methods.france15' },
  { value: 'France18', labelKey: 'prayer.methods.france18' },
  { value: 'Tunisia', labelKey: 'prayer.methods.tunisia' },
  { value: 'Tehran', labelKey: 'prayer.methods.tehran' },
  { value: 'Jafari', labelKey: 'prayer.methods.jafari' },
  { value: 'Custom', labelKey: 'prayer.methods.custom' },
] as const;

export const THEME_PRESETS = [
  { value: 'indigo', labelKey: 'settings.general.themePresets.indigo' },
  { value: 'emerald', labelKey: 'settings.general.themePresets.emerald' },
  { value: 'sunset', labelKey: 'settings.general.themePresets.sunset' },
  { value: 'rose', labelKey: 'settings.general.themePresets.rose' },
  { value: 'ocean', labelKey: 'settings.general.themePresets.ocean' },
] as const;

export const DIGITAL_CLOCK_FORMAT_PRESETS = [
  {
    value: '24h-seconds',
    labelKey: 'settings.general.clock.format24Seconds',
    format: 'HH:mm:ss',
  },
  {
    value: '24h-short',
    labelKey: 'settings.general.clock.format24Compact',
    format: 'HH:mm',
  },
  {
    value: '12h-seconds',
    labelKey: 'settings.general.clock.format12Seconds',
    format: 'hh:mm:ss A',
  },
  {
    value: '12h-short',
    labelKey: 'settings.general.clock.format12Compact',
    format: 'hh:mm A',
  },
  {
    value: 'weekday-date',
    labelKey: 'settings.general.clock.formatWeekdayDate',
    format: 'dddd, D MMM • HH:mm',
  },
  {
    value: 'custom',
    labelKey: 'settings.general.clock.formatCustom',
    format: '',
  },
] as const;
