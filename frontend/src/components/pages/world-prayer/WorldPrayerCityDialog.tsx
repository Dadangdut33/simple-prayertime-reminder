import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import * as api from '../../../bindings';
import type { CitySearchResult } from '../../../types';
import { formatCityLabel } from '../../../utils/helpers';

interface WorldPrayerCityDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (cities: CitySearchResult[]) => void;
}

export default function WorldPrayerCityDialog({ open, onClose, onAdd }: WorldPrayerCityDialogProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CitySearchResult[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setOptions([]);
      setSelected([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      api
        .searchCities(trimmed, 50)
        .then((results) => {
          if (active) setOptions(results);
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  const handleAdd = () => {
    if (selected.length === 0) return;
    onAdd(selected);
    setSelected([]);
    setQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Cities</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Search cities from the GeoNames database and add them to your list.
        </Typography>
        <Autocomplete
          multiple
          options={options}
          value={selected}
          loading={loading}
          inputValue={query}
          onInputChange={(_, value) => setQuery(value)}
          filterSelectedOptions
          getOptionLabel={(option) => formatCityLabel(option)}
          onChange={(_, value) => setSelected(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search city"
              size="small"
              placeholder="Type at least 2 characters"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={`${option.id}-${option.label}`}>
              <Box>
                <Typography variant="subtitle2">{formatCityLabel(option)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.timezone || 'Timezone unknown'}
                </Typography>
              </Box>
            </Box>
          )}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd} disabled={selected.length === 0}>
          Add Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
}
