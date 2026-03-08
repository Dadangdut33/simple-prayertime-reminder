import { Box, Button, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SettingsHeaderProps {
  saveLabel: string;
  saveState: SaveState;
  onReset: () => void;
}

export default function SettingsHeader({ saveLabel, saveState, onReset }: SettingsHeaderProps) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'center' }}
      flexDirection={{ xs: 'column', md: 'row' }}
      gap={2}
      mb={4}
    >
      <Box>
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 0.5,
              display: 'grid',
              placeItems: 'center',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main}22, ${theme.palette.secondary.main}26)`,
              color: 'primary.main',
            }}
          >
            <SettingsIcon fontSize="small" />
          </Box>
          <Typography variant="h2">Settings</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Adjust location, prayer calculations, alarms, and general app preferences.
        </Typography>
      </Box>

      <Box
        display="flex"
        alignItems={{ xs: 'stretch', md: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={1}
      >
        <Typography variant="body2" color={saveState === 'error' ? 'error.main' : 'text.secondary'}>
          {saveLabel}
        </Typography>
        <Button color="inherit" variant="outlined" startIcon={<RestartAltIcon />} onClick={onReset}>
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
}
