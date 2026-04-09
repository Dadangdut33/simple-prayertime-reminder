import { Box } from '@mui/material';
import DashboardHeader from '../components/pages/dashboard/DashboardHeader';
import DashboardClockCard from '../components/pages/dashboard/DashboardClockCard';
import NextPrayerCard from '../components/pages/dashboard/NextPrayerCard';
import QiblaCard from '../components/pages/dashboard/QiblaCard';
import ScheduleCard from '../components/pages/dashboard/ScheduleCard';
import { useClock } from '../hooks';
import { useAppStore } from '../store/appStore';
import { useTranslation } from 'react-i18next';
import {
  bearingToCompassLabel,
  clamp,
  formatDigitalClock,
  getPrayerDisplayName,
  getPrayerList,
} from '../utils/helpers';

export default function Dashboard() {
  const { todaySchedule, nextPrayer, hijriDate, location, qiblaDirection, settings, loading } = useAppStore();
  const { t } = useTranslation();
  const now = useClock();
  const timeZone = settings?.location.timezone || undefined;
  const timeFormat = settings?.timeFormat ?? '24h';
  let zonedNow = now;
  if (timeZone) {
    try {
      zonedNow = new Date(now.toLocaleString('en-US', { timeZone }));
    } catch {
      zonedNow = now;
    }
  }

  if (loading || !todaySchedule || !settings) {
    return null; // handled by App shell
  }

  const getDayKey = (value: Date) => {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(value);
      const year = parts.find((part) => part.type === 'year')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      const day = parts.find((part) => part.type === 'day')?.value;
      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fall through to local date key.
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const prayers = getPrayerList(todaySchedule);
  const canonicalPrayers = [
    { name: 'Fajr', time: new Date(todaySchedule.fajr) },
    { name: 'Sunrise', time: new Date(todaySchedule.sunrise) },
    { name: 'Zuhr', time: new Date(todaySchedule.zuhr) },
    { name: 'Asr', time: new Date(todaySchedule.asr) },
    { name: 'Maghrib', time: new Date(todaySchedule.maghrib) },
    { name: 'Isha', time: new Date(todaySchedule.isha) },
  ];

  const graceSeconds = 60;
  let previousPrayer: { name: string; time: Date } | null = null;
  for (const prayer of canonicalPrayers) {
    if (prayer.time <= now) {
      previousPrayer = prayer;
    }
  }

  if (!previousPrayer) {
    const previousIsha = new Date(todaySchedule.isha);
    previousIsha.setDate(previousIsha.getDate() - 1);
    previousPrayer = { name: 'Isha', time: previousIsha };
  }

  let upcomingPrayer =
    nextPrayer && nextPrayer.time
      ? { name: nextPrayer.name, time: new Date(nextPrayer.time) }
      : canonicalPrayers.find((prayer) => prayer.time > now) ?? null;
  if (upcomingPrayer && Number.isNaN(upcomingPrayer.time.getTime())) {
    upcomingPrayer = canonicalPrayers.find((prayer) => prayer.time > now) ?? null;
  }
  if (!upcomingPrayer) {
    const tomorrowFajr = new Date(todaySchedule.fajr);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    upcomingPrayer = { name: 'Fajr', time: tomorrowFajr };
  }

  const isAllPassed = upcomingPrayer.name === 'Fajr' && getDayKey(upcomingPrayer.time) !== getDayKey(now);
  const secondsSincePrevious = Math.max(0, Math.floor((now.getTime() - previousPrayer.time.getTime()) / 1000));
  const isOnTime = secondsSincePrevious >= 0 && secondsSincePrevious < graceSeconds;
  const displayPrayer = isOnTime ? previousPrayer : upcomingPrayer;
  const displayPrayerLabel = getPrayerDisplayName(displayPrayer.name, displayPrayer.time.toISOString());
  const upcomingPrayerLabel = getPrayerDisplayName(upcomingPrayer.name, upcomingPrayer.time.toISOString());
  const nextPrayerDate = upcomingPrayer.time;

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  };

  const secondsToNext = Math.max(0, Math.floor((nextPrayerDate.getTime() - now.getTime()) / 1000));
  const countdown = isOnTime ? t('dashboard.nextPrayer.timeForPrayer') : formatCountdown(secondsToNext);
  const timeLabel = isOnTime
    ? t('dashboard.nextPrayer.timeForPrayerLabel')
    : displayPrayerLabel === t('prayerNames.sunrise')
      ? t('dashboard.nextPrayer.timeUntil', { label: t('prayerNames.sunrise') })
      : t('dashboard.nextPrayer.timeUntilDefault');

  const scheduleHighlightLabel = displayPrayerLabel;
  const previousPrayerInfo = previousPrayer
    ? {
        name: getPrayerDisplayName(previousPrayer.name, previousPrayer.time.toISOString()),
        time: previousPrayer.time,
      }
    : null;

  const elapsedSeconds = previousPrayerInfo
    ? Math.max(0, Math.floor((now.getTime() - previousPrayerInfo.time.getTime()) / 1000))
    : 0;
  const progress =
    previousPrayerInfo && nextPrayerDate
      ? clamp(
          ((now.getTime() - previousPrayerInfo.time.getTime()) /
            (nextPrayerDate.getTime() - previousPrayerInfo.time.getTime())) *
            100,
          0,
          100,
        )
      : 0;
  const analogClockSize = clamp(settings.dashboard.analogClockSize || 200, 160, 280);
  const digitalClockText = formatDigitalClock(
    zonedNow,
    settings.dashboard.digitalClockFormat,
    settings.dashboard.digitalClockCustom,
  );
  const qiblaCompassLabel = bearingToCompassLabel(qiblaDirection ?? 0);

  return (
    <Box p={4}>
      <DashboardHeader now={now} hijriDate={hijriDate} location={location} />

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1.2fr 0.8fr' }} gap={3}>
        <Box display="grid" gap={3}>
          <NextPrayerCard
            displayPrayerLabel={displayPrayerLabel}
            nextPrayerLabel={upcomingPrayerLabel}
            nextPrayerTime={nextPrayerDate.toISOString()}
            countdown={countdown}
            timeLabel={timeLabel}
            isAllPassed={isAllPassed}
            previousPrayerInfo={previousPrayerInfo}
            elapsedSeconds={elapsedSeconds}
            progress={progress}
            timeZone={timeZone}
            timeFormat={timeFormat}
          />

          {settings.dashboard.showClock && (
            <DashboardClockCard
              now={zonedNow}
              settings={settings}
              analogClockSize={analogClockSize}
              digitalClockText={digitalClockText}
              timeZoneLabel={timeZone}
            />
          )}
        </Box>

        <Box display="grid" gap={3}>
          <ScheduleCard
            prayers={prayers}
            nextPrayerName={scheduleHighlightLabel}
            isAllPassed={isAllPassed}
            timeZone={timeZone}
            timeFormat={timeFormat}
          />

          <QiblaCard location={location} qiblaDirection={qiblaDirection} qiblaCompassLabel={qiblaCompassLabel} />
        </Box>
      </Box>
    </Box>
  );
}
