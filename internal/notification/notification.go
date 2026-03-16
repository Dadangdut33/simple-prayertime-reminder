package notification

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/logging"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

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

// Service manages the prayer reminder window
type Service struct {
	mu                    sync.Mutex
	reminderWindow        *application.WebviewWindow
	testReminderWindow    *application.WebviewWindow
	app                   *application.App
	audioSvc              *audio.Service
	nativeNotifSvc        *notifications.NotificationService
	dialogCh              chan ReminderInfo
	dialogClosed          bool
	dialogCloseOnce       sync.Once
	lastInfo              *ReminderInfo
	lastTestInfo          *ReminderInfo
	reminderStatePath     string
	testReminderStatePath string
}

var log = logging.With("notification")

// NewService creates a new Notification service
func NewService(app *application.App, audioSvc *audio.Service, nativeNotifSvc *notifications.NotificationService) *Service {
	log.Info("notification service init")
	svc := &Service{
		app:            app,
		audioSvc:       audioSvc,
		nativeNotifSvc: nativeNotifSvc,
		dialogCh:       make(chan ReminderInfo, 1),
	}
	go svc.dialogWorker()
	return svc
}

// SetStatePaths configures where reminder state JSON files are written.
func (svc *Service) SetStatePaths(reminderPath, testReminderPath string) {
	svc.mu.Lock()
	defer svc.mu.Unlock()
	svc.reminderStatePath = reminderPath
	svc.testReminderStatePath = testReminderPath
	log.Info("state paths set", "reminder", reminderPath, "test", testReminderPath)
}

// ShowReminder creates or updates the reminder window with prayer info
func (svc *Service) ShowReminder(info ReminderInfo) {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	info.Live = true
	info.TriggerID = time.Now().UnixMilli()
	latest := info
	svc.lastInfo = &latest

	notif := info.Notification
	showDialog := false
	if notif != nil && notif.UseNativeNotification {
		svc.sendNativeNotificationLocked(info, notif.NativeNotificationSticky)
	}

	shouldShowWindow := true
	alwaysOnTop := true
	if notif != nil {
		alwaysOnTop = notif.AlwaysOnTop
		if notif.UseNativeDialog {
			shouldShowWindow = false
			showDialog = true
		}
	}
	if shouldShowWindow {
		svc.ensureReminderWindowLocked(true, alwaysOnTop)
	} else if svc.reminderWindow != nil {
		svc.reminderWindow.Hide()
	}
	svc.writeStateLocked(svc.reminderStatePath, info)
	if notif != nil && notif.UseNativeDialog {
		svc.playAdhanForDialog(info, notif)
	}
	if showDialog {
		svc.enqueueNativeDialog(info)
	}

	// Emit event so the reminder page can update
	svc.app.Event.Emit("reminder:update", info)
	log.Info("reminder shown", "prayer", info.PrayerName, "state", info.State, "offsetMinutes", info.OffsetMinutes, "triggerId", info.TriggerID)
}

// UpdateState updates the reminder window's state
func (svc *Service) UpdateState(state WindowState, minutesLeft int, prayerName string) {
	triggerID := int64(0)
	live := true
	var notif *ReminderNotificationSettings
	if svc.lastInfo != nil {
		triggerID = svc.lastInfo.TriggerID
		live = svc.lastInfo.Live
		notif = svc.lastInfo.Notification
	}
	info := ReminderInfo{
		PrayerName:    prayerName,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: 0,
		TriggerID:     triggerID,
		Live:          live,
		Notification:  notif,
	}

	svc.mu.Lock()
	latest := info
	svc.lastInfo = &latest
	svc.writeStateLocked(svc.reminderStatePath, info)
	svc.mu.Unlock()

	svc.app.Event.Emit("reminder:update", info)
	log.Info("reminder updated", "prayer", info.PrayerName, "state", info.State, "minutesLeft", info.MinutesLeft)
}

// ShowTestReminder creates or updates the simulated reminder window with prayer info.
func (svc *Service) ShowTestReminder(info ReminderInfo) {
	svc.mu.Lock()
	info.TriggerID = time.Now().UnixMilli()
	latest := info
	svc.lastTestInfo = &latest
	notif := info.Notification
	showDialog := false
	if notif != nil && notif.UseNativeNotification {
		svc.sendNativeNotificationLocked(info, notif.NativeNotificationSticky)
	}
	shouldShowWindow := true
	alwaysOnTop := true
	if notif != nil {
		alwaysOnTop = notif.AlwaysOnTop
		if notif.UseNativeDialog {
			shouldShowWindow = false
			showDialog = true
		}
	}
	if shouldShowWindow {
		svc.ensureTestReminderWindowLocked(true, alwaysOnTop)
	} else if svc.testReminderWindow != nil {
		svc.testReminderWindow.Hide()
	}
	svc.writeStateLocked(svc.testReminderStatePath, info)
	svc.mu.Unlock()
	if notif != nil && notif.UseNativeDialog {
		svc.playAdhanForDialog(info, notif)
	}
	if showDialog {
		svc.enqueueNativeDialog(info)
	}

	svc.app.Event.Emit("reminder:test-update", info)
	log.Info("test reminder shown", "prayer", info.PrayerName, "state", info.State, "offsetMinutes", info.OffsetMinutes, "triggerId", info.TriggerID, "live", info.Live)
}

