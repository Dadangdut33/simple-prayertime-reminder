import { Box, Card, Chip, LinearProgress, Typography } from '@mui/material';
import type { NextPrayerInfo } from '../../../types';
import { formatDuration, formatTime, getPrayerDisplayName } from '../../../utils/helpers';

interface PrayerMoment {
  name: string;
  time: Date;
}

interface NextPrayerCardProps {
  nextPrayer: NextPrayerInfo | null;
  countdown: string;
  isAllPassed: boolean;
  previousPrayerInfo: PrayerMoment | null;
  elapsedSeconds: number;
  progress: number;
}

export default function NextPrayerCard({
  nextPrayer,
  countdown,
  isAllPassed,
  previousPrayerInfo,
  elapsedSeconds,
  progress,
}: NextPrayerCardProps) {
  const nextPrayerLabel = nextPrayer
    ? getPrayerDisplayName(nextPrayer.name, nextPrayer.time)
    : undefined;

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
        Next Prayer
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mt={1}>
        <Typography variant="h2" fontSize="2.5rem" color="primary.main" fontWeight={700} lineHeight={1}>
          {nextPrayerLabel || '...'}
        </Typography>
        {isAllPassed && <Chip label="Tomorrow" color="secondary" size="small" />}
      </Box>

      <Box mt={4} pt={3} borderTop="1px solid" borderColor="divider">
        <Typography variant="body2" color="text.secondary" mb={1}>
          Time Until {nextPrayerLabel === 'Sunrise' ? 'Sunrise' : 'Next Prayer'}
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
              {formatDuration(elapsedSeconds)} since {previousPrayerInfo?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
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
              {previousPrayerInfo ? formatTime(previousPrayerInfo.time.toISOString()) : '--:--'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nextPrayerLabel} • {nextPrayer ? formatTime(nextPrayer.time) : '--:--'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
