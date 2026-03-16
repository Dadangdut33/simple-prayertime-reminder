package settings

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
	Style                    NotificationStyle     `json:"style"`
	PlayAdhan                bool                  `json:"playAdhan"`
	AdhanVolume              float64               `json:"adhanVolume"` // 0.0 to 1.0
	PersistentReminder       bool                  `json:"persistentReminder"`
	AutoDismissSeconds       int                   `json:"autoDismissSeconds"`
	AutoDismissAfterAdhan    bool                  `json:"autoDismissAfterAdhan"`
	AlwaysOnTop              bool                  `json:"alwaysOnTop"`
	UseNativeNotification    bool                  `json:"useNativeNotification"`
	NativeNotificationSticky bool                  `json:"nativeNotificationSticky"`
	UseNativeDialog          bool                  `json:"useNativeDialog"`
	Prayers                  PerPrayerNotification `json:"prayers"`
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
	SortBy string            `json:"sortBy"`
}

// Settings holds the full app configuration.
type Settings struct {
	Location         LocationSettings     `json:"location"`
	Prayer           PrayerSettings       `json:"prayer"`
	Notification     NotificationSettings `json:"notification"`
	Dashboard        DashboardSettings    `json:"dashboard"`
	PrayerTimes      PrayerTimesSettings  `json:"prayerTimes"`
	WorldPrayer      WorldPrayerSettings  `json:"worldPrayer"`
	Theme            string               `json:"theme"`
	ThemePreset      string               `json:"themePreset"`
	Language         string               `json:"language"`
	LogLevel         string               `json:"logLevel"`
	AutoStart        bool                 `json:"autoStart"`
	AutoCheckUpdates bool                 `json:"autoCheckUpdates"`
	TrayLeftClick    string               `json:"trayLeftClick"`
	HijriDateOffset  int                  `json:"hijriDateOffset"`
	TimeFormat       string               `json:"timeFormat"`
	EnableTestTools  bool                 `json:"enableTestTools"`
}

// Service handles settings loading and saving
type Service struct {
	configPath string
	settings   Settings
}
