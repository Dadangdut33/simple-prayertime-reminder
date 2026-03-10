import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuranBookmark, QuranData, QuranNote } from '../../../types';
import { getQuranData, saveQuranData } from '../../../bindings';

const DEFAULT_QURAN_URL = 'https://quran.com';
const LEGACY_BOOKMARKS_KEY = 'quran_bookmarks';
const LEGACY_NOTES_KEY = 'quran_notes';

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeBookmark = (raw: unknown): QuranBookmark | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const stamp = nowIso();
    return {
      id: createId(),
      url: raw,
      note: '',
      createdAt: stamp,
      updatedAt: stamp,
    };
  }
  if (typeof raw === 'object' && 'url' in raw) {
    const item = raw as Partial<QuranBookmark> & { url?: unknown };
    if (typeof item.url !== 'string' || !item.url.trim()) return null;
    const stamp = nowIso();
    return {
      id: typeof item.id === 'string' && item.id ? item.id : createId(),
      url: item.url,
      note: typeof item.note === 'string' ? item.note : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : stamp,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : stamp,
    };
  }
  return null;
};

const normalizeNote = (raw: unknown): QuranNote | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<QuranNote>;
  const stamp = nowIso();
  return {
    id: typeof item.id === 'string' && item.id ? item.id : createId(),
    title: typeof item.title === 'string' ? item.title : '',
    body: typeof item.body === 'string' ? item.body : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : stamp,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : stamp,
  };
};

const dedupeBookmarks = (items: QuranBookmark[]) => {
  const seen = new Map<string, QuranBookmark>();
  const ordered: QuranBookmark[] = [];
  items.forEach((item) => {
    const existing = seen.get(item.url);
    if (existing) {
      seen.set(item.url, {
        ...existing,
        ...item,
        id: existing.id,
        note: item.note?.trim() ? item.note : existing.note,
        updatedAt: nowIso(),
      });
      return;
    }
    seen.set(item.url, item);
    ordered.push(item);
  });
  return ordered.map((item) => seen.get(item.url)!).filter(Boolean);
};

const ensureDefaultBookmark = (items: QuranBookmark[]) => {
  if (items.some((bookmark) => bookmark.url === DEFAULT_QURAN_URL)) {
    return items;
  }
  return [
    ...items,
    {
      id: createId(),
      url: DEFAULT_QURAN_URL,
      note: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
};

const defaultData = (): QuranData => ({
  bookmarks: ensureDefaultBookmark([]),
  notes: [],
});

const normalizeData = (data: unknown): QuranData => {
  if (!data || typeof data !== 'object') {
    return defaultData();
  }
  const payload = data as Partial<QuranData>;
  const bookmarks = Array.isArray(payload.bookmarks)
    ? (payload.bookmarks.map(normalizeBookmark).filter(Boolean) as QuranBookmark[])
    : [];
  const notes = Array.isArray(payload.notes)
    ? (payload.notes.map(normalizeNote).filter(Boolean) as QuranNote[])
    : [];
  return {
    bookmarks: ensureDefaultBookmark(dedupeBookmarks(bookmarks)),
    notes,
  };
};

const loadLegacyItems = () => {
  if (typeof localStorage === 'undefined') {
    return { bookmarks: [], notes: [], found: false };
  }
  let found = false;
  let legacyBookmarks: QuranBookmark[] = [];
  let legacyNotes: QuranNote[] = [];

  try {
    const raw = localStorage.getItem(LEGACY_BOOKMARKS_KEY);
    if (raw) {
      found = true;
      const parsed = JSON.parse(raw) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed && 'items' in parsed
          ? (parsed as { items?: unknown[] }).items ?? []
          : [];
      legacyBookmarks = list.map(normalizeBookmark).filter(Boolean) as QuranBookmark[];
    }
  } catch {
    // Ignore legacy parsing errors.
  }

  try {
    const raw = localStorage.getItem(LEGACY_NOTES_KEY);
    if (raw) {
      found = true;
      const parsed = JSON.parse(raw) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed && 'items' in parsed
          ? (parsed as { items?: unknown[] }).items ?? []
          : [];
      legacyNotes = list.map(normalizeNote).filter(Boolean) as QuranNote[];
    }
  } catch {
    // Ignore legacy parsing errors.
  }

  return { bookmarks: legacyBookmarks, notes: legacyNotes, found };
};

const clearLegacyItems = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(LEGACY_BOOKMARKS_KEY);
  localStorage.removeItem(LEGACY_NOTES_KEY);
};

export const formatBookmarkSource = (url: string) => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    const suffix = parsed.search ? `?${parsed.search.slice(1, 40)}${parsed.search.length > 41 ? '…' : ''}` : '';
    return `${parsed.hostname}${path}${suffix}`;
  } catch {
    return url;
  }
};

export const formatNotePreview = (note: QuranNote) => {
  const title = note.title.trim();
  if (title) return title;
  const bodyLine = note.body.split('\n').find((line) => line.trim());
  return bodyLine?.slice(0, 40) ?? '';
};

