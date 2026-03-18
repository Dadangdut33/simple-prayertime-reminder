import { Box, Card, Typography } from '@mui/material';
import Clock from 'react-clock';
import type { Settings } from '../../../types';
import { useTranslation } from 'react-i18next';

interface DashboardClockCardProps {
  now: Date;
  settings: Settings;
  analogClockSize: number;
  digitalClockText: string;
  timeZoneLabel?: string;
}

export default function DashboardClockCard({
  now,
  settings,
  analogClockSize,
  digitalClockText,
  timeZoneLabel,
}: DashboardClockCardProps) {
  const { t } = useTranslation();
  const analogFormatHour = (_locale: string | undefined, hour: number) => {
    if (settings.dashboard.showAllClockHours) {
      return String(hour);
    }

    return [12, 3, 6, 9].includes(hour) ? String(hour) : '';
  };

  return (
    <Card sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 180,
          height: 180,
          background: (theme) => `radial-gradient(circle, ${theme.palette.primary.main}18, transparent 72%)`,
          pointerEvents: 'none',
        }}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} letterSpacing={1.5}>
          {t('dashboard.clock.title')}
        </Typography>
      </Box>

      {settings.dashboard.clockType === 'analog' ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{
            '& .react-clock': {
              borderRadius: '50%',
              overflow: 'hidden',
              transition: 'width 160ms ease, height 160ms ease',
            },
            '& .react-clock__face': {
              borderColor: 'divider',
              background: (theme) =>
                `radial-gradient(circle at top, ${theme.palette.action.hover}, ${theme.palette.background.paper})`,
              boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.divider}`,
            },
            '& .react-clock__hour-mark__body': {
              backgroundColor: 'text.primary',
              borderRadius: 999,
              opacity: 0.92,
            },
            '& .react-clock__minute-mark__body': {
              backgroundColor: 'divider',
              borderRadius: 999,
              opacity: 0.9,
            },
            '& .react-clock__mark__number': {
              color: 'text.secondary',
              fontFamily: 'Roboto, Segoe UI, sans-serif',
              fontWeight: 700,
              fontSize: `${Math.max(12, analogClockSize * 0.075)}px`,
              lineHeight: 1,
            },
            '& .react-clock__hour-hand__body': {
              backgroundColor: 'text.primary',
              borderRadius: 999,
              boxShadow: 1,
            },
            '& .react-clock__minute-hand__body': {
              backgroundColor: 'primary.main',
              borderRadius: 999,
              boxShadow: 1,
            },
            '& .react-clock__second-hand__body': {
              backgroundColor: 'secondary.main',
              borderRadius: 999,
            },
          }}
        >
          <Clock
            value={now}
            size={analogClockSize}
            renderNumbers
            formatHour={analogFormatHour}
            renderHourMarks
            renderMinuteMarks
            hourHandLength={50}
            minuteHandLength={72}
            secondHandLength={82}
            hourHandWidth={Math.max(4, Math.round(analogClockSize * 0.022))}
            minuteHandWidth={Math.max(3, Math.round(analogClockSize * 0.016))}
            secondHandWidth={2}
            hourMarksLength={10}
            minuteMarksLength={5}
            hourMarksWidth={3}
            minuteMarksWidth={1}
          />
        </Box>
      ) : (
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: '3.35rem',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {digitalClockText}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {timeZoneLabel ? t('dashboard.clock.timezoneLabel', { tz: timeZoneLabel }) : t('dashboard.clock.localTime')}
          </Typography>
        </Box>
      )}
    </Card>
  );
}
