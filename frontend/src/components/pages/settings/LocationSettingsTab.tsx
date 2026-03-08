import { Box, Button, CircularProgress, Switch, TextField, Typography } from '@mui/material';
import NumberField from '../../ui/NumberField';
import type { Settings } from '../../../types';

interface LocationSettingsTabProps {
  local: Settings;
  loading: boolean;
  detectLocation: () => Promise<void>;
  setLocation: (patch: Partial<Settings['location']>) => void;
}

export default function LocationSettingsTab({ local, loading, detectLocation, setLocation }: LocationSettingsTabProps) {
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
          <Typography variant="subtitle1">Auto-Detect Location</Typography>
          <Typography variant="body2" color="text.secondary">
            Use your IP address to find city and coordinates automatically
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
            Detect Now
          </Button>
          <Switch
            checked={local.location.autoDetect}
            onChange={(event) => setLocation({ autoDetect: event.target.checked })}
          />
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
        <TextField
          label="City"
          size="small"
          fullWidth
          value={local.location.city}
          onChange={(event) => setLocation({ city: event.target.value })}
          disabled={local.location.autoDetect}
        />
        <TextField
          label="Country"
          size="small"
          fullWidth
          value={local.location.country}
          onChange={(event) => setLocation({ country: event.target.value })}
          disabled={local.location.autoDetect}
        />
        <TextField
          label="Timezone"
          size="small"
          fullWidth
          value={local.location.timezone}
          onChange={(event) => setLocation({ timezone: event.target.value })}
          disabled={local.location.autoDetect}
        />
        <NumberField
          label="Elevation"
          size="small"
          fullWidth
          value={local.location.elevation}
          step="any"
          onValueChange={(value) =>
            setLocation({
              elevation: value ?? 0,
            })
          }
          disabled={local.location.autoDetect}
        />
        <NumberField
          label="Latitude"
          size="small"
          fullWidth
          value={local.location.latitude}
          step="any"
          onValueChange={(value) =>
            setLocation({
              latitude: value ?? 0,
            })
          }
          disabled={local.location.autoDetect}
        />
        <NumberField
          label="Longitude"
          size="small"
          fullWidth
          value={local.location.longitude}
          step="any"
          onValueChange={(value) =>
            setLocation({
              longitude: value ?? 0,
            })
          }
          disabled={local.location.autoDetect}
        />
      </Box>
    </Box>
  );
}
