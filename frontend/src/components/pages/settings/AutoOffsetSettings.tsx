import { useEffect, useId, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  CircularProgress,
  Divider,
  TextField,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CloudSyncOutlined, ExpandMore, Public, Schedule, Sync } from '@mui/icons-material';
import NumberField from '@/components/ui/NumberField';
import {
  getPrayerReferenceProviders,
  getPrayerSyncStatus,
  getPrayerReferenceLocations,
  openURL,
  syncPrayerOffsets,
} from '@/bindings';
import { useAppStore } from '@/store/appStore';
import type { AutoOffsetConfig, PrayerReferenceProvider, PrayerSyncStatus, Settings } from '@/types';

// AlAdhan's public method IDs, including both Sunni and Shia conventions.
const onlineMethods: [number, string][] = [
  [0, 'Shia Ithna-Ashari (Qum)'],
  [1, 'Karachi'],
  [2, 'ISNA (North America)'],
  [3, 'Muslim World League'],
  [4, 'Umm Al-Qura (Makkah)'],
  [5, 'Egypt'],
  [7, 'Tehran'],
  [8, 'Gulf Region'],
  [9, 'Kuwait'],
  [10, 'Qatar'],
  [11, 'MUIS (Singapore)'],
  [12, 'UOIF (France)'],
  [13, 'Diyanet (Turkey, experimental)'],
  [14, 'Russia'],
  [15, 'Moonsighting Committee Worldwide'],
  [16, 'Dubai (experimental)'],
  [17, 'JAKIM (Malaysia)'],
  [18, 'Tunisia'],
  [19, 'Algeria'],
  [20, 'Kemenag (Indonesia)'],
  [21, 'Morocco'],
  [22, 'Lisbon (Portugal)'],
  [23, 'Jordan'],
];

interface Props {
  settings: Settings;
  onChange: (config: AutoOffsetConfig) => void;
  onboarding?: boolean;
}

