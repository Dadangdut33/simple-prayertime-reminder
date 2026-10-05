package prayersync

import (
	"context"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"os"
	"testing"
)

// Opt-in contract check against the real provider, separate from offline tests.
func TestLiveAlAdhan(t *testing.T) {
	if os.Getenv("PRAYERTIME_LIVE_TEST") != "1" {
		t.Skip("set PRAYERTIME_LIVE_TEST=1 to check AlAdhan")
	}
	for _, city := range []struct {
		name, zone string
		lat, lon   float64
	}{
		{"Jakarta", "Asia/Jakarta", -6.2, 106.816666},
		{"New York", "America/New_York", 40.7128, -74.0060},
		{"London", "Europe/London", 51.5074, -0.1278},
		{"Sydney", "Australia/Sydney", -33.8688, 151.2093},
		{"Kathmandu", "Asia/Kathmandu", 27.7172, 85.3240},
	} {
		t.Run(city.name, func(t *testing.T) {
			cfg := prayer.PrayerConfig{Latitude: city.lat, Longitude: city.lon, Timezone: city.zone, Method: prayer.MethodMWL, AsrMethod: prayer.AsrShafii, AutoOffsetEnabled: true}
			svc := prayer.NewService()
			svc.SetConfig(cfg)
			m := New(svc, "", nil)
			options := DefaultConfig()
			options.Enabled = true
			m.Configure(cfg, options)
			status, err := m.Sync(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			if !status.TodayActive {
				t.Fatal("no reference for today")
			}
			t.Logf("%s; corrections vs local MWL: %+v", status.MethodName, status.TodayOffsets)
		})
	}
}
