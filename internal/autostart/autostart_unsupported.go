//go:build !linux && !windows && !darwin

package autostart

func Sync(enabled bool) error {
	if enabled {
		log.Info("autostart requested but unsupported")
	}
	return nil
}
