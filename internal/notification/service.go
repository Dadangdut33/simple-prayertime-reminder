package notification

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

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
	allowCloseReminder    bool
	allowCloseTest        bool
	pendingAdhanFallbacks map[string]*pendingAdhanFallback
}

type pendingAdhanFallback struct {
	triggerID      int64
	isTest         bool
	isFajr         bool
	volume         float64
	customPath     string
	customFajrPath string
	timer          *time.Timer
}

const frontendAdhanAckTimeout = 2 * time.Second

// NewService creates a new Notification service
func NewService(app *application.App, audioSvc *audio.Service, nativeNotifSvc *notifications.NotificationService) *Service {
	log.Info("notification service init")
	svc := &Service{
		app:                   app,
		audioSvc:              audioSvc,
		nativeNotifSvc:        nativeNotifSvc,
		dialogCh:              make(chan ReminderInfo, 1),
		pendingAdhanFallbacks: make(map[string]*pendingAdhanFallback),
	}
	go svc.dialogWorker()
	return svc
}

func adhanFallbackKey(triggerID int64, isTest bool) string {
	mode := "live"
	if isTest {
		mode = "test"
	}
	return fmt.Sprintf("%s:%d", mode, triggerID)
}

func shouldScheduleAdhanFallback(info ReminderInfo, notif *ReminderNotificationSettings) bool {
	if notif == nil || info.TriggerID == 0 {
		return false
	}
	if info.State != StateOnTime || !notif.PlayAdhan || notif.UseNativeDialog {
		return false
	}
	return !strings.EqualFold(info.PrayerName, "Sunrise")
}

func (svc *Service) scheduleAdhanFallbackLocked(info ReminderInfo, notif *ReminderNotificationSettings, isTest bool) {
	if !shouldScheduleAdhanFallback(info, notif) || svc.audioSvc == nil {
		return
	}
	key := adhanFallbackKey(info.TriggerID, isTest)
	if prev, ok := svc.pendingAdhanFallbacks[key]; ok {
		prev.timer.Stop()
		delete(svc.pendingAdhanFallbacks, key)
	}
	pending := &pendingAdhanFallback{
		triggerID:      info.TriggerID,
		isTest:         isTest,
		isFajr:         strings.EqualFold(info.PrayerName, "Fajr"),
		volume:         notif.AdhanVolume,
		customPath:     notif.CustomAdhanPath,
		customFajrPath: notif.CustomAdhanFajrPath,
	}
	pending.timer = time.AfterFunc(frontendAdhanAckTimeout, func() {
		svc.runAdhanFallback(key)
	})
	svc.pendingAdhanFallbacks[key] = pending
	log.Info("adhan fallback scheduled", "triggerId", info.TriggerID, "isTest", isTest, "timeout", frontendAdhanAckTimeout)
}

func (svc *Service) runAdhanFallback(key string) {
	svc.mu.Lock()
	pending, ok := svc.pendingAdhanFallbacks[key]
	if !ok {
		svc.mu.Unlock()
		return
	}
	active := false
	if pending.isTest {
		active = svc.lastTestInfo != nil && svc.lastTestInfo.TriggerID == pending.triggerID
	} else {
		active = svc.lastInfo != nil && svc.lastInfo.TriggerID == pending.triggerID
	}
	if !active {
		delete(svc.pendingAdhanFallbacks, key)
		svc.mu.Unlock()
		log.Info("skip adhan fallback: stale trigger", "triggerId", pending.triggerID, "isTest", pending.isTest)
		return
	}
	delete(svc.pendingAdhanFallbacks, key)
	audioSvc := svc.audioSvc
	isFajr := pending.isFajr
	volume := pending.volume
	customPath := pending.customPath
	customFajrPath := pending.customFajrPath
	triggerID := pending.triggerID
	isTest := pending.isTest
	svc.mu.Unlock()

	if audioSvc == nil {
		return
	}
	if err := audioSvc.Play(isFajr, volume, customPath, customFajrPath); err != nil {
		log.Error("adhan fallback play failed", "error", err, "triggerId", triggerID, "isTest", isTest, "fajr", isFajr)
		return
	}
	log.Info("adhan fallback played", "triggerId", triggerID, "isTest", isTest, "fajr", isFajr)
}

func (svc *Service) clearAdhanFallbackLocked(triggerID int64, isTest bool) {
	if triggerID == 0 {
		return
	}
	key := adhanFallbackKey(triggerID, isTest)
	if pending, ok := svc.pendingAdhanFallbacks[key]; ok {
		pending.timer.Stop()
		delete(svc.pendingAdhanFallbacks, key)
	}
}

func (svc *Service) AckAdhanPlayback(triggerID int64, isTest bool) {
	if triggerID == 0 {
		return
	}
	svc.mu.Lock()
	svc.clearAdhanFallbackLocked(triggerID, isTest)
	svc.mu.Unlock()
	log.Info("adhan playback ack", "triggerId", triggerID, "isTest", isTest)
}

// SetStatePaths configures where reminder state JSON files are written.
func (svc *Service) SetStatePaths(reminderPath, testReminderPath string) {
	svc.mu.Lock()
	defer svc.mu.Unlock()
	svc.reminderStatePath = reminderPath
	svc.testReminderStatePath = testReminderPath
	log.Info("state paths set", "reminder", reminderPath, "test", testReminderPath)
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

// EmitSettingsUpdate broadcasts a settings update to all windows.
func (svc *Service) EmitSettingsUpdate(cfg settings.Settings) {
	if svc == nil || svc.app == nil {
		return
	}
	svc.app.Event.Emit("settings:update", cfg)
	log.Info("settings update emitted")
}

// EmitPrayerUpdate broadcasts that a prayer time has been reached.
func (svc *Service) EmitPrayerUpdate(prayerName string, state WindowState) {
	if svc == nil || svc.app == nil {
		return
	}
	svc.app.Event.Emit("prayer:update", map[string]string{
		"prayer": prayerName,
		"state":  string(state),
	})
	log.Info("prayer update emitted", "prayer", prayerName, "state", state)
}

func (svc *Service) EmitAutoDismissCountdown(triggerID int64, seconds int, isTest bool) {
	if svc == nil || svc.app == nil || triggerID == 0 || seconds <= 0 {
		return
	}
	eventName := "reminder:auto-dismiss-countdown"
	if isTest {
		eventName = "reminder:test-auto-dismiss-countdown"
	}
	svc.app.Event.Emit(eventName, map[string]any{
		"triggerId": triggerID,
		"seconds":   seconds,
	})
	log.Info("auto dismiss countdown emitted", "event", eventName, "triggerId", triggerID, "seconds", seconds)
}
