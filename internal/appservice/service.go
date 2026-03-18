package appservice

import (
	"archive/zip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/autostart"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/clock"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/export"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/geonames"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/hijri"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/location"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/qibla"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/scheduler"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
)

// Service is the Wails-facing bridge between the frontend and the Go services.
type Service struct {
	prayerSvc             *prayer.Service
	locSvc                *location.Service
	settingsSvc           *settings.Service
	audioSvc              *audio.Service
	notifSvc              *notification.Service
	schedulerSvc          *scheduler.Service
	onSettings            func(settings.Settings)
	worldPrayerMu         sync.Mutex
	worldPrayerServices   map[string]*prayer.Service
	quranMu               sync.Mutex
	reminderStatePath     string
	testReminderStatePath string
}

// ReminderDebugEntry describes a scheduled reminder time for debugging.
type ReminderDebugEntry struct {
	PrayerName    string `json:"prayerName"`
	State         string `json:"state"`
	ScheduledTime string `json:"scheduledTime"`
	OffsetMinutes int    `json:"offsetMinutes"`
	Enabled       bool   `json:"enabled"`
	DeltaSeconds  int    `json:"deltaSeconds"`
	IsFuture      bool   `json:"isFuture"`
}

// DebugTimeInfo exposes the backend's current time data.
type DebugTimeInfo struct {
	NowRFC3339 string `json:"nowRFC3339"`
	Clock      string `json:"clock"`
	Timezone   string `json:"timezone"`
	Offset     string `json:"offset"`
}

func New(
	prayerSvc *prayer.Service,
	locSvc *location.Service,
	settingsSvc *settings.Service,
	audioSvc *audio.Service,
) *Service {
	configDir, _ := ConfigDirectory()
	log.Info("appservice init", "configDir", configDir)
	return &Service{
		prayerSvc:             prayerSvc,
		locSvc:                locSvc,
		settingsSvc:           settingsSvc,
		audioSvc:              audioSvc,
		worldPrayerServices:   make(map[string]*prayer.Service),
		reminderStatePath:     filepath.Join(configDir, "reminder_state.json"),
		testReminderStatePath: filepath.Join(configDir, "reminder_test_state.json"),
	}
}

func (s *Service) SetRuntimeServices(notifSvc *notification.Service, schedulerSvc *scheduler.Service) {
	s.notifSvc = notifSvc
	s.schedulerSvc = schedulerSvc
	log.Info("runtime services set")
}

// SetSettingsChangedHandler registers a callback for settings updates.
// This is used by runtime-only components like the system tray.
func SetSettingsChangedHandler(s *Service, handler func(settings.Settings)) {
	if s == nil {
		return
	}
	s.onSettings = handler
	log.Info("settings changed handler set")
}

func BuildPrayerConfig(cfg settings.Settings) prayer.PrayerConfig {
	return prayer.PrayerConfig{
		Method:    prayer.CalculationMethod(cfg.Prayer.Method),
		AsrMethod: prayer.AsrMethod(cfg.Prayer.AsrMethod),
		Offsets: prayer.PrayerOffsets{
			Fajr:    cfg.Prayer.Offsets.Fajr,
			Sunrise: cfg.Prayer.Offsets.Sunrise,
			Zuhr:    cfg.Prayer.Offsets.Zuhr,
			Asr:     cfg.Prayer.Offsets.Asr,
			Maghrib: cfg.Prayer.Offsets.Maghrib,
			Isha:    cfg.Prayer.Offsets.Isha,
		},
		CustomFajrAngle:       cfg.Prayer.CustomFajrAngle,
		CustomIshaAngle:       cfg.Prayer.CustomIshaAngle,
		CustomMaghribDuration: cfg.Prayer.CustomMaghribDuration,
		Latitude:              cfg.Location.Latitude,
		Longitude:             cfg.Location.Longitude,
		Elevation:             cfg.Location.Elevation,
		Timezone:              cfg.Location.Timezone,
	}
}

