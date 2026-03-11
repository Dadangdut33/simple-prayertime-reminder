import { Service as AppService } from '../../bindings/github.com/dadangdut33/simple-prayertime-reminder/internal/appservice/index.ts';
import type {
  AppInfo,
  CitySearchResult,
  DaySchedule,
  GeonamesInfo,
  HijriCalendarDay,
  HijriDate,
  Location,
  NextPrayerInfo,
  ReminderInfo,
  ReminderTestSnapshot,
  Settings,
  QuranData,
  WorldPrayerCitySummary,
  UpdateInfo,
} from '../types';

// ---- Settings ----
export const getSettings = (): Promise<Settings> =>
  AppService.GetSettings() as any;
export const saveSettings = (s: Settings): Promise<void> =>
  AppService.SaveSettings(s as any) as any;
export const resetSettings = (): Promise<Settings> =>
  AppService.ResetSettings() as any;

// ---- Location ----
export const getLocation = (): Promise<Location> =>
  AppService.GetLocation() as any;
export const searchCities = (
  query: string,
  limit: number,
): Promise<CitySearchResult[]> => AppService.SearchCities(query, limit) as any;
export const getTimezones = (): Promise<string[]> =>
  AppService.GetTimezones() as any;
export const searchTimezones = (
  query: string,
  limit: number,
): Promise<string[]> => AppService.SearchTimezones(query, limit) as any;
export const getGeonamesInfo = (): Promise<GeonamesInfo> =>
  AppService.GetGeonamesInfo() as any;
export const updateGeonamesData = (): Promise<GeonamesInfo> =>
  AppService.UpdateGeonamesData() as any;
export const detectLocation = (): Promise<Location> =>
  AppService.DetectLocation() as any;
export const setManualLocation = (loc: Location): Promise<void> =>
  AppService.SetManualLocation(loc as any) as any;

// ---- Prayer ----
export const getTodaySchedule = (): Promise<DaySchedule> =>
  AppService.GetTodaySchedule() as any;
export const getScheduleForDate = (dateStr: string): Promise<DaySchedule> =>
  AppService.GetScheduleForDate(dateStr) as any;
export const getMonthSchedule = (
  year: number,
  month: number,
): Promise<DaySchedule[]> => AppService.GetMonthSchedule(year, month) as any;
export const getScheduleRange = (
  startDate: string,
  endDate: string,
): Promise<DaySchedule[]> => AppService.GetScheduleRange(startDate, endDate) as any;
export const getMonthHijriDates = (
  year: number,
  month: number,
): Promise<HijriCalendarDay[]> =>
  AppService.GetMonthHijriDates(year, month) as any;
export const getHijriDateRange = (
  startDate: string,
  endDate: string,
): Promise<HijriCalendarDay[]> =>
  AppService.GetHijriDateRange(startDate, endDate) as any;
export const getNextPrayer = (): Promise<NextPrayerInfo> =>
  AppService.GetNextPrayer() as any;
export const getWorldPrayerTimes = (
  cities: Settings['worldPrayer']['cities'],
): Promise<WorldPrayerCitySummary[]> => AppService.GetWorldPrayerTimes(cities as any) as any;

// ---- Hijri ----
export const getTodayHijri = (): Promise<HijriDate> =>
  AppService.GetTodayHijri() as any;
export const getHijriForDate = (dateStr: string): Promise<HijriDate> =>
  AppService.GetHijriForDate(dateStr) as any;

// ---- Qibla ----
export const getQiblaDirection = (): Promise<number> =>
  AppService.GetQiblaDirection() as any;
export const getQiblaDirectionFor = (
  lat: number,
  lon: number,
): Promise<number> => AppService.GetQiblaDirectionFor(lat, lon) as any;
export const getCardinalDirection = (bearing: number): Promise<string> =>
  AppService.GetCardinalDirection(bearing) as any;

// ---- Export ----
export const exportToCSV = (
  year: number,
  month: number,
  startDate: string,
  endDate: string,
  path: string,
): Promise<void> =>
  AppService.ExportToCSV(year, month, startDate, endDate, path) as any;
export const exportRangeToCSV = (
  startDate: string,
  endDate: string,
  path: string,
): Promise<void> => AppService.ExportRangeToCSV(startDate, endDate, path) as any;
export const exportToExcel = (
  year: number,
  month: number,
  startDate: string,
  endDate: string,
  path: string,
): Promise<void> =>
  AppService.ExportToExcel(year, month, startDate, endDate, path) as any;
export const exportRangeToExcel = (
  startDate: string,
  endDate: string,
  path: string,
): Promise<void> => AppService.ExportRangeToExcel(startDate, endDate, path) as any;
export const saveBase64File = (
  path: string,
  base64Data: string,
): Promise<void> => AppService.SaveBase64File(path, base64Data) as any;

// ---- Notification ----
export const dismissReminder = (): Promise<void> =>
  AppService.DismissReminder() as any;
export const dismissTestReminder = (): Promise<void> =>
  AppService.DismissTestReminder() as any;
export const emitReminderInfo = (): Promise<void> =>
  AppService.EmitReminderInfo() as any;
export const emitTestReminderInfo = (): Promise<void> =>
  AppService.EmitTestReminderInfo() as any;
export const getReminderInfo = (): Promise<ReminderInfo | null> =>
  AppService.GetReminderInfo() as any;
export const getReminderState = (): Promise<ReminderInfo | null> =>
  AppService.GetReminderState() as any;
export const getTestReminderState = (): Promise<ReminderInfo | null> =>
  AppService.GetTestReminderState() as any;
export const playAdhan = (isFajr: boolean): Promise<void> =>
  AppService.PlayAdhan(isFajr) as any;
export const stopAdhan = (): Promise<void> => AppService.StopAdhan() as any;

// ---- Time ----
export const getCurrentTime = (): Promise<string> =>
  AppService.GetCurrentTime() as any;

// ---- App Info ----
export const getAppInfo = (): Promise<AppInfo> =>
  AppService.GetAppInfo() as any;
export const checkForUpdates = (): Promise<UpdateInfo> =>
  AppService.CheckForUpdates() as any;
export const openConfigLocation = (): Promise<void> =>
  AppService.OpenConfigLocation() as any;
export const openURL = (url: string): Promise<void> =>
  AppService.OpenURL(url) as any;
export const getQuranData = (): Promise<QuranData> =>
  AppService.GetQuranData() as any;
export const saveQuranData = (data: QuranData): Promise<void> =>
  AppService.SaveQuranData(data as any) as any;
export const readTextFile = (path: string): Promise<string> =>
  AppService.ReadTextFile(path) as any;
export const getReminderTestSnapshot = (
  prayerName: string,
  offsetSeconds: number,
  timezone: string,
): Promise<ReminderTestSnapshot> =>
  AppService.GetReminderTestSnapshot(prayerName, offsetSeconds, timezone) as any;
export const syncReminderTestWindow = (
  prayerName: string,
  offsetSeconds: number,
  timezone: string,
  live: boolean,
): Promise<ReminderTestSnapshot> =>
  AppService.SyncReminderTestWindow(prayerName, offsetSeconds, timezone, live) as any;
export const triggerReminderTest = (
  prayerName: string,
  offsetSeconds: number,
  timezone: string,
  live: boolean,
): Promise<ReminderTestSnapshot> =>
  AppService.TriggerReminderTest(prayerName, offsetSeconds, timezone, live) as any;
