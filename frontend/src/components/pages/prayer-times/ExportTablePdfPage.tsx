import { Box, Grid, Typography } from '@mui/material';
import type { DaySchedule, HijriDate } from '../../../types';
import { formatTime } from '../../../utils/helpers';
import type { ExportMetadataSummary, PrayerTableLayout } from './ExportPrayerTimesDialog';
import { formatHijriDateShort } from './helpers';

interface ExportTablePdfPageProps {
  activeMonthLabel: string;
  exportRangeLabel: string;
  schedules: DaySchedule[];
  hijriByDate: Record<string, HijriDate>;
  timeFormat: '12h' | '24h';
  layout: PrayerTableLayout;
  useTwoColumnPrayerGrid: boolean;
  metadata: ExportMetadataSummary;
}

type PrayerKey = keyof Pick<DaySchedule, 'fajr' | 'sunrise' | 'zuhr' | 'asr' | 'maghrib' | 'isha'>;

function PrayerTable({
  schedules,
  hijriByDate,
  timeFormat,
  prayerKeys,
  labels,
  compact = false,
  stackedDateColumn = false,
}: {
  schedules: DaySchedule[];
  hijriByDate: Record<string, HijriDate>;
  timeFormat: '12h' | '24h';
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
            <th style={{ width: '34%' }}>Date</th>
          ) : (
            <>
              <th style={{ width: compact ? '20%' : '22%' }}>Gregorian Date</th>
              <th style={{ width: compact ? '28%' : '26%' }}>Hijri Date</th>
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
                <td key={`${schedule.date}-${String(key)}`}>{formatTime(schedule[key], timeFormat)}</td>
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
            Method: {metadata.methodLabel}
          </Typography>
        </Grid>
        <Grid size={8}>
          <Typography variant="body2" color="text.secondary">
            Location: {metadata.locationLabel}
          </Typography>
        </Grid>
        <Grid size={4}>
          <Typography variant="body2" color="text.secondary">
            Coordinates: {metadata.coordinatesLabel}
          </Typography>
        </Grid>
        <Grid size={8}>
          <Typography variant="body2" color="text.secondary">
            Timezone: {metadata.timezoneLabel}
          </Typography>
        </Grid>
        <Grid size={4}>
          <Typography variant="body2" color="text.secondary">
            Elevation: {metadata.elevationLabel}
          </Typography>
        </Grid>
        <Grid size={8}>
          <Typography variant="body2" color="text.secondary">
            Offsets: {metadata.offsetSummary}
          </Typography>
        </Grid>
      </Grid>

      {splitIntoTwoTables ? (
        <Box display="grid" gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap={2} alignItems="start">
          <PrayerTable
            schedules={leftSchedules}
            hijriByDate={hijriByDate}
            timeFormat={timeFormat}
            prayerKeys={['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha']}
            labels={['Fajr', 'Sunrise', 'Zuhr', 'Asr', 'Maghrib', 'Isha']}
            stackedDateColumn
          />
          <PrayerTable
            schedules={rightSchedules}
            hijriByDate={hijriByDate}
            timeFormat={timeFormat}
            prayerKeys={['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha']}
            labels={['Fajr', 'Sunrise', 'Zuhr', 'Asr', 'Maghrib', 'Isha']}
            stackedDateColumn
          />
        </Box>
      ) : (
        <PrayerTable
          schedules={schedules}
          hijriByDate={hijriByDate}
          timeFormat={timeFormat}
          prayerKeys={['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha']}
          labels={['Fajr', 'Sunrise', 'Zuhr', 'Asr', 'Maghrib', 'Isha']}
          compact={isPortrait}
        />
      )}
    </Box>
  );
}
