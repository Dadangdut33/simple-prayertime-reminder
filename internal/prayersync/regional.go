package prayersync

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
)

const jakimSource = "https://www.e-solat.gov.my/"
const diyanetSource = "https://ezanvakti.emushaf.net/"
const muisDataset = "d_a6a206cba471fe04b62dd886ef5eaf22"
const muisSource = "https://data.gov.sg/datasets/" + muisDataset + "/view"

var numericID = regexp.MustCompile(`^[0-9]{1,8}$`)
var malayMonths = strings.NewReplacer("-Mac-", "-Mar-", "-Mei-", "-May-", "-Ogos-", "-Aug-", "-Okt-", "-Oct-", "-Dis-", "-Dec-")

// Snapshot of the official e-Solat zone selector, retrieved 2026-09-10.
//
//go:embed malaysia_zones.json
var malaysiaZonesJSON []byte

func malaysiaZones() []TimetableCity {
	var zones []TimetableCity
	_ = json.Unmarshal(malaysiaZonesJSON, &zones)
	return zones
}

func knownMalaysiaZone(id string) bool {
	for _, zone := range malaysiaZones() {
		if zone.ID == id {
			return true
		}
	}
	return false
}

func (m *Manager) ReferenceLocations(ctx context.Context, provider, parent string) ([]TimetableCity, error) {
	switch provider {
	case "myquran":
		return m.TimetableCities(ctx)
	case "jakim":
		return malaysiaZones(), nil
	case "diyanet":
		var items []struct {
			ProvinceID   string `json:"SehirID"`
			ProvinceName string `json:"SehirAdi"`
			DistrictID   string `json:"IlceID"`
			DistrictName string `json:"IlceAdi"`
		}
		address := m.diyanetEndpoint + "/sehirler/2" // Türkiye only; foreign timestamps have known upstream issues.
		if parent != "" {
			if !numericID.MatchString(parent) {
				return nil, fmt.Errorf("invalid Turkish province")
			}
			provinces, err := m.ReferenceLocations(ctx, provider, "")
			if err != nil {
				return nil, err
			}
			found := false
			for _, province := range provinces {
				if province.ID == parent {
					found = true
					break
				}
			}
			if !found {
				return nil, fmt.Errorf("province is outside Türkiye")
			}
			address = m.diyanetEndpoint + "/ilceler/" + parent
		}
		if err := getProviderJSON(ctx, m.client, "EzanVakti", address, &items); err != nil {
			return nil, err
		}
		result := make([]TimetableCity, 0, len(items))
		for _, item := range items {
			id, name := item.ProvinceID, item.ProvinceName
			if parent != "" {
				id, name = item.DistrictID, item.DistrictName
			}
			if !numericID.MatchString(id) || name == "" {
				return nil, fmt.Errorf("invalid EzanVakti location list")
			}
			result = append(result, TimetableCity{ID: id, Name: name})
		}
		if len(result) == 0 {
			return nil, fmt.Errorf("EzanVakti returned no locations")
		}
		return result, nil
	default:
		return nil, fmt.Errorf("provider has no selectable locations")
	}
}

// Regional timetables have fixed conventions; do not silently mix a user-selected
// Hanafi shadow factor into a published standard-Asr timetable.
func regionalLocation(cfg prayer.PrayerConfig, provider string, zones ...string) (*time.Location, error) {
	valid := false
	for _, zone := range zones {
		if cfg.Timezone == zone {
			valid = true
		}
	}
	if !valid {
		return nil, fmt.Errorf("%s requires Location timezone %s", provider, strings.Join(zones, " or "))
	}
	if cfg.AsrMethod == prayer.AsrHanafi {
		return nil, fmt.Errorf("%s has fixed standard Asr times; choose Shafii/standard or use AlAdhan for Hanafi", provider)
	}
	return time.LoadLocation(cfg.Timezone)
}

func wallClockDay(date time.Time, clocks []string) (prayer.DaySchedule, error) {
	day := prayer.DaySchedule{Date: date.Format(time.DateOnly), IsNormal: true}
	fields := []*time.Time{&day.Fajr, &day.Sunrise, &day.Zuhr, &day.Asr, &day.Maghrib, &day.Isha}
	if len(clocks) != len(fields) {
		return day, fmt.Errorf("incomplete prayer timetable")
	}
	for i, clock := range clocks {
		layout := "2006-01-02 15:04"
		if len(clock) == 8 {
			layout += ":05"
		}
		parsed, err := time.ParseInLocation(layout, day.Date+" "+clock, date.Location())
		if err != nil {
			return day, fmt.Errorf("invalid prayer time for %s", day.Date)
		}
		*fields[i] = parsed
	}
	return day, validateDay(day, date.Location())
}