func buildWorldPrayerConfig(cfg settings.Settings, city settings.WorldPrayerCity) prayer.PrayerConfig {
	return prayer.PrayerConfig{
		Method:    prayer.CalculationMethod(cfg.Prayer.Method),
		AsrMethod: prayer.AsrMethod(cfg.Prayer.AsrMethod),
		Offsets: prayer.PrayerOffsets{
			Fajr:    cfg.Prayer.Offsets.Fajr,
			Sunrise: cfg.Prayer.Offsets.Sunrise,
			Zuhr:    cfg.Prayer.Offsets.Zuhr,
			Asr:     cfg.Prayer.Offsets.Asr,
			Maghrib: cfg.Prayer.Offsets.Maghrib,
			Isha:    cfg.Prayer.Offsets.Isha,
		},
		CustomFajrAngle:       cfg.Prayer.CustomFajrAngle,
		CustomIshaAngle:       cfg.Prayer.CustomIshaAngle,
		CustomMaghribDuration: cfg.Prayer.CustomMaghribDuration,
		Latitude:              city.Latitude,
		Longitude:             city.Longitude,
		Elevation:             float64(city.Elevation),
		Timezone:              city.Timezone,
	}
}

func buildWorldPrayerCacheKey(cfg settings.Settings, city settings.WorldPrayerCity) string {
	return fmt.Sprintf(
		"%s|%s|%s|%d|%.4f|%.4f|%d|%.2f|%.2f|%.2f|%.2f|%.2f|%.2f|%.2f|%.2f|%.2f",
		cfg.Prayer.Method,
		cfg.Prayer.AsrMethod,
		city.Timezone,
		city.ID,
		city.Latitude,
		city.Longitude,
		city.Elevation,
		cfg.Prayer.CustomFajrAngle,
		cfg.Prayer.CustomIshaAngle,
		cfg.Prayer.CustomMaghribDuration,
		cfg.Prayer.Offsets.Fajr,
		cfg.Prayer.Offsets.Sunrise,
		cfg.Prayer.Offsets.Zuhr,
		cfg.Prayer.Offsets.Asr,
		cfg.Prayer.Offsets.Maghrib,
		cfg.Prayer.Offsets.Isha,
	)
}

func (s *Service) getWorldPrayerService(key string, cfg prayer.PrayerConfig) *prayer.Service {
	s.worldPrayerMu.Lock()
	defer s.worldPrayerMu.Unlock()

	if svc, ok := s.worldPrayerServices[key]; ok {
		return svc
	}

	svc := prayer.NewService()
	svc.SetConfig(cfg)
	s.worldPrayerServices[key] = svc
	return svc
}

func loadLocationOrUTC(timezone string) *time.Location {
	if timezone == "" {
		return time.UTC
	}
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.UTC
	}
	return loc
}

func updateLogLevel(cfg settings.Settings) {
	configDir, err := ConfigDirectory()
	if err != nil {
		logging.SetLevel(cfg.LogLevel)
		return
	}
	logging.Configure(logging.Options{Dir: configDir, Level: cfg.LogLevel})
}

func locationFromSettings(cfg settings.Settings) location.Location {
	return location.Location{
		City:      cfg.Location.City,
		Country:   cfg.Location.Country,
		Latitude:  cfg.Location.Latitude,
		Longitude: cfg.Location.Longitude,
		Elevation: cfg.Location.Elevation,
		Timezone:  cfg.Location.Timezone,
	}
}

func (s *Service) GetSettings() (settings.Settings, error) {
	return s.settingsSvc.Get(), nil
}

