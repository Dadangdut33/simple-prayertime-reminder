import { useState, type DragEvent } from 'react';
import { Box, Card, Chip, Collapse, Divider, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { WorldPrayerCitySummary } from '../../../types';
import {
  formatCityLabel,
  formatOffsetSeconds,
  formatTimeInZone,
  getPrayerDisplayName,
  getPrayerList,
} from '../../../utils/helpers';

interface WorldPrayerCityCardProps {
  summary: WorldPrayerCitySummary;
  timeFormat: '12h' | '24h';
  nowIso: string;
  showOrderControls?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onRemove: () => void;
}

export default function WorldPrayerCityCard({
  summary,
  timeFormat,
  nowIso,
  showOrderControls = false,
  draggable = false,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRemove,
}: WorldPrayerCityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { city } = summary;
  const cityLabel = formatCityLabel(city);
  const timezoneLabel = city.timezone || 'Unknown timezone';
  const currentTimeLabel = formatTimeInZone(nowIso, timezoneLabel, timeFormat);
  const nextPrayerLabel = summary.nextPrayer
    ? getPrayerDisplayName(summary.nextPrayer.name, summary.nextPrayer.time)
    : '--';
  const nextPrayerTime = summary.nextPrayer?.time
    ? formatTimeInZone(summary.nextPrayer.time, timezoneLabel, timeFormat)
    : '--:--';

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <Card
      sx={{
        p: 3,
        borderRadius: 0.5,
        cursor: 'pointer',
        contentVisibility: 'auto',
        containIntrinsicSize: '360px',
        outline: '2px dashed',
        outlineColor: isDropTarget ? 'primary.main' : 'transparent',
        outlineOffset: 2,
        opacity: isDragging ? 0.6 : 1,
        transition: 'outline-color 0.2s ease, opacity 0.2s ease',
      }}
      onClick={toggleExpanded}
      role="button"
      tabIndex={0}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleExpanded();
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
        <Box>
          <Typography variant="h3" mb={0.5}>
            {cityLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timezoneLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {city.latitude.toFixed(4)}, {city.longitude.toFixed(4)} • {city.elevation} m
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          {showOrderControls && (
            <IconButton
              size="small"
              draggable={draggable}
              onDragStart={(event) => {
                event.stopPropagation();
                onDragStart?.(event);
              }}
              onDragEnd={(event) => {
                event.stopPropagation();
                onDragEnd?.();
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Reorder ${cityLabel}`}
              sx={{
                cursor: draggable ? 'grab' : 'default',
                '&:active': {
                  cursor: draggable ? 'grabbing' : 'default',
                },
              }}
            >
              <DragIndicatorIcon fontSize="small" color="action" />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              toggleExpanded();
            }}
            aria-label={expanded ? `Collapse ${cityLabel}` : `Expand ${cityLabel}`}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </IconButton>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove ${cityLabel}`}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={1.5} mb={2}>
        <Box
          p={1.5}
          borderRadius={0.5}
          border="1px solid"
          borderColor="divider"
          bgcolor="background.paper"
        >
          <Typography variant="caption" color="text.secondary">
            Time difference
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatOffsetSeconds(summary.offsetSeconds)}
          </Typography>
        </Box>
        <Box
          p={1.5}
          borderRadius={0.5}
          border="1px solid"
          borderColor="divider"
          bgcolor="background.paper"
        >
          <Typography variant="caption" color="text.secondary">
            Current time
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {currentTimeLabel}
          </Typography>
        </Box>
        <Box
          p={1.5}
          borderRadius={0.5}
          border="1px solid"
          borderColor="divider"
          bgcolor="background.paper"
          display="flex"
          flexDirection="column"
          gap={0.5}
        >
          <Typography variant="caption" color="text.secondary">
            Next prayer
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {nextPrayerTime}
          </Typography>
          <Chip size="small" color="primary" label={nextPrayerLabel} sx={{ alignSelf: 'flex-start' }} />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }} gap={1.5}>
          {getPrayerList(summary.today).map((entry) => (
            <Box
              key={entry.name}
              p={1.25}
              borderRadius={0.5}
              border="1px solid"
              borderColor="divider"
              bgcolor="background.paper"
            >
              <Typography variant="caption" color="text.secondary">
                {entry.name}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTimeInZone(entry.time, timezoneLabel, timeFormat)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Card>
  );
}