// UpdateTestState updates the simulated reminder window's state without forcing it to show.
func (svc *Service) UpdateTestState(
	state WindowState,
	minutesLeft int,
	prayerName string,
	offsetMinutes int,
	live bool,
	notif *ReminderNotificationSettings,
) {
	triggerID := int64(0)
	var previousNotif *ReminderNotificationSettings
	if svc.lastTestInfo != nil {
		triggerID = svc.lastTestInfo.TriggerID
		previousNotif = svc.lastTestInfo.Notification
	}
	if notif == nil {
		notif = previousNotif
	}
	info := ReminderInfo{
		PrayerName:    prayerName,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: offsetMinutes,
		TriggerID:     triggerID,
		Live:          live,
		Notification:  notif,
	}

	svc.mu.Lock()
	latest := info
	svc.lastTestInfo = &latest
	svc.writeStateLocked(svc.testReminderStatePath, info)
	svc.mu.Unlock()

	svc.app.Event.Emit("reminder:test-update", info)
	log.Info("test reminder updated", "prayer", info.PrayerName, "state", info.State, "minutesLeft", info.MinutesLeft, "offsetMinutes", info.OffsetMinutes, "live", info.Live)
}

// CloseReminder hides the reminder window
func (svc *Service) CloseReminder() {
	svc.mu.Lock()
	defer svc.mu.Unlock()

	if svc.reminderWindow != nil {
		svc.reminderWindow.Hide()
	}
	log.Info("reminder closed")
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
	log.Info("test reminder closed")
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
		log.Info("re-emit reminder", "prayer", info.PrayerName, "state", info.State)
	}
	if testInfo != nil {
		svc.app.Event.Emit("reminder:test-update", *testInfo)
		log.Info("re-emit test reminder", "prayer", testInfo.PrayerName, "state", testInfo.State)
	}
}

// EmitLastTestReminder replays the latest simulated reminder info, if available.
func (svc *Service) EmitLastTestReminder() {
	svc.mu.Lock()
	info := svc.lastTestInfo
	svc.mu.Unlock()

	if info != nil {
		svc.app.Event.Emit("reminder:test-update", *info)
		log.Info("re-emit test reminder", "prayer", info.PrayerName, "state", info.State)
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

func (svc *Service) ensureReminderWindowLocked(show bool, alwaysOnTop bool) {
	if svc.reminderWindow == nil {
		log.Info("creating reminder window")
		svc.reminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder",
			Width:            480,
			Height:           330,
			MinWidth:         400,
			MinHeight:        300,
			MaxHeight:        500,
			MaxWidth:         500,
			Frameless:        false,
			AlwaysOnTop:      alwaysOnTop,
			DisableResize:    false,
			Hidden:           false,
			URL:              "/reminder",
			BackgroundColour: application.NewRGB(20, 20, 30),
		})
		svc.reminderWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
			log.Info("reminder window closing")
			svc.mu.Lock()
			svc.reminderWindow = nil
			svc.mu.Unlock()
			svc.stopAudio()
		})
	} else {
		svc.reminderWindow.SetAlwaysOnTop(alwaysOnTop)
	}
	if show {
		log.Info("show reminder window")
		svc.reminderWindow.Show()
	}
}

func (svc *Service) ensureTestReminderWindowLocked(show bool, alwaysOnTop bool) {
	if svc.testReminderWindow == nil {
		log.Info("creating test reminder window")
		svc.testReminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder (Simulated)",
			Width:            480,
			Height:           370,
			MinWidth:         400,
			MinHeight:        300,
			MaxWidth:         500,
			MaxHeight:        500,
			Frameless:        false,
			AlwaysOnTop:      alwaysOnTop,
			DisableResize:    false,
			Hidden:           false,
			URL:              "/reminder?mode=test",
			BackgroundColour: application.NewRGB(20, 20, 30),
		})
		svc.testReminderWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
			log.Info("test reminder window closing")
			svc.mu.Lock()
			svc.testReminderWindow = nil
			svc.mu.Unlock()
			svc.stopAudio()
		})
	} else {
		svc.testReminderWindow.SetAlwaysOnTop(alwaysOnTop)
	}
	if show {
		log.Info("show test reminder window")
		svc.testReminderWindow.Show()
	}
}

