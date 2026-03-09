package settings

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// NotificationStyle defines how notifications are shown
type NotificationStyle string

const (
	NotificationNative NotificationStyle = "native"
	NotificationWindow NotificationStyle = "window"
)

// AdhanSelection defines which adhan to play
type AdhanSelection string

const (
	AdhanNormal AdhanSelection = "normal"
	AdhanFajr   AdhanSelection = "fajr"
)

// PrayerNotificationSetting controls reminder for a single prayer
type PrayerNotificationSetting struct {
	Enabled       bool `json:"enabled"`
	BeforeMinutes int  `json:"beforeMinutes"` // minutes before prayer to remind
	AfterMinutes  int  `json:"afterMinutes"`  // minutes after prayer to auto-dismiss
}

// PerPrayerNotification holds notification settings per prayer
type PerPrayerNotification struct {
	Fajr    PrayerNotificationSetting `json:"fajr"`
	Sunrise PrayerNotificationSetting `json:"sunrise"`
	Zuhr    PrayerNotificationSetting `json:"zuhr"`
	Asr     PrayerNotificationSetting `json:"asr"`
	Maghrib PrayerNotificationSetting `json:"maghrib"`
	Isha    PrayerNotificationSetting `json:"isha"`
}

// NotificationSettings stores all notification preferences
type NotificationSettings struct {
	Style       NotificationStyle     `json:"style"`
	PlayAdhan   bool                  `json:"playAdhan"`
	AdhanVolume float64               `json:"adhanVolume"` // 0.0 to 1.0
	Prayers     PerPrayerNotification `json:"prayers"`
}

