//go:build !dev

package clock

import "time"

// Now returns the current time using the real system clock.
func Now() time.Time {
	return time.Now()
}

// SetTime is a no-op in production builds.
func SetTime(_ time.Time) {}

// ClrTime is a no-op in production builds.
func ClrTime() {}

// SetNow is a no-op in production builds.
func SetNow(_ func() time.Time) {}
