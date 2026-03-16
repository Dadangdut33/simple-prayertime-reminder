package notification

import (
	"encoding/json"
	"os"
	"path/filepath"
)

func (svc *Service) writeStateLocked(path string, info ReminderInfo) {
	if path == "" {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		log.Error("state dir create failed", "error", err, "path", path)
		return
	}
	data, err := json.Marshal(info)
	if err != nil {
		log.Error("state marshal failed", "error", err)
		return
	}
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		log.Error("state write failed", "error", err, "path", tmpPath)
		return
	}
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(path)
		if err := os.Rename(tmpPath, path); err != nil {
			log.Error("state commit failed", "error", err, "path", path)
		}
	}
}
