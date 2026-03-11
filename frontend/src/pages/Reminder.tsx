declare global {
  interface Window {
    wails?: {
      Events?: {
        On: (eventName: string, callback: (...args: any[]) => void) => void;
      };
    };
  }
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  dismissReminder,
  dismissTestReminder,
  emitReminderInfo,
  emitTestReminderInfo,
  getReminderState,
  getTestReminderState,
  playAdhan,
} from '../bindings';
import type { ReminderInfo } from '../types';
import { useTranslation } from 'react-i18next';
import { getPrayerDisplayName } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import { useClock, useInterval } from '../hooks';
import ReminderWindow from '../components/reminder/ReminderWindow';

export default function ReminderPage() {
  const { t } = useTranslation();
  const { settings, initialize, initialized } = useAppStore();
  const [info, setInfo] = useState<ReminderInfo | null>(null);
  const [hasState, setHasState] = useState(false);
  const fallbackInfo: ReminderInfo = { prayerName: 'Fajr', state: 'before', minutesLeft: 10 };
  const isTest = new URLSearchParams(window.location.search).get('mode') === 'test';
  const lastPlayKeyRef = useRef<string | null>(null);
  const lastInfoKeyRef = useRef<string | null>(null);
  const autoDismissAtRef = useRef<number | null>(null);
  const infoReceivedAtRef = useRef<number | null>(null);
  const prayerTimeMsRef = useRef<number | null>(null);
  const clock = useClock();

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  const notificationSettings = settings?.notification ?? null;

  const normalizeInfo = (next: ReminderInfo | null): ReminderInfo | null => {
    if (!next) return null;
    let offsetMinutes = typeof next.offsetMinutes === 'number' ? next.offsetMinutes : 0;
    if (offsetMinutes === 0) {
      if (next.state === 'before' && next.minutesLeft > 0) {
        offsetMinutes = -next.minutesLeft;
      } else if (next.state === 'after' && next.minutesLeft > 0) {
        offsetMinutes = next.minutesLeft;
      }
    }
    return { ...next, offsetMinutes };
  };

  const buildInfoKey = (next: ReminderInfo) =>
    `${next.prayerName}|${next.state}|${next.minutesLeft}|${next.offsetMinutes ?? 0}|${next.triggerId ?? 0}`;

  const applyInfo = (next: ReminderInfo | null, force = false) => {
    if (!next) {
      lastInfoKeyRef.current = null;
      setHasState(false);
      setInfo(fallbackInfo);
      infoReceivedAtRef.current = null;
      prayerTimeMsRef.current = null;
      return;
    }
    const normalized = normalizeInfo(next) ?? fallbackInfo;
    const key = buildInfoKey(normalized);
    if (!force && lastInfoKeyRef.current === key) return;
    lastInfoKeyRef.current = key;
    setHasState(true);
    setInfo(normalized);
    const now = Date.now();
    infoReceivedAtRef.current = now;
    prayerTimeMsRef.current = now - (normalized.offsetMinutes ?? 0) * 60 * 1000;
  };

  const resolveInfo = (state: ReminderInfo | null, eventData?: ReminderInfo | null) => {
    if (state && eventData) {
      const same =
        state.prayerName === eventData.prayerName &&
        state.state === eventData.state &&
        state.minutesLeft === eventData.minutesLeft &&
        (state.offsetMinutes ?? 0) === (eventData.offsetMinutes ?? 0);
      return same ? state : eventData;
    }
    return state ?? eventData ?? null;
  };

  useEffect(() => {
    if (window.wails?.Events?.On) {
      const eventName = isTest ? 'reminder:test-update' : 'reminder:update';
      window.wails.Events.On(eventName, (data: ReminderInfo) => {
        void (isTest ? getTestReminderState() : getReminderState()).then((state) => {
          applyInfo(resolveInfo(state, data), isTest);
        });
      });
    }

    document.body.style.background = 'transparent';
    if (isTest) {
      void emitTestReminderInfo();
      void getTestReminderState().then((data) => {
        applyInfo(data, true);
      });
    } else {
      void emitReminderInfo();
      void getReminderState().then((data) => {
        applyInfo(data);
      });
    }

    return () => {
      document.body.style.background = '';
    };
  }, [isTest]);

  useInterval(() => {
    void (isTest ? getTestReminderState() : getReminderState()).then((state) => {
      if (!state) return;
      applyInfo(state);
    });
  }, 2000);

  useEffect(() => {
    if (!notificationSettings) return;
    if (!info) return;
    if (!notificationSettings.persistentReminder && notificationSettings.autoDismissSeconds > 0) {
      const baseTime = infoReceivedAtRef.current ?? Date.now();
      autoDismissAtRef.current = baseTime + notificationSettings.autoDismissSeconds * 1000;
    } else {
      autoDismissAtRef.current = null;
    }
  }, [info, notificationSettings]);

  const prayerName = info?.prayerName ? getPrayerDisplayName(info.prayerName) : t('reminder.prayerFallback');
  const state = info?.state ?? 'before';
  const minutesLeft = info?.minutesLeft ?? 0;
  const offsetMinutes = info?.offsetMinutes ?? 0;

  const prayerTimeMs = prayerTimeMsRef.current;
  const useLiveClock = !isTest || Boolean(info?.live);
  const diffSeconds =
    useLiveClock && prayerTimeMs ? Math.floor((clock.getTime() - prayerTimeMs) / 1000) : null;
  let displayState = state;
  let beforeMinutes = minutesLeft > 0 ? minutesLeft : Math.abs(offsetMinutes);
  let afterMinutes = Math.max(0, offsetMinutes);
  let beforeSeconds = Math.max(0, beforeMinutes * 60);
  let afterSeconds = Math.max(0, afterMinutes * 60);
  if (diffSeconds !== null) {
    if (diffSeconds < 0) {
      displayState = 'before';
      beforeSeconds = Math.max(0, Math.abs(diffSeconds));
      beforeMinutes = Math.max(0, Math.ceil(beforeSeconds / 60));
      afterMinutes = 0;
    } else if (diffSeconds < 60) {
      displayState = 'ontime';
      beforeMinutes = 0;
      afterMinutes = 0;
      beforeSeconds = 0;
      afterSeconds = 0;
    } else {
      displayState = 'after';
      afterSeconds = Math.max(0, diffSeconds);
      afterMinutes = Math.max(0, Math.floor(afterSeconds / 60));
      beforeMinutes = 0;
    }
  }

  const offsetLabel = useMemo(() => {
    if (!offsetMinutes || Number.isNaN(offsetMinutes)) return null;
    const sign = offsetMinutes > 0 ? '+' : '-';
    return `${sign}${Math.abs(offsetMinutes)}m`;
  }, [offsetMinutes]);

  const hoverDetail = useMemo(() => {
    if (displayState === 'ontime') {
      return t('reminder.timeDetail');
    }
    if (displayState === 'before') {
      const detailMinutes = Math.floor(beforeSeconds / 60);
      const seconds = beforeSeconds % 60;
      return t('reminder.beforeDetail', {
        prayer: prayerName,
        minutes: detailMinutes,
        seconds,
      });
    }
    const detailMinutes = Math.floor(afterSeconds / 60);
    const seconds = afterSeconds % 60;
    return t('reminder.afterDetail', {
      prayer: prayerName,
      minutes: detailMinutes,
      seconds,
    });
  }, [afterMinutes, afterSeconds, beforeMinutes, beforeSeconds, displayState, prayerName, t]);

  useEffect(() => {
    if (!hasState || !info || !notificationSettings?.playAdhan) return;
    if (!info.triggerId) return;
    if (displayState !== 'ontime') return;
    const key = `${info.prayerName}|${prayerTimeMs ?? 0}|${isTest ? 'test' : 'real'}`;
    if (lastPlayKeyRef.current === key) return;
    lastPlayKeyRef.current = key;
    void playAdhan(info.prayerName === 'Fajr').catch((e) => {
      console.error('Fail to play audio');
      console.error(e);
    });
  }, [displayState, hasState, info, isTest, notificationSettings?.playAdhan, prayerTimeMs]);

  const autoDismissSecondsLeft = (() => {
    if (
      !notificationSettings ||
      notificationSettings.persistentReminder ||
      notificationSettings.autoDismissSeconds <= 0
    ) {
      return null;
    }
    if (!autoDismissAtRef.current) return null;
    return Math.max(0, Math.ceil((autoDismissAtRef.current - clock.getTime()) / 1000));
  })();

  const debugNode =
    isTest && info ? (
      <Box
        sx={{
          mt: 1,
          mb: 2,
          px: 1.5,
          py: 1,
          borderRadius: 0.75,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.03)',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block">
          Debug
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Prayer: {info.prayerName} · State: {info.state}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Minutes left: {info.minutesLeft} · Offset: {offsetLabel ?? '0m'}
        </Typography>
      </Box>
    ) : null;

  const extraNode = debugNode ? <>{debugNode}</> : null;

  return (
    <ReminderWindow
      prayerLabel={prayerName}
      state={displayState}
      beforeMinutes={beforeMinutes}
      afterMinutes={afterMinutes}
      hoverDetail={hoverDetail}
      autoDismissSecondsLeft={autoDismissSecondsLeft}
      extra={extraNode}
      onDismiss={async () => {
        if (isTest) {
          await dismissTestReminder();
        } else {
          await dismissReminder();
        }
      }}
      dismissLabel={t('reminder.dismiss')}
    />
  );
}