func (s *Service) SaveSettings(cfg settings.Settings) error {
	previous := s.settingsSvc.Get()
	if cfg.Location.Timezone == "" {
		cfg.Location.Timezone = previous.Location.Timezone
		if cfg.Location.Timezone == "" {
			cfg.Location.Timezone = "UTC"
		}
	}
	if previous.AutoStart != cfg.AutoStart {
		if err := autostart.Sync(cfg.AutoStart); err != nil {
			log.Error("autostart sync failed", "error", err, "enabled", cfg.AutoStart)
			return err
		}
	}

	if err := s.settingsSvc.Update(cfg); err != nil {
		if previous.AutoStart != cfg.AutoStart {
			_ = autostart.Sync(previous.AutoStart)
		}
		log.Error("settings update failed", "error", err)
		return err
	}

	s.locSvc.SetManual(locationFromSettings(cfg))
	s.prayerSvc.SetConfig(BuildPrayerConfig(cfg))

	if s.schedulerSvc != nil {
		s.schedulerSvc.Stop()
		s.schedulerSvc.Start(cfg)
	}

	if s.onSettings != nil {
		s.onSettings(cfg)
	}

	updateLogLevel(cfg)
	log.Info("settings saved")
	return nil
}

func (s *Service) ResetSettings() (settings.Settings, error) {
	previous := s.settingsSvc.Get()
	defaults := settings.DefaultSettings()
	if defaults.Location.Timezone == "" {
		defaults.Location.Timezone = "UTC"
	}
	if previous.AutoStart != defaults.AutoStart {
		if err := autostart.Sync(defaults.AutoStart); err != nil {
			log.Error("autostart sync failed", "error", err, "enabled", defaults.AutoStart)
			return settings.Settings{}, err
		}
	}

	if err := s.settingsSvc.Reset(); err != nil {
		if previous.AutoStart != defaults.AutoStart {
			_ = autostart.Sync(previous.AutoStart)
		}
		log.Error("settings reset failed", "error", err)
		return settings.Settings{}, err
	}

	cfg := s.settingsSvc.Get()
	s.locSvc.SetManual(locationFromSettings(cfg))
	s.prayerSvc.SetConfig(BuildPrayerConfig(cfg))

	if s.schedulerSvc != nil {
		s.schedulerSvc.Stop()
		s.schedulerSvc.Start(cfg)
	}

	if s.onSettings != nil {
		s.onSettings(cfg)
	}

	updateLogLevel(cfg)
	log.Info("settings reset")
	return cfg, nil
}

func (s *Service) GetLocation() (location.Location, error) {
	return s.locSvc.Get(), nil
}

type WorldPrayerCitySummary struct {
	City          settings.WorldPrayerCity `json:"city"`
	OffsetSeconds int                      `json:"offsetSeconds"`
	CurrentTime   time.Time                `json:"currentTime"`
	NextPrayer    prayer.NextPrayerInfo    `json:"nextPrayer"`
	Today         prayer.DaySchedule       `json:"today"`
}

func (s *Service) GetWorldPrayerTimes(cities []settings.WorldPrayerCity) ([]WorldPrayerCitySummary, error) {
	cfg := s.settingsSvc.Get()
	if len(cities) == 0 {
		cities = cfg.WorldPrayer.Cities
	}

	homeLoc := loadLocationOrUTC(cfg.Location.Timezone)
	now := clock.Now()
	_, homeOffset := now.In(homeLoc).Zone()

	results := make([]WorldPrayerCitySummary, 0, len(cities))
	for _, city := range cities {
		cityLoc := loadLocationOrUTC(city.Timezone)
		cityNow := now.In(cityLoc)
		_, cityOffset := cityNow.Zone()

		worldCfg := buildWorldPrayerConfig(cfg, city)
		cacheKey := buildWorldPrayerCacheKey(cfg, city)
		prayerSvc := s.getWorldPrayerService(cacheKey, worldCfg)

		today, err := prayerSvc.GetScheduleForDate(cityNow)
		if err != nil {
			log.Error("world prayer schedule failed", "error", err, "city", city.Label, "timezone", city.Timezone)
			return nil, err
		}
		nextPrayer, err := prayerSvc.GetNextPrayer(cityNow)
		if err != nil {
			log.Error("world prayer next prayer failed", "error", err, "city", city.Label, "timezone", city.Timezone)
			return nil, err
		}

		results = append(results, WorldPrayerCitySummary{
			City:          city,
			OffsetSeconds: cityOffset - homeOffset,
			CurrentTime:   cityNow,
			NextPrayer:    nextPrayer,
			Today:         today,
		})
	}

	log.Info("world prayer times computed", "cities", len(results))
	return results, nil
}

