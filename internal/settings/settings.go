package settings

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/geonames"
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
	AfterMinutes  int  `json:"afterMinutes"`  // minutes after prayer to remind again
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
	Style              NotificationStyle     `json:"style"`
	PlayAdhan          bool                  `json:"playAdhan"`
	AdhanVolume        float64               `json:"adhanVolume"` // 0.0 to 1.0
	PersistentReminder bool                  `json:"persistentReminder"`
	AutoDismissSeconds int                   `json:"autoDismissSeconds"`
	Prayers            PerPrayerNotification `json:"prayers"`
}

// LocationSettings stores location configuration
type LocationSettings struct {
	AutoDetect bool    `json:"autoDetect"`
	InputMode  string  `json:"inputMode"` // "list" or "custom"
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
	Method                string        `json:"method"`
	AsrMethod             string        `json:"asrMethod"`
	Offsets               PrayerOffsets `json:"offsets"`
	CustomFajrAngle       float64       `json:"customFajrAngle"`
	CustomIshaAngle       float64       `json:"customIshaAngle"`
	CustomMaghribDuration float64       `json:"customMaghribDuration"`
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

// WorldPrayerCity stores a saved city entry for the world prayer times page.
type WorldPrayerCity struct {
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

// WorldPrayerSettings controls the world prayer times view.
type WorldPrayerSettings struct {
	Cities []WorldPrayerCity `json:"cities"`
	SortBy string            `json:"sortBy"` // "name", "offset", "current-time", "next-prayer"
}

// Settings is the root configuration struct
type Settings struct {
	Location         LocationSettings     `json:"location"`
	Prayer           PrayerSettings       `json:"prayer"`
	Notification     NotificationSettings `json:"notification"`
	Dashboard        DashboardSettings    `json:"dashboard"`
	PrayerTimes      PrayerTimesSettings  `json:"prayerTimes"`
	WorldPrayer      WorldPrayerSettings  `json:"worldPrayer"`
	Theme            string               `json:"theme"` // "light", "dark", "system"
	ThemePreset      string               `json:"themePreset"`
	Language         string               `json:"language"` // "en", "id", etc
	AutoStart        bool                 `json:"autoStart"`
	AutoCheckUpdates bool                 `json:"autoCheckUpdates"`
	TrayLeftClick    string               `json:"trayLeftClick"`   // "toggle-window", "open-menu", or "none"
	HijriDateOffset  int                  `json:"hijriDateOffset"` // -2 to +2 days
	TimeFormat       string               `json:"timeFormat"`      // "12h" or "24h"
	EnableTestTools  bool                 `json:"enableTestTools"`
}

func worldPrayerCityFromGeonames(city geonames.City) WorldPrayerCity {
	return WorldPrayerCity{
		ID:          city.ID,
		Name:        city.Name,
		CountryCode: city.CountryCode,
		Admin1:      city.Admin1,
		Latitude:    city.Latitude,
		Longitude:   city.Longitude,
		Elevation:   city.Elevation,
		Timezone:    city.Timezone,
		Label:       city.Label,
	}
}

func fallbackWorldPrayerCities() []WorldPrayerCity {
	return []WorldPrayerCity{
		{
			Name:        "Makkah",
			CountryCode: "SA",
			Admin1:      "Makkah",
			Latitude:    21.4225,
			Longitude:   39.8262,
			Elevation:   277,
			Timezone:    "Asia/Riyadh",
			Label:       "Makkah, SA",
		},
		{
			Name:        "Madinah",
			CountryCode: "SA",
			Admin1:      "Madinah",
			Latitude:    24.4709,
			Longitude:   39.6122,
			Elevation:   610,
			Timezone:    "Asia/Riyadh",
			Label:       "Madinah, SA",
		},
		{
			Name:        "Al-Quds (Jerusalem)",
			CountryCode: "PS",
			Admin1:      "Jerusalem",
			Latitude:    31.7683,
			Longitude:   35.2137,
			Elevation:   754,
			Timezone:    "Asia/Jerusalem",
			Label:       "Al-Quds (Jerusalem)",
		},
	}
}

func defaultWorldPrayerCities() []WorldPrayerCity {
	cities := []struct {
		Name            string
		CountryCode     string
		LabelOverride   string
		NameOverride    string
		CountryOverride string
	}{
		{Name: "Makkah", CountryCode: "SA"},
		{Name: "Madinah", CountryCode: "SA"},
		{Name: "Jerusalem", CountryCode: "IL", NameOverride: "Al-Quds (Jerusalem)", LabelOverride: "Al-Quds (Jerusalem)", CountryOverride: "PS"},
	}

	results := make([]WorldPrayerCity, 0, len(cities))
	for _, entry := range cities {
		found, ok := geonames.FindCityByName(entry.Name, entry.CountryCode)
		if !ok {
			return fallbackWorldPrayerCities()
		}
		city := worldPrayerCityFromGeonames(found)
		if entry.NameOverride != "" {
			city.Name = entry.NameOverride
		}
		if entry.LabelOverride != "" {
			city.Label = entry.LabelOverride
		}
		if entry.CountryOverride != "" {
			city.CountryCode = entry.CountryOverride
		}
		results = append(results, city)
	}

	return results
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
			InputMode:  "custom",
			City:       "",
			Country:    "",
			Latitude:   -6.2,
			Longitude:  106.816666,
			Elevation:  0,
			Timezone:   "Asia/Jakarta",
		},
		Prayer: PrayerSettings{
			Method:                "Kemenag",
			AsrMethod:             "Shafii",
			Offsets:               PrayerOffsets{},
			CustomFajrAngle:       20,
			CustomIshaAngle:       18,
			CustomMaghribDuration: 0,
		},
		Notification: NotificationSettings{
			Style:              NotificationWindow,
			PlayAdhan:          true,
			AdhanVolume:        0.8,
			PersistentReminder: false,
			AutoDismissSeconds: 30,
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
		WorldPrayer: WorldPrayerSettings{
			Cities: defaultWorldPrayerCities(),
			SortBy: "name",
		},
		Theme:            "system",
		ThemePreset:      "indigo",
		Language:         "en",
		AutoStart:        false,
		AutoCheckUpdates: true,
		TrayLeftClick:    "toggle-window",
		HijriDateOffset:  0,
		TimeFormat:       "24h",
		EnableTestTools:  false,
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
