package appservice

import (
	"encoding/base64"
	"fmt"
	"os"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/export"
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
	if err := s.settingsSvc.Update(cfg); err != nil {
		return err
	}

	s.locSvc.SetManual(locationFromSettings(cfg))
	s.prayerSvc.SetConfig(BuildPrayerConfig(cfg))

	if s.schedulerSvc != nil {
		s.schedulerSvc.Stop()
		s.schedulerSvc.Start(cfg)
	}

	return nil
}

func (s *Service) ResetSettings() (settings.Settings, error) {
	if err := s.settingsSvc.Reset(); err != nil {
		return settings.Settings{}, err
	}

	cfg := s.settingsSvc.Get()
	s.locSvc.SetManual(locationFromSettings(cfg))
	s.prayerSvc.SetConfig(BuildPrayerConfig(cfg))

	if s.schedulerSvc != nil {
		s.schedulerSvc.Stop()
		s.schedulerSvc.Start(cfg)
	}

	return cfg, nil
}

func (s *Service) GetLocation() (location.Location, error) {
	return s.locSvc.Get(), nil
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
