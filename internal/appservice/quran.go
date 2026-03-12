package appservice

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"
)

const defaultQuranURL = "https://quran.com"

type QuranBookmark struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type QuranNote struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type QuranData struct {
	Bookmarks []QuranBookmark `json:"bookmarks"`
	Notes     []QuranNote     `json:"notes"`
}

func defaultQuranData() QuranData {
	now := time.Now().UTC().Format(time.RFC3339)
	return QuranData{
		Bookmarks: []QuranBookmark{
			{
				ID:        "default-quran",
				URL:       defaultQuranURL,
				Note:      "",
				CreatedAt: now,
				UpdatedAt: now,
			},
		},
		Notes: []QuranNote{},
	}
}

func ensureDefaultBookmark(data QuranData) QuranData {
	for _, bookmark := range data.Bookmarks {
		if bookmark.URL == defaultQuranURL {
			return data
		}
	}
	defaults := defaultQuranData()
	data.Bookmarks = append(data.Bookmarks, defaults.Bookmarks[0])
	return data
}

func (s *Service) quranDataPath() (string, error) {
	configDir, err := ConfigDirectory()
	if err != nil {
		log.Error("quran data path failed", "error", err)
		return "", err
	}
	return filepath.Join(configDir, "quran.json"), nil
}

func (s *Service) GetQuranData() (QuranData, error) {
	s.quranMu.Lock()
	defer s.quranMu.Unlock()

	path, err := s.quranDataPath()
	if err != nil {
		log.Error("get quran data failed", "error", err)
		return defaultQuranData(), err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return defaultQuranData(), nil
		}
		log.Error("read quran data failed", "error", err)
		return defaultQuranData(), err
	}

	var payload QuranData
	if err := json.Unmarshal(data, &payload); err != nil {
		log.Error("decode quran data failed", "error", err)
		return defaultQuranData(), err
	}

	return ensureDefaultBookmark(payload), nil
}

func (s *Service) SaveQuranData(payload QuranData) error {
	s.quranMu.Lock()
	defer s.quranMu.Unlock()

	path, err := s.quranDataPath()
	if err != nil {
		log.Error("save quran data failed", "error", err)
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		log.Error("save quran data: mkdir failed", "error", err)
		return err
	}

	payload = ensureDefaultBookmark(payload)
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		log.Error("save quran data: marshal failed", "error", err)
		return err
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		log.Error("save quran data: write failed", "error", err)
		return err
	}
	log.Info("quran data saved", "path", path)
	return nil
}
