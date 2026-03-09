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
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
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
  theme: string;
  themePreset: ThemePreset;
  language: string;
  autoStart: boolean;
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
  { value: 'MWL', label: 'Muslim World League' },
  { value: 'ISNA', label: 'ISNA (North America)' },
  { value: 'Egypt', label: 'Egyptian General Authority' },
  { value: 'UmmAlQura', label: 'Umm al-Qura (Makkah)' },
  { value: 'Karachi', label: 'University of Karachi' },
  { value: 'Kemenag', label: 'Kemenag (Indonesia)' },
  { value: 'JAKIM', label: 'JAKIM (Malaysia)' },
  { value: 'MUIS', label: 'MUIS (Singapore)' },
  { value: 'Diyanet', label: 'Diyanet (Turkey)' },
  { value: 'Tehran', label: 'Tehran University' },
  { value: 'Jafari', label: 'Jafari (Shia)' },
  { value: 'Custom', label: 'Custom' },
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
