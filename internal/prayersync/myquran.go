package prayersync

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

const myquranSource = "https://api.myquran.com/v3/doc"

// TimetableCity identifies a published city timetable, not a GPS calculation.
type TimetableCity struct {
	ID   string `json:"id"`
	Name string `json:"lokasi"`
}

func getMyQuran(ctx context.Context, client *http.Client, address string, target any) error {
	return getProviderJSON(ctx, client, "myQuran", address, target)
}

func getProviderJSON(ctx context.Context, client *http.Client, provider, address string, target any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "SimplePrayertimeReminder/auto-offset")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("%s request failed: %w", provider, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%s returned HTTP %d", provider, resp.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(target); err != nil {
		return fmt.Errorf("invalid %s response: %w", provider, err)
	}
	return nil
}

func (m *Manager) TimetableCities(ctx context.Context) ([]TimetableCity, error) {
	var payload struct {
		Status bool            `json:"status"`
		Data   []TimetableCity `json:"data"`
	}
	if err := getMyQuran(ctx, m.client, m.myquranEndpoint+"/sholat/kabkota/semua", &payload); err != nil {
		return nil, err
	}
	if !payload.Status || len(payload.Data) == 0 {
		return nil, fmt.Errorf("myQuran returned no cities")
	}
	return payload.Data, nil
}

type myquranPayload struct {
	Status bool `json:"status"`
	Data   struct {
		ID       string                       `json:"id"`
		City     string                       `json:"kabko"`
		Province string                       `json:"prov"`
		Days     map[string]map[string]string `json:"jadwal"`
	} `json:"data"`
}

func fetchMyQuranMonth(ctx context.Context, client *http.Client, endpoint string, cfg prayer.PrayerConfig, cityID string, month time.Time) (reference, error) {
	result := reference{Days: make(map[string]prayer.DaySchedule), Source: myquranSource}
	if cityID == "" {
		return result, fmt.Errorf("select an Indonesian timetable city before syncing")
	}
	if err := (Config{Provider: "myquran", CityID: cityID}).Validate(); err != nil {
		return result, err
	}
	// The API publishes city wall-clock times without UTC offsets. Only interpret
	// them in an explicitly configured Indonesian zone, never the computer's zone.
	if cfg.Timezone != "Asia/Jakarta" && cfg.Timezone != "Asia/Pontianak" && cfg.Timezone != "Asia/Makassar" && cfg.Timezone != "Asia/Jayapura" {
		return result, fmt.Errorf("myQuran requires the selected city's Indonesian timezone in Location settings")
	}
	if cfg.AsrMethod == prayer.AsrHanafi {
		return result, fmt.Errorf("myQuran publishes the Indonesian Shafii timetable; choose Shafii or use AlAdhan for Hanafi")
	}
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		return result, err
	}
	var payload myquranPayload
	address := fmt.Sprintf("%s/sholat/jadwal/%s/%s", endpoint, url.PathEscape(cityID), month.Format("2006-01"))
	result.APIEndpoint = address
	if err := getMyQuran(ctx, client, address, &payload); err != nil {
		return result, err
	}
	first := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, loc)
	if !payload.Status || payload.Data.ID != cityID || payload.Data.City == "" || len(payload.Data.Days) != first.AddDate(0, 1, -1).Day() {
		return result, fmt.Errorf("myQuran did not return a complete month for the selected city")
	}
	result.MethodName = "Kemenag · " + payload.Data.City + " · " + payload.Data.Province
	for dateText, timings := range payload.Data.Days {
		date, err := time.ParseInLocation(time.DateOnly, dateText, loc)
		if err != nil || date.Year() != first.Year() || date.Month() != first.Month() {
			return result, fmt.Errorf("myQuran returned an unexpected date")
		}
		day := prayer.DaySchedule{Date: dateText, IsNormal: true}
		fields := []struct {
			key    string
			target *time.Time
		}{
			{"subuh", &day.Fajr}, {"terbit", &day.Sunrise}, {"dzuhur", &day.Zuhr},
			{"ashar", &day.Asr}, {"maghrib", &day.Maghrib}, {"isya", &day.Isha},
		}
		for _, field := range fields {
			parsed, err := time.ParseInLocation("2006-01-02 15:04", dateText+" "+timings[field.key], loc)
			if err != nil {
				return result, fmt.Errorf("missing or invalid %s time for %s", field.key, dateText)
			}
			*field.target = parsed
		}
		if err := validateDay(day, loc); err != nil {
			return result, err
		}
		result.Days[dateText] = day
	}
	return result, nil
}
