import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  exportRangeToCSV,
  exportRangeToExcel,
  getHijriDateRange,
  getHijriForDate,
  getMonthHijriDates,
  getMonthSchedule,
  getScheduleRange,
} from '../bindings';
import { saveBase64File } from '../bindings';
import PrayerTimesHeader from '../components/pages/prayer-times/PrayerTimesHeader';
import PrayerTimesControls from '../components/pages/prayer-times/PrayerTimesControls';
import PrayerTimesTableView from '../components/pages/prayer-times/PrayerTimesTableView';
import PrayerTimesCalendarView from '../components/pages/prayer-times/PrayerTimesCalendarView';
import ExportPrayerTimesDialog, {
  type CalendarExportTheme,
  type ExportMetadataSummary,
  type ExportQuality,
  type PrayerTableLayout,
  type PrayerTimesExportRequest,
} from '../components/pages/prayer-times/ExportPrayerTimesDialog';
import ExportCalendarPdfPage from '../components/pages/prayer-times/ExportCalendarPdfPage';
import ExportTablePdfPage from '../components/pages/prayer-times/ExportTablePdfPage';
import {
  buildHijriMap,
  formatExportRangeLabel,
  formatMonthHeading,
  getHijriMonthRangeLabel,
} from '../components/pages/prayer-times/helpers';
import { useAppStore } from '../store/appStore';
import {
  CALCULATION_METHODS,
  type DaySchedule,
  type HijriCalendarDay,
  type PrayerCalendarSystem,
  type PrayerTimesViewMode,
} from '../types';
import { Backdrop, Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';

function moveToMonth(current: Dayjs, nextMonth: Dayjs): Dayjs {
  const safeDay = Math.min(current.date(), nextMonth.daysInMonth());
  return nextMonth.date(safeDay);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getMonthsInRange(startDate: Dayjs, endDate: Dayjs): Dayjs[] {
  const months: Dayjs[] = [];
  let current = startDate.startOf('month');
  const last = endDate.startOf('month');

  while (!current.isAfter(last, 'month')) {
    months.push(current);
    current = current.add(1, 'month');
  }

  return months;
}

function getCaptureScale(quality: ExportQuality, qualityScale: number) {
  if (quality === 'high') {
    return 1.75;
  }

  if (quality === 'custom') {
    return Math.min(3, Math.max(1, qualityScale));
  }

  return 1.25;
}

function getJpegQuality(quality: ExportQuality, qualityScale: number) {
  if (quality === 'high') {
    return 0.9;
  }

  if (quality === 'custom') {
    const scale = getCaptureScale(quality, qualityScale);
    return scale >= 2 ? 0.92 : scale >= 1.5 ? 0.86 : 0.8;
  }

  return 0.78;
}

function getImageCompression(quality: ExportQuality, qualityScale: number) {
  if (quality === 'high') {
    return 'SLOW' as const;
  }

  if (quality === 'custom') {
    return getCaptureScale(quality, qualityScale) >= 2 ? ('SLOW' as const) : ('MEDIUM' as const);
  }

  return 'MEDIUM' as const;
}

function formatOffsetValue(value: number) {
  return i18n.t('common.minutesShort', { value: `${value > 0 ? '+' : ''}${value}` });
}

function buildExportMetadata(settings: ReturnType<typeof useAppStore.getState>['settings']): ExportMetadataSummary {
  const methodLabel =
    (CALCULATION_METHODS.find((method) => method.value === settings?.prayer.method)?.labelKey
      ? i18n.t(
          CALCULATION_METHODS.find((method) => method.value === settings?.prayer.method)?.labelKey as string,
        )
      : settings?.prayer.method) ?? i18n.t('common.unknown');

  if (!settings) {
    return {
      methodLabel,
      locationLabel: i18n.t('prayerTimes.unknownLocation'),
      coordinatesLabel: i18n.t('prayerTimes.unknownCoordinates'),
      timezoneLabel: i18n.t('prayerTimes.unknownTimezone'),
      elevationLabel: i18n.t('prayerTimes.unknownElevation'),
      offsetSummary: i18n.t('prayerTimes.noOffsets'),
    };
  }

  const locationParts = [settings.location.city, settings.location.country].filter(Boolean);
  const locationLabel =
    locationParts.length > 0
      ? locationParts.join(', ')
      : `${settings.location.latitude.toFixed(4)}, ${settings.location.longitude.toFixed(4)}`;

  const offsetEntries = Object.entries(settings.prayer.offsets)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key.charAt(0).toUpperCase()}${key.slice(1)} ${formatOffsetValue(value)}`);

  return {
    methodLabel,
    locationLabel,
    coordinatesLabel: `${settings.location.latitude.toFixed(4)}, ${settings.location.longitude.toFixed(4)}`,
    timezoneLabel: settings.location.timezone || i18n.t('prayerTimes.unknownTimezone'),
    elevationLabel: i18n.t('prayerTimes.elevationValue', { value: settings.location.elevation }),
    offsetSummary: offsetEntries.length > 0 ? offsetEntries.join(', ') : i18n.t('prayerTimes.noOffsets'),
  };
}

interface ExportProgressState {
  progress: number;
  title: string;
  detail: string;
}

interface HijriMonthRange {
  start: Dayjs;
  end: Dayjs;
  label: string;
}

async function getHijriMonthRangeForDate(date: Dayjs): Promise<HijriMonthRange | null> {
  const isoDate = date.format('YYYY-MM-DD');
  const hijriDate = await getHijriForDate(isoDate);
  const searchStart = date.subtract(40, 'day');
  const searchEnd = date.add(40, 'day');
  const rangeDays = await getHijriDateRange(
    searchStart.format('YYYY-MM-DD'),
    searchEnd.format('YYYY-MM-DD'),
  );
  const monthDays = rangeDays.filter(
    (day) => day.hijri.year === hijriDate.year && day.hijri.month === hijriDate.month,
  );

  if (monthDays.length === 0) {
    return null;
  }

  const sorted = [...monthDays].sort((a, b) => a.date.localeCompare(b.date));
  const start = dayjs(sorted[0].date);
  const end = dayjs(sorted[sorted.length - 1].date);

  return {
    start,
    end,
    label: getHijriMonthRangeLabel(monthDays),
  };
}

export default function PrayerTimes() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [viewMode, setViewMode] = useState<PrayerTimesViewMode>('table');
  const [calendarSystem, setCalendarSystem] = useState<PrayerCalendarSystem>('gregorian');
  const [useArabicIndicDigits, setUseArabicIndicDigits] = useState(true);
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [hijriDays, setHijriDays] = useState<HijriCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null);
  const [exportStartDate, setExportStartDate] = useState(() => dayjs().startOf('month'));
  const [exportEndDate, setExportEndDate] = useState(() => dayjs().endOf('month'));
  const [exportCalendarTheme, setExportCalendarTheme] =
    useState<CalendarExportTheme>('midnight');
  const [exportTableLayout, setExportTableLayout] =
    useState<PrayerTableLayout>('horizontal');
  const [useTwoColumnPrayerGrid, setUseTwoColumnPrayerGrid] = useState(true);
  const [exportSchedulesData, setExportSchedulesData] = useState<DaySchedule[]>([]);
  const [exportHijriDaysData, setExportHijriDaysData] = useState<HijriCalendarDay[]>([]);
  const [hijriRange, setHijriRange] = useState<HijriMonthRange | null>(null);
  const calendarPdfRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tablePdfRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skipNextPreferenceSave = useRef(false);

  useEffect(() => {
    if (viewMode === 'table' && calendarSystem === 'side-by-side') {
      setCalendarSystem('gregorian');
    }
  }, [calendarSystem, viewMode]);
  const hijriAnchorPending = useRef(false);
  const selectedDateKey = useMemo(() => selectedDate.format('YYYY-MM-DD'), [selectedDate]);

  const activeMonthKey = useMemo(() => selectedDate.format('YYYY-MM'), [selectedDate]);
  const activeMonth = useMemo(() => selectedDate.startOf('month'), [activeMonthKey]);
  const activeMonthLabel = useMemo(() => {
    if (calendarSystem === 'hijri') {
      return hijriRange?.label ?? formatMonthHeading(activeMonth);
    }
    return formatMonthHeading(activeMonth);
  }, [activeMonth, calendarSystem, hijriRange]);
  const exportRangeLabel = useMemo(
    () => formatExportRangeLabel(exportStartDate, exportEndDate),
    [exportEndDate, exportStartDate],
  );
  const exportMonths = useMemo(
    () => getMonthsInRange(exportStartDate, exportEndDate),
    [exportEndDate, exportStartDate],
  );
  const exportHijriByDate = useMemo(
    () => buildHijriMap(exportHijriDaysData),
    [exportHijriDaysData],
  );
  const hijriByDate = useMemo(() => buildHijriMap(hijriDays), [hijriDays]);
  const selectedHijri = useMemo(
    () => hijriByDate[selectedDate.format('YYYY-MM-DD')] ?? null,
    [hijriByDate, selectedDate],
  );
  const exportSchedulesByMonth = useMemo(
    () =>
      exportSchedulesData.reduce<Record<string, DaySchedule[]>>((acc, schedule) => {
        const key = dayjs(schedule.date.slice(0, 10)).format('YYYY-MM');
        acc[key] ??= [];
        acc[key].push(schedule);
        return acc;
      }, {}),
    [exportSchedulesData],
  );
  const exportHijriDaysByMonth = useMemo(
    () =>
      exportHijriDaysData.reduce<Record<string, HijriCalendarDay[]>>((acc, day) => {
        const key = dayjs(day.date).format('YYYY-MM');
        acc[key] ??= [];
        acc[key].push(day);
        return acc;
      }, {}),
    [exportHijriDaysData],
  );
  const exportMetadata = useMemo(() => buildExportMetadata(settings), [settings]);
  const savedPrayerTimesPreferencesKey = useMemo(
    () =>
      settings
        ? JSON.stringify({
            viewMode: settings.prayerTimes.viewMode,
            calendarSystem: settings.prayerTimes.calendarSystem,
            useArabicIndicDigits: settings.prayerTimes.useArabicIndicDigits,
          })
        : '',
    [settings],
  );
  const localPrayerTimesPreferencesKey = useMemo(
    () =>
      JSON.stringify({
        viewMode,
        calendarSystem,
        useArabicIndicDigits,
      }),
    [calendarSystem, useArabicIndicDigits, viewMode],
  );

  useEffect(() => {
    if (!settings) {
      return;
    }

    skipNextPreferenceSave.current = true;
    setViewMode(settings.prayerTimes.viewMode);
    setCalendarSystem(settings.prayerTimes.calendarSystem);
    setUseArabicIndicDigits(settings.prayerTimes.useArabicIndicDigits);
  }, [settings]);

  useEffect(() => {
    if (calendarSystem === 'hijri') {
      hijriAnchorPending.current = true;
    }
  }, [calendarSystem]);

  useEffect(() => {
    if (calendarSystem !== 'hijri' || !hijriRange || !hijriAnchorPending.current) {
      return;
    }

    hijriAnchorPending.current = false;
    setSelectedDate(hijriRange.start);
  }, [calendarSystem, hijriRange]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (skipNextPreferenceSave.current) {
      skipNextPreferenceSave.current = false;
      return;
    }

    if (savedPrayerTimesPreferencesKey === localPrayerTimesPreferencesKey) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        await updateSettings({
          ...settings,
          prayerTimes: {
            ...settings.prayerTimes,
            viewMode,
            calendarSystem,
            useArabicIndicDigits,
          },
        });
      } catch (error) {
        console.error(error);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    calendarSystem,
    localPrayerTimesPreferencesKey,
    savedPrayerTimesPreferencesKey,
    settings,
    updateSettings,
    useArabicIndicDigits,
    viewMode,
  ]);

  useEffect(() => {
    setExportStartDate(activeMonth.startOf('month'));
    setExportEndDate(activeMonth.endOf('month'));
  }, [activeMonth]);

  useEffect(() => {
    if (calendarSystem === 'hijri') {
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      getMonthSchedule(activeMonth.year(), activeMonth.month() + 1),
      getMonthHijriDates(activeMonth.year(), activeMonth.month() + 1),
    ])
      .then(([scheduleRows, hijriRows]) => {
        if (!active) {
          return;
        }

        setHijriRange(null);
        setSchedules(scheduleRows);
        setHijriDays(hijriRows);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeMonth, calendarSystem]);

  useEffect(() => {
    if (calendarSystem !== 'hijri') {
      return;
    }

    let active = true;
    if (
      hijriRange &&
      !selectedDate.isBefore(hijriRange.start, 'day') &&
      !selectedDate.isAfter(hijriRange.end, 'day')
    ) {
      return () => {
        active = false;
      };
    }

    setLoading(true);

    (async () => {
      try {
        const range = await getHijriMonthRangeForDate(selectedDate);
        if (!active) {
          return;
        }

        if (!range) {
          setLoading(false);
          return;
        }

        const startIso = range.start.format('YYYY-MM-DD');
        const endIso = range.end.format('YYYY-MM-DD');
        const [scheduleRows, hijriRows] = await Promise.all([
          getScheduleRange(startIso, endIso),
          getHijriDateRange(startIso, endIso),
        ]);

        if (!active) {
          return;
        }

        setHijriRange(range);
        setSchedules(scheduleRows);
        setHijriDays(hijriRows);
        setLoading(false);
      } catch (error) {
        console.error(error);
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [calendarSystem, hijriRange, selectedDate, selectedDateKey]);

  const setMonth = (month: Dayjs) => {
    setSelectedDate((current) => moveToMonth(current, month.startOf('month')));
  };

  const handlePrevMonth = () => {
    if (calendarSystem === 'hijri' && hijriRange) {
      hijriAnchorPending.current = true;
      setSelectedDate(hijriRange.start.subtract(1, 'day'));
      return;
    }
    setMonth(activeMonth.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    if (calendarSystem === 'hijri' && hijriRange) {
      hijriAnchorPending.current = true;
      setSelectedDate(hijriRange.end.add(1, 'day'));
      return;
    }
    setMonth(activeMonth.add(1, 'month'));
  };

  const handleHijriMonthYearChange = async (year: number, month: number) => {
    if (!selectedHijri) {
      return;
    }

    if (selectedHijri.year === year && selectedHijri.month === month) {
      if (hijriRange) {
        setSelectedDate(hijriRange.start);
      }
      return;
    }

    setLoading(true);
    try {
      const yearDiff = year - selectedHijri.year;
      const seed = selectedDate.add(yearDiff * 354, 'day');
      const rangeStart = seed.subtract(430, 'day');
      const rangeEnd = seed.add(430, 'day');
      const days = await getHijriDateRange(
        rangeStart.format('YYYY-MM-DD'),
        rangeEnd.format('YYYY-MM-DD'),
      );
      const matches = days
        .filter((day) => day.hijri.year === year && day.hijri.month === month)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (matches.length > 0) {
        hijriAnchorPending.current = true;
        setSelectedDate(dayjs(matches[0].date));
        return;
      }

      setSelectedDate(seed);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const captureElement = async (
    element: HTMLDivElement,
    quality: ExportQuality,
    qualityScale: number,
    backgroundColor: string | null = null,
  ) => {
    const html2canvas = (await import('html2canvas')).default;

    return html2canvas(element, {
      backgroundColor,
      scale: getCaptureScale(quality, qualityScale),
      useCORS: true,
    });
  };

  const updateExportProgress = (progress: number, title: string, detail: string) => {
    setExportProgress({
      progress,
      title,
      detail,
    });
  };

  const handleExport = async (request: PrayerTimesExportRequest) => {
    const startDate = dayjs(request.startDate);
    const endDate = dayjs(request.endDate);
    setExportStartDate(startDate);
    setExportEndDate(endDate);
    setExportCalendarTheme(request.calendarTheme);
    setExportTableLayout(request.tableLayout);
    setUseTwoColumnPrayerGrid(request.useTwoColumnPrayerGrid);

    if (request.kind === 'csv' || request.kind === 'excel') {
      setExporting(true);
      updateExportProgress(10, t('export.progress.preparingTitle'), t('export.progress.collectingTable'));
      try {
        updateExportProgress(
          45,
          request.kind === 'csv' ? t('export.progress.generatingCsv') : t('export.progress.generatingExcel'),
          t('export.progress.writingFile', { format: request.kind === 'csv' ? 'CSV' : 'XLSX' }),
        );
        if (request.kind === 'csv') {
          await exportRangeToCSV(request.startDate, request.endDate, request.outputPath);
        } else {
          await exportRangeToExcel(request.startDate, request.endDate, request.outputPath);
        }

        updateExportProgress(100, t('export.progress.exportComplete'), t('export.progress.finalizing'));
        setExportDialogOpen(false);
        alert(t('export.alert.success', { path: request.outputPath }));
      } catch (error) {
        alert(t('export.alert.failed', { error: String(error) }));
      } finally {
        setExporting(false);
        setExportProgress(null);
      }
      return;
    }

    setExporting(true);
    updateExportProgress(8, t('export.progress.preparingTitle'), t('export.progress.loadingRange'));
    try {
      const [rangeSchedules, rangeHijriDays] = await Promise.all([
        getScheduleRange(request.startDate, request.endDate),
        getHijriDateRange(request.startDate, request.endDate),
      ]);

      setExportSchedulesData(rangeSchedules);
      setExportHijriDaysData(rangeHijriDays);

      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const months = getMonthsInRange(startDate, endDate);
      const monthCanvases: HTMLCanvasElement[] = [];
      const calendarProgressStart = 20;
      const calendarProgressEnd = request.includeTable ? 52 : 78;
      for (let index = 0; index < months.length; index += 1) {
        const month = months[index];
        const ref = calendarPdfRefs.current[month.format('YYYY-MM')];
        if (!ref) {
          throw new Error(t('export.errors.calendarPageNotReady', { month: month.format('MMMM YYYY') }));
        }

        const progress =
          calendarProgressStart +
          ((index + 1) / months.length) * (calendarProgressEnd - calendarProgressStart);
        updateExportProgress(
          progress,
          t('export.progress.renderingCalendar'),
          t('export.progress.capturingCalendar', {
            index: index + 1,
            total: months.length,
            month: month.format('MMMM YYYY'),
          }),
        );

        monthCanvases.push(await captureElement(ref, request.quality, request.qualityScale));
      }

      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1123, 794],
        compress: true,
      });

      const addCanvasPage = (
        canvas: HTMLCanvasElement,
        addNewPage: boolean,
        orientation: 'landscape' | 'portrait',
      ) => {
        if (addNewPage) {
          pdf.addPage(
            orientation === 'portrait' ? [794, 1123] : [1123, 794],
            orientation === 'portrait' ? 'portrait' : 'landscape',
          );
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const imageWidth = canvas.width * ratio;
        const imageHeight = canvas.height * ratio;
        const x = (pageWidth - imageWidth) / 2;
        const y = (pageHeight - imageHeight) / 2;

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.addImage(
          canvas.toDataURL('image/jpeg', getJpegQuality(request.quality, request.qualityScale)),
          'JPEG',
          x,
          y,
          imageWidth,
          imageHeight,
          undefined,
          getImageCompression(request.quality, request.qualityScale),
        );
      };

      let isFirstPage = true;
      for (let index = 0; index < months.length; index += 1) {
        addCanvasPage(monthCanvases[index], !isFirstPage, 'landscape');
        isFirstPage = false;

        if (!request.includeTable) {
          continue;
        }

        const monthKey = months[index].format('YYYY-MM');
        const tableRef = tablePdfRefs.current[monthKey];
        if (!tableRef) {
          throw new Error(t('export.errors.tablePageNotReady', { month: months[index].format('MMMM YYYY') }));
        }

        updateExportProgress(
          52 + ((index + 1) / months.length) * 24,
          t('export.progress.renderingTables'),
          t('export.progress.capturingTable', {
            index: index + 1,
            total: months.length,
            month: months[index].format('MMMM YYYY'),
          }),
        );

        const tableCanvas = await captureElement(
          tableRef,
          request.quality,
          request.qualityScale,
          '#ffffff',
        );
        addCanvasPage(
          tableCanvas,
          !isFirstPage,
          request.tableLayout === 'vertical' ? 'portrait' : 'landscape',
        );
        isFirstPage = false;
      }

      updateExportProgress(86, t('export.progress.composingTitle'), t('export.progress.composingDetail'));
      updateExportProgress(94, t('export.progress.savingTitle'), t('export.progress.savingDetail'));
      const pdfBase64 = arrayBufferToBase64(pdf.output('arraybuffer'));

      await saveBase64File(request.outputPath, pdfBase64);
      updateExportProgress(100, t('export.progress.exportComplete'), t('export.progress.pdfComplete'));
      setExportDialogOpen(false);
      alert(t('export.alert.success', { path: request.outputPath }));
    } catch (error) {
      alert(t('export.alert.failed', { error: String(error) }));
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <Box p={4} mx="auto">
      <PrayerTimesHeader onExport={() => setExportDialogOpen(true)} />

      <PrayerTimesControls
        activeMonthLabel={activeMonthLabel}
        viewMode={viewMode}
        calendarSystem={calendarSystem}
        useArabicIndicDigits={useArabicIndicDigits}
        onViewModeChange={setViewMode}
        onCalendarSystemChange={setCalendarSystem}
        onArabicDigitToggle={setUseArabicIndicDigits}
        onToday={() => setSelectedDate(dayjs())}
      />

      {viewMode === 'table' ? (
        <PrayerTimesTableView
          activeMonth={activeMonth}
          activeMonthLabel={activeMonthLabel}
          loading={loading}
          schedules={schedules}
          hijriDays={hijriDays}
          calendarSystem={calendarSystem}
          timeFormat={settings?.timeFormat ?? '24h'}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={() => setSelectedDate(dayjs())}
        />
      ) : (
        <PrayerTimesCalendarView
          activeMonth={activeMonth}
          selectedDate={selectedDate}
          schedules={schedules}
          hijriDays={hijriDays}
          loading={loading}
          calendarSystem={calendarSystem}
          timeFormat={settings?.timeFormat ?? '24h'}
          useArabicIndicDigits={useArabicIndicDigits}
          onSelectedDateChange={setSelectedDate}
          onMonthChange={setMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          hijriMonth={selectedHijri?.month ?? null}
          hijriYear={selectedHijri?.year ?? null}
          onHijriMonthYearChange={handleHijriMonthYearChange}
        />
      )}

      <ExportPrayerTimesDialog
        open={exportDialogOpen}
        exporting={exporting}
        activeMonth={activeMonth}
        metadata={exportMetadata}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
      />

      <Backdrop
        open={exporting}
        sx={(theme) => ({
          zIndex: theme.zIndex.modal + 20,
          backgroundColor: 'rgba(7, 10, 18, 0.58)',
        })}
      >
        <Paper
          elevation={10}
          sx={{
            width: 'min(520px, calc(100vw - 32px))',
            p: 3,
            borderRadius: 3,
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {t('export.backdrop.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {exportProgress?.title ?? t('export.progress.preparingTitle')}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={Math.max(4, exportProgress?.progress ?? 0)}
              sx={{ height: 10, borderRadius: 999 }}
            />

            <Box display="flex" justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                {exportProgress?.detail ?? t('export.backdrop.detail')}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {Math.round(exportProgress?.progress ?? 0)}%
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {t('export.backdrop.locked')}
            </Typography>
          </Stack>
        </Paper>
      </Backdrop>

      <Box
        sx={{
          position: 'fixed',
          left: -20000,
          top: 0,
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        <Box>
          {exportMonths.map((month) => (
            <Box
              key={month.format('YYYY-MM')}
              ref={(node: HTMLDivElement | null) => {
                calendarPdfRefs.current[month.format('YYYY-MM')] = node;
              }}
              sx={{ mb: 4, display: 'inline-block', width: 'fit-content' }}
            >
              <ExportCalendarPdfPage
                activeMonth={month}
                hijriRangeLabel={getHijriMonthRangeLabel(
                  exportHijriDaysByMonth[month.format('YYYY-MM')] ?? [],
                )}
                hijriByDate={exportHijriByDate}
                exportStartDate={exportStartDate}
                exportEndDate={exportEndDate}
                theme={exportCalendarTheme}
                useArabicIndicDigits={useArabicIndicDigits}
                metadata={exportMetadata}
              />
            </Box>
          ))}
        </Box>

        <Box>
          {exportMonths.map((month) => (
            <Box
              key={`table-${month.format('YYYY-MM')}`}
              ref={(node: HTMLDivElement | null) => {
                tablePdfRefs.current[month.format('YYYY-MM')] = node;
              }}
              sx={{ mb: 4, display: 'inline-block', width: 'fit-content' }}
            >
              <ExportTablePdfPage
                activeMonthLabel={formatMonthHeading(month)}
                exportRangeLabel={exportRangeLabel}
                schedules={exportSchedulesByMonth[month.format('YYYY-MM')] ?? []}
                hijriByDate={exportHijriByDate}
                timeFormat={settings?.timeFormat ?? '24h'}
                layout={exportTableLayout}
                useTwoColumnPrayerGrid={useTwoColumnPrayerGrid}
                metadata={exportMetadata}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
