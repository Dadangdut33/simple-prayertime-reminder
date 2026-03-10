import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { UpdateInfo } from '../../types';
import { useTranslation } from 'react-i18next';

interface UpdateAvailableDialogProps {
  open: boolean;
  update: UpdateInfo;
  onClose: () => void;
  onOpenAction: () => Promise<void>;
}

export default function UpdateAvailableDialog({
  open,
  update,
  onClose,
  onOpenAction,
}: UpdateAvailableDialogProps) {
  const { t } = useTranslation();
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
              {t('updates.recommendedCommand')}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {update.updateCommand}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('updates.later')}
        </Button>
        <Button onClick={() => void onOpenAction()} variant="contained" startIcon={<OpenInNewIcon />}>
          {update.actionLabel || t('updates.openLatest')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
