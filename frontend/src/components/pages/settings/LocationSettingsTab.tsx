import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import * as api from '../../../bindings';
import NumberField from '../../ui/NumberField';
import type { CitySearchResult, GeonamesInfo, Settings } from '../../../types';
import { formatCityLabel, getCountryName } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

interface LocationSettingsTabProps {
  local: Settings;
  loading: boolean;
  detectLocation: () => Promise<void>;
  setLocation: (patch: Partial<Settings['location']>) => void;
}

export default function LocationSettingsTab({ local, loading, detectLocation, setLocation }: LocationSettingsTabProps) {
  const { t } = useTranslation();
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<CitySearchResult[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([]);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [geonamesInfo, setGeonamesInfo] = useState<GeonamesInfo | null>(null);
  const [geonamesLoading, setGeonamesLoading] = useState(false);
  const [geonamesUpdating, setGeonamesUpdating] = useState(false);

  const inputMode = local.location.inputMode || 'custom';
  const isAuto = local.location.autoDetect;
  const isListMode = !isAuto && inputMode === 'list';
  const isCustomMode = !isAuto && inputMode === 'custom';

  const selectedCity = useMemo<CitySearchResult | null>(() => {
    if (!local.location.city) return null;
    return {
      id: 0,
      name: local.location.city,
      countryCode: local.location.country,
      admin1: '',
      latitude: local.location.latitude,
      longitude: local.location.longitude,
      elevation: local.location.elevation,
      timezone: local.location.timezone,
      label: formatCityLabel({
        name: local.location.city,
        admin1: '',
        country: local.location.country,
      }),
    };
  }, [
    local.location.city,
    local.location.country,
    local.location.latitude,
    local.location.longitude,
    local.location.elevation,
    local.location.timezone,
  ]);

  useEffect(() => {
    if (!isCustomMode && !isAuto) {
      setTimezoneOptions([]);
      return () => undefined;
    }

    let active = true;
    setTimezoneLoading(true);
    const timeout = window.setTimeout(() => {
      api
        .searchTimezones(timezoneQuery, 50)
        .then((zones) => {
          if (!active) return;
          setTimezoneOptions(zones);
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setTimezoneLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [timezoneQuery, isCustomMode, isAuto]);

  useEffect(() => {
    let active = true;
    setGeonamesLoading(true);
    api
      .getGeonamesInfo()
      .then((info) => {
        if (!active) return;
        setGeonamesInfo(info);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setGeonamesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isListMode) {
      setCityOptions([]);
      return () => undefined;
    }

    const query = cityQuery.trim();
    if (query.length < 2) {
      setCityOptions([]);
      return () => undefined;
    }

    let active = true;
    setCityLoading(true);
    const timeout = window.setTimeout(() => {
      api
        .searchCities(query, 50)
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
  }, [cityQuery, isListMode]);

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        pb={3}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Box>
          <Typography variant="subtitle1">{t('settings.location.autoDetectTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.location.autoDetectDescription')}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={detectLocation}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {t('settings.location.detectNow')}
          </Button>
          <Switch
            checked={local.location.autoDetect}
            onChange={(event) => setLocation({ autoDetect: event.target.checked })}
          />
        </Box>
      </Box>

      <Alert severity="info">{t('settings.location.autoDetectDisclaimer')}</Alert>

      {!isAuto && (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              {t('settings.location.inputMode')}
            </Typography>
            <Select
              size="small"
              fullWidth
              value={inputMode}
              onChange={(event) =>
                setLocation({
                  inputMode: event.target.value as Settings['location']['inputMode'],
                })
              }
            >
              <MenuItem value="list">{t('settings.location.inputList')}</MenuItem>
              <MenuItem value="custom">{t('settings.location.inputCustom')}</MenuItem>
            </Select>
          </Box>
        </Box>
      )}

      {isListMode && (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          <Autocomplete
            options={cityOptions}
            value={selectedCity}
            loading={cityLoading}
            filterOptions={(options) => options}
            getOptionLabel={(option) => formatCityLabel(option)}
            isOptionEqualToValue={(option, value) =>
              option.id === value.id ||
              (option.name === value.name &&
                option.countryCode === value.countryCode &&
                option.latitude === value.latitude &&
                option.longitude === value.longitude)
            }
            onChange={(_, value) => {
              if (!value) return;
              setLocation({
                city: value.name,
                country: getCountryName(value.countryCode),
                latitude: value.latitude,
                longitude: value.longitude,
                elevation: value.elevation,
                timezone: value.timezone,
              });
            }}
            onInputChange={(_, value) => setCityQuery(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('settings.location.cityFromList')}
                size="small"
                placeholder={t('settings.location.citySearchPlaceholder')}
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
          <TextField label={t('settings.location.country')} size="small" fullWidth value={local.location.country} disabled />
          <TextField
            label={t('settings.location.timezone')}
            size="small"
            fullWidth
            value={local.location.timezone}
            error={!local.location.timezone}
            helperText={!local.location.timezone ? t('settings.location.timezoneRequired') : undefined}
            disabled
          />
          <NumberField label={t('settings.location.elevation')} size="small" fullWidth value={local.location.elevation} disabled />
          <NumberField label={t('settings.location.latitude')} size="small" fullWidth value={local.location.latitude} disabled />
          <NumberField label={t('settings.location.longitude')} size="small" fullWidth value={local.location.longitude} disabled />
        </Box>
      )}

      {isListMode && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={2}
          p={2.5}
          borderRadius={0.5}
          border="1px solid"
          borderColor="divider"
          bgcolor="background.paper"
        >
          <Box>
            <Typography variant="subtitle2">{t('settings.location.geonamesTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('settings.location.geonamesNote')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('settings.location.geonamesUpdated', {
                date: geonamesInfo?.lastUpdated ?? (geonamesLoading ? t('common.loading') : t('common.unknown')),
              })}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            disabled={geonamesUpdating}
            onClick={async () => {
              try {
                setGeonamesUpdating(true);
                const info = await api.updateGeonamesData();
                setGeonamesInfo(info);
              } finally {
                setGeonamesUpdating(false);
              }
            }}
          >
            {geonamesUpdating ? t('settings.location.updatingCities') : t('settings.location.updateCities')}
          </Button>
        </Box>
      )}

      {(isAuto || isCustomMode) && (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          <TextField
            label={t('settings.location.city')}
            size="small"
            fullWidth
            value={local.location.city}
            onChange={(event) => setLocation({ city: event.target.value })}
            disabled={isAuto}
          />
          <TextField
            label={t('settings.location.country')}
            size="small"
            fullWidth
            value={local.location.country}
            onChange={(event) => setLocation({ country: event.target.value })}
            disabled={isAuto}
          />
          {isAuto ? (
            <TextField
              label={t('settings.location.timezone')}
              size="small"
              fullWidth
              value={local.location.timezone}
              disabled={true}
            />
          ) : (
            <Autocomplete
              options={timezoneOptions}
              value={local.location.timezone || ''}
              loading={timezoneLoading}
              onChange={(_, value) => setLocation({ timezone: value ?? '' })}
              onInputChange={(_, value) => {
                setTimezoneQuery(value);
                setLocation({ timezone: value });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('settings.location.timezone')}
                  size="small"
                  required={!isAuto}
                  error={!isAuto && !local.location.timezone}
                  helperText={
                    !isAuto && !local.location.timezone ? t('settings.location.timezoneRequired') : undefined
                  }
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {timezoneLoading ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                  disabled={isAuto}
                />
              )}
            />
          )}
          <NumberField
            label={t('settings.location.elevation')}
            size="small"
            fullWidth
            value={local.location.elevation}
            step="any"
            onValueChange={(value) =>
              setLocation({
                elevation: value ?? 0,
              })
            }
            disabled={isAuto}
          />
          <NumberField
            label={t('settings.location.latitude')}
            size="small"
            fullWidth
            value={local.location.latitude}
            step="any"
            onValueChange={(value) =>
              setLocation({
                latitude: value ?? 0,
              })
            }
            disabled={isAuto}
          />
          <NumberField
            label={t('settings.location.longitude')}
            size="small"
            fullWidth
            value={local.location.longitude}
            step="any"
            onValueChange={(value) =>
              setLocation({
                longitude: value ?? 0,
              })
            }
            disabled={isAuto}
          />
        </Box>
      )}
    </Box>
  );
}
