// Package prayersync downloads dated prayer timetables without changing manual offsets.
package prayersync

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

const sourceURL = "https://aladhan.com/prayer-times-api"

var cityIDPattern = regexp.MustCompile(`^[a-f0-9]{32}$`)
var referenceIDPattern = regexp.MustCompile(`^[a-zA-Z0-9]{1,64}$`)

// Config controls the optional online reference. Empty Provider preserves
// AlAdhan for existing settings. Method applies only to AlAdhan (-1 is regional
// selection); CityID selects a published myQuran city timetable.
type Config struct {
	Provider      string `json:"provider"`
	CityID        string `json:"cityId"`
	CityName      string `json:"cityName"`
	RegionID      string `json:"regionId"`
	RegionName    string `json:"regionName"`
	Enabled       bool   `json:"enabled"`
	OnStartup     bool   `json:"onStartup"`
	IntervalHours int    `json:"intervalHours"`
	Method        int    `json:"method"`
}

func DefaultConfig() Config {
	return Config{OnStartup: true, IntervalHours: 24, Method: -1}
}

func (c Config) Validate() error {
	if (c.CityID != "" && !referenceIDPattern.MatchString(c.CityID)) || (c.RegionID != "" && !referenceIDPattern.MatchString(c.RegionID)) {
		return fmt.Errorf("invalid reference location identifier")
	}
	if c.Provider != "" && c.Provider != "aladhan" && c.Provider != "myquran" && c.Provider != "jakim" && c.Provider != "diyanet" && c.Provider != "muis" {
		return fmt.Errorf("unsupported online timetable provider")
	}
	if c.Provider == "myquran" && c.CityID != "" && !cityIDPattern.MatchString(c.CityID) {
		return fmt.Errorf("invalid Indonesian timetable city")
	}
	if c.Provider == "jakim" && c.CityID != "" && !knownMalaysiaZone(c.CityID) {
		return fmt.Errorf("invalid Malaysian prayer zone")
	}
	if c.Provider == "diyanet" && ((c.CityID != "" && !numericID.MatchString(c.CityID)) || (c.RegionID != "" && !numericID.MatchString(c.RegionID))) {
		return fmt.Errorf("invalid Turkish province or district")
	}
	if c.IntervalHours < 0 || c.IntervalHours > 720 {
		return fmt.Errorf("auto offset interval must be 0 (disabled) or 1–720 hours")
	}
	if c.Method < -1 || c.Method > 23 || c.Method == 6 {
		return fmt.Errorf("unsupported online calculation method")
	}
	return nil
}

type reference struct {
	Source      string                        `json:"source"`
	APIEndpoint string                        `json:"apiEndpoint"`
	Days        map[string]prayer.DaySchedule `json:"days"`
	MethodName  string                        `json:"methodName"`
}

type aladhanDay struct {
	Timings map[string]string `json:"timings"`
	Date    struct {
		Gregorian struct {
			Date string `json:"date"`
		} `json:"gregorian"`
	} `json:"date"`
	Meta struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		Timezone  string  `json:"timezone"`
		Method    struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		} `json:"method"`
	} `json:"meta"`
}

