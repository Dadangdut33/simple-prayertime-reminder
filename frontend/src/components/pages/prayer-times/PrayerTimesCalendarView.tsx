import { Box, Grid, Typography } from '@mui/material';
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
}: PrayerTimesCalendarViewProps) {
  const isSideBySide = calendarSystem === 'side-by-side';
  const schedulesByDate = buildScheduleMap(schedules);
  const hijriByDate = buildHijriMap(hijriDays);
  const selectedSchedule = schedulesByDate[selectedDate.format('YYYY-MM-DD')] ?? null;
  const selectedHijri = hijriByDate[selectedDate.format('YYYY-MM-DD')] ?? null;
  const hijriRangeLabel = getHijriMonthRangeLabel(hijriDays);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box display="flex" flexDirection="column" gap={3}>
        {calendarSystem === 'hijri' && (
          <Typography variant="body2" color="text.secondary">
            Hijri mode emphasizes Hijri day numbers while keeping the month
            aligned with the selected Gregorian schedule range.
          </Typography>
        )}

        <Grid container spacing={3} alignItems="stretch">
          {calendarSystem === 'gregorian' && (
            <Grid size={{ xs: 12, xl: 8 }}>
              <PrayerMonthCalendarCard
                title="Gregorian Calendar"
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
                title="Hijri Calendar"
                subtitle={`${hijriRangeLabel} • ${formatMonthHeading(activeMonth)}`}
                mode="hijri"
                selectedDate={selectedDate}
                onSelectedDateChange={onSelectedDateChange}
                onMonthChange={onMonthChange}
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
                  title="Gregorian Calendar"
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
                  title="Hijri Calendar"
                  subtitle={hijriRangeLabel}
                  mode="hijri"
                  selectedDate={selectedDate}
                  onSelectedDateChange={onSelectedDateChange}
                  onMonthChange={onMonthChange}
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
            Selected day: {formatHijriDateLabel(selectedHijri)}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  );
}
