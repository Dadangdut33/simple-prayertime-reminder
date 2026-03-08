import { Box, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import type { HijriDate, Location } from '../../../types';
import { formatHijri, formatLongDate } from '../../../utils/helpers';

interface DashboardHeaderProps {
  now: Date;
  hijriDate: HijriDate | null;
  location: Location | null;
}

export default function DashboardHeader({ now, hijriDate, location }: DashboardHeaderProps) {
  return (
    <Box mb={4}>
      <Typography variant="h1" gutterBottom>
        {formatLongDate(now)}
      </Typography>
      <Box display="flex" alignItems="center" gap={2} color="text.secondary">
        <Typography variant="body2" fontWeight={500}>
          {formatHijri(hijriDate)}
        </Typography>
        <Box width="4px" height="4px" borderRadius="50%" bgcolor="divider" />
        <Box display="flex" alignItems="center" gap={0.5}>
          <LocationOnIcon fontSize="small" />
          <Typography variant="body2">{location ? `${location.city}, ${location.country}` : 'Detecting...'}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
