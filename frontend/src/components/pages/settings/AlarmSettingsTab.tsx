import { Box, Button, FormControlLabel, Slider, Switch, Typography } from '@mui/material';
import NumberField from '../../ui/NumberField';
import { PRAYER_NAMES, type Settings } from '../../../types';
import { useTranslation } from 'react-i18next';
import { playAdhan, stopAdhan } from '../../../bindings';
interface AlarmSettingsTabProps {
  local: Settings;
  setNotification: (patch: Partial<Settings['notification']>) => void;
}

export default function AlarmSettingsTab({ local, setNotification }: AlarmSettingsTabProps) {
  const { t } = useTranslation();

  const playPreview = async (isFajr: boolean) => {
    try {
      await playAdhan(isFajr);
    } catch (e) {
      console.error('Error playing audio');
      console.error(e);
    }
  };

  const stopPreview = async () => {
    try {
      await stopAdhan();
    } catch (e) {
      console.error('Error stopping audio');
      console.error(e);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
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

      <Box display="flex" flexWrap="wrap" gap={1}>
        <Button variant="outlined" size="small" onClick={() => playPreview(false)}>
          {t('settings.alarms.previewAdhan')}
        </Button>
        <Button variant="outlined" size="small" onClick={() => playPreview(true)}>
          {t('settings.alarms.previewAdhanFajr')}
        </Button>
        <Button variant="outlined" size="small" color="error" onClick={stopPreview}>
          {t('settings.alarms.previewAdhanStop')}
        </Button>
      </Box>

      <Box pb={3} borderBottom="1px solid" borderColor="divider">
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {t('settings.alarms.adhanVolume')}
          </Typography>
          <Typography variant="body2" color="primary.main" fontWeight={600}>
            {t('settings.alarms.adhanVolumeValue', {
              value: Math.round(local.notification.adhanVolume * 100),
            })}
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

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="subtitle1">{t('settings.alarms.persistent')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.alarms.persistentDesc')}
          </Typography>
        </Box>
        <Switch
          checked={local.notification.persistentReminder}
          onChange={(event) => setNotification({ persistentReminder: event.target.checked })}
        />
      </Box>

      <Box>
        <NumberField
          label={t('settings.alarms.autoDismissSeconds')}
          size="small"
          value={local.notification.autoDismissSeconds}
          min={5}
          disabled={local.notification.persistentReminder}
          helperText={local.notification.persistentReminder ? t('settings.alarms.autoDismissDisabled') : undefined}
          onValueChange={(value) =>
            setNotification({
              autoDismissSeconds: Math.max(5, value ?? 5),
            })
          }
        />
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="subtitle1">{t('settings.alarms.autoDismissAfterAdhan')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.alarms.autoDismissAfterAdhanDesc')}
          </Typography>
        </Box>
        <Switch
          checked={local.notification.autoDismissAfterAdhan}
          disabled={!local.notification.playAdhan}
          onChange={(event) => setNotification({ autoDismissAfterAdhan: event.target.checked })}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={2}>
          {t('settings.alarms.title')}
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
                  label={<Typography fontWeight={600}>{t(`prayerNames.${key}`)}</Typography>}
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
                    label={t('settings.alarms.remindBefore')}
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
                    label={t('settings.alarms.remindAfter')}
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
