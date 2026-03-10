import { Box, Button, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { PrayerCalendarSystem, PrayerTimesViewMode } from '../../../types';
import { useTranslation } from 'react-i18next';

interface PrayerTimesControlsProps {
  activeMonthLabel: string;
  viewMode: PrayerTimesViewMode;
  calendarSystem: PrayerCalendarSystem;
  useArabicIndicDigits: boolean;
  onViewModeChange: (mode: PrayerTimesViewMode) => void;
  onCalendarSystemChange: (mode: PrayerCalendarSystem) => void;
  onArabicDigitToggle: (checked: boolean) => void;
  onToday: () => void;
}

export default function PrayerTimesControls({
  activeMonthLabel,
  viewMode,
  calendarSystem,
  useArabicIndicDigits,
  onViewModeChange,
  onCalendarSystemChange,
  onArabicDigitToggle,
  onToday,
}: PrayerTimesControlsProps) {
  const { t } = useTranslation();
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', lg: 'center' }}
      flexDirection={{ xs: 'column', lg: 'row' }}
      gap={2}
      mb={3}
    >
      <Box
        display="flex"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={1.25}
        flexWrap="wrap"
        width={'100%'}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_, value: PrayerTimesViewMode | null) => {
            if (value) {
              onViewModeChange(value);
            }
          }}
        >
          <ToggleButton value="table">{t('prayerTimes.viewTable')}</ToggleButton>
          <ToggleButton value="calendar">{t('prayerTimes.viewCalendar')}</ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'calendar' && (
          <>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={calendarSystem}
              onChange={(_, value: PrayerCalendarSystem | null) => {
                if (value) {
                  onCalendarSystemChange(value);
                }
              }}
            >
              <ToggleButton value="gregorian">{t('prayerTimes.calendarGregorian')}</ToggleButton>
              <ToggleButton value="hijri">{t('prayerTimes.calendarHijri')}</ToggleButton>
              <ToggleButton value="side-by-side">{t('prayerTimes.calendarSideBySide')}</ToggleButton>
            </ToggleButtonGroup>
          </>
        )}

        <Button variant="text" size="small" color="inherit" onClick={onToday}>
          {t('prayerTimes.today')}
        </Button>

        <Box className="ms-auto">
          {viewMode === 'calendar' && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={useArabicIndicDigits}
                  onChange={(event) => onArabicDigitToggle(event.target.checked)}
                />
              }
              label={t('prayerTimes.arabicDigits')}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
