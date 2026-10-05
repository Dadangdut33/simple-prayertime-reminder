package scheduler

import (
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
	"testing"
	"time"
)

func TestRescheduleCancelsCapturedTimers(t *testing.T) {
	// With notifications absent, any stale timer firing would panic.
	svc := NewService(prayer.NewService(), nil, nil)
	oldStop := svc.stopCh
	svc.Stop()
	svc.Stop() // Stop is idempotent.
	for range 100 {
		svc.fireAfterDelay(oldStop, prayerEntry{}, notification.StateOnTime, 0, settings.NotificationSettings{}, "en")
	}
	select {
	case <-oldStop:
	default:
		t.Fatal("old timers were not cancelled")
	}
}

func TestSyncedTimeDoesNotRepeatDeliveredState(t *testing.T) {
	svc := NewService(prayer.NewService(), nil, nil)
	first := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	if !svc.markPrayerTick("Zuhr|ontime", first) {
		t.Fatal("first delivery missing")
	}
	if svc.markPrayerTick("Zuhr|ontime", first.Add(2*time.Minute)) {
		t.Fatal("time adjustment repeated the same day's reminder")
	}
	if !svc.markPrayerTick("Zuhr|after", first) {
		t.Fatal("independent reminder state suppressed")
	}
}
