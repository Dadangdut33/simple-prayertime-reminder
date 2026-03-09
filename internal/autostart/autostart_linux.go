//go:build linux

package autostart

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func desktopEntryPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("failed to resolve user config directory: %w", err)
	}

	return filepath.Join(configDir, "autostart", "simple-prayertime-reminder.desktop"), nil
}

func quoteExecArg(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
}

func Sync(enabled bool) error {
	entryPath, err := desktopEntryPath()
	if err != nil {
		return err
	}

	if !enabled {
		if err := os.Remove(entryPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("failed to remove autostart entry: %w", err)
		}

		return nil
	}

	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to resolve executable path: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(entryPath), 0o755); err != nil {
		return fmt.Errorf("failed to create autostart directory: %w", err)
	}

	entry := fmt.Sprintf(`[Desktop Entry]
Type=Application
Version=1.0
Name=Simple Prayertime Reminder
Comment=Start Simple Prayertime Reminder in the background
Exec=%s %s
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
`, quoteExecArg(executablePath), BackgroundArg)

	if err := os.WriteFile(entryPath, []byte(entry), 0o644); err != nil {
		return fmt.Errorf("failed to write autostart entry: %w", err)
	}

	return nil
}
