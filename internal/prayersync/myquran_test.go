package prayersync

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"strings"
	"testing"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

const jakartaID = "58a2fc6ed39fd083f55d4182bf88826d"

func myquranFixture(w http.ResponseWriter, r *http.Request, mutate func(*myquranPayload)) {
	first, _ := time.Parse("2006-01", path.Base(r.URL.Path))
	payload := myquranPayload{Status: true}
	payload.Data.ID = jakartaID
	payload.Data.City, payload.Data.Province = "KOTA JAKARTA", "DKI JAKARTA"
	payload.Data.Days = make(map[string]map[string]string)
	for i := 0; i < first.AddDate(0, 1, -1).Day(); i++ {
		// Recorded Jakarta reference for 2026-09-10; reused for parser fixtures.
		payload.Data.Days[first.AddDate(0, 0, i).Format(time.DateOnly)] = map[string]string{
			"subuh": "04:34", "terbit": "05:45", "dzuhur": "11:53", "ashar": "15:08", "maghrib": "17:54", "isya": "19:03",
		}
	}
	if mutate != nil {
		mutate(&payload)
	}
	_ = json.NewEncoder(w).Encode(payload)
}

func TestMyQuranSyncAndProviderChanges(t *testing.T) {
	m, cfg, options := setup(t, func(w http.ResponseWriter, r *http.Request) { fixture(w, r, nil) })
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.RawQuery != "" {
			t.Error("city provider must not receive GPS coordinates")
		}
		if !strings.HasPrefix(r.URL.Path, "/sholat/jadwal/"+jakartaID+"/") {
			t.Error("wrong city path")
		}
		myquranFixture(w, r, nil)
	}))
	defer server.Close()
	m.myquranEndpoint = server.URL
	m.now = func() time.Time { return time.Date(2026, 9, 10, 1, 0, 0, 0, time.UTC) }
	options.Provider, options.CityID = "myquran", jakartaID
	cfg.Offsets.Fajr = 1
	m.prayer.SetConfig(cfg)
	m.Configure(cfg, options)
	for range 2 {
		status, err := m.Sync(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if !status.TodayActive || status.Source != myquranSource || !strings.Contains(status.MethodName, "KOTA JAKARTA") {
			t.Fatalf("wrong source: %+v", status)
		}
		day, err := m.prayer.GetScheduleForDate(m.now())
		if err != nil {
			t.Fatal(err)
		}
		if day.Fajr.Format("15:04") != "04:35" || day.Asr.Format("15:04") != "15:08" {
			t.Fatalf("wrong timetable or compounded offset: %+v", day)
		}
	}
	restored := New(m.prayer, m.path, nil)
	restored.now = m.now
	restored.Configure(cfg, options)
	if !restored.Status().TodayActive || restored.Status().Source != myquranSource {
		t.Fatal("offline source was not restored")
	}
	options.CityID = "eda80a3d5b344bc40f3bc04f65b7a357"
	m.Configure(cfg, options)
	if m.Status().TodayActive {
		t.Fatal("previous city's timetable remained active")
	}
	options.Provider = "aladhan"
	m.Configure(cfg, options)
	status, err := m.Sync(context.Background())
	if err != nil || !status.TodayActive || status.Source != sourceURL {
		t.Fatalf("worldwide provider failed after switch: %+v %v", status, err)
	}
}

func TestMyQuranRejectsInvalidTimetables(t *testing.T) {
	for name, mutate := range map[string]func(*myquranPayload){
		"unsuccessful": func(p *myquranPayload) { p.Status = false },
		"wrong city":   func(p *myquranPayload) { p.Data.ID = "other" },
		"missing date": func(p *myquranPayload) { delete(p.Data.Days, "2026-09-10") },
		"wrong month": func(p *myquranPayload) {
			p.Data.Days["2026-10-10"] = p.Data.Days["2026-09-10"]
			delete(p.Data.Days, "2026-09-10")
		},
		"missing prayer": func(p *myquranPayload) { delete(p.Data.Days["2026-09-10"], "subuh") },
		"bad clock":      func(p *myquranPayload) { p.Data.Days["2026-09-10"]["ashar"] = "25:00" },
		"unordered":      func(p *myquranPayload) { p.Data.Days["2026-09-10"]["isya"] = "12:00" },
	} {
		t.Run(name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { myquranFixture(w, r, mutate) }))
			defer server.Close()
			_, err := fetchMyQuranMonth(context.Background(), server.Client(), server.URL, prayer.PrayerConfig{Timezone: "Asia/Jakarta"}, jakartaID, time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC))
			if err == nil {
				t.Fatal("invalid timetable accepted")
			}
		})
	}
}

func TestMyQuranConfigurationChecks(t *testing.T) {
	for _, cfg := range []prayer.PrayerConfig{
		{Timezone: "America/New_York"}, {Timezone: "Asia/Jakarta", AsrMethod: prayer.AsrHanafi},
	} {
		_, err := fetchMyQuranMonth(context.Background(), http.DefaultClient, "http://invalid", cfg, jakartaID, time.Now())
		if err == nil {
			t.Fatal("incompatible configuration accepted")
		}
	}
	for _, cfg := range []Config{{Provider: "unknown"}, {CityID: "../other"}} {
		if cfg.Validate() == nil {
			t.Fatal("invalid provider configuration accepted")
		}
	}
}

func TestLiveMyQuranJakarta(t *testing.T) {
	if os.Getenv("PRAYERTIME_LIVE_TEST") != "1" {
		t.Skip("set PRAYERTIME_LIVE_TEST=1 to check myQuran")
	}
	cfg := prayer.PrayerConfig{Latitude: -6.2, Longitude: 106.816666, Timezone: "Asia/Jakarta", Method: prayer.MethodKemenag, AsrMethod: prayer.AsrShafii, AutoOffsetEnabled: true}
	svc := prayer.NewService()
	svc.SetConfig(cfg)
	m := New(svc, "", nil)
	m.now = func() time.Time { return time.Date(2026, 9, 10, 1, 0, 0, 0, time.UTC) }
	options := DefaultConfig()
	options.Enabled, options.Provider, options.CityID = true, "myquran", jakartaID
	m.Configure(cfg, options)
	if _, err := m.Sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	day, err := svc.GetScheduleForDate(m.now())
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("Jakarta 2026-09-10: %s %s %s %s %s %s", day.Fajr.Format("15:04"), day.Sunrise.Format("15:04"), day.Zuhr.Format("15:04"), day.Asr.Format("15:04"), day.Maghrib.Format("15:04"), day.Isha.Format("15:04"))
	cities, err := m.TimetableCities(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	for _, city := range cities {
		if city.ID == jakartaID {
			return
		}
	}
	t.Fatal("Jakarta missing from city picker")
}
