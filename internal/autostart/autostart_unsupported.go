//go:build !linux && !windows && !darwin

package autostart

func Sync(enabled bool) error {
	return nil
}
