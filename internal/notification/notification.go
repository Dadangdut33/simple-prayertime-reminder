package notification

import (
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// WindowState represents the state of the reminder window
type WindowState string

const (
	StateBefore  WindowState = "before"
	StateOnTime  WindowState = "ontime"
	StateAfter   WindowState = "after"
)

// ReminderInfo contains data passed to the reminder window
type ReminderInfo struct {
	PrayerName string      `json:"prayerName"`
	State      WindowState `json:"state"`
	MinutesLeft int        `json:"minutesLeft"`
}

// Service manages the prayer reminder window
type Service struct {
	mu             sync.Mutex
	reminderWindow *application.WebviewWindow
	app            *application.App
}

// NewService creates a new Notification service
func NewService(app *application.App) *Service {
	return &Service{app: app}
}

// ShowReminder creates or updates the reminder window with prayer info
func (svc *Service) ShowReminder(info ReminderInfo) {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.reminderWindow == nil {
		svc.reminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder",
			Width:            380,
			Height:           220,
			Frameless:        false,
			AlwaysOnTop:      true,
			DisableResize:    true,
			Hidden:           false,
			URL:              "/#/reminder",
			BackgroundColour: application.NewRGB(20, 20, 30),
		})
	} else {
		svc.reminderWindow.Show()
	}

	// Emit event so the reminder page can update
	svc.app.Event.Emit("reminder:update", info)
}

// UpdateState updates the reminder window's state
func (svc *Service) UpdateState(state WindowState, minutesLeft int, prayerName string) {
	svc.app.Event.Emit("reminder:update", ReminderInfo{
		PrayerName:  prayerName,
		State:       state,
		MinutesLeft: minutesLeft,
	})
}

// CloseReminder hides the reminder window
func (svc *Service) CloseReminder() {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.reminderWindow != nil {
		svc.reminderWindow.Hide()
	}
}