func (s *Service) SearchCities(query string, limit int) ([]geonames.City, error) {
	return geonames.SearchCities(query, limit)
}

func (s *Service) GetTimezones() ([]string, error) {
	return geonames.GetTimezones()
}

func (s *Service) SearchTimezones(query string, limit int) ([]string, error) {
	return geonames.SearchTimezones(query, limit)
}

func (s *Service) GetGeonamesInfo() (geonames.DataInfo, error) {
	return geonames.GetDataInfo()
}

func (s *Service) UpdateGeonamesData() (geonames.DataInfo, error) {
	configDir, err := ConfigDirectory()
	if err != nil {
		return geonames.DataInfo{}, err
	}

	targetDir := filepath.Join(configDir, "geonames")
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return geonames.DataInfo{}, fmt.Errorf("create geonames dir: %w", err)
	}

	targetPath := filepath.Join(targetDir, "cities500.txt")
	metaPath := filepath.Join(targetDir, "metadata.json")

	if err := downloadGeonamesCities(targetPath); err != nil {
		return geonames.DataInfo{}, err
	}

	info := geonames.DataInfo{
		Source:      "GeoNames cities500",
		LastUpdated: time.Now().UTC().Format(time.RFC3339),
	}
	_ = geonames.WriteMetadata(metaPath, info)
	geonames.SetOverridePath(targetPath)
	geonames.SetMetadataPath(metaPath)
	geonames.Refresh()

	return geonames.GetDataInfo()
}

func downloadGeonamesCities(targetPath string) error {
	const sourceURL = "https://download.geonames.org/export/dump/cities500.zip"

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Get(sourceURL)
	if err != nil {
		return fmt.Errorf("download geonames: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("download geonames: status %s", resp.Status)
	}

	tmpFile, err := os.CreateTemp("", "geonames-*.zip")
	if err != nil {
		return fmt.Errorf("create temp zip: %w", err)
	}
	defer func() {
		_ = os.Remove(tmpFile.Name())
	}()

	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("write temp zip: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("close temp zip: %w", err)
	}

	reader, err := zipOpen(tmpFile.Name())
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		if file.Name != "cities500.txt" {
			continue
		}
		rc, err := file.Open()
		if err != nil {
			return fmt.Errorf("open cities500.txt: %w", err)
		}
		defer rc.Close()

		if err := writeFileAtomic(targetPath, rc); err != nil {
			return err
		}
		return nil
	}

	return fmt.Errorf("cities500.txt not found in archive")
}

func zipOpen(path string) (*zip.ReadCloser, error) {
	reader, err := zip.OpenReader(path)
	if err != nil {
		return nil, fmt.Errorf("open geonames zip: %w", err)
	}
	return reader, nil
}

func writeFileAtomic(path string, reader io.Reader) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("prepare geonames dir: %w", err)
	}

	tmpFile, err := os.CreateTemp(dir, "cities500-*.txt")
	if err != nil {
		return fmt.Errorf("create temp cities file: %w", err)
	}
	defer func() {
		_ = os.Remove(tmpFile.Name())
	}()

	if _, err := io.Copy(tmpFile, reader); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("write cities file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("close cities file: %w", err)
	}

	if err := os.Rename(tmpFile.Name(), path); err != nil {
		return fmt.Errorf("replace cities file: %w", err)
	}

	return nil
}

func (s *Service) DetectLocation() (location.Location, error) {
	loc, err := s.locSvc.DetectFromIP()
	if err != nil {
		log.Error("detect location failed", "error", err)
		return location.Location{}, err
	}

	cfg := s.settingsSvc.Get()
	cfg.Location.AutoDetect = true
	cfg.Location.City = loc.City
	cfg.Location.Country = loc.Country
	cfg.Location.Latitude = loc.Latitude
	cfg.Location.Longitude = loc.Longitude
	cfg.Location.Elevation = loc.Elevation
	cfg.Location.Timezone = loc.Timezone
	_ = s.SaveSettings(cfg)

	log.Info("location detected", "city", loc.City, "country", loc.Country, "timezone", loc.Timezone)
	return loc, nil
}

