import { Box, FormControlLabel, Slider, Switch, Typography } from '@mui/material';
import NumberField from '../../ui/NumberField';
import { PRAYER_NAMES, type Settings } from '../../../types';

interface AlarmSettingsTabProps {
  local: Settings;
  setNotification: (patch: Partial<Settings['notification']>) => void;
}

export default function AlarmSettingsTab({ local, setNotification }: AlarmSettingsTabProps) {
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle1">Play Adhan Audio</Typography>
          <Typography variant="body2" color="text.secondary">
            Play sound when prayer time arrives
          </Typography>
        </Box>
        <Switch
          checked={local.notification.playAdhan}
          onChange={(event) => setNotification({ playAdhan: event.target.checked })}
        />
      </Box>

      <Box pb={3} borderBottom="1px solid" borderColor="divider">
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Adhan Volume
          </Typography>
          <Typography variant="body2" color="primary.main" fontWeight={600}>
            {Math.round(local.notification.adhanVolume * 100)}%
          </Typography>
        </Box>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={local.notification.adhanVolume}
          onChange={(_, value) => setNotification({ adhanVolume: value as number })}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={2}>
          Per-Prayer Alarms
        </Typography>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1fr 1fr' }} gap={2}>
          {PRAYER_NAMES.map((prayerName) => {
            const key = prayerName.toLowerCase() as keyof typeof local.notification.prayers;
            const alarm = local.notification.prayers[key];

            return (
              <Box
                key={prayerName}
                p={2}
                bgcolor="action.hover"
                borderRadius={0.5}
                display="flex"
                flexDirection="column"
                gap={2}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={alarm.enabled}
                      onChange={(event) =>
                        setNotification({
                          prayers: {
                            ...local.notification.prayers,
                            [key]: {
                              ...alarm,
                              enabled: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                  }
                  label={<Typography fontWeight={600}>{prayerName}</Typography>}
                  sx={{
                    m: 0,
                    justifyContent: 'space-between',
                    flexDirection: 'row-reverse',
                  }}
                />

                <Box
                  display="grid"
                  gridTemplateColumns="1fr 1fr"
                  gap={2}
                  sx={{
                    opacity: alarm.enabled ? 1 : 0.4,
                    pointerEvents: alarm.enabled ? 'auto' : 'none',
                  }}
                >
                  <NumberField
                    label="Remind Before (m)"
                    size="small"
                    value={alarm.beforeMinutes}
                    min={0}
                    onValueChange={(value) =>
                      setNotification({
                        prayers: {
                          ...local.notification.prayers,
                          [key]: {
                            ...alarm,
                            beforeMinutes: value ?? 0,
                          },
                        },
                      })
                    }
                  />
                  <NumberField
                    label="Auto-dismiss (m)"
                    size="small"
                    value={alarm.afterMinutes}
                    min={1}
                    onValueChange={(value) =>
                      setNotification({
                        prayers: {
                          ...local.notification.prayers,
                          [key]: {
                            ...alarm,
                            afterMinutes: Math.max(1, value ?? 1),
                          },
                        },
                      })
                    }
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
