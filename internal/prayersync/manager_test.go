package prayersync

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

func fixture(w http.ResponseWriter, r *http.Request, mutate func([]aladhanDay)) {
	parts := strings.Split(r.URL.Path, "/")
	year, _ := strconv.Atoi(parts[len(parts)-2])
	month, _ := strconv.Atoi(parts[len(parts)-1])
	loc, _ := time.LoadLocation(r.URL.Query().Get("timezonestring"))
	first := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, loc)
	var days []aladhanDay
	for i := 0; i < first.AddDate(0, 1, -1).Day(); i++ {
		date := first.AddDate(0, 0, i)
		day := aladhanDay{Timings: make(map[string]string)}
		day.Date.Gregorian.Date = date.Format("02-01-2006")
		day.Meta.Timezone = loc.String()
		day.Meta.Latitude, _ = strconv.ParseFloat(r.URL.Query().Get("latitude"), 64)
		day.Meta.Longitude, _ = strconv.ParseFloat(r.URL.Query().Get("longitude"), 64)
		day.Meta.Method.ID = 20
		day.Meta.Method.Name = "Kemenag"
		for name, hour := range map[string]int{"Fajr": 5, "Sunrise": 6, "Dhuhr": 12, "Asr": 15, "Maghrib": 18, "Isha": 19} {
			day.Timings[name] = time.Date(year, time.Month(month), date.Day(), hour, 0, 0, 0, loc).Format(time.RFC3339)
		}
		days = append(days, day)
	}
	if mutate != nil {
		mutate(days)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"code": 200, "data": days})
}

func setup(t *testing.T, handler http.HandlerFunc) (*Manager, prayer.PrayerConfig, Config) {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	cfg := prayer.PrayerConfig{Latitude: -6.2, Longitude: 106.816666, Timezone: "Asia/Jakarta", Method: prayer.MethodKemenag, AsrMethod: prayer.AsrShafii, AutoOffsetEnabled: true}
	svc := prayer.NewService()
	svc.SetConfig(cfg)
	m := New(svc, filepath.Join(t.TempDir(), "offsets.json"), nil)
	m.now = func() time.Time { return time.Date(2026, 9, 8, 6, 0, 0, 0, time.UTC) }
	m.client, m.endpoint = server.Client(), server.URL
	options := DefaultConfig()
	options.Enabled = true
	m.Configure(cfg, options)
	return m, cfg, options
}

func TestSyncDatesManualOffsetsPersistenceAndFailure(t *testing.T) {
	var fail atomic.Bool
	m, cfg, options := setup(t, func(w http.ResponseWriter, r *http.Request) {
		if fail.Load() {
			http.Error(w, "offline", 503)
			return
		}
		if r.URL.Query().Has("method") {
			t.Error("automatic method should omit method parameter")
		}
		if r.URL.Query().Get("school") != "0" {
			t.Error("incorrect Asr school")
		}
		fixture(w, r, nil)
	})
	cfg.Offsets.Fajr = 2
	m.prayer.SetConfig(cfg)
	m.Configure(cfg, options)
	for range 2 {
		status, err := m.Sync(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if !status.TodayActive || status.FromDate != "2026-09-01" || status.ThroughDate != "2026-10-31" {
			t.Fatalf("unexpected status: %+v", status)
		}
		today, _ := m.prayer.GetScheduleForDate(m.now())
		if today.Fajr.Hour() != 5 || today.Fajr.Minute() != 2 {
			t.Fatalf("manual offset missing or accumulated: %v", today.Fajr)
		}
	}
	month, _ := m.prayer.GetMonthSchedule(2026, 9)
	if month[0].Fajr.Minute() != 2 || month[29].Fajr.Hour() != 5 {
		t.Fatal("monthly schedules do not use reference")
	}
	rangeDays, _ := m.prayer.GetScheduleRange(time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC), time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC))
	if len(rangeDays) != 2 || rangeDays[1].Fajr.Hour() != 5 {
		t.Fatal("month rollover reference missing")
	}
	localConfig := cfg
	localConfig.AutoOffsetEnabled = false
	local := prayer.NewService()
	local.SetConfig(localConfig)
	outside := time.Date(2026, 11, 8, 0, 0, 0, 0, time.UTC)
	expected, _ := local.GetScheduleForDate(outside)
	actual, _ := m.prayer.GetScheduleForDate(outside)
	if actual.Date != expected.Date || !actual.Fajr.Equal(expected.Fajr) || !actual.Isha.Equal(expected.Isha) {
		t.Fatal("correction leaked into an uncached date")
	}
	fail.Store(true)
	status, err := m.Sync(context.Background())
	if err == nil || !status.TodayActive || status.LastError == "" {
		t.Fatal("failed sync did not retain dated cache and report failure")
	}
	restoredService := prayer.NewService()
	restoredService.SetConfig(cfg)
	restored := New(restoredService, m.path, nil)
	restored.now = m.now
	options.OnStartup = false
	options.IntervalHours = 0
	restored.Configure(cfg, options)
	if !restored.Status().TodayActive || restored.Status().NextSync != "" {
		t.Fatal("offline cache or manual-only schedule not restored")
	}
	options.Enabled = false
	cfg.AutoOffsetEnabled = false
	restoredService.SetConfig(cfg)
	restored.Configure(cfg, options)
	if restored.Status().TodayActive {
		t.Fatal("disabled sync still active")
	}
}

