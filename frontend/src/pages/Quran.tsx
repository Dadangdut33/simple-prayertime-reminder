import { useEffect, useState } from 'react';
import { BookmarkPlus, Bookmark, BookOpen } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import BookmarkDialog from '../components/pages/quran/BookmarkDialog';
import NotesDialog from '../components/pages/quran/NotesDialog';
import { useQuranData } from '../components/pages/quran/storage';
import { openURL } from '../bindings';

export default function Quran() {
  const { t } = useTranslation();
  const {
    data,
    addBookmark,
    removeBookmarkByUrl,
    updateBookmark,
    removeBookmark,
    importBookmarks,
    exportBookmarks,
    addNote,
    updateNote,
    removeNote,
    importNotes,
    exportNotes,
  } = useQuranData();
  const { bookmarks, notes } = data;
  const [currentURL, setCurrentURL] = useState('https://quran.com');
  const [urlInput, setUrlInput] = useState('https://quran.com');
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [bookmarkPrompt, setBookmarkPrompt] = useState<'add' | 'remove' | null>(null);

  const isBookmarked = bookmarks.some((bookmark) => bookmark.url === currentURL);

  useEffect(() => {
    setUrlInput(currentURL);
  }, [currentURL]);

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const currentHost = (() => {
    try {
      return new URL(currentURL).hostname;
    } catch {
      return '';
    }
  })();
  const isEmbedFriendly = currentHost.endsWith('quran.com');

  const openExternal = async () => {
    const next = normalizeUrl(currentURL);
    if (next) {
      try {
        await openURL(next);
      } catch {
        window.open(next, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleOpenExternal = () => {
    void openExternal();
  };

  return (
    <Box
      p={4}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        height: '100%',
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={2}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0.5,
                display: 'grid',
                placeItems: 'center',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}22, ${theme.palette.secondary.main}26)`,
                color: 'primary.main',
              }}
            >
              <BookOpen size={18} />
            </Box>
            <Typography variant="h2">{t('quran.title')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('quran.subtitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {t('quran.disclaimer')}
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1.25}>
          <Box display="flex" gap={1.25} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              label={t('quran.currentUrlLabel')}
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const next = normalizeUrl(urlInput);
                  if (next) {
                    setCurrentURL(next);
                  }
                }
              }}
              sx={{ minWidth: 240 }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                const next = normalizeUrl(urlInput);
                if (next) {
                  setCurrentURL(next);
                }
              }}
            >
              {t('quran.goToUrl')}
            </Button>
            <IconButton onClick={handleOpenExternal}>
              <OpenInNewIcon />
            </IconButton>
          </Box>
          <Button variant="outlined" startIcon={<BookmarksOutlinedIcon />} onClick={() => setBookmarkDialogOpen(true)}>
            {t('quran.bookmarksButton', { count: bookmarks.length })}
          </Button>
          <Button variant="outlined" startIcon={<NoteAltOutlinedIcon />} onClick={() => setNotesDialogOpen(true)}>
            {t('quran.notesButton', { count: notes.length })}
          </Button>

          <Button
            variant={isBookmarked ? 'contained' : 'outlined'}
            color={isBookmarked ? 'secondary' : 'primary'}
            startIcon={isBookmarked ? <Bookmark size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
            onClick={() => {
              setBookmarkPrompt(isBookmarked ? 'remove' : 'add');
            }}
          >
            {isBookmarked ? t('quran.bookmarked') : t('quran.saveBookmark')}
          </Button>
        </Box>
      </Box>

      <Card
        sx={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {!isEmbedFriendly && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {t('quran.embedWarning')}{' '}
            <Button variant="text" size="small" onClick={handleOpenExternal} startIcon={<OpenInNewIcon />}>
              {t('quran.openExternal')}
            </Button>
          </Alert>
        )}
        <Box
          sx={{
            height: '100%',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <iframe
            src={currentURL}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title={t('quran.webviewTitle')}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </Box>
      </Card>

      <BookmarkDialog
        open={bookmarkDialogOpen}
        activeUrl={currentURL}
        bookmarks={bookmarks}
        onClose={() => setBookmarkDialogOpen(false)}
        onNavigate={(url) => setCurrentURL(url)}
        onAdd={addBookmark}
        onUpdate={updateBookmark}
        onRemove={removeBookmark}
        onExport={exportBookmarks}
        onImport={importBookmarks}
      />

      <NotesDialog
        open={notesDialogOpen}
        notes={notes}
        onClose={() => setNotesDialogOpen(false)}
        onAdd={addNote}
        onUpdate={updateNote}
        onRemove={removeNote}
        onExport={exportNotes}
        onImport={importNotes}
      />

      <Dialog open={bookmarkPrompt !== null} onClose={() => setBookmarkPrompt(null)}>
        <DialogTitle>
          {bookmarkPrompt === 'add' ? t('quran.bookmarkConfirmAddTitle') : t('quran.bookmarkConfirmRemoveTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {bookmarkPrompt === 'add' ? t('quran.bookmarkConfirmAddBody') : t('quran.bookmarkConfirmRemoveBody')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookmarkPrompt(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color={bookmarkPrompt === 'add' ? 'primary' : 'error'}
            onClick={() => {
              if (bookmarkPrompt === 'add') {
                const next = normalizeUrl(currentURL);
                if (next) {
                  addBookmark(next);
                  setBookmarkDialogOpen(true);
                }
              } else if (bookmarkPrompt === 'remove') {
                removeBookmarkByUrl(currentURL);
              }
              setBookmarkPrompt(null);
            }}
          >
            {bookmarkPrompt === 'add' ? t('quran.bookmarkConfirmAddAction') : t('quran.bookmarkConfirmRemoveAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
