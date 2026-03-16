package notification

import (
	"sync"

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
}

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
