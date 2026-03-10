package appservice

import (
	"archive/zip"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/autostart"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/export"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/geonames"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/hijri"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/location"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/qibla"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/scheduler"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
)

// Service is the Wails-facing bridge between the frontend and the Go services.
type Service struct {
	prayerSvc    *prayer.Service
	locSvc       *location.Service
	settingsSvc  *settings.Service
	audioSvc     *audio.Service
	notifSvc     *notification.Service
	schedulerSvc *scheduler.Service
	onSettings   func(settings.Settings)
}

func New(
	prayerSvc *prayer.Service,
	locSvc *location.Service,
	settingsSvc *settings.Service,
	audioSvc *audio.Service,
) *Service {
	return &Service{
		prayerSvc:   prayerSvc,
		locSvc:      locSvc,
		settingsSvc: settingsSvc,
		audioSvc:    audioSvc,
	}
}

func (s *Service) SetRuntimeServices(notifSvc *notification.Service, schedulerSvc *scheduler.Service) {
	s.notifSvc = notifSvc
	s.schedulerSvc = schedulerSvc
}

// SetSettingsChangedHandler registers a callback for settings updates.
// This is used by runtime-only components like the system tray.
func SetSettingsChangedHandler(s *Service, handler func(settings.Settings)) {
	if s == nil {
		return
	}
	s.onSettings = handler
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
		CustomFajrAngle: cfg.Prayer.CustomFajrAngle,
		CustomIshaAngle: cfg.Prayer.CustomIshaAngle,
		Latitude:        cfg.Location.Latitude,
		Longitude:       cfg.Location.Longitude,
		Elevation:       cfg.Location.Elevation,
		Timezone:        cfg.Location.Timezone,
	}
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
			return err
		}
	}

	if err := s.settingsSvc.Update(cfg); err != nil {
		if previous.AutoStart != cfg.AutoStart {
			_ = autostart.Sync(previous.AutoStart)
		}
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
			return settings.Settings{}, err
		}
	}

	if err := s.settingsSvc.Reset(); err != nil {
		if previous.AutoStart != defaults.AutoStart {
			_ = autostart.Sync(previous.AutoStart)
		}
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

	return cfg, nil
}

func (s *Service) GetLocation() (location.Location, error) {
	return s.locSvc.Get(), nil
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

	return s.SaveSettings(cfg)
}

func (s *Service) GetTodaySchedule() (prayer.DaySchedule, error) {
	return s.prayerSvc.GetTodaySchedule()
}

func (s *Service) GetScheduleForDate(dateStr string) (prayer.DaySchedule, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return prayer.DaySchedule{}, err
	}
	return s.prayerSvc.GetScheduleForDate(t)
}

func (s *Service) GetMonthSchedule(year, month int) ([]prayer.DaySchedule, error) {
	return s.prayerSvc.GetMonthSchedule(year, month)
}

func (s *Service) GetScheduleRange(startDate, endDate string) ([]prayer.DaySchedule, error) {
	start, end, err := parseDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	return s.prayerSvc.GetScheduleRange(start, end)
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
	return s.prayerSvc.GetNextPrayer(time.Now())
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

func (s *Service) PlayAdhan(isFajr bool) error {
	cfg := s.settingsSvc.Get()
	return s.audioSvc.Play(isFajr, cfg.Notification.AdhanVolume)
}

func (s *Service) StopAdhan() {
	s.audioSvc.Stop()
}

func (s *Service) ExportToCSV(_, _ int, startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		return err
	}

	return export.ToCSV(rows, outputPath)
}

func (s *Service) ExportToExcel(_, _ int, startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		return err
	}

	return export.ToExcel(rows, outputPath)
}

func (s *Service) SaveBase64File(outputPath, base64Data string) error {
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("failed to decode base64 file: %w", err)
	}

	return os.WriteFile(outputPath, data, 0644)
}

func (s *Service) DismissReminder() {
	if s.schedulerSvc != nil {
		s.schedulerSvc.Stop()
		cfg := s.settingsSvc.Get()
		s.schedulerSvc.Start(cfg)
	}
}

func (s *Service) GetCurrentTime() string {
	return time.Now().Format("15:04:05")
}

func (s *Service) ExportRangeToCSV(startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		return err
	}

	return export.ToCSV(rows, outputPath)
}

func (s *Service) ExportRangeToExcel(startDate, endDate, outputPath string) error {
	rows, err := s.buildRangeExportRows(startDate, endDate)
	if err != nil {
		return err
	}

	return export.ToExcel(rows, outputPath)
}

func (s *Service) buildRangeExportRows(startDate, endDate string) ([]export.MonthRow, error) {
	schedules, err := s.GetScheduleRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	hijriDays, err := s.GetHijriDateRange(startDate, endDate)
	if err != nil {
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
