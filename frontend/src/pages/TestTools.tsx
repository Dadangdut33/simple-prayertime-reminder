import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import {
  getDebugTimeInfo,
  getReminderTestSnapshot,
  openURL,
  searchTimezones,
  syncReminderTestWindow,
  triggerReminderTest,
} from '../bindings';
import type { DebugTimeInfo, ReminderTestSnapshot, UpdateInfo } from '../types';
import NumberField from '../components/ui/NumberField';
import UpdateAvailableDialog from '../components/app/UpdateAvailableDialog';

const PRAYER_OPTIONS = ['Fajr', 'Sunrise', 'Zuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export default function TestToolsPage() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [prayerName, setPrayerName] = useState<(typeof PRAYER_OPTIONS)[number]>('Fajr');
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [timezone, setTimezone] = useState('');
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([]);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [syncReminder, setSyncReminder] = useState(true);
  const [liveTick, setLiveTick] = useState(0);
  const [liveStart, setLiveStart] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<ReminderTestSnapshot | null>(null);
  const [debugTimeInfo, setDebugTimeInfo] = useState<DebugTimeInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const inflightRef = useRef(false);
  const pendingRef = useRef<{
    trigger: boolean;
    offsetOverride?: number;
    silent: boolean;
  } | null>(null);

  const enabled = settings?.enableTestTools ?? false;

  useEffect(() => {
    if (settings?.location.timezone && !timezone) {
      setTimezone(settings.location.timezone);
      setTimezoneQuery(settings.location.timezone);
    }
  }, [settings?.location.timezone, timezone]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const query = timezoneQuery.trim();
    if (!query) {
      setTimezoneOptions([]);
      return;
    }
    setTimezoneLoading(true);
    void searchTimezones(query, 80)
      .then((results) => {
        if (!active) return;
        setTimezoneOptions(results);
      })
      .finally(() => {
        if (!active) return;
        setTimezoneLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, timezoneQuery]);

  useEffect(() => {
    if (!liveMode) {
      setLiveStart(null);
      return;
    }
    const start = Date.now();
    setLiveStart(start);
    setLiveTick(start);
    const id = window.setInterval(() => setLiveTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [liveMode]);

  useEffect(() => {
    if (!liveMode) return;
    const start = Date.now();
    setLiveStart(start);
    setLiveTick(start);
  }, [offsetMinutes, liveMode, prayerName, timezone]);

  const baseOffsetSeconds = offsetMinutes * 60;
  const effectiveOffsetSeconds = useMemo(() => {
    if (!liveMode || liveStart === null) return baseOffsetSeconds;
    const elapsed = Math.max(0, Math.floor((liveTick - liveStart) / 1000));
    return baseOffsetSeconds + elapsed;
  }, [baseOffsetSeconds, liveMode, liveStart, liveTick]);

  const liveOffsetLabel = useMemo(() => {
    if (!liveMode) return null;
    const seconds = effectiveOffsetSeconds;
    const sign = seconds < 0 ? '-' : '+';
    const absSeconds = Math.abs(seconds);
    const minutes = Math.floor(absSeconds / 60);
    const remainingSeconds = absSeconds % 60;
    return `${sign}${minutes}m ${remainingSeconds}s`;
  }, [effectiveOffsetSeconds, liveMode]);

  const runSnapshotRequest = async (trigger: boolean, offsetOverride?: number, silent = false) => {
    const requestId = ++requestIdRef.current;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const offsetSeconds = offsetOverride ?? effectiveOffsetSeconds;
      const result = trigger
        ? await triggerReminderTest(prayerName, offsetSeconds, timezone, liveMode)
        : syncReminder
          ? await syncReminderTestWindow(prayerName, offsetSeconds, timezone, liveMode)
          : await getReminderTestSnapshot(prayerName, offsetSeconds, timezone);
      if (requestId === requestIdRef.current) {
        setSnapshot(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(String(err));
      }
    } finally {
      if (!silent && requestId === requestIdRef.current) {
        setLoading(false);
      }
      inflightRef.current = false;
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        inflightRef.current = true;
        void runSnapshotRequest(next.trigger, next.offsetOverride, next.silent);
      }
    }
  };

  const fetchSnapshot = (trigger: boolean, offsetOverride?: number, silent = false) => {
    if (inflightRef.current) {
      pendingRef.current = { trigger, offsetOverride, silent };
      return;
    }
    inflightRef.current = true;
    void runSnapshotRequest(trigger, offsetOverride, silent);
  };

  const loadDebugTimeInfo = async () => {
    try {
      const info = await getDebugTimeInfo();
      setDebugTimeInfo(info);
    } catch (err) {
      setDebugTimeInfo({
        nowRFC3339: '',
        clock: '',
        timezone: '',
        offset: `Failed to load backend time: ${String(err)}`,
      });
    }
  };

  useEffect(() => {
    if (!enabled) return;
    void fetchSnapshot(false, effectiveOffsetSeconds, liveMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, prayerName, timezone, effectiveOffsetSeconds, syncReminder, liveMode]);

  const scheduleEntries = useMemo(() => {
    if (!snapshot?.schedule) return [];
    return Object.entries(snapshot.schedule);
  }, [snapshot?.schedule]);

  if (!enabled) {
    return (
      <Box p={4}>
        <Alert severity="warning">{t('reminderTest.disabled')}</Alert>
      </Box>
    );
  }

  const mockUpdate: UpdateInfo = {
    hasUpdate: true,
    latestVersion: '2.1.0',
    currentVersion: '2.0.0',
    updateTitle: t('updates.available'),
    updateDetail: t('updates.versionNotice', { latest: '2.1.0', current: '2.0.0' }),
    installMethod: 'GitHub',
    actionLabel: t('updates.openLatest'),
    releaseUrl: 'https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest',
    updateCommand: '',
  };

  return (
    <Box p={4} display="flex" flexDirection="column" gap={3}>
      <Box display="flex" alignItems="center" gap={1.5}>
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
          <BugReportOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h2">{t('reminderTest.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('reminderTest.subtitle')}
          </Typography>
        </Box>
      </Box>

      <Box display="flex" justifyContent="flex-end">
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" onClick={() => setShowUpdateDialog(true)}>
            {t('reminderTest.showUpdateDialog')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={async () => {
              if (!settings) return;
              await updateSettings({ ...settings, onboardingCompleted: false });
            }}
          >
            {t('reminderTest.redoOnboarding')}
          </Button>
        </Box>
      </Box>

      <UpdateAvailableDialog
        open={showUpdateDialog}
        update={mockUpdate}
        onClose={() => setShowUpdateDialog(false)}
        onOpenAction={async () => openURL(mockUpdate.releaseUrl)}
      />

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1fr 1fr' }} gap={3}>
        <Box
          p={3}
          border="1px solid"
          borderColor="divider"
          borderRadius={0.5}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <Typography variant="subtitle1">{t('reminderTest.controls')}</Typography>
          <Select
            size="small"
            value={prayerName}
            onChange={(event) => setPrayerName(event.target.value as (typeof PRAYER_OPTIONS)[number])}
          >
            {PRAYER_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          <NumberField
            label={t('reminderTest.offsetMinutes')}
            size="small"
            value={offsetMinutes}
            min={-240}
            max={240}
            onValueChange={(value) => setOffsetMinutes(value ?? 0)}
            helperText={
              liveOffsetLabel
                ? `${t('reminderTest.offsetHint')} ${t('reminderTest.liveOffset', { offset: liveOffsetLabel })}`
                : t('reminderTest.offsetHint')
            }
          />
          <Stack spacing={1}>
            <FormControlLabel
              control={<Switch checked={liveMode} onChange={(event) => setLiveMode(event.target.checked)} />}
              label={t('reminderTest.liveMode')}
            />
            <FormControlLabel
              control={<Switch checked={syncReminder} onChange={(event) => setSyncReminder(event.target.checked)} />}
              label={t('reminderTest.syncReminder')}
            />
          </Stack>
          <TextField
            label={t('reminderTest.timezone')}
            size="small"
            value={timezone}
            onChange={(event) => {
              setTimezone(event.target.value);
              setTimezoneQuery(event.target.value);
            }}
            helperText={timezoneLoading ? t('reminderTest.timezoneLoading') : t('reminderTest.timezoneHint')}
            select
            SelectProps={{
              native: false,
            }}
          >
            {timezoneOptions.length === 0 ? (
              <MenuItem value={timezone}>{timezone || t('common.unknown')}</MenuItem>
            ) : (
              timezoneOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))
            )}
          </TextField>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => fetchSnapshot(false)} disabled={loading}>
              {t('reminderTest.refresh')}
            </Button>
            <Button variant="contained" onClick={() => fetchSnapshot(true)} disabled={loading}>
              {t('reminderTest.trigger')}
            </Button>
            {loading && <CircularProgress size={20} />}
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Box>

        <Box
          p={3}
          border="1px solid"
          borderColor="divider"
          borderRadius={0.5}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <Typography variant="subtitle1">{t('reminderTest.snapshot')}</Typography>
          {snapshot ? (
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('reminderTest.currentTime')}: {snapshot.currentTime}
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.simulatedTime')}: {snapshot.simulatedTime}
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.prayerTime')}: {snapshot.prayerName} @ {snapshot.prayerTime}
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.offsetApplied')}: {Math.round(effectiveOffsetSeconds / 60)}m ({effectiveOffsetSeconds}
                s)
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.state')}: {snapshot.state}
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.minutesLeft')}: {snapshot.minutesLeft}
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.nextPrayer')}: {snapshot.nextPrayerName} @ {snapshot.nextPrayerTime}
              </Typography>
              <Typography variant="body2">
                {t('reminderTest.timezoneUsed')}: {snapshot.timezone}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">{t('reminderTest.schedule')}</Typography>
              {scheduleEntries.map(([name, time]) => (
                <Typography key={name} variant="body2">
                  {name}: {time}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('common.noData')}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        p={3}
        border="1px solid"
        borderColor="divider"
        borderRadius={0.5}
        display="flex"
        flexDirection="column"
        gap={1.5}
      >
        <Typography variant="subtitle1">{t('reminderTest.settings')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('reminderTest.settingsSummary', {
            persistent: settings?.notification.persistentReminder ? t('common.yes') : t('common.no'),
            autoDismiss: settings?.notification.autoDismissSeconds ?? 0,
            style: settings?.notification.style ?? 'window',
          })}
        </Typography>

        <Divider />
        <Typography variant="subtitle2">{t('reminderTest.backendTimeTitle')}</Typography>
        <Button variant="outlined" onClick={loadDebugTimeInfo}>
          {t('reminderTest.backendTimeRefresh')}
        </Button>
        {debugTimeInfo && (
          <TextField
            label={t('reminderTest.backendTimeOutput')}
            value={JSON.stringify(debugTimeInfo, null, 2)}
            fullWidth
            multiline
            minRows={4}
            InputProps={{ readOnly: true }}
          />
        )}
      </Box>
    </Box>
  );
}
