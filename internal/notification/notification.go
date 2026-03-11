package notification

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// WindowState represents the state of the reminder window
type WindowState string

const (
	StateBefore WindowState = "before"
	StateOnTime WindowState = "ontime"
	StateAfter  WindowState = "after"
)

// ReminderInfo contains data passed to the reminder window
type ReminderInfo struct {
	PrayerName    string      `json:"prayerName"`
	State         WindowState `json:"state"`
	MinutesLeft   int         `json:"minutesLeft"`
	OffsetMinutes int         `json:"offsetMinutes"`
	TriggerID     int64       `json:"triggerId"`
	Live          bool        `json:"live"`
}

// Service manages the prayer reminder window
type Service struct {
	mu                    sync.Mutex
	reminderWindow        *application.WebviewWindow
	testReminderWindow    *application.WebviewWindow
	app                   *application.App
	audioSvc              *audio.Service
	lastInfo              *ReminderInfo
	lastTestInfo          *ReminderInfo
	reminderStatePath     string
	testReminderStatePath string
}

// NewService creates a new Notification service
func NewService(app *application.App, audioSvc *audio.Service) *Service {
	return &Service{app: app, audioSvc: audioSvc}
}

// SetStatePaths configures where reminder state JSON files are written.
func (svc *Service) SetStatePaths(reminderPath, testReminderPath string) {
	svc.mu.Lock()
	defer svc.mu.Unlock()
	svc.reminderStatePath = reminderPath
	svc.testReminderStatePath = testReminderPath
}

// ShowReminder creates or updates the reminder window with prayer info
func (svc *Service) ShowReminder(info ReminderInfo) {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	info.Live = true
	info.TriggerID = time.Now().UnixMilli()
	latest := info
	svc.lastInfo = &latest

	svc.ensureReminderWindowLocked(true)
	svc.writeStateLocked(svc.reminderStatePath, info)

	// Emit event so the reminder page can update
	svc.app.Event.Emit("reminder:update", info)
}

// UpdateState updates the reminder window's state
func (svc *Service) UpdateState(state WindowState, minutesLeft int, prayerName string) {
	triggerID := int64(0)
	live := true
	if svc.lastInfo != nil {
		triggerID = svc.lastInfo.TriggerID
		live = svc.lastInfo.Live
	}
	info := ReminderInfo{
		PrayerName:    prayerName,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: 0,
		TriggerID:     triggerID,
		Live:          live,
	}

	svc.mu.Lock()
	latest := info
	svc.lastInfo = &latest
	svc.writeStateLocked(svc.reminderStatePath, info)
	svc.mu.Unlock()

	svc.app.Event.Emit("reminder:update", info)
}

// ShowTestReminder creates or updates the simulated reminder window with prayer info.
func (svc *Service) ShowTestReminder(info ReminderInfo) {
	svc.mu.Lock()
	info.TriggerID = time.Now().UnixMilli()
	latest := info
	svc.lastTestInfo = &latest
	svc.ensureTestReminderWindowLocked(true)
	svc.writeStateLocked(svc.testReminderStatePath, info)
	svc.mu.Unlock()

	svc.app.Event.Emit("reminder:test-update", info)
}

// UpdateTestState updates the simulated reminder window's state without forcing it to show.
func (svc *Service) UpdateTestState(state WindowState, minutesLeft int, prayerName string, offsetMinutes int, live bool) {
	triggerID := int64(0)
	if svc.lastTestInfo != nil {
		triggerID = svc.lastTestInfo.TriggerID
	}
	info := ReminderInfo{
		PrayerName:    prayerName,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: offsetMinutes,
		TriggerID:     triggerID,
		Live:          live,
	}

	svc.mu.Lock()
	latest := info
	svc.lastTestInfo = &latest
	svc.writeStateLocked(svc.testReminderStatePath, info)
	svc.mu.Unlock()

	svc.app.Event.Emit("reminder:test-update", info)
}

