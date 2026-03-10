import { Box } from '@mui/material';
import DashboardHeader from '../components/pages/dashboard/DashboardHeader';
import DashboardClockCard from '../components/pages/dashboard/DashboardClockCard';
import NextPrayerCard from '../components/pages/dashboard/NextPrayerCard';
import QiblaCard from '../components/pages/dashboard/QiblaCard';
import ScheduleCard from '../components/pages/dashboard/ScheduleCard';
import { useCountdown, useClock } from '../hooks';
import { useAppStore } from '../store/appStore';
import {
  bearingToCompassLabel,
  clamp,
  formatDigitalClock,
  getPrayerDisplayName,
  getPrayerList,
} from '../utils/helpers';

export default function Dashboard() {
  const { todaySchedule, nextPrayer, hijriDate, location, qiblaDirection, settings, loading } = useAppStore();
  const countdown = useCountdown(nextPrayer?.time);
  const now = useClock();

  if (loading || !todaySchedule || !settings) {
    return null; // handled by App shell
  }

  const prayers = getPrayerList(todaySchedule);
  const isAllPassed = nextPrayer?.name === 'Fajr' && new Date(nextPrayer.time) > now;
  const nextPrayerDate = nextPrayer ? new Date(nextPrayer.time) : null;
  const nextPrayerLabel = nextPrayer
    ? getPrayerDisplayName(nextPrayer.name, nextPrayer.time || todaySchedule.date)
    : undefined;

  let previousPrayerInfo: { name: string; time: Date } | null = null;
  for (const prayer of prayers) {
    const prayerTime = new Date(prayer.time);
    if (prayerTime <= now) {
      previousPrayerInfo = { name: prayer.name, time: prayerTime };
    }
  }

  if (!previousPrayerInfo) {
    const previousIsha = new Date(todaySchedule.isha);
    previousIsha.setDate(previousIsha.getDate() - 1);
    previousPrayerInfo = { name: 'Isha', time: previousIsha };
  }

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
    now,
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
            nextPrayer={nextPrayer}
            countdown={countdown}
            isAllPassed={isAllPassed}
            previousPrayerInfo={previousPrayerInfo}
            elapsedSeconds={elapsedSeconds}
            progress={progress}
          />

          {settings.dashboard.showClock && (
            <DashboardClockCard
              now={now}
              settings={settings}
              analogClockSize={analogClockSize}
              digitalClockText={digitalClockText}
            />
          )}
        </Box>

        <Box display="grid" gap={3}>
          <ScheduleCard prayers={prayers} nextPrayerName={nextPrayerLabel} isAllPassed={isAllPassed} />

          <QiblaCard location={location} qiblaDirection={qiblaDirection} qiblaCompassLabel={qiblaCompassLabel} />
        </Box>
      </Box>
    </Box>
  );
}
