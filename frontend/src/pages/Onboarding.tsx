import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import * as api from '../bindings';
import type { CitySearchResult, Settings, ThemePreset } from '../types';
import { CALCULATION_METHODS } from '../types';
import { formatCityLabel, formatDigitalClock, getCountryName } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import NumberField from '../components/ui/NumberField';
import DashboardClockCard from '../components/pages/dashboard/DashboardClockCard';
import { checkNativeNotificationPermission, requestNativeNotificationPermission } from '../bindings';

const THEME_PRESETS: { value: ThemePreset; labelKey: string }[] = [
  { value: 'indigo', labelKey: 'onboarding.appearance.presets.indigo' },
  { value: 'emerald', labelKey: 'onboarding.appearance.presets.emerald' },
  { value: 'sunset', labelKey: 'onboarding.appearance.presets.sunset' },
  { value: 'rose', labelKey: 'onboarding.appearance.presets.rose' },
  { value: 'ocean', labelKey: 'onboarding.appearance.presets.ocean' },
];

const themeSwatches: Record<string, [string, string]> = {
  indigo: ['#4f64f0', '#e2b04a'],
  emerald: ['#158f6a', '#d8a54a'],
  sunset: ['#d85c3a', '#7a5cff'],
  rose: ['#c14f7a', '#e0a43f'],
  ocean: ['#2274a5', '#19a7a1'],
};

