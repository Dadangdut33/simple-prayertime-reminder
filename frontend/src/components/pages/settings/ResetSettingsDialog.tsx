import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ResetSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ResetSettingsDialog({ open, onClose, onConfirm }: ResetSettingsDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('settings.reset.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('settings.reset.description')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          {t('settings.reset.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