export default function AutoOffsetSettings({ settings, onChange, onboarding = false }: Props) {
  const { t } = useTranslation();
  const savedSettings = useAppStore((state) => state.settings);
  const refreshPrayerData = useAppStore((state) => state.refreshPrayerData);
  const [status, setStatus] = useState<PrayerSyncStatus | null>(null);
  const [providers, setProviders] = useState<PrayerReferenceProvider[]>([]);
  const [providersError, setProvidersError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const value = settings.prayer.autoOffset;
  const labelId = useId();
  const selectedProvider = providers.find((provider) => provider.id === value.provider) ?? providers[0];
  const regionalProvider = selectedProvider?.regional ?? false;
  const [provinces, setProvinces] = useState<{ id: string; lokasi: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; lokasi: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [cityRetry, setCityRetry] = useState(0);
  const validZone =
    selectedProvider?.timezones === null || selectedProvider?.timezones.includes(settings.location.timezone) === true;
  const incompatible = regionalProvider && (!validZone || settings.prayer.asrMethod === 'Hanafi');

  useEffect(() => {
    let active = true;
    void getPrayerReferenceProviders()
      .then((items) => {
        if (active) setProviders(items);
      })
      .catch((reason) => {
        if (active) setProvidersError(String(reason));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProvider?.hasLocationList || !value.enabled) return;
    let active = true;
    setCitiesLoading(true);
    setCitiesError('');
    setCities([]);
    void (async () => {
      if (selectedProvider.hasRegionSelector) {
        const regions = await getPrayerReferenceLocations(selectedProvider.id);
        if (active) setProvinces(regions);
        if (!value.regionId) return [];
      }
      return getPrayerReferenceLocations(selectedProvider.id, selectedProvider.hasRegionSelector ? value.regionId : '');
    })()
      .then((items) => {
        if (active) setCities(items);
      })
      .catch((reason) => {
        if (active) setCitiesError(String(reason));
      })
      .finally(() => {
        if (active) setCitiesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [value.enabled, value.provider, value.regionId, selectedProvider, cityRetry]);
  const saved =
    JSON.stringify(settings.prayer) === JSON.stringify(savedSettings?.prayer) &&
    JSON.stringify(settings.location) === JSON.stringify(savedSettings?.location);

  useEffect(() => {
    if (onboarding) return;
    let active = true;
    const update = () =>
      void getPrayerSyncStatus()
        .then((next) => {
          if (active) setStatus(next);
        })
        .catch((reason) => {
          if (active) setError(String(reason));
        });
    update();
    const timer = window.setInterval(update, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [onboarding, savedSettings]);

  const sync = async () => {
    setBusy(true);
    setError('');
    try {
      setStatus(await syncPrayerOffsets());
      await refreshPrayerData();
    } catch (reason) {
      setError(String(reason));
      setStatus(await getPrayerSyncStatus().catch(() => null));
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<AutoOffsetConfig>) => onChange({ ...value, ...patch });
  const timestamp = (text: string) => (text ? new Date(text).toLocaleString() : t('autoOffset.never'));

  if (!selectedProvider) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        {providersError ? <Alert severity="error">{providersError}</Alert> : <CircularProgress size={24} />}
      </Box>
    );
  }

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, p: { xs: 2, sm: 2.5 }, bgcolor: 'action.hover' }}>
        <CloudSyncOutlined color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('autoOffset.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('autoOffset.subtitle')}
          </Typography>
        </Box>
        <Switch
          checked={value.enabled}
          onChange={(_, checked) => update({ enabled: checked })}
          slotProps={{ input: { 'aria-label': t('autoOffset.enable') } }}
        />
      </Stack>
      <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Alert severity="info" variant="outlined">
          {t('autoOffset.explanation')}
        </Alert>
        {value.enabled && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: onboarding ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)' },
                gap: 3,
              }}
            >
              <Stack spacing={2} sx={{ minWidth: 0 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Public fontSize="small" color="action" />
                  <Typography variant="subtitle2">{t('autoOffset.sourceTitle')}</Typography>
                </Stack>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={t('autoOffset.provider')}
                  value={value.provider || 'aladhan'}
                  onChange={(event) =>
                    update({ provider: event.target.value, cityId: '', cityName: '', regionId: '', regionName: '' })
                  }
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {t(`autoOffset.${provider.id}`)}
                    </MenuItem>
                  ))}
                </TextField>
                {regionalProvider ? (
                  <>
                    {selectedProvider.hasRegionSelector && (
                      <Autocomplete
                        options={provinces}
                        loading={citiesLoading}
                        value={
                          value.regionId ? { id: value.regionId, lokasi: value.regionName || value.regionId } : null
                        }
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        getOptionLabel={(option) => option.lokasi}
                        onChange={(_, region) =>
                          update({
                            regionId: region?.id || '',
                            regionName: region?.lokasi || '',
                            cityId: '',
                            cityName: '',
                          })
                        }
                        renderInput={(params) => (
                          <TextField {...params} size="small" label={t('autoOffset.province')} />
                        )}
                      />
                    )}
                    {selectedProvider.locationType && (
                      <Autocomplete
                        disabled={selectedProvider.hasRegionSelector && !value.regionId}
                        options={cities}
                        loading={citiesLoading}
                        value={value.cityId ? { id: value.cityId, lokasi: value.cityName || value.cityId } : null}
                        isOptionEqualToValue={(option, selected) => option.id === selected.id}
                        getOptionLabel={(option) => option.lokasi}
                        onChange={(_, city) => update({ cityId: city?.id || '', cityName: city?.lokasi || '' })}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label={t(`autoOffset.${selectedProvider.locationType}`)}
                            helperText={t('autoOffset.cityHint', { timezone: settings.location.timezone })}
                            slotProps={{
                              ...params.slotProps,
                              input: {
                                ...params.slotProps.input,
                                endAdornment: (
                                  <>
                                    {citiesLoading && <CircularProgress size={16} />}
                                    {params.slotProps.input.endAdornment}
                                  </>
                                ),
                              },
                            }}
                          />
                        )}
                      />
                    )}
                    {citiesError && (
                      <Alert
                        severity="warning"
                        action={<Button onClick={() => setCityRetry((n) => n + 1)}>{t('autoOffset.retry')}</Button>}
                      >
                        {citiesError}
                      </Alert>
                    )}
                    {incompatible && <Alert severity="warning">{t('autoOffset.regionalIncompatible')}</Alert>}
                  </>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel id={labelId}>{t('autoOffset.method')}</InputLabel>
                    <Select
                      labelId={labelId}
                      label={t('autoOffset.method')}
                      value={value.method}
                      MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } } } }}
                      onChange={(event) => update({ method: Number(event.target.value) })}
                    >
                      <MenuItem value={-1}>{t('autoOffset.regional')}</MenuItem>
                      {onlineMethods.map(([id, name]) => (
                        <MenuItem key={id} value={id}>
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Typography variant="body2" color="text.secondary">
                  {t(`autoOffset.providerHints.${selectedProvider.id}`)}
                </Typography>
              </Stack>
              <Stack
                spacing={2}
                sx={{ minWidth: 0, p: 2, borderRadius: 1.5, bgcolor: 'action.hover', alignSelf: 'start' }}
              >
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Schedule fontSize="small" color="action" />
                  <Typography variant="subtitle2">{t('autoOffset.scheduleTitle')}</Typography>
                </Stack>
                <FormControlLabel
                  sx={{ m: 0, justifyContent: 'space-between' }}
                  labelPlacement="start"
                  label={<Typography variant="body2">{t('autoOffset.startup')}</Typography>}
                  control={
                    <Switch checked={value.onStartup} onChange={(_, checked) => update({ onStartup: checked })} />
                  }
                />
                <NumberField
                  size="small"
                  label={t('autoOffset.interval')}
                  min={0}
                  max={720}
                  step={1}
                  value={value.intervalHours}
                  onValueChange={(hours) => {
                    if (hours !== null) update({ intervalHours: Math.round(hours) });
                  }}
                  helperText={t('autoOffset.intervalHint')}
                />
                {onboarding && (
                  <Typography variant="body2" color="text.secondary">
                    {t('autoOffset.onboardingHint')}
                  </Typography>
                )}
              </Stack>
            </Box>
            {!onboarding && (
              <>
                <Divider />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2">{t('autoOffset.statusTitle')}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('autoOffset.lastSync', { time: timestamp(saved ? status?.lastSync || '' : '') })}
                    </Typography>
                    {saved && status?.nextSync && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {t('autoOffset.nextSync', { time: timestamp(status.nextSync) })}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Sync />}
                    sx={{ flexShrink: 0 }}
                    disabled={
                      !saved ||
                      busy ||
                      status?.syncing ||
                      incompatible ||
                      (regionalProvider && Boolean(selectedProvider.locationType) && !value.cityId)
                    }
                    onClick={() => void sync()}
                  >
                    {busy || status?.syncing ? t('autoOffset.syncing') : t('autoOffset.syncNow')}
                  </Button>
                </Stack>
                {status && saved && (
                  <>
                    <Alert severity={status.lastError ? 'warning' : status.todayActive ? 'success' : 'info'}>
                      {status.todayActive ? t('autoOffset.active') : t('autoOffset.localFallback')}
                      {status.lastError && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {status.lastError}
                        </Typography>
                      )}
                    </Alert>
                    {status.methodName && (
                      <Typography variant="body2" color="text.secondary">
                        {t('autoOffset.reference', {
                          provider:
                            providers.find((provider) => provider.source === status.source)?.name ?? status.source,
                          method: status.methodName,
                          from: status.fromDate,
                          through: status.throughDate,
                        })}
                      </Typography>
                    )}
                    {status.apiEndpoint && (
                      <Link
                        component="button"
                        variant="caption"
                        sx={{ display: 'block', textAlign: 'left', overflowWrap: 'anywhere' }}
                        onClick={() => void openURL(status.apiEndpoint)}
                      >
                        {t('autoOffset.endpoint', { url: status.apiEndpoint })}
                      </Link>
                    )}
                    {status.todayActive && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {t('autoOffset.corrections')}
                        </Typography>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: 'repeat(2, minmax(0, 1fr))',
                              sm: 'repeat(3, minmax(0, 1fr))',
                              lg: 'repeat(6, minmax(0, 1fr))',
                            },
                            gap: 1,
                          }}
                        >
                          {Object.entries(status.todayOffsets).map(([name, minutes]) => (
                            <Box
                              key={name}
                              sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {t('prayerNames.' + name)}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {minutes > 0 ? '+' : ''}
                                {minutes.toFixed(1)} {t('autoOffset.minutes')}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
                {error && <Alert severity="error">{error}</Alert>}
              </>
            )}
          </>
        )}
        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 36 }}>
            <Typography variant="body2" color="text.secondary">
              {t('autoOffset.detailsTitle')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {t('autoOffset.limitations')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('autoOffset.manualHint')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t(selectedProvider.regional ? 'autoOffset.regionalPrivacy' : 'autoOffset.privacy')}{' '}
                <Link component="button" onClick={() => void openURL(selectedProvider.url)}>
                  {selectedProvider.name}
                </Link>
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
}
