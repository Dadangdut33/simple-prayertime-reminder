package notification

import (
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

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
