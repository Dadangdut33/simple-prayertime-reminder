import { Box, MenuItem, Select, TextField, Typography } from '@mui/material';
import NumberField from '../../ui/NumberField';
import { CALCULATION_METHODS, PRAYER_NAMES, type Settings } from '../../../types';

interface PrayerSettingsTabProps {
  local: Settings;
  setPrayer: (patch: Partial<Settings['prayer']>) => void;
}

export default function PrayerSettingsTab({ local, setPrayer }: PrayerSettingsTabProps) {
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
        <Box>
          <Typography variant="caption" color="text.secondary" mb={1} display="block">
            Calculation Method
          </Typography>
          <Select
            size="small"
            fullWidth
            value={local.prayer.method}
            onChange={(event) => setPrayer({ method: event.target.value })}
          >
            {CALCULATION_METHODS.map((method) => (
              <MenuItem key={method.value} value={method.value}>
                {method.label}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" mb={1} display="block">
            Asr Method
          </Typography>
          <Select
            size="small"
            fullWidth
            value={local.prayer.asrMethod}
            onChange={(event) => setPrayer({ asrMethod: event.target.value })}
          >
            <MenuItem value="Shafii">Shafi&apos;i, Maliki, Hanbali (Standard)</MenuItem>
            <MenuItem value="Hanafi">Hanafi (Later time)</MenuItem>
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
          <TextField
            label="Custom Fajr Angle (°)"
            type="number"
            size="small"
            value={local.prayer.customFajrAngle}
            onChange={(event) =>
              setPrayer({
                customFajrAngle: Number.parseFloat(event.target.value) || 0,
              })
            }
          />
          <TextField
            label="Custom Isha Angle (°)"
            type="number"
            size="small"
            value={local.prayer.customIshaAngle}
            onChange={(event) =>
              setPrayer({
                customIshaAngle: Number.parseFloat(event.target.value) || 0,
              })
            }
          />
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="subtitle2" mb={2}>
          Manual Time Offsets (Minutes)
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
                label={prayerName}
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