func addReferenceDay(ref *reference, day prayer.DaySchedule) error {
	if _, exists := ref.Days[day.Date]; exists {
		return fmt.Errorf("duplicate timetable date: %s", day.Date)
	}
	ref.Days[day.Date] = day
	return nil
}

func fetchJakimMonth(ctx context.Context, client *http.Client, endpoint string, cfg prayer.PrayerConfig, zone string, month time.Time) (reference, error) {
	ref := reference{Days: make(map[string]prayer.DaySchedule), Source: jakimSource, MethodName: "JAKIM · " + zone}
	loc, err := regionalLocation(cfg, "JAKIM", "Asia/Kuala_Lumpur", "Asia/Kuching")
	if err != nil {
		return ref, err
	}
	if !knownMalaysiaZone(zone) {
		return ref, fmt.Errorf("select a Malaysian prayer zone")
	}
	q := url.Values{"r": {"esolatApi/takwimsolat"}, "period": {"month"}, "zone": {zone}, "year": {strconv.Itoa(month.Year())}, "month": {strconv.Itoa(int(month.Month()))}}
	ref.APIEndpoint = endpoint + "?" + q.Encode()
	var payload struct {
		Status string              `json:"status"`
		Zone   string              `json:"zone"`
		Days   []map[string]string `json:"prayerTime"`
	}
	if err := getProviderJSON(ctx, client, "JAKIM", endpoint+"?"+q.Encode(), &payload); err != nil {
		return ref, err
	}
	if payload.Status != "OK!" || payload.Zone != zone {
		return ref, fmt.Errorf("JAKIM returned an unsuccessful or different zone timetable")
	}
	first := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, loc)
	if len(payload.Days) != first.AddDate(0, 1, -1).Day() {
		return ref, fmt.Errorf("JAKIM did not return a complete month")
	}
	for _, row := range payload.Days {
		date, err := time.ParseInLocation("02-Jan-2006", malayMonths.Replace(row["date"]), loc)
		if err != nil || date.Year() != first.Year() || date.Month() != first.Month() {
			return ref, fmt.Errorf("JAKIM returned an unexpected date")
		}
		day, err := wallClockDay(date, []string{row["fajr"], row["syuruk"], row["dhuhr"], row["asr"], row["maghrib"], row["isha"]})
		if err != nil {
			return ref, err
		}
		if err := addReferenceDay(&ref, day); err != nil {
			return ref, err
		}
	}
	return ref, nil
}

