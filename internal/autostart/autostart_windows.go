//go:build windows

package autostart

import (
	"fmt"
	"os"
	"strings"

	"golang.org/x/sys/windows/registry"
)

const runKeyPath = `Software\Microsoft\Windows\CurrentVersion\Run`
const runValueName = "SimplePrayertimeReminder"

func quoteCommandPart(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
}

func Sync(enabled bool) error {
	key, _, err := registry.CreateKey(registry.CURRENT_USER, runKeyPath, registry.SET_VALUE|registry.QUERY_VALUE)
	if err != nil {
		return fmt.Errorf("failed to open Windows autostart registry key: %w", err)
	}
	defer key.Close()

	if !enabled {
		err := key.DeleteValue(runValueName)
		if err != nil && err != registry.ErrNotExist {
			return fmt.Errorf("failed to remove Windows autostart value: %w", err)
		}
		return nil
	}

	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to resolve executable path: %w", err)
	}

	command := quoteCommandPart(executablePath) + " " + BackgroundArg
	if err := key.SetStringValue(runValueName, command); err != nil {
		return fmt.Errorf("failed to write Windows autostart value: %w", err)
	}

	return nil
}
