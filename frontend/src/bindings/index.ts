import * as AppService from '../../bindings/github.com/dadangdut33/simple-prayertime-reminder/internal/appservice/service.js';
import type {
  AppInfo,
  DaySchedule,
  HijriDate,
  Location,
  NextPrayerInfo,
  Settings,
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
export const getNextPrayer = (): Promise<NextPrayerInfo> =>
  AppService.GetNextPrayer() as any;

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

// ---- Audio ----
export const playAdhan = (isFajr: boolean): Promise<void> =>
  AppService.PlayAdhan(isFajr) as any;
export const stopAdhan = (): Promise<void> => AppService.StopAdhan() as any;

// ---- Export ----
export const exportToCSV = (
  year: number,
  month: number,
  path: string,
): Promise<void> => AppService.ExportToCSV(year, month, path) as any;
export const exportToExcel = (
  year: number,
  month: number,
  path: string,
): Promise<void> => AppService.ExportToExcel(year, month, path) as any;

// ---- Notification ----
export const dismissReminder = (): Promise<void> =>
  AppService.DismissReminder() as any;

// ---- Time ----
export const getCurrentTime = (): Promise<string> =>
  AppService.GetCurrentTime() as any;

// ---- App Info ----
export const getAppInfo = (): Promise<AppInfo> =>
  AppService.GetAppInfo() as any;
export const openConfigLocation = (): Promise<void> =>
  AppService.OpenConfigLocation() as any;
export const openURL = (url: string): Promise<void> =>
  AppService.OpenURL(url) as any;
