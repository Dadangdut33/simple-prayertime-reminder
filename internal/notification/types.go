package notification

// WindowState represents the state of the reminder window
type WindowState string

const (
	StateBefore WindowState = "before"
	StateOnTime WindowState = "ontime"
	StateAfter  WindowState = "after"
)

// ReminderNotificationSettings is a snapshot of reminder-related settings.
type ReminderNotificationSettings struct {
	PersistentReminder       bool    `json:"persistentReminder"`
	AutoDismissSeconds       int     `json:"autoDismissSeconds"`
	AutoDismissAfterAdhan    bool    `json:"autoDismissAfterAdhan"`
	PlayAdhan                bool    `json:"playAdhan"`
	AdhanVolume              float64 `json:"adhanVolume"`
	AlwaysOnTop              bool    `json:"alwaysOnTop"`
	UseNativeNotification    bool    `json:"useNativeNotification"`
	NativeNotificationSticky bool    `json:"nativeNotificationSticky"`
	UseNativeDialog          bool    `json:"useNativeDialog"`
}

// ReminderInfo contains data passed to the reminder window
type ReminderInfo struct {
	PrayerName    string                        `json:"prayerName"`
	State         WindowState                   `json:"state"`
	MinutesLeft   int                           `json:"minutesLeft"`
	OffsetMinutes int                           `json:"offsetMinutes"`
	TriggerID     int64                         `json:"triggerId"`
	Live          bool                          `json:"live"`
	Notification  *ReminderNotificationSettings `json:"notification,omitempty"`
}
