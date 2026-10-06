import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import type { UpdateInfo } from '@/types';
import { useTranslation } from 'react-i18next';

interface UpdateAvailableDialogProps {
  open: boolean;
  update: UpdateInfo;
  onClose: () => void;
  onInstallUpdate: () => Promise<void>;
  onOpenRelease: () => Promise<void>;
}

export default function UpdateAvailableDialog({
  open,
  update,
  onClose,
  onInstallUpdate,
  onOpenRelease,
}: UpdateAvailableDialogProps) {
  const { t } = useTranslation();
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  async function handleInstallUpdate() {
    setInstalling(true);
    setInstallError(null);
    try {
      await onInstallUpdate();
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('updates.available')}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('updates.versionNotice', {
            latest: update.latestVersion,
            current: update.currentVersion,
          })}
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          {update.updateTitle}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 2,
          }}
        >
          {update.updateDetail}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            <Box component="span" sx={{ fontWeight: 600 }}>
              {t('updates.installMethod')}
            </Box>{' '}
            {update.installMethod}
          </Typography>
        </Box>

        {update.updateCommand ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 0.75,
              }}
            >
              {t('updates.recommendedCommand')}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {update.updateCommand}
            </Typography>
          </Box>
        ) : null}
        {installError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('updates.installFailed', { error: installError })}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('updates.later')}
        </Button>
        <Button onClick={() => void onOpenRelease()} color="inherit" startIcon={<OpenInNewIcon />}>
          {t('updates.viewRelease')}
        </Button>
        {update.canInstallInApp ? (
          <Button
            onClick={() => void handleInstallUpdate()}
            variant="contained"
            disabled={installing}
            startIcon={installing ? <CircularProgress size={18} /> : <SystemUpdateAltIcon />}
          >
            {installing ? t('updates.preparing') : t('updates.installNow')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