func (s *Service) SetManualLocation(loc location.Location) error {
	s.locSvc.SetManual(loc)

	cfg := s.settingsSvc.Get()
	cfg.Location.AutoDetect = false
	cfg.Location.City = loc.City
	cfg.Location.Country = loc.Country
	cfg.Location.Latitude = loc.Latitude
	cfg.Location.Longitude = loc.Longitude
	cfg.Location.Elevation = loc.Elevation
	cfg.Location.Timezone = loc.Timezone

	if err := s.SaveSettings(cfg); err != nil {
		log.Error("set manual location failed", "error", err)
		return err
	}
	log.Info("manual location set", "city", loc.City, "country", loc.Country, "timezone", loc.Timezone)
	return nil
}

func (s *Service) GetTodaySchedule() (prayer.DaySchedule, error) {
	cfg := s.settingsSvc.Get()
	loc, err := time.LoadLocation(cfg.Location.Timezone)
	if err != nil {
		loc = time.UTC
	}
	now := clock.Now().In(loc)
	schedule, err := s.prayerSvc.GetScheduleForDate(now)
	if err != nil {
		log.Error("today schedule failed", "error", err)
		return prayer.DaySchedule{}, err
	}
	return schedule, nil
}

func (s *Service) GetScheduleForDate(dateStr string) (prayer.DaySchedule, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		log.Error("parse schedule date failed", "error", err, "date", dateStr)
		return prayer.DaySchedule{}, err
	}
	schedule, err := s.prayerSvc.GetScheduleForDate(t)
	if err != nil {
		log.Error("schedule for date failed", "error", err, "date", dateStr)
		return prayer.DaySchedule{}, err
	}
	return schedule, nil
}

func (s *Service) GetMonthSchedule(year, month int) ([]prayer.DaySchedule, error) {
	schedule, err := s.prayerSvc.GetMonthSchedule(year, month)
	if err != nil {
		log.Error("month schedule failed", "error", err, "year", year, "month", month)
		return nil, err
	}
	return schedule, nil
}

func (s *Service) GetScheduleRange(startDate, endDate string) ([]prayer.DaySchedule, error) {
	start, end, err := parseDateRange(startDate, endDate)
	if err != nil {
		log.Error("parse date range failed", "error", err, "start", startDate, "end", endDate)
		return nil, err
	}

	schedule, err := s.prayerSvc.GetScheduleRange(start, end)
	if err != nil {
		log.Error("schedule range failed", "error", err, "start", startDate, "end", endDate)
		return nil, err
	}
	return schedule, nil
}

func (s *Service) GetMonthHijriDates(year, month int) ([]hijri.CalendarDay, error) {
	cfg := s.settingsSvc.Get()
	loc, err := time.LoadLocation(cfg.Location.Timezone)
	if err != nil {
		loc = time.Local
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, 0)

	result := make([]hijri.CalendarDay, 0, 31)
	for current := start; current.Before(end); current = current.AddDate(0, 0, 1) {
		result = append(result, hijri.CalendarDay{
			Date:  current.Format("2006-01-02"),
			Hijri: hijri.ToHijri(current, cfg.HijriDateOffset),
		})
	}

	return result, nil
}

func (s *Service) GetHijriDateRange(startDate, endDate string) ([]hijri.CalendarDay, error) {
	start, end, err := parseDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	cfg := s.settingsSvc.Get()
	loc, locErr := time.LoadLocation(cfg.Location.Timezone)
	if locErr != nil {
		loc = time.Local
	}

	start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, loc)
	end = time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, loc)

	result := make([]hijri.CalendarDay, 0, int(end.Sub(start).Hours()/24)+1)
	for current := start; !current.After(end); current = current.AddDate(0, 0, 1) {
		result = append(result, hijri.CalendarDay{
			Date:  current.Format("2006-01-02"),
			Hijri: hijri.ToHijri(current, cfg.HijriDateOffset),
		})
	}

	return result, nil
}