func fetchMonth(ctx context.Context, client *http.Client, endpoint string, cfg prayer.PrayerConfig, method int, month time.Time) (reference, error) {
	result := reference{Days: make(map[string]prayer.DaySchedule), Source: sourceURL}
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		return result, fmt.Errorf("invalid location timezone: %w", err)
	}
	if math.IsNaN(cfg.Latitude) || math.IsNaN(cfg.Longitude) || math.Abs(cfg.Latitude) > 90 || math.Abs(cfg.Longitude) > 180 {
		return result, fmt.Errorf("invalid location coordinates")
	}
	query := url.Values{
		"latitude":  {strconv.FormatFloat(cfg.Latitude, 'f', 6, 64)},
		"longitude": {strconv.FormatFloat(cfg.Longitude, 'f', 6, 64)},
		"iso8601":   {"true"}, "timezonestring": {cfg.Timezone}, "school": {"0"},
	}
	if method >= 0 {
		query.Set("method", strconv.Itoa(method))
	}
	if cfg.AsrMethod == prayer.AsrHanafi {
		query.Set("school", "1")
	}
	address := fmt.Sprintf("%s/calendar/%d/%d?%s", endpoint, month.Year(), month.Month(), query.Encode())
	result.APIEndpoint = address
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return result, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "SimplePrayertimeReminder/auto-offset")
	response, err := client.Do(req)
	if err != nil {
		return result, fmt.Errorf("AlAdhan request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return result, fmt.Errorf("AlAdhan returned HTTP %d", response.StatusCode)
	}
	var payload struct {
		Code int          `json:"code"`
		Data []aladhanDay `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 2<<20)).Decode(&payload); err != nil {
		return result, fmt.Errorf("invalid AlAdhan response: %w", err)
	}
	first := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, loc)
	if payload.Code != 200 || len(payload.Data) != first.AddDate(0, 1, -1).Day() {
		return result, fmt.Errorf("AlAdhan did not return a complete month")
	}
	for _, item := range payload.Data {
		date, err := time.ParseInLocation("02-01-2006", item.Date.Gregorian.Date, loc)
		if err != nil || date.Year() != first.Year() || date.Month() != first.Month() {
			return result, fmt.Errorf("AlAdhan returned an unexpected date")
		}
		if item.Meta.Timezone != cfg.Timezone || math.Abs(item.Meta.Latitude-cfg.Latitude) > 0.01 || math.Abs(item.Meta.Longitude-cfg.Longitude) > 0.01 {
			return result, fmt.Errorf("AlAdhan returned a different location or timezone")
		}
		if item.Meta.Method.Name == "" || (method >= 0 && item.Meta.Method.ID != method) {
			return result, fmt.Errorf("AlAdhan returned a different calculation method")
		}
		if result.MethodName != "" && result.MethodName != item.Meta.Method.Name {
			return result, fmt.Errorf("AlAdhan returned inconsistent calculation methods")
		}
		result.MethodName = item.Meta.Method.Name
		day := prayer.DaySchedule{Date: date.Format(time.DateOnly), IsNormal: true}
		if _, exists := result.Days[day.Date]; exists {
			return result, fmt.Errorf("duplicate timetable date")
		}
		fields := []struct {
			name   string
			target *time.Time
		}{
			{"Fajr", &day.Fajr}, {"Sunrise", &day.Sunrise}, {"Dhuhr", &day.Zuhr},
			{"Asr", &day.Asr}, {"Maghrib", &day.Maghrib}, {"Isha", &day.Isha},
		}
		for _, field := range fields {
			parsed, err := time.Parse(time.RFC3339, item.Timings[field.name])
			if err != nil {
				return result, fmt.Errorf("missing or invalid %s time for %s", field.name, day.Date)
			}
			_, receivedOffset := parsed.Zone()
			_, expectedOffset := parsed.In(loc).Zone()
			if receivedOffset != expectedOffset {
				return result, fmt.Errorf("incorrect UTC offset for %s", day.Date)
			}
			*field.target = parsed.In(loc)
		}
		if err := validateDay(day, loc); err != nil {
			return result, err
		}
		result.Days[day.Date] = day
	}
	return result, nil
}

func validateDay(day prayer.DaySchedule, loc *time.Location) error {
	date, err := time.ParseInLocation(time.DateOnly, day.Date, loc)
	if err != nil {
		return fmt.Errorf("invalid timetable date")
	}
	times := []time.Time{day.Fajr, day.Sunrise, day.Zuhr, day.Asr, day.Maghrib, day.Isha}
	for i, value := range times {
		// Isha may occur after midnight in some locations and seasons.
		if value.Before(date) || !value.Before(date.AddDate(0, 0, 1).Add(6*time.Hour)) || (i < 5 && value.In(loc).Format(time.DateOnly) != day.Date) {
			return fmt.Errorf("prayer time outside expected day: %s", day.Date)
		}
		if i > 0 && !value.After(times[i-1]) {
			return fmt.Errorf("prayer times are not chronological for %s", day.Date)
		}
	}
	return nil
}
