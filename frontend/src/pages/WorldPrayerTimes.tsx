import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import * as api from '../bindings';
import { useAppStore } from '../store/appStore';
import type { WorldPrayerCity, WorldPrayerCitySummary, WorldPrayerSort } from '../types';
import { formatCityLabel } from '../utils/helpers';
import WorldPrayerHeader from '../components/pages/world-prayer/WorldPrayerHeader';
import WorldPrayerCityDialog from '../components/pages/world-prayer/WorldPrayerCityDialog';
import WorldPrayerCityCard from '../components/pages/world-prayer/WorldPrayerCityCard';

const DEFAULT_SORT: WorldPrayerSort = 'name';

function getCityKey(city: WorldPrayerCity): string {
  if (city.id) {
    return `id:${city.id}`;
  }
  return `${city.name}-${city.countryCode}-${city.latitude}-${city.longitude}-${city.timezone}`;
}

function sortSummaries(
  summaries: WorldPrayerCitySummary[],
  sortBy: WorldPrayerSort,
  now: Date,
  orderMap: Map<string, number>,
): WorldPrayerCitySummary[] {
  const result = [...summaries];
  switch (sortBy) {
    case 'manual':
      result.sort((a, b) => (orderMap.get(getCityKey(a.city)) ?? 0) - (orderMap.get(getCityKey(b.city)) ?? 0));
      return result;
    case 'offset':
      result.sort((a, b) => a.offsetSeconds - b.offsetSeconds);
      return result;
    case 'current-time': {
      result.sort((a, b) => {
        const base = now.getTime();
        const aTime = base + a.offsetSeconds * 1000;
        const bTime = base + b.offsetSeconds * 1000;
        const aDate = new Date(aTime);
        const bDate = new Date(bTime);
        const aValue = aDate.getUTCHours() * 3600 + aDate.getUTCMinutes() * 60 + aDate.getUTCSeconds();
        const bValue = bDate.getUTCHours() * 3600 + bDate.getUTCMinutes() * 60 + bDate.getUTCSeconds();
        return aValue - bValue;
      });
      return result;
    }
    case 'next-prayer':
      result.sort((a, b) => {
        const aTime = new Date(a.nextPrayer?.time || 0).getTime();
        const bTime = new Date(b.nextPrayer?.time || 0).getTime();
        return aTime - bTime;
      });
      return result;
    case 'name':
    default:
      result.sort((a, b) => {
        const aLabel = a.city.label || a.city.name;
        const bLabel = b.city.label || b.city.name;
        return aLabel.localeCompare(bLabel);
      });
      return result;
  }
}

