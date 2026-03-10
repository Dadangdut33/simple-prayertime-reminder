import { Alert, Box, MenuItem, Select, Typography } from '@mui/material';
import NumberField from '../../ui/NumberField';
import { CALCULATION_METHODS, PRAYER_NAMES, type Settings } from '../../../types';
import { useTranslation } from 'react-i18next';

interface PrayerSettingsTabProps {
  local: Settings;
  setPrayer: (patch: Partial<Settings['prayer']>) => void;
}

export default function PrayerSettingsTab({ local, setPrayer }: PrayerSettingsTabProps) {
  const { t } = useTranslation();
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Alert severity="info">
        {t('settings.prayer.disclaimer')}
      </Alert>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
        <Box>
          <Typography variant="caption" color="text.secondary" mb={1} display="block">
            {t('settings.prayer.method')}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={local.prayer.method}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 320 },
              },
            }}
            onChange={(event) => setPrayer({ method: event.target.value })}
          >
            {CALCULATION_METHODS.map((method) => (
              <MenuItem key={method.value} value={method.value}>
                {t(method.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" mb={1} display="block">
            {t('settings.prayer.asrMethod')}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={local.prayer.asrMethod}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 320 },
              },
            }}
            onChange={(event) => setPrayer({ asrMethod: event.target.value })}
          >
            <MenuItem value="Shafii">{t('prayer.asr.shafii')}</MenuItem>
            <MenuItem value="Hanafi">{t('prayer.asr.hanafi')}</MenuItem>
          </Select>
        </Box>
      </Box>

      {local.prayer.method === 'Custom' && (
        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
          gap={3}
          p={2}
          bgcolor="action.hover"
          borderRadius={2}
        >
          <NumberField
            label={t('settings.prayer.customFajr')}
            size="small"
            value={local.prayer.customFajrAngle}
            onValueChange={(value) =>
              setPrayer({
                customFajrAngle: value ?? 0,
              })
            }
          />
          <NumberField
            label={t('settings.prayer.customIsha')}
            size="small"
            value={local.prayer.customIshaAngle}
            onValueChange={(value) =>
              setPrayer({
                customIshaAngle: value ?? 0,
              })
            }
          />
          <NumberField
            label={t('settings.prayer.customMaghrib')}
            size="small"
            value={local.prayer.customMaghribDuration}
            helperText={t('settings.prayer.customMaghribHint')}
            onValueChange={(value) =>
              setPrayer({
                customMaghribDuration: value ?? 0,
              })
            }
          />
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="subtitle2" mb={2}>
          {t('settings.prayer.offsets')}
        </Typography>
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: '1fr',
            sm: '1fr 1fr',
            lg: 'repeat(3, 1fr)',
          }}
          gap={2}
        >
          {PRAYER_NAMES.map((prayerName) => {
            const key = prayerName.toLowerCase() as keyof typeof local.prayer.offsets;

            return (
              <NumberField
                key={prayerName}
                label={t(`prayerNames.${key}`)}
                size="small"
                value={local.prayer.offsets[key]}
                onValueChange={(value) =>
                  setPrayer({
                    offsets: {
                      ...local.prayer.offsets,
                      [key]: value ?? 0,
                    },
                  })
                }
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
