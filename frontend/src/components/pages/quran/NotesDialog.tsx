import { useEffect, useMemo, useState } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
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
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Dialogs } from '@wailsio/runtime';
import { readTextFile, saveBase64File } from '../../../bindings';
import { formatNotePreview } from './storage';
import { QuranNote } from '../../../types';

interface NotesDialogProps {
  open: boolean;
  notes: QuranNote[];
  onClose: () => void;
  onAdd: (title: string) => QuranNote;
  onUpdate: (id: string, patch: Partial<QuranNote>) => void;
  onRemove: (id: string) => void;
  onExport: () => string;
  onImport: (data: unknown) => boolean;
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

export default function NotesDialog({
  open,
  notes,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
  onExport,
  onImport,
}: NotesDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuranNote | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setSelectedId(notes[0]?.id ?? null);
  }, [open, notes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter((note) => {
      return note.title.toLowerCase().includes(term) || note.body.toLowerCase().includes(term);
    });
  }, [notes, search]);

  const selected = useMemo(
    () => filtered.find((note) => note.id === selectedId) ?? filtered[0] ?? null,
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
        Title: t('quran.notesExportTitle'),
        Filename: `quran_notes_${new Date().toISOString().slice(0, 10)}.json`,
        Filters: [{ DisplayName: t('quran.notesFileLabel'), Pattern: '*.json' }],
        CanCreateDirectories: true,
        ShowHiddenFiles: true,
      });
      if (!outputPath) return;
      const content = onExport();
      await saveBase64File(outputPath, toBase64(content));
      setFeedback({ type: 'success', message: t('quran.notesExportSuccess') });
    } catch {
      setFeedback({ type: 'error', message: t('quran.notesExportFailed') });
    }
  };

  const handleImportClick = async () => {
    const path = await Dialogs.OpenFile({
      Title: t('quran.notesImportTitle'),
      Filters: [{ DisplayName: t('quran.notesFileLabel'), Pattern: '*.json' }],
    });
    if (!path) return;
    try {
      const text = await readTextFile(path);
      const parsed = JSON.parse(text) as unknown;
      const ok = onImport(parsed);
      setFeedback({
        type: ok ? 'success' : 'error',
        message: ok ? t('quran.notesImportSuccess') : t('quran.notesImportFailed'),
      });
    } catch {
      setFeedback({ type: 'error', message: t('quran.notesImportFailed') });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>{t('quran.notesTitle')}</DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
            <TextField
              fullWidth
              size="small"
              label={t('quran.notesSearch')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Stack direction="row" spacing={1}>
              <Button startIcon={<AddIcon />} onClick={() => setSelectedId(onAdd(t('quran.notesUntitled')).id)}>
                {t('quran.notesAdd')}
              </Button>
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
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                {t('quran.notesCount', { count: filtered.length })}
              </Typography>
              <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {filtered.length === 0 ? (
                  <Box p={2}>
                    <Typography variant="body2" color="text.secondary">
                      {t('quran.notesEmpty')}
                    </Typography>
                  </Box>
                ) : (
                  filtered.map((note, index) => {
                    const label = formatNotePreview(note) || t('quran.notesLabel', { index: index + 1 });
                    return (
                      <ListItemButton
                        key={note.id}
                        selected={note.id === selected?.id}
                        onClick={() => setSelectedId(note.id)}
                        alignItems="flex-start"
                      >
                        <ListItemText
                          primary={label}
                          secondary={note.body.trim() ? note.body.split('\n')[0] : t('quran.notesEmptyPreview')}
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
              minHeight={320}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              {selected ? (
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography variant="subtitle2">{t('quran.notesDetails')}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setPendingDelete(selected)}
                      aria-label={t('quran.notesDelete')}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Divider />
                  <TextField
                    label={t('quran.notesTitleLabel')}
                    size="small"
                    fullWidth
                    value={selected.title}
                    onChange={(event) => onUpdate(selected.id, { title: event.target.value })}
                  />
                  <Box>
                    <Typography variant="subtitle2" mb={1}>
                      {t('quran.notesBodyLabel')}
                    </Typography>
                    <Box
                      data-color-mode={theme.palette.mode}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        '& .w-md-editor': {
                          backgroundColor: 'transparent',
                        },
                        '& .w-md-editor-toolbar': {
                          backgroundColor: 'transparent',
                          borderBottomColor: 'divider',
                        },
                        '& .w-md-editor-text': {
                          fontFamily: 'inherit',
                        },
                        '& .wmde-markdown': {
                          backgroundColor: 'transparent',
                        },
                      }}
                    >
                      <MDEditor
                        value={selected.body}
                        onChange={(value) => onUpdate(selected.id, { body: value ?? '' })}
                        preview="live"
                        extraCommands={[]}
                        commands={[
                          commands.bold,
                          commands.italic,
                          commands.strikethrough,
                          commands.hr,
                          commands.title,
                          commands.divider,
                          commands.link,
                          commands.quote,
                          commands.code,
                          commands.unorderedListCommand,
                          commands.orderedListCommand,
                          commands.checkedListCommand,
                          commands.divider,
                          commands.codeEdit,
                          commands.codeLive,
                          commands.codePreview,
                        ]}
                        hideToolbar={false}
                        height={320}
                        textareaProps={{
                          placeholder: t('quran.notesBodyPlaceholder'),
                        }}
                      />
                    </Box>
                    {!selected.body.trim() && (
                      <Typography variant="caption" color="text.secondary" mt={1} display="block">
                        {t('quran.notesEmptyPreview')}
                      </Typography>
                    )}
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('quran.notesEmpty')}
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
        <DialogTitle>{t('quran.notesDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('quran.notesDeleteBody')}
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