export default function Onboarding() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [local, setLocal] = useState<Settings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [nativePermission, setNativePermission] = useState<boolean | null>(null);
  const [nativePermissionError, setNativePermissionError] = useState<string | null>(null);

  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<CitySearchResult[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocal(settings);
    }
  }, [settings]);

  useEffect(() => {
    let active = true;
    void checkNativeNotificationPermission()
      .then((allowed) => {
        if (!active) return;
        setNativePermission(allowed);
      })
      .catch((err) => {
        if (!active) return;
        setNativePermission(false);
        setNativePermissionError(String(err));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!local || local.location.autoDetect || cityQuery.trim().length < 2) {
      setCityOptions([]);
      return () => undefined;
    }

    let active = true;
    setCityLoading(true);
    const timeout = window.setTimeout(() => {
      api
        .searchCities(cityQuery.trim(), 20)
        .then((results) => {
          if (active) setCityOptions(results);
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setCityLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [cityQuery, local]);

  const steps = useMemo(
    () => [
      t('onboarding.steps.appearance'),
      t('onboarding.steps.location'),
      t('onboarding.steps.prayer'),
      t('onboarding.steps.reminder'),
    ],
    [t],
  );

  if (!local) {
    return null;
  }

  const applyAndPersist = (next: Settings) => {
    setLocal(next);
    void updateSettings({ ...next, onboardingCompleted: false });
  };

  const setTheme = (patch: Partial<Settings>) =>
    applyAndPersist({ ...local, ...patch });

  const setDashboard = (patch: Partial<Settings['dashboard']>) =>
    applyAndPersist({ ...local, dashboard: { ...local.dashboard, ...patch } });

  const setLocation = (patch: Partial<Settings['location']>) =>
    setLocal({ ...local, location: { ...local.location, ...patch } });

  const setPrayer = (patch: Partial<Settings['prayer']>) =>
    setLocal({ ...local, prayer: { ...local.prayer, ...patch } });

  const setNotification = (patch: Partial<Settings['notification']>) =>
    setLocal({ ...local, notification: { ...local.notification, ...patch } });

  const reminderEnabled = Object.values(local.notification.prayers).some((prayer) => prayer.enabled);

  const setAllPrayerEnabled = (enabled: boolean) => {
    setNotification({
      prayers: Object.fromEntries(
        Object.entries(local.notification.prayers).map(([key, value]) => [
          key,
          { ...value, enabled },
        ]),
      ) as Settings['notification']['prayers'],
    });
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    try {
      const loc = await api.detectLocation();
      setLocation({
        autoDetect: true,
        inputMode: 'custom',
        city: loc.city,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
        elevation: loc.elevation,
        timezone: loc.timezone,
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateSettings({ ...local, onboardingCompleted: true });
    } finally {
      setSaving(false);
    }
  };

  const clockPreview = formatDigitalClock(
    new Date(),
    local.dashboard.digitalClockFormat,
    local.dashboard.digitalClockCustom,
  );

  const handleNativeNotificationToggle = async (checked: boolean) => {
    if (!checked) {
      setNotification({ useNativeNotification: false });
      return;
    }
    try {
      const allowed = await checkNativeNotificationPermission();
      if (!allowed) {
        const granted = await requestNativeNotificationPermission();
        setNativePermission(granted);
        if (!granted) {
          setNotification({ useNativeNotification: false });
          return;
        }
      } else {
        setNativePermission(true);
      }
      setNotification({ useNativeNotification: true });
    } catch (err) {
      setNativePermission(false);
      setNativePermissionError(String(err));
      setNotification({ useNativeNotification: false });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 4 },
        background: `radial-gradient(circle at top left, ${theme.palette.primary.main}26, transparent 55%), radial-gradient(circle at bottom right, ${theme.palette.secondary.main}24, transparent 55%)`,
      }}
    >
      <Card sx={{ width: 'min(960px, 95vw)', p: { xs: 3, md: 4 }, borderRadius: 2 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h2">{t('onboarding.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('onboarding.subtitle')}
            </Typography>
          </Box>

          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider />

          {activeStep === 0 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1">{t('onboarding.appearance.themeMode')}</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={local.theme}
                  onChange={(_, value) => value && setTheme({ theme: value })}
                  sx={{ mt: 1 }}
                >
                  <ToggleButton value="system">{t('onboarding.appearance.system')}</ToggleButton>
                  <ToggleButton value="light">{t('onboarding.appearance.light')}</ToggleButton>
                  <ToggleButton value="dark">{t('onboarding.appearance.dark')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Typography variant="subtitle1">{t('onboarding.appearance.themePreset')}</Typography>
                <Box
                  display="grid"
                  gridTemplateColumns={{
                    xs: '1fr',
                    sm: '1fr 1fr',
                    xl: 'repeat(5, 1fr)',
                  }}
                  gap={2}
                  mt={1}
                >
                  {THEME_PRESETS.map((preset) => {
                    const active = local.themePreset === preset.value;
                    return (
                      <Box
                        key={preset.value}
                        onClick={() => setTheme({ themePreset: preset.value })}
                        sx={{
                          p: 2,
                          borderRadius: 0.5,
                          border: '1px solid',
                          borderColor: active ? 'primary.main' : 'divider',
                          backgroundColor: active ? 'action.selected' : 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 160ms ease',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <Box display="flex" gap={1} mb={1.25}>
                          {themeSwatches[preset.value].map((color) => (
                            <Box
                              key={color}
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                backgroundColor: color,
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="subtitle2">{t(preset.labelKey)}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle1">{t('onboarding.appearance.clockStyle')}</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={local.dashboard.clockType}
                  onChange={(_, value) => value && setDashboard({ clockType: value })}
                  sx={{ mt: 1 }}
                >
                  <ToggleButton value="digital">{t('onboarding.appearance.clockDigital')}</ToggleButton>
                  <ToggleButton value="analog">{t('onboarding.appearance.clockAnalog')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <DashboardClockCard
                now={new Date()}
                settings={local}
                analogClockSize={local.dashboard.analogClockSize}
                digitalClockText={clockPreview}
              />
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Box>
                  <Typography variant="subtitle1">{t('onboarding.location.autoDetect')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('onboarding.location.autoDetectHint')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleDetectLocation}
                    disabled={detecting}
                    startIcon={detecting ? <CircularProgress size={16} /> : null}
                  >
                    {t('onboarding.location.detectNow')}
                  </Button>
                  <Switch
                    checked={local.location.autoDetect}
                    onChange={(event) =>
                      setLocation({
                        autoDetect: event.target.checked,
                        inputMode: event.target.checked ? 'custom' : 'list',
                      })
                    }
                  />
                </Stack>
              </Box>

              {!local.location.autoDetect && (
                <Autocomplete
                  options={cityOptions}
                  loading={cityLoading}
                  filterOptions={(options) => options}
                  getOptionLabel={(option) => formatCityLabel(option)}
                  onInputChange={(_, value) => setCityQuery(value)}
                  onChange={(_, value) => {
                    if (!value) return;
                    setLocation({
                      autoDetect: false,
                      inputMode: 'list',
                      city: value.name,
                      country: getCountryName(value.countryCode),
                      latitude: value.latitude,
                      longitude: value.longitude,
                      elevation: value.elevation,
                      timezone: value.timezone,
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('onboarding.location.city')}
                      placeholder={t('onboarding.location.cityPlaceholder')}
                      size="small"
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {cityLoading ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              )}

              {local.location.autoDetect && (
                <Box p={2.5} borderRadius={0.5} border="1px solid" borderColor="divider" bgcolor="background.paper">
                  <Typography variant="subtitle2" mb={1}>
                    {t('onboarding.location.detectedTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('onboarding.location.detectedValue', {
                      city: local.location.city,
                      country: local.location.country,
                      timezone: local.location.timezone || t('common.unknown'),
                    })}
                  </Typography>
                </Box>
              )}

              <Alert severity="info">{t('onboarding.location.note')}</Alert>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={3}>
              <Alert severity="info">{t('settings.prayer.disclaimer')}</Alert>
              <Box>
                <Typography variant="subtitle1">{t('onboarding.prayer.method')}</Typography>
                <FormControl size="small" sx={{ mt: 1, minWidth: 320 }}>
                  <Select
                    value={local.prayer.method}
                    onChange={(event) => setPrayer({ method: event.target.value as string })}
                  >
                    {CALCULATION_METHODS.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        {t(method.labelKey)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle1">{t('onboarding.prayer.asr')}</Typography>
                <FormControl size="small" sx={{ mt: 1, minWidth: 220 }}>
                  <Select
                    value={local.prayer.asrMethod}
                    onChange={(event) => setPrayer({ asrMethod: event.target.value as string })}
                  >
                    <MenuItem value="Shafii">{t('prayer.asr.shafii')}</MenuItem>
                    <MenuItem value="Hanafi">{t('prayer.asr.hanafi')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {local.prayer.method === 'Custom' && (
                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
                  gap={3}
                  p={2}
                  bgcolor="action.hover"
                  borderRadius={0.5}
                >
                  <NumberField
                    label={t('settings.prayer.customFajr')}
                    size="small"
                    value={local.prayer.customFajrAngle}
                    onValueChange={(value) => setPrayer({ customFajrAngle: value ?? 0 })}
                  />
                  <NumberField
                    label={t('settings.prayer.customIsha')}
                    size="small"
                    value={local.prayer.customIshaAngle}
                    onValueChange={(value) => setPrayer({ customIshaAngle: value ?? 0 })}
                  />
                  <NumberField
                    label={t('settings.prayer.customMaghrib')}
                    size="small"
                    value={local.prayer.customMaghribDuration}
                    helperText={t('settings.prayer.customMaghribHint')}
                    onValueChange={(value) => setPrayer({ customMaghribDuration: value ?? 0 })}
                  />
                </Box>
              )}
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack spacing={2.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={reminderEnabled}
                    onChange={(event) => setAllPrayerEnabled(event.target.checked)}
                  />
                }
                label={t('onboarding.reminder.enable')}
              />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1">{t('settings.alarms.playAdhan')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.alarms.playAdhanDesc')}
                  </Typography>
                </Box>
                <Switch
                  checked={local.notification.playAdhan}
                  onChange={(event) => setNotification({ playAdhan: event.target.checked })}
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1">{t('settings.alarms.useNativeDialog')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.alarms.useNativeDialogDesc')}
                  </Typography>
                </Box>
                <Switch
                  checked={local.notification.useNativeDialog}
                  onChange={(event) => setNotification({ useNativeDialog: event.target.checked })}
                />
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1">{t('settings.alarms.useNativeNotification')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.alarms.useNativeNotificationDesc')}
                  </Typography>
                  {nativePermission === false && (
                    <Typography variant="caption" color="warning.main" display="block" mt={0.5}>
                      {nativePermissionError ? nativePermissionError : t('settings.alarms.nativePermissionDenied')}
                    </Typography>
                  )}
                </Box>
                <Switch
                  checked={local.notification.useNativeNotification}
                  onChange={(event) => handleNativeNotificationToggle(event.target.checked)}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('onboarding.reminder.note')}
              </Typography>
            </Stack>
          )}

          <Divider />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              variant="text"
              onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
              disabled={activeStep === 0}
            >
              {t('common.back')}
            </Button>
            <Box display="flex" gap={1}>
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" onClick={() => setActiveStep((prev) => prev + 1)}>
                  {t('common.next')}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleFinish} disabled={saving}>
                  {saving ? t('common.saving') : t('onboarding.finish')}
                </Button>
              )}
            </Box>
          </Box>
        </Stack>
      </Card>
    </Box>
  );
}
