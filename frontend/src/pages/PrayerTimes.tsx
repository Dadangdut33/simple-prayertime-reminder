import { useEffect, useState } from 'react';
import { getMonthSchedule, exportToCSV, exportToExcel } from '../bindings';
import type { DaySchedule } from '../types';
import { formatTime, toISODate } from '../utils/helpers';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function PrayerTimes() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMonthSchedule(currentYear, currentMonth)
      .then((res) => {
        if (active) {
          setSchedules(res);
          setLoading(false);
        }
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [currentYear, currentMonth]);

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const fileName = `prayertimes_${currentYear}_${currentMonth.toString().padStart(2, '0')}`;
      const path = format === 'csv' ? `${fileName}.csv` : `${fileName}.xlsx`;

      if (format === 'csv') {
        await exportToCSV(currentYear, currentMonth, path);
      } else {
        await exportToExcel(currentYear, currentMonth, path);
      }
      alert(`Exported successfully to app directory as ${path}`);
    } catch (err) {
      alert(`Export failed: ${err}`);
    }
  };

  const todayIso = toISODate(new Date());

  return (
    <Box p={4} mx="auto">
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={2}
        mb={4}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0.5,
                display: 'grid',
                placeItems: 'center',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}22, ${theme.palette.secondary.main}26)`,
                color: 'primary.main',
              }}
            >
              <CalendarMonthIcon fontSize="small" />
            </Box>
            <Typography variant="h2">Monthly Schedule</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            View and export prayer times for the month
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => handleExport('csv')}>
            CSV
          </Button>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => handleExport('excel')}>
            Excel
          </Button>
        </Box>
      </Box>

      <Card sx={{ p: 3, borderRadius: 0.5 }}>
        {/* Month Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h3">
              {MONTHS[currentMonth - 1]} {currentYear}
            </Typography>
          </Box>
          <Box display="flex" gap={1} alignItems="center">
            <IconButton onClick={prevMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Button
              variant="text"
              color="inherit"
              size="small"
              onClick={() => {
                setCurrentYear(new Date().getFullYear());
                setCurrentMonth(new Date().getMonth() + 1);
              }}
            >
              Today
            </Button>
            <IconButton onClick={nextMonth} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Calendar Grid */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>
                  <Typography variant="overline" fontWeight={600}>
                    Date
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="overline" fontWeight={600}>
                    Fajr
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="overline" fontWeight={600}>
                    Sunrise
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="overline" fontWeight={600}>
                    Zuhr
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="overline" fontWeight={600}>
                    Asr
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="overline" fontWeight={600}>
                    Maghrib
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="overline" fontWeight={600}>
                    Isha
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((s) => {
                  const isToday = s.date.startsWith(todayIso);
                  return (
                    <TableRow
                      key={s.date}
                      sx={{
                        ...(isToday && {
                          bgcolor: (theme) => `rgba(79, 100, 240, 0.08)`,
                        }),
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={isToday ? 700 : 500}
                          color={isToday ? 'primary.main' : 'text.primary'}
                        >
                          {formatDateShort(s.date)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(s.fajr)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(s.sunrise)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(s.zuhr)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(s.asr)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(s.maghrib)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(s.isha)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.split('T')[0] : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}
