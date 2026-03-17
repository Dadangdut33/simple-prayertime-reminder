import { create } from 'zustand';
import * as api from '../bindings';
import type { DaySchedule, HijriDate, Location, NextPrayerInfo, Settings } from '../types';
import i18n from '../i18n';

interface AppState {
  // Data
  todaySchedule: DaySchedule | null;
  nextPrayer: NextPrayerInfo | null;
  hijriDate: HijriDate | null;
  location: Location | null;
  qiblaDirection: number | null;
  settings: Settings | null;

  // UI state
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  refreshPrayerData: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  resetSettings: () => Promise<void>;
  detectLocation: () => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  todaySchedule: null,
  nextPrayer: null,
  hijriDate: null,
  location: null,
  qiblaDirection: null,
  settings: null,
  loading: true,
  error: null,
  initialized: false,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      // Wails v3 alpha IPC might take a few milliseconds to inject in dev mode.
      // We poll briefly to wait for the backend to become available.
      for (let i = 0; i < 20; i++) {
        try {
          await api.getSettings();
          break; // success
        } catch (e: any) {
          if (i === 19) throw e;
          await new Promise((res) => setTimeout(res, 50));
        }
      }

      const [settings, schedule, nextPrayer, hijri, location, qibla] = await Promise.all([
        api.getSettings(),
        api.getTodaySchedule(),
        api.getNextPrayer(),
        api.getTodayHijri(),
        api.getLocation(),
        api.getQiblaDirection(),
      ]);
      set({
        settings,
        todaySchedule: schedule,
        nextPrayer,
        hijriDate: hijri,
        location,
        qiblaDirection: qibla,
        loading: false,
        initialized: true,
      });
      if (settings?.language) {
        await i18n.changeLanguage(settings.language);
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  },

  refreshPrayerData: async () => {
    try {
      const [schedule, nextPrayer, hijri] = await Promise.all([
        api.getTodaySchedule(),
        api.getNextPrayer(),
        api.getTodayHijri(),
      ]);
      set({ todaySchedule: schedule, nextPrayer, hijriDate: hijri });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  updateSettings: async (settings: Settings) => {
    await api.saveSettings(settings);
    const [location, qibla] = await Promise.all([api.getLocation(), api.getQiblaDirection()]);
    set({ settings, location, qiblaDirection: qibla });
    if (settings?.language) {
      await i18n.changeLanguage(settings.language);
    }
    // Re-fetch prayer data since method/location may have changed
    await get().refreshPrayerData();
  },

  resetSettings: async () => {
    const settings = await api.resetSettings();
    const [schedule, nextPrayer, hijri, location, qibla] = await Promise.all([
      api.getTodaySchedule(),
      api.getNextPrayer(),
      api.getTodayHijri(),
      api.getLocation(),
      api.getQiblaDirection(),
    ]);
    set({
      settings,
      todaySchedule: schedule,
      nextPrayer,
      hijriDate: hijri,
      location,
      qiblaDirection: qibla,
    });
    if (settings?.language) {
      await i18n.changeLanguage(settings.language);
    }
  },

  detectLocation: async () => {
    set({ loading: true, error: null });
    try {
      const loc = await api.detectLocation();
      set({ location: loc, loading: false });
      // Reload settings (location was updated server-side)
      const settings = await api.getSettings();
      set({ settings });
      if (settings?.language) {
        await i18n.changeLanguage(settings.language);
      }
      await get().refreshPrayerData();
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
