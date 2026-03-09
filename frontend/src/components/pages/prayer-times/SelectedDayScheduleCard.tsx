import dayjs from 'dayjs';
import { Box, Card, Chip, Divider, Typography } from '@mui/material';
import type { Dayjs } from 'dayjs';
import type { DaySchedule, HijriDate } from '../../../types';
import { formatTime, getPrayerList } from '../../../utils/helpers';
import {
  formatHijriDateLabel,
  formatLongGregorianDate,
  toIsoDate,
} from './helpers';

interface SelectedDayScheduleCardProps {
  selectedDate: Dayjs;
  schedule: DaySchedule | null;
  hijriDate: HijriDate | null;
  loading: boolean;
  timeFormat: '12h' | '24h';
}

export default function SelectedDayScheduleCard({
  selectedDate,
  schedule,
  hijriDate,
  loading,
  timeFormat,
}: SelectedDayScheduleCardProps) {
  const isToday = toIsoDate(selectedDate) === dayjs().format('YYYY-MM-DD');

  return (
    <Card sx={{ p: 3, borderRadius: 0.5, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h3">Selected Day</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatLongGregorianDate(selectedDate)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatHijriDateLabel(hijriDate)}
          </Typography>
        </Box>
        {isToday && <Chip size="small" color="primary" label="Today" />}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading selected-day schedule…
        </Typography>
      ) : schedule ? (
        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
          gap={1.5}
        >
          {getPrayerList(schedule).map((entry) => (
            <Box
              key={entry.name}
              p={1.5}
              borderRadius={0.5}
              border="1px solid"
              borderColor="divider"
              bgcolor="background.paper"
            >
              <Typography variant="caption" color="text.secondary">
                {entry.name}
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatTime(entry.time, timeFormat)}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No prayer schedule was found for the selected day.
        </Typography>
      )}
    </Card>
  );
}
