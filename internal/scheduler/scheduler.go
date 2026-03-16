package scheduler

import (
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/audio"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/clock"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/notification"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/dadangdut33/simple-prayertime-reminder/internal/settings"
)

const (
	audioStartTimeout = 5 * time.Second
	audioStopTimeout  = 15 * time.Minute
	audioPollInterval = 250 * time.Millisecond
)

func toReminderNotificationSettings(cfg settings.NotificationSettings) *notification.ReminderNotificationSettings {
	return &notification.ReminderNotificationSettings{
		PersistentReminder:   cfg.PersistentReminder,
		AutoDismissSeconds:   cfg.AutoDismissSeconds,
		AutoDismissAfterAdhan: cfg.AutoDismissAfterAdhan,
		PlayAdhan:            cfg.PlayAdhan,
		AdhanVolume:          cfg.AdhanVolume,
		AlwaysOnTop:          cfg.AlwaysOnTop,
		UseNativeNotification: cfg.UseNativeNotification,
		NativeNotificationSticky: cfg.NativeNotificationSticky,
		UseNativeDialog:      cfg.UseNativeDialog,
	}
}

// NewService creates a new Scheduler service
func NewService(p *prayer.Service, a *audio.Service, n *notification.Service) *Service {
	return &Service{
		prayerSvc: p,
		audioSvc:  a,
		notifSvc:  n,
		stopCh:    make(chan struct{}),
	}
}

// Start begins the scheduling loop, which re-evaluates each midnight
func (svc *Service) Start(cfg settings.Settings) {
	log.Info("scheduler start")
	go svc.run(cfg)
}

// Stop halts scheduling
func (svc *Service) Stop() {
	log.Info("scheduler stop")
	close(svc.stopCh)
	svc.stopCh = make(chan struct{})
}

// UpdateConfig restarts scheduling with new settings
func (svc *Service) UpdateConfig(cfg settings.Settings) {
	log.Info("scheduler update config")
	select {
	case <-svc.stopCh: // already stopped, ignore
	default:
		close(svc.stopCh)
	}
	svc.stopCh = make(chan struct{})
	go svc.run(cfg)
}

func (svc *Service) run(cfg settings.Settings) {
	for {
		log.Info("scheduler day cycle start")
		svc.scheduleDayReminders(cfg)

		// Wait until next midnight (or stop signal)
		now := clock.Now()
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 5, 0, now.Location())
		wait := nextMidnight.Sub(now)
		if wait < 0 {
			wait = time.Second
		}
		select {
		case <-svc.stopCh:
			log.Info("scheduler stopped")
			return
		case <-time.After(wait):
			// loop again for the new day
		}
	}
}

func (svc *Service) scheduleDayReminders(cfg settings.Settings) {
	sched, err := svc.prayerSvc.GetTodaySchedule()
	if err != nil {
		log.Error("schedule load failed", "error", err)
		return
	}

	notifCfg := cfg.Notification

	entries := []prayerEntry{
		{name: "Fajr", t: sched.Fajr, isFajr: true, notifSettings: notifCfg.Prayers.Fajr},
		{name: "Sunrise", t: sched.Sunrise, isFajr: false, notifSettings: notifCfg.Prayers.Sunrise},
		{name: "Zuhr", t: sched.Zuhr, isFajr: false, notifSettings: notifCfg.Prayers.Zuhr},
		{name: "Asr", t: sched.Asr, isFajr: false, notifSettings: notifCfg.Prayers.Asr},
		{name: "Maghrib", t: sched.Maghrib, isFajr: false, notifSettings: notifCfg.Prayers.Maghrib},
		{name: "Isha", t: sched.Isha, isFajr: false, notifSettings: notifCfg.Prayers.Isha},
	}

	now := clock.Now()
	for _, entry := range entries {
		if !entry.notifSettings.Enabled || entry.t.IsZero() {
			continue
		}
		e := entry // capture

		// Schedule "before" reminder
		beforeTime := e.t.Add(-time.Duration(e.notifSettings.BeforeMinutes) * time.Minute)
		if beforeTime.After(now) {
			delay := beforeTime.Sub(now)
			log.Info("schedule before reminder", "prayer", e.name, "delay", delay)
			go svc.fireAfterDelay(e, notification.StateBefore, delay, notifCfg)
		}

		// Schedule "on time" event
		if e.t.After(now) {
			delay := e.t.Sub(now)
			log.Info("schedule on-time reminder", "prayer", e.name, "delay", delay)
			go svc.fireAfterDelay(e, notification.StateOnTime, delay, notifCfg)
		}

		// Schedule "after" reminder
		if e.notifSettings.AfterMinutes > 0 {
			afterTime := e.t.Add(time.Duration(e.notifSettings.AfterMinutes) * time.Minute)
			if afterTime.After(now) {
				delay := afterTime.Sub(now)
				log.Info("schedule after reminder", "prayer", e.name, "delay", delay)
				go svc.fireAfterDelay(e, notification.StateAfter, delay, notifCfg)
			}
		}
	}
}

func (svc *Service) fireAfterDelay(
	entry prayerEntry,
	state notification.WindowState,
	delay time.Duration,
	notifCfg settings.NotificationSettings,
) {
	select {
	case <-svc.stopCh:
		return
	case <-time.After(delay):
	}

	minutesLeft := 0
	offsetMinutes := 0
	if state == notification.StateBefore {
		minutesLeft = entry.notifSettings.BeforeMinutes
		offsetMinutes = -entry.notifSettings.BeforeMinutes
	} else if state == notification.StateAfter {
		offsetMinutes = entry.notifSettings.AfterMinutes
	}

	svc.notifSvc.ShowReminder(notification.ReminderInfo{
		PrayerName:    entry.name,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: offsetMinutes,
		Notification:  toReminderNotificationSettings(notifCfg),
	})
	log.Info("reminder fired", "prayer", entry.name, "state", state, "offsetMinutes", offsetMinutes)

	if !notifCfg.PersistentReminder && notifCfg.AutoDismissSeconds > 0 {
		delay := time.Duration(notifCfg.AutoDismissSeconds) * time.Second
		if svc.shouldWaitForAdhan(state, notifCfg) {
			go svc.closeAfterAdhan(delay)
		} else {
			go svc.closeAfterDelay(delay)
		}
	}
}

func (svc *Service) closeAfterDelay(delay time.Duration) {
	select {
	case <-svc.stopCh:
		return
	case <-time.After(delay):
	}
	log.Info("auto dismiss reminder", "delay", delay)
	svc.notifSvc.CloseReminder()
}

func (svc *Service) shouldWaitForAdhan(state notification.WindowState, cfg settings.NotificationSettings) bool {
	return state == notification.StateOnTime && cfg.PlayAdhan && cfg.AutoDismissAfterAdhan
}

func (svc *Service) closeAfterAdhan(delay time.Duration) {
	if svc.audioSvc == nil {
		svc.closeAfterDelay(delay)
		return
	}

	started := svc.waitForAudioState(true, audioStartTimeout)
	if !started {
		svc.closeAfterDelay(delay)
		return
	}

	_ = svc.waitForAudioState(false, audioStopTimeout)
	svc.closeAfterDelay(delay)
}

func (svc *Service) waitForAudioState(target bool, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(audioPollInterval)
	defer ticker.Stop()

	for {
		if svc.audioSvc != nil && svc.audioSvc.IsPlaying() == target {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		select {
		case <-svc.stopCh:
			return false
		case <-ticker.C:
		}
	}
}
