import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface ResetSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ResetSettingsDialog({ open, onClose, onConfirm }: ResetSettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset settings to defaults?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will restore the default location, prayer calculation, alarm, and appearance settings for the app.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Reset Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
