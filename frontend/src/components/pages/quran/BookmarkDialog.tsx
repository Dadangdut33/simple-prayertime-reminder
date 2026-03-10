import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { Dialogs } from '@wailsio/runtime';
import { readTextFile, saveBase64File } from '../../../bindings';
import { formatBookmarkSource } from './storage';
import { QuranBookmark } from '../../../types';

interface BookmarkDialogProps {
  open: boolean;
  activeUrl?: string;
  bookmarks: QuranBookmark[];
  onClose: () => void;
  onNavigate: (url: string) => void;
  onAdd: (url: string) => QuranBookmark | null;
  onUpdate: (id: string, patch: Partial<QuranBookmark>) => void;
  onRemove: (id: string) => void;
  onExport: () => string;
  onImport: (data: unknown) => boolean;
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

export default function BookmarkDialog({
  open,
  activeUrl,
  bookmarks,
  onClose,
  onNavigate,
  onAdd,
  onUpdate,
  onRemove,
  onExport,
  onImport,
}: BookmarkDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuranBookmark | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setManualError(null);
    setManualUrl(activeUrl ?? '');
    setManualNote('');
    if (activeUrl) {
      const match = bookmarks.find((bookmark) => bookmark.url === activeUrl);
      setSelectedId(match?.id ?? bookmarks[0]?.id ?? null);
      return;
    }
    setSelectedId(bookmarks[0]?.id ?? null);
  }, [open, activeUrl, bookmarks]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookmarks;
    return bookmarks.filter((bookmark) => {
      return bookmark.url.toLowerCase().includes(term) || bookmark.note.toLowerCase().includes(term);
    });
  }, [bookmarks, search]);

  const selected = useMemo(
    () => filtered.find((bookmark) => bookmark.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const toBase64 = (text: string) => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const handleExport = async () => {
    try {
      const outputPath = await Dialogs.SaveFile({
        Title: t('quran.bookmarksExportTitle'),
        Filename: `quran_bookmarks_${new Date().toISOString().slice(0, 10)}.json`,
        Filters: [{ DisplayName: t('quran.bookmarksFileLabel'), Pattern: '*.json' }],
        CanCreateDirectories: true,
        ShowHiddenFiles: true,
      });
      if (!outputPath) return;
      const content = onExport();
      await saveBase64File(outputPath, toBase64(content));
      setFeedback({ type: 'success', message: t('quran.bookmarksExportSuccess') });
    } catch {
      setFeedback({ type: 'error', message: t('quran.bookmarksExportFailed') });
    }
  };

  const handleImportClick = async () => {
    const path = await Dialogs.OpenFile({
      Title: t('quran.bookmarksImportTitle'),
      Filters: [{ DisplayName: t('quran.bookmarksFileLabel'), Pattern: '*.json' }],
    });
    if (!path) return;
    try {
      const text = await readTextFile(path);
      const parsed = JSON.parse(text) as unknown;
      const ok = onImport(parsed);
      setFeedback({
        type: ok ? 'success' : 'error',
        message: ok ? t('quran.bookmarksImportSuccess') : t('quran.bookmarksImportFailed'),
      });
    } catch {
      setFeedback({ type: 'error', message: t('quran.bookmarksImportFailed') });
    }
  };

  const handleManualAdd = () => {
    const value = manualUrl.trim();
    if (!value) {
      setManualError(t('quran.bookmarkManualRequired'));
      return;
    }
    setManualError(null);
    const created = onAdd(value);
    if (created && manualNote.trim()) {
      onUpdate(created.id, { note: manualNote.trim() });
    }
    setManualNote('');
    setSelectedId(created?.id ?? null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{t('quran.bookmarksTitle')}</DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
            <TextField
              fullWidth
              size="small"
              label={t('quran.bookmarksSearch')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Stack direction="row" spacing={1}>
              <Button startIcon={<FileUploadOutlinedIcon />} onClick={handleImportClick}>
                {t('common.import')}
              </Button>
              <Button startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport}>
                {t('common.export')}
              </Button>
            </Stack>
          </Stack>
          {feedback && (
            <Alert severity={feedback.type} sx={{ mb: 2 }}>
              {feedback.message}
            </Alert>
          )}
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '300px 1fr' }} gap={2}>
            <Box>
              <Box
                p={2}
                border="1px solid"
                borderColor="divider"
                borderRadius={1}
                mb={2}
                display="flex"
                flexDirection="column"
                gap={1.5}
              >
                <Typography variant="subtitle2">{t('quran.bookmarkManualTitle')}</Typography>
                <TextField
                  size="small"
                  label={t('quran.bookmarkManualUrl')}
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleManualAdd();
                    }
                  }}
                  error={Boolean(manualError)}
                  helperText={manualError ?? t('quran.bookmarkManualHint')}
                />
                <TextField
                  size="small"
                  label={t('quran.bookmarkManualNote')}
                  value={manualNote}
                  onChange={(event) => setManualNote(event.target.value)}
                  multiline
                  minRows={2}
                />
                <Button variant="outlined" onClick={handleManualAdd}>
                  {t('quran.bookmarkManualAdd')}
                </Button>
              </Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                {t('quran.bookmarksCount', { count: filtered.length })}
              </Typography>
              <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {filtered.length === 0 ? (
                  <Box p={2}>
                    <Typography variant="body2" color="text.secondary">
                      {t('quran.bookmarksEmpty')}
                    </Typography>
                  </Box>
                ) : (
                  filtered.map((bookmark) => {
                    const label = formatBookmarkSource(bookmark.url);
                    return (
                      <ListItemButton
                        key={bookmark.id}
                        selected={bookmark.id === selected?.id}
                        onClick={() => setSelectedId(bookmark.id)}
                        alignItems="flex-start"
                      >
                        <ListItemText
                          primary={label}
                          secondary={bookmark.note?.trim() ? bookmark.note : t('quran.bookmarksNoNote')}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    );
                  })
                )}
              </List>
            </Box>
            <Box
              p={2}
              border="1px solid"
              borderColor="divider"
              borderRadius={1}
              minHeight={240}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              {selected ? (
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography variant="subtitle2">{t('quran.bookmarkDetails')}</Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onNavigate(selected.url)}
                        aria-label={t('quran.bookmarkOpen')}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPendingDelete(selected)}
                        aria-label={t('quran.bookmarkDelete')}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  <Divider />
                  <TextField
                    label={t('quran.bookmarkUrlLabel')}
                    size="small"
                    fullWidth
                    value={selected.url}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label={t('quran.bookmarkNoteLabel')}
                    placeholder={t('quran.bookmarkNotePlaceholder')}
                    value={selected.note}
                    onChange={(event) => onUpdate(selected.id, { note: event.target.value })}
                    multiline
                    minRows={4}
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('quran.bookmarksEmpty')}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <DialogTitle>{t('quran.bookmarkDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('quran.bookmarkDeleteBody')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (pendingDelete) {
                onRemove(pendingDelete.id);
              }
              setPendingDelete(null);
            }}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
