import { Box, Grid, Typography } from '@mui/material';
import type { Dayjs } from 'dayjs';
import type { HijriDate } from '../../../types';
import type { CalendarExportTheme, ExportMetadataSummary } from './ExportPrayerTimesDialog';
import { getCalendarDayPresentation, getMonthCalendarDays, getWeekdayHeaders, toIsoDate } from './helpers';
import i18n from '../../../i18n';

interface ExportCalendarPdfPageProps {
  activeMonth: Dayjs;
  hijriRangeLabel: string;
  hijriByDate: Record<string, HijriDate>;
  exportStartDate: Dayjs;
  exportEndDate: Dayjs;
  theme: CalendarExportTheme;
  useArabicIndicDigits: boolean;
  metadata: ExportMetadataSummary;
}

export default function ExportCalendarPdfPage({
  activeMonth,
  hijriRangeLabel,
  hijriByDate,
  exportStartDate,
  exportEndDate,
  theme,
  useArabicIndicDigits,
  metadata,
}: ExportCalendarPdfPageProps) {
  const days = getMonthCalendarDays(activeMonth);
  const palette = {
    midnight: {
      pageText: '#f6f8ff',
      pageBackground:
        'radial-gradient(circle at top, rgba(98, 120, 243, 0.16), transparent 28%), linear-gradient(180deg, #060a16, #090d19)',
      cardBackground: 'rgba(10, 15, 30, 0.72)',
      cardBorder: 'rgba(255,255,255,0.09)',
      subText: 'rgba(226, 232, 255, 0.78)',
      mutedText: 'rgba(226, 232, 255, 0.62)',
      weekdayText: 'rgba(214, 222, 255, 0.74)',
      cellFill: 'rgba(255,255,255,0.035)',
      outsideCellFill: 'rgba(255,255,255,0.02)',
      cellBorder: 'rgba(255,255,255,0.05)',
      accentBorder: 'rgba(121, 142, 255, 0.95)',
    },
    light: {
      pageText: '#11213f',
      pageBackground: 'linear-gradient(180deg, #f5f8ff, #e9effb)',
      cardBackground: 'rgba(255,255,255,0.9)',
      cardBorder: 'rgba(76, 96, 150, 0.16)',
      subText: 'rgba(17, 33, 63, 0.82)',
      mutedText: 'rgba(57, 72, 103, 0.76)',
      weekdayText: 'rgba(57, 72, 103, 0.74)',
      cellFill: 'rgba(89, 111, 168, 0.06)',
      outsideCellFill: 'rgba(89, 111, 168, 0.03)',
      cellBorder: 'rgba(76, 96, 150, 0.12)',
      accentBorder: 'rgba(76, 106, 214, 0.78)',
    },
    parchment: {
      pageText: '#3d2d1d',
      pageBackground: 'linear-gradient(180deg, #f4ebd8, #ead9bb)',
      cardBackground: 'rgba(255, 249, 238, 0.92)',
      cardBorder: 'rgba(111, 79, 46, 0.18)',
      subText: 'rgba(61, 45, 29, 0.84)',
      mutedText: 'rgba(94, 72, 47, 0.76)',
      weekdayText: 'rgba(94, 72, 47, 0.76)',
      cellFill: 'rgba(111, 79, 46, 0.05)',
      outsideCellFill: 'rgba(111, 79, 46, 0.025)',
      cellBorder: 'rgba(111, 79, 46, 0.12)',
      accentBorder: 'rgba(158, 102, 41, 0.72)',
    },
  }[theme];

  return (
    <Box
      sx={{
        width: 1120,
        px: 4,
        py: 3.5,
        color: palette.pageText,
        background: palette.pageBackground,
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      <Box
        sx={{
          p: 3,
          borderRadius: 1.5,
          border: `1px solid ${palette.cardBorder}`,
          background: palette.cardBackground,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          {activeMonth.format('MMMM YYYY')}
        </Typography>
        <Typography variant="body1" sx={{ color: palette.subText, mb: 0.5 }}>
          {hijriRangeLabel}
        </Typography>
        <Grid container sx={{ mb: 2.25 }}>
          <Grid size={4}>
            <Typography variant="body2" sx={{ color: palette.subText }}>
              {i18n.t('export.summaryCalculation')} {metadata.methodLabel}
            </Typography>
          </Grid>
          <Grid size={8}>
            <Typography variant="body2" sx={{ color: palette.subText }}>
              {i18n.t('export.summaryLocation')} {metadata.locationLabel}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" sx={{ color: palette.mutedText }}>
              {i18n.t('export.summaryCoordinates')} {metadata.coordinatesLabel}
            </Typography>
          </Grid>
          <Grid size={8}>
            <Typography variant="body2" sx={{ color: palette.mutedText }}>
              {i18n.t('export.summaryTimezone')} {metadata.timezoneLabel}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="body2" sx={{ color: palette.mutedText }}>
              {i18n.t('export.summaryElevation')} {metadata.elevationLabel}
            </Typography>
          </Grid>
          <Grid size={8}>
            <Typography variant="body2" sx={{ color: palette.mutedText }}>
              {i18n.t('export.summaryOffsets')} {metadata.offsetSummary}
            </Typography>
          </Grid>
        </Grid>

        <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={1.25}>
          {getWeekdayHeaders().map((label) => (
            <Box
              key={label}
              sx={{
                textAlign: 'center',
                py: 1,
                color: palette.weekdayText,
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              {label}
            </Box>
          ))}

          {days.map((day) => {
            const isoDate = toIsoDate(day);
            const hijriDate = hijriByDate[isoDate];
            const isOutsideMonth = !day.isSame(activeMonth, 'month');
            const isToday = day.isSame(new Date(), 'day');
            const isInExportRange = !day.isBefore(exportStartDate, 'day') && !day.isAfter(exportEndDate, 'day');
            const { primaryLabel, primaryContext, secondaryLabel, secondaryContext } = getCalendarDayPresentation(
              'gregorian',
              day,
              hijriDate,
              useArabicIndicDigits,
            );

            return (
              <Box
                key={isoDate}
                sx={{
                  minHeight: 90,
                  p: 1.15,
                  borderRadius: 1.4,
                  border: isToday ? `1px solid ${palette.accentBorder}` : `1px solid ${palette.cellBorder}`,
                  background: isOutsideMonth ? palette.outsideCellFill : palette.cellFill,
                  opacity: isOutsideMonth ? (isInExportRange ? 0.72 : 0.32) : isInExportRange ? 1 : 0.52,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  overflow: 'visible',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.55}>
                  <Typography fontWeight={700} fontSize="1.02rem" sx={{ lineHeight: 1.15, pb: 0.15 }}>
                    {primaryLabel}
                  </Typography>
                  <Typography
                    fontSize="0.76rem"
                    sx={{
                      color: palette.weekdayText,
                      lineHeight: 1.2,
                      pb: 0.1,
                    }}
                  >
                    {primaryContext}
                  </Typography>
                </Box>

                {secondaryContext ? (
                  <Typography
                    fontSize="0.76rem"
                    sx={{
                      color: palette.weekdayText,
                      lineHeight: 1.28,
                      minHeight: '1.4em',
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      textOverflow: 'ellipsis',
                      pb: 0.15,
                    }}
                  >
                    {secondaryLabel} {secondaryContext}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