func (svc *Service) stopAudio() {
	if svc.audioSvc != nil {
		log.Info("stop adhan requested")
		svc.audioSvc.Stop()
	}
}

func (svc *Service) buildReminderText(info ReminderInfo) (string, string) {
	prayer := info.PrayerName
	switch info.State {
	case StateOnTime:
		return "Time for prayer", fmt.Sprintf("It's time for %s prayer.", prayer)
	case StateAfter:
		offset := info.OffsetMinutes
		if offset <= 0 {
			offset = info.MinutesLeft
		}
		if offset < 0 {
			offset = -offset
		}
		return "Prayer reminder", fmt.Sprintf("%d minutes have passed since %s prayer.", offset, prayer)
	default:
		minutes := info.MinutesLeft
		if minutes <= 0 {
			minutes = -info.OffsetMinutes
		}
		if minutes < 0 {
			minutes = -minutes
		}
		return "Prayer reminder", fmt.Sprintf("%s starts in %d minutes.", prayer, minutes)
	}
}

func (svc *Service) showNativeDialog(info ReminderInfo) {
	title, body := svc.buildReminderText(info)
	dialog := svc.app.Dialog.Question().SetTitle(title).SetMessage(body)

	dismiss := dialog.AddButton("Dismiss")
	dismiss.OnClick(func() {
		svc.stopAudio()
	})

	dialog.Show()
}

func (svc *Service) enqueueNativeDialog(info ReminderInfo) {
	svc.mu.Lock()
	closed := svc.dialogClosed
	svc.mu.Unlock()
	if closed {
		log.Info("native dialog queue closed, skipping")
		return
	}
	select {
	case svc.dialogCh <- info:
		log.Info("native dialog queued")
	default:
		log.Info("native dialog already in progress, skipping")
	}
}

func (svc *Service) dialogWorker() {
	for info := range svc.dialogCh {
		svc.showNativeDialog(info)
	}
}

// Shutdown stops the dialog worker and prevents new dialogs.
func (svc *Service) Shutdown() {
	svc.dialogCloseOnce.Do(func() {
		svc.mu.Lock()
		svc.dialogClosed = true
		svc.mu.Unlock()
		close(svc.dialogCh)
	})
}

func (svc *Service) sendNativeNotificationLocked(info ReminderInfo, sticky bool) {
	if svc.nativeNotifSvc == nil {
		log.Warn("native notifications unavailable")
		return
	}
	allowed, err := svc.nativeNotifSvc.CheckNotificationAuthorization()
	if err != nil {
		log.Warn("native notification permission check failed", "error", err)
		return
	}
	if !allowed {
		log.Warn("native notification permission not granted")
		return
	}
	title, body := svc.buildReminderText(info)
	id := fmt.Sprintf("reminder-%d", info.TriggerID)
	if err := svc.nativeNotifSvc.SendNotification(notifications.NotificationOptions{
		ID:    id,
		Title: title,
		Body:  body,
	}); err != nil {
		log.Error("native notification send failed", "error", err)
	}
	if sticky {
		log.Info("native notification sticky requested (platform support may vary)")
	}
}

func (svc *Service) playAdhanForDialog(info ReminderInfo, notif *ReminderNotificationSettings) {
	if svc.audioSvc == nil || notif == nil {
		return
	}
	if !notif.PlayAdhan || info.State != StateOnTime {
		return
	}
	if strings.EqualFold(info.PrayerName, "Sunrise") {
		return
	}
	isFajr := strings.EqualFold(info.PrayerName, "Fajr")
	if err := svc.audioSvc.Play(isFajr, notif.AdhanVolume); err != nil {
		log.Error("dialog adhan play failed", "error", err, "fajr", isFajr)
	}
}

// CheckNativeNotificationPermission reports whether the OS allows notifications.
func (svc *Service) CheckNativeNotificationPermission() (bool, error) {
	if svc.nativeNotifSvc == nil {
		return false, fmt.Errorf("native notification service not available")
	}
	return svc.nativeNotifSvc.CheckNotificationAuthorization()
}

// RequestNativeNotificationPermission prompts for notification permission.
func (svc *Service) RequestNativeNotificationPermission() (bool, error) {
	if svc.nativeNotifSvc == nil {
		return false, fmt.Errorf("native notification service not available")
	}
	return svc.nativeNotifSvc.RequestNotificationAuthorization()
}

func (svc *Service) writeStateLocked(path string, info ReminderInfo) {
	if path == "" {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		log.Error("state dir create failed", "error", err, "path", path)
		return
	}
	data, err := json.Marshal(info)
	if err != nil {
		log.Error("state marshal failed", "error", err)
		return
	}
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		log.Error("state write failed", "error", err, "path", tmpPath)
		return
	}
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(path)
		if err := os.Rename(tmpPath, path); err != nil {
			log.Error("state commit failed", "error", err, "path", path)
		}
	}
}
