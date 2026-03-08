import { Box, FormControlLabel, MenuItem, Select, Slider, Stack, Switch, TextField, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { DIGITAL_CLOCK_FORMAT_PRESETS, THEME_PRESETS, type Settings } from '../../../types';

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
  const hijriAdjustmentLabel =
    local.hijriDateOffset === 0
      ? 'No adjustment'
      : `${local.hijriDateOffset > 0 ? '+' : ''}${local.hijriDateOffset} day${
          Math.abs(local.hijriDateOffset) === 1 ? '' : 's'
        }`;

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
              <Typography variant="subtitle1">Dashboard Clock</Typography>
              <Typography variant="body2" color="text.secondary">
                Control whether the dashboard shows a clock, and only reveal the options that apply to the selected
                clock style.
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
            label="Show on dashboard"
            sx={{ m: 0 }}
          />
        </Box>

        {local.dashboard.showClock ? (
          <Box mt={3} display="flex" flexDirection="column" gap={3}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
              <Box>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                  Clock Style
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
                  <MenuItem value="digital">Digital Clock</MenuItem>
                  <MenuItem value="analog">Analog Clock</MenuItem>
                </Select>
              </Box>
            </Box>

            {local.dashboard.clockType === 'digital' && (
              <Box p={2.5} border="1px solid" borderColor="divider" borderRadius={0.5} bgcolor="background.paper">
                <Typography variant="subtitle2" mb={2}>
                  Digital Clock Settings
                </Typography>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                      Display Format
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
                          {preset.label}
                          {preset.format ? ` (${preset.format})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>

                  {local.dashboard.digitalClockFormat === 'custom' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" mb={1} display="block">
                        Custom Format
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
                        helperText="Examples: HH:mm:ss, hh:mm A, ddd D MMM, dddd, D MMMM YYYY."
                      />
                    </Box>
                  )}
                </Box>

                <Box mt={2} p={2} borderRadius={0.5} bgcolor="action.hover" color="text.secondary">
                  <Typography variant="caption" display="block">
                    Custom tokens: HH/H 24-hour, hh/h 12-hour, mm minutes, ss seconds, A or a am/pm.
                  </Typography>
                  <Typography variant="caption" display="block">
                    Date tokens: ddd/dddd weekday, D/DD day, MMM/MMMM month, YY/YYYY year.
                  </Typography>
                  <Typography variant="subtitle2" color="text.primary" mt={1.5}>
                    Preview: {clockFormatPreview}
                  </Typography>
                </Box>
              </Box>
            )}

            {local.dashboard.clockType === 'analog' && (
              <Box p={2.5} border="1px solid" borderColor="divider" borderRadius={0.5} bgcolor="background.paper">
                <Typography variant="subtitle2" mb={2}>
                  Analog Clock Settings
                </Typography>

                <Stack spacing={2}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        Clock Size
                      </Typography>
                      <Typography variant="body2" color="primary.main" fontWeight={700}>
                        {Math.round(local.dashboard.analogClockSize)} px
                      </Typography>
                    </Box>
                    <Slider
                      min={160}
                      max={280}
                      step={10}
                      marks={[
                        { value: 160, label: 'S' },
                        { value: 220, label: 'M' },
                        { value: 280, label: 'L' },
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
                      <Typography variant="subtitle2">Hour Numbers</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose whether the analog face shows only 12, 3, 6, and 9, or all twelve hour numbers.
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
                      label="Show all hour numbers"
                      sx={{ m: 0 }}
                    />
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" mt={2.5}>
            The dashboard clock is currently hidden. Enable it to adjust digital or analog options.
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
              <Typography variant="subtitle1">Appearance</Typography>
              <Typography variant="body2" color="text.secondary">
                Control theme mode, prayer-time display format, and your preferred preset colors.
              </Typography>
            </Box>
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                Prayer Time Display
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
                <MenuItem value="24h">24-Hour (14:30)</MenuItem>
                <MenuItem value="12h">12-Hour (02:30 PM)</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                Theme Mode
              </Typography>
              <Select
                size="small"
                fullWidth
                value={local.theme}
                onChange={(event) => setLocal({ ...local, theme: event.target.value })}
              >
                <MenuItem value="system">System Default</MenuItem>
                <MenuItem value="dark">Dark Mode</MenuItem>
                <MenuItem value="light">Light Mode</MenuItem>
              </Select>
            </Box>
          </Box>

          <Box mt={3}>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              Theme Preset
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
                    <Typography variant="subtitle2">{preset.label}</Typography>
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
              <Typography variant="subtitle1">Hijri Date Adjustment</Typography>
              <Typography variant="body2" color="text.secondary">
                Shift the calculated Hijri day when to match your local time if it starts the month slightly earlier or
                later.
              </Typography>
            </Box>
          </Box>

          <Box p={2.5} borderRadius={0.5} bgcolor="background.paper" border="1px solid" borderColor="divider">
            <Typography variant="overline" color="text.secondary" display="block">
              Current Adjustment
            </Typography>
            <Typography variant="h2" color="primary.main" mt={0.5} mb={2}>
              {hijriAdjustmentLabel}
            </Typography>
            <Slider
              min={-2}
              max={2}
              step={1}
              marks={[
                { value: -2, label: '-2' },
                { value: -1, label: '-1' },
                { value: 0, label: '0' },
                { value: 1, label: '+1' },
                { value: 2, label: '+2' },
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
              Leave this at zero unless you intentionally need the Hijri date shown by the app to be shifted.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
