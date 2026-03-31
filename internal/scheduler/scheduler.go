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
	ontimeGrace       = 20 * time.Second
)

func toReminderNotificationSettings(cfg settings.NotificationSettings) *notification.ReminderNotificationSettings {
	return &notification.ReminderNotificationSettings{
		PersistentReminder:       cfg.PersistentReminder,
		AutoDismissSeconds:       cfg.AutoDismissSeconds,
		AutoDismissAfterAdhan:    cfg.AutoDismissAfterAdhan,
		PlayAdhan:                cfg.PlayAdhan,
		AdhanVolume:              cfg.AdhanVolume,
		CustomAdhanPath:          cfg.CustomAdhanPath,
		CustomAdhanFajrPath:      cfg.CustomAdhanFajrPath,
		AlwaysOnTop:              cfg.AlwaysOnTop,
		UseNativeNotification:    cfg.UseNativeNotification,
		NativeNotificationSticky: cfg.NativeNotificationSticky,
		UseNativeDialog:          cfg.UseNativeDialog,
	}
}

// NewService creates a new Scheduler service
func NewService(p *prayer.Service, a *audio.Service, n *notification.Service) *Service {
	return &Service{
		prayerSvc:      p,
		audioSvc:       a,
		notifSvc:       n,
		stopCh:         make(chan struct{}),
		prayerTickSeen: make(map[string]struct{}),
		suppressed:     make(map[string]struct{}),
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
	loc := resolveScheduleLocation(cfg)
	for {
		log.Info("scheduler day cycle start")
		svc.scheduleDayReminders(cfg, loc)

		// Wait until next midnight (or stop signal)
		now := clock.Now().In(loc)
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 5, 0, loc)
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

func (svc *Service) scheduleDayReminders(cfg settings.Settings, loc *time.Location) {
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

	now := clock.Now().In(loc)
	svc.resetPrayerTickForDay(sched.Date)
	svc.resetSuppressedForDay(sched.Date)
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
			go svc.fireAfterDelay(e, notification.StateBefore, delay, notifCfg, cfg.Language)
		}

		// Schedule "on time" event
		if e.t.After(now) {
			delay := e.t.Sub(now)
			log.Info("schedule on-time reminder", "prayer", e.name, "delay", delay)
			go svc.fireAfterDelay(e, notification.StateOnTime, delay, notifCfg, cfg.Language)
		} else {
			elapsed := now.Sub(e.t)
			if elapsed >= 0 && elapsed <= ontimeGrace {
				log.Info("fire on-time reminder immediately", "prayer", e.name, "elapsed", elapsed)
				go svc.fireAfterDelay(e, notification.StateOnTime, 0, notifCfg, cfg.Language)
			}
		}

		// Schedule "after" reminder
		if e.notifSettings.AfterMinutes > 0 {
			afterTime := e.t.Add(time.Duration(e.notifSettings.AfterMinutes) * time.Minute)
			if afterTime.After(now) {
				delay := afterTime.Sub(now)
				log.Info("schedule after reminder", "prayer", e.name, "delay", delay)
				go svc.fireAfterDelay(e, notification.StateAfter, delay, notifCfg, cfg.Language)
			}
		}
	}
}

func resolveScheduleLocation(cfg settings.Settings) *time.Location {
	if cfg.Location.Timezone == "" {
		return time.UTC
	}
	loc, err := time.LoadLocation(cfg.Location.Timezone)
	if err != nil {
		log.Warn("scheduler timezone load failed, using UTC", "timezone", cfg.Location.Timezone, "error", err)
		return time.UTC
	}
	return loc
}

func (svc *Service) resetPrayerTickForDay(day string) {
	if day == "" {
		return
	}
	svc.prayerTickMu.Lock()
	if _, ok := svc.prayerTickSeen["_day:"+day]; ok {
		svc.prayerTickMu.Unlock()
		return
	}
	svc.prayerTickSeen = make(map[string]struct{})
	svc.prayerTickSeen["_day:"+day] = struct{}{}
	svc.prayerTickMu.Unlock()
}

func (svc *Service) markPrayerTick(name string, at time.Time) bool {
	if name == "" || at.IsZero() {
		return false
	}
	key := name + "|" + at.Format("2006-01-02")
	svc.prayerTickMu.Lock()
	if _, ok := svc.prayerTickSeen[key]; ok {
		svc.prayerTickMu.Unlock()
		return false
	}
	svc.prayerTickSeen[key] = struct{}{}
	svc.prayerTickMu.Unlock()
	return true
}

