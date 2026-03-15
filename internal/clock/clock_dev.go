//go:build dev

package clock

import (
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
)

type nowFn func() time.Time

var currentNow nowFn = time.Now

var fakeTimeActive bool

func init() {
	fakeTimeActive = strings.Contains(os.Getenv("LD_PRELOAD"), "libfaketime")
	if !fakeTimeActive {
		return
	}
	currentNow = libfaketimeNow
	logging.With("clock").Info("libfaketime enabled")
}

// Now returns the current time. If libfaketime is active (LD_PRELOAD),
// it returns the faked time with minimal overhead when inactive.
func Now() time.Time {
	return currentNow()
}

// SetTime freezes the clock at the provided time (for tests/debug).
func SetTime(t time.Time) {
	currentNow = func() time.Time { return t }
}

// ClrTime restores the default time source (real or libfaketime).
func ClrTime() {
	if hasFaketime() {
		currentNow = libfaketimeNow
		return
	}
	currentNow = time.Now
}

// SetNow replaces the time source (for tests/debug).
func SetNow(fn func() time.Time) {
	if fn == nil {
		return
	}
	currentNow = fn
}

func hasFaketime() bool {
	return fakeTimeActive
}

func libfaketimeNow() time.Time {
	out, err := exec.Command("date", "+%s%N").Output()
	if err != nil {
		logging.With("clock").Error("libfaketime date command failed", "error", err)
		return time.Now()
	}

	raw := strings.TrimSpace(string(out))

	if len(raw) <= 10 {
		sec, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			logging.With("clock").Error("libfaketime parse seconds failed", "error", err, "raw", raw)
			return time.Now()
		}
		return time.Unix(sec, 0)
	}

	sec, err := strconv.ParseInt(raw[:10], 10, 64)
	if err != nil {
		logging.With("clock").Error("libfaketime parse sec part failed", "error", err, "raw", raw)
		return time.Now()
	}

	nsec, err := strconv.ParseInt(raw[10:], 10, 64)
	if err != nil {
		logging.With("clock").Error("libfaketime parse nsec failed", "error", err, "raw", raw)
		return time.Now()
	}

	return time.Unix(sec, nsec)
}