export const useQuranData = () => {
  const [data, setData] = useState<QuranData>(() => defaultData());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = normalizeData(await getQuranData());
        if (!active) return;
        const legacy = loadLegacyItems();
        if (legacy.found && (legacy.bookmarks.length > 0 || legacy.notes.length > 0)) {
          const merged = normalizeData({
            bookmarks: [...result.bookmarks, ...legacy.bookmarks],
            notes: [...result.notes, ...legacy.notes],
          });
          setData(merged);
          clearLegacyItems();
          void saveQuranData(merged);
        } else {
          setData(result);
        }
      } catch {
        if (active) {
          setData(defaultData());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: QuranData) => {
    setData(next);
    void saveQuranData(next);
  }, []);

  const updateBookmarks = useCallback(
    (updater: (prev: QuranBookmark[]) => QuranBookmark[]) => {
      setData((prev) => {
        const nextBookmarks = ensureDefaultBookmark(dedupeBookmarks(updater(prev.bookmarks)));
        const next = { ...prev, bookmarks: nextBookmarks };
        void saveQuranData(next);
        return next;
      });
    },
    [],
  );

  const updateNotes = useCallback((updater: (prev: QuranNote[]) => QuranNote[]) => {
    setData((prev) => {
      const nextNotes = updater(prev.notes);
      const next = { ...prev, notes: nextNotes };
      void saveQuranData(next);
      return next;
    });
  }, []);

  const addBookmark = useCallback(
    (url: string) => {
      if (!url) return null;
      let created: QuranBookmark | null = null;
      updateBookmarks((prev) => {
        const existing = prev.find((bookmark) => bookmark.url === url);
        if (existing) {
          created = existing;
          return prev;
        }
        const stamp = nowIso();
        created = {
          id: createId(),
          url,
          note: '',
          createdAt: stamp,
          updatedAt: stamp,
        };
        return [...prev, created];
      });
      return created;
    },
    [updateBookmarks],
  );

  const removeBookmark = useCallback(
    (id: string) => {
      updateBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
    },
    [updateBookmarks],
  );

  const removeBookmarkByUrl = useCallback(
    (url: string) => {
      updateBookmarks((prev) => prev.filter((bookmark) => bookmark.url !== url));
    },
    [updateBookmarks],
  );

  const updateBookmark = useCallback(
    (id: string, patch: Partial<QuranBookmark>) => {
      updateBookmarks((prev) =>
        prev.map((bookmark) =>
          bookmark.id === id
            ? {
                ...bookmark,
                ...patch,
                updatedAt: nowIso(),
              }
            : bookmark,
        ),
      );
    },
    [updateBookmarks],
  );

  const addNote = useCallback(
    (title: string) => {
      const stamp = nowIso();
      const note: QuranNote = {
        id: createId(),
        title,
        body: '',
        createdAt: stamp,
        updatedAt: stamp,
      };
      updateNotes((prev) => [...prev, note]);
      return note;
    },
    [updateNotes],
  );

  const removeNote = useCallback(
    (id: string) => {
      updateNotes((prev) => prev.filter((note) => note.id !== id));
    },
    [updateNotes],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<QuranNote>) => {
      updateNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? {
                ...note,
                ...patch,
                updatedAt: nowIso(),
              }
            : note,
        ),
      );
    },
    [updateNotes],
  );

  const importBookmarks = useCallback(
    (incoming: unknown) => {
      const list = Array.isArray(incoming)
        ? incoming
        : typeof incoming === 'object' && incoming && 'items' in incoming
          ? (incoming as { items?: unknown[] }).items ?? []
          : [];
      const normalized = list.map(normalizeBookmark).filter(Boolean) as QuranBookmark[];
      if (normalized.length === 0) return false;
      updateBookmarks((prev) => dedupeBookmarks([...prev, ...normalized]));
      return true;
    },
    [updateBookmarks],
  );

  const importNotes = useCallback(
    (incoming: unknown) => {
      const list = Array.isArray(incoming)
        ? incoming
        : typeof incoming === 'object' && incoming && 'items' in incoming
          ? (incoming as { items?: unknown[] }).items ?? []
          : [];
      const normalized = list.map(normalizeNote).filter(Boolean) as QuranNote[];
      if (normalized.length === 0) return false;
      updateNotes((prev) => {
        const existing = new Map(prev.map((note) => [note.id, note]));
        const next = [...prev];
        normalized.forEach((note) => {
          const current = existing.get(note.id);
          if (current) {
            existing.set(note.id, {
              ...current,
              ...note,
              updatedAt: nowIso(),
            });
            return;
          }
          existing.set(note.id, note);
          next.push(note);
        });
        return next.map((note) => existing.get(note.id)!).filter(Boolean);
      });
      return true;
    },
    [updateNotes],
  );

  const exportBookmarks = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: nowIso(),
        items: data.bookmarks,
      },
      null,
      2,
    );
  }, [data.bookmarks]);

  const exportNotes = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: nowIso(),
        items: data.notes,
      },
      null,
      2,
    );
  }, [data.notes]);

  return useMemo(
    () => ({
      data,
      loading,
      setData: persist,
      addBookmark,
      removeBookmark,
      removeBookmarkByUrl,
      updateBookmark,
      importBookmarks,
      exportBookmarks,
      addNote,
      removeNote,
      updateNote,
      importNotes,
      exportNotes,
    }),
    [
      data,
      loading,
      persist,
      addBookmark,
      removeBookmark,
      removeBookmarkByUrl,
      updateBookmark,
      importBookmarks,
      exportBookmarks,
      addNote,
      removeNote,
      updateNote,
      importNotes,
      exportNotes,
    ],
  );
};
