import { useState } from 'react';
import { BookmarkPlus, Bookmark, BookOpen } from 'lucide-react';
import { Box, Button, Card, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('quran_bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  const add = (url: string) => {
    if (bookmarks.includes(url)) return;
    const next = [...bookmarks, url];
    setBookmarks(next);
    localStorage.setItem('quran_bookmarks', JSON.stringify(next));
  };

  const remove = (url: string) => {
    const next = bookmarks.filter((bookmark) => bookmark !== url);
    setBookmarks(next);
    localStorage.setItem('quran_bookmarks', JSON.stringify(next));
  };

  return { bookmarks, add, remove };
}

export default function Quran() {
  const { t } = useTranslation();
  const { bookmarks, add, remove } = useBookmarks();
  const [currentURL, setCurrentURL] = useState('https://quran.com');

  const isBookmarked = bookmarks.includes(currentURL);

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
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1.25}>
          {bookmarks.length > 0 && (
            <Select
              size="small"
              displayEmpty
              value=""
              sx={{ minWidth: 180 }}
              onChange={(event) => {
                if (event.target.value) {
                  setCurrentURL(event.target.value);
                }
              }}
            >
              <MenuItem disabled value="">
                {t('quran.savedBookmarks')}
              </MenuItem>
              {bookmarks.map((bookmark, index) => (
                <MenuItem key={bookmark} value={bookmark}>
                  {t('quran.bookmarkLabel', { index: index + 1 })}
                </MenuItem>
              ))}
            </Select>
          )}

          <Button
            variant={isBookmarked ? 'contained' : 'outlined'}
            color={isBookmarked ? 'secondary' : 'primary'}
            startIcon={isBookmarked ? <Bookmark size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
            onClick={() => (isBookmarked ? remove(currentURL) : add(currentURL))}
          >
            {isBookmarked ? t('quran.bookmarked') : t('quran.saveBookmark')}
          </Button>
        </Box>
      </Box>

      <Card
        sx={{
          flex: 1,
          p: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: '#fff',
          }}
        >
          <iframe
            src={currentURL}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
            }}
            title={t('quran.webviewTitle')}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </Box>
      </Card>
    </Box>
  );
}