func (s *Service) GetNextPrayer() (prayer.NextPrayerInfo, error) {
	cfg := s.settingsSvc.Get()
	loc, err := time.LoadLocation(cfg.Location.Timezone)
	if err != nil {
		loc = time.UTC
	}
	return s.prayerSvc.GetNextPrayer(clock.Now().In(loc))
}

func (s *Service) GetTodayHijri() (hijri.HijriDate, error) {
	cfg := s.settingsSvc.Get()
	return hijri.TodayHijri(cfg.HijriDateOffset), nil
}

func (s *Service) GetHijriForDate(dateStr string) (hijri.HijriDate, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return hijri.HijriDate{}, err
	}

	cfg := s.settingsSvc.Get()
	return hijri.ToHijri(t, cfg.HijriDateOffset), nil
}

func (s *Service) GetQiblaDirection() float64 {
	loc := s.locSvc.Get()
	return qibla.Direction(loc.Latitude, loc.Longitude)
}

func (s *Service) GetQiblaDirectionFor(lat, lon float64) float64 {
	return qibla.Direction(lat, lon)
}

func (s *Service) GetCardinalDirection(bearing float64) string {
	return qibla.CardinalDirection(bearing)
}

func (s *Service) ExportToCSV(_, _ int, startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		log.Error("export csv build rows failed", "error", err)
		return err
	}

	if err := export.ToCSV(rows, outputPath); err != nil {
		log.Error("export csv failed", "error", err)
		return err
	}
	return nil
}

func (s *Service) ExportToExcel(_, _ int, startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		log.Error("export excel build rows failed", "error", err)
		return err
	}

	if err := export.ToExcel(rows, outputPath); err != nil {
		log.Error("export excel failed", "error", err)
		return err
	}
	return nil
}

func (s *Service) SaveBase64File(outputPath, base64Data string) error {
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		log.Error("decode base64 file failed", "error", err)
		return fmt.Errorf("failed to decode base64 file: %w", err)
	}

	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		log.Error("write base64 file failed", "error", err, "path", outputPath)
		return err
	}
	log.Info("base64 file saved", "path", outputPath)
	return nil
}

func (s *Service) DismissReminder() {
	if s.notifSvc != nil {
		s.notifSvc.CloseReminder()
	}
	if s.audioSvc != nil {
		s.audioSvc.Stop()
	}
	if s.schedulerSvc != nil {
		s.schedulerSvc.Stop()
		cfg := s.settingsSvc.Get()
		s.schedulerSvc.Start(cfg)
	}
	log.Info("reminder dismissed")
}

func (s *Service) DismissTestReminder() {
	if s.notifSvc != nil {
		s.notifSvc.CloseTestReminder()
	}
	if s.audioSvc != nil {
		s.audioSvc.Stop()
	}
	log.Info("test reminder dismissed")
}

func (s *Service) CloseTestReminderWindow() {
	if s.notifSvc != nil {
		s.notifSvc.ForceCloseTestReminder()
	}
	if s.audioSvc != nil {
		s.audioSvc.Stop()
	}
	log.Info("test reminder window closed")
}

func (s *Service) ResizeReminderWindow(state string, isTest bool) {
	if s.notifSvc == nil {
		return
	}
	s.notifSvc.ResizeReminderWindow(notification.WindowState(state), isTest)
}

func (s *Service) PlayAdhan(isFajr bool) error {
	if s.audioSvc == nil {
		return nil
	}
	cfg := s.settingsSvc.Get()
	if err := s.audioSvc.Play(isFajr, cfg.Notification.AdhanVolume); err != nil {
		log.Error("play adhan failed", "error", err, "fajr", isFajr)
		return err
	}
	return nil
}