func TestRejectInvalidReference(t *testing.T) {
	tests := map[string]func([]aladhanDay){
		"wrong timezone":     func(d []aladhanDay) { d[0].Meta.Timezone = "UTC" },
		"wrong coordinates":  func(d []aladhanDay) { d[0].Meta.Latitude = 30 },
		"wrong month":        func(d []aladhanDay) { d[0].Date.Gregorian.Date = "01-01-2025" },
		"duplicate date":     func(d []aladhanDay) { d[1] = d[0] },
		"missing prayer":     func(d []aladhanDay) { delete(d[0].Timings, "Fajr") },
		"invalid polar time": func(d []aladhanDay) { d[0].Timings["Fajr"] = "-----" },
		"wrong order":        func(d []aladhanDay) { d[0].Timings["Asr"] = d[0].Timings["Fajr"] },
		"wrong offset": func(d []aladhanDay) {
			d[0].Timings["Fajr"] = strings.Replace(d[0].Timings["Fajr"], "+07:00", "+08:00", 1)
		},
	}
	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			m, _, _ := setup(t, func(w http.ResponseWriter, r *http.Request) { fixture(w, r, mutate) })
			status, err := m.Sync(context.Background())
			if err == nil || status.TodayActive {
				t.Fatalf("accepted invalid timetable: %v", err)
			}
		})
	}
}

func TestLocationChangeDiscardsInFlightSync(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	var requests atomic.Int32
	m, cfg, options := setup(t, func(w http.ResponseWriter, r *http.Request) {
		if requests.Add(1) == 1 {
			close(started)
			<-release
		}
		fixture(w, r, nil)
	})
	done := make(chan error, 1)
	go func() { _, err := m.Sync(context.Background()); done <- err }()
	<-started
	cfg.Latitude = -7
	m.prayer.SetConfig(cfg)
	m.Configure(cfg, options)
	close(release)
	if err := <-done; err == nil {
		t.Fatal("old location result was accepted")
	}
	if m.Status().TodayActive {
		t.Fatal("old location cache is active")
	}
}

func TestStartupAndIntervalScheduling(t *testing.T) {
	m, cfg, options := setup(t, func(w http.ResponseWriter, r *http.Request) { fixture(w, r, nil) })
	updated := make(chan struct{}, 2)
	m.onUpdate = func() { updated <- struct{}{} }
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan struct{})
	go func() { m.Run(ctx); close(done) }()
	select {
	case <-updated:
	case <-time.After(5 * time.Second):
		t.Fatal("startup sync did not run")
	}
	if got := m.Status().NextSync; got != m.now().Add(24*time.Hour).Format(time.RFC3339) {
		t.Fatalf("wrong interval: %s", got)
	}
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("sync loop did not stop")
	}
	options.OnStartup, options.IntervalHours = false, 6
	m.Configure(cfg, options)
	if got := m.Status().NextSync; got != m.now().Add(6*time.Hour).Format(time.RFC3339) {
		t.Fatalf("wrong updated interval: %s", got)
	}
}

func TestTimezonesDSTAndHanafi(t *testing.T) {
	for _, zone := range []string{"America/New_York", "Pacific/Auckland", "Asia/Kathmandu"} {
		t.Run(zone, func(t *testing.T) {
			m, cfg, options := setup(t, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Query().Get("school") != "1" || r.URL.Query().Get("method") != "20" {
					t.Error("explicit method/Asr not forwarded")
				}
				fixture(w, r, nil)
			})
			cfg.Timezone, cfg.AsrMethod = zone, prayer.AsrHanafi
			options.Method = 20
			m.prayer.SetConfig(cfg)
			m.Configure(cfg, options)
			if _, err := m.Sync(context.Background()); err != nil {
				t.Fatal(err)
			}
			loc, _ := time.LoadLocation(zone)
			day, _ := m.prayer.GetScheduleForDate(m.now().In(loc))
			if day.Fajr.In(loc).Hour() != 5 {
				t.Fatalf("lost local timezone: %v", day.Fajr)
			}
		})
	}
}

func TestConfigValidation(t *testing.T) {
	for _, interval := range []int{-1, 721} {
		if (Config{IntervalHours: interval, Method: -1}).Validate() == nil {
			t.Fatal("invalid interval accepted")
		}
	}
	for _, method := range []int{-2, 6, 24, 99} {
		if (Config{Method: method}).Validate() == nil {
			t.Fatal(fmt.Sprintf("invalid method %d accepted", method))
		}
	}
}
