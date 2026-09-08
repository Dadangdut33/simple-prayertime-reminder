import { Box, Card, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { formatTime, formatTimeInZone } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

interface PrayerEntry {
  name: string;
  time: string;
}

interface ScheduleCardProps {
  prayers: readonly PrayerEntry[];
  nextPrayerName?: string;
  isAllPassed: boolean;
  timeZone?: string;
  timeFormat?: '12h' | '24h';
}

export default function ScheduleCard({
  prayers,
  nextPrayerName,
  isAllPassed,
  timeZone,
  timeFormat = '24h',
}: ScheduleCardProps) {
  const { t } = useTranslation();
  return (
    <Card sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: 1.5,
          }}
        >
          {t('dashboard.schedule.title')}
        </Typography>
        <NotificationsActiveIcon fontSize="small" color="disabled" />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {prayers.map((p) => {
          const isNext = p.name === nextPrayerName && !isAllPassed;
          return (
            <Box
              key={p.name}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 0.5,
                border: '1px solid transparent',
                ...(isNext && {
                  backgroundImage: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                  borderColor: 'primary.main',
                }),
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Typography
                variant="body1"
                color={isNext ? 'primary.main' : 'text.primary'}
                sx={{
                  fontWeight: 500,
                }}
              >
                {p.name}
              </Typography>
              <Typography
                variant="h6"
                color={isNext ? 'primary.main' : 'text.primary'}
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {timeZone ? formatTimeInZone(p.time, timeZone, timeFormat) : formatTime(p.time, timeFormat)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
