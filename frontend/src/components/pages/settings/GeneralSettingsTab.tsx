import { Box, FormControlLabel, MenuItem, Select, Slider, Stack, Switch, TextField, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AppsIcon from '@mui/icons-material/Apps';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { DIGITAL_CLOCK_FORMAT_PRESETS, THEME_PRESETS, type Settings } from '../../../types';
import { useTranslation } from 'react-i18next';

interface GeneralSettingsTabProps {
  local: Settings;
  setLocal: (settings: Settings) => void;
  setDashboard: (patch: Partial<Settings['dashboard']>) => void;
  clockFormatPreview: string;
}

const themeSwatches: Record<string, [string, string]> = {
  indigo: ['#4f64f0', '#e2b04a'],
  emerald: ['#158f6a', '#d8a54a'],
  sunset: ['#d85c3a', '#7a5cff'],
  rose: ['#c14f7a', '#e0a43f'],
  ocean: ['#2274a5', '#19a7a1'],
};

export default function GeneralSettingsTab({
  local,
  setLocal,
  setDashboard,
  clockFormatPreview,
}: GeneralSettingsTabProps) {
  const { t } = useTranslation();
  const hijriAdjustmentLabel =
    local.hijriDateOffset === 0
      ? t('settings.general.hijri.noAdjustment')
      : t('settings.general.hijri.adjustmentLabel', {
          value: `${local.hijriDateOffset > 0 ? '+' : ''}${local.hijriDateOffset}`,
          suffix: Math.abs(local.hijriDateOffset) === 1 ? '' : 's',
        });
  const formatHijriMarkLabel = (value: number) =>
    t('settings.general.hijri.adjustmentMark', { value: value > 0 ? `+${value}` : String(value) });

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box
        p={3}
        border="1px solid"
        borderColor="divider"
        borderRadius={0.5}
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.background.paper})`,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={2}
        >
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0.5,
                display: 'grid',
                placeItems: 'center',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}18, ${theme.palette.secondary.main}22)`,
                color: 'primary.main',
                flexShrink: 0,
              }}
            >
              <AccessTimeIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1">{t('settings.general.clock.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.general.clock.description')}
              </Typography>
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={local.dashboard.showClock}
                onChange={(event) => setDashboard({ showClock: event.target.checked })}
              />
            }
            label={t('settings.general.clock.toggle')}
            sx={{ m: 0 }}
          />
        </Box>

        {local.dashboard.showClock ? (
          <Box mt={3} display="flex" flexDirection="column" gap={3}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
              <Box>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                  {t('settings.general.clock.styleLabel')}
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={local.dashboard.clockType}
                  onChange={(event) =>
                    setDashboard({
                      clockType: event.target.value as 'digital' | 'analog',
                    })
                  }
                >
                  <MenuItem value="digital">{t('settings.general.clock.digital')}</MenuItem>
                  <MenuItem value="analog">{t('settings.general.clock.analog')}</MenuItem>
                </Select>
              </Box>
            </Box>

            {local.dashboard.clockType === 'digital' && (
              <Box p={2.5} border="1px solid" borderColor="divider" borderRadius={0.5} bgcolor="background.paper">
                <Typography variant="subtitle2" mb={2}>
                  {t('settings.general.clock.digitalSettings')}
                </Typography>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                      {t('settings.general.clock.displayFormat')}
                    </Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={local.dashboard.digitalClockFormat}
                      onChange={(event) =>
                        setDashboard({
                          digitalClockFormat: event.target.value as typeof local.dashboard.digitalClockFormat,
                        })
                      }
                    >
                      {DIGITAL_CLOCK_FORMAT_PRESETS.map((preset) => (
                        <MenuItem key={preset.value} value={preset.value}>
                          {t(preset.labelKey)}
                          {preset.format ? ` (${preset.format})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  {local.dashboard.digitalClockFormat === 'custom' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" mb={1} display="block">
                        {t('settings.general.clock.customFormat')}
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={local.dashboard.digitalClockCustom}
                        onChange={(event) =>
                          setDashboard({
                            digitalClockCustom: event.target.value,
                          })
                        }
                        helperText={t('settings.general.clock.customFormatHint')}
                      />
                    </Box>
                  )}
                </Box>

                <Box mt={2} p={2} borderRadius={0.5} bgcolor="action.hover" color="text.secondary">
                  <Typography variant="caption" display="block">
                    {t('settings.general.clock.tokensHint')}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {t('settings.general.clock.dateTokensHint')}
                  </Typography>
                  <Typography variant="subtitle2" color="text.primary" mt={1.5}>
                    {t('settings.general.clock.preview', { value: clockFormatPreview })}
                  </Typography>
                </Box>
              </Box>
            )}

            {local.dashboard.clockType === 'analog' && (
              <Box p={2.5} border="1px solid" borderColor="divider" borderRadius={0.5} bgcolor="background.paper">
                <Typography variant="subtitle2" mb={2}>
                  {t('settings.general.clock.analogSettings')}
                </Typography>

                <Stack spacing={2}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        {t('settings.general.clock.clockSize')}
                      </Typography>
                      <Typography variant="body2" color="primary.main" fontWeight={700}>
                        {t('settings.general.clock.sizeValue', {
                          value: Math.round(local.dashboard.analogClockSize),
                        })}
                      </Typography>
                    </Box>
                    <Slider
                      min={160}
                      max={280}
                      step={10}
                      marks={[
                        { value: 160, label: t('settings.general.clock.sizeMarkSmall') },
                        { value: 220, label: t('settings.general.clock.sizeMarkMedium') },
                        { value: 280, label: t('settings.general.clock.sizeMarkLarge') },
                      ]}
                      value={local.dashboard.analogClockSize}
                      onChange={(_, value) => setDashboard({ analogClockSize: value as number })}
                    />
                  </Box>

                  <Box
                    p={2}
                    borderRadius={0.5}
                    bgcolor="action.hover"
                    display="flex"
                    flexDirection="column"
                    justifyContent="space-between"
                    gap={1.5}
                  >
                    <Box>
                      <Typography variant="subtitle2">{t('settings.general.clock.hourNumbers')}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('settings.general.clock.hourNumbersDesc')}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={local.dashboard.showAllClockHours}
                          onChange={(event) =>
                            setDashboard({
                              showAllClockHours: event.target.checked,
                            })
                          }
                        />
                      }
                      label={t('settings.general.clock.showAllHours')}
                      sx={{ m: 0 }}
                    />
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" mt={2.5}>
            {t('settings.general.clock.hidden')}
          </Typography>
        )}
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', xl: '1.1fr 0.9fr' }} gap={3}>
        <Box p={3} border="1px solid" borderColor="divider" borderRadius={0.5}>
          <Box display="flex" gap={1.5} alignItems="flex-start" mb={3}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0.5,
                display: 'grid',
                placeItems: 'center',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.secondary.main}18, ${theme.palette.primary.main}12)`,
                color: 'secondary.main',
                flexShrink: 0,
              }}
            >
              <PaletteOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1">{t('settings.general.appearance.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.general.appearance.description')}
              </Typography>
            </Box>
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {t('settings.general.appearance.timeFormat')}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={local.timeFormat}
                onChange={(event) =>
                  setLocal({
                    ...local,
                    timeFormat: event.target.value as '12h' | '24h',
                  })
                }
              >
                <MenuItem value="24h">{t('settings.general.appearance.timeFormat24')}</MenuItem>
                <MenuItem value="12h">{t('settings.general.appearance.timeFormat12')}</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {t('settings.general.appearance.themeMode')}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={local.theme}
                onChange={(event) => setLocal({ ...local, theme: event.target.value })}
              >
                <MenuItem value="system">{t('settings.general.appearance.themeSystem')}</MenuItem>
                <MenuItem value="dark">{t('settings.general.appearance.themeDark')}</MenuItem>
                <MenuItem value="light">{t('settings.general.appearance.themeLight')}</MenuItem>
              </Select>
            </Box>
          </Box>

          <Box mt={3}>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              {t('settings.general.appearance.themePreset')}
            </Typography>
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: '1fr',
                sm: '1fr 1fr',
                xl: 'repeat(5, 1fr)',
              }}
              gap={2}
            >
              {THEME_PRESETS.map((preset) => {
                const active = local.themePreset === preset.value;

                return (
                  <Box
                    key={preset.value}
                    onClick={() => setLocal({ ...local, themePreset: preset.value })}
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
        </Box>

        <Box
          p={3}
          border="1px solid"
          borderColor="divider"
          borderRadius={0.5}
          sx={{
            background: (theme) =>
              `linear-gradient(180deg, ${theme.palette.secondary.main}0f, ${theme.palette.background.paper})`,
          }}
        >
          <Box display="flex" gap={1.5} alignItems="flex-start" mb={3}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0.5,
                display: 'grid',
                placeItems: 'center',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.secondary.main}16, ${theme.palette.primary.main}12)`,
                color: 'secondary.main',
                flexShrink: 0,
              }}
            >
              <CalendarMonthOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1">{t('settings.general.hijri.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.general.hijri.description')}
              </Typography>
            </Box>
          </Box>

          <Box p={2.5} borderRadius={0.5} bgcolor="background.paper" border="1px solid" borderColor="divider">
            <Typography variant="overline" color="text.secondary" display="block">
              {t('settings.general.hijri.currentAdjustment')}
            </Typography>
            <Typography variant="h2" color="primary.main" mt={0.5} mb={2}>
              {hijriAdjustmentLabel}
            </Typography>
            <Slider
              min={-2}
              max={2}
              step={1}
              marks={[
                { value: -2, label: formatHijriMarkLabel(-2) },
                { value: -1, label: formatHijriMarkLabel(-1) },
                { value: 0, label: formatHijriMarkLabel(0) },
                { value: 1, label: formatHijriMarkLabel(1) },
                { value: 2, label: formatHijriMarkLabel(2) },
              ]}
              value={local.hijriDateOffset}
              onChange={(_, value) =>
                setLocal({
                  ...local,
                  hijriDateOffset: value as number,
                })
              }
            />
            <Typography variant="body2" color="text.secondary" mt={2}>
              {t('settings.general.hijri.hint')}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box p={3} border="1px solid" borderColor="divider" borderRadius={0.5}>
        <Box display="flex" gap={1.5} alignItems="flex-start" mb={3}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 0.5,
              display: 'grid',
              placeItems: 'center',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.secondary.main}18, ${theme.palette.primary.main}12)`,
              color: 'secondary.main',
              flexShrink: 0,
            }}
          >
            <AppsIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1">{t('settings.general.app.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('settings.general.app.description')}
            </Typography>
          </Box>
        </Box>

        <Box display={'grid'} gridTemplateColumns={{ xs: '1fr', xl: '1fr 1fr' }} gap={3}>
          <Box mt={3} p={2.5} borderRadius={0.5} border="1px solid" borderColor="divider" bgcolor="background.paper">
            <Typography variant="subtitle2" mb={0.75}>
              {t('settings.general.app.startup')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('settings.general.app.startupDesc')}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={local.autoStart}
                  onChange={(event) =>
                    setLocal({
                      ...local,
                      autoStart: event.target.checked,
                    })
                  }
                />
              }
              label={t('settings.general.app.startupToggle')}
              sx={{ m: 0 }}
            />
          </Box>

          <Box mt={3} p={2.5} borderRadius={0.5} border="1px solid" borderColor="divider" bgcolor="background.paper">
            <Typography variant="subtitle2" mb={0.75}>
              {t('settings.general.app.tray')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('settings.general.app.trayDesc')}
            </Typography>

            <Box maxWidth={320}>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {t('settings.general.app.trayAction')}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={local.trayLeftClick}
                onChange={(event) =>
                  setLocal({
                    ...local,
                    trayLeftClick: event.target.value as Settings['trayLeftClick'],
                  })
                }
              >
                <MenuItem value="toggle-window">{t('settings.general.app.trayToggle')}</MenuItem>
                <MenuItem value="open-menu">{t('settings.general.app.trayMenu')}</MenuItem>
                <MenuItem value="none">{t('settings.general.app.trayNone')}</MenuItem>
              </Select>
            </Box>
          </Box>

          <Box mt={3} p={2.5} borderRadius={0.5} border="1px solid" borderColor="divider" bgcolor="background.paper">
            <Typography variant="subtitle2" mb={0.75}>
              {t('settings.general.app.testTools')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('settings.general.app.testToolsDesc')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={local.enableTestTools}
                  onChange={(event) => setLocal({ ...local, enableTestTools: event.target.checked })}
                />
              }
              label={t('settings.general.app.testToolsToggle')}
              sx={{ m: 0 }}
            />
          </Box>

          <Box mt={3} p={2.5} borderRadius={0.5} border="1px solid" borderColor="divider" bgcolor="background.paper">
            <Typography variant="subtitle2" mb={0.75}>
              {t('settings.general.app.updates')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('settings.general.app.updatesDesc')}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={local.autoCheckUpdates}
                  onChange={(event) =>
                    setLocal({
                      ...local,
                      autoCheckUpdates: event.target.checked,
                    })
                  }
                />
              }
              label={t('settings.general.app.updatesToggle')}
              sx={{ m: 0 }}
            />
          </Box>

          <Box mt={3} p={2.5} borderRadius={0.5} border="1px solid" borderColor="divider" bgcolor="background.paper">
            <Typography variant="subtitle2" mb={0.75}>
              {t('settings.general.app.logLevel')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('settings.general.app.logLevelDesc')}
            </Typography>

            <Box maxWidth={320}>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {t('settings.general.app.logLevelLabel')}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={local.logLevel ?? 'info'}
                onChange={(event) =>
                  setLocal({
                    ...local,
                    logLevel: event.target.value as Settings['logLevel'],
                  })
                }
              >
                <MenuItem value="debug">{t('settings.general.app.logLevelDebug')}</MenuItem>
                <MenuItem value="info">{t('settings.general.app.logLevelInfo')}</MenuItem>
                <MenuItem value="warn">{t('settings.general.app.logLevelWarn')}</MenuItem>
                <MenuItem value="error">{t('settings.general.app.logLevelError')}</MenuItem>
              </Select>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
