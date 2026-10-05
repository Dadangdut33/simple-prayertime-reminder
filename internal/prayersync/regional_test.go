package prayersync

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

func regionalFixture(provider string, first time.Time) []map[string]string {
	var rows []map[string]string
	for d := 0; d < first.AddDate(0, 1, -1).Day(); d++ {
		date := first.AddDate(0, 0, d)
		row := map[string]string{"date": date.Format("02-Jan-2006"), "fajr": "05:30:00", "syuruk": "06:40:00", "dhuhr": "13:00:00", "asr": "16:00:00", "maghrib": "19:00:00", "isha": "20:00:00"}
		if provider == "muis" {
			row = map[string]string{"Date": date.Format(time.DateOnly), "Subuh": "05:30", "Syuruk": "06:40", "Zohor": "13:00", "Asar": "16:00", "Maghrib": "19:00", "Isyak": "20:00"}
		}
		rows = append(rows, row)
	}
	return rows
}

func TestRegionalMonthsValidation(t *testing.T) {
	first := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	for _, provider := range []string{"jakim", "muis"} {
		for _, mode := range []string{"valid", "missing", "duplicate", "bad time", "wrong source"} {
			t.Run(provider+"/"+mode, func(t *testing.T) {
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					rows := regionalFixture(provider, first)
					switch mode {
					case "missing":
						rows = rows[:len(rows)-1]
					case "duplicate":
						rows[1] = rows[0]
					case "bad time":
						rows[0]["fajr"], rows[0]["Subuh"] = "25:00", "25:00"
					}
					zone, dataset := "WLY01", muisDataset
					if mode == "wrong source" {
						zone, dataset = "SGR01", "other"
					}
					var payload any = map[string]any{"status": "OK!", "zone": zone, "prayerTime": rows}
					if provider == "muis" {
						payload = map[string]any{"success": true, "result": map[string]any{"resource_id": dataset, "total": len(rows), "records": rows}}
					}
					_ = json.NewEncoder(w).Encode(payload)
				}))
				defer server.Close()
				var ref reference
				var err error
				if provider == "jakim" {
					ref, err = fetchJakimMonth(context.Background(), server.Client(), server.URL, prayer.PrayerConfig{Timezone: "Asia/Kuala_Lumpur"}, "WLY01", first)
				} else {
					ref, err = fetchMUISMonth(context.Background(), server.Client(), server.URL, prayer.PrayerConfig{Timezone: "Asia/Singapore"}, first)
				}
				if mode == "valid" {
					if err != nil || len(ref.Days) != 30 {
						t.Fatalf("valid month rejected: %v", err)
					}
					_, offset := ref.Days["2026-09-10"].Fajr.Zone()
					if offset != 8*3600 {
						t.Fatal("used wrong timezone")
					}
				} else if err == nil {
					t.Fatal("invalid month accepted")
				}
			})
		}
	}
}

func TestDiyanetCoverageAndDistrictValidation(t *testing.T) {
	for _, mode := range []string{"valid", "stale", "duplicate", "wrong district", "wrong province"} {
		t.Run(mode, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var data any
				switch r.URL.Path {
				case "/sehirler/2":
					data = []map[string]string{{"SehirID": "539", "SehirAdi": "İSTANBUL"}}
				case "/ilceler/539":
					data = []map[string]string{{"IlceID": "9541", "IlceAdi": "İSTANBUL"}}
				case "/vakitler/9541":
					var rows []map[string]string
					for _, date := range []string{"10.09.2026", "11.09.2026"} {
						rows = append(rows, map[string]string{"MiladiTarihKisa": date, "Imsak": "05:00", "Gunes": "06:30", "GunesDogus": "06:37", "Ogle": "13:00", "Ikindi": "16:00", "Aksam": "19:00", "Yatsi": "20:30"})
					}
					if mode == "stale" {
						rows[1]["MiladiTarihKisa"] = "09.09.2026"
					}
					if mode == "duplicate" {
						rows[1] = rows[0]
					}
					data = rows
				default:
					t.Errorf("unexpected request: %s", r.URL.Path)
				}
				_ = json.NewEncoder(w).Encode(data)
			}))
			defer server.Close()
			m := New(prayer.NewService(), "", nil)
			m.diyanetEndpoint = server.URL
			m.now = func() time.Time { return time.Date(2026, 9, 10, 1, 0, 0, 0, time.UTC) }
			online := Config{Provider: "diyanet", CityID: "9541", RegionID: "539"}
			if mode == "wrong district" {
				online.CityID = "111"
			}
			if mode == "wrong province" {
				online.RegionID = "111"
			}
			ref, err := m.fetchDiyanet(context.Background(), prayer.PrayerConfig{Timezone: "Europe/Istanbul"}, online)
			if mode == "valid" {
				if err != nil {
					t.Fatal(err)
				}
				if ref.Days["2026-09-10"].Sunrise.Format("15:04") != "06:30" {
					t.Fatal("used astronomical sunrise instead of timetable Gunes")
				}
			} else if err == nil {
				t.Fatal("invalid district or coverage accepted")
			}
		})
	}
}

