import { Box, Card, Chip, LinearProgress, Typography } from '@mui/material';
import { formatDuration, formatTime, formatTimeInZone } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

interface PrayerMoment {
  name: string;
  time: Date;
}

interface NextPrayerCardProps {
  displayPrayerLabel: string;
  nextPrayerLabel: string;
  nextPrayerTime: string | null;
  countdown: string;
  timeLabel: string;
  isAllPassed: boolean;
  previousPrayerInfo: PrayerMoment | null;
  elapsedSeconds: number;
  progress: number;
  timeZone?: string;
  timeFormat?: '12h' | '24h';
}

export default function NextPrayerCard({
  displayPrayerLabel,
  nextPrayerLabel,
  nextPrayerTime,
  countdown,
  timeLabel,
  isAllPassed,
  previousPrayerInfo,
  elapsedSeconds,
  progress,
  timeZone,
  timeFormat = '24h',
}: NextPrayerCardProps) {
  const { t } = useTranslation();
  const progressLabel = progress >= 100 ? 100 : Math.floor(progress);

  return (
    <Card
      sx={{
        p: 4,
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.action.hover})`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          background: (theme) => `radial-gradient(circle, ${theme.palette.primary.main}40, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Typography variant="overline" color="text.secondary" fontWeight={600} letterSpacing={1.5}>
        {t('dashboard.nextPrayer.title')}
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mt={1}>
        <Typography variant="h2" fontSize="2.5rem" color="primary.main" fontWeight={700} lineHeight={1}>
          {displayPrayerLabel || '...'}
        </Typography>
        {isAllPassed && <Chip label={t('dashboard.nextPrayer.tomorrow')} color="secondary" size="small" />}
      </Box>

      <Box mt={4} pt={3} borderTop="1px solid" borderColor="divider">
        <Typography variant="body2" color="text.secondary" mb={1}>
          {timeLabel}
        </Typography>
        <Typography
          variant="h3"
          fontSize="3.5rem"
          fontWeight={800}
          sx={{
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {countdown}
        </Typography>

        <Box mt={2.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={1}>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.nextPrayer.since', {
                duration: formatDuration(elapsedSeconds),
                label: previousPrayerInfo?.name ?? '--',
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progressLabel}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 999,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                background: (theme) =>
                  `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
            }}
          />

          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mt={1}>
            <Typography variant="caption" color="text.secondary">
              {previousPrayerInfo?.name} •{' '}
              {previousPrayerInfo
                ? timeZone
                  ? formatTimeInZone(previousPrayerInfo.time.toISOString(), timeZone, timeFormat)
                  : formatTime(previousPrayerInfo.time.toISOString(), timeFormat)
                : '--:--'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nextPrayerLabel} •{' '}
              {nextPrayerTime
                ? timeZone
                  ? formatTimeInZone(nextPrayerTime, timeZone, timeFormat)
                  : formatTime(nextPrayerTime, timeFormat)
                : '--:--'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
