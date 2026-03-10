import { Box, Button, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useTranslation } from 'react-i18next';

interface PrayerTimesHeaderProps {
  onExport: () => void;
}

export default function PrayerTimesHeader({ onExport }: PrayerTimesHeaderProps) {
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
            <CalendarMonthIcon fontSize="small" />
          </Box>
          <Typography variant="h2">{t('prayerTimes.title')}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('prayerTimes.subtitle')}
        </Typography>
      </Box>

      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={onExport}
        >
          {t('prayerTimes.export')}
        </Button>
      </Box>
    </Box>
  );
}