// CloseReminder hides the reminder window
func (svc *Service) CloseReminder() {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.reminderWindow != nil {
		svc.reminderWindow.Hide()
	}
	svc.stopAudio()
}

// CloseTestReminder hides the simulated reminder window
func (svc *Service) CloseTestReminder() {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.testReminderWindow != nil {
		svc.testReminderWindow.Hide()
	}
	svc.lastTestInfo = nil
	svc.stopAudio()
}

// EmitLastReminder replays the latest reminder info, if available.
func (svc *Service) EmitLastReminder() {
	svc.mu.Lock()
	info := svc.lastInfo
	testInfo := svc.lastTestInfo
	svc.mu.Unlock()

	if info != nil {
		svc.app.Event.Emit("reminder:update", *info)
	}
	if testInfo != nil {
		svc.app.Event.Emit("reminder:test-update", *testInfo)
	}
}

// EmitLastTestReminder replays the latest simulated reminder info, if available.
func (svc *Service) EmitLastTestReminder() {
	svc.mu.Lock()
	info := svc.lastTestInfo
	svc.mu.Unlock()

	if info != nil {
		svc.app.Event.Emit("reminder:test-update", *info)
	}
}

// LastReminder returns the most recent reminder info, if any.
func (svc *Service) LastReminder() *ReminderInfo {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.lastInfo == nil {
		return nil
	}
	copy := *svc.lastInfo
	return &copy
}

// LastTestReminder returns the most recent simulated reminder info, if any.
func (svc *Service) LastTestReminder() *ReminderInfo {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.lastTestInfo == nil {
		return nil
	}
	copy := *svc.lastTestInfo
	return &copy
}

func (svc *Service) ensureReminderWindowLocked(show bool) {
	if svc.reminderWindow == nil {
		svc.reminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder",
			Width:            480,
			Height:           330,
			MinWidth:         400,
			MinHeight:        300,
			MaxHeight:        500,
			MaxWidth:         500,
			Frameless:        false,
			AlwaysOnTop:      true,
			DisableResize:    false,
			Hidden:           false,
			URL:              "/reminder",
			BackgroundColour: application.NewRGB(20, 20, 30),
		})
		svc.reminderWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
			svc.mu.Lock()
			svc.reminderWindow = nil
			svc.mu.Unlock()
			svc.stopAudio()
		})
	} else if show {
		svc.reminderWindow.Show()
	}
}

func (svc *Service) ensureTestReminderWindowLocked(show bool) {
	if svc.testReminderWindow == nil {
		svc.testReminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder (Simulated)",
			Width:            480,
			Height:           370,
			MinWidth:         400,
			MinHeight:        300,
			MaxWidth:         500,
			MaxHeight:        500,
			Frameless:        false,
			AlwaysOnTop:      true,
			DisableResize:    false,
			Hidden:           false,
			URL:              "/reminder?mode=test",
			BackgroundColour: application.NewRGB(20, 20, 30),
		})
		svc.testReminderWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
			svc.mu.Lock()
			svc.testReminderWindow = nil
			svc.mu.Unlock()
			svc.stopAudio()
		})
	} else if show {
		svc.testReminderWindow.Show()
	}
}

func (svc *Service) stopAudio() {
	if svc.audioSvc != nil {
		svc.audioSvc.Stop()
	}
}

func (svc *Service) writeStateLocked(path string, info ReminderInfo) {
	if path == "" {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		fmt.Printf("reminder: failed to create state dir: %v\n", err)
		return
	}
	data, err := json.Marshal(info)
	if err != nil {
		fmt.Printf("reminder: failed to marshal state: %v\n", err)
		return
	}
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		fmt.Printf("reminder: failed to write state: %v\n", err)
		return
	}
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(path)
		if err := os.Rename(tmpPath, path); err != nil {
			fmt.Printf("reminder: failed to commit state: %v\n", err)
		}
	}
}
