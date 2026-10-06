//go:build !windows

package appservice

import "errors"

// InstallWindowsUpdate is present on every platform so the app service can
// select its updater at runtime. Windows builds provide the installer flow.
func InstallWindowsUpdate(func()) error {
	return errors.New("the Windows installer updater is unavailable on this platform")
}
