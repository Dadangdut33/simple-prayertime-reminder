import { Box, Grid, Typography } from '@mui/material';
import { useMemo } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import type {
  DaySchedule,
  HijriCalendarDay,
  PrayerCalendarSystem,
} from '../../../types';
import {
  buildHijriMap,
  buildScheduleMap,
  formatHijriDateLabel,
  formatMonthHeading,
  getHijriMonthRangeLabel,
} from './helpers';
import PrayerMonthCalendarCard from './PrayerMonthCalendarCard';
import SelectedDayScheduleCard from './SelectedDayScheduleCard';
import { useTranslation } from 'react-i18next';

interface PrayerTimesCalendarViewProps {
  activeMonth: Dayjs;
  selectedDate: Dayjs;
  schedules: DaySchedule[];
  hijriDays: HijriCalendarDay[];
  loading: boolean;
  calendarSystem: PrayerCalendarSystem;
  timeFormat: '12h' | '24h';
  useArabicIndicDigits: boolean;
  onSelectedDateChange: (date: Dayjs) => void;
  onMonthChange: (month: Dayjs) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  hijriMonth: number | null;
  hijriYear: number | null;
  onHijriMonthYearChange: (year: number, month: number) => void;
}

export default function PrayerTimesCalendarView({
  activeMonth,
  selectedDate,
  schedules,
  hijriDays,
  loading,
  calendarSystem,
  timeFormat,
  useArabicIndicDigits,
  onSelectedDateChange,
  onMonthChange,
  onPrevMonth,
  onNextMonth,
  hijriMonth,
  hijriYear,
  onHijriMonthYearChange,
}: PrayerTimesCalendarViewProps) {
  const { t } = useTranslation();
  const isSideBySide = calendarSystem === 'side-by-side';
  const schedulesByDate = useMemo(() => buildScheduleMap(schedules), [schedules]);
  const hijriByDate = useMemo(() => buildHijriMap(hijriDays), [hijriDays]);
  const selectedSchedule = useMemo(
    () => schedulesByDate[selectedDate.format('YYYY-MM-DD')] ?? null,
    [schedulesByDate, selectedDate],
  );
  const selectedHijri = useMemo(
    () => hijriByDate[selectedDate.format('YYYY-MM-DD')] ?? null,
    [hijriByDate, selectedDate],
  );
  const hijriRangeLabel = useMemo(() => getHijriMonthRangeLabel(hijriDays), [hijriDays]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box display="flex" flexDirection="column" gap={3}>
        {calendarSystem === 'hijri' && (
          <Typography variant="body2" color="text.secondary">
            {t('prayerTimes.hijriModeHint')}
          </Typography>
        )}

        <Grid container spacing={3} alignItems="stretch">
          {calendarSystem === 'gregorian' && (
            <Grid size={{ xs: 12, xl: 8 }}>
              <PrayerMonthCalendarCard
                title={t('prayerTimes.calendar.titleGregorian')}
                subtitle={`${formatMonthHeading(activeMonth)} • ${hijriRangeLabel}`}
                mode="gregorian"
                selectedDate={selectedDate}
                onSelectedDateChange={onSelectedDateChange}
                onMonthChange={onMonthChange}
                loading={loading}
                hijriByDate={hijriByDate}
                useArabicIndicDigits={useArabicIndicDigits}
              />
            </Grid>
          )}

          {calendarSystem === 'hijri' && (
            <Grid size={{ xs: 12, xl: 8 }}>
              <PrayerMonthCalendarCard
                title={t('prayerTimes.calendar.titleHijri')}
                subtitle={`${hijriRangeLabel} • ${formatMonthHeading(activeMonth)}`}
                mode="hijri"
                selectedDate={selectedDate}
                onSelectedDateChange={onSelectedDateChange}
                onMonthChange={onMonthChange}
                onPrevMonth={onPrevMonth}
                onNextMonth={onNextMonth}
                hijriMonth={hijriMonth}
                hijriYear={hijriYear}
                onHijriMonthYearChange={onHijriMonthYearChange}
                loading={loading}
                hijriByDate={hijriByDate}
                useArabicIndicDigits={useArabicIndicDigits}
              />
            </Grid>
          )}

          {calendarSystem === 'side-by-side' && (
            <>
              <Grid size={{ xs: 12, lg: 6 }}>
                <PrayerMonthCalendarCard
                  title={t('prayerTimes.calendar.titleGregorian')}
                  subtitle={formatMonthHeading(activeMonth)}
                  mode="gregorian"
                  selectedDate={selectedDate}
                  onSelectedDateChange={onSelectedDateChange}
                  onMonthChange={onMonthChange}
                  loading={loading}
                  hijriByDate={hijriByDate}
                  useArabicIndicDigits={useArabicIndicDigits}
                />
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                <PrayerMonthCalendarCard
                  title={t('prayerTimes.calendar.titleHijri')}
                  subtitle={hijriRangeLabel}
                  mode="hijri"
                  selectedDate={selectedDate}
                  onSelectedDateChange={onSelectedDateChange}
                  onMonthChange={onMonthChange}
                  onPrevMonth={onPrevMonth}
                  onNextMonth={onNextMonth}
                  hijriMonth={hijriMonth}
                  hijriYear={hijriYear}
                  onHijriMonthYearChange={onHijriMonthYearChange}
                  loading={loading}
                  hijriByDate={hijriByDate}
                  useArabicIndicDigits={useArabicIndicDigits}
                />
              </Grid>
            </>
          )}

          <Grid size={{ xs: 12, xl: isSideBySide ? 12 : 4 }}>
            <SelectedDayScheduleCard
              selectedDate={selectedDate}
              schedule={selectedSchedule}
              hijriDate={selectedHijri}
              loading={loading}
              timeFormat={timeFormat}
            />
          </Grid>
        </Grid>

        {!loading && selectedHijri && (
          <Typography variant="caption" color="text.secondary">
            {t('prayerTimes.calendar.selectedDay', { date: formatHijriDateLabel(selectedHijri) })}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  );
}
