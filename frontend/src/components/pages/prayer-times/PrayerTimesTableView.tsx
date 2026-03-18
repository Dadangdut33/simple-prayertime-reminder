import dayjs, { type Dayjs } from 'dayjs';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { DaySchedule, HijriCalendarDay, PrayerCalendarSystem } from '../../../types';
import { formatTime, formatTimeInZone } from '../../../utils/helpers';
import { buildHijriMap, formatHijriDateShort } from './helpers';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

interface PrayerTimesTableViewProps {
  activeMonth: Dayjs;
  activeMonthLabel: string;
  loading: boolean;
  schedules: DaySchedule[];
  hijriDays: HijriCalendarDay[];
  timeFormat: '12h' | '24h';
  timeZone?: string;
  calendarSystem: PrayerCalendarSystem;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

function formatDateShort(dateStr: string): string {
  return dayjs(dateStr).locale(i18n.language).format('dddd, D MMM');
}

export default function PrayerTimesTableView({
  activeMonth,
  activeMonthLabel,
  loading,
  schedules,
  hijriDays,
  timeFormat,
  timeZone,
  calendarSystem,
  onPrevMonth,
  onNextMonth,
  onToday,
}: PrayerTimesTableViewProps) {
  const { t } = useTranslation();
  const todayIso = dayjs().format('YYYY-MM-DD');
  const hijriByDate = buildHijriMap(hijriDays);

  return (
    <Card sx={{ p: 3, borderRadius: 0.5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h3">{activeMonthLabel || activeMonth.format('MMMM YYYY')}</Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="center">
          <IconButton onClick={onPrevMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Button variant="text" color="inherit" size="small" onClick={onToday}>
            {t('prayerTimes.today')}
          </Button>
          <IconButton onClick={onNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              {[
                t('prayerTimes.table.date'),
                t('prayerNames.fajr'),
                t('prayerNames.sunrise'),
                t('prayerNames.zuhr'),
                t('prayerNames.asr'),
                t('prayerNames.maghrib'),
                t('prayerNames.isha'),
              ].map((label, index) => (
                <TableCell key={label} align={index === 0 ? 'left' : 'center'}>
                  <Typography variant="overline" fontWeight={600}>
                    {label}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => {
                const isToday = schedule.date.startsWith(todayIso);
                const hijriDate = hijriByDate[schedule.date.slice(0, 10)];
                const primaryDateLabel =
                  calendarSystem === 'hijri' && hijriDate
                    ? formatHijriDateShort(hijriDate)
                    : formatDateShort(schedule.date);
                const secondaryDateLabel =
                  calendarSystem === 'hijri'
                    ? formatDateShort(schedule.date)
                    : hijriDate
                      ? formatHijriDateShort(hijriDate)
                      : null;

                return (
                  <TableRow
                    key={schedule.date}
                    sx={{
                      ...(isToday && {
                        bgcolor: (theme) => `${theme.palette.primary.main}12`,
                      }),
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={isToday ? 700 : 500}
                        color={isToday ? 'primary.main' : 'text.primary'}
                      >
                        {primaryDateLabel}
                      </Typography>
                      {secondaryDateLabel ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          {secondaryDateLabel}
                        </Typography>
                      ) : null}
                    </TableCell>
                    {[
                      schedule.fajr,
                      schedule.sunrise,
                      schedule.zuhr,
                      schedule.asr,
                      schedule.maghrib,
                      schedule.isha,
                    ].map((value, index) => (
                      <TableCell
                        key={`${schedule.date}-${index}`}
                        align="center"
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {timeZone ? formatTimeInZone(value, timeZone, timeFormat) : formatTime(value, timeFormat)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
