import { Box, Card, CircularProgress, Typography } from '@mui/material';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import dayjs, { type Dayjs } from 'dayjs';
import type { HijriDate } from '../../../types';
import { formatHijriDayNumber, getHijriMonthName, toIsoDate } from './helpers';

type CalendarMode = 'gregorian' | 'hijri';

interface PrayerMonthCalendarCardProps {
  title: string;
  subtitle: string;
  mode: CalendarMode;
  selectedDate: Dayjs;
  onSelectedDateChange: (date: Dayjs) => void;
  onMonthChange: (month: Dayjs) => void;
  loading: boolean;
  hijriByDate: Record<string, HijriDate>;
  useArabicIndicDigits: boolean;
}

export default function PrayerMonthCalendarCard({
  title,
  subtitle,
  mode,
  selectedDate,
  onSelectedDateChange,
  onMonthChange,
  loading,
  hijriByDate,
  useArabicIndicDigits,
}: PrayerMonthCalendarCardProps) {
  const todayIso = dayjs().format('YYYY-MM-DD');

  const CalendarDay = (props: PickersDayProps) => {
    const { day, outsideCurrentMonth, ...other } = props;
    const isoDate = toIsoDate(day as Dayjs);
    const hijriDate = hijriByDate[isoDate];
    const isToday = isoDate === todayIso;

    const gregorianDay = String((day as Dayjs).date());
    const gregorianMonth = (day as Dayjs).format('MMM');
    const hijriDay = hijriDate ? formatHijriDayNumber(hijriDate.day, useArabicIndicDigits) : '';
    const primaryLabel = mode === 'hijri' ? hijriDay : gregorianDay;
    const primaryContext = mode === 'hijri' ? (hijriDate ? getHijriMonthName(hijriDate.month) : '') : '';

    const secondaryLabel = mode === 'hijri' ? gregorianDay : hijriDay;
    const secondaryContext =
      mode === 'hijri' ? gregorianMonth : hijriDate ? getHijriMonthName(hijriDate.month).replace('al-', '') : '';

    return (
      <PickersDay
        {...other}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        disableMargin
        sx={{
          width: '100%',
          maxWidth: 'none',
          height: { xs: 88, md: 96 },
          borderRadius: 2,
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          px: { xs: 1, md: 1.15 },
          py: { xs: 0.9, md: 1.05 },
          lineHeight: 1,
          ...(isToday && {
            border: '1px solid',
            borderColor: 'primary.main',
          }),
          ...(outsideCurrentMonth && {
            opacity: 0.38,
          }),
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '& .calendar-secondary, & .calendar-time': {
              color: 'inherit',
              opacity: 0.82,
            },
          },
        }}
      >
        <Box width="100%" textAlign="left">
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1 }}>
              {primaryLabel}
            </Typography>
            <Typography
              variant="caption"
              className="calendar-secondary ps-2"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1 }}
            >
              {primaryContext}
            </Typography>
          </Box>

          {secondaryContext && (
            <Typography
              variant="caption"
              className="calendar-secondary"
              color="text.secondary"
              sx={{
                display: 'block',
                opacity: 0.78,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {secondaryLabel} {secondaryContext}
            </Typography>
          )}
        </Box>
      </PickersDay>
    );
  };

  return (
    <Card
      sx={{
        p: { xs: 2.5, md: 3.25 },
        borderRadius: 0.5,
        height: '100%',
        overflow: 'visible',
      }}
    >
      <Box mb={2}>
        <Typography variant="h3">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>

      <Box
        sx={{
          '& .MuiDateCalendar-root': {
            height: '720px',
            maxHeight: '100%',
          },
          '& .MuiPickersSlideTransition-root': {
            height: '720px',
            maxHeight: '100%',
          },
          '& .MuiPickersCalendarHeader-root': {
            px: 0,
            mb: 1,
          },
          '& .MuiPickersCalendarHeader-label': {
            fontWeight: 700,
            fontSize: { xs: '1rem', md: '1.08rem' },
          },
          '& .MuiDayCalendar-header': {
            justifyContent: 'space-between',
            gap: 0.75,
          },
          '& .MuiDayCalendar-weekDayLabel': {
            width: '100%',
            maxWidth: 'none',
            fontSize: { xs: '0.76rem', md: '0.82rem' },
            color: 'text.secondary',
          },
          '& .MuiDayCalendar-weekContainer': {
            mt: 0.95,
            justifyContent: 'space-between',
            gap: { xs: 0.85, md: 1.1 },
          },
        }}
      >
        <DateCalendar
          value={selectedDate}
          onChange={(value) => {
            if (value) {
              onSelectedDateChange(value as Dayjs);
            }
          }}
          onMonthChange={(value) => onMonthChange(value as Dayjs)}
          loading={loading}
          renderLoading={() => (
            <Box py={8} display="grid" sx={{ placeItems: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          )}
          slots={{ day: CalendarDay }}
          showDaysOutsideCurrentMonth
          fixedWeekNumber={6}
          sx={{
            width: '100%',
            minWidth: 420,
          }}
        />
      </Box>
    </Card>
  );
}