// LocationSettings stores location configuration
type LocationSettings struct {
	AutoDetect bool    `json:"autoDetect"`
	City       string  `json:"city"`
	Country    string  `json:"country"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Elevation  float64 `json:"elevation"`
	Timezone   string  `json:"timezone"`
}

// PrayerOffsets for each prayer in minutes
type PrayerOffsets struct {
	Fajr    float64 `json:"fajr"`
	Sunrise float64 `json:"sunrise"`
	Zuhr    float64 `json:"zuhr"`
	Asr     float64 `json:"asr"`
	Maghrib float64 `json:"maghrib"`
	Isha    float64 `json:"isha"`
}

// PrayerSettings holds prayer calculation configuration
type PrayerSettings struct {
	Method          string        `json:"method"`
	AsrMethod       string        `json:"asrMethod"`
	Offsets         PrayerOffsets `json:"offsets"`
	CustomFajrAngle float64       `json:"customFajrAngle"`
	CustomIshaAngle float64       `json:"customIshaAngle"`
}

// DashboardSettings controls dashboard widgets and presentation.
type DashboardSettings struct {
	ShowClock          bool   `json:"showClock"`
	ClockType          string `json:"clockType"` // "digital" or "analog"
	DigitalClockFormat string `json:"digitalClockFormat"`
	DigitalClockCustom string `json:"digitalClockCustom"`
	AnalogClockSize    int    `json:"analogClockSize"`
	ShowAllClockHours  bool   `json:"showAllClockHours"`
}

// PrayerTimesSettings controls how the monthly prayer-times page is shown.
type PrayerTimesSettings struct {
	ViewMode             string `json:"viewMode"`             // "table" or "calendar"
	CalendarSystem       string `json:"calendarSystem"`       // "gregorian", "hijri", or "side-by-side"
	UseArabicIndicDigits bool   `json:"useArabicIndicDigits"` // render Hijri numerals using Arabic-Indic digits
}

// Settings is the root configuration struct
type Settings struct {
	Location         LocationSettings     `json:"location"`
	Prayer           PrayerSettings       `json:"prayer"`
	Notification     NotificationSettings `json:"notification"`
	Dashboard        DashboardSettings    `json:"dashboard"`
	PrayerTimes      PrayerTimesSettings  `json:"prayerTimes"`
	Theme            string               `json:"theme"` // "light", "dark", "system"
	ThemePreset      string               `json:"themePreset"`
	Language         string               `json:"language"` // "en", "id", etc
	AutoStart        bool                 `json:"autoStart"`
	AutoCheckUpdates bool                 `json:"autoCheckUpdates"`
	HijriDateOffset  int                  `json:"hijriDateOffset"` // -2 to +2 days
	TimeFormat       string               `json:"timeFormat"`      // "12h" or "24h"
}

// DefaultSettings returns the default application settings.
func DefaultSettings() Settings {
	defaultPrayerNotif := PrayerNotificationSetting{
		Enabled:       true,
		BeforeMinutes: 10,
		AfterMinutes:  30,
	}
	sunriseNotif := PrayerNotificationSetting{
		Enabled:       false,
		BeforeMinutes: 10,
		AfterMinutes:  30,
	}

	return Settings{
		Location: LocationSettings{
			AutoDetect: true,
			City:       "",
			Country:    "",
			Latitude:   -6.2,
			Longitude:  106.816666,
			Elevation:  0,
			Timezone:   "Asia/Jakarta",
		},
		Prayer: PrayerSettings{
			Method:          "Kemenag",
			AsrMethod:       "Shafii",
			Offsets:         PrayerOffsets{},
			CustomFajrAngle: 20,
			CustomIshaAngle: 18,
		},
		Notification: NotificationSettings{
			Style:       NotificationWindow,
			PlayAdhan:   true,
			AdhanVolume: 0.8,
			Prayers: PerPrayerNotification{
				Fajr:    defaultPrayerNotif,
				Sunrise: sunriseNotif,
				Zuhr:    defaultPrayerNotif,
				Asr:     defaultPrayerNotif,
				Maghrib: defaultPrayerNotif,
				Isha:    defaultPrayerNotif,
			},
		},
		Dashboard: DashboardSettings{
			ShowClock:          true,
			ClockType:          "digital",
			DigitalClockFormat: "24h-seconds",
			DigitalClockCustom: "HH:mm:ss",
			AnalogClockSize:    200,
			ShowAllClockHours:  false,
		},
		PrayerTimes: PrayerTimesSettings{
			ViewMode:             "table",
			CalendarSystem:       "gregorian",
			UseArabicIndicDigits: true,
		},
		Theme:            "system",
		ThemePreset:      "indigo",
		Language:         "en",
		AutoStart:        false,
		AutoCheckUpdates: true,
		HijriDateOffset:  0,
		TimeFormat:       "24h",
	}
}

// Service manages application settings
type Service struct {
	configPath string
	settings   Settings
}

// NewService creates a new Settings service
func NewService(configDir string) (*Service, error) {
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config dir: %w", err)
	}

	svc := &Service{
		configPath: filepath.Join(configDir, "settings.json"),
		settings:   DefaultSettings(),
	}

	if err := svc.Load(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed to load settings: %w", err)
	}

	return svc, nil
}

// Load reads settings from disk (merges with defaults for any missing fields)
func (s *Service) Load() error {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		return err
	}

	loaded := DefaultSettings()
	if err := json.Unmarshal(data, &loaded); err != nil {
		return fmt.Errorf("invalid settings JSON: %w", err)
	}

	s.settings = loaded
	return nil
}

// Save writes settings to disk
func (s *Service) Save() error {
	data, err := json.MarshalIndent(s.settings, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}
	return os.WriteFile(s.configPath, data, 0644)
}

// Get returns the current settings
func (s *Service) Get() Settings {
	return s.settings
}

// Update replaces the current settings and saves them
func (s *Service) Update(updated Settings) error {
	s.settings = updated
	return s.Save()
}

// UpdatePartial allows updating specific fields while preserving others
func (s *Service) UpdatePartial(updater func(*Settings)) error {
	updater(&s.settings)
	return s.Save()
}

// Reset restores default settings and saves them
func (s *Service) Reset() error {
	s.settings = defaultSettings()
	return s.Save()
}

func defaultSettings() Settings {
	return DefaultSettings()
}
