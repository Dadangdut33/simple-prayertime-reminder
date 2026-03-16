import { useCallback, useMemo } from 'react';
import { Box, Card, FormControl, IconButton, MenuItem, Select, Skeleton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs-hijri';
import type { HijriDate } from '../../../types';
import {
  getCalendarDayPresentation,
  getHijriMonthName,
  getWeekdayHeaders,
  type CalendarMode,
  toIsoDate,
} from './helpers';

interface PrayerMonthCalendarCardProps {
  title: string;
  subtitle: string;
  mode: CalendarMode;
  selectedDate: Dayjs;
  onSelectedDateChange: (date: Dayjs) => void;
  onMonthChange: (month: Dayjs) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  hijriMonth?: number | null;
  hijriYear?: number | null;
  onHijriMonthYearChange?: (year: number, month: number) => void;
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
  onPrevMonth,
  onNextMonth,
  hijriMonth,
  hijriYear,
  onHijriMonthYearChange,
  loading,
  hijriByDate,
  useArabicIndicDigits,
}: PrayerMonthCalendarCardProps) {
  const todayIso = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  const CalendarDay = useCallback(
    (props: PickersDayProps) => {
      const { day, outsideCurrentMonth, ...other } = props;
      const isoDate = toIsoDate(day as Dayjs);
      const hijriDate = hijriByDate[isoDate];
      const isToday = isoDate === todayIso;
      const { primaryLabel, primaryContext, secondaryLabel, secondaryContext } = getCalendarDayPresentation(
        mode,
        day as Dayjs,
        hijriDate,
        useArabicIndicDigits,
      );

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
              opacity: mode === 'hijri' ? 1 : 0.38,
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
    },
    [hijriByDate, mode, todayIso, useArabicIndicDigits],
  );

  const hijriMonthDays = useMemo(() => {
    if (mode !== 'hijri') {
      return [];
    }

    const selectedIso = toIsoDate(selectedDate);
    const selectedHijri = hijriByDate[selectedIso];
    if (!selectedHijri) {
      return [];
    }

    return Object.entries(hijriByDate)
      .filter(([, hijri]) => hijri.year === selectedHijri.year && hijri.month === selectedHijri.month)
      .map(([date, hijri]) => ({ date, hijri }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [hijriByDate, mode, selectedDate]);

  const hijriCalendarDays = useMemo(() => {
    if (mode !== 'hijri' || hijriMonthDays.length === 0) {
      return [];
    }

    const start = dayjs(hijriMonthDays[0].date).startOf('week');
    return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
  }, [hijriMonthDays, mode]);

  const hijriMonthKey = useMemo(() => {
    if (mode !== 'hijri') {
      return '';
    }

    const selectedIso = toIsoDate(selectedDate);
    const selectedHijri = hijriByDate[selectedIso];
    if (!selectedHijri) {
      return '';
    }

    return `${selectedHijri.year}-${selectedHijri.month}`;
  }, [hijriByDate, mode, selectedDate]);

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

      {mode === 'hijri' && (
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {subtitle}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {hijriMonth && hijriYear && onHijriMonthYearChange && (
              <Box display="flex" gap={1}>
                <FormControl size="small" variant="outlined">
                  <Select
                    value={hijriMonth}
                    onChange={(event) => onHijriMonthYearChange(hijriYear, Number(event.target.value))}
                    MenuProps={{
                      PaperProps: {
                        sx: { maxHeight: 280 },
                      },
                    }}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                      <MenuItem key={month} value={month}>
                        {getHijriMonthName(month)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" variant="outlined">
                  <Select
                    value={hijriYear}
                    onChange={(event) => onHijriMonthYearChange(Number(event.target.value), hijriMonth)}
                    MenuProps={{
                      PaperProps: {
                        sx: { maxHeight: 280 },
                      },
                    }}
                  >
                    {Array.from({ length: 21 }, (_, index) => hijriYear - 10 + index).map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Box display="flex" gap={0.5}>
              <IconButton size="small" onClick={onPrevMonth}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={onNextMonth}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

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
        {mode === 'hijri' ? (
          loading ? (
            <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={{ xs: 0.85, md: 1.1 }} py={2}>
              {Array.from({ length: 42 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={88} />
              ))}
            </Box>
          ) : (
            <>
              <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={1} mb={1.5}>
                {getWeekdayHeaders().map((label, index) => (
                  <Typography
                    key={`${label}-${index}`}
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textAlign: 'center',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {label}
                  </Typography>
                ))}
              </Box>
              <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={{ xs: 0.85, md: 1.1 }}>
                {hijriCalendarDays.map((day) => {
                  const isoDate = toIsoDate(day);
                  const hijriDate = hijriByDate[isoDate];
                  const dayKey = hijriDate ? `${hijriDate.year}-${hijriDate.month}` : '';
                  const isInHijriMonth = hijriDate && dayKey === hijriMonthKey;
                  const isToday = isoDate === todayIso;
                  const isSelected = isoDate === toIsoDate(selectedDate);
                  const { primaryLabel, primaryContext, secondaryLabel, secondaryContext } = getCalendarDayPresentation(
                    mode,
                    day,
                    hijriDate,
                    useArabicIndicDigits,
                  );

                  return (
                    <Box
                      key={isoDate}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectedDateChange(day)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectedDateChange(day);
                        }
                      }}
                      sx={{
                        width: '100%',
                        height: { xs: 88, md: 96 },
                        borderRadius: 2,
                        px: { xs: 1, md: 1.15 },
                        py: { xs: 0.9, md: 1.05 },
                        lineHeight: 1,
                        textAlign: 'left',
                        border: '1px solid',
                        borderColor: isToday ? 'primary.main' : 'transparent',
                        backgroundColor: isSelected ? 'primary.main' : 'transparent',
                        color: isSelected ? 'primary.contrastText' : 'text.primary',
                        opacity: isInHijriMonth ? 1 : 0.38,
                        cursor: 'pointer',
                        outline: 'none',
                        '&:hover': {
                          borderColor: isSelected ? 'primary.main' : 'divider',
                        },
                        '&:focus-visible': {
                          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}33`,
                        },
                        '& .calendar-secondary': {
                          color: isSelected ? 'inherit' : 'text.secondary',
                          opacity: isSelected ? 0.82 : 0.78,
                        },
                      }}
                    >
                      <Box width="100%">
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1 }}>
                            {primaryLabel}
                          </Typography>
                          <Typography
                            variant="caption"
                            className="calendar-secondary ps-2"
                            sx={{ display: 'block', lineHeight: 1 }}
                          >
                            {primaryContext}
                          </Typography>
                        </Box>

                        {secondaryContext && (
                          <Typography
                            variant="caption"
                            className="calendar-secondary"
                            sx={{
                              display: 'block',
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
                    </Box>
                  );
                })}
              </Box>
            </>
          )
        ) : (
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
              <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={{ xs: 0.85, md: 1.1 }} py={2}>
                {Array.from({ length: 42 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={88} />
                ))}
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
        )}
      </Box>
    </Card>
  );
}
