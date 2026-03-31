package appservice

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func (s *Service) ReadTextFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Error("read text file failed", "error", err, "path", path)
		return "", err
	}
	log.Info("read text file", "path", path)
	return string(data), nil
}

func (s *Service) SelectAdhanAudioFile(isFajr bool, currentPath string) (string, error) {
	app := application.Get()
	if app == nil {
		return "", fmt.Errorf("application runtime not available")
	}

	title := "Select Adhan Audio"
	if isFajr {
		title = "Select Fajr Adhan Audio"
	}

	dialog := app.Dialog.OpenFile().
		SetTitle(title).
		SetButtonText("Select").
		AddFilter("Audio Files (*.wav, *.mp3)", "*.wav;*.mp3").
		AddFilter("WAV Files (*.wav)", "*.wav").
		AddFilter("MP3 Files (*.mp3)", "*.mp3")

	currentPath = strings.TrimSpace(currentPath)
	if currentPath != "" {
		dir := currentPath
		if info, err := os.Stat(currentPath); err == nil && !info.IsDir() {
			dir = filepath.Dir(currentPath)
		}
		dialog.SetDirectory(dir)
	}

	selectedPath, err := dialog.PromptForSingleSelection()
	if err != nil {
		log.Error("select adhan audio failed", "error", err, "fajr", isFajr)
		return "", err
	}
	if selectedPath == "" {
		return "", nil
	}

	ext := strings.ToLower(filepath.Ext(selectedPath))
	if ext != ".wav" && ext != ".mp3" {
		return "", fmt.Errorf("unsupported audio format: %s", ext)
	}

	log.Info("adhan audio selected", "fajr", isFajr, "path", selectedPath)
	return selectedPath, nil
}
