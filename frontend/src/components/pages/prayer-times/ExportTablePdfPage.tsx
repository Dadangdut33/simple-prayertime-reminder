import { Box, Grid, Typography } from '@mui/material';
import type { DaySchedule, HijriDate } from '../../../types';
import { formatTime, formatTimeInZone } from '../../../utils/helpers';
import type { ExportMetadataSummary, PrayerTableLayout } from './ExportPrayerTimesDialog';
import { formatHijriDateShort } from './helpers';
import i18n from '../../../i18n';

interface ExportTablePdfPageProps {
  activeMonthLabel: string;
  exportRangeLabel: string;
  schedules: DaySchedule[];
  hijriByDate: Record<string, HijriDate>;
  timeFormat: '12h' | '24h';
  timeZone?: string;
  layout: PrayerTableLayout;
  useTwoColumnPrayerGrid: boolean;
  metadata: ExportMetadataSummary;
}

type PrayerKey = keyof Pick<DaySchedule, 'fajr' | 'sunrise' | 'zuhr' | 'asr' | 'maghrib' | 'isha'>;

function PrayerTable({
  schedules,
  hijriByDate,
  timeFormat,
  timeZone,
  prayerKeys,
  labels,
  compact = false,
  stackedDateColumn = false,
}: {
  schedules: DaySchedule[];
  hijriByDate: Record<string, HijriDate>;
  timeFormat: '12h' | '24h';
  timeZone?: string;
  prayerKeys: PrayerKey[];
  labels: string[];
  compact?: boolean;
  stackedDateColumn?: boolean;
}) {
  return (
    <Box
      component="table"
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: compact ? '0.68rem' : stackedDateColumn ? '0.8rem' : '0.82rem',
        tableLayout: stackedDateColumn ? 'auto' : 'fixed',
        '& th, & td': {
          border: '1px solid #d7dfef',
          px: compact ? 0.7 : stackedDateColumn ? 0.9 : 1.2,
          py: compact ? 0.7 : stackedDateColumn ? 0.85 : 1,
          textAlign: 'center',
          verticalAlign: 'middle',
          overflow: stackedDateColumn ? 'visible' : 'hidden',
          textOverflow: stackedDateColumn ? 'clip' : 'ellipsis',
          whiteSpace: stackedDateColumn ? 'normal' : 'nowrap',
        },
        '& th': {
          backgroundColor: '#e8eefc',
          fontWeight: 700,
          fontSize: stackedDateColumn ? '0.74rem' : undefined,
        },
        '& tbody tr:nth-of-type(even)': {
          backgroundColor: '#f8fbff',
        },
      }}
    >
      <thead>
        <tr>
          {stackedDateColumn ? (
            <th style={{ width: '34%' }}>{i18n.t('prayerTimes.table.date')}</th>
          ) : (
            <>
              <th style={{ width: compact ? '20%' : '22%' }}>{i18n.t('export.table.gregorianDate')}</th>
              <th style={{ width: compact ? '28%' : '26%' }}>{i18n.t('export.table.hijriDate')}</th>
            </>
          )}
          {labels.map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {schedules.map((schedule) => {
          const hijriDate = hijriByDate[schedule.date.slice(0, 10)];

          return (
            <tr key={`${schedule.date}-${labels.join('-')}`}>
              {stackedDateColumn ? (
                <td style={{ textAlign: 'left' }}>
                  <Box sx={{ fontWeight: 600 }}>{schedule.date.slice(0, 10)}</Box>
                  <Box sx={{ fontSize: '0.74rem', color: '#475569', mt: 0.25 }}>{formatHijriDateShort(hijriDate)}</Box>
                </td>
              ) : (
                <>
                  <td>{schedule.date.slice(0, 10)}</td>
                  <td>{formatHijriDateShort(hijriDate)}</td>
                </>
              )}
              {prayerKeys.map((key) => (
                <td key={`${schedule.date}-${String(key)}`}>
                  {timeZone
                    ? formatTimeInZone(schedule[key], timeZone, timeFormat)
                    : formatTime(schedule[key], timeFormat)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </Box>
  );
}

export default function ExportTablePdfPage({
  activeMonthLabel,
  exportRangeLabel,
  schedules,
  hijriByDate,
  timeFormat,
  timeZone,
  layout,
  useTwoColumnPrayerGrid,
  metadata,
}: ExportTablePdfPageProps) {
  const isPortrait = layout === 'vertical';
  const splitIntoTwoTables = useTwoColumnPrayerGrid && !isPortrait;
  const midpoint = Math.ceil(schedules.length / 2);
  const leftSchedules = schedules.slice(0, midpoint);
  const rightSchedules = schedules.slice(midpoint);

  return (
    <Box
      sx={{
        width: isPortrait ? 794 : 1120,
        minHeight: isPortrait ? 1123 : 760,
        p: isPortrait ? 3 : 4,
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      <Typography variant="h4" fontWeight={700} mb={0.75}>
        {activeMonthLabel}
      </Typography>
      <Grid container sx={{ mb: 2.25 }}>
        <Grid size={4}>
          <Typography variant="body2" color="text.secondary">
            {i18n.t('export.summaryCalculation')} {metadata.methodLabel}
          </Typography>
        </Grid>
        <Grid size={8}>
          <Typography variant="body2" color="text.secondary">
            {i18n.t('export.summaryLocation')} {metadata.locationLabel}
          </Typography>
        </Grid>
        <Grid size={4}>
          <Typography variant="body2" color="text.secondary">
            {i18n.t('export.summaryCoordinates')} {metadata.coordinatesLabel}
          </Typography>
        </Grid>
        <Grid size={8}>
          <Typography variant="body2" color="text.secondary">
            {i18n.t('export.summaryTimezone')} {metadata.timezoneLabel}
          </Typography>
        </Grid>
        <Grid size={4}>
          <Typography variant="body2" color="text.secondary">
            {i18n.t('export.summaryElevation')} {metadata.elevationLabel}
          </Typography>
        </Grid>
        <Grid size={8}>
          <Typography variant="body2" color="text.secondary">
            {i18n.t('export.summaryOffsets')} {metadata.offsetSummary}
          </Typography>
        </Grid>
      </Grid>

      {splitIntoTwoTables ? (
        <Box display="grid" gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap={2} alignItems="start">
          <PrayerTable
            schedules={leftSchedules}
            hijriByDate={hijriByDate}
            timeFormat={timeFormat}
            timeZone={timeZone}
            prayerKeys={['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha']}
            labels={[
              i18n.t('prayerNames.fajr'),
              i18n.t('prayerNames.sunrise'),
              i18n.t('prayerNames.zuhr'),
              i18n.t('prayerNames.asr'),
              i18n.t('prayerNames.maghrib'),
              i18n.t('prayerNames.isha'),
            ]}
            stackedDateColumn
          />
          <PrayerTable
            schedules={rightSchedules}
            hijriByDate={hijriByDate}
            timeFormat={timeFormat}
            timeZone={timeZone}
            prayerKeys={['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha']}
            labels={[
              i18n.t('prayerNames.fajr'),
              i18n.t('prayerNames.sunrise'),
              i18n.t('prayerNames.zuhr'),
              i18n.t('prayerNames.asr'),
              i18n.t('prayerNames.maghrib'),
              i18n.t('prayerNames.isha'),
            ]}
            stackedDateColumn
          />
        </Box>
      ) : (
        <PrayerTable
          schedules={schedules}
          hijriByDate={hijriByDate}
          timeFormat={timeFormat}
          timeZone={timeZone}
          prayerKeys={['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha']}
          labels={[
            i18n.t('prayerNames.fajr'),
            i18n.t('prayerNames.sunrise'),
            i18n.t('prayerNames.zuhr'),
            i18n.t('prayerNames.asr'),
            i18n.t('prayerNames.maghrib'),
            i18n.t('prayerNames.isha'),
          ]}
          compact={isPortrait}
        />
      )}
    </Box>
  );
}
