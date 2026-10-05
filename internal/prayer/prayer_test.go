package prayer

import (
	"testing"
	"time"
)

func TestNextPrayerUsesLocationCalendarDate(t *testing.T) {
	svc := NewService()
	svc.SetConfig(PrayerConfig{Latitude: -6.2, Longitude: 106.8, Timezone: "Asia/Jakarta", Method: MethodKemenag})
	// UTC is still the previous day; in Jakarta it is 03:00 on September 8.
	now := time.Date(2026, 9, 7, 20, 0, 0, 0, time.UTC)
	next, err := svc.GetNextPrayer(now)
	if err != nil {
		t.Fatal(err)
	}
	if next.Name != "Fajr" || next.Time.Format(time.DateOnly) != "2026-09-08" || !next.Time.After(now) {
		t.Fatalf("incorrect local-day prayer: %+v", next)
	}
}

func TestInvalidMonth(t *testing.T) {
	svc := NewService()
	for _, month := range []int{0, 13} {
		if _, err := svc.GetMonthSchedule(2026, month); err == nil {
			t.Fatal("invalid month accepted")
		}
	}
}
