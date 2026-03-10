import { Box, Button, MenuItem, Select, Typography } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import AddIcon from '@mui/icons-material/Add';
import SortIcon from '@mui/icons-material/Sort';
import type { WorldPrayerSort } from '../../../types';
import { useTranslation } from 'react-i18next';

const SORT_OPTIONS: Array<{ value: WorldPrayerSort; labelKey: string }> = [
  { value: 'manual', labelKey: 'worldPrayer.sortManual' },
  { value: 'name', labelKey: 'worldPrayer.sortName' },
  { value: 'offset', labelKey: 'worldPrayer.sortOffset' },
  { value: 'current-time', labelKey: 'worldPrayer.sortCurrent' },
  { value: 'next-prayer', labelKey: 'worldPrayer.sortNext' },
];

interface WorldPrayerHeaderProps {
  sortBy: WorldPrayerSort;
  onSortChange: (value: WorldPrayerSort) => void;
  onAddCity: () => void;
}

export default function WorldPrayerHeader({ sortBy, onSortChange, onAddCity }: WorldPrayerHeaderProps) {
  const { t } = useTranslation();
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
          <Typography variant="h2">{t('worldPrayer.title')}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('worldPrayer.subtitle')} <b>{t('worldPrayer.noteStrong')}</b> {t('worldPrayer.note')}
        </Typography>
      </Box>

      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={1}>
          <SortIcon fontSize="small" color="action" />
          <Select size="small" value={sortBy} onChange={(event) => onSortChange(event.target.value as WorldPrayerSort)}>
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onAddCity}>
          {t('common.addCity')}
        </Button>
      </Box>
    </Box>
  );
}
