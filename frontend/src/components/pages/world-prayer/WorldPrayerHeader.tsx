import { Box, Button, MenuItem, Select, Typography } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import AddIcon from '@mui/icons-material/Add';
import SortIcon from '@mui/icons-material/Sort';
import type { WorldPrayerSort } from '../../../types';

const SORT_OPTIONS: Array<{ value: WorldPrayerSort; label: string }> = [
  { value: 'manual', label: 'Manual order' },
  { value: 'name', label: 'Name' },
  { value: 'offset', label: 'Time difference' },
  { value: 'current-time', label: 'Current time' },
  { value: 'next-prayer', label: 'Next prayer' },
];

interface WorldPrayerHeaderProps {
  sortBy: WorldPrayerSort;
  onSortChange: (value: WorldPrayerSort) => void;
  onAddCity: () => void;
}

export default function WorldPrayerHeader({ sortBy, onSortChange, onAddCity }: WorldPrayerHeaderProps) {
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
            <PublicIcon fontSize="small" />
          </Box>
          <Typography variant="h2">World Cities Prayer Times</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          View prayer time around the world. <b>Please Note</b> that the prayer time is calculated using your locally
          set mode!
        </Typography>
      </Box>

      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={1}>
          <SortIcon fontSize="small" color="action" />
          <Select size="small" value={sortBy} onChange={(event) => onSortChange(event.target.value as WorldPrayerSort)}>
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onAddCity}>
          Add City
        </Button>
      </Box>
    </Box>
  );
}
