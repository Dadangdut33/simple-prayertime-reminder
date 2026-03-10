import { useEffect, useMemo, useState } from 'react';
import { Dialogs } from '@wailsio/runtime';
import type { Dayjs } from 'dayjs';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import NumberField from '../../ui/NumberField';
import { formatExportRangeLabel } from './helpers';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

type ExportKind = 'csv' | 'excel' | 'calendar-pdf';
export type CalendarExportTheme = 'midnight' | 'light' | 'parchment';
export type PrayerTableLayout = 'horizontal' | 'vertical';
export type ExportQuality = 'standard' | 'high' | 'custom';

const MIN_CUSTOM_QUALITY_SCALE = 1;
const MAX_CUSTOM_QUALITY_SCALE = 3;

function clampQualityScale(value: number) {
  return Math.min(MAX_CUSTOM_QUALITY_SCALE, Math.max(MIN_CUSTOM_QUALITY_SCALE, value));
}

export interface PrayerTimesExportRequest {
  kind: ExportKind;
  includeTable: boolean;
  calendarTheme: CalendarExportTheme;
  tableLayout: PrayerTableLayout;
  useTwoColumnPrayerGrid: boolean;
  quality: ExportQuality;
  qualityScale: number;
  startDate: string;
  endDate: string;
  outputPath: string;
}

export interface ExportMetadataSummary {
  methodLabel: string;
  locationLabel: string;
  coordinatesLabel: string;
  timezoneLabel: string;
  elevationLabel: string;
  offsetSummary: string;
}

interface ExportPrayerTimesDialogProps {
  open: boolean;
  exporting: boolean;
  activeMonth: Dayjs;
  metadata: ExportMetadataSummary;
  onClose: () => void;
  onExport: (request: PrayerTimesExportRequest) => Promise<void>;
}

function getDefaultFileName(kind: ExportKind, startDate: Dayjs, endDate: Dayjs) {
  const rangeSuffix = startDate.isSame(endDate, 'day')
    ? startDate.format('YYYY_MM_DD')
    : `${startDate.format('YYYY_MM_DD')}_to_${endDate.format('YYYY_MM_DD')}`;

  if (kind === 'calendar-pdf') {
    return `prayertimes_calendar_${rangeSuffix}.pdf`;
  }

  if (kind === 'excel') {
    return `prayertimes_${rangeSuffix}.xlsx`;
  }

  return `prayertimes_${rangeSuffix}.csv`;
}

function getFilters(kind: ExportKind): Dialogs.FileFilter[] {
  if (kind === 'calendar-pdf') {
    return [{ DisplayName: i18n.t('export.file.pdf'), Pattern: '*.pdf' }];
  }

  if (kind === 'excel') {
    return [{ DisplayName: i18n.t('export.file.excel'), Pattern: '*.xlsx' }];
  }

  return [{ DisplayName: i18n.t('export.file.csv'), Pattern: '*.csv' }];
}

