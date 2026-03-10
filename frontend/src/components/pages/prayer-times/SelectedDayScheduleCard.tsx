import dayjs from 'dayjs';
import { Box, Card, Chip, Divider, Skeleton, Typography } from '@mui/material';
import type { Dayjs } from 'dayjs';
import type { DaySchedule, HijriDate } from '../../../types';
import { formatTime, getPrayerList } from '../../../utils/helpers';
import {
  formatHijriDateLabel,
  formatLongGregorianDate,
  toIsoDate,
} from './helpers';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const isToday = toIsoDate(selectedDate) === dayjs().format('YYYY-MM-DD');

  return (
    <Card sx={{ p: 3, borderRadius: 0.5, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h3">{t('prayerTimes.selectedDay')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatLongGregorianDate(selectedDate)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatHijriDateLabel(hijriDate)}
          </Typography>
        </Box>
        {isToday && <Chip size="small" color="primary" label={t('prayerTimes.today')} />}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box display="flex" flexDirection="column" gap={2}>
          <Skeleton variant="text" width="45%" height={26} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="55%" height={18} />
          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
            gap={1.5}
            mt={1}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" height={68} />
            ))}
          </Box>
        </Box>
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
          {t('prayerTimes.noSchedule')}
        </Typography>
      )}
    </Card>
  );
}