func (svc *Service) SuppressPrayer(prayerName string, day string) {
	if prayerName == "" || day == "" {
		return
	}
	key := prayerName + "|" + day
	svc.suppressMu.Lock()
	svc.suppressed[key] = struct{}{}
	svc.suppressMu.Unlock()
}

func (svc *Service) isSuppressed(prayerName string, at time.Time) bool {
	if prayerName == "" || at.IsZero() {
		return false
	}
	key := prayerName + "|" + at.Format("2006-01-02")
	svc.suppressMu.Lock()
	_, ok := svc.suppressed[key]
	svc.suppressMu.Unlock()
	return ok
}

func (svc *Service) resetSuppressedForDay(day string) {
	if day == "" {
		return
	}
	svc.suppressMu.Lock()
	if _, ok := svc.suppressed["_day:"+day]; ok {
		svc.suppressMu.Unlock()
		return
	}
	svc.suppressed = make(map[string]struct{})
	svc.suppressed["_day:"+day] = struct{}{}
	svc.suppressMu.Unlock()
}

func (svc *Service) fireAfterDelay(
	entry prayerEntry,
	state notification.WindowState,
	delay time.Duration,
	notifCfg settings.NotificationSettings,
	language string,
) {
	select {
	case <-svc.stopCh:
		return
	case <-time.After(delay):
	}

	minutesLeft := 0
	offsetMinutes := 0
	switch state {
	case notification.StateBefore:
		minutesLeft = entry.notifSettings.BeforeMinutes
		offsetMinutes = -entry.notifSettings.BeforeMinutes
	case notification.StateAfter:
		offsetMinutes = entry.notifSettings.AfterMinutes
	}

	if svc.isSuppressed(entry.name, entry.t) {
		log.Info("reminder suppressed", "prayer", entry.name, "state", state)
		return
	}

	triggerID := svc.notifSvc.ShowReminder(notification.ReminderInfo{
		PrayerName:    entry.name,
		State:         state,
		MinutesLeft:   minutesLeft,
		OffsetMinutes: offsetMinutes,
		Language:      language,
		Notification:  toReminderNotificationSettings(notifCfg),
	})
	log.Info("reminder fired", "prayer", entry.name, "state", state, "offsetMinutes", offsetMinutes)

	if state == notification.StateOnTime {
		if svc.markPrayerTick(entry.name, entry.t) {
			svc.notifSvc.EmitPrayerUpdate(entry.name, state)
		}
	}

	if !notifCfg.PersistentReminder && notifCfg.AutoDismissSeconds > 0 {
		delay := time.Duration(notifCfg.AutoDismissSeconds) * time.Second
		if svc.shouldWaitForAdhan(state, notifCfg) {
			go svc.closeAfterAdhan(delay, triggerID)
		} else {
			go svc.closeAfterDelay(delay, triggerID)
		}
	}
}

func (svc *Service) closeAfterDelay(delay time.Duration, triggerID int64) {
	select {
	case <-svc.stopCh:
		return
	case <-time.After(delay):
	}
	if triggerID != 0 && (svc.notifSvc == nil || !svc.notifSvc.IsReminderTriggerActive(triggerID)) {
		log.Info("skip stale auto dismiss reminder", "triggerId", triggerID)
		return
	}
	log.Info("auto dismiss reminder", "delay", delay)
	svc.notifSvc.CloseReminder()
}

func (svc *Service) shouldWaitForAdhan(state notification.WindowState, cfg settings.NotificationSettings) bool {
	return state == notification.StateOnTime && cfg.PlayAdhan && cfg.AutoDismissAfterAdhan
}

func (svc *Service) closeAfterAdhan(delay time.Duration, triggerID int64) {
	if svc.audioSvc == nil {
		svc.closeAfterDelay(delay, triggerID)
		return
	}

	started := svc.waitForAudioState(true, audioStartTimeout, triggerID)
	if !started {
		svc.closeAfterDelay(delay, triggerID)
		return
	}

	_ = svc.waitForAudioState(false, audioStopTimeout, triggerID)
	if svc.notifSvc != nil && triggerID != 0 {
		svc.notifSvc.EmitAutoDismissCountdown(triggerID, int(delay/time.Second), false)
	}
	svc.closeAfterDelay(delay, triggerID)
}

func (svc *Service) waitForAudioState(target bool, timeout time.Duration, triggerID int64) bool {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(audioPollInterval)
	defer ticker.Stop()

	for {
		if triggerID != 0 && (svc.notifSvc == nil || !svc.notifSvc.IsReminderTriggerActive(triggerID)) {
			return false
		}
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
