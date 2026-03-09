import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { exportToCSV, exportToExcel, getMonthHijriDates, getMonthSchedule } from '../bindings';
import PrayerTimesHeader from '../components/pages/prayer-times/PrayerTimesHeader';
import PrayerTimesControls from '../components/pages/prayer-times/PrayerTimesControls';
import PrayerTimesTableView from '../components/pages/prayer-times/PrayerTimesTableView';
import PrayerTimesCalendarView from '../components/pages/prayer-times/PrayerTimesCalendarView';
import { formatMonthHeading } from '../components/pages/prayer-times/helpers';
import { useAppStore } from '../store/appStore';
import type { DaySchedule, HijriCalendarDay, PrayerCalendarSystem, PrayerTimesViewMode } from '../types';
import { Box } from '@mui/material';

function moveToMonth(current: Dayjs, nextMonth: Dayjs): Dayjs {
  const safeDay = Math.min(current.date(), nextMonth.daysInMonth());
  return nextMonth.date(safeDay);
}

export default function PrayerTimes() {
  const { settings } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [viewMode, setViewMode] = useState<PrayerTimesViewMode>('table');
  const [calendarSystem, setCalendarSystem] = useState<PrayerCalendarSystem>('gregorian');
  const [useArabicIndicDigits, setUseArabicIndicDigits] = useState(true);
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [hijriDays, setHijriDays] = useState<HijriCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  const activeMonth = useMemo(() => selectedDate.startOf('month'), [selectedDate]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setViewMode(settings.prayerTimes.viewMode);
    setCalendarSystem(settings.prayerTimes.calendarSystem);
  }, [settings]);

  useEffect(() => {
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
  }, [activeMonth]);

  const setMonth = (month: Dayjs) => {
    setSelectedDate((current) => moveToMonth(current, month.startOf('month')));
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const fileName = `prayertimes_${activeMonth.year()}_${String(activeMonth.month() + 1).padStart(2, '0')}`;
      const path = format === 'csv' ? `${fileName}.csv` : `${fileName}.xlsx`;

      if (format === 'csv') {
        await exportToCSV(activeMonth.year(), activeMonth.month() + 1, path);
      } else {
        await exportToExcel(activeMonth.year(), activeMonth.month() + 1, path);
      }

      alert(`Exported successfully to app directory as ${path}`);
    } catch (error) {
      alert(`Export failed: ${error}`);
    }
  };

  return (
    <Box p={4} mx="auto">
      <PrayerTimesHeader onExport={handleExport} />

      <PrayerTimesControls
        activeMonthLabel={formatMonthHeading(activeMonth)}
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
          loading={loading}
          schedules={schedules}
          hijriDays={hijriDays}
          timeFormat={settings?.timeFormat ?? '24h'}
          onPrevMonth={() => setMonth(activeMonth.subtract(1, 'month'))}
          onNextMonth={() => setMonth(activeMonth.add(1, 'month'))}
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
        />
      )}
    </Box>
  );
}