export default function ExportPrayerTimesDialog({
  open,
  exporting,
  activeMonth,
  metadata,
  onClose,
  onExport,
}: ExportPrayerTimesDialogProps) {
  const { t } = useTranslation();
  const monthStart = useMemo(() => activeMonth.startOf('month'), [activeMonth]);
  const monthEnd = useMemo(() => activeMonth.endOf('month'), [activeMonth]);
  const [kind, setKind] = useState<ExportKind>('csv');
  const [includeTable, setIncludeTable] = useState(true);
  const [calendarTheme, setCalendarTheme] = useState<CalendarExportTheme>('midnight');
  const [tableLayout, setTableLayout] = useState<PrayerTableLayout>('horizontal');
  const [useTwoColumnPrayerGrid, setUseTwoColumnPrayerGrid] = useState(true);
  const [quality, setQuality] = useState<ExportQuality>('standard');
  const [qualityScale, setQualityScale] = useState(1.25);
  const [startDate, setStartDate] = useState<Dayjs>(monthStart);
  const [endDate, setEndDate] = useState<Dayjs>(monthEnd);
  const [outputPath, setOutputPath] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setKind('csv');
    setIncludeTable(true);
    setCalendarTheme('midnight');
    setTableLayout('horizontal');
    setUseTwoColumnPrayerGrid(true);
    setQuality('standard');
    setQualityScale(1.25);
    setStartDate(monthStart);
    setEndDate(monthEnd);
    setOutputPath('');
  }, [monthEnd, monthStart, open]);

  const rangeLabel = formatExportRangeLabel(startDate, endDate);

  const chooseOutputPath = async () => {
    const path = await Dialogs.SaveFile({
      Title: t('export.title'),
      Message: t('export.chooseLocation'),
      ButtonText: t('common.save'),
      CanCreateDirectories: true,
      ShowHiddenFiles: true,
      Filename: getDefaultFileName(kind, startDate, endDate),
      Filters: getFilters(kind),
    });

    if (path) {
      setOutputPath(path);
    }

    return path;
  };

  const handleStartDateChange = (value: Dayjs | null) => {
    if (!value) {
      return;
    }

    const nextStart = value.startOf('day');
    setStartDate(nextStart);
    if (nextStart.isAfter(endDate, 'day')) {
      setEndDate(nextStart);
    }
  };

  const handleEndDateChange = (value: Dayjs | null) => {
    if (!value) {
      return;
    }

    const nextEnd = value.startOf('day');
    setEndDate(nextEnd);
    if (nextEnd.isBefore(startDate, 'day')) {
      setStartDate(nextEnd);
    }
  };

  const handleExport = async () => {
    const path = outputPath || (await chooseOutputPath());
    if (!path) {
      return;
    }

    await onExport({
      kind,
      includeTable,
      calendarTheme,
      tableLayout,
      useTwoColumnPrayerGrid,
      quality,
      qualityScale: clampQualityScale(qualityScale),
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      outputPath: path,
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={exporting ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>{t('export.title')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {t('export.description')}
            </Typography>

            <RadioGroup value={kind} onChange={(event) => setKind(event.target.value as ExportKind)}>
              <FormControlLabel value="csv" control={<Radio />} label={t('export.formatCsv')} />
              <FormControlLabel value="excel" control={<Radio />} label={t('export.formatExcel')} />
              <FormControlLabel value="calendar-pdf" control={<Radio />} label={t('export.formatCalendarPdf')} />
            </RadioGroup>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('export.range')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <DatePicker
                  label={t('export.startDate')}
                  value={startDate}
                  onChange={handleStartDateChange}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <DatePicker
                  label={t('export.endDate')}
                  value={endDate}
                  onChange={handleEndDateChange}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('export.currentRange', { range: rangeLabel })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('export.summaryTitle')}
              </Typography>
              <Grid container sx={{ mt: 1 }}>
                <Grid size={6}>
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {t('export.summaryCalculation')}
                    </Box>{' '}
                    {metadata.methodLabel}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {t('export.summaryLocation')}
                    </Box>{' '}
                    {metadata.locationLabel}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {t('export.summaryCoordinates')}
                    </Box>{' '}
                    {metadata.coordinatesLabel}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {t('export.summaryTimezone')}
                    </Box>{' '}
                    {metadata.timezoneLabel}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {t('export.summaryElevation')}
                    </Box>{' '}
                    {metadata.elevationLabel}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {t('export.summaryOffsets')}
                    </Box>{' '}
                    {metadata.offsetSummary}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {kind === 'calendar-pdf' && (
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="calendar-theme-label">{t('export.calendarTheme')}</InputLabel>
                    <Select
                      labelId="calendar-theme-label"
                      value={calendarTheme}
                      label={t('export.calendarTheme')}
                      onChange={(event) => setCalendarTheme(event.target.value as CalendarExportTheme)}
                    >
                      <MenuItem value="midnight">{t('export.themeMidnight')}</MenuItem>
                      <MenuItem value="light">{t('export.themeLight')}</MenuItem>
                      <MenuItem value="parchment">{t('export.themeParchment')}</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <InputLabel id="export-quality-label">{t('export.quality')}</InputLabel>
                    <Select
                      labelId="export-quality-label"
                      value={quality}
                      label={t('export.quality')}
                      onChange={(event) => setQuality(event.target.value as ExportQuality)}
                    >
                      <MenuItem value="standard">{t('export.qualityStandard')}</MenuItem>
                      <MenuItem value="high">{t('export.qualityHigh')}</MenuItem>
                      <MenuItem value="custom">{t('export.qualityCustom')}</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {quality === 'custom' && (
                  <NumberField
                    label={t('export.customScale')}
                    size="small"
                    value={qualityScale}
                    min={MIN_CUSTOM_QUALITY_SCALE}
                    max={MAX_CUSTOM_QUALITY_SCALE}
                    step={0.05}
                    onValueChange={(value) => {
                      if (value == null) {
                        return;
                      }

                      setQualityScale(clampQualityScale(value));
                    }}
                    helperText={t('export.customScaleHint')}
                  />
                )}
              </Stack>
            )}

            {kind === 'calendar-pdf' && (
              <Box p={2} border="1px solid" borderColor="divider" borderRadius={0.5} bgcolor="action.hover">
                <FormControlLabel
                  control={
                    <Checkbox checked={includeTable} onChange={(event) => setIncludeTable(event.target.checked)} />
                  }
                  label={t('export.includeTable')}
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('export.includeTableHint')}
                </Typography>

                {includeTable && (
                  <Box mt={2.25}>
                    <Divider sx={{ mb: 2 }} />
                    <Stack>
                      <Typography variant="subtitle2">{t('export.tableLayout')}</Typography>
                      <RadioGroup
                        row
                        value={tableLayout}
                        onChange={(event) => setTableLayout(event.target.value as PrayerTableLayout)}
                      >
                        <FormControlLabel value="horizontal" control={<Radio />} label={t('export.layoutHorizontal')} />
                        <FormControlLabel value="vertical" control={<Radio />} label={t('export.layoutVertical')} />
                      </RadioGroup>

                      {tableLayout === 'horizontal' && (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={useTwoColumnPrayerGrid}
                              onChange={(event) => setUseTwoColumnPrayerGrid(event.target.checked)}
                            />
                          }
                          label={t('export.twoColumnGrid')}
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('export.destination')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  value={outputPath}
                  placeholder={t('export.chooseLocation')}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <Button variant="outlined" onClick={() => void chooseOutputPath()}>
                  {t('export.chooseLocation')}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={exporting} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleExport()} disabled={exporting} variant="contained">
            {exporting ? t('export.exporting') : t('export.exportNow')}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