func (s *Service) StopAdhan() {
	if s.audioSvc != nil {
		s.audioSvc.Stop()
	}
	log.Info("stop adhan requested")
}

func (s *Service) CheckNativeNotificationPermission() (bool, error) {
	if s.notifSvc == nil {
		return false, fmt.Errorf("notification service not available")
	}
	return s.notifSvc.CheckNativeNotificationPermission()
}

func (s *Service) RequestNativeNotificationPermission() (bool, error) {
	if s.notifSvc == nil {
		return false, fmt.Errorf("notification service not available")
	}
	return s.notifSvc.RequestNativeNotificationPermission()
}

func (s *Service) EmitReminderInfo() {
	if s.notifSvc != nil {
		s.notifSvc.EmitLastReminder()
	}
}

func (s *Service) EmitTestReminderInfo() {
	if s.notifSvc != nil {
		s.notifSvc.EmitLastTestReminder()
	}
}

func (s *Service) GetReminderInfo() *notification.ReminderInfo {
	return loadReminderState(s.reminderStatePath)
}

func (s *Service) GetTestReminderInfo() *notification.ReminderInfo {
	return loadReminderState(s.testReminderStatePath)
}

func (s *Service) GetReminderState() *notification.ReminderInfo {
	return loadReminderState(s.reminderStatePath)
}

func (s *Service) GetTestReminderState() *notification.ReminderInfo {
	return loadReminderState(s.testReminderStatePath)
}

func loadReminderState(path string) *notification.ReminderInfo {
	if path == "" {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Error("load reminder state failed", "error", err, "path", path)
		}
		return nil
	}
	var info notification.ReminderInfo
	if err := json.Unmarshal(data, &info); err != nil {
		log.Error("decode reminder state failed", "error", err, "path", path)
		return nil
	}
	return &info
}

func (s *Service) GetCurrentTime() string {
	now := clock.Now().Format("15:04:05")
	log.Info("current time requested", "time", now)
	return now
}

// GetDebugTimeInfo returns the backend's current time and timezone info.
func (s *Service) GetDebugTimeInfo() DebugTimeInfo {
	now := clock.Now()
	zoneName, offsetSeconds := now.Zone()
	sign := "+"
	if offsetSeconds < 0 {
		sign = "-"
		offsetSeconds = -offsetSeconds
	}
	offsetHours := offsetSeconds / 3600
	offsetMinutes := (offsetSeconds % 3600) / 60
	offset := fmt.Sprintf("%s%02d:%02d", sign, offsetHours, offsetMinutes)
	return DebugTimeInfo{
		NowRFC3339: now.Format(time.RFC3339),
		Clock:      now.Format("15:04:05"),
		Timezone:   zoneName,
		Offset:     offset,
	}
}

