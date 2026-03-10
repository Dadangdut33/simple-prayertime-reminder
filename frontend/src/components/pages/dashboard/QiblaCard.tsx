import { Box, Card, Chip, Typography } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { Location } from '../../../types';
import { Compass as CompassIcon, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QiblaCardProps {
  location: Location | null;
  qiblaDirection: number | null;
  qiblaCompassLabel: string;
}

export default function QiblaCard({ location, qiblaDirection, qiblaCompassLabel }: QiblaCardProps) {
  const { t } = useTranslation();
  return (
    <Card sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 180,
          height: 180,
          pointerEvents: 'none',
        }}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <ExploreIcon fontSize="small" color="primary" />
          <Typography variant="overline" color="text.secondary">
            {t('dashboard.qibla.title')}
          </Typography>
        </Box>
        {location && (
          <Chip
            size="small"
            icon={<PlaceOutlinedIcon />}
            label={`${location.city}, ${location.country}`}
            variant="outlined"
          />
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={3.5}>
        <Box
          sx={{
            position: 'relative',
            width: 168,
            height: 168,
            flexShrink: 0,
            borderRadius: '50%',
            border: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            placeItems: 'center',
            color: 'text.primary',
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0.18,
            }}
          >
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 2" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </svg>

          <Box
            sx={{
              position: 'absolute',
              inset: 18,
              display: 'grid',
              placeItems: 'center',
              transform: `rotate(${qiblaDirection ?? 0}deg)`,
              transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: 'primary.main',
            }}
          >
            <CompassIcon size={92} strokeWidth={1.15} />
            <Box sx={{ position: 'absolute', top: 2, color: 'secondary.main' }}>
              <Navigation size={24} fill="currentColor" />
            </Box>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: 'primary.main',
              }}
            />
          </Box>

          {[
            { label: t('compass.n'), sx: { top: 10, left: '50%', transform: 'translateX(-50%)' } },
            { label: t('compass.s'), sx: { bottom: 10, left: '50%', transform: 'translateX(-50%)' } },
            { label: t('compass.e'), sx: { right: 12, top: '50%', transform: 'translateY(-50%)' } },
            { label: t('compass.w'), sx: { left: 12, top: '50%', transform: 'translateY(-50%)' } },
          ].map((marker) => (
            <Typography
              key={marker.label}
              variant="caption"
              sx={{
                position: 'absolute',
                fontWeight: 800,
                color: 'text.secondary',
                ...marker.sx,
              }}
            >
              {marker.label}
            </Typography>
          ))}
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            {t('dashboard.qibla.title')}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: '2.35rem', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(qiblaDirection ?? 0)}°
          </Typography>
          <Typography variant="body2" color="primary.main" fontWeight={600} mt={0.5}>
            {qiblaCompassLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {t('dashboard.qibla.note')}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
