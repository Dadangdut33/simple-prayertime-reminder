package settings

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOldSettingsDoNotEnableNetworking(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "settings.json"), []byte(`{"prayer":{"method":"Kemenag","offsets":{"fajr":2}}}`), 0600); err != nil {
		t.Fatal(err)
	}
	svc, err := NewService(dir)
	if err != nil {
		t.Fatal(err)
	}
	cfg := svc.Get()
	if cfg.Prayer.AutoOffset.Enabled || !cfg.Prayer.AutoOffset.OnStartup || cfg.Prayer.AutoOffset.IntervalHours != 24 || cfg.Prayer.AutoOffset.Method != -1 || cfg.Prayer.Offsets.Fajr != 2 {
		t.Fatalf("old settings migrated incorrectly: %+v", cfg.Prayer)
	}
	cfg.Prayer.AutoOffset.Enabled = true
	cfg.Prayer.AutoOffset.IntervalHours = 6
	if err := svc.Update(cfg); err != nil {
		t.Fatal(err)
	}
	restored, err := NewService(dir)
	if err != nil || restored.Get().Prayer.AutoOffset != cfg.Prayer.AutoOffset {
		t.Fatal("auto offset settings were not persisted")
	}
	cfg.Prayer.AutoOffset.IntervalHours = -1
	if svc.Update(cfg) == nil || svc.Get().Prayer.AutoOffset.IntervalHours != 6 {
		t.Fatal("invalid settings replaced valid state")
	}
}