// GetReminderDebugSchedule returns today's reminder schedule with relative timing info.
func (s *Service) GetReminderDebugSchedule() ([]ReminderDebugEntry, error) {
	cfg := s.settingsSvc.Get()
	sched, err := s.prayerSvc.GetTodaySchedule()
	if err != nil {
		log.Error("debug schedule failed", "error", err)
		return nil, err
	}

	now := clock.Now()
	type entryWithTime struct {
		ReminderDebugEntry
		at time.Time
	}
	entries := make([]entryWithTime, 0, 18)

	addEntry := func(prayerName string, state notification.WindowState, at time.Time, offsetMinutes int, enabled bool) {
		delta := int(at.Sub(now).Seconds())
		entries = append(entries, entryWithTime{
			ReminderDebugEntry: ReminderDebugEntry{
				PrayerName:    prayerName,
				State:         string(state),
				ScheduledTime: at.Format(time.RFC3339),
				OffsetMinutes: offsetMinutes,
				Enabled:       enabled,
				DeltaSeconds:  delta,
				IsFuture:      delta > 0,
			},
			at: at,
		})
	}

	type prayerEntry struct {
		name    string
		t       time.Time
		setting settings.PrayerNotificationSetting
	}

	prayers := []prayerEntry{
		{name: "Fajr", t: sched.Fajr, setting: cfg.Notification.Prayers.Fajr},
		{name: "Sunrise", t: sched.Sunrise, setting: cfg.Notification.Prayers.Sunrise},
		{name: "Zuhr", t: sched.Zuhr, setting: cfg.Notification.Prayers.Zuhr},
		{name: "Asr", t: sched.Asr, setting: cfg.Notification.Prayers.Asr},
		{name: "Maghrib", t: sched.Maghrib, setting: cfg.Notification.Prayers.Maghrib},
		{name: "Isha", t: sched.Isha, setting: cfg.Notification.Prayers.Isha},
	}

	for _, prayerEntry := range prayers {
		if prayerEntry.t.IsZero() {
			continue
		}
		enabled := prayerEntry.setting.Enabled
		beforeMinutes := prayerEntry.setting.BeforeMinutes
		afterMinutes := prayerEntry.setting.AfterMinutes

		if beforeMinutes > 0 {
			beforeTime := prayerEntry.t.Add(-time.Duration(beforeMinutes) * time.Minute)
			addEntry(prayerEntry.name, notification.StateBefore, beforeTime, -beforeMinutes, enabled)
		}

		addEntry(prayerEntry.name, notification.StateOnTime, prayerEntry.t, 0, enabled)

		if afterMinutes > 0 {
			afterTime := prayerEntry.t.Add(time.Duration(afterMinutes) * time.Minute)
			addEntry(prayerEntry.name, notification.StateAfter, afterTime, afterMinutes, enabled)
		}
	}

	sort.Slice(entries, func(i, j int) bool { return entries[i].at.Before(entries[j].at) })
	result := make([]ReminderDebugEntry, 0, len(entries))
	for _, entry := range entries {
		result = append(result, entry.ReminderDebugEntry)
	}
	log.Info("debug schedule built", "entries", len(result))
	return result, nil
}

func (s *Service) ExportRangeToCSV(startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		log.Error("export range csv build rows failed", "error", err)
		return err
	}

	if err := export.ToCSV(rows, outputPath); err != nil {
		log.Error("export range csv failed", "error", err)
		return err
	}
	return nil
}

func (s *Service) ExportRangeToExcel(startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		log.Error("export range excel build rows failed", "error", err)
		return err
	}

	if err := export.ToExcel(rows, outputPath); err != nil {
		log.Error("export range excel failed", "error", err)
		return err
	}
	return nil
}

func (s *Service) buildRangeExportRows(startDate, endDate string) ([]export.MonthRow, error) {
	schedules, err := s.GetScheduleRange(startDate, endDate)
	if err != nil {
		log.Error("export range schedule failed", "error", err)
		return nil, err
	}

	hijriDays, err := s.GetHijriDateRange(startDate, endDate)
	if err != nil {
		log.Error("export range hijri failed", "error", err)
		return nil, err
	}

	hijriByDate := make(map[string]hijri.HijriDate, len(hijriDays))
	for _, day := range hijriDays {
		hijriByDate[day.Date] = day.Hijri
	}

	rows := make([]export.MonthRow, 0, len(schedules))
	for _, schedule := range schedules {
		isoDate := schedule.Date[:10]
		hijriDate := hijriByDate[isoDate]
		rows = append(rows, export.MonthRow{
			GregorianDate: isoDate,
			HijriDate:     hijriDate.Format(),
			Fajr:          schedule.Fajr,
			Sunrise:       schedule.Sunrise,
			Zuhr:          schedule.Zuhr,
			Asr:           schedule.Asr,
			Maghrib:       schedule.Maghrib,
			Isha:          schedule.Isha,
		})
	}

	return rows, nil
}

func parseDateRange(startDate, endDate string) (time.Time, time.Time, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid start date: %w", err)
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid end date: %w", err)
	}

	if end.Before(start) {
		return time.Time{}, time.Time{}, fmt.Errorf("start date must be before or equal to end date")
	}

	return start, end, nil
}