func (m *Manager) fetchDiyanet(ctx context.Context, cfg prayer.PrayerConfig, online Config) (reference, error) {
	ref := reference{Days: make(map[string]prayer.DaySchedule), Source: diyanetSource}
	loc, err := regionalLocation(cfg, "Diyanet via EzanVakti", "Europe/Istanbul", "Asia/Istanbul", "Turkey")
	if err != nil {
		return ref, err
	}
	if !numericID.MatchString(online.CityID) || !numericID.MatchString(online.RegionID) {
		return ref, fmt.Errorf("select a Turkish province and district")
	}
	districts, err := m.ReferenceLocations(ctx, "diyanet", online.RegionID)
	if err != nil {
		return ref, err
	}
	for _, district := range districts {
		if district.ID == online.CityID {
			ref.MethodName = "Diyanet via EzanVakti · " + district.Name
			break
		}
	}
	if ref.MethodName == "" {
		return ref, fmt.Errorf("district does not belong to the selected Turkish province")
	}
	var rows []map[string]json.RawMessage
	ref.APIEndpoint = m.diyanetEndpoint + "/vakitler/" + online.CityID
	if err := getProviderJSON(ctx, m.client, "EzanVakti", ref.APIEndpoint, &rows); err != nil {
		return ref, err
	}
	if len(rows) < 2 || len(rows) > 62 {
		return ref, fmt.Errorf("invalid EzanVakti coverage")
	}
	for _, row := range rows {
		get := func(key string) string { var s string; _ = json.Unmarshal(row[key], &s); return s }
		date, err := time.ParseInLocation("02.01.2006", get("MiladiTarihKisa"), loc)
		if err != nil {
			return ref, fmt.Errorf("invalid EzanVakti date")
		}
		// Use timetable Gunes, not the separately exposed astronomical GunesDogus.
		day, err := wallClockDay(date, []string{get("Imsak"), get("Gunes"), get("Ogle"), get("Ikindi"), get("Aksam"), get("Yatsi")})
		if err != nil {
			return ref, err
		}
		if err := addReferenceDay(&ref, day); err != nil {
			return ref, err
		}
	}
	today := m.now().In(loc)
	dates := make([]string, 0, len(ref.Days))
	for date := range ref.Days {
		dates = append(dates, date)
	}
	sort.Strings(dates)
	for i := 1; i < len(dates); i++ {
		previous, _ := time.Parse(time.DateOnly, dates[i-1])
		if previous.AddDate(0, 0, 1).Format(time.DateOnly) != dates[i] {
			return ref, fmt.Errorf("EzanVakti returned a gap in timetable coverage")
		}
	}
	for i := 0; i < 2; i++ {
		if _, found := ref.Days[today.AddDate(0, 0, i).Format(time.DateOnly)]; !found {
			return ref, fmt.Errorf("EzanVakti timetable is stale: today and tomorrow are required")
		}
	}
	return ref, nil
}

func fetchMUISMonth(ctx context.Context, client *http.Client, endpoint string, cfg prayer.PrayerConfig, month time.Time) (reference, error) {
	ref := reference{Days: make(map[string]prayer.DaySchedule), Source: muisSource, MethodName: "MUIS · Singapore"}
	loc, err := regionalLocation(cfg, "MUIS", "Asia/Singapore")
	if err != nil {
		return ref, err
	}
	// The official dataset switched from ambiguous 12-hour clocks to 24-hour
	// clocks in 2026. Reject older years instead of guessing AM/PM.
	if month.Year() < 2026 {
		return ref, fmt.Errorf("MUIS integration supports 2026 onward")
	}
	search, _ := json.Marshal(map[string]string{"Date": month.Format("2006-01")})
	q := url.Values{"resource_id": {muisDataset}, "q": {string(search)}, "limit": {"1000"}}
	ref.APIEndpoint = endpoint + "?" + q.Encode()
	var payload struct {
		Success bool `json:"success"`
		Result  struct {
			RawRecords []json.RawMessage `json:"records"`
			Total      int               `json:"total"`
			ResourceID string            `json:"resource_id"`
		} `json:"result"`
	}
	if err := getProviderJSON(ctx, client, "MUIS/data.gov.sg", endpoint+"?"+q.Encode(), &payload); err != nil {
		return ref, err
	}
	if !payload.Success || payload.Result.ResourceID != muisDataset || payload.Result.Total != len(payload.Result.RawRecords) {
		return ref, fmt.Errorf("incomplete MUIS dataset response")
	}
	first := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, loc)
	for _, raw := range payload.Result.RawRecords {
		var row struct {
			Date    string
			Subuh   string
			Syuruk  string
			Zohor   string
			Asar    string
			Maghrib string
			Isyak   string
		}
		if err := json.Unmarshal(raw, &row); err != nil {
			return ref, fmt.Errorf("invalid MUIS timetable row")
		}
		date, err := time.ParseInLocation(time.DateOnly, row.Date, loc)
		if err != nil {
			return ref, fmt.Errorf("invalid MUIS date")
		}
		// Full-text search can also return YYYY-DD-MM matches; retain only the requested month.
		if date.Year() != month.Year() || date.Month() != month.Month() {
			continue
		}
		day, err := wallClockDay(date, []string{row.Subuh, row.Syuruk, row.Zohor, row.Asar, row.Maghrib, row.Isyak})
		if err != nil {
			return ref, err
		}
		if err := addReferenceDay(&ref, day); err != nil {
			return ref, err
		}
	}
	if len(ref.Days) != first.AddDate(0, 1, -1).Day() {
		return ref, fmt.Errorf("MUIS has not published a complete timetable for %s", month.Format("2006-01"))
	}
	return ref, nil
}
