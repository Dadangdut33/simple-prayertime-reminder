package settings

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/geonames"
)

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
			Style:                    NotificationWindow,
			PlayAdhan:                true,
			AdhanVolume:              0.5,
			PersistentReminder:       false,
			AutoDismissSeconds:       30,
			AutoDismissAfterAdhan:    true,
			AlwaysOnTop:              true,
			UseNativeNotification:    true,
			NativeNotificationSticky: true,
			UseNativeDialog:          false,
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
		LogLevel:         "info",
		AutoStart:        false,
		AutoCheckUpdates: true,
		TrayLeftClick:    "toggle-window",
		HijriDateOffset:  0,
		TimeFormat:       "24h",
		EnableTestTools:  false,
	}
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

	log.Info("settings loaded", "path", svc.configPath)
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
	log.Info("settings read from disk", "path", s.configPath)
	return nil
}

// Save writes settings to disk
func (s *Service) Save() error {
	data, err := json.MarshalIndent(s.settings, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}
	if err := os.WriteFile(s.configPath, data, 0644); err != nil {
		return err
	}
	log.Info("settings saved", "path", s.configPath)
	return nil
}

// Get returns the current settings
func (s *Service) Get() Settings {
	return s.settings
}

// Update replaces the current settings and saves them
func (s *Service) Update(updated Settings) error {
	s.settings = updated
	log.Info("settings updated")
	return s.Save()
}

// UpdatePartial allows updating specific fields while preserving others
func (s *Service) UpdatePartial(updater func(*Settings)) error {
	updater(&s.settings)
	log.Info("settings updated (partial)")
	return s.Save()
}

// Reset restores default settings and saves them
func (s *Service) Reset() error {
	s.settings = defaultSettings()
	log.Info("settings reset to default")
	return s.Save()
}

func defaultSettings() Settings {
	return DefaultSettings()
}