func TestMUISYearBoundaryKeepsCurrentMonth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var rows []map[string]string
		if r.URL.Query().Get("q") == `{"Date":"2026-12"}` {
			rows = regionalFixture("muis", time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "result": map[string]any{"resource_id": muisDataset, "total": len(rows), "records": rows}})
	}))
	defer server.Close()
	m := New(prayer.NewService(), "", nil)
	m.muisEndpoint = server.URL
	m.now = func() time.Time { return time.Date(2026, 12, 10, 1, 0, 0, 0, time.UTC) }
	cfg := prayer.PrayerConfig{Timezone: "Asia/Singapore", Latitude: 1.3, Longitude: 103.8, AutoOffsetEnabled: true}
	m.prayer.SetConfig(cfg)
	m.Configure(cfg, Config{Enabled: true, Provider: "muis"})
	status, err := m.Sync(context.Background())
	if err != nil || !status.TodayActive || status.ThroughDate != "2026-12-31" || status.LastError == "" {
		t.Fatalf("valid December discarded: %+v %v", status, err)
	}
}

func TestRegionalConfigAndZones(t *testing.T) {
	for i, name := range []string{"Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"} {
		date, err := time.Parse("02-Jan-2006", malayMonths.Replace("01-"+name+"-2026"))
		if err != nil || date.Month() != time.Month(i+1) {
			t.Fatalf("Malay month %s failed: %v", name, err)
		}
	}
	if len(malaysiaZones()) < 50 {
		t.Fatal("zone catalogue missing")
	}
	for _, cfg := range []Config{{Provider: "jakim", CityID: "BAD01"}, {Provider: "diyanet", CityID: "../"}, {Provider: "diyanet", RegionID: "abcd"}} {
		if cfg.Validate() == nil {
			t.Fatal("invalid identifier accepted")
		}
	}
	if _, err := regionalLocation(prayer.PrayerConfig{Timezone: "Asia/Jakarta"}, "MUIS", "Asia/Singapore"); err == nil {
		t.Fatal("wrong timezone accepted")
	}
	if _, err := regionalLocation(prayer.PrayerConfig{Timezone: "Asia/Singapore", AsrMethod: prayer.AsrHanafi}, "MUIS", "Asia/Singapore"); err == nil {
		t.Fatal("incompatible Asr accepted")
	}
}

func TestLiveRegional(t *testing.T) {
	if os.Getenv("PRAYERTIME_LIVE_TEST") != "1" {
		t.Skip("set PRAYERTIME_LIVE_TEST=1")
	}
	for _, item := range []struct {
		provider, zone, id, region string
		lat, lon                   float64
	}{
		{"jakim", "Asia/Kuala_Lumpur", "WLY01", "", 3.14, 101.69},
		{"jakim", "Asia/Kuching", "SWK08", "", 1.55, 110.35},
		{"diyanet", "Europe/Istanbul", "9541", "539", 41.01, 28.98},
		{"muis", "Asia/Singapore", "", "", 1.35, 103.82},
	} {
		t.Run(item.provider+item.id, func(t *testing.T) {
			cfg := prayer.PrayerConfig{Timezone: item.zone, Latitude: item.lat, Longitude: item.lon, Method: prayer.MethodMWL, AutoOffsetEnabled: true}
			m := New(prayer.NewService(), "", nil)
			m.prayer.SetConfig(cfg)
			m.Configure(cfg, Config{Provider: item.provider, Enabled: true, CityID: item.id, RegionID: item.region})
			status, err := m.Sync(context.Background())
			if err != nil || !status.TodayActive {
				t.Fatalf("sync failed: %+v %v", status, err)
			}
			t.Log(status.MethodName, status.FromDate, status.ThroughDate, strconv.Itoa(len(m.cache.Reference.Days)))
		})
	}
}
