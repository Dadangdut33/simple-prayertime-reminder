package notification

import (
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

const (
	// W
	reminderW    = 440
	reminderMinW = 380
	reminderMaxW = 500
	// H
	reminderBaseH    = 280
	reminderBaseMinH = 280
	reminderBaseMaxH = 300
	// After reminder have different height because of its size
	reminderAfterH    = 580
	reminderAfterMinH = 580
	reminderAfterMaxH = 640
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
	height, minHeight, maxHeight := reminderBaseH, reminderBaseMinH, reminderBaseMaxH
	if info.State == StateAfter {
		height, minHeight, maxHeight = reminderAfterH, reminderAfterMinH, reminderAfterMaxH
	}
	if shouldShowWindow {
		svc.ensureReminderWindowLocked(true, alwaysOnTop, height, minHeight, maxHeight)
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
	height, minHeight, maxHeight := reminderBaseH, reminderBaseMinH, reminderBaseMaxH
	if info.State == StateAfter {
		height, minHeight, maxHeight = reminderAfterH, reminderAfterMinH, reminderAfterMaxH
	}
	if shouldShowWindow {
		svc.ensureTestReminderWindowLocked(true, alwaysOnTop, height, minHeight, maxHeight)
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
	language string,
	notif *ReminderNotificationSettings,
) {
	triggerID := int64(0)
	var previousNotif *ReminderNotificationSettings
	previousLanguage := ""
	if svc.lastTestInfo != nil {
		triggerID = svc.lastTestInfo.TriggerID
		previousNotif = svc.lastTestInfo.Notification
		previousLanguage = svc.lastTestInfo.Language
	}
	if notif == nil {
		notif = previousNotif
	}
	if language == "" {
		language = previousLanguage
	}
	info := ReminderInfo{
		PrayerName:    prayerName,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: offsetMinutes,
		TriggerID:     triggerID,
		Live:          live,
		Language:      language,
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

func (svc *Service) ensureReminderWindowLocked(show bool, alwaysOnTop bool, height int, minHeight int, maxHeight int) {
	log.Info(
		"Reminder Window Params",
		"height", height,
		"minHeight", minHeight,
		"alwaysOnTop", alwaysOnTop,
	)
	if svc.reminderWindow == nil {
		log.Info("creating reminder window")
		svc.reminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder",
			Width:            reminderW,
			Height:           height,
			MinWidth:         reminderMinW,
			MinHeight:        minHeight,
			MaxHeight:        maxHeight,
			MaxWidth:         reminderMaxW,
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
		log.Info("reminder window still exist")
		svc.reminderWindow.SetAlwaysOnTop(alwaysOnTop)
		svc.reminderWindow.SetSize(reminderW, height)
		svc.reminderWindow.SetMinSize(reminderMinW, minHeight)
		svc.reminderWindow.SetMaxSize(reminderMaxW, maxHeight)
	}
	if show {
		log.Info("show reminder window")
		svc.reminderWindow.Show()
	}
}

func (svc *Service) ensureTestReminderWindowLocked(show bool, alwaysOnTop bool, height int, minHeight int, maxHeight int) {
	log.Info(
		"Test Reminder Window Params",
		"height", height,
		"minHeight", minHeight,
		"alwaysOnTop", alwaysOnTop,
	)
	heightOffset := 0 // add h offset because debug window have some debug component
	if svc.testReminderWindow == nil {
		log.Info("creating test reminder window")
		svc.testReminderWindow = svc.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Title:            "Prayer Reminder (Simulated)",
			Width:            reminderW,
			Height:           height + heightOffset,
			MinWidth:         reminderMinW,
			MinHeight:        minHeight,
			MaxWidth:         reminderMaxW,
			MaxHeight:        maxHeight,
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
		log.Info("test reminder window still exist")
		svc.testReminderWindow.SetAlwaysOnTop(alwaysOnTop)
		svc.testReminderWindow.SetSize(reminderW, height+heightOffset)
		svc.testReminderWindow.SetMinSize(reminderMinW, minHeight)
		svc.testReminderWindow.SetMaxSize(reminderMaxW, maxHeight)
	}
	if show {
		log.Info("show test reminder window")
		svc.testReminderWindow.Show()
	}
}
