package geonames

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type City struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	CountryCode string  `json:"countryCode"`
	Admin1      string  `json:"admin1"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Elevation   int     `json:"elevation"`
	Timezone    string  `json:"timezone"`
	Label       string  `json:"label"`
}

type cityRecord struct {
	City
	searchKey string
}

var (
	loadMu        sync.Mutex
	loaded        bool
	loadErr       error
	cityRecords   []cityRecord
	timezoneCache []string
	timezoneLower []string
	overridePath  string
	metadataPath  string
)

func SearchCities(query string, limit int) ([]City, error) {
	if err := load(); err != nil {
		log.Error("search cities load failed", "error", err)
		return nil, err
	}

	q := strings.ToLower(strings.TrimSpace(query))
	if len(q) < 2 {
		return []City{}, nil
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	results := make([]City, 0, limit)
	for _, record := range cityRecords {
		if strings.Contains(record.searchKey, q) {
			results = append(results, record.City)
			if len(results) >= limit {
				break
			}
		}
	}

	return results, nil
}

func FindCityByName(name, countryCode string) (City, bool) {
	if err := load(); err != nil {
		log.Error("find city load failed", "error", err)
		return City{}, false
	}

	targetName := strings.ToLower(strings.TrimSpace(name))
	targetCountry := strings.ToLower(strings.TrimSpace(countryCode))
	for _, record := range cityRecords {
		if strings.ToLower(record.City.Name) != targetName {
			continue
		}
		if targetCountry != "" && strings.ToLower(record.City.CountryCode) != targetCountry {
			continue
		}
		return record.City, true
	}

	return City{}, false
}

func GetTimezones() ([]string, error) {
	if err := load(); err != nil {
		log.Error("get timezones load failed", "error", err)
		return nil, err
	}

	return append([]string(nil), timezoneCache...), nil
}

func SearchTimezones(query string, limit int) ([]string, error) {
	if err := load(); err != nil {
		log.Error("search timezones load failed", "error", err)
		return nil, err
	}

	q := strings.ToLower(strings.TrimSpace(query))
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	if q == "" {
		if len(timezoneCache) < limit {
			limit = len(timezoneCache)
		}
		return append([]string(nil), timezoneCache[:limit]...), nil
	}

	results := make([]string, 0, limit)
	for i, tz := range timezoneCache {
		if strings.Contains(timezoneLower[i], q) {
			results = append(results, tz)
			if len(results) >= limit {
				break
			}
		}
	}

	return results, nil
}

func SetOverridePath(path string) {
	overridePath = path
}

func SetMetadataPath(path string) {
	metadataPath = path
}

func Refresh() {
	loadMu.Lock()
	defer loadMu.Unlock()
	loaded = false
	loadErr = nil
	cityRecords = nil
	timezoneCache = nil
	timezoneLower = nil
}

func load() error {
	loadMu.Lock()
	defer loadMu.Unlock()
	if loaded {
		return loadErr
	}

	file, err := openCitiesFile()
	if err != nil {
		log.Error("open cities file failed", "error", err)
		loadErr = err
		loaded = true
		return loadErr
	}
	defer file.Close()

	records, timezones, err := parseCities(file)
	if err != nil {
		log.Error("parse cities failed", "error", err)
		loadErr = err
		loaded = true
		return loadErr
	}

	cityRecords = records
	timezoneCache = timezones
	loaded = true
	log.Info("geonames loaded", "cities", len(cityRecords), "timezones", len(timezoneCache))
	return loadErr
}

func parseCities(reader io.Reader) ([]cityRecord, []string, error) {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	records := make([]cityRecord, 0, 10000)
	timezones := make(map[string]struct{})

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		fields := strings.Split(line, "\t")
		if len(fields) < 19 {
			continue
		}

		id, _ := strconv.Atoi(fields[0])
		name := fields[1]
		asciiname := fields[2]
		lat, _ := strconv.ParseFloat(fields[4], 64)
		lon, _ := strconv.ParseFloat(fields[5], 64)
		country := fields[8]
		admin1 := fields[10]
		elevation := parseOptionalInt(fields[15])
		if elevation == 0 {
			elevation = parseOptionalInt(fields[16])
		}
		timezone := fields[17]

		label := buildLabel(name, admin1, country)
		records = append(records, cityRecord{
			City: City{
				ID:          id,
				Name:        name,
				CountryCode: country,
				Admin1:      admin1,
				Latitude:    lat,
				Longitude:   lon,
				Elevation:   elevation,
				Timezone:    timezone,
				Label:       label,
			},
			searchKey: strings.ToLower(strings.TrimSpace(strings.Join([]string{
				name,
				asciiname,
				country,
				admin1,
			}, " "))),
		})

		if timezone != "" {
			timezones[timezone] = struct{}{}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("scan cities failed", "error", err)
		return nil, nil, fmt.Errorf("parse cities500.txt: %w", err)
	}

	uniqueTimezones := make([]string, 0, len(timezones))
	for tz := range timezones {
		uniqueTimezones = append(uniqueTimezones, tz)
	}
	sort.Strings(uniqueTimezones)
	lowerTimezones := make([]string, len(uniqueTimezones))
	for i, tz := range uniqueTimezones {
		lowerTimezones[i] = strings.ToLower(tz)
	}

	timezoneLower = lowerTimezones
	return records, uniqueTimezones, nil
}

func parseOptionalInt(value string) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0
	}
	return parsed
}

func buildLabel(name, admin1, country string) string {
	parts := []string{name}
	if admin1 != "" {
		parts = append(parts, admin1)
	}
	if country != "" {
		parts = append(parts, country)
	}
	return strings.Join(parts, ", ")
}

func openCitiesFile() (io.ReadCloser, error) {
	if overridePath != "" {
		if info, err := os.Stat(overridePath); err == nil && !info.IsDir() {
			file, err := os.Open(overridePath)
			if err == nil {
				log.Info("using override cities file", "path", overridePath)
				return file, nil
			}
			log.Error("open override cities file failed", "error", err, "path", overridePath)
		}
	}

	file, err := data.Open("cities500.txt")
	if err != nil {
		log.Error("open embedded cities file failed", "error", err)
		return nil, fmt.Errorf("open cities500.txt: %w", err)
	}
	return file, nil
}