export default function WorldPrayerTimes() {
  const { settings, updateSettings } = useAppStore();
  const [cities, setCities] = useState<WorldPrayerCity[]>([]);
  const [sortBy, setSortBy] = useState<WorldPrayerSort>(DEFAULT_SORT);
  const [summaries, setSummaries] = useState<WorldPrayerCitySummary[]>([]);
  const [cachedSummaries, setCachedSummaries] = useState<WorldPrayerCitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<WorldPrayerCity | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const skipNextPreferenceSave = useRef(false);
  const settingsReady = Boolean(settings);

  const savedPreferencesKey = useMemo(() => (settings ? JSON.stringify(settings.worldPrayer ?? {}) : ''), [settings]);
  const localPreferencesKey = useMemo(
    () =>
      JSON.stringify({
        cities,
        sortBy,
      }),
    [cities, sortBy],
  );
  const prayerConfigKey = useMemo(
    () =>
      settings
        ? JSON.stringify({
            prayer: settings.prayer,
            timezone: settings.location.timezone,
          })
        : '',
    [settings],
  );

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    skipNextPreferenceSave.current = true;
    setCities(settings.worldPrayer?.cities ?? []);
    setSortBy(settings.worldPrayer?.sortBy ?? DEFAULT_SORT);
  }, [settings]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (skipNextPreferenceSave.current) {
      skipNextPreferenceSave.current = false;
      return;
    }

    if (savedPreferencesKey === localPreferencesKey) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        await updateSettings({
          ...settings,
          worldPrayer: {
            cities,
            sortBy,
          },
        });
      } catch (error) {
        console.error(error);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [cities, localPreferencesKey, savedPreferencesKey, settings, sortBy, updateSettings]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const fetchKey = useMemo(() => cities.map(getCityKey).sort().join('|'), [cities]);
  const fetchCities = useMemo(() => {
    const map = new Map<string, WorldPrayerCity>();
    for (const city of cities) {
      map.set(getCityKey(city), city);
    }
    return Array.from(map.keys())
      .sort()
      .map((key) => map.get(key)!)
      .filter(Boolean);
  }, [fetchKey]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (fetchCities.length === 0) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    let active = true;
    let initial = true;
    const hasData = summaries.length > 0;
    const fetchData = async () => {
      const showLoading = active && initial && !hasData;
      if (showLoading) setLoading(true);
      try {
        const data = await api.getWorldPrayerTimes(fetchCities);
        if (active) setSummaries(data);
      } catch (error) {
        console.error(error);
        // Keep existing data to avoid jarring flashes.
      } finally {
        if (showLoading && active) setLoading(false);
        initial = false;
      }
    };

    void fetchData();
    const interval = window.setInterval(fetchData, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [fetchCities, prayerConfigKey, settingsReady]);

  useEffect(() => {
    if (summaries.length > 0) {
      setCachedSummaries(summaries);
    }
  }, [summaries]);

  const effectiveSummaries = useMemo(() => {
    if (cities.length === 0) return [];
    return summaries.length > 0 ? summaries : cachedSummaries;
  }, [cachedSummaries, cities.length, summaries]);

  const orderMap = useMemo(() => new Map(cities.map((city, index) => [getCityKey(city), index])), [cities]);
  const sortedSummaries = useMemo(
    () => sortSummaries(effectiveSummaries, sortBy, now, orderMap),
    [effectiveSummaries, sortBy, now, orderMap],
  );
  const timeFormat = settings?.timeFormat === '12h' ? '12h' : '24h';
  const nowIso = now.toISOString();

  const handleAddCities = (newCities: WorldPrayerCity[]) => {
    setCities((prev) => {
      const map = new Map(prev.map((city) => [getCityKey(city), city]));
      newCities.forEach((city) => {
        map.set(getCityKey(city), city);
      });
      return Array.from(map.values());
    });
  };

  const handleRemoveCity = (city: WorldPrayerCity) => {
    setCities((prev) => prev.filter((entry) => getCityKey(entry) !== getCityKey(city)));
  };

  const reorderCity = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setCities((prev) => {
      const fromIndex = prev.findIndex((entry) => getCityKey(entry) === fromKey);
      const toIndex = prev.findIndex((entry) => getCityKey(entry) === toKey);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleDragStart = (city: WorldPrayerCity) => (event: DragEvent) => {
    if (sortBy !== 'manual') return;
    const key = getCityKey(city);
    setDraggingKey(key);
    setDragOverKey(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', key);
  };

  const handleDragEnd = () => {
    setDraggingKey(null);
    setDragOverKey(null);
  };

  const handleDragOver = (city: WorldPrayerCity) => (event: DragEvent) => {
    if (sortBy !== 'manual') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const key = getCityKey(city);
    if (key !== dragOverKey) {
      setDragOverKey(key);
    }
  };

  const handleDrop = (city: WorldPrayerCity) => (event: DragEvent) => {
    if (sortBy !== 'manual') return;
    event.preventDefault();
    const targetKey = getCityKey(city);
    const fromKey = event.dataTransfer.getData('text/plain') || draggingKey;
    if (fromKey) {
      reorderCity(fromKey, targetKey);
    }
    setDraggingKey(null);
    setDragOverKey(null);
  };

  return (
    <Box px={{ xs: 2.5, md: 4 }} py={{ xs: 3, md: 4 }}>
      <WorldPrayerHeader sortBy={sortBy} onSortChange={setSortBy} onAddCity={() => setDialogOpen(true)} />

      {cities.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            borderRadius: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" mb={1}>
            No cities added yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a few cities to compare their prayer times.
          </Typography>
        </Paper>
      ) : loading ? (
        <Box display="flex" flexDirection="column" gap={2.5}>
          {[0, 1, 2].map((index) => (
            <Paper
              key={index}
              sx={{
                p: 3,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box display="flex" justifyContent="space-between" gap={2} mb={2}>
                <Box flex={1}>
                  <Skeleton variant="text" width="55%" height={28} />
                  <Skeleton variant="text" width="35%" height={20} />
                  <Skeleton variant="text" width="45%" height={18} />
                </Box>
                <Skeleton variant="circular" width={28} height={28} />
              </Box>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={1.5} mb={2}>
                {[0, 1, 2].map((slot) => (
                  <Skeleton key={slot} variant="rounded" height={72} />
                ))}
              </Box>
              <Skeleton variant="rounded" height={140} />
            </Paper>
          ))}
        </Box>
      ) : sortedSummaries.length === 0 ? (
        <Paper
          sx={{
            p: 3,
            borderRadius: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Unable to load prayer data for the selected cities. Please try again.
          </Typography>
        </Paper>
      ) : (
        <Box display="flex" flexDirection="column" gap={3}>
          {sortedSummaries.map((summary) => (
            <WorldPrayerCityCard
              key={getCityKey(summary.city)}
              summary={summary}
              timeFormat={timeFormat}
              nowIso={nowIso}
              showOrderControls={sortBy === 'manual'}
              draggable={sortBy === 'manual'}
              isDragging={draggingKey === getCityKey(summary.city)}
              isDropTarget={dragOverKey === getCityKey(summary.city)}
              onDragStart={handleDragStart(summary.city)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver(summary.city)}
              onDrop={handleDrop(summary.city)}
              onRemove={() => setPendingRemoval(summary.city)}
            />
          ))}
        </Box>
      )}

      <WorldPrayerCityDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAddCities} />

      <Dialog open={Boolean(pendingRemoval)} onClose={() => setPendingRemoval(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove City</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {pendingRemoval
              ? `Remove ${formatCityLabel(pendingRemoval)} from your list?`
              : 'Remove this city from your list?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingRemoval(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (pendingRemoval) {
                handleRemoveCity(pendingRemoval);
              }
              setPendingRemoval(null);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {cities.length > 0 && sortedSummaries.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" mt={3}>
          Time difference is shown relative to your current location.
        </Typography>
      )}
    </Box>
  );
}
